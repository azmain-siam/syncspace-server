import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import type { User } from 'src/common/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateWorkspaceSettingsDto } from './dto/update-settings.dto';
import { WorkspaceRole } from './enums/workspace-role.enum';
import { WorkspaceService } from './workspace.service';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  // Create workspace
  @Post()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Workspace created successfully')
  @ApiOperation({ summary: 'Create workspace' })
  createWorkspace(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @CurrentUser() user: User,
  ) {
    return this.workspaceService.createWorkspace(createWorkspaceDto, user.id);
  }

  // Get my workspaces
  @Get()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Workspaces fetched successfully')
  @ApiOperation({ summary: 'Get my workspaces' })
  getMyWorkspaces(@CurrentUser() user: User) {
    return this.workspaceService.getMyWorkspaces(user.id);
  }

  // Invite member to workspace
  @Post(':workspaceId/members')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Member invited successfully')
  @ApiOperation({ summary: 'Invite member to workspace' })
  inviteMember(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.workspaceService.inviteMember(workspaceId, dto, user.id);
  }

  // Remove member from workspace
  @Delete(':workspaceId/members/:userId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Member removed successfully')
  @ApiOperation({
    summary: 'Remove member from workspace by workspace owner or admin',
  })
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: User,
  ) {
    return this.workspaceService.removeWorkspaceMember(
      workspaceId,
      userId,
      user,
    );
  }

  // Update member role
  @Patch(':workspaceId/members/:memberId/role')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Member role updated successfully')
  @ApiOperation({ summary: 'Update member role by workspace owner or admin' })
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: User,
  ) {
    return this.workspaceService.updateMemberRole(
      workspaceId,
      memberId,
      dto,
      user,
    );
  }

  // Transfer ownership
  @Patch(':workspaceId/transfer-ownership')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  @ResponseMessage('Ownership transferred successfully')
  @ApiOperation({ summary: 'Transfer ownership by workspace owner' })
  transferOwnership(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() user: User,
  ) {
    return this.workspaceService.transferOwnership(workspaceId, dto, user.id);
  }

  // Get workspace members
  @Get(':workspaceId/members')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Members fetched successfully')
  @ApiOperation({ summary: 'Get workspace members' })
  getWorkspaceMembers(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.workspaceService.getWorkspaceMembers(workspaceId, user.id);
  }

  // Update workspace settings
  @Patch(':workspaceId/settings')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  @ResponseMessage('Settings updated successfully')
  @ApiOperation({ summary: 'Update workspace settings by workspace owner' })
  updateWorkspaceSettings(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceSettingsDto,
  ) {
    return this.workspaceService.updateWorkspaceSettings(workspaceId, dto);
  }
}
