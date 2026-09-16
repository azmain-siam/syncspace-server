/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceRole } from '@prisma/client';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommentService } from './comment.service';

describe('CommentService', () => {
  let service: CommentService;
  let prisma: any;
  let entityValidationService: any;
  let activityService: any;
  let eventEmitter: any;

  const mockUser: any = {
    id: 'user-1',
    name: 'Alice Developer',
    email: 'alice@example.com',
  };

  const mockTask: any = {
    id: 'task-1',
    title: 'Task 1',
    columnId: 'col-1',
    column: {
      board: {
        id: 'board-1',
        project: {
          id: 'proj-1',
          workspaceId: 'ws-1',
        },
      },
    },
  };

  beforeEach(async () => {
    prisma = {
      comment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      commentReaction: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      workspaceMember: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    entityValidationService = {
      verifyTaskById: jest.fn().mockResolvedValue(mockTask),
    };

    activityService = {
      createActivityLog: jest.fn().mockResolvedValue({}),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntityValidationService, useValue: entityValidationService },
        { provide: ActivityService, useValue: activityService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
  });

  describe('createComment', () => {
    it('should successfully create a comment', async () => {
      const createdComment = {
        id: 'comment-1',
        taskId: 'task-1',
        userId: 'user-1',
        content: 'Looks good to me!',
        createdAt: new Date(),
        user: mockUser,
      };

      prisma.comment.create.mockResolvedValue(createdComment);

      const result = await service.createComment(
        'task-1',
        { content: 'Looks good to me!' },
        mockUser,
      );

      expect(entityValidationService.verifyTaskById).toHaveBeenCalledWith(
        'task-1',
      );
      expect(prisma.comment.create).toHaveBeenCalled();
      expect(activityService.createActivityLog).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'comment.created',
        expect.objectContaining({ taskId: 'task-1' }),
      );
      expect(result).toEqual(createdComment);
    });
  });

  describe('toggleReaction', () => {
    it('should add reaction when not previously reacted', async () => {
      prisma.comment.findFirst.mockResolvedValue({
        id: 'comment-1',
        taskId: 'task-1',
        deletedAt: null,
      });

      // No existing reaction
      prisma.commentReaction.findUnique.mockResolvedValue(null);
      prisma.commentReaction.create.mockResolvedValue({
        id: 'reaction-1',
        commentId: 'comment-1',
        userId: 'user-1',
        emoji: '👍',
      });

      // All reactions on comment after adding
      prisma.commentReaction.findMany.mockResolvedValue([
        {
          id: 'reaction-1',
          commentId: 'comment-1',
          userId: 'user-1',
          emoji: '👍',
          user: mockUser,
        },
      ]);

      const result = await service.toggleReaction(
        'task-1',
        'comment-1',
        { emoji: '👍' },
        mockUser,
      );

      expect(result.action).toBe('added');
      expect(result.emoji).toBe('👍');
      expect(result.reactions).toHaveLength(1);
      expect(result.reactions[0]).toEqual({
        emoji: '👍',
        count: 1,
        hasReacted: true,
        users: [mockUser],
      });
      expect(prisma.commentReaction.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'comment.reaction_updated',
        expect.objectContaining({
          commentId: 'comment-1',
          action: 'added',
          emoji: '👍',
        }),
      );
    });

    it('should remove reaction when already reacted with same emoji', async () => {
      prisma.comment.findFirst.mockResolvedValue({
        id: 'comment-1',
        taskId: 'task-1',
        deletedAt: null,
      });

      // Existing reaction found
      prisma.commentReaction.findUnique.mockResolvedValue({
        id: 'reaction-1',
        commentId: 'comment-1',
        userId: 'user-1',
        emoji: '👍',
      });

      // No reactions left after removal
      prisma.commentReaction.findMany.mockResolvedValue([]);

      const result = await service.toggleReaction(
        'task-1',
        'comment-1',
        { emoji: '👍' },
        mockUser,
      );

      expect(result.action).toBe('removed');
      expect(result.emoji).toBe('👍');
      expect(result.reactions).toHaveLength(0);
      expect(prisma.commentReaction.delete).toHaveBeenCalledWith({
        where: { id: 'reaction-1' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'comment.reaction_updated',
        expect.objectContaining({
          commentId: 'comment-1',
          action: 'removed',
          emoji: '👍',
        }),
      );
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      prisma.comment.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleReaction(
          'task-1',
          'non-existent',
          { emoji: '🚀' },
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCommentReactions', () => {
    it('should aggregate reactions by emoji and indicate hasReacted for current user', async () => {
      prisma.comment.findFirst.mockResolvedValue({
        id: 'comment-1',
        taskId: 'task-1',
        deletedAt: null,
      });

      prisma.commentReaction.findMany.mockResolvedValue([
        {
          id: 'r-1',
          commentId: 'comment-1',
          userId: 'user-1',
          emoji: '❤️',
          user: mockUser,
        },
        {
          id: 'r-2',
          commentId: 'comment-1',
          userId: 'user-2',
          emoji: '❤️',
          user: { id: 'user-2', name: 'Bob', avatar: null },
        },
        {
          id: 'r-3',
          commentId: 'comment-1',
          userId: 'user-2',
          emoji: '🎉',
          user: { id: 'user-2', name: 'Bob', avatar: null },
        },
      ]);

      const result = await service.getCommentReactions(
        'task-1',
        'comment-1',
        mockUser,
      );

      expect(result).toHaveLength(2);
      const heart = result.find((r) => r.emoji === '❤️');
      const party = result.find((r) => r.emoji === '🎉');

      expect(heart?.count).toBe(2);
      expect(heart?.hasReacted).toBe(true);
      expect(party?.count).toBe(1);
      expect(party?.hasReacted).toBe(false);
    });
  });

  describe('updateComment', () => {
    it('should throw ForbiddenException if user is not the author', async () => {
      prisma.comment.findFirst.mockResolvedValue({
        id: 'comment-1',
        taskId: 'task-1',
        userId: 'other-user',
        deletedAt: null,
      });

      await expect(
        service.updateComment(
          'task-1',
          'comment-1',
          { content: 'New text' },
          mockUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteComment', () => {
    it('should successfully delete comment if user is author', async () => {
      prisma.comment.findFirst.mockResolvedValue({
        id: 'comment-1',
        taskId: 'task-1',
        userId: 'user-1',
        deletedAt: null,
      });

      prisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: WorkspaceRole.MEMBER,
      });

      const result = await service.deleteComment(
        'task-1',
        'comment-1',
        mockUser,
      );

      expect(prisma.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comment-1' },
          data: { deletedAt: expect.any(Date) },
        }),
      );
      expect(result).toBeNull();
    });
  });
});
