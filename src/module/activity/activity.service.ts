import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityQueryDto } from './dto/activity-query.dto';

export interface CreateActivityInput {
  workspaceId: string;
  actorId: string;
  action: string;
  description?: string;
  projectId?: string;
  taskId?: string;
  boardId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  // Create activity log (supports transaction or direct DB call)
  async createActivityLog(
    tx: Prisma.TransactionClient | undefined,
    data: CreateActivityInput,
  ) {
    const client = tx ?? this.prisma;
    return client.workspaceActivity.create({
      data: {
        workspaceId: data.workspaceId,
        actorId: data.actorId,
        action: data.action,
        description: data.description,
        projectId: data.projectId,
        taskId: data.taskId,
        boardId: data.boardId,
        metadata: data.metadata,
      },
    });
  }

  // Get workspace activities (paginated)
  async getWorkspaceActivities(workspaceId: string, query: ActivityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.workspaceActivity.findMany({
        where: {
          workspaceId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.workspaceActivity.count({
        where: {
          workspaceId,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      activities,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}
