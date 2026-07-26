import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { DashboardService } from './dashboard.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('Dashboard & Analytics')
@Controller('workspaces/:workspaceId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Workspace dashboard summary fetched successfully')
  @ApiOperation({ summary: 'Get high-level KPI cards for workspace dashboard' })
  getWorkspaceSummary(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getWorkspaceSummary(workspaceId);
  }

  @Get('task-distribution')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Task distribution metrics fetched successfully')
  @ApiOperation({
    summary: 'Get task breakdown grouped by status and priority',
  })
  getTaskDistribution(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getTaskDistribution(workspaceId);
  }

  @Get('productivity')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Productivity analytics fetched successfully')
  @ApiOperation({
    summary: 'Get task creation vs completion productivity metrics',
  })
  getProductivityMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.dashboardService.getProductivityMetrics(workspaceId, query);
  }

  @Get('member-workload')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Member workload breakdown fetched successfully')
  @ApiOperation({
    summary: 'Get task assignments and completion rates per workspace member',
  })
  getMemberWorkload(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getMemberWorkload(workspaceId);
  }
}
