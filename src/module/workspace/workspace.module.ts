import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { ActivityModule } from '../activity/activity.module';
import { AuditLogModule } from '../audit/audit-log.module';
import { EmailModule } from '../email/email.module';
import { WorkspaceInvitationController } from './workspace-invitation.controller';
import { WorkspaceInvitationService } from './workspace-invitation.service';

@Module({
  imports: [ActivityModule, EmailModule, AuditLogModule],
  controllers: [WorkspaceController, WorkspaceInvitationController],
  providers: [WorkspaceService, WorkspaceInvitationService],
})
export class WorkspaceModule {}
