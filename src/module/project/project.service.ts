import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from 'src/common/interfaces/user.interface';
import { slugify } from 'src/common/utils/slug.util';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
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

  // Get project
  async getProject(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
        deletedAt: null,
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    return project;
  }

  // Update project
  async updateProject(
    projectId: string,
    workspaceId: string,
    dto: UpdateProjectDto,
    currentUser: User,
  ) {
    const project = await this.getProject(workspaceId, projectId);

    return this.prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: {
          id: projectId,
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
    projectId: string,
    workspaceId: string,
    currentUser: User,
  ) {
    await this.getProject(workspaceId, projectId);

    return this.prisma.$transaction(async (tx) => {
      const archivedProject = await tx.project.update({
        where: {
          id: projectId,
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
}
