import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { User } from 'src/common/interfaces/user.interface';
import { calculatePaginationMeta } from 'src/common/utils/pagination.util';
import { slugify } from 'src/common/utils/slug.util';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectTasksQueryDto } from './dto/project-tasks-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from './enums/project-status.enum';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  // Create project
  async createProject(
    dto: CreateProjectDto,
    workspaceId: string,
    currentUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          workspaceId,
          slug: slugify(dto.title),
          title: dto.title,
          description: dto.description,
          color: dto.color,
          priority: dto.priority,
          dueDate: dto.dueDate,
          startDate: new Date(),
          createdById: currentUserId,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUserId,
        projectId: project.id,
        action: ActivityAction.PROJECT_CREATED,
        description: `Created project ${project.title}`,
        metadata: {
          projectId: project.id,
        },
      });

      return project;
    });
  }

  // Get workspace projects
  async getWorkspaceProjects(workspaceId: string) {
    return this.prisma.project.findMany({
      where: {
        workspaceId,
        status: {
          not: ProjectStatus.ARCHIVED,
        },
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get project by ID or Slug
  async getProject(workspaceId: string, projectIdOrSlug: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [{ id: projectIdOrSlug }, { slug: projectIdOrSlug }],
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    return project;
  }

  // Get flat list of tasks in a project (Table/List View API)
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
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
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

  // Update project
  async updateProject(
    projectIdOrSlug: string,
    workspaceId: string,
    dto: UpdateProjectDto,
    currentUser: User,
  ) {
    const project = await this.getProject(workspaceId, projectIdOrSlug);

    return this.prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: {
          id: project.id,
        },
        data: {
          title: dto.title ?? project.title,
          slug: dto.title ? slugify(dto.title) : project.slug,
          description: dto.description ?? project.description,
          color: dto.color ?? project.color,
          priority: dto.priority ?? project.priority,
          dueDate: dto.dueDate ?? project.dueDate,
          status: dto.status ?? project.status,
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

  // Archive project
  async archiveProject(
    projectIdOrSlug: string,
    workspaceId: string,
    currentUser: User,
  ) {
    const project = await this.getProject(workspaceId, projectIdOrSlug);

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

  // Delete project (Soft Delete)
  async deleteProject(
    projectIdOrSlug: string,
    workspaceId: string,
    currentUser: User,
  ) {
    const project = await this.getProject(workspaceId, projectIdOrSlug);

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

  // Restore soft-deleted / archived project
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
