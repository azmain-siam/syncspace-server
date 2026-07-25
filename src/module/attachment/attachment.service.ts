import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { User } from 'src/common/interfaces/user.interface';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
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

  // Upload Attachment
  async uploadAttachment(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    file: Express.Multer.File,
    currentUser: User,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const task = await this.verifyTask(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
    );

    const fileUrl = `/uploads/attachments/${file.filename}`;

    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.create({
        data: {
          taskId: task.id,
          fileName: file.originalname,
          fileUrl,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: currentUser.id,
        },
        include: {
          uploader: { select: SAFE_USER_MINIMAL_SELECT },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId: task.id,
        action: ActivityAction.ATTACHMENT_UPLOADED,
        description: `${currentUser.name} uploaded attachment ${attachment.fileName}`,
        metadata: {
          attachmentId: attachment.id,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
        },
      });

      return attachment;
    });
  }

  // Get Task Attachments
  async getTaskAttachments(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
  ) {
    await this.verifyTask(workspaceId, projectId, boardId, columnId, taskId);

    return this.prisma.attachment.findMany({
      where: {
        taskId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        uploader: { select: SAFE_USER_MINIMAL_SELECT },
      },
    });
  }

  // Delete Attachment
  async deleteAttachment(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    taskId: string,
    attachmentId: string,
    currentUser: User,
  ) {
    await this.verifyTask(workspaceId, projectId, boardId, columnId, taskId);

    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        taskId,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Check permission (Uploader or Workspace Owner/Admin)
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUser.id,
        },
      },
    });

    const isUploader = attachment.uploadedBy === currentUser.id;
    const isElevated =
      member &&
      (member.role === WorkspaceRole.OWNER ||
        member.role === WorkspaceRole.ADMIN);

    if (!isUploader && !isElevated) {
      throw new ForbiddenException(
        'Insufficient permissions to delete this attachment',
      );
    }

    // Delete physical file from disk if exists
    const filename = path.basename(attachment.fileUrl);
    const filePath = path.join(
      process.cwd(),
      'public',
      'uploads',
      'attachments',
      filename,
    );

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        // Log warning if physical file delete fails
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.attachment.delete({
        where: { id: attachmentId },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        taskId,
        action: ActivityAction.ATTACHMENT_DELETED,
        description: `${currentUser.name} deleted attachment ${attachment.fileName}`,
        metadata: {
          attachmentId,
          fileName: attachment.fileName,
        },
      });

      return null;
    });
  }
}
