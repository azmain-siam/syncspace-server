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
  )
  @ResponseMessage('Projects fetched successfully')
  @ApiOperation({ summary: 'Get projects by workspace member' })
  getWorkspaceProjects(@Param('workspaceId') workspaceId: string) {
    return this.projectService.getWorkspaceProjects(workspaceId);
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
  @ApiOperation({ summary: 'Get project by workspace member' })
  getProject(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectService.getProject(workspaceId, projectId);
  }

  // Get Project Tasks (Nested route alias)
  @Get(':projectId/tasks')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
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
}
