import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  // async createProject(
  //   dto: CreateProjectDto,
  //   workspaceId: string,
  //   currentUserId: string,
  // ) {
  //   const project = await this.prisma.project.create({
  //     data: {
  //       workspaceId: workspaceId,
  //       title: dto.title,
  //       description: dto.description,
  //       createdBy: currentUserId,
  //     },
  //   });

  //   return project;
  // }
}
