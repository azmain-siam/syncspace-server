/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;
  let eventEmitter: any;

  const mockCreatedNotification = {
    id: 'notif-1',
    userId: 'user-2',
    actorId: 'user-1',
    type: NotificationType.TASK_ASSIGNED,
    title: 'Task Assigned',
    message: 'Alice assigned you to task "Test Task"',
    link: '/tasks/task-1',
    isRead: false,
    actor: {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
      avatar: null,
    },
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn().mockResolvedValue(mockCreatedNotification),
        findMany: jest.fn().mockResolvedValue([mockCreatedNotification]),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('handleTaskAssigned', () => {
    it('should create a notification and emit notification.created when assigned to another user', async () => {
      await service.handleTaskAssigned({
        taskId: 'task-1',
        title: 'Test Task',
        assigneeId: 'user-2',
        actorId: 'user-1',
        actorName: 'Alice',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        boardId: 'board-1',
        columnId: 'col-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-2',
          actorId: 'user-1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Task Assigned',
          message: 'Alice assigned you to task "Test Task"',
          link: '/tasks/task-1',
        },
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
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.created', {
        notification: mockCreatedNotification,
        userId: 'user-2',
      });
    });

    it('should not notify self when assigneeId matches actorId', async () => {
      await service.handleTaskAssigned({
        taskId: 'task-1',
        title: 'Test Task',
        assigneeId: 'user-1',
        actorId: 'user-1',
        actorName: 'Alice',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        boardId: 'board-1',
        columnId: 'col-1',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleCommentMention', () => {
    it('should create a notification and emit notification.created when mentioned', async () => {
      await service.handleCommentMention({
        commentId: 'comment-1',
        taskId: 'task-1',
        taskTitle: 'Important Task',
        mentionedUserId: 'user-2',
        actorId: 'user-1',
        actorName: 'Alice',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        boardId: 'board-1',
        columnId: 'col-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: NotificationType.TASK_MENTION,
            userId: 'user-2',
            actorId: 'user-1',
          }),
        }),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.created', {
        notification: mockCreatedNotification,
        userId: 'user-2',
      });
    });

    it('should not notify self when mentionedUserId matches actorId', async () => {
      await service.handleCommentMention({
        commentId: 'comment-1',
        taskId: 'task-1',
        taskTitle: 'Important Task',
        mentionedUserId: 'user-1',
        actorId: 'user-1',
        actorName: 'Alice',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        boardId: 'board-1',
        columnId: 'col-1',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleWorkspaceInvitation', () => {
    it('should create notification and emit notification.created on workspace invite', async () => {
      await service.handleWorkspaceInvitation({
        workspaceId: 'ws-1',
        workspaceName: 'Engineering Workspace',
        invitedUserId: 'user-2',
        actorId: 'user-1',
        actorName: 'Alice',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: NotificationType.WORKSPACE_INVITATION,
            userId: 'user-2',
            actorId: 'user-1',
          }),
        }),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.created', {
        notification: mockCreatedNotification,
        userId: 'user-2',
      });
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated user notifications and unreadCount', async () => {
      prisma.notification.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unreadCount

      const result = await service.getUserNotifications('user-2', {
        page: 1,
        limit: 10,
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.unreadCount).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      prisma.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-2',
      });
      prisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        isRead: true,
      });

      const result = await service.markAsRead('user-2', 'notif-1');
      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException if notification is not found', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('user-2', 'notif-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications to read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-2');
      expect(result.message).toBe('All notifications marked as read');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-2', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification if found', async () => {
      prisma.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-2',
      });
      prisma.notification.delete.mockResolvedValue({ id: 'notif-1' });

      const result = await service.deleteNotification('user-2', 'notif-1');
      expect(result).toBeNull();
      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      });
    });

    it('should throw NotFoundException if notification to delete is not found', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteNotification('user-2', 'notif-999'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
