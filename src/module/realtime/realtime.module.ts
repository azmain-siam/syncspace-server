import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  providers: [RealtimeGateway, RealtimeService, WsJwtGuard],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule {}
