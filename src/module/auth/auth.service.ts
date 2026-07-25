import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
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
  ) {}

  // Register
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

    const user = await this.prisma.user.create({
      data: {
        username: dto.username.toLowerCase(),
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    await this.storeHashedToken(user.id, tokens.refreshToken);

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
      user: this.sanitizeUser(user),
      tokens,
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
