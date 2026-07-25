import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, VerificationTokenType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateSecureToken, hashToken } from '../../common/utils/token.util';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { BCRYPT_SALT_ROUNDS } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private jwtService: JwtService,
    private auditLogService: AuditLogService,
    private emailService: EmailService,
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

    await this.emailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationUrl,
    );

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

    await this.emailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationUrl,
    );

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
