/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { VerificationTokenType } from '@prisma/client';
import { AuditLogService } from 'src/module/audit/audit-log.service';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { EmailQueueService } from 'src/module/queue/email/email.queue.service';
import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let prisma: any;
  let emailQueueService: any;
  let auditLogService: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      verificationToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    emailQueueService = {
      sendVerificationEmail: jest.fn().mockResolvedValue({}),
      sendForgotPasswordEmail: jest.fn().mockResolvedValue({}),
    };

    auditLogService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: EmailQueueService, useValue: emailQueueService },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resendVerificationEmail', () => {
    it('should generate a new token and queue email for unverified user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Alex',
        email: 'alex@example.com',
        isEmailVerified: false,
      });

      const result = await service.resendVerificationEmail({
        email: 'alex@example.com',
      });

      expect(result.message).toContain(
        'If an unverified account exists with this email',
      );
      expect(prisma.verificationToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: VerificationTokenType.EMAIL_VERIFICATION,
          usedAt: null,
        },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.verificationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          type: VerificationTokenType.EMAIL_VERIFICATION,
        }),
      });
      expect(emailQueueService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'alex@example.com',
          name: 'Alex',
        }),
      );
      expect(auditLogService.log).toHaveBeenCalled();
    });

    it('should return standard anti-enumeration message if user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.resendVerificationEmail({
        email: 'nonexistent@example.com',
      });

      expect(result.message).toContain(
        'If an unverified account exists with this email',
      );
      expect(prisma.verificationToken.create).not.toHaveBeenCalled();
      expect(emailQueueService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should return standard anti-enumeration message if user is already verified', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'verified@example.com',
        isEmailVerified: true,
      });

      const result = await service.resendVerificationEmail({
        email: 'verified@example.com',
      });

      expect(result.message).toContain(
        'If an unverified account exists with this email',
      );
      expect(prisma.verificationToken.create).not.toHaveBeenCalled();
      expect(emailQueueService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully when token is valid', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        type: VerificationTokenType.EMAIL_VERIFICATION,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        user: { email: 'alex@example.com' },
      });

      const result = await service.verifyEmail('rawToken123');

      expect(result.message).toBe('Email verified successfully.');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ isEmailVerified: true }),
      });
      expect(prisma.verificationToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      });
    });

    it('should throw BadRequestException if token is expired', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        type: VerificationTokenType.EMAIL_VERIFICATION,
        usedAt: null,
        expiresAt: new Date(Date.now() - 100000),
        user: { email: 'alex@example.com' },
      });

      await expect(service.verifyEmail('expiredToken')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
