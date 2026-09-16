import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { RoomType } from './dto/join-room.dto';

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private server?: Server;

  // Track online users locally: userId -> Set<socketId>
  private readonly onlineUsers = new Map<string, Set<string>>();

  // Distributed Redis presence client
  private redisClient?: Redis;
  private isRedisAvailable = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.initRedisPresence();
  }

  private initRedisPresence() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password =
      this.configService.get<string>('redis.password') || undefined;

    try {
      this.redisClient = new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });

      this.redisClient.on('connect', () => {
        this.isRedisAvailable = true;
        this.logger.log('Redis connected for distributed presence tracking');
      });

      this.redisClient.on('error', (err) => {
        this.isRedisAvailable = false;
        this.logger.warn(
          `Redis presence client error: ${err.message}. Operating with in-memory presence fallback.`,
        );
      });

      this.redisClient.connect().catch(() => {
        this.isRedisAvailable = false;
      });
    } catch {
      this.isRedisAvailable = false;
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit().catch(() => {});
    }
  }

  setServer(server: Server) {
    this.server = server;
  }

  // Register online user connection (distributed across cluster via Redis with local fallback)
  async registerConnection(
    userId: string,
    socketId: string,
  ): Promise<{ isFirstConnection: boolean }> {
    let socketSet = this.onlineUsers.get(userId);
    let isFirstLocal = false;

    if (!socketSet) {
      socketSet = new Set<string>();
      this.onlineUsers.set(userId, socketSet);
      isFirstLocal = true;
    }

    socketSet.add(socketId);

    if (this.isRedisAvailable && this.redisClient) {
      try {
        const countBefore = await this.redisClient.scard(
          `presence:user:${userId}:sockets`,
        );
        await this.redisClient.sadd(
          `presence:user:${userId}:sockets`,
          socketId,
        );
        await this.redisClient.sadd('presence:users', userId);
        await this.redisClient.expire(`presence:user:${userId}:sockets`, 86400);
        return { isFirstConnection: countBefore === 0 };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Redis error in registerConnection: ${msg}`);
      }
    }

    return { isFirstConnection: isFirstLocal };
  }

  // Unregister user connection (distributed across cluster via Redis with local fallback)
  async unregisterConnection(
    userId: string,
    socketId: string,
  ): Promise<{ isLastConnection: boolean }> {
    const socketSet = this.onlineUsers.get(userId);
    let isLastLocal = false;

    if (socketSet) {
      socketSet.delete(socketId);
      if (socketSet.size === 0) {
        this.onlineUsers.delete(userId);
        isLastLocal = true;
      }
    }

    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.srem(
          `presence:user:${userId}:sockets`,
          socketId,
        );
        const countAfter = await this.redisClient.scard(
          `presence:user:${userId}:sockets`,
        );
        if (countAfter === 0) {
          await this.redisClient.srem('presence:users', userId);
          return { isLastConnection: true };
        }
        return { isLastConnection: false };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Redis error in unregisterConnection: ${msg}`);
      }
    }

    return { isLastConnection: isLastLocal };
  }

  // Check if user is online
  async isUserOnline(userId: string): Promise<boolean> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const isMember = await this.redisClient.sismember(
          'presence:users',
          userId,
        );
        return isMember === 1;
      } catch {
        return this.onlineUsers.has(userId);
      }
    }
    return this.onlineUsers.has(userId);
  }

  // Get all online user IDs for a given workspace
  async getOnlineUserIdsInWorkspace(workspaceId: string): Promise<string[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    });

    const memberIds = members.map((m) => m.userId);

    if (this.isRedisAvailable && this.redisClient) {
      try {
        const onlineList: string[] = [];
        for (const id of memberIds) {
          const isOnline = await this.redisClient.sismember(
            'presence:users',
            id,
          );
          if (isOnline === 1) {
            onlineList.push(id);
          }
        }
        return onlineList;
      } catch {
        return memberIds.filter((id) => this.onlineUsers.has(id));
      }
    }

    return memberIds.filter((id) => this.onlineUsers.has(id));
  }

  // Validate room access membership
  async validateRoomAccess(
    userId: string,
    roomType: RoomType,
    targetId: string,
  ): Promise<boolean> {
    switch (roomType) {
      case RoomType.WORKSPACE: {
        const member = await this.prisma.workspaceMember.findFirst({
          where: { workspaceId: targetId, userId },
        });
        return !!member;
      }

      case RoomType.BOARD: {
        const board = (await this.prisma.board.findFirst({
          where: { id: targetId },
          select: {
            project: { select: { workspaceId: true } },
          },
        })) as { project: { workspaceId: string } } | null;

        if (!board || !board.project) return false;
        const member = await this.prisma.workspaceMember.findFirst({
          where: { workspaceId: board.project.workspaceId, userId },
        });
        return !!member;
      }

      case RoomType.TASK: {
        const task = (await this.prisma.task.findFirst({
          where: { id: targetId },
          select: {
            column: {
              select: {
                board: {
                  select: {
                    project: { select: { workspaceId: true } },
                  },
                },
              },
            },
          },
        })) as {
          column: { board: { project: { workspaceId: string } } };
        } | null;

        if (
          !task ||
          !task.column ||
          !task.column.board ||
          !task.column.board.project
        ) {
          return false;
        }
        const workspaceId: string = task.column.board.project.workspaceId;
        const member = await this.prisma.workspaceMember.findFirst({
          where: { workspaceId, userId },
        });
        return !!member;
      }

      default:
        return false;
    }
  }

  // Domain Event Listeners (Broadcasting via NestJS Event Emitter)

  @OnEvent('task.created')
  handleTaskCreated(payload: {
    task: any;
    boardId: string;
    workspaceId: string;
  }) {
    if (!this.server) return;
    this.logger.log(
      `[Realtime Event] task.created on board ${payload.boardId}`,
    );
    this.server
      .to(`board:${payload.boardId}`)
      .to(`workspace:${payload.workspaceId}`)
      .emit('task:created', payload);
  }

  @OnEvent('task.moved')
  handleTaskMoved(payload: {
    taskId: string;
    sourceColumnId: string;
    destinationColumnId: string;
    newOrder: number;
    boardId: string;
    workspaceId: string;
  }) {
    if (!this.server) return;
    this.logger.log(`[Realtime Event] task.moved on board ${payload.boardId}`);
    this.server
      .to(`board:${payload.boardId}`)
      .to(`workspace:${payload.workspaceId}`)
      .emit('task:moved', payload);
  }

  @OnEvent('task.updated')
  handleTaskUpdated(payload: {
    task: any;
    boardId: string;
    taskId: string;
    workspaceId?: string;
  }) {
    if (!this.server) return;
    this.logger.log(`[Realtime Event] task.updated for task ${payload.taskId}`);
    const target = this.server
      .to(`board:${payload.boardId}`)
      .to(`task:${payload.taskId}`);
    if (payload.workspaceId) {
      target.to(`workspace:${payload.workspaceId}`);
    }
    target.emit('task:updated', payload);
  }

  @OnEvent('task.deleted')
  handleTaskDeleted(payload: {
    taskId: string;
    boardId: string;
    workspaceId?: string;
  }) {
    if (!this.server) return;
    this.logger.log(
      `[Realtime Event] task.deleted on board ${payload.boardId}`,
    );
    const target = this.server.to(`board:${payload.boardId}`);
    if (payload.workspaceId) {
      target.to(`workspace:${payload.workspaceId}`);
    }
    target.emit('task:deleted', payload);
  }

  @OnEvent('comment.created')
  handleCommentCreated(payload: { comment: any; taskId: string }) {
    if (!this.server) return;
    this.logger.log(
      `[Realtime Event] comment.created on task ${payload.taskId}`,
    );
    this.server.to(`task:${payload.taskId}`).emit('comment:created', payload);
  }

  @OnEvent('comment.updated')
  handleCommentUpdated(payload: { comment: any; taskId: string }) {
    if (!this.server) return;
    this.logger.log(
      `[Realtime Event] comment.updated on task ${payload.taskId}`,
    );
    this.server.to(`task:${payload.taskId}`).emit('comment:updated', payload);
  }

  @OnEvent('comment.deleted')
  handleCommentDeleted(payload: { commentId: string; taskId: string }) {
    if (!this.server) return;
    this.logger.log(
      `[Realtime Event] comment.deleted on task ${payload.taskId}`,
    );
    this.server.to(`task:${payload.taskId}`).emit('comment:deleted', payload);
  }

  @OnEvent('comment.reaction_updated')
  handleCommentReactionUpdated(payload: {
    commentId: string;
    taskId: string;
    action: 'added' | 'removed';
    emoji: string;
    actorId: string;
    actorName: string;
    reactions: any[];
  }) {
    if (!this.server) return;
    this.logger.log(
      `[Realtime Event] comment.reaction_updated on task ${payload.taskId} comment ${payload.commentId}`,
    );
    this.server.to(`task:${payload.taskId}`).emit('comment:reaction', payload);
  }

  @OnEvent('notification.created')
  handleNotificationCreated(payload: { notification: any; userId: string }) {
    if (!this.server) return;
    this.logger.log(
      `[Realtime Event] notification.created for user ${payload.userId}`,
    );
    this.server
      .to(`user:${payload.userId}`)
      .emit('notification:created', payload);
  }
}
