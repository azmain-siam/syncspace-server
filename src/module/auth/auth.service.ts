import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, VerificationTokenType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateSecureToken } from '../../common/utils/token.util';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from '../queue/email/email.queue.service';
import { BCRYPT_SALT_ROUNDS } from './auth.constants';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { OAuthService } from './services/oauth.service';
import { PasswordResetService } from './services/password-reset.service';
import { GoogleProfile } from './strategies/google.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private jwtService: JwtService,
    private auditLogService: AuditLogService,
    private emailQueueService: EmailQueueService,
    private passwordResetService: PasswordResetService,
    private oauthService: OAuthService,
  ) {}

  // Register user and send email verification token
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username.toLowerCase() }],
      },
    });

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new BadRequestException('Email already exists');
      }
      throw new BadRequestException('Username already taken');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const { rawToken, hashedToken } = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours

    // Transaction: Create User + VerificationToken
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username: dto.username.toLowerCase(),
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          password: hashedPassword,
          isEmailVerified: false,
        },
      });

      await tx.verificationToken.create({
        data: {
          userId: createdUser.id,
          token: hashedToken,
          type: VerificationTokenType.EMAIL_VERIFICATION,
          expiresAt,
        },
      });

      return createdUser;
    });

    // Send Verification Email
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

    // Audit Logs
    await this.auditLogService.log({
      actorId: user.id,
      action: AuditAction.USER_REGISTERED,
      metadata: {
        userId: user.id,
        email: user.email,
      },
    });

    await this.auditLogService.log({
      actorId: user.id,
      action: AuditAction.EMAIL_VERIFICATION_SENT,
      metadata: {
        userId: user.id,
        email: user.email,
      },
    });

    return {
      message: 'Registration successful. Please verify your email.',
      user: this.sanitizeUser(user),
    };
  }

  // Verify User Email (Delegated to PasswordResetService)
  async verifyEmail(rawToken: string) {
    return this.passwordResetService.verifyEmail(rawToken);
  }

  // Resend Verification Email (Delegated to PasswordResetService)
  async resendVerificationEmail(userId: string) {
    return this.passwordResetService.resendVerificationEmail(userId);
  }

  // Forgot Password (Delegated to PasswordResetService)
  async forgotPassword(dto: ForgotPasswordDto) {
    return this.passwordResetService.forgotPassword(dto);
  }

  // Reset Password (Delegated to PasswordResetService)
  async resetPassword(dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto);
  }

  // Validate Google OAuth profile (Delegated to OAuthService)
  async validateGoogleUser(profile: GoogleProfile) {
    return this.oauthService.validateGoogleUser(
      profile,
      (userId, email) => this.generateTokens(userId, email),
      (userId, refreshToken) => this.storeHashedToken(userId, refreshToken),
      (user) => this.sanitizeUser(user),
    );
  }

  // Login
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      await this.auditLogService.log({
        action: AuditAction.FAILED_LOGIN,
        metadata: {
          email: dto.email,
          reason: 'User not found',
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      await this.auditLogService.log({
        actorId: user.id,
        action: AuditAction.FAILED_LOGIN,
        metadata: {
          email: dto.email,
          reason: 'User account has no password set (OAuth account)',
        },
      });
      throw new UnauthorizedException(
        'Please sign in using your OAuth provider',
      );
    }

    const isPasswordMatched = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordMatched) {
      await this.auditLogService.log({
        actorId: user.id,
        action: AuditAction.FAILED_LOGIN,
        metadata: {
          email: dto.email,
          reason: 'Invalid password',
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check Email Verification status
    if (!user.isEmailVerified) {
      await this.auditLogService.log({
        actorId: user.id,
        action: AuditAction.FAILED_LOGIN,
        metadata: {
          email: dto.email,
          reason: 'Email not verified',
        },
      });
      throw new UnauthorizedException(
        'Please verify your email before signing in.',
      );
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await this.storeHashedToken(user.id, tokens.refreshToken);

    await this.auditLogService.log({
      actorId: user.id,
      action: AuditAction.USER_LOGIN,
      metadata: {
        userId: user.id,
        email: user.email,
      },
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // Refresh access token
  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await this.storeHashedToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // Logout and clear refresh token
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });

    await this.auditLogService.log({
      actorId: userId,
      action: AuditAction.USER_LOGOUT,
      metadata: {
        userId,
      },
    });

    return null;
  }

  // Generate access and refresh tokens
  async generateTokens(userId: string, email: string) {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwt.accessSecret'),
      expiresIn: this.configService.get('jwt.accessExpiresIn'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: this.configService.get('jwt.refreshExpiresIn'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  // Store hashed refresh token
  private async storeHashedToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(
      refreshToken,
      BCRYPT_SALT_ROUNDS,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  // Remove password from user
  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
