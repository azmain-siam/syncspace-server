import type { User as PrismaUser } from '@prisma/client';
import { Socket } from 'socket.io';

export class AuthenticatedSocket extends Socket {
  declare data: {
    user: PrismaUser;
    [key: string]: any;
  };
}
