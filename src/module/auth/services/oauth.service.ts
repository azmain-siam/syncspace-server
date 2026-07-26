/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { AuthProvider, OAuthProvider, User } from '@prisma/client';
import { AuditLogService } from 'src/module/audit/audit-log.service';
import { AuditAction } from 'src/module/audit/enums/audit-action.enum';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { GoogleProfile } from '../strategies/google.strategy';

@Injectable()
export class OAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Generate unique username helper
  async generateUniqueUsername(name: string, email: string): Promise<string> {
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

  // Validate Google OAuth profile & login/link/register user
  async validateGoogleUser(
    profile: GoogleProfile,
    generateTokensFn: (
      userId: string,
      email: string,
    ) => Promise<{ accessToken: string; refreshToken: string }>,
    storeHashedTokenFn: (userId: string, refreshToken: string) => Promise<void>,
    sanitizeUserFn: (user: User) => any,
  ) {
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

      const tokens = await generateTokensFn(user.id, user.email);
      await storeHashedTokenFn(user.id, tokens.refreshToken);

      return {
        user: sanitizeUserFn(user),
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

      const tokens = await generateTokensFn(
        existingUser.id,
        existingUser.email,
      );
      await storeHashedTokenFn(existingUser.id, tokens.refreshToken);

      return {
        user: sanitizeUserFn(existingUser),
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

    const tokens = await generateTokensFn(newUser.id, newUser.email);
    await storeHashedTokenFn(newUser.id, tokens.refreshToken);

    return {
      user: sanitizeUserFn(newUser),
      tokens,
    };
  }
}
