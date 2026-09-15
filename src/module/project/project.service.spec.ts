/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let prisma: any;
  let activityService: any;

  const mockUser: any = {
    id: 'user-1',
    name: 'Alice Manager',
    email: 'alice@example.com',
  };

  beforeEach(async () => {
    prisma = {
      project: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      task: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    activityService = {
      createActivityLog: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProjectTasks', () => {
    it('should return flat list of tasks with pagination and checklist progress', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'project-1',
        workspaceId: 'ws-1',
        title: 'Backend API',
        key: 'SYNC',
        slug: 'backend-api',
      });

      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Implement Labels',
          key: 'SYNC-1',
          priority: 'HIGH',
          status: 'TODO',
          checklists: [
            { id: 'c-1', isCompleted: true },
            { id: 'c-2', isCompleted: false },
          ],
          labels: [{ id: 'l-1', name: 'Feature', color: '#10B981' }],
        },
      ]);
      prisma.task.count.mockResolvedValue(1);

      const result = await service.getProjectTasks('project-1', {
        page: 1,
        limit: 20,
      });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].checklistProgress).toEqual({
        total: 2,
        completed: 1,
        percentage: 50,
      });
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException if project not found', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.getProjectTasks('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteProject (Soft Delete)', () => {
    it('should soft delete project and log activity', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'project-1',
        title: 'Backend API',
      });
      prisma.project.update.mockResolvedValue({
        id: 'project-1',
        title: 'Backend API',
        deletedAt: new Date(),
        status: 'ARCHIVED',
      });

      const result = await service.deleteProject('project-1', 'ws-1', mockUser);

      expect(result.message).toBe('Project deleted successfully');
      expect(activityService.createActivityLog).toHaveBeenCalled();
    });
  });

  describe('restoreProject', () => {
    it('should restore project and log activity', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'project-1',
        title: 'Backend API',
      });
      prisma.project.update.mockResolvedValue({
        id: 'project-1',
        title: 'Backend API',
        deletedAt: null,
        status: 'ACTIVE',
      });

      const result = await service.restoreProject(
        'project-1',
        'ws-1',
        mockUser,
      );

      expect(result.status).toBe('ACTIVE');
      expect(activityService.createActivityLog).toHaveBeenCalled();
    });
  });
});
