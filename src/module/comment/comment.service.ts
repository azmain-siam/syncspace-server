import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { User } from 'src/common/interfaces/user.interface';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CommentCursorQueryDto } from './dto/comment-cursor-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentEventType } from './events/comment-events.enum';
import {
  CommentCreatedEvent,
  CommentDeletedEvent,
  CommentMentionEvent,
  CommentUpdatedEvent,
} from './events/comment.events';

import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Verify task exists in column, board, project, and workspace
  private async verifyTask(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        column: {
          id: columnId,
          board: {
            id: boardId,
            project: {
              id: projectId,
              workspaceId,
              deletedAt: null,
            },
          },
        },
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found in this column');
    }

    return task;
  }

  // Parse @mentions from comment content and resolve workspace members
  private async parseAndResolveMentions(
    workspaceId: string,
    content: string,
  ): Promise<{ username: string; userId: string }[]> {
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const matches = Array.from(content.matchAll(mentionRegex), (m) => m[1]);

    if (!matches.length) return [];

    const uniqueUsernames = Array.from(
      new Set(matches.map((u) => u.toLowerCase())),
    );

    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        user: {
          username: { in: uniqueUsernames, mode: 'insensitive' },
        },
      },
      include: {
        user: { select: SAFE_USER_MINIMAL_SELECT },
      },
    });

    return members.map((m) => ({
      username: m.user.username,
      userId: m.userId,
    }));
  }

  // Event dispatch hook for Notification and Realtime modules
  private dispatchEvent(eventType: CommentEventType, payload: any) {
    this.logger.log(`[Event Hook] ${eventType}: ${JSON.stringify(payload)}`);
  }

  // Create Comment
  async createComment(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    dto: CreateCommentDto,
    currentUser: User,
  ) {
    const task = await this.verifyTask(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
    );

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          taskId: task.id,
          userId: currentUser.id,
          content: dto.content,
        },
        include: {
          user: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      // Log activity
      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId: task.id,
        action: ActivityAction.COMMENT_CREATED,
        description: `${currentUser.name} commented on task ${task.title}`,
        metadata: {
          commentId: comment.id,
          taskId: task.id,
          snippet: comment.content.slice(0, 50),
        },
      });

      // Parse & dispatch mentions
      const mentions = await this.parseAndResolveMentions(
        workspaceId,
        dto.content,
      );
      for (const mention of mentions) {
        if (mention.userId !== currentUser.id) {
          const mentionEvent = new CommentMentionEvent(
            comment.id,
            task.id,
            workspaceId,
            currentUser.id,
            mention.userId,
            mention.username,
          );
          this.dispatchEvent(CommentEventType.COMMENT_MENTION, mentionEvent);

          this.eventEmitter.emit('comment.mention', {
            commentId: comment.id,
            taskId: task.id,
            taskTitle: task.title,
            mentionedUserId: mention.userId,
            actorId: currentUser.id,
            actorName: currentUser.name,
            workspaceId,
            projectId,
            boardId,
            columnId,
          });
        }
      }

      // Dispatch Created Event Hook
      const createdEvent = new CommentCreatedEvent(
        comment.id,
        task.id,
        workspaceId,
        currentUser.id,
        comment.content,
        comment.createdAt,
      );
      this.dispatchEvent(CommentEventType.COMMENT_CREATED, createdEvent);

      return comment;
    });
  }

  // Get Task Comments (Cursor Pagination)
  async getTaskComments(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    query: CommentCursorQueryDto,
  ) {
    await this.verifyTask(workspaceId, projectId, boardId, columnId, taskId);

    const limit = query.limit ?? 20;
    const fetchLimit = limit + 1; // Fetch 1 extra to determine hasNextPage

    const comments = await this.prisma.comment.findMany({
      where: {
        taskId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: fetchLimit,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      include: {
        user: { select: SAFE_USER_MINIMAL_SELECT },
      },
    });

    let hasNextPage = false;
    let nextCursor: string | null = null;

    if (comments.length > limit) {
      hasNextPage = true;
      comments.pop(); // Remove extra item
      nextCursor = comments[comments.length - 1]?.id || null;
    }

    return {
      comments,
      meta: {
        limit,
        hasNextPage,
        nextCursor,
      },
    };
  }

  // Get single comment
  async getComment(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    commentId: string,
  ) {
    await this.verifyTask(workspaceId, projectId, boardId, columnId, taskId);

    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        deletedAt: null,
      },
      include: {
        user: { select: SAFE_USER_MINIMAL_SELECT },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  // Update Comment
  async updateComment(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    commentId: string,
    dto: UpdateCommentDto,
    currentUser: User,
  ) {
    const existingComment = await this.getComment(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      commentId,
    );

    // Only author or Workspace Owner/Admin can edit
    if (existingComment.userId !== currentUser.id) {
      throw new ForbiddenException(
        'Only the comment author can edit this comment',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedComment = await tx.comment.update({
        where: { id: commentId },
        data: {
          content: dto.content,
          isEdited: true,
          editedAt: new Date(),
        },
        include: {
          user: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId,
        action: ActivityAction.COMMENT_UPDATED,
        description: `${currentUser.name} updated a comment`,
        metadata: {
          commentId,
          taskId,
        },
      });

      const updatedEvent = new CommentUpdatedEvent(
        updatedComment.id,
        taskId,
        workspaceId,
        currentUser.id,
        updatedComment.content,
        updatedComment.updatedAt,
      );
      this.dispatchEvent(CommentEventType.COMMENT_UPDATED, updatedEvent);

      return updatedComment;
    });
  }

  // Delete Comment (Soft Delete)
  async deleteComment(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    commentId: string,
    currentUser: User,
  ) {
    const comment = await this.getComment(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      commentId,
    );

    // Check permissions (Author or Owner/Admin)
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUser.id,
        },
      },
    });

    const isAuthor = comment.userId === currentUser.id;
    const isElevated =
      member &&
      (member.role === WorkspaceRole.OWNER ||
        member.role === WorkspaceRole.ADMIN);

    if (!isAuthor && !isElevated) {
      throw new ForbiddenException(
        'Insufficient permissions to delete this comment',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId,
        action: ActivityAction.COMMENT_DELETED,
        description: `${currentUser.name} deleted a comment`,
        metadata: { commentId, taskId },
      });

      const deletedEvent = new CommentDeletedEvent(
        commentId,
        taskId,
        workspaceId,
        currentUser.id,
      );
      this.dispatchEvent(CommentEventType.COMMENT_DELETED, deletedEvent);

      return null;
    });
  }
}
