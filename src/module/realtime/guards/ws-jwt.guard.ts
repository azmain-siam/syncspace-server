import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';

interface SocketJwtPayload {
  sub: string;
  email?: string;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();

    try {
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        throw new WsException('Missing authentication token');
      }

      const secret = this.configService.get<string>('jwt.accessSecret');
      const payload = await this.jwtService.verifyAsync<SocketJwtPayload>(
        token,
        { secret },
      );

      if (!payload || !payload.sub) {
        throw new WsException('Invalid token payload');
      }

      const userId: string = payload.sub;
      const user = await this.prisma.user.findFirst({
        where: { id: userId },
      });

      if (!user) {
        throw new WsException('User not found or account deactivated');
      }

      // Attach authenticated user to socket context
      client.data.user = user;
      return true;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unauthorized socket connection';
      this.logger.warn(`WS Auth Guard rejected connection: ${message}`);
      throw new WsException(message);
    }
  }

  private extractTokenFromSocket(client: AuthenticatedSocket): string | null {
    // 1. Check handshake auth object
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    if (auth && typeof auth.token === 'string') {
      return auth.token.replace(/^Bearer\s+/i, '').trim();
    }

    // 2. Check HTTP headers
    const headers = client.handshake.headers as
      | Record<string, unknown>
      | undefined;
    if (headers && typeof headers.authorization === 'string') {
      return headers.authorization.replace(/^Bearer\s+/i, '').trim();
    }

    // 3. Check query parameters
    const query = client.handshake.query as Record<string, unknown> | undefined;
    if (query && typeof query.token === 'string') {
      return query.token.trim();
    }

    return null;
  }
}
