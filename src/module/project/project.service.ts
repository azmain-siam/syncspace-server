import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectActivityActions } from './enums/project-activity-action.enum';
import { ProjectStatus } from './enums/project-status.enum';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

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
          slug: dto.title.toLowerCase().replace(/ /g, '-'),
          title: dto.title,
          description: dto.description,
          color: dto.color,
          priority: dto.priority,
          dueDate: dto.dueDate,
          startDate: new Date(),
          createdById: currentUserId,
        },
      });

      await tx.workspaceActivity.create({
        data: {
          workspaceId,
          actorId: currentUserId,
          projectId: project.id,
          action: ProjectActivityActions.PROJECT_CREATED,
          description: `Created project ${project.title}`,
          metadata: {
            projectId: project.id,
          },
        },
      });

      return project;
    });
  }

  // Get workspace projects
  async getWorkspaceProject(workspaceId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        workspaceId,
        status: {
          not: ProjectStatus.ARCHIVED,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return projects;
  }

  // Get project
  async getProject(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
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
  ) {
    const project = await this.getProject(workspaceId, projectId);

    const updatedProject = await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        title: dto.title ?? project.title,
        slug: dto.title
          ? dto.title.toLowerCase().replace(/ /g, '-')
          : project.slug,
        description: dto.description ?? project.description,
        color: dto.color ?? project.color,
        priority: dto.priority ?? project.priority,
        dueDate: dto.dueDate ?? project.dueDate,
        status: dto.status ?? project.status,
      },
    });

    return updatedProject;
  }
}
