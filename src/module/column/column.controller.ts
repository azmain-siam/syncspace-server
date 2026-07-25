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
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { ColumnService } from './column.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { ReorderColumnsDto } from './dto/reorder-columns.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Controller(
  'workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns',
)
export class ColumnController {
  constructor(private readonly columnService: ColumnService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Column created successfully')
  @ApiOperation({ summary: 'Create column in board' })
  createColumn(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Body() dto: CreateColumnDto,
    @CurrentUser() user: User,
  ) {
    return this.columnService.createColumn(
      workspaceId,
      projectId,
      boardId,
      dto,
      user,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Board columns fetched successfully')
  @ApiOperation({ summary: 'Get all columns in board' })
  getBoardColumns(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
  ) {
    return this.columnService.getBoardColumns(workspaceId, projectId, boardId);
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Columns reordered successfully')
  @ApiOperation({ summary: 'Reorder columns in board' })
  reorderColumns(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Body() dto: ReorderColumnsDto,
    @CurrentUser() user: User,
  ) {
    return this.columnService.reorderColumns(
      workspaceId,
      projectId,
      boardId,
      dto,
      user,
    );
  }

  @Patch(':columnId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Column updated successfully')
  @ApiOperation({ summary: 'Update column title' })
  updateColumn(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body() dto: UpdateColumnDto,
    @CurrentUser() user: User,
  ) {
    return this.columnService.updateColumn(
      workspaceId,
      projectId,
      boardId,
      columnId,
      dto,
      user,
    );
  }

  @Delete(':columnId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Column deleted successfully')
  @ApiOperation({ summary: 'Delete column' })
  deleteColumn(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @CurrentUser() user: User,
  ) {
    return this.columnService.deleteColumn(
      workspaceId,
      projectId,
      boardId,
      columnId,
      user,
    );
  }
}
