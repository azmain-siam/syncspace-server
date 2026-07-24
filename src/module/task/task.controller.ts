import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import type { User } from 'src/common/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskService } from './task.service';

@Controller(
  'workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks',
)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task created successfully')
  @ApiOperation({ summary: 'Create task in board column' })
  createTask(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.taskService.createTask(
      workspaceId,
      projectId,
      boardId,
      columnId,
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
  @ResponseMessage('Column tasks fetched successfully')
  @ApiOperation({ summary: 'Get all tasks in board column' })
  getTasks(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Query() query: TaskQueryDto,
  ) {
    return this.taskService.getTasks(
      workspaceId,
      projectId,
      boardId,
      columnId,
      query,
    );
  }

  @Get(':taskId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task fetched successfully')
  @ApiOperation({ summary: 'Get single task details' })
  getTask(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskService.getTask(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
    );
  }

  @Patch(':taskId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task updated successfully')
  @ApiOperation({ summary: 'Update task properties' })
  updateTask(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.taskService.updateTask(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      dto,
      user,
    );
  }

  @Patch(':taskId/move')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task moved successfully')
  @ApiOperation({ summary: 'Move task across columns or reorder' })
  moveTask(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Body() dto: MoveTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.taskService.moveTask(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      dto,
      user,
    );
  }

  @Delete(':taskId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task deleted successfully')
  @ApiOperation({ summary: 'Delete task' })
  deleteTask(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
  ) {
    return this.taskService.deleteTask(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      user,
    );
  }
}
