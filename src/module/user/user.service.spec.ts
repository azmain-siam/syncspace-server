/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { StorageService } from 'src/common/storage/providers/storage.service';
import { AuditLogService } from '../audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: any;
  let storage: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    storage = {
      upload: jest.fn(),
    };
    audit = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: AuditLogService, useValue: audit },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile if user exists', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'john',
        name: 'John Doe',
        email: 'john@example.com',
        bio: 'Developer',
        timezone: 'UTC',
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('user-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile fields', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'John Updated',
        bio: 'Senior Dev',
      });

      const result = await service.updateProfile('user-1', {
        name: 'John Updated',
        bio: 'Senior Dev',
      });

      expect(result.name).toBe('John Updated');
    });

    it('should throw BadRequestException if phone number is taken by another user', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'other-user',
        phone: '+1234567890',
      });

      await expect(
        service.updateProfile('user-1', { phone: '+1234567890' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    it('should throw if new password and confirm password do not match', async () => {
      await expect(
        service.changePassword('user-1', {
          currentPassword: 'old',
          newPassword: 'newPassword1',
          confirmPassword: 'newPassword2',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if current password matches new password', async () => {
      await expect(
        service.changePassword('user-1', {
          currentPassword: 'samePassword1',
          newPassword: 'samePassword1',
          confirmPassword: 'samePassword1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should change password and log audit log on valid request', async () => {
      const hashedOldPassword = await bcrypt.hash('oldPassword123', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: hashedOldPassword,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.changePassword('user-1', {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
        confirmPassword: 'newPassword456',
      });

      expect(result.message).toContain('Password changed successfully');
      expect(prisma.user.update).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on wrong current password', async () => {
      const hashedOldPassword = await bcrypt.hash('correctPassword', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: hashedOldPassword,
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword456',
          confirmPassword: 'newPassword456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
