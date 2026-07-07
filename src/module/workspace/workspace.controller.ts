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
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import type { User } from 'src/common/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { WorkspaceRole } from './enums/workspace-role.enum';
import { WorkspaceService } from './workspace.service';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Workspace created successfully')
  createWorkspace(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @CurrentUser() user: User,
  ) {
    return this.workspaceService.createWorkspace(createWorkspaceDto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Workspaces fetched successfully')
  getMyWorkspaces(@CurrentUser() user: User) {
    return this.workspaceService.getMyWorkspaces(user.id);
  }

  @Post(':workspaceId/members')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Member invited successfully')
  inviteMember(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspaceService.inviteMember(workspaceId, dto);
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Member removed successfully')
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.workspaceService.removeWorkspaceMember(workspaceId, userId);
  }

  @Patch(':workspaceId/members/:memberId/role')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Member role updated successfully')
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspaceService.updateMemberRole(workspaceId, memberId, dto);
  }

  @Get(':workspaceId/members')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Members fetched successfully')
  getWorkspaceMembers(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.workspaceService.getWorkspaceMembers(workspaceId, user.id);
  }
}
