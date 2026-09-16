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
import { BacklogQueryDto } from './dto/backlog-query.dto';
import { CompleteSprintDto } from './dto/complete-sprint.dto';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { MoveTaskToSprintDto } from './dto/move-task-to-sprint.dto';
import { SprintQueryDto } from './dto/sprint-query.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { SprintService } from './sprint.service';

@ApiTags('Sprints')
@Controller()
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Post('projects/:projectId/sprints')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Sprint created successfully')
  @ApiOperation({ summary: 'Create a new sprint for a project' })
  createSprint(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSprintDto,
    @CurrentUser() user: User,
  ) {
    return this.sprintService.createSprint(projectId, dto, user);
  }

  @Get('projects/:projectId/sprints')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Project sprints fetched successfully')
  @ApiOperation({ summary: 'Get all sprints for a project' })
  getProjectSprints(
    @Param('projectId') projectId: string,
    @Query() query: SprintQueryDto,
  ) {
    return this.sprintService.getProjectSprints(projectId, query);
  }

  @Get('projects/:projectId/backlog')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Project backlog fetched successfully')
  @ApiOperation({
    summary: 'Get dedicated project backlog with triage filtering',
  })
  getProjectBacklog(
    @Param('projectId') projectId: string,
    @Query() query: BacklogQueryDto,
  ) {
    return this.sprintService.getProjectBacklog(projectId, query);
  }

  @Get('sprints/:sprintId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Sprint fetched successfully')
  @ApiOperation({ summary: 'Get sprint details with task breakdown' })
  getSprintById(@Param('sprintId') sprintId: string) {
    return this.sprintService.getSprintById(sprintId);
  }

  @Patch('sprints/:sprintId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Sprint updated successfully')
  @ApiOperation({ summary: 'Update sprint details' })
  updateSprint(
    @Param('sprintId') sprintId: string,
    @Body() dto: UpdateSprintDto,
    @CurrentUser() user: User,
  ) {
    return this.sprintService.updateSprint(sprintId, dto, user);
  }

  @Post('sprints/:sprintId/start')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Sprint started successfully')
  @ApiOperation({
    summary:
      'Start sprint lifecycle (enforces single active sprint per project)',
  })
  startSprint(@Param('sprintId') sprintId: string, @CurrentUser() user: User) {
    return this.sprintService.startSprint(sprintId, user);
  }

  @Post('sprints/:sprintId/complete')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Sprint completed successfully')
  @ApiOperation({
    summary:
      'Complete sprint and roll unfinished tasks to next sprint or backlog',
  })
  completeSprint(
    @Param('sprintId') sprintId: string,
    @Body() dto: CompleteSprintDto,
    @CurrentUser() user: User,
  ) {
    return this.sprintService.completeSprint(sprintId, dto, user);
  }

  @Delete('sprints/:sprintId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Sprint deleted successfully')
  @ApiOperation({ summary: 'Delete sprint and push tasks to backlog' })
  deleteSprint(@Param('sprintId') sprintId: string, @CurrentUser() user: User) {
    return this.sprintService.deleteSprint(sprintId, user);
  }

  @Post('tasks/:taskId/sprint')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task sprint assignment updated successfully')
  @ApiOperation({ summary: 'Assign task to sprint or move to backlog' })
  assignTaskToSprint(
    @Param('taskId') taskId: string,
    @Body() dto: MoveTaskToSprintDto,
    @CurrentUser() user: User,
  ) {
    return this.sprintService.assignTaskToSprint(taskId, dto, user);
  }
}
