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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import type { User } from 'src/common/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { BulkDeleteTasksDto } from './dto/bulk-delete-tasks.dto';
import { BulkUpdateTasksDto } from './dto/bulk-update-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { MyTasksQueryDto } from './dto/my-tasks-query.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { WorkspaceTasksQueryDto } from './dto/workspace-tasks-query.dto';
import { TaskService } from './task.service';

@ApiTags('Tasks')
@Controller()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('workspaces/:workspaceId/tasks')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Workspace tasks fetched successfully')
  @ApiOperation({
    summary:
      'Get all tasks across the workspace with filtering, sorting and grouping',
  })
  getWorkspaceTasks(
    @Param('workspaceId') workspaceId: string,
    @Query() query: WorkspaceTasksQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.taskService.getWorkspaceTasks(workspaceId, query, user);
  }

  @Get('workspaces/:workspaceId/my-tasks')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Personal workspace tasks fetched successfully')
  @ApiOperation({
    summary: 'Get all tasks assigned to current user across the workspace',
  })
  getMyTasks(
    @Param('workspaceId') workspaceId: string,
    @Query() query: MyTasksQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.taskService.getMyTasks(workspaceId, query, user);
  }

  @Post('columns/:columnId/tasks')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task created successfully')
  @ApiOperation({ summary: 'Create task in board column' })
  createTask(
    @Param('columnId') columnId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.taskService.createTask(columnId, dto, user);
  }

  @Get('columns/:columnId/tasks')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Column tasks fetched successfully')
  @ApiOperation({ summary: 'Get all tasks in board column' })
  getTasks(@Param('columnId') columnId: string, @Query() query: TaskQueryDto) {
    return this.taskService.getTasks(columnId, query);
  }

  @Get('tasks/:taskId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Task fetched successfully')
  @ApiOperation({ summary: 'Get single task details' })
  getTask(@Param('taskId') taskId: string) {
    return this.taskService.getTask(taskId);
  }

  @Patch('tasks/:taskId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task updated successfully')
  @ApiOperation({ summary: 'Update task properties' })
  updateTask(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.taskService.updateTask(taskId, dto, user);
  }

  @Post('tasks/:taskId/move')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task moved successfully')
  @ApiOperation({ summary: 'Move task across columns or reorder' })
  moveTask(
    @Param('taskId') taskId: string,
    @Body() dto: MoveTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.taskService.moveTask(taskId, dto, user);
  }

  @Delete('tasks/:taskId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task deleted successfully')
  @ApiOperation({ summary: 'Delete task' })
  deleteTask(@Param('taskId') taskId: string, @CurrentUser() user: User) {
    return this.taskService.deleteTask(taskId, user);
  }

  @Post(['tasks/bulk-update', 'workspaces/:workspaceId/tasks/bulk-update'])
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Tasks updated successfully in bulk')
  @ApiOperation({ summary: 'Bulk update multiple tasks' })
  bulkUpdateTasks(@Body() dto: BulkUpdateTasksDto, @CurrentUser() user: User) {
    return this.taskService.bulkUpdateTasks(dto, user);
  }

  @Post(['tasks/bulk-delete', 'workspaces/:workspaceId/tasks/bulk-delete'])
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Tasks deleted successfully in bulk')
  @ApiOperation({ summary: 'Bulk delete multiple tasks' })
  bulkDeleteTasks(@Body() dto: BulkDeleteTasksDto, @CurrentUser() user: User) {
    return this.taskService.bulkDeleteTasks(dto, user);
  }
}
