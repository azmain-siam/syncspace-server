import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectHealth,
  ProjectMemberRole,
  ProjectPriority,
  ProjectStatus,
  ProjectVisibility,
  WorkspaceRole,
} from '@prisma/client';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { User } from 'src/common/interfaces/user.interface';
import { calculatePaginationMeta } from 'src/common/utils/pagination.util';
import { slugify } from 'src/common/utils/slug.util';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectLinkDto } from './dto/create-project-link.dto';
import { CreateProjectStatusUpdateDto } from './dto/create-project-status-update.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectTasksQueryDto } from './dto/project-tasks-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  // Verify workspace member role
  private async getCallerWorkspaceRole(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceRole | null> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
    return member?.role ?? null;
  }

  // 1. Create project with automatic lead, manager membership, and key/slug integrity
  async createProject(
    dto: CreateProjectDto,
    workspaceId: string,
    currentUserId: string,
  ) {
    const slug = dto.slug || slugify(dto.title);
    const key = (
      dto.key ||
      dto.title
        .substring(0, 4)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '') ||
      'PROJ'
    ).toUpperCase();

    // Check key and slug collisions within workspace
    const existing = await this.prisma.project.findFirst({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [{ slug }, { key }],
      },
    });

    if (existing) {
      if (existing.key === key) {
        throw new ConflictException(
          `Project key '${key}' is already in use within this workspace`,
        );
      }
      throw new ConflictException(
        `Project slug '${slug}' is already in use within this workspace`,
      );
    }

    const leadId = dto.leadId || currentUserId;

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          workspaceId,
          slug,
          key,
          title: dto.title,
          description: dto.description,
          brief: dto.brief,
          icon: dto.icon,
          color: dto.color || '#3B82F6',
          visibility: dto.visibility || ProjectVisibility.PUBLIC,
          priority: dto.priority || ProjectPriority.MEDIUM,
          health: dto.health || ProjectHealth.ON_TRACK,
          leadId,
          startDate: dto.startDate || new Date(),
          dueDate: dto.dueDate,
          repoUrl: dto.repoUrl,
          metadata: dto.metadata as Prisma.InputJsonValue,
          createdById: currentUserId,
        },
        include: {
          createdBy: { select: SAFE_USER_MINIMAL_SELECT },
          lead: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      // Auto-assign creator as Project Manager
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: currentUserId,
          role: ProjectMemberRole.MANAGER,
        },
      });

      // If lead is distinct from creator, add lead as Project Lead
      if (leadId !== currentUserId) {
        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId: leadId,
            role: ProjectMemberRole.LEAD,
          },
        });
      }

      // Default board for the project
      await tx.board.create({
        data: {
          projectId: project.id,
          title: 'Main Board',
          columns: {
            create: [
              { title: 'To Do', order: 0 },
              { title: 'In Progress', order: 1 },
              { title: 'Done', order: 2 },
            ],
          },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUserId,
        projectId: project.id,
        action: ActivityAction.PROJECT_CREATED,
        description: `Created project ${project.title} (${project.key})`,
        metadata: {
          projectId: project.id,
          key: project.key,
        },
      });

      return project;
    });
  }

  // 2. Get workspace projects with privacy visibility filtering
  async getWorkspaceProjects(workspaceId: string, currentUser?: User) {
    let callerRole: WorkspaceRole | null = WorkspaceRole.MEMBER;
    if (currentUser) {
      callerRole = await this.getCallerWorkspaceRole(
        workspaceId,
        currentUser.id,
      );
    }

    const isWorkspaceAdminOrOwner =
      callerRole === WorkspaceRole.OWNER || callerRole === WorkspaceRole.ADMIN;

    return this.prisma.project.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        status: {
          not: ProjectStatus.ARCHIVED,
        },
        ...(!isWorkspaceAdminOrOwner && currentUser
          ? {
              OR: [
                { visibility: ProjectVisibility.PUBLIC },
                { projectMembers: { some: { userId: currentUser.id } } },
              ],
            }
          : {}),
      },
      include: {
        createdBy: { select: SAFE_USER_MINIMAL_SELECT },
        lead: { select: SAFE_USER_MINIMAL_SELECT },
        _count: {
          select: {
            projectMembers: true,
            boards: true,
            sprints: true,
            links: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // 3. Get project by ID or Slug with relations & privacy check
  async getProject(
    workspaceId: string,
    projectIdOrSlug: string,
    currentUser?: User,
  ) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        projectIdOrSlug,
      );

    const project = await this.prisma.project.findFirst({
      where: {
        workspaceId,
        deletedAt: null,
        ...(isUuid ? { id: projectIdOrSlug } : { slug: projectIdOrSlug }),
      },
      include: {
        createdBy: { select: SAFE_USER_MINIMAL_SELECT },
        lead: { select: SAFE_USER_MINIMAL_SELECT },
        projectMembers: {
          include: {
            user: { select: SAFE_USER_MINIMAL_SELECT },
          },
        },
        links: {
          include: {
            createdBy: { select: SAFE_USER_MINIMAL_SELECT },
          },
          orderBy: { createdAt: 'desc' },
        },
        statusUpdates: {
          include: {
            author: { select: SAFE_USER_MINIMAL_SELECT },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        boards: {
          select: {
            id: true,
            title: true,
            _count: { select: { columns: true } },
          },
        },
        sprints: {
          where: { status: 'ACTIVE', deletedAt: null },
          take: 1,
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        _count: {
          select: {
            projectMembers: true,
            boards: true,
            sprints: true,
            links: true,
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    // Privacy access check
    if (project.visibility === ProjectVisibility.PRIVATE && currentUser) {
      const callerRole = await this.getCallerWorkspaceRole(
        workspaceId,
        currentUser.id,
      );
      const isWorkspaceAdminOrOwner =
        callerRole === WorkspaceRole.OWNER ||
        callerRole === WorkspaceRole.ADMIN;
      const isProjectMember = project.projectMembers.some(
        (pm) => pm.userId === currentUser.id,
      );

      if (!isWorkspaceAdminOrOwner && !isProjectMember) {
        throw new ForbiddenException(
          'You do not have permission to view this private project',
        );
      }
    }

    return project;
  }

  // 4. Get flat list of tasks in a project (Table/List View API)
  async getProjectTasks(projectIdOrSlug: string, query: ProjectTasksQueryDto) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        projectIdOrSlug,
      );

    const project = await this.prisma.project.findFirst({
      where: {
        ...(isUuid ? { id: projectIdOrSlug } : { slug: projectIdOrSlug }),
        deletedAt: null,
      },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        key: true,
        slug: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      column: {
        board: {
          projectId: project.id,
          project: {
            deletedAt: null,
          },
        },
      },
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.labelId ? { labels: { some: { id: query.labelId } } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              {
                key: {
                  contains: query.search.toUpperCase(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    let orderBy: Prisma.TaskOrderByWithRelationInput = { order: 'asc' };
    const sortDir = query.sortOrder ?? 'asc';

    switch (query.sortBy) {
      case 'dueDate':
        orderBy = { dueDate: sortDir };
        break;
      case 'priority':
        orderBy = { priority: sortDir };
        break;
      case 'status':
        orderBy = { status: sortDir };
        break;
      case 'createdAt':
        orderBy = { createdAt: sortDir };
        break;
      case 'title':
        orderBy = { title: sortDir };
        break;
      case 'order':
      default:
        orderBy = { order: sortDir };
        break;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          assignee: {
            select: SAFE_USER_MINIMAL_SELECT,
          },
          column: {
            select: {
              id: true,
              title: true,
              order: true,
              board: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          labels: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          checklists: {
            select: {
              id: true,
              title: true,
              isCompleted: true,
              order: true,
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
              checklists: true,
            },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    const formattedTasks = tasks.map((task) => {
      const totalChecklists = task.checklists.length;
      const completedChecklists = task.checklists.filter(
        (item) => item.isCompleted,
      ).length;

      return {
        ...task,
        checklistProgress: {
          total: totalChecklists,
          completed: completedChecklists,
          percentage:
            totalChecklists > 0
              ? Math.round((completedChecklists / totalChecklists) * 100)
              : 0,
        },
      };
    });

    return {
      project: {
        id: project.id,
        title: project.title,
        key: project.key,
        slug: project.slug,
        workspaceId: project.workspaceId,
      },
      tasks: formattedTasks,
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  // 5. Update project
  async updateProject(
    projectIdOrSlug: string,
    workspaceId: string,
    dto: UpdateProjectDto,
    currentUser: User,
  ) {
    const project = await this.getProject(
      workspaceId,
      projectIdOrSlug,
      currentUser,
    );

    if (dto.slug && dto.slug !== project.slug) {
      const slugCheck = await this.prisma.project.findFirst({
        where: {
          workspaceId,
          slug: dto.slug,
          id: { not: project.id },
          deletedAt: null,
        },
      });
      if (slugCheck) {
        throw new ConflictException(
          `Project slug '${dto.slug}' is already in use within this workspace`,
        );
      }
    }

    if (dto.key && dto.key.toUpperCase() !== project.key) {
      const keyUpper = dto.key.toUpperCase();
      const keyCheck = await this.prisma.project.findFirst({
        where: {
          workspaceId,
          key: keyUpper,
          id: { not: project.id },
          deletedAt: null,
        },
      });
      if (keyCheck) {
        throw new ConflictException(
          `Project key '${keyUpper}' is already in use within this workspace`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: {
          id: project.id,
        },
        data: {
          title: dto.title ?? project.title,
          slug: dto.slug
            ? dto.slug
            : dto.title
              ? slugify(dto.title)
              : project.slug,
          key: dto.key ? dto.key.toUpperCase() : project.key,
          description: dto.description ?? project.description,
          brief: dto.brief ?? project.brief,
          icon: dto.icon ?? project.icon,
          color: dto.color ?? project.color,
          visibility: dto.visibility ?? project.visibility,
          priority: dto.priority ?? project.priority,
          health: dto.health ?? project.health,
          leadId: dto.leadId ?? project.leadId,
          startDate: dto.startDate ?? project.startDate,
          dueDate: dto.dueDate ?? project.dueDate,
          repoUrl: dto.repoUrl ?? project.repoUrl,
          metadata: dto.metadata
            ? (dto.metadata as Prisma.InputJsonValue)
            : (project.metadata ?? undefined),
          status: dto.status ?? project.status,
        },
        include: {
          createdBy: { select: SAFE_USER_MINIMAL_SELECT },
          lead: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId: updatedProject.id,
        action: ActivityAction.PROJECT_UPDATED,
        description: `${currentUser.name} updated project ${updatedProject.title}`,
        metadata: {
          projectId: updatedProject.id,
        },
      });

      return updatedProject;
    });
  }

  // 6. Project Links Sub-resource
  async addProjectLink(
    workspaceId: string,
    projectId: string,
    dto: CreateProjectLinkDto,
    currentUser: User,
  ) {
    const project = await this.getProject(workspaceId, projectId, currentUser);

    return this.prisma.projectLink.create({
      data: {
        projectId: project.id,
        createdById: currentUser.id,
        title: dto.title,
        url: dto.url,
        type: dto.type,
      },
      include: {
        createdBy: { select: SAFE_USER_MINIMAL_SELECT },
      },
    });
  }

  async getProjectLinks(
    workspaceId: string,
    projectId: string,
    currentUser: User,
  ) {
    const project = await this.getProject(workspaceId, projectId, currentUser);

    return this.prisma.projectLink.findMany({
      where: { projectId: project.id },
      include: {
        createdBy: { select: SAFE_USER_MINIMAL_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteProjectLink(
    workspaceId: string,
    projectId: string,
    linkId: string,
    currentUser: User,
  ) {
    await this.getProject(workspaceId, projectId, currentUser);

    const link = await this.prisma.projectLink.findUnique({
      where: { id: linkId },
    });

    if (!link || link.projectId !== projectId) {
      throw new NotFoundException('Project link not found');
    }

    await this.prisma.projectLink.delete({
      where: { id: linkId },
    });

    return { message: 'Project link deleted successfully', id: linkId };
  }

  // 7. Project Status Updates Sub-resource
  async createStatusUpdate(
    workspaceId: string,
    projectId: string,
    dto: CreateProjectStatusUpdateDto,
    currentUser: User,
  ) {
    const project = await this.getProject(workspaceId, projectId, currentUser);

    return this.prisma.$transaction(async (tx) => {
      const update = await tx.projectStatusUpdate.create({
        data: {
          projectId: project.id,
          authorId: currentUser.id,
          health: dto.health,
          message: dto.message,
        },
        include: {
          author: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      // Synchronize project health with the latest status update
      await tx.project.update({
        where: { id: project.id },
        data: { health: dto.health },
      });

      return update;
    });
  }

  async getStatusUpdates(
    workspaceId: string,
    projectId: string,
    currentUser: User,
  ) {
    const project = await this.getProject(workspaceId, projectId, currentUser);

    return this.prisma.projectStatusUpdate.findMany({
      where: { projectId: project.id },
      include: {
        author: { select: SAFE_USER_MINIMAL_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 8. Archive project
  async archiveProject(
    projectIdOrSlug: string,
    workspaceId: string,
    currentUser: User,
  ) {
    const project = await this.getProject(
      workspaceId,
      projectIdOrSlug,
      currentUser,
    );

    return this.prisma.$transaction(async (tx) => {
      const archivedProject = await tx.project.update({
        where: {
          id: project.id,
        },
        data: {
          status: ProjectStatus.ARCHIVED,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId: archivedProject.id,
        action: ActivityAction.PROJECT_ARCHIVED,
        description: `${currentUser.name} archived project ${archivedProject.title}`,
        metadata: {
          projectId: archivedProject.id,
        },
      });

      return archivedProject;
    });
  }

  // 9. Delete project (Soft Delete)
  async deleteProject(
    projectIdOrSlug: string,
    workspaceId: string,
    currentUser: User,
  ) {
    const project = await this.getProject(
      workspaceId,
      projectIdOrSlug,
      currentUser,
    );

    return this.prisma.$transaction(async (tx) => {
      const deletedProject = await tx.project.update({
        where: { id: project.id },
        data: {
          deletedAt: new Date(),
          status: ProjectStatus.ARCHIVED,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId: deletedProject.id,
        action: ActivityAction.PROJECT_DELETED,
        description: `${currentUser.name} deleted project ${deletedProject.title}`,
        metadata: {
          projectId: deletedProject.id,
        },
      });

      return {
        message: 'Project deleted successfully',
        id: deletedProject.id,
      };
    });
  }

  // 10. Restore soft-deleted / archived project
  async restoreProject(
    projectIdOrSlug: string,
    workspaceId: string,
    currentUser: User,
  ) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        projectIdOrSlug,
      );

    const project = await this.prisma.project.findFirst({
      where: {
        workspaceId,
        ...(isUuid ? { id: projectIdOrSlug } : { slug: projectIdOrSlug }),
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const restoredProject = await tx.project.update({
        where: { id: project.id },
        data: {
          deletedAt: null,
          status: ProjectStatus.ACTIVE,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId: restoredProject.id,
        action: ActivityAction.PROJECT_RESTORED,
        description: `${currentUser.name} restored project ${restoredProject.title}`,
        metadata: {
          projectId: restoredProject.id,
        },
      });

      return restoredProject;
    });
  }
}
