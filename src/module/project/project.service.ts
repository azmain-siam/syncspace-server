import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectActivityActions } from './enums/project-activity-action.enum';

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
}
