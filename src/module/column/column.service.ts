import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { User } from 'src/common/interfaces/user.interface';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { ReorderColumnsDto } from './dto/reorder-columns.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class ColumnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  // Verify board exists in project & workspace
  private async verifyBoard(
    workspaceId: string,
    projectId: string,
    boardId: string,
  ) {
    const board = await this.prisma.board.findFirst({
      where: {
        id: boardId,
        project: {
          id: projectId,
          workspaceId,
          deletedAt: null,
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found in this project');
    }

    return board;
  }

  // Create Column
  async createColumn(
    workspaceId: string,
    projectId: string,
    boardId: string,
    dto: CreateColumnDto,
    currentUser: User,
  ) {
    await this.verifyBoard(workspaceId, projectId, boardId);

    return this.prisma.$transaction(async (tx) => {
      let targetOrder = dto.order;

      if (targetOrder === undefined || targetOrder === null) {
        const lastColumn = await tx.boardColumn.findFirst({
          where: { boardId },
          orderBy: { order: 'desc' },
        });

        targetOrder = lastColumn ? lastColumn.order + 1 : 0;
      }

      const column = await tx.boardColumn.create({
        data: {
          boardId,
          title: dto.title,
          order: targetOrder,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        action: ActivityAction.COLUMN_CREATED,
        description: `${currentUser.name} created column ${column.title}`,
        metadata: {
          columnId: column.id,
          title: column.title,
          order: column.order,
        },
      });

      return column;
    });
  }

  // Get board columns
  async getBoardColumns(
    workspaceId: string,
    projectId: string,
    boardId: string,
  ) {
    await this.verifyBoard(workspaceId, projectId, boardId);

    return this.prisma.boardColumn.findMany({
      where: { boardId },
      orderBy: { order: 'asc' },
    });
  }

  // Get single column
  async getColumn(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
  ) {
    await this.verifyBoard(workspaceId, projectId, boardId);

    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId,
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return column;
  }

  // Update Column
  async updateColumn(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    dto: UpdateColumnDto,
    currentUser: User,
  ) {
    const existingColumn = await this.getColumn(
      workspaceId,
      projectId,
      boardId,
      columnId,
    );

    return this.prisma.$transaction(async (tx) => {
      const updatedColumn = await tx.boardColumn.update({
        where: { id: columnId },
        data: {
          title: dto.title ?? existingColumn.title,
        },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        action: ActivityAction.COLUMN_UPDATED,
        description: `${currentUser.name} updated column ${updatedColumn.title}`,
        metadata: { columnId, title: updatedColumn.title },
      });

      return updatedColumn;
    });
  }

  // Delete Column
  async deleteColumn(
    workspaceId: string,
    projectId: string,
    boardId: string,
    columnId: string,
    currentUser: User,
  ) {
    const column = await this.getColumn(
      workspaceId,
      projectId,
      boardId,
      columnId,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.boardColumn.delete({
        where: { id: columnId },
      });

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        action: ActivityAction.COLUMN_DELETED,
        description: `${currentUser.name} deleted column ${column.title}`,
        metadata: { columnId, title: column.title },
      });

      return null;
    });
  }

  // Reorder Columns
  async reorderColumns(
    workspaceId: string,
    projectId: string,
    boardId: string,
    dto: ReorderColumnsDto,
    currentUser: User,
  ) {
    await this.verifyBoard(workspaceId, projectId, boardId);

    const existingColumns = await this.prisma.boardColumn.findMany({
      where: { boardId },
    });

    const existingIds = new Set(existingColumns.map((c) => c.id));
    for (const item of dto.columnOrders) {
      if (!existingIds.has(item.id)) {
        throw new BadRequestException(
          `Column ID ${item.id} does not belong to this board`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Step A: Shift to temporary negative order to bypass unique constraint
      await Promise.all(
        dto.columnOrders.map((item, idx) =>
          tx.boardColumn.update({
            where: { id: item.id },
            data: { order: -(idx + 1000) },
          }),
        ),
      );

      // Step B: Set to final target order
      await Promise.all(
        dto.columnOrders.map((item) =>
          tx.boardColumn.update({
            where: { id: item.id },
            data: { order: item.order },
          }),
        ),
      );

      await this.activityService.createActivityLog(tx, {
        workspaceId,
        actorId: currentUser.id,
        projectId,
        boardId,
        action: ActivityAction.COLUMN_REORDERED,
        description: `${currentUser.name} reordered board columns`,
        metadata: JSON.parse(
          JSON.stringify({
            boardId,
            columnOrders: dto.columnOrders,
          }),
        ) as Prisma.InputJsonValue,
      });

      return tx.boardColumn.findMany({
        where: { boardId },
        orderBy: { order: 'asc' },
      });
    });
  }
}
