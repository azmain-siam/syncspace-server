import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import type { User } from 'src/common/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { WorkspaceService } from './workspace.service';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRole } from './enums/workspace-role.enum';

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
