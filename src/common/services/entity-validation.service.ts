import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';

@Injectable()
export class EntityValidationService {
  constructor(private readonly prisma: PrismaService) {}

  // Verify workspace exists and is active
  async verifyWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId, deletedAt: null },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  // Verify column belongs to board, project, and workspace
  async verifyColumn(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
  ) {
    const column = await this.prisma.boardColumn.findFirst({
      where: {
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
    });

    if (!column) {
      throw new NotFoundException('Column not found in this board');
    }

    return column;
  }

  // Verify task exists in column, board, project, and workspace
  async verifyTask(
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

  // Verify assigned user is a member of the target workspace
  async verifyAssignee(workspaceId: string, assigneeId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: assigneeId,
        },
      },
    });

    if (!member) {
      throw new BadRequestException(
        'Assigned user is not a member of this workspace',
      );
    }

    return member;
  }
}
