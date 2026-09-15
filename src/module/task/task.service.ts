import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
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

  // Create Task
  async createTask(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    dto: CreateTaskDto,
    currentUser: User,
  ) {
    await this.entityValidationService.verifyColumn(
      workspaceId,
      projectId,
      boardId,
      columnId,
    );

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
  async getTasks(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    query: TaskQueryDto,
  ) {
    await this.entityValidationService.verifyColumn(
      workspaceId,
      projectId,
      boardId,
      columnId,
    );

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
            select: { comments: true, attachments: true },
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

  // Get Single Task
  async getTask(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
  ) {
    return this.entityValidationService.verifyTask(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
    );
  }

  // Update Task
  async updateTask(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    dto: UpdateTaskDto,
    currentUser: User,
  ) {
    const existingTask = await this.getTask(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
    );

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
  async moveTask(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    dto: MoveTaskDto,
    currentUser: User,
  ) {
    await this.getTask(workspaceId, projectId, boardId, columnId, taskId);

    // Verify target column exists under same board
    const targetColumn = await this.entityValidationService.verifyColumn(
      workspaceId,
      projectId,
      boardId,
      dto.targetColumnId,
    );

    return this.prisma.$transaction(async (tx) => {
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

      // Step D: Place moving task into target column and target order
      const movedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          columnId: dto.targetColumnId,
          order: dto.targetOrder,
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
        taskId: movedTask.id,
        action: ActivityAction.TASK_MOVED,
        description: `${currentUser.name} moved task ${movedTask.title} to ${targetColumn.title}`,
        metadata: {
          taskId: movedTask.id,
          fromColumnId: columnId,
          toColumnId: dto.targetColumnId,
          order: dto.targetOrder,
        },
      });

      return movedTask;
    });
  }

  // Delete (Soft delete) Task
  async deleteTask(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    currentUser: User,
  ) {
    const task = await this.getTask(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
    );

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
