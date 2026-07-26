import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerificationTokenType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateSecureToken, hashToken } from 'src/common/utils/token.util';
import { AuditLogService } from 'src/module/audit/audit-log.service';
import { AuditAction } from 'src/module/audit/enums/audit-action.enum';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { EmailQueueService } from 'src/module/queue/email/email.queue.service';
import { BCRYPT_SALT_ROUNDS } from '../auth.constants';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  // Verify User Email
  async verifyEmail(rawToken: string) {
    const hashed = hashToken(rawToken);

    const tokenRecord = await this.prisma.verificationToken.findUnique({
      where: { token: hashed },
      include: { user: true },
    });

    if (
      !tokenRecord ||
      tokenRecord.type !== VerificationTokenType.EMAIL_VERIFICATION
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (tokenRecord.usedAt) {
      throw new BadRequestException('Verification token has already been used');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    // Transaction: Verify user email & mark token as used
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      await tx.verificationToken.update({
        where: { id: tokenRecord.id },
        data: {
          usedAt: new Date(),
        },
      });
    });

    // Audit Log
    await this.auditLogService.log({
      actorId: tokenRecord.userId,
      action: AuditAction.EMAIL_VERIFIED,
      metadata: {
        userId: tokenRecord.userId,
        email: tokenRecord.user.email,
        verifiedAt: new Date().toISOString(),
      },
    });

    return {
      message: 'Email verified successfully.',
    };
  }

  // Resend Verification Email
  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Invalidate previous unused verification tokens
    await this.prisma.verificationToken.updateMany({
      where: {
        userId,
        type: VerificationTokenType.EMAIL_VERIFICATION,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const { rawToken, hashedToken } = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.verificationToken.create({
      data: {
        userId,
        token: hashedToken,
        type: VerificationTokenType.EMAIL_VERIFICATION,
        expiresAt,
      },
    });

    const baseUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${rawToken}`;

    await this.emailQueueService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl,
    });

    await this.auditLogService.log({
      actorId: userId,
      action: AuditAction.VERIFICATION_EMAIL_RESENT,
      metadata: {
        userId,
        email: user.email,
      },
    });

    return {
      message: 'Verification email resent successfully.',
    };
  }

  // Forgot Password: Send reset password email securely without user enumeration
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Anti-user enumeration: Always return standard message even if user not found
    if (!user) {
      return {
        message: 'If an account exists, a password reset link has been sent.',
      };
    }

    // Invalidate previous unused PASSWORD_RESET tokens
    await this.prisma.verificationToken.updateMany({
      where: {
        userId: user.id,
        type: VerificationTokenType.PASSWORD_RESET,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const { rawToken, hashedToken } = generateSecureToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 Minutes

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        type: VerificationTokenType.PASSWORD_RESET,
        expiresAt,
      },
    });

    const baseUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    await this.emailQueueService.sendForgotPasswordEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    await this.auditLogService.log({
      actorId: user.id,
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      metadata: {
        userId: user.id,
        email: user.email,
      },
    });

    return {
      message: 'If an account exists, a password reset link has been sent.',
    };
  }

  // Reset Password using token
  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashed = hashToken(dto.token);

    const tokenRecord = await this.prisma.verificationToken.findUnique({
      where: { token: hashed },
      include: { user: true },
    });

    if (
      !tokenRecord ||
      tokenRecord.type !== VerificationTokenType.PASSWORD_RESET
    ) {
      await this.auditLogService.log({
        action: AuditAction.PASSWORD_RESET_TOKEN_INVALID,
        metadata: { reason: 'Invalid or missing token' },
      });
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (tokenRecord.usedAt) {
      await this.auditLogService.log({
        actorId: tokenRecord.userId,
        action: AuditAction.PASSWORD_RESET_TOKEN_INVALID,
        metadata: { reason: 'Token already used' },
      });
      throw new BadRequestException(
        'Password reset token has already been used',
      );
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.auditLogService.log({
        actorId: tokenRecord.userId,
        action: AuditAction.PASSWORD_RESET_TOKEN_EXPIRED,
        metadata: { reason: 'Token expired' },
      });
      throw new BadRequestException('Password reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    // Transaction: Update password, revoke all refresh tokens, mark token used
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          password: hashedPassword,
          hashedRefreshToken: null, // Revoke all refresh tokens
        },
      });

      await tx.verificationToken.update({
        where: { id: tokenRecord.id },
        data: {
          usedAt: new Date(),
        },
      });
    });

    await this.auditLogService.log({
      actorId: tokenRecord.userId,
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      metadata: {
        userId: tokenRecord.userId,
        email: tokenRecord.user.email,
      },
    });

    return {
      message: 'Password reset successfully.',
    };
  }
}
