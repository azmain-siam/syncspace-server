import {
  Body,
  Controller,
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
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectService } from './project.service';

@Controller('workspaces/:workspaceId/project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // Create Project by Workspace Owner or Admin
  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @ResponseMessage('Project created successfully')
  createProject(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectService.createProject(dto, workspaceId, user.id);
  }

  // Get Projects by Workspace Member
  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Projects fetched successfully')
  getWorkspaceProject(@Param('workspaceId') workspaceId: string) {
    return this.projectService.getWorkspaceProject(workspaceId);
  }

  // Get Project by Workspace Member
  @Get(':projectId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Project fetched successfully')
  getProject(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectService.getProject(workspaceId, projectId);
  }

  // Update Project by Workspace Owner or Admin
  @Patch(':projectId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @ResponseMessage('Project updated successfully')
  updateProject(
    @Body() dto: UpdateProjectDto,
    @Param('projectId') projectId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.projectService.updateProject(projectId, workspaceId, dto);
  }

  // Delete or Archive project by project owner
  @Patch(':projectId/archive')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  @ResponseMessage('Project archived successfully')
  @ApiOperation({ summary: 'Archive project' })
  archiveProject(
    @Param('projectId') projectId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.projectService.archiveProject(projectId, workspaceId);
  }
}
