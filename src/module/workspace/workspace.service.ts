import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  // async create(createWorkspaceDto: CreateWorkspaceDto) {
  //   return this.prisma.workspace.create({
  //     data: createWorkspaceDto,
  //   });
  // }
}
