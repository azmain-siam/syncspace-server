import { Controller } from '@nestjs/common';
import { ProjectService } from './project.service';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // @Post(':workspaceId')
  // @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  // @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  // @ResponseMessage('Project created successfully')
  // createProject(
  //   @Param('workspaceId') workspaceId: string,
  //   @Body() dto: CreateProjectDto,
  //   @CurrentUser() user: User,
  // ) {
  //   return this.projectService.createProject(dto, workspaceId, user.id);
  // }
}
