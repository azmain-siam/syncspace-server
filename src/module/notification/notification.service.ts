import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType, Prisma } from '@prisma/client';
import { calculatePaginationMeta } from 'src/common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  CommentMentionEvent,
  TaskAssignedEvent,
  WorkspaceInvitationEvent,
} from './events/notification.events';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  // EVENT LISTENERS

  // Task Assigned Event
  @OnEvent('task.assigned')
  async handleTaskAssigned(event: TaskAssignedEvent) {
    if (event.assigneeId === event.actorId) return; // Don't notify self

    await this.prisma.notification.create({
      data: {
        userId: event.assigneeId,
        actorId: event.actorId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task Assigned',
        message: `${event.actorName} assigned you to task "${event.title}"`,
        link: `/workspaces/${event.workspaceId}/projects/${event.projectId}/boards/${event.boardId}/columns/${event.columnId}/tasks/${event.taskId}`,
      },
    });
  }

  // Comment Mention Event
  @OnEvent('comment.mention')
  async handleCommentMention(event: CommentMentionEvent) {
    if (event.mentionedUserId === event.actorId) return; // Don't notify self

    await this.prisma.notification.create({
      data: {
        userId: event.mentionedUserId,
        actorId: event.actorId,
        type: NotificationType.TASK_MENTION,
        title: 'Mentioned in Comment',
        message: `${event.actorName} mentioned you in task "${event.taskTitle}"`,
        link: `/workspaces/${event.workspaceId}/projects/${event.projectId}/boards/${event.boardId}/columns/${event.columnId}/tasks/${event.taskId}`,
      },
    });
  }

  // Workspace Invitation Event
  @OnEvent('workspace.invited')
  async handleWorkspaceInvitation(event: WorkspaceInvitationEvent) {
    if (event.invitedUserId === event.actorId) return; // Don't notify self

    await this.prisma.notification.create({
      data: {
        userId: event.invitedUserId,
        actorId: event.actorId,
        type: NotificationType.WORKSPACE_INVITATION,
        title: 'Workspace Invitation',
        message: `${event.actorName} invited you to join workspace "${event.workspaceName}"`,
        link: `/workspaces/${event.workspaceId}`,
      },
    });
  }

  // REST SERVICE METHODS

  // Get user notifications (paginated)
  async getUserNotifications(userId: string, query: NotificationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
        },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const paginationMeta = calculatePaginationMeta(total, page, limit);

    return {
      notifications,
      meta: {
        ...paginationMeta,
        unreadCount,
      },
    };
  }

  // Mark single notification as read
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  // Mark all user notifications as read
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: 'All notifications marked as read' };
  }

  // Delete notification
  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return null;
  }
}
