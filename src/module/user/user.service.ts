import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SAFE_USER_SELECT } from 'src/common/constants/prisma-selects.constant';
import { StorageService } from 'src/common/storage/providers/storage.service';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { BCRYPT_SALT_ROUNDS } from '../auth/auth.constants';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Get current user profile
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Update profile
  async updateProfile(userId: string, dto: UpdateUserDto) {
    // Check if phone number is taken if changed
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone: dto.phone,
          id: { not: userId },
        },
      });

      if (existingPhone) {
        throw new BadRequestException('Phone number is already in use');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
      select: SAFE_USER_SELECT,
    });
  }

  // Upload user avatar
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Avatar image file is required');
    }

    const uploadResult = await this.storageService.upload(
      file,
      'syncspace/users/avatars',
    );

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        avatar: uploadResult.url,
      },
      select: SAFE_USER_SELECT,
    });
  }

  // Change account password
  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.password) {
      throw new BadRequestException(
        'Account was created using social sign-in. Use password reset flow to set a direct password.',
      );
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(
      dto.newPassword,
      BCRYPT_SALT_ROUNDS,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        hashedRefreshToken: null, // Invalidate all active sessions for security
      },
    });

    // Log security audit log
    await this.auditLogService.log({
      actorId: userId,
      action: AuditAction.PASSWORD_CHANGED,
      metadata: { timestamp: new Date().toISOString() },
    });

    return { message: 'Password changed successfully. Please log in again.' };
  }
}
