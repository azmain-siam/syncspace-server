import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from 'src/common/interfaces/user.interface';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { calculatePaginationMeta } from 'src/common/utils/pagination.util';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { ActivityService } from '../activity/activity.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { AuditLogService } from '../audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus } from '../project/enums/project-status.enum';
import { RestoreTrashItemDto } from './dto/restore-trash-item.dto';
import { TrashQueryDto } from './dto/trash-query.dto';

export interface MinimalUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface DeletedProjectItem {
  id: string;
  title: string;
  key: string | null;
  slug: string | null;
  deletedAt: Date | null;
  createdBy: MinimalUser;
}

export interface DeletedTaskItem {
  id: string;
  title: string;
  key: string | null;
  deletedAt: Date | null;
  creator: MinimalUser;
  column: {
    id: string;
    title: string;
    board: {
      id: string;
      title: string;
      project: {
        id: string;
        title: string;
        key: string | null;
        deletedAt: Date | null;
      };
    };
  };
}

const SAFE_USER_MINIMAL_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
};

@Injectable()
export class TrashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly auditLogService: AuditLogService,
    private readonly entityValidationService: EntityValidationService,
  ) {}

  // List all soft-deleted items (tasks & projects) in the workspace
  async getTrashItems(workspaceId: string, query: TrashQueryDto) {
    await this.entityValidationService.verifyWorkspace(workspaceId);

    const type = query.type ?? 'ALL';
    let deletedProjects: DeletedProjectItem[] = [];
    let deletedTasks: DeletedTaskItem[] = [];

    if (type === 'ALL' || type === 'PROJECT') {
      deletedProjects = await this.prisma.project.findMany({
        where: {
          workspaceId,
          deletedAt: { not: null },
          ...(query.search
            ? {
                OR: [
                  { title: { contains: query.search, mode: 'insensitive' } },
                  {
                    description: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          createdBy: {
            select: SAFE_USER_MINIMAL_SELECT,
          },
        },
      });
    }

    if (type === 'ALL' || type === 'TASK') {
      deletedTasks = await this.prisma.task.findMany({
        where: {
          column: {
            board: {
              project: {
                workspaceId,
              },
            },
          },
          deletedAt: { not: null },
          ...(query.search
            ? {
                OR: [
                  { title: { contains: query.search, mode: 'insensitive' } },
                  {
                    description: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    key: {
                      contains: query.search.toUpperCase(),
                      mode: 'insensitive',
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          creator: {
            select: SAFE_USER_MINIMAL_SELECT,
          },
          column: {
            select: {
              id: true,
              title: true,
              board: {
                select: {
                  id: true,
                  title: true,
                  project: {
                    select: {
                      id: true,
                      title: true,
                      key: true,
                      deletedAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    const projectItems = deletedProjects.map((p) => ({
      id: p.id,
      itemType: 'PROJECT' as const,
      title: p.title,
      key: p.key,
      slug: p.slug,
      deletedAt: p.deletedAt,
      deletedBy: p.createdBy,
      container: null,
    }));

    const taskItems = deletedTasks.map((t) => ({
      id: t.id,
      itemType: 'TASK' as const,
      title: t.title,
      key: t.key,
      deletedAt: t.deletedAt,
      deletedBy: t.creator,
      container: {
        projectId: t.column?.board?.project?.id,
        projectName: t.column?.board?.project?.title,
        projectKey: t.column?.board?.project?.key,
        projectDeleted: Boolean(t.column?.board?.project?.deletedAt),
        boardId: t.column?.board?.id,
        boardName: t.column?.board?.title,
        columnId: t.column?.id,
        columnName: t.column?.title,
      },
    }));

    const allItems = [...projectItems, ...taskItems].sort((a, b) => {
      const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      return dateB - dateA;
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const total = allItems.length;
    const paginatedItems = allItems.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  // Restore soft-deleted task or project
  async restoreItem(
    workspaceId: string,
    dto: RestoreTrashItemDto,
    currentUser: User,
  ) {
    await this.entityValidationService.verifyWorkspace(workspaceId);

    if (dto.itemType === 'PROJECT') {
      const project = await this.prisma.project.findFirst({
        where: {
          id: dto.itemId,
          workspaceId,
          deletedAt: { not: null },
        },
      });

      if (!project) {
        throw new NotFoundException('Project not found in trash');
      }

      return this.prisma.$transaction(async (tx) => {
        const restored = await tx.project.update({
          where: { id: project.id },
          data: {
            deletedAt: null,
            status: ProjectStatus.ACTIVE,
          },
        });

        await this.activityService.createActivityLog(tx, {
          workspaceId,
          actorId: currentUser.id,
          projectId: restored.id,
          action: ActivityAction.PROJECT_RESTORED,
          description: `${currentUser.name} restored project "${restored.title}" from trash`,
          metadata: { projectId: restored.id },
        });

        await this.auditLogService.log({
          workspaceId,
          actorId: currentUser.id,
          action: AuditAction.TRASH_ITEM_RESTORED,
          metadata: {
            itemType: 'PROJECT',
            itemId: restored.id,
            title: restored.title,
          },
        });

        return {
          success: true,
          message: `Project "${restored.title}" restored successfully`,
          item: restored,
        };
      });
    }

    if (dto.itemType === 'TASK') {
      const task = await this.prisma.task.findFirst({
        where: {
          id: dto.itemId,
          deletedAt: { not: null },
          column: {
            board: {
              project: {
                workspaceId,
              },
            },
          },
        },
        include: {
          column: {
            include: {
              board: {
                include: {
                  project: true,
                },
              },
            },
          },
        },
      });

      if (!task) {
        throw new NotFoundException('Task not found in trash');
      }

      if (task.column?.board?.project?.deletedAt) {
        throw new BadRequestException(
          `Cannot restore task "${task.title}" because parent project "${task.column.board.project.title}" is also in trash. Please restore the project first.`,
        );
      }

      return this.prisma.$transaction(async (tx) => {
        const restored = await tx.task.update({
          where: { id: task.id },
          data: {
            deletedAt: null,
          },
        });

        await this.activityService.createActivityLog(tx, {
          workspaceId,
          actorId: currentUser.id,
          projectId: task.column.board.project.id,
          boardId: task.column.board.id,
          taskId: restored.id,
          action: ActivityAction.TASK_RESTORED,
          description: `${currentUser.name} restored task "${restored.title}" from trash`,
          metadata: { taskId: restored.id },
        });

        await this.auditLogService.log({
          workspaceId,
          actorId: currentUser.id,
          action: AuditAction.TRASH_ITEM_RESTORED,
          metadata: {
            itemType: 'TASK',
            taskId: restored.id,
            title: restored.title,
          },
        });

        return {
          success: true,
          message: `Task "${restored.title}" restored successfully`,
          item: restored,
        };
      });
    }

    throw new BadRequestException('Invalid itemType specified');
  }

  // Permanently purge items from trash
  async emptyTrash(
    workspaceId: string,
    currentUser: User,
    itemType?: 'TASK' | 'PROJECT',
    itemId?: string,
  ) {
    await this.entityValidationService.verifyWorkspace(workspaceId);

    return this.prisma.$transaction(async (tx) => {
      if (itemId) {
        if (itemType === 'PROJECT') {
          const project = await tx.project.findFirst({
            where: { id: itemId, workspaceId, deletedAt: { not: null } },
          });
          if (!project)
            throw new NotFoundException('Project not found in trash');
          await tx.project.delete({ where: { id: itemId } });
        } else if (itemType === 'TASK') {
          const task = await tx.task.findFirst({
            where: {
              id: itemId,
              deletedAt: { not: null },
              column: { board: { project: { workspaceId } } },
            },
          });
          if (!task) throw new NotFoundException('Task not found in trash');
          await tx.task.delete({ where: { id: itemId } });
        }
      } else {
        // Permanently purge all soft-deleted items
        await tx.task.deleteMany({
          where: {
            column: { board: { project: { workspaceId } } },
            deletedAt: { not: null },
          },
        });

        await tx.project.deleteMany({
          where: {
            workspaceId,
            deletedAt: { not: null },
          },
        });
      }

      await this.auditLogService.log({
        workspaceId,
        actorId: currentUser.id,
        action: AuditAction.TRASH_EMPTIED,
        metadata: { itemId, itemType },
      });

      return {
        success: true,
        message: 'Trash permanently purged',
      };
    });
  }
}
