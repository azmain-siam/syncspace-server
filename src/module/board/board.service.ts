import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from 'src/common/interfaces/user.interface';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

const DEFAULT_COLUMNS = ['Todo', 'In Progress', 'Review', 'Done'];

@Injectable()
export class BoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  // Verify project exists in workspace
  private async verifyProject(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found in this workspace');
    }

    return project;
  }

  // Create Board
  async createBoard(
    workspaceId: string,
    projectId: string,
    dto: CreateBoardDto,
    currentUser: User,
  ) {
    await this.verifyProject(workspaceId, projectId);

    return this.prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          projectId,
          title: dto.title,
        },
      });

      if (dto.includeDefaultColumns !== false) {
        await Promise.all(
          DEFAULT_COLUMNS.map((title, index) =>
            tx.boardColumn.create({
              data: {
                boardId: board.id,
                title,
                order: index,
              },
            }),
          ),
        );
      }

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId: board.id,
        action: ActivityAction.BOARD_CREATED,
        description: `${currentUser.name} created board ${board.title}`,
        metadata: { boardId: board.id, title: board.title },
      });

      return tx.board.findUnique({
        where: { id: board.id },
        include: {
          columns: {
            orderBy: { order: 'asc' },
          },
        },
      });
    });
  }

  // Get project boards
  async getProjectBoards(workspaceId: string, projectId: string) {
    await this.verifyProject(workspaceId, projectId);

    return this.prisma.board.findMany({
      where: {
        projectId,
      },
      include: {
        columns: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Get single board
  async getBoard(workspaceId: string, projectId: string, boardId: string) {
    await this.verifyProject(workspaceId, projectId);

    const board = await this.prisma.board.findFirst({
      where: {
        id: boardId,
        projectId,
      },
      include: {
        columns: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return board;
  }

  // Update Board
  async updateBoard(
    workspaceId: string,
    projectId: string,
    boardId: string,
    dto: UpdateBoardDto,
    currentUser: User,
  ) {
    const existingBoard = await this.getBoard(workspaceId, projectId, boardId);

    return this.prisma.$transaction(async (tx) => {
      const updatedBoard = await tx.board.update({
        where: { id: boardId },
        data: {
          title: dto.title ?? existingBoard.title,
        },
        include: {
          columns: {
            orderBy: { order: 'asc' },
          },
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId: updatedBoard.id,
        action: ActivityAction.BOARD_UPDATED,
        description: `${currentUser.name} updated board ${updatedBoard.title}`,
        metadata: { boardId: updatedBoard.id, title: updatedBoard.title },
      });

      return updatedBoard;
    });
  }

  // Delete Board
  async deleteBoard(
    workspaceId: string,
    projectId: string,
    boardId: string,
    currentUser: User,
  ) {
    const board = await this.getBoard(workspaceId, projectId, boardId);

    return this.prisma.$transaction(async (tx) => {
      await tx.board.delete({
        where: { id: boardId },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        action: ActivityAction.BOARD_DELETED,
        description: `${currentUser.name} deleted board ${board.title}`,
        metadata: { boardId, title: board.title },
      });

      return null;
    });
  }
}
