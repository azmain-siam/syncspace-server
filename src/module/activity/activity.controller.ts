import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { ActivityService } from './activity.service';
import { ActivityQueryDto } from './dto/activity-query.dto';

@ApiTags('Activities')
@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('workspaces/:workspaceId/activities')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Workspace activities fetched successfully')
  @ApiOperation({ summary: 'Get workspace activities feed' })
  getWorkspaceActivities(
    @Param('workspaceId') workspaceId: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.getWorkspaceActivities(workspaceId, query);
  }

  @Get('tasks/:taskId/activities')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Task activities fetched successfully')
  @ApiOperation({
    summary:
      'Get task-specific activity history stream (for task modal history tab)',
  })
  getTaskActivities(
    @Param('taskId') taskId: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.getTaskActivities(taskId, query);
  }
}
