/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus, WorkspaceRole } from '@prisma/client';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskService } from './task.service';

describe('TaskService - Bulk Operations', () => {
  let service: TaskService;
  let prisma: any;
  let entityValidationService: any;
  let activityService: any;
  let eventEmitter: any;

  const mockUser: any = {
    id: 'user-1',
    name: 'Alice Developer',
    email: 'alice@example.com',
  };

  const mockTask1: any = {
    id: 'task-1',
    title: 'Task 1',
    createdBy: 'user-1',
    columnId: 'col-1',
    column: {
      board: {
        project: {
          id: 'proj-1',
          workspaceId: 'ws-1',
        },
      },
    },
  };

  const mockTask2: any = {
    id: 'task-2',
    title: 'Task 2',
    createdBy: 'user-2',
    columnId: 'col-1',
    column: {
      board: {
        project: {
          id: 'proj-1',
          workspaceId: 'ws-1',
        },
      },
    },
  };

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      workspaceMember: {
        findMany: jest.fn(),
      },
      taskLabel: {
        findMany: jest.fn(),
      },
      sprint: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    entityValidationService = {
      verifyAssignee: jest.fn().mockResolvedValue(true),
      verifyColumnById: jest.fn(),
    };

    activityService = {
      createActivityLog: jest.fn().mockResolvedValue({}),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntityValidationService, useValue: entityValidationService },
        { provide: ActivityService, useValue: activityService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  describe('bulkUpdateTasks', () => {
    it('should successfully bulk update tasks', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask1, mockTask2]);
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', userId: 'user-1', role: WorkspaceRole.MEMBER },
      ]);
      prisma.task.update
        .mockResolvedValueOnce({ ...mockTask1, status: TaskStatus.DONE })
        .mockResolvedValueOnce({ ...mockTask2, status: TaskStatus.DONE });

      const result = await service.bulkUpdateTasks(
        {
          taskIds: ['task-1', 'task-2'],
          data: { status: TaskStatus.DONE, priority: TaskPriority.HIGH },
        },
        mockUser,
      );

      expect(result.updatedCount).toBe(2);
      expect(prisma.task.update).toHaveBeenCalledTimes(2);
      expect(activityService.createActivityLog).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'tasks.bulk_updated',
        expect.anything(),
      );
    });

    it('should throw NotFoundException if any task is missing', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask1]);

      await expect(
        service.bulkUpdateTasks(
          {
            taskIds: ['task-1', 'task-non-existent'],
            data: { status: TaskStatus.DONE },
          },
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is GUEST in workspace', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask1]);
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', userId: 'user-1', role: WorkspaceRole.GUEST },
      ]);

      await expect(
        service.bulkUpdateTasks(
          {
            taskIds: ['task-1'],
            data: { status: TaskStatus.DONE },
          },
          mockUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('bulkDeleteTasks', () => {
    it('should successfully bulk delete tasks when user is workspace ADMIN', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask1, mockTask2]);
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', userId: 'user-1', role: WorkspaceRole.ADMIN },
      ]);

      const result = await service.bulkDeleteTasks(
        { taskIds: ['task-1', 'task-2'] },
        mockUser,
      );

      expect(result.deletedCount).toBe(2);
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['task-1', 'task-2'] } },
        data: { deletedAt: expect.any(Date) },
      });
      expect(activityService.createActivityLog).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'tasks.bulk_deleted',
        expect.anything(),
      );
    });

    it('should throw ForbiddenException if user is not ADMIN and not task creator', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask2]); // createdBy: 'user-2'
      prisma.workspaceMember.findMany.mockResolvedValue([
        { workspaceId: 'ws-1', userId: 'user-1', role: WorkspaceRole.MEMBER },
      ]);

      await expect(
        service.bulkDeleteTasks({ taskIds: ['task-2'] }, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
