import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { calculatePaginationMeta } from 'src/common/utils/pagination.util';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidationService: EntityValidationService,
  ) {}

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
            select: SAFE_USER_MINIMAL_SELECT,
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

    return {
      activities,
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  // Get task-specific activities for task modal history tab (paginated)
  async getTaskActivities(taskId: string, query: ActivityQueryDto) {
    const task = await this.entityValidationService.verifyTaskById(taskId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkspaceActivityWhereInput = {
      taskId: task.id,
    };

    const [activities, total] = await Promise.all([
      this.prisma.workspaceActivity.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: {
          actor: {
            select: SAFE_USER_MINIMAL_SELECT,
          },
        },
      }),
      this.prisma.workspaceActivity.count({ where }),
    ]);

    return {
      activities,
      meta: calculatePaginationMeta(total, page, limit),
    };
  }
}
