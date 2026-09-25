/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ProjectStatus,
  SprintStatus,
  TaskPriority,
  TaskStatus,
  WorkspaceRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';
import { AnalyticsInterval } from './dto/analytics-query.dto';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;

  const mockWorkspace = {
    id: 'ws-123',
    name: 'Acme Corp',
    slug: 'acme-corp',
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      workspace: {
        findUnique: jest.fn().mockResolvedValue(mockWorkspace),
      },
      project: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn(),
      },
      workspaceMember: {
        count: jest.fn().mockResolvedValue(4),
        findMany: jest.fn(),
      },
      workspaceActivity: {
        count: jest.fn().mockResolvedValue(25),
      },
      task: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      sprint: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getWorkspaceSummary', () => {
    it('should throw NotFoundException if workspace does not exist', async () => {
      prisma.workspace.findUnique.mockResolvedValueOnce(null);

      await expect(service.getWorkspaceSummary('invalid-ws')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return complete workspace summary with current/previous periods and deltas', async () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      const mockTasks = [
        {
          id: 'task-1',
          status: TaskStatus.DONE,
          dueDate: null,
          storyPoints: 5,
          estimatedHours: 4,
          createdAt: tenDaysAgo,
          updatedAt: tenDaysAgo,
        },
        {
          id: 'task-2',
          status: TaskStatus.IN_PROGRESS,
          dueDate: null,
          storyPoints: 3,
          estimatedHours: 2,
          createdAt: tenDaysAgo,
          updatedAt: tenDaysAgo,
        },
        {
          id: 'task-3',
          status: TaskStatus.DONE,
          dueDate: null,
          storyPoints: 8,
          estimatedHours: 6,
          createdAt: fortyDaysAgo,
          updatedAt: fortyDaysAgo,
        },
      ];

      prisma.task.findMany.mockResolvedValueOnce(mockTasks);

      const result = await service.getWorkspaceSummary('ws-123', { days: 30 });

      expect(result.projectsCount).toBe(3);
      expect(result.totalTasks).toBe(3);
      expect(result.completedTasks).toBe(2);
      expect(result.inProgressTasks).toBe(1);
      expect(result.completionPercentage).toBe(67);
      expect(result.totalStoryPoints).toBe(16);
      expect(result.completedStoryPoints).toBe(13);
      expect(result.currentPeriod.createdTasks).toBe(2);
      expect(result.currentPeriod.completedTasks).toBe(1);
      expect(result.previousPeriod.createdTasks).toBe(1);
      expect(result.previousPeriod.completedTasks).toBe(1);
      expect(result.deltas.createdTasksDelta).toBe(1);
      expect(result.deltas.completedTasksDelta).toBe(0);
    });
  });

  describe('getTaskDistribution', () => {
    it('should return distribution grouped by all statuses and priorities', async () => {
      prisma.task.groupBy
        .mockResolvedValueOnce([
          { status: TaskStatus.DONE, _count: { id: 5 } },
          { status: TaskStatus.IN_PROGRESS, _count: { id: 2 } },
        ])
        .mockResolvedValueOnce([
          { priority: TaskPriority.HIGH, _count: { id: 4 } },
        ]);

      const result = await service.getTaskDistribution('ws-123');

      expect(result.byStatus).toEqual(
        expect.arrayContaining([
          { status: TaskStatus.DONE, count: 5 },
          { status: TaskStatus.IN_PROGRESS, count: 2 },
          { status: TaskStatus.TODO, count: 0 },
          { status: TaskStatus.REVIEW, count: 0 },
        ]),
      );

      expect(result.byPriority).toEqual(
        expect.arrayContaining([
          { priority: TaskPriority.HIGH, count: 4 },
          { priority: TaskPriority.LOW, count: 0 },
          { priority: TaskPriority.MEDIUM, count: 0 },
          { priority: TaskPriority.URGENT, count: 0 },
        ]),
      );
    });
  });

  describe('getProductivityMetrics', () => {
    it('should generate daily zero-filled bucketed timeline', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const mockTasks = [
        {
          id: 'task-1',
          status: TaskStatus.DONE,
          createdAt: twoDaysAgo,
          updatedAt: twoDaysAgo,
        },
      ];

      prisma.task.findMany.mockResolvedValueOnce(mockTasks);

      const result = await service.getProductivityMetrics('ws-123', {
        days: 7,
        interval: AnalyticsInterval.DAY,
      });

      expect(result.timeframeDays).toBe(7);
      expect(result.totalCreatedInPeriod).toBe(1);
      expect(result.totalCompletedInPeriod).toBe(1);
      expect(result.timeline.length).toBeGreaterThan(0);
      expect(result.timeline[0]).toHaveProperty('date');
      expect(result.timeline[0]).toHaveProperty('accumulatedCreated');
      expect(result.timeline[0]).toHaveProperty('accumulatedCompleted');
    });

    it('should generate weekly bucketed timeline when interval is WEEK', async () => {
      prisma.task.findMany.mockResolvedValueOnce([]);

      const result = await service.getProductivityMetrics('ws-123', {
        days: 14,
        interval: AnalyticsInterval.WEEK,
      });

      expect(result.interval).toBe(AnalyticsInterval.WEEK);
      expect(result.timeline.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getWorkspaceSprintHealth', () => {
    it('should return active sprints with progress percentages and health indicators', async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      const mockSprint = {
        id: 'sprint-1',
        name: 'Sprint 1',
        goal: 'Ship MVP',
        startDate,
        endDate,
        status: SprintStatus.ACTIVE,
        project: {
          id: 'proj-1',
          title: 'Project Alpha',
          key: 'ALP',
          slug: 'project-alpha',
          color: '#3B82F6',
        },
        tasks: [
          {
            id: 'task-1',
            status: TaskStatus.DONE,
            priority: TaskPriority.HIGH,
            storyPoints: 5,
            estimatedHours: 4,
            dueDate: endDate,
          },
          {
            id: 'task-2',
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.MEDIUM,
            storyPoints: 3,
            estimatedHours: 3,
            dueDate: endDate,
          },
        ],
      };

      prisma.sprint.findMany.mockResolvedValueOnce([mockSprint]);

      const result = await service.getWorkspaceSprintHealth('ws-123');

      expect(result.activeSprintsCount).toBe(1);
      expect(result.totalCommittedStoryPoints).toBe(8);
      expect(result.totalCompletedStoryPoints).toBe(5);
      expect(result.overallSprintProgressPercentage).toBe(63);
      expect(result.sprints[0].healthStatus).toBe('ON_TRACK');
      expect(result.sprints[0].taskCounts.total).toBe(2);
      expect(result.sprints[0].taskCounts.done).toBe(1);
    });
  });

  describe('getProjectRollups', () => {
    it('should return project rollups with health and capacity metrics', async () => {
      const mockProject = {
        id: 'proj-1',
        title: 'Project Alpha',
        key: 'ALP',
        slug: 'project-alpha',
        description: 'First project',
        status: ProjectStatus.ACTIVE,
        priority: 'HIGH',
        color: '#10B981',
        startDate: new Date(),
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-1',
          name: 'Owner',
          username: 'owner',
          email: 'owner@test.com',
          avatar: null,
        },
        _count: {
          projectMembers: 3,
          boards: 1,
        },
        sprints: [
          {
            id: 'sprint-1',
            name: 'Sprint 1',
            startDate: new Date(),
            endDate: new Date(),
            status: SprintStatus.ACTIVE,
            tasks: [{ id: 't1', status: TaskStatus.DONE, storyPoints: 5 }],
          },
        ],
        boards: [
          {
            columns: [
              {
                tasks: [
                  {
                    id: 't1',
                    status: TaskStatus.DONE,
                    priority: TaskPriority.HIGH,
                    storyPoints: 5,
                    estimatedHours: 4,
                    dueDate: null,
                  },
                ],
              },
            ],
          },
        ],
      };

      prisma.project.findMany.mockResolvedValueOnce([mockProject]);

      const result = await service.getProjectRollups('ws-123');

      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Project Alpha');
      expect(result[0].completionPercentage).toBe(100);
      expect(result[0].activeSprint).toBeDefined();
      expect(result[0].activeSprint?.name).toBe('Sprint 1');
      expect(result[0].healthStatus).toBe('HEALTHY');
    });
  });

  describe('getMemberWorkload', () => {
    it('should return member workload breakdown with WIP and capacity statuses', async () => {
      const mockMembers = [
        {
          id: 'wm-1',
          userId: 'user-1',
          role: WorkspaceRole.OWNER,
          user: {
            id: 'user-1',
            name: 'Alice',
            username: 'alice',
            email: 'alice@test.com',
            avatar: null,
          },
        },
        {
          id: 'wm-2',
          userId: 'user-2',
          role: WorkspaceRole.MEMBER,
          user: {
            id: 'user-2',
            name: 'Bob',
            username: 'bob',
            email: 'bob@test.com',
            avatar: null,
          },
        },
      ];

      const mockTasks = [
        {
          id: 't1',
          assigneeId: 'user-1',
          status: TaskStatus.IN_PROGRESS,
          dueDate: null,
          storyPoints: 5,
          estimatedHours: 4,
        },
        {
          id: 't2',
          assigneeId: 'user-1',
          status: TaskStatus.DONE,
          dueDate: null,
          storyPoints: 3,
          estimatedHours: 2,
        },
      ];

      prisma.workspaceMember.findMany.mockResolvedValueOnce(mockMembers);
      prisma.task.findMany.mockResolvedValueOnce(mockTasks);

      const result = await service.getMemberWorkload('ws-123');

      expect(result.length).toBe(2);
      expect(result[0].user.name).toBe('Alice');
      expect(result[0].assignedCount).toBe(2);
      expect(result[0].completedCount).toBe(1);
      expect(result[0].inProgressCount).toBe(1);
      expect(result[0].capacityStatus).toBe('OPTIMAL');

      expect(result[1].user.name).toBe('Bob');
      expect(result[1].assignedCount).toBe(0);
      expect(result[1].capacityStatus).toBe('UNDERLOADED');
    });
  });
});
