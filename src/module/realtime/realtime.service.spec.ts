/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let prisma: any;
  let configService: any;
  let mockServer: any;

  beforeEach(async () => {
    prisma = {
      workspaceMember: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      board: {
        findFirst: jest.fn(),
      },
      task: {
        findFirst: jest.fn(),
      },
    };

    configService = {
      get: jest.fn((key: string, defaultVal?: any) => {
        if (key === 'redis.host') return 'localhost';
        if (key === 'redis.port') return 6379;
        if (key === 'redis.password') return undefined;
        return defaultVal;
      }),
    };

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<RealtimeService>(RealtimeService);
    service.setServer(mockServer);
  });

  describe('presence tracking', () => {
    it('should register connection and identify first connection', async () => {
      const result1 = await service.registerConnection('user-1', 'socket-1');
      expect(result1.isFirstConnection).toBe(true);

      const result2 = await service.registerConnection('user-1', 'socket-2');
      expect(result2.isFirstConnection).toBe(false);

      expect(await service.isUserOnline('user-1')).toBe(true);
      expect(await service.isUserOnline('user-2')).toBe(false);
    });

    it('should unregister connection and identify last connection', async () => {
      await service.registerConnection('user-1', 'socket-1');
      await service.registerConnection('user-1', 'socket-2');

      const unreg1 = await service.unregisterConnection('user-1', 'socket-1');
      expect(unreg1.isLastConnection).toBe(false);
      expect(await service.isUserOnline('user-1')).toBe(true);

      const unreg2 = await service.unregisterConnection('user-1', 'socket-2');
      expect(unreg2.isLastConnection).toBe(true);
      expect(await service.isUserOnline('user-1')).toBe(false);
    });

    it('should return online user IDs in workspace', async () => {
      prisma.workspaceMember.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' },
      ]);

      await service.registerConnection('user-1', 'socket-1');
      await service.registerConnection('user-3', 'socket-3');

      const onlineIds = await service.getOnlineUserIdsInWorkspace('ws-1');
      expect(onlineIds).toEqual(['user-1', 'user-3']);
    });
  });

  describe('event broadcasting', () => {
    it('should broadcast comment:reaction event to task room', () => {
      const payload = {
        commentId: 'comment-1',
        taskId: 'task-1',
        action: 'added' as const,
        emoji: '👍',
        actorId: 'user-1',
        actorName: 'Alice',
        reactions: [
          {
            emoji: '👍',
            count: 1,
            hasReacted: true,
            users: [{ id: 'user-1', name: 'Alice', avatar: null }],
          },
        ],
      };

      service.handleCommentReactionUpdated(payload);

      expect(mockServer.to).toHaveBeenCalledWith('task:task-1');
      expect(mockServer.emit).toHaveBeenCalledWith('comment:reaction', payload);
    });
  });
});
