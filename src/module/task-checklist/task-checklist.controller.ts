import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import type { User } from 'src/common/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { TaskChecklistService } from './task-checklist.service';

@ApiTags('Task Checklists')
@Controller('tasks/:taskId/checklists')
export class TaskChecklistController {
  constructor(private readonly checklistService: TaskChecklistService) {}

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Task checklist items fetched successfully')
  @ApiOperation({ summary: 'Get all checklist items for a task' })
  getChecklistItems(@Param('taskId') taskId: string) {
    return this.checklistService.getChecklistItems(taskId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Checklist item created successfully')
  @ApiOperation({ summary: 'Add a new checklist item to task' })
  createChecklistItem(
    @Param('taskId') taskId: string,
    @Body() dto: CreateChecklistItemDto,
    @CurrentUser() user: User,
  ) {
    return this.checklistService.createChecklistItem(taskId, dto, user);
  }

  @Patch(':itemId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Checklist item updated successfully')
  @ApiOperation({ summary: 'Update checklist item details or assignee' })
  updateChecklistItem(
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @CurrentUser() user: User,
  ) {
    return this.checklistService.updateChecklistItem(taskId, itemId, dto, user);
  }

  @Patch(':itemId/toggle')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Checklist item completion toggled')
  @ApiOperation({ summary: 'Toggle checklist item completion status' })
  toggleChecklistItem(
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: User,
  ) {
    return this.checklistService.toggleChecklistItem(taskId, itemId, user);
  }

  @Delete(':itemId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Checklist item deleted successfully')
  @ApiOperation({ summary: 'Delete checklist item' })
  deleteChecklistItem(
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: User,
  ) {
    return this.checklistService.deleteChecklistItem(taskId, itemId, user);
  }
}
