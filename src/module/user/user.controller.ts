import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import type { User } from 'src/common/interfaces/user.interface';
import {
  avatarFileFilter,
  MAX_AVATAR_SIZE,
  memoryStorageConfig,
} from 'src/config/storage.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('User profile fetched successfully')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: User) {
    return this.userService.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('User profile updated successfully')
  @ApiOperation({
    summary: 'Update current user profile (name, bio, timezone, phone)',
  })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorageConfig,
      limits: { fileSize: MAX_AVATAR_SIZE },
      fileFilter: avatarFileFilter,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'User avatar image file upload (JPEG, PNG, WEBP, GIF, max 5MB)',
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ResponseMessage('Avatar uploaded successfully')
  @ApiOperation({ summary: 'Upload user profile avatar image' })
  uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.uploadAvatar(user.id, file);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Password changed successfully')
  @ApiOperation({ summary: 'Change user account password' })
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(user.id, dto);
  }
}
