import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { ActivityService } from './activity.service';
import { ActivityQueryDto } from './dto/activity-query.dto';

@Controller('workspaces/:workspaceId/activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Workspace activities fetched successfully')
  @ApiOperation({ summary: 'Get workspace activities' })
  getWorkspaceActivities(
    @Param('workspaceId') workspaceId: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.getWorkspaceActivities(workspaceId, query);
  }
}
