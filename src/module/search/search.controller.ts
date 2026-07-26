import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('workspaces/:workspaceId/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Workspace search results fetched successfully')
  @ApiOperation({
    summary:
      'Search across projects, tasks, comments, and members within a workspace',
  })
  searchWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Query() query: SearchQueryDto,
  ) {
    return this.searchService.searchWorkspace(workspaceId, query);
  }
}
