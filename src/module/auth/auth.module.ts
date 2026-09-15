import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditLogModule } from '../audit/audit-log.module';
import { QueueModule } from '../queue/queue.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthService } from './services/oauth.service';
import { PasswordResetService } from './services/password-reset.service';
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
  providers: [
    AuthService,
    PasswordResetService,
    OAuthService,
    JwtStrategy,
    RefreshStrategy,
    GoogleStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService, PasswordResetService, OAuthService],
})
export class AuthModule {}
