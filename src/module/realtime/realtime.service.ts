import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { RoomType } from './dto/join-room.dto';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server?: Server;

  // Track online users: userId -> Set<socketId>
  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  setServer(server: Server) {
    this.server = server;
  }

  // Register online user connection
  registerConnection(
    userId: string,
    socketId: string,
  ): { isFirstConnection: boolean } {
    let socketSet = this.onlineUsers.get(userId);
    let isFirstConnection = false;

    if (!socketSet) {
      socketSet = new Set<string>();
      this.onlineUsers.set(userId, socketSet);
      isFirstConnection = true;
    }

    socketSet.add(socketId);
    return { isFirstConnection };
  }

  // Unregister user connection
  unregisterConnection(
    userId: string,
    socketId: string,
  ): { isLastConnection: boolean } {
    const socketSet = this.onlineUsers.get(userId);
    let isLastConnection = false;

    if (socketSet) {
      socketSet.delete(socketId);
      if (socketSet.size === 0) {
        this.onlineUsers.delete(userId);
        isLastConnection = true;
      }
    }

    return { isLastConnection };
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  // Get all online user IDs for a given workspace
  async getOnlineUserIdsInWorkspace(workspaceId: string): Promise<string[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    });

    const memberIds = members.map((m) => m.userId);
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
  handleTaskUpdated(payload: { task: any; boardId: string; taskId: string }) {
    if (!this.server) return;
    this.logger.log(`[Realtime Event] task.updated for task ${payload.taskId}`);
    this.server
      .to(`board:${payload.boardId}`)
      .to(`task:${payload.taskId}`)
      .emit('task:updated', payload);
  }

  @OnEvent('task.deleted')
  handleTaskDeleted(payload: { taskId: string; boardId: string }) {
    if (!this.server) return;
    this.logger.log(
      `[Realtime Event] task.deleted on board ${payload.boardId}`,
    );
    this.server.to(`board:${payload.boardId}`).emit('task:deleted', payload);
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
