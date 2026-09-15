import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { AuditLogService } from './audit-log.service';
import { WorkspaceAuditQueryDto } from './dto/workspace-audit-query.dto';

@ApiTags('Audit Logs')
@Controller('workspaces/:workspaceId/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Workspace audit logs fetched successfully')
  @ApiOperation({
    summary:
      'Get security and administrative audit log feed for workspace owners and admins',
  })
  getWorkspaceAuditLogs(
    @Param('workspaceId') workspaceId: string,
    @Query() query: WorkspaceAuditQueryDto,
  ) {
    return this.auditLogService.getWorkspaceAuditLogs(workspaceId, query);
  }
}
