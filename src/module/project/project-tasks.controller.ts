import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { ProjectTasksQueryDto } from './dto/project-tasks-query.dto';
import { ProjectService } from './project.service';

@ApiTags('Projects')
@Controller('projects/:projectId/tasks')
export class ProjectTasksController {
  constructor(private readonly projectService: ProjectService) {}

  // Shallow route: Get all tasks for a project (Table/List View API)
  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Project tasks fetched successfully')
  @ApiOperation({
    summary:
      'Get flat list of tasks for a project with multi-column sorting, filtering, and pagination',
  })
  getProjectTasks(
    @Param('projectId') projectId: string,
    @Query() query: ProjectTasksQueryDto,
  ) {
    return this.projectService.getProjectTasks(projectId, query);
  }
}
