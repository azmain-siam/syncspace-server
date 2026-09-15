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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import type { User } from 'src/common/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { RestoreTrashItemDto } from './dto/restore-trash-item.dto';
import { TrashQueryDto } from './dto/trash-query.dto';
import { TrashService } from './trash.service';

@ApiTags('Trash')
@Controller('workspaces/:workspaceId/trash')
export class TrashController {
  constructor(private readonly trashService: TrashService) {}

  // List all soft-deleted items in workspace
  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Trash items fetched successfully')
  @ApiOperation({
    summary:
      'List all soft-deleted tasks and projects in the workspace trash bin',
  })
  getTrashItems(
    @Param('workspaceId') workspaceId: string,
    @Query() query: TrashQueryDto,
  ) {
    return this.trashService.getTrashItems(workspaceId, query);
  }

  // Restore an item from trash
  @Post('restore')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Item restored successfully')
  @ApiOperation({
    summary: 'Restore a soft-deleted task or project from trash',
  })
  restoreItem(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: RestoreTrashItemDto,
    @CurrentUser() user: User,
  ) {
    return this.trashService.restoreItem(workspaceId, dto, user);
  }

  // Permanently purge items from trash
  @Delete('empty')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Trash emptied successfully')
  @ApiOperation({
    summary:
      'Permanently purge all soft-deleted items or a specific item from trash',
  })
  emptyTrash(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
    @Query('itemType') itemType?: 'TASK' | 'PROJECT',
    @Query('itemId') itemId?: string,
  ) {
    return this.trashService.emptyTrash(workspaceId, user, itemType, itemId);
  }
}
