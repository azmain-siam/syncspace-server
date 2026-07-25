import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditLogModule } from '../audit/audit-log.module';
import { QueueModule } from '../queue/queue.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    AuditLogModule,
    QueueModule,
  ],
  providers: [AuthService, JwtStrategy, RefreshStrategy, GoogleStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
