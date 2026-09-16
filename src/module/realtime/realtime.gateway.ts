import {
  Logger,
  OnModuleDestroy,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JoinRoomDto } from './dto/join-room.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { AuthenticatedSocket } from './interfaces/authenticated-socket.interface';
import { RealtimeService } from './realtime.service';

interface SocketJwtPayload {
  sub: string;
  email?: string;
}

@WebSocketGateway({
  namespace: 'realtime',
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  private readonly logger = new Logger(RealtimeGateway.name);
  private pubClient?: Redis;
  private subClient?: Redis;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async afterInit(server: Server) {
    this.realtimeService.setServer(server);
    await this.setupRedisAdapter(server);
    this.logger.log(
      'Socket.IO Realtime Gateway initialized on namespace /realtime',
    );
  }

  private async setupRedisAdapter(server: Server) {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password =
      this.configService.get<string>('redis.password') || undefined;

    try {
      this.pubClient = new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      this.subClient = this.pubClient.duplicate();

      this.pubClient.on('error', (err) => {
        this.logger.warn(`Redis pubClient error: ${err.message}`);
      });
      this.subClient.on('error', (err) => {
        this.logger.warn(`Redis subClient error: ${err.message}`);
      });

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      server.adapter(createAdapter(this.pubClient, this.subClient));

      this.logger.log(
        'Socket.IO Redis Adapter successfully attached for distributed presence and room synchronization',
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to connect Redis Adapter: ${msg}. Operating in standalone in-memory mode.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.pubClient) {
      await this.pubClient.quit().catch(() => {});
    }
    if (this.subClient) {
      await this.subClient.quit().catch(() => {});
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(
          `Connection refused for socket ${client.id}: No token provided`,
        );
        client.disconnect(true);
        return;
      }

      const secret = this.configService.get<string>('jwt.accessSecret');
      const payload = await this.jwtService.verifyAsync<SocketJwtPayload>(
        token,
        { secret },
      );

      if (!payload || !payload.sub) {
        this.logger.warn(
          `Connection refused for socket ${client.id}: Invalid token`,
        );
        client.disconnect(true);
        return;
      }

      const userId: string = payload.sub;
      const user = await this.prisma.user.findFirst({
        where: { id: userId },
      });

      if (!user) {
        this.logger.warn(
          `Connection refused for socket ${client.id}: User not found`,
        );
        client.disconnect(true);
        return;
      }

      client.data.user = user;

      // Join private user room for direct user notifications
      await client.join(`user:${user.id}`);

      // Presence registration
      const { isFirstConnection } =
        await this.realtimeService.registerConnection(user.id, client.id);

      if (isFirstConnection) {
        this.server.emit('user:online', {
          userId: user.id,
          user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
          },
        });
      }

      this.logger.log(
        `Socket connected: ${client.id} (User: ${user.name} <${user.email}>)`,
      );
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Connection error for socket ${client.id}: ${errMessage}`,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data?.user;

    if (user) {
      const { isLastConnection } =
        await this.realtimeService.unregisterConnection(user.id, client.id);

      if (isLastConnection) {
        this.server.emit('user:offline', {
          userId: user.id,
        });
      }

      this.logger.log(`Socket disconnected: ${client.id} (User: ${user.name})`);
    } else {
      this.logger.log(`Unauthenticated socket disconnected: ${client.id}`);
    }
  }

  // Subscribe to room (workspace, board, task)
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    const user = client.data.user;

    const hasAccess = await this.realtimeService.validateRoomAccess(
      user.id,
      dto.roomType,
      dto.targetId,
    );

    if (!hasAccess) {
      throw new WsException(
        `Access denied to ${dto.roomType} room with ID ${dto.targetId}`,
      );
    }

    const roomName = `${dto.roomType}:${dto.targetId}`;
    await client.join(roomName);

    this.logger.log(`User ${user.name} joined room ${roomName}`);

    return {
      event: 'room:joined',
      data: { room: roomName, roomType: dto.roomType, targetId: dto.targetId },
    };
  }

  // Leave room
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: LeaveRoomDto,
  ) {
    const user = client.data.user;
    const roomName = `${dto.roomType}:${dto.targetId}`;

    await client.leave(roomName);

    this.logger.log(`User ${user.name} left room ${roomName}`);

    return {
      event: 'room:left',
      data: { room: roomName, roomType: dto.roomType, targetId: dto.targetId },
    };
  }

  // Get online presence users for workspace
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('presence:get_online')
  async handleGetOnlinePresence(
    @MessageBody() payload: { workspaceId: string },
  ) {
    if (!payload || !payload.workspaceId) {
      throw new WsException('Workspace ID is required');
    }

    const onlineUserIds =
      await this.realtimeService.getOnlineUserIdsInWorkspace(
        payload.workspaceId,
      );

    return {
      event: 'presence:online_users',
      data: {
        workspaceId: payload.workspaceId,
        onlineUserIds,
      },
    };
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    if (auth && typeof auth.token === 'string') {
      return auth.token.replace(/^Bearer\s+/i, '').trim();
    }

    const headers = client.handshake.headers as
      | Record<string, unknown>
      | undefined;
    if (headers && typeof headers.authorization === 'string') {
      return headers.authorization.replace(/^Bearer\s+/i, '').trim();
    }

    const query = client.handshake.query as Record<string, unknown> | undefined;
    if (query && typeof query.token === 'string') {
      return query.token.trim();
    }

    return null;
  }
}
