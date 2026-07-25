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
import { CreateTaskLinkDto } from './dto/create-task-link.dto';
import { UpdateTaskLinkDto } from './dto/update-task-link.dto';
import { TaskLinkService } from './task-link.service';

@ApiTags('Task Links')
@Controller(
  'workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId/links',
)
export class TaskLinkController {
  constructor(private readonly taskLinkService: TaskLinkService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task link created successfully')
  @ApiOperation({ summary: 'Attach an external link to a task' })
  createTaskLink(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskLinkDto,
    @CurrentUser() user: User,
  ) {
    return this.taskLinkService.createTaskLink(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      dto,
      user,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task links fetched successfully')
  @ApiOperation({ summary: 'Get all external links attached to a task' })
  getTaskLinks(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskLinkService.getTaskLinks(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
    );
  }

  @Get(':linkId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task link fetched successfully')
  @ApiOperation({ summary: 'Get details of a single task link' })
  getSingleTaskLink(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Param('linkId') linkId: string,
  ) {
    return this.taskLinkService.getSingleTaskLink(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      linkId,
    );
  }

  @Patch(':linkId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task link updated successfully')
  @ApiOperation({ summary: 'Update a task link' })
  updateTaskLink(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateTaskLinkDto,
    @CurrentUser() user: User,
  ) {
    return this.taskLinkService.updateTaskLink(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      linkId,
      dto,
      user,
    );
  }

  @Delete(':linkId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task link deleted successfully')
  @ApiOperation({ summary: 'Delete a task link' })
  deleteTaskLink(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: User,
  ) {
    return this.taskLinkService.deleteTaskLink(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      linkId,
      user,
    );
  }
}
