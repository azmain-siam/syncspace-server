import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from 'src/common/interfaces/user.interface';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly entityValidationService: EntityValidationService,
  ) {}

  // Create a new label in workspace
  async createLabel(
    workspaceId: string,
    dto: CreateLabelDto,
    currentUser: User,
  ) {
    await this.entityValidationService.verifyWorkspace(workspaceId);

    const existing = await this.prisma.taskLabel.findFirst({
      where: {
        workspaceId,
        name: { equals: dto.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A label with name "${dto.name}" already exists in this workspace`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const label = await tx.taskLabel.create({
        data: {
          workspaceId,
          name: dto.name,
          color: dto.color,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        action: ActivityAction.LABEL_CREATED,
        description: `${currentUser.name} created label "${label.name}"`,
        metadata: { labelId: label.id, name: label.name, color: label.color },
      });

      return label;
    });
  }

  // Get all labels for a workspace
  async getWorkspaceLabels(workspaceId: string) {
    await this.entityValidationService.verifyWorkspace(workspaceId);

    return this.prisma.taskLabel.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }

  // Get label by ID
  async getLabelById(workspaceId: string, labelId: string) {
    const label = await this.prisma.taskLabel.findFirst({
      where: { id: labelId, workspaceId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    return label;
  }

  // Update a label
  async updateLabel(
    workspaceId: string,
    labelId: string,
    dto: UpdateLabelDto,
    currentUser: User,
  ) {
    const label = await this.getLabelById(workspaceId, labelId);

    if (dto.name && dto.name.toLowerCase() !== label.name.toLowerCase()) {
      const duplicate = await this.prisma.taskLabel.findFirst({
        where: {
          workspaceId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: labelId },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `A label with name "${dto.name}" already exists in this workspace`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.taskLabel.update({
        where: { id: labelId },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.color ? { color: dto.color } : {}),
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        action: ActivityAction.LABEL_UPDATED,
        description: `${currentUser.name} updated label "${updated.name}"`,
        metadata: {
          labelId: updated.id,
          name: updated.name,
          color: updated.color,
        },
      });

      return updated;
    });
  }

  // Delete a label
  async deleteLabel(workspaceId: string, labelId: string, currentUser: User) {
    const label = await this.getLabelById(workspaceId, labelId);

    return this.prisma.$transaction(async (tx) => {
      await tx.taskLabel.delete({
        where: { id: labelId },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        action: ActivityAction.LABEL_DELETED,
        description: `${currentUser.name} deleted label "${label.name}"`,
        metadata: { labelId: label.id, name: label.name },
      });

      return { success: true };
    });
  }

  // Attach a label to a task
  async attachLabelToTask(taskId: string, labelId: string, currentUser: User) {
    const task = await this.entityValidationService.verifyTaskById(taskId);
    const workspaceId = task.column.board.project.workspaceId;
    const projectId = task.column.board.project.id;
    const boardId = task.column.board.id;

    const label = await this.getLabelById(workspaceId, labelId);

    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: task.id },
        data: {
          labels: {
            connect: { id: label.id },
          },
        },
        include: {
          labels: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
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
        action: ActivityAction.LABEL_ATTACHED,
        description: `${currentUser.name} added label "${label.name}" to task "${task.title}"`,
        metadata: { taskId: task.id, labelId: label.id, labelName: label.name },
      });

      return updatedTask;
    });
  }

  // Detach a label from a task
  async detachLabelFromTask(
    taskId: string,
    labelId: string,
    currentUser: User,
  ) {
    const task = await this.entityValidationService.verifyTaskById(taskId);
    const workspaceId = task.column.board.project.workspaceId;
    const projectId = task.column.board.project.id;
    const boardId = task.column.board.id;

    const label = await this.getLabelById(workspaceId, labelId);

    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: task.id },
        data: {
          labels: {
            disconnect: { id: label.id },
          },
        },
        include: {
          labels: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
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
        action: ActivityAction.LABEL_DETACHED,
        description: `${currentUser.name} removed label "${label.name}" from task "${task.title}"`,
        metadata: { taskId: task.id, labelId: label.id, labelName: label.name },
      });

      return updatedTask;
    });
  }

  // Set/Replace all labels for a task
  async setTaskLabels(taskId: string, labelIds: string[], currentUser: User) {
    const task = await this.entityValidationService.verifyTaskById(taskId);
    const workspaceId = task.column.board.project.workspaceId;
    const projectId = task.column.board.project.id;
    const boardId = task.column.board.id;

    // Verify all labels exist in this workspace
    if (labelIds.length > 0) {
      const labels = await this.prisma.taskLabel.findMany({
        where: {
          id: { in: labelIds },
          workspaceId,
        },
      });

      if (labels.length !== labelIds.length) {
        throw new BadRequestException(
          'One or more specified labels do not exist in this workspace',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: task.id },
        data: {
          labels: {
            set: labelIds.map((id) => ({ id })),
          },
        },
        include: {
          labels: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
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
        action: ActivityAction.LABEL_UPDATED,
        description: `${currentUser.name} updated labels on task "${task.title}"`,
        metadata: { taskId: task.id, labelIds },
      });

      return updatedTask;
    });
  }
}
