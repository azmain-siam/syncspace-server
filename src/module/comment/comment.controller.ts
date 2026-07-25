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
import { CommentService } from './comment.service';
import { CommentCursorQueryDto } from './dto/comment-cursor-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Comments')
@Controller(
  'workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId/comments',
)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Comment created successfully')
  @ApiOperation({
    summary: 'Add comment to a task (supports @username mentions)',
  })
  createComment(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentService.createComment(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
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
  @ResponseMessage('Task comments fetched successfully')
  @ApiOperation({ summary: 'Get task comments using cursor-based pagination' })
  getTaskComments(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Query() query: CommentCursorQueryDto,
  ) {
    return this.commentService.getTaskComments(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      query,
    );
  }

  @Get(':commentId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Comment fetched successfully')
  @ApiOperation({ summary: 'Get single comment details' })
  getComment(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.commentService.getComment(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      commentId,
    );
  }

  @Patch(':commentId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Comment updated successfully')
  @ApiOperation({ summary: 'Update comment content' })
  updateComment(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentService.updateComment(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      commentId,
      dto,
      user,
    );
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Comment deleted successfully')
  @ApiOperation({ summary: 'Soft delete comment' })
  deleteComment(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: User,
  ) {
    return this.commentService.deleteComment(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      commentId,
      user,
    );
  }
}
