import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuthProvider,
  OAuthProvider,
  User,
  VerificationTokenType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateSecureToken, hashToken } from '../../common/utils/token.util';
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
import { GoogleProfile } from './strategies/google.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private jwtService: JwtService,
    private auditLogService: AuditLogService,
    private emailQueueService: EmailQueueService,
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

  // Validate Google OAuth profile & login/link/register user
  async validateGoogleUser(profile: GoogleProfile) {
    // 1. Check if OAuthAccount exists for Google provider
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: OAuthProvider.GOOGLE,
          providerId: profile.googleId,
        },
      },
      include: { user: true },
    });

    if (existingOAuth) {
      const user = existingOAuth.user;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await this.auditLogService.log({
        actorId: user.id,
        action: AuditAction.GOOGLE_LOGIN,
        metadata: { userId: user.id, email: user.email },
      });

      const tokens = await this.generateTokens(user.id, user.email);
      await this.storeHashedToken(user.id, tokens.refreshToken);

      return {
        user: this.sanitizeUser(user),
        tokens,
      };
    }

    // 2. Search if user exists by email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: profile.email.toLowerCase() },
    });

    if (existingUser) {
      // Automatically link Google account
      await this.prisma.$transaction([
        this.prisma.oAuthAccount.create({
          data: {
            userId: existingUser.id,
            provider: OAuthProvider.GOOGLE,
            providerId: profile.googleId,
          },
        }),
        this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            isEmailVerified: true,
            emailVerifiedAt: existingUser.emailVerifiedAt || new Date(),
            lastLoginAt: new Date(),
            avatar: existingUser.avatar || profile.avatar,
          },
        }),
      ]);

      await this.auditLogService.log({
        actorId: existingUser.id,
        action: AuditAction.GOOGLE_ACCOUNT_LINKED,
        metadata: { userId: existingUser.id, email: existingUser.email },
      });

      await this.auditLogService.log({
        actorId: existingUser.id,
        action: AuditAction.GOOGLE_LOGIN,
        metadata: { userId: existingUser.id, email: existingUser.email },
      });

      const tokens = await this.generateTokens(
        existingUser.id,
        existingUser.email,
      );
      await this.storeHashedToken(existingUser.id, tokens.refreshToken);

      return {
        user: this.sanitizeUser(existingUser),
        tokens,
      };
    }

    // 3. User does not exist — Create new Google user
    const username = await this.generateUniqueUsername(
      profile.name,
      profile.email,
    );

    const newUser = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username,
          name: profile.name,
          email: profile.email.toLowerCase(),
          avatar: profile.avatar,
          password: null,
          provider: AuthProvider.GOOGLE,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });

      await tx.oAuthAccount.create({
        data: {
          userId: createdUser.id,
          provider: OAuthProvider.GOOGLE,
          providerId: profile.googleId,
        },
      });

      return createdUser;
    });

    await this.auditLogService.log({
      actorId: newUser.id,
      action: AuditAction.GOOGLE_ACCOUNT_CREATED,
      metadata: { userId: newUser.id, email: newUser.email },
    });

    await this.auditLogService.log({
      actorId: newUser.id,
      action: AuditAction.GOOGLE_LOGIN,
      metadata: { userId: newUser.id, email: newUser.email },
    });

    const tokens = await this.generateTokens(newUser.id, newUser.email);
    await this.storeHashedToken(newUser.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(newUser),
      tokens,
    };
  }

  // Generate unique username helper
  private async generateUniqueUsername(
    name: string,
    email: string,
  ): Promise<string> {
    const baseName =
      (
        name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || email.split('@')[0]
      ).substring(0, 15) || 'user';

    let username = baseName;
    let counter = 1;

    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseName}${counter}`;
      counter++;
    }

    return username;
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
