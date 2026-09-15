import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Prisma,
  TaskPriority,
  TaskStatus,
  WorkspaceRole,
} from '@prisma/client';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { User } from 'src/common/interfaces/user.interface';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { calculatePaginationMeta } from 'src/common/utils/pagination.util';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidationService: EntityValidationService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Create Task in Column
  async createTask(columnId: string, dto: CreateTaskDto, currentUser: User) {
    const column =
      await this.entityValidationService.verifyColumnById(columnId);
    const workspaceId = column.board.project.workspaceId;
    const projectId = column.board.project.id;
    const boardId = column.board.id;

    if (dto.assigneeId) {
      await this.entityValidationService.verifyAssignee(
        workspaceId,
        dto.assigneeId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let targetOrder = dto.order;

      if (targetOrder === undefined || targetOrder === null) {
        const lastTask = await tx.task.findFirst({
          where: { columnId, deletedAt: null },
          orderBy: { order: 'desc' },
        });

        targetOrder = lastTask ? lastTask.order + 1 : 0;
      }

      const task = await tx.task.create({
        data: {
          columnId,
          createdBy: currentUser.id,
          title: dto.title,
          description: dto.description,
          priority: dto.priority ?? TaskPriority.MEDIUM,
          status: dto.status ?? TaskStatus.TODO,
          assigneeId: dto.assigneeId,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          order: targetOrder,
        },
        include: {
          assignee: { select: SAFE_USER_MINIMAL_SELECT },
          creator: { select: SAFE_USER_MINIMAL_SELECT },
          column: {
            select: {
              id: true,
              title: true,
              boardId: true,
            },
          },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId: task.id,
        action: ActivityAction.TASK_CREATED,
        description: `${currentUser.name} created task ${task.title}`,
        metadata: { taskId: task.id, title: task.title, order: task.order },
      });

      if (dto.assigneeId) {
        await this.activityService.createActivityLog(tx, {
          workspaceId,
          actorId: currentUser.id,
          projectId,
          boardId,
          taskId: task.id,
          action: ActivityAction.TASK_ASSIGNED,
          description: `Assigned task ${task.title} to ${task.assignee?.name}`,
          metadata: { taskId: task.id, assigneeId: dto.assigneeId },
        });

        this.eventEmitter.emit('task.assigned', {
          taskId: task.id,
          title: task.title,
          assigneeId: dto.assigneeId,
          actorId: currentUser.id,
          actorName: currentUser.name,
          workspaceId,
          projectId,
          boardId,
          columnId,
        });
      }

      return task;
    });
  }

  // Get Column Tasks (Paginated & Filtered)
  async getTasks(columnId: string, query: TaskQueryDto) {
    await this.entityValidationService.verifyColumnById(columnId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      columnId,
      deletedAt: null,
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { order: 'asc' },
        skip,
        take: limit,
        include: {
          assignee: { select: SAFE_USER_MINIMAL_SELECT },
          creator: { select: SAFE_USER_MINIMAL_SELECT },
          _count: {
            select: { comments: true, attachments: true, links: true },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      tasks,
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  // Get Single Task Details
  async getTask(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
      },
      include: {
        column: {
          include: {
            board: {
              include: {
                project: {
                  select: { id: true, title: true, workspaceId: true },
                },
              },
            },
          },
        },
        assignee: { select: SAFE_USER_MINIMAL_SELECT },
        creator: { select: SAFE_USER_MINIMAL_SELECT },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
            uploader: { select: SAFE_USER_MINIMAL_SELECT },
          },
        },
        links: true,
        _count: {
          select: { comments: true, attachments: true, links: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  // Update Task
  async updateTask(taskId: string, dto: UpdateTaskDto, currentUser: User) {
    const existingTask =
      await this.entityValidationService.verifyTaskById(taskId);
    const workspaceId = existingTask.column.board.project.workspaceId;
    const projectId = existingTask.column.board.project.id;
    const boardId = existingTask.column.board.id;
    const columnId = existingTask.columnId;

    if (dto.assigneeId && dto.assigneeId !== existingTask.assigneeId) {
      await this.entityValidationService.verifyAssignee(
        workspaceId,
        dto.assigneeId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          title: dto.title ?? existingTask.title,
          description: dto.description ?? existingTask.description,
          priority: dto.priority ?? existingTask.priority,
          status: dto.status ?? existingTask.status,
          assigneeId: dto.assigneeId ?? existingTask.assigneeId,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : existingTask.dueDate,
        },
        include: {
          assignee: { select: SAFE_USER_MINIMAL_SELECT },
          creator: { select: SAFE_USER_MINIMAL_SELECT },
          column: {
            select: {
              id: true,
              title: true,
              boardId: true,
            },
          },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId: updatedTask.id,
        action: ActivityAction.TASK_UPDATED,
        description: `${currentUser.name} updated task ${updatedTask.title}`,
        metadata: { taskId: updatedTask.id, title: updatedTask.title },
      });

      if (dto.assigneeId && dto.assigneeId !== existingTask.assigneeId) {
        await this.activityService.createActivityLog(tx, {
          workspaceId,
          actorId: currentUser.id,
          projectId,
          boardId,
          taskId: updatedTask.id,
          action: ActivityAction.TASK_ASSIGNED,
          description: `Assigned task ${updatedTask.title} to ${updatedTask.assignee?.name}`,
          metadata: { taskId: updatedTask.id, assigneeId: dto.assigneeId },
        });

        this.eventEmitter.emit('task.assigned', {
          taskId: updatedTask.id,
          title: updatedTask.title,
          assigneeId: dto.assigneeId,
          actorId: currentUser.id,
          actorName: currentUser.name,
          workspaceId,
          projectId,
          boardId,
          columnId,
        });
      }

      return updatedTask;
    });
  }

  // Move Task across columns or reorder
  async moveTask(taskId: string, dto: MoveTaskDto, currentUser: User) {
    const task = await this.entityValidationService.verifyTaskById(taskId);
    const workspaceId = task.column.board.project.workspaceId;
    const projectId = task.column.board.project.id;
    const boardId = task.column.board.id;
    const sourceColumnId = task.columnId;

    // Verify target column exists and belongs to same board
    const targetColumn = await this.entityValidationService.verifyColumnById(
      dto.targetColumnId,
    );
    if (targetColumn.boardId !== boardId) {
      throw new ForbiddenException(
        'Target column must belong to the same board',
      );
    }

    // Infer or use explicitly provided status
    let newStatus = dto.status;
    if (!newStatus) {
      const colTitle = targetColumn.title.trim().toLowerCase();
      if (
        colTitle === 'done' ||
        colTitle === 'completed' ||
        colTitle === 'finished' ||
        colTitle === 'closed'
      ) {
        newStatus = TaskStatus.DONE;
      } else if (
        colTitle === 'in progress' ||
        colTitle === 'in-progress' ||
        colTitle === 'doing' ||
        colTitle === 'active'
      ) {
        newStatus = TaskStatus.IN_PROGRESS;
      } else if (
        colTitle === 'review' ||
        colTitle === 'in review' ||
        colTitle === 'qa' ||
        colTitle === 'testing'
      ) {
        newStatus = TaskStatus.REVIEW;
      } else if (
        colTitle === 'to do' ||
        colTitle === 'todo' ||
        colTitle === 'backlog'
      ) {
        newStatus = TaskStatus.TODO;
      }
    }

    const movedTask = await this.prisma.$transaction(async (tx) => {
      // Step A: Temporarily set moving task's order to negative offset
      await tx.task.update({
        where: { id: taskId },
        data: { order: -9999 },
      });

      // Step B: Fetch target column active tasks ordered by current order
      const targetColumnTasks = await tx.task.findMany({
        where: {
          columnId: dto.targetColumnId,
          deletedAt: null,
          NOT: { id: taskId },
        },
        orderBy: { order: 'asc' },
      });

      // Step C: Batch update target tasks into reindexed order positions via Promise.all
      const updatePromises: Promise<any>[] = [];
      let newOrder = 0;
      for (const t of targetColumnTasks) {
        if (newOrder === dto.targetOrder) {
          newOrder++;
        }
        updatePromises.push(
          tx.task.update({
            where: { id: t.id },
            data: { order: newOrder },
          }),
        );
        newOrder++;
      }
      await Promise.all(updatePromises);

      // Step D: Place moving task into target column, target order, and synced status
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          columnId: dto.targetColumnId,
          order: dto.targetOrder,
          ...(newStatus ? { status: newStatus } : {}),
        },
        include: {
          column: { select: { id: true, title: true } },
          assignee: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId: updated.id,
        action: ActivityAction.TASK_MOVED,
        description: `${currentUser.name} moved task ${updated.title} to ${targetColumn.title}`,
        metadata: {
          taskId: updated.id,
          fromColumnId: sourceColumnId,
          toColumnId: dto.targetColumnId,
          order: dto.targetOrder,
          status: updated.status,
        },
      });

      return updated;
    });

    this.eventEmitter.emit('task.moved', {
      taskId: movedTask.id,
      sourceColumnId,
      destinationColumnId: dto.targetColumnId,
      newOrder: dto.targetOrder,
      boardId,
      workspaceId,
    });

    return movedTask;
  }

  // Delete (Soft delete) Task
  async deleteTask(taskId: string, currentUser: User) {
    const task = await this.entityValidationService.verifyTaskById(taskId);
    const workspaceId = task.column.board.project.workspaceId;
    const projectId = task.column.board.project.id;
    const boardId = task.column.board.id;

    // Enforce deletion permission: creator or workspace ADMIN/OWNER
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUser.id,
        },
      },
    });

    const isPrivileged =
      member &&
      (member.role === WorkspaceRole.OWNER ||
        member.role === WorkspaceRole.ADMIN);
    const isCreator = task.createdBy === currentUser.id;

    if (!isPrivileged && !isCreator) {
      throw new ForbiddenException(
        'You do not have permission to delete this task',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: { deletedAt: new Date() },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId,
        action: ActivityAction.TASK_DELETED,
        description: `${currentUser.name} deleted task ${task.title}`,
        metadata: { taskId, title: task.title },
      });

      return null;
    });
  }
}
