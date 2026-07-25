import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { User } from 'src/common/interfaces/user.interface';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskLinkDto } from './dto/create-task-link.dto';
import { UpdateTaskLinkDto } from './dto/update-task-link.dto';

@Injectable()
export class TaskLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  // Verify task exists in column, board, project, and workspace
  private async verifyTask(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        column: {
          id: columnId,
          board: {
            id: boardId,
            project: {
              id: projectId,
              workspaceId,
              deletedAt: null,
            },
          },
        },
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found in this column');
    }

    return task;
  }

  // Create Link
  async createTaskLink(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    dto: CreateTaskLinkDto,
    currentUser: User,
  ) {
    const task = await this.verifyTask(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
    );

    return this.prisma.$transaction(async (tx) => {
      const link = await tx.taskLink.create({
        data: {
          taskId: task.id,
          createdById: currentUser.id,
          title: dto.title,
          url: dto.url,
          type: dto.type,
        },
        include: {
          createdBy: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId: task.id,
        action: ActivityAction.TASK_LINK_CREATED,
        description: `${currentUser.name} attached a ${dto.type} link '${dto.title}' to task '${task.title}'`,
        metadata: {
          taskId: task.id,
          linkId: link.id,
          linkType: link.type,
        },
      });

      return link;
    });
  }

  // Get All Links for a Task
  async getTaskLinks(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
  ) {
    await this.verifyTask(workspaceId, projectId, boardId, columnId, taskId);

    return this.prisma.taskLink.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: SAFE_USER_MINIMAL_SELECT },
      },
    });
  }

  // Get Single Link
  async getSingleTaskLink(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    linkId: string,
  ) {
    await this.verifyTask(workspaceId, projectId, boardId, columnId, taskId);

    const link = await this.prisma.taskLink.findFirst({
      where: {
        id: linkId,
        taskId,
      },
      include: {
        createdBy: { select: SAFE_USER_MINIMAL_SELECT },
      },
    });

    if (!link) {
      throw new NotFoundException('Task link not found');
    }

    return link;
  }

  // Update Link
  async updateTaskLink(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    linkId: string,
    dto: UpdateTaskLinkDto,
    currentUser: User,
  ) {
    await this.verifyTask(workspaceId, projectId, boardId, columnId, taskId);

    const link = await this.prisma.taskLink.findFirst({
      where: {
        id: linkId,
        taskId,
      },
    });

    if (!link) {
      throw new NotFoundException('Task link not found');
    }

    // Check permission (Creator or Workspace Owner/Admin)
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUser.id,
        },
      },
    });

    const isCreator = link.createdById === currentUser.id;
    const isElevated =
      member &&
      (member.role === WorkspaceRole.OWNER ||
        member.role === WorkspaceRole.ADMIN);

    if (!isCreator && !isElevated) {
      throw new ForbiddenException(
        'Insufficient permissions to update this task link',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedLink = await tx.taskLink.update({
        where: { id: linkId },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.url && { url: dto.url }),
          ...(dto.type && { type: dto.type }),
        },
        include: {
          createdBy: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId,
        action: ActivityAction.TASK_LINK_UPDATED,
        description: `${currentUser.name} updated a ${updatedLink.type} link '${updatedLink.title}'`,
        metadata: {
          taskId,
          linkId,
          linkType: updatedLink.type,
        },
      });

      return updatedLink;
    });
  }

  // Delete Link
  async deleteTaskLink(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    linkId: string,
    currentUser: User,
  ) {
    await this.verifyTask(workspaceId, projectId, boardId, columnId, taskId);

    const link = await this.prisma.taskLink.findFirst({
      where: {
        id: linkId,
        taskId,
      },
    });

    if (!link) {
      throw new NotFoundException('Task link not found');
    }

    // Check permission (Creator or Workspace Owner/Admin)
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUser.id,
        },
      },
    });

    const isCreator = link.createdById === currentUser.id;
    const isElevated =
      member &&
      (member.role === WorkspaceRole.OWNER ||
        member.role === WorkspaceRole.ADMIN);

    if (!isCreator && !isElevated) {
      throw new ForbiddenException(
        'Insufficient permissions to delete this task link',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.taskLink.delete({
        where: { id: linkId },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId,
        action: ActivityAction.TASK_LINK_DELETED,
        description: `${currentUser.name} removed a ${link.type} link '${link.title}'`,
        metadata: {
          taskId,
          linkId,
          linkType: link.type,
        },
      });

      return null;
    });
  }
}
