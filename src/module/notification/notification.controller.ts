import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import type { User } from 'src/common/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Notifications fetched successfully')
  @ApiOperation({ summary: 'Get user notifications' })
  getUserNotifications(
    @CurrentUser() user: User,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.getUserNotifications(user.id, query);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('All notifications marked as read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Notification marked as read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationService.markAsRead(user.id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Notification deleted successfully')
  @ApiOperation({ summary: 'Delete notification' })
  deleteNotification(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationService.deleteNotification(user.id, id);
  }
}
