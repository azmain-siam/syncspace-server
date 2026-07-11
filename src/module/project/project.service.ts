import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectActivityActions } from './enums/project-activity-action.enum';
import { ProjectStatus } from './enums/project-status.enum';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

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
          startDate: dto.startDate ?? new Date(),
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

  async getWorkspaceProject(workspaceId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        workspaceId,
        status: {
          not: ProjectStatus.ARCHIVED,
        },
      },
    });

    return projects;
  }
}
