import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { User } from 'src/common/interfaces/user.interface';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

@Injectable()
export class TaskChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidationService: EntityValidationService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Get all checklist items for a task
  async getChecklistItems(taskId: string) {
    const task = await this.entityValidationService.verifyTaskById(taskId);

    return this.prisma.taskChecklist.findMany({
      where: { taskId: task.id },
      orderBy: { order: 'asc' },
      include: {
        assignee: { select: SAFE_USER_MINIMAL_SELECT },
      },
    });
  }

  // Add checklist item to task
  async createChecklistItem(
    taskId: string,
    dto: CreateChecklistItemDto,
    currentUser: User,
  ) {
    const task = await this.entityValidationService.verifyTaskById(taskId);
    const workspaceId = task.column.board.project.workspaceId;
    const projectId = task.column.board.project.id;
    const boardId = task.column.board.id;

    if (dto.assigneeId) {
      await this.entityValidationService.verifyAssignee(
        workspaceId,
        dto.assigneeId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let targetOrder = dto.order;

      if (targetOrder === undefined || targetOrder === null) {
        const lastItem = await tx.taskChecklist.findFirst({
          where: { taskId: task.id },
          orderBy: { order: 'desc' },
        });
        targetOrder = lastItem ? lastItem.order + 1 : 0;
      }

      const checklistItem = await tx.taskChecklist.create({
        data: {
          taskId: task.id,
          title: dto.title,
          assigneeId: dto.assigneeId,
          order: targetOrder,
        },
        include: {
          assignee: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId: task.id,
        action: ActivityAction.CHECKLIST_ITEM_CREATED,
        description: `${currentUser.name} added checklist item "${checklistItem.title}" to task "${task.title}"`,
        metadata: {
          taskId: task.id,
          checklistItemId: checklistItem.id,
          title: checklistItem.title,
        },
      });

      this.eventEmitter.emit('checklist.created', {
        taskId: task.id,
        item: checklistItem,
      });

      return checklistItem;
    });
  }

  // Update checklist item
  async updateChecklistItem(
    taskId: string,
    itemId: string,
    dto: UpdateChecklistItemDto,
    currentUser: User,
  ) {
    const task = await this.entityValidationService.verifyTaskById(taskId);
    const workspaceId = task.column.board.project.workspaceId;
    const projectId = task.column.board.project.id;
    const boardId = task.column.board.id;

    const existingItem = await this.prisma.taskChecklist.findFirst({
      where: { id: itemId, taskId: task.id },
    });

    if (!existingItem) {
      throw new NotFoundException('Checklist item not found');
    }

    if (dto.assigneeId && dto.assigneeId !== existingItem.assigneeId) {
      await this.entityValidationService.verifyAssignee(
        workspaceId,
        dto.assigneeId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.taskChecklist.update({
        where: { id: itemId },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.isCompleted !== undefined && {
            isCompleted: dto.isCompleted,
          }),
          ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
          ...(dto.order !== undefined && { order: dto.order }),
        },
        include: {
          assignee: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId: task.id,
        action: ActivityAction.CHECKLIST_ITEM_UPDATED,
        description: `${currentUser.name} updated checklist item "${updatedItem.title}"`,
        metadata: {
          taskId: task.id,
          checklistItemId: updatedItem.id,
        },
      });

      this.eventEmitter.emit('checklist.updated', {
        taskId: task.id,
        item: updatedItem,
      });

      return updatedItem;
    });
  }

  // Toggle checklist item completion
  async toggleChecklistItem(taskId: string, itemId: string, currentUser: User) {
    const task = await this.entityValidationService.verifyTaskById(taskId);
    const workspaceId = task.column.board.project.workspaceId;
    const projectId = task.column.board.project.id;
    const boardId = task.column.board.id;

    const existingItem = await this.prisma.taskChecklist.findFirst({
      where: { id: itemId, taskId: task.id },
    });

    if (!existingItem) {
      throw new NotFoundException('Checklist item not found');
    }

    const nextCompletedState = !existingItem.isCompleted;

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.taskChecklist.update({
        where: { id: itemId },
        data: { isCompleted: nextCompletedState },
        include: {
          assignee: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId: task.id,
        action: ActivityAction.CHECKLIST_ITEM_TOGGLED,
        description: `${currentUser.name} marked "${updatedItem.title}" as ${
          nextCompletedState ? 'completed' : 'incomplete'
        }`,
        metadata: {
          taskId: task.id,
          checklistItemId: updatedItem.id,
          isCompleted: nextCompletedState,
        },
      });

      this.eventEmitter.emit('checklist.updated', {
        taskId: task.id,
        item: updatedItem,
      });

      return updatedItem;
    });
  }

  // Delete checklist item
  async deleteChecklistItem(taskId: string, itemId: string, currentUser: User) {
    const task = await this.entityValidationService.verifyTaskById(taskId);
    const workspaceId = task.column.board.project.workspaceId;
    const projectId = task.column.board.project.id;
    const boardId = task.column.board.id;

    const existingItem = await this.prisma.taskChecklist.findFirst({
      where: { id: itemId, taskId: task.id },
    });

    if (!existingItem) {
      throw new NotFoundException('Checklist item not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.taskChecklist.delete({
        where: { id: itemId },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId: task.id,
        action: ActivityAction.CHECKLIST_ITEM_DELETED,
        description: `${currentUser.name} deleted checklist item "${existingItem.title}"`,
        metadata: {
          taskId: task.id,
          checklistItemId: itemId,
        },
      });

      this.eventEmitter.emit('checklist.deleted', {
        taskId: task.id,
        checklistItemId: itemId,
      });

      return null;
    });
  }
}
