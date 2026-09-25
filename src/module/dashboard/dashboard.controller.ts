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
  @ApiOperation({
    summary: 'Get high-level KPI cards with historical trend deltas',
  })
  getWorkspaceSummary(
    @Param('workspaceId') workspaceId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.dashboardService.getWorkspaceSummary(workspaceId, query);
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
    summary: 'Get bucketed time-series task velocity and throughput metrics',
  })
  getProductivityMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.dashboardService.getProductivityMetrics(workspaceId, query);
  }

  @Get('sprint-health')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Sprint health rollups fetched successfully')
  @ApiOperation({
    summary: 'Get active sprint rollup and health indicators across workspace',
  })
  getWorkspaceSprintHealth(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getWorkspaceSprintHealth(workspaceId);
  }

  @Get('project-rollups')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Project rollups fetched successfully')
  @ApiOperation({
    summary: 'Get per-project health, capacity, and progress rollups',
  })
  getProjectRollups(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getProjectRollups(workspaceId);
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
    summary: 'Get task assignments, WIP counts, and capacity status per member',
  })
  getMemberWorkload(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getMemberWorkload(workspaceId);
  }
}
