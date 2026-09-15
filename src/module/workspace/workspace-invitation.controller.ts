import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import type { User } from 'src/common/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { DeclineInvitationDto } from './dto/decline-invitation.dto';
import { ValidateInvitationDto } from './dto/validate-invitation.dto';
import { WorkspaceInvitationService } from './workspace-invitation.service';

@Controller()
export class WorkspaceInvitationController {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  // POST /workspaces/:workspaceId/invitations
  @Post('workspaces/:workspaceId/invitations')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Invitation sent successfully')
  @ApiOperation({ summary: 'Send a workspace invitation email (Owner/Admin)' })
  createInvitation(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationService.createInvitation(workspaceId, user.id, dto);
  }

  // GET /workspace-invitations/validate
  @Get('workspace-invitations/validate')
  @ResponseMessage('Invitation validated successfully')
  @ApiOperation({ summary: 'Validate workspace invitation token (Public)' })
  validateInvitation(@Query() query: ValidateInvitationDto) {
    return this.invitationService.validateInvitation(query.token);
  }

  // POST /workspace-invitations/accept
  @Post('workspace-invitations/accept')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Workspace joined successfully')
  @ApiOperation({ summary: 'Accept workspace invitation (Authenticated)' })
  acceptInvitation(
    @CurrentUser() user: User,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.invitationService.acceptInvitation(user.id, dto);
  }

  // POST /workspace-invitations/decline
  @Post('workspace-invitations/decline')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Invitation declined successfully')
  @ApiOperation({ summary: 'Decline workspace invitation (Authenticated)' })
  declineInvitation(
    @CurrentUser() user: User,
    @Body() dto: DeclineInvitationDto,
  ) {
    return this.invitationService.declineInvitation(user.id, dto);
  }

  // DELETE /workspaces/:workspaceId/invitations/:id
  @Delete('workspaces/:workspaceId/invitations/:id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Invitation cancelled successfully')
  @ApiOperation({ summary: 'Cancel workspace invitation (Owner/Admin)' })
  cancelInvitation(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.invitationService.cancelInvitation(workspaceId, user.id, id);
  }
}
