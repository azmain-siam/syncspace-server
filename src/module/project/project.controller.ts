import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import type { User } from 'src/common/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { CreateProjectLinkDto } from './dto/create-project-link.dto';
import { CreateProjectStatusUpdateDto } from './dto/create-project-status-update.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectTasksQueryDto } from './dto/project-tasks-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectService } from './project.service';

@ApiTags('Projects')
@Controller('workspaces/:workspaceId/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // Create Project by Workspace Owner or Admin
  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @ResponseMessage('Project created successfully')
  @ApiOperation({ summary: 'Create project' })
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
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Projects fetched successfully')
  @ApiOperation({ summary: 'Get projects by workspace member' })
  getWorkspaceProjects(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectService.getWorkspaceProjects(workspaceId, user);
  }

  // Get Project by Workspace Member
  @Get(':projectId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Project fetched successfully')
  @ApiOperation({ summary: 'Get project by workspace member' })
  getProject(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectService.getProject(workspaceId, projectId, user);
  }

  // Get Project Tasks (Nested route alias)
  @Get(':projectId/tasks')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Project tasks fetched successfully')
  @ApiOperation({ summary: 'Get flat list of project tasks' })
  getProjectTasks(
    @Param('projectId') projectId: string,
    @Query() query: ProjectTasksQueryDto,
  ) {
    return this.projectService.getProjectTasks(projectId, query);
  }

  // Update Project by Workspace Owner or Admin
  @Patch(':projectId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @ResponseMessage('Project updated successfully')
  @ApiOperation({ summary: 'Update project by workspace owner or admin' })
  updateProject(
    @Body() dto: UpdateProjectDto,
    @Param('projectId') projectId: string,
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectService.updateProject(projectId, workspaceId, dto, user);
  }

  // Archive project by workspace owner
  @Patch(':projectId/archive')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  @ResponseMessage('Project archived successfully')
  @ApiOperation({ summary: 'Archive project by project owner' })
  archiveProject(
    @Param('projectId') projectId: string,
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectService.archiveProject(projectId, workspaceId, user);
  }

  // Soft Delete Project by workspace owner or admin
  @Delete(':projectId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @ResponseMessage('Project deleted successfully')
  @ApiOperation({ summary: 'Soft delete project' })
  deleteProject(
    @Param('projectId') projectId: string,
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectService.deleteProject(projectId, workspaceId, user);
  }

  // Restore Project by workspace owner or admin
  @Patch(':projectId/restore')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @ResponseMessage('Project restored successfully')
  @ApiOperation({ summary: 'Restore soft-deleted / archived project' })
  restoreProject(
    @Param('projectId') projectId: string,
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectService.restoreProject(projectId, workspaceId, user);
  }

  // ==========================================
  // Project External Links Endpoints
  // ==========================================

  @Post(':projectId/links')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Project link added successfully')
  @ApiOperation({ summary: 'Attach external resource link to project' })
  addProjectLink(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectLinkDto,
    @CurrentUser() user: User,
  ) {
    return this.projectService.addProjectLink(
      workspaceId,
      projectId,
      dto,
      user,
    );
  }

  @Get(':projectId/links')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Project links fetched successfully')
  @ApiOperation({ summary: 'Get all external links attached to project' })
  getProjectLinks(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectService.getProjectLinks(workspaceId, projectId, user);
  }

  @Delete(':projectId/links/:linkId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Project link deleted successfully')
  @ApiOperation({ summary: 'Delete external resource link from project' })
  deleteProjectLink(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectService.deleteProjectLink(
      workspaceId,
      projectId,
      linkId,
      user,
    );
  }

  // ==========================================
  // Project Status Updates Feed Endpoints
  // ==========================================

  @Post(':projectId/status-updates')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Project status update posted successfully')
  @ApiOperation({ summary: 'Post executive health status update for project' })
  createStatusUpdate(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectStatusUpdateDto,
    @CurrentUser() user: User,
  ) {
    return this.projectService.createStatusUpdate(
      workspaceId,
      projectId,
      dto,
      user,
    );
  }

  @Get(':projectId/status-updates')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
    WorkspaceRole.GUEST,
  )
  @ResponseMessage('Project status updates fetched successfully')
  @ApiOperation({ summary: 'Get project health status update history' })
  getStatusUpdates(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectService.getStatusUpdates(workspaceId, projectId, user);
  }
}
