import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StorageProvider, WorkspaceRole } from '@prisma/client';
import { SAFE_USER_MINIMAL_SELECT } from 'src/common/constants/prisma-selects.constant';
import { User } from 'src/common/interfaces/user.interface';
import { StorageService } from 'src/common/storage/providers/storage.service';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
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

  // Upload Attachment via StorageService abstraction
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

    // Upload via StorageService abstract layer
    const uploadResult = await this.storageService.upload(
      file,
      'syncspace/workspace/task-attachments',
    );

    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.create({
        data: {
          taskId: task.id,
          fileName: file.originalname,
          fileUrl: uploadResult.url,
          storageProvider: uploadResult.provider as StorageProvider,
          storageKey: uploadResult.storageKey,
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
          storageProvider: attachment.storageProvider,
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

    // Delete asset from storage provider if key exists
    if (attachment.storageKey) {
      await this.storageService.delete(attachment.storageKey);
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
          storageProvider: attachment.storageProvider,
        },
      });

      return null;
    });
  }
}
