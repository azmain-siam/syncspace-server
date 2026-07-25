import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { WorkspaceRoles } from 'src/common/decorators/workspace-roles.decorator';
import { WorkspaceRoleGuard } from 'src/common/guards/workspace-role.guard';
import type { User } from 'src/common/interfaces/user.interface';
import { storageConfig } from 'src/config/storage.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { AttachmentService } from './attachment.service';

@ApiTags('Attachments')
@Controller(
  'workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId/attachments',
)
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @UseInterceptors(
    FileInterceptor('file', {
      storage: storageConfig('./public/uploads/attachments'),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ResponseMessage('Attachment uploaded successfully')
  @ApiOperation({ summary: 'Upload file attachment to a task' })
  uploadAttachment(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.attachmentService.uploadAttachment(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      file,
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
  @ResponseMessage('Task attachments fetched successfully')
  @ApiOperation({ summary: 'Get all attachments for a task' })
  getTaskAttachments(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.attachmentService.getTaskAttachments(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
    );
  }

  @Delete(':attachmentId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  @ResponseMessage('Attachment deleted successfully')
  @ApiOperation({ summary: 'Delete attachment file and metadata' })
  deleteAttachment(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.attachmentService.deleteAttachment(
      workspaceId,
      projectId,
      boardId,
      columnId,
      taskId,
      attachmentId,
      user,
    );
  }
}
