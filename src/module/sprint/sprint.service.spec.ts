/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { SprintStatus, TaskStatus } from '@prisma/client';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { SprintService } from './sprint.service';

describe('SprintService', () => {
  let service: SprintService;
  let prisma: any;
  let entityValidationService: any;
  let activityService: any;
  let eventEmitter: any;

  const mockUser: any = {
    id: 'user-1',
    name: 'Alice Developer',
    email: 'alice@example.com',
  };

  const mockProject: any = {
    id: 'proj-1',
    title: 'Core Engine',
    key: 'ENG',
    workspaceId: 'ws-1',
  };

  beforeEach(async () => {
    prisma = {
      sprint: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      task: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    entityValidationService = {
      verifyProjectById: jest.fn().mockResolvedValue(mockProject),
      verifySprintById: jest.fn().mockResolvedValue({
        id: 'sprint-1',
        projectId: 'proj-1',
        name: 'Sprint 1',
        status: SprintStatus.PLANNING,
        project: mockProject,
      }),
      verifyTaskById: jest.fn().mockResolvedValue({
        id: 'task-1',
        title: 'Implement OAuth',
        column: {
          board: {
            project: mockProject,
          },
        },
      }),
    };

    activityService = {
      createActivityLog: jest.fn().mockResolvedValue({}),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntityValidationService, useValue: entityValidationService },
        { provide: ActivityService, useValue: activityService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<SprintService>(SprintService);
  });

  describe('createSprint', () => {
    it('should successfully create a sprint in PLANNING status', async () => {
      const createdSprint = {
        id: 'sprint-1',
        projectId: 'proj-1',
        name: 'Sprint 1',
        goal: 'Ship MVP',
        status: SprintStatus.PLANNING,
        startDate: null,
        endDate: null,
      };

      prisma.sprint.create.mockResolvedValue(createdSprint);

      const result = await service.createSprint(
        'proj-1',
        { name: 'Sprint 1', goal: 'Ship MVP' },
        mockUser,
      );

      expect(entityValidationService.verifyProjectById).toHaveBeenCalledWith(
        'proj-1',
      );
      expect(prisma.sprint.create).toHaveBeenCalled();
      expect(activityService.createActivityLog).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'sprint.created',
        expect.objectContaining({ sprintId: 'sprint-1' }),
      );
      expect(result).toEqual(createdSprint);
    });

    it('should throw BadRequestException if startDate is after endDate', async () => {
      await expect(
        service.createSprint(
          'proj-1',
          {
            name: 'Invalid Sprint',
            startDate: '2026-10-15T00:00:00.000Z',
            endDate: '2026-10-01T00:00:00.000Z',
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProjectSprints', () => {
    it('should return sprints with calculated capacity metrics', async () => {
      prisma.sprint.count.mockResolvedValue(1);
      prisma.sprint.findMany.mockResolvedValue([
        {
          id: 'sprint-1',
          projectId: 'proj-1',
          name: 'Sprint 1',
          status: SprintStatus.ACTIVE,
          tasks: [
            {
              id: 'task-1',
              status: TaskStatus.DONE,
              storyPoints: 5,
              estimatedHours: 4,
            },
            {
              id: 'task-2',
              status: TaskStatus.IN_PROGRESS,
              storyPoints: 3,
              estimatedHours: 2,
            },
          ],
        },
      ]);

      const result = await service.getProjectSprints('proj-1', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].metrics).toEqual({
        totalTasks: 2,
        completedTasks: 1,
        totalStoryPoints: 8,
        completedStoryPoints: 5,
        totalEstimatedHours: 6,
        completionPercentage: 50,
      });
    });
  });

  describe('startSprint', () => {
    it('should transition sprint to ACTIVE status', async () => {
      prisma.sprint.findFirst.mockResolvedValue(null);
      prisma.sprint.update.mockResolvedValue({
        id: 'sprint-1',
        projectId: 'proj-1',
        name: 'Sprint 1',
        status: SprintStatus.ACTIVE,
      });

      const result = await service.startSprint('sprint-1', mockUser);

      expect(prisma.sprint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sprint-1' },
          data: expect.objectContaining({ status: SprintStatus.ACTIVE }),
        }),
      );
      expect(result.status).toBe(SprintStatus.ACTIVE);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'sprint.started',
        expect.anything(),
      );
    });

    it('should throw BadRequestException if another sprint is already active in project', async () => {
      prisma.sprint.findFirst.mockResolvedValue({
        id: 'sprint-active',
        name: 'Active Sprint',
        status: SprintStatus.ACTIVE,
      });

      await expect(service.startSprint('sprint-1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if sprint is already completed', async () => {
      entityValidationService.verifySprintById.mockResolvedValueOnce({
        id: 'sprint-1',
        projectId: 'proj-1',
        status: SprintStatus.COMPLETED,
        project: mockProject,
      });

      await expect(service.startSprint('sprint-1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('completeSprint', () => {
    it('should complete sprint and roll unfinished tasks to next sprint', async () => {
      entityValidationService.verifySprintById.mockResolvedValue({
        id: 'sprint-1',
        projectId: 'proj-1',
        name: 'Sprint 1',
        status: SprintStatus.ACTIVE,
        project: mockProject,
      });

      prisma.sprint.findFirst.mockResolvedValue({
        id: 'sprint-2',
        projectId: 'proj-1',
        status: SprintStatus.PLANNING,
      });

      prisma.task.findMany
        .mockResolvedValueOnce([
          { id: 'task-unfinished', title: 'Task Unfinished' },
        ]) // unfinished tasks
        .mockResolvedValueOnce([{ storyPoints: 5, estimatedHours: 3 }]); // completed tasks

      prisma.sprint.update.mockResolvedValue({
        id: 'sprint-1',
        name: 'Sprint 1',
        status: SprintStatus.COMPLETED,
      });

      const result = await service.completeSprint(
        'sprint-1',
        { moveToSprintId: 'sprint-2' },
        mockUser,
      );

      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['task-unfinished'] } },
        data: { sprintId: 'sprint-2', isBacklog: false },
      });
      expect(result.status).toBe(SprintStatus.COMPLETED);
      expect(result.summary.rolledOverTo).toBe('NEXT_SPRINT');
      expect(result.summary.rolledOverTasksCount).toBe(1);
    });

    it('should complete sprint and roll unfinished tasks to backlog if no target sprint', async () => {
      entityValidationService.verifySprintById.mockResolvedValue({
        id: 'sprint-1',
        projectId: 'proj-1',
        name: 'Sprint 1',
        status: SprintStatus.ACTIVE,
        project: mockProject,
      });

      prisma.task.findMany
        .mockResolvedValueOnce([{ id: 'task-unfinished' }])
        .mockResolvedValueOnce([{ storyPoints: 8 }]);

      prisma.sprint.update.mockResolvedValue({
        id: 'sprint-1',
        name: 'Sprint 1',
        status: SprintStatus.COMPLETED,
      });

      const result = await service.completeSprint('sprint-1', {}, mockUser);

      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['task-unfinished'] } },
        data: { sprintId: null, isBacklog: true },
      });
      expect(result.summary.rolledOverTo).toBe('BACKLOG');
    });

    it('should throw BadRequestException if sprint is not active', async () => {
      entityValidationService.verifySprintById.mockResolvedValue({
        id: 'sprint-1',
        projectId: 'proj-1',
        status: SprintStatus.PLANNING,
        project: mockProject,
      });

      await expect(
        service.completeSprint('sprint-1', {}, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteSprint', () => {
    it('should soft-delete sprint and unassign tasks to backlog', async () => {
      const result = await service.deleteSprint('sprint-1', mockUser);

      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { sprintId: 'sprint-1', deletedAt: null },
        data: { sprintId: null, isBacklog: true },
      });
      expect(prisma.sprint.update).toHaveBeenCalledWith({
        where: { id: 'sprint-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toBeNull();
    });
  });

  describe('assignTaskToSprint', () => {
    it('should assign task to sprint', async () => {
      prisma.sprint.findFirst.mockResolvedValue({
        id: 'sprint-1',
        projectId: 'proj-1',
        status: SprintStatus.ACTIVE,
      });

      prisma.task.update.mockResolvedValue({
        id: 'task-1',
        sprintId: 'sprint-1',
        isBacklog: false,
      });

      const result = await service.assignTaskToSprint(
        'task-1',
        { sprintId: 'sprint-1' },
        mockUser,
      );

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          data: { sprintId: 'sprint-1', isBacklog: false },
        }),
      );
      expect(result.sprintId).toBe('sprint-1');
    });

    it('should move task to backlog if isBacklog is true', async () => {
      prisma.task.update.mockResolvedValue({
        id: 'task-1',
        sprintId: null,
        isBacklog: true,
      });

      const result = await service.assignTaskToSprint(
        'task-1',
        { isBacklog: true },
        mockUser,
      );

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          data: { sprintId: null, isBacklog: true },
        }),
      );
      expect(result.isBacklog).toBe(true);
    });
  });

  describe('getProjectBacklog', () => {
    it('should return backlog tasks with aggregated capacity', async () => {
      prisma.task.count.mockResolvedValue(1);
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Task in backlog',
          storyPoints: 5,
          estimatedHours: 4,
        },
      ]);
      prisma.task.aggregate.mockResolvedValue({
        _sum: { storyPoints: 5, estimatedHours: 4 },
      });

      const result = await service.getProjectBacklog('proj-1', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.totalStoryPoints).toBe(5);
      expect(result.meta.totalEstimatedHours).toBe(4);
    });
  });
});
