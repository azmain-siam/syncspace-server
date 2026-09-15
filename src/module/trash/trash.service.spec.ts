/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { ActivityService } from '../activity/activity.service';
import { AuditLogService } from '../audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { TrashService } from './trash.service';

describe('TrashService', () => {
  let service: TrashService;
  let prisma: any;
  let activityService: any;
  let auditLogService: any;
  let entityValidationService: any;

  const mockUser: any = {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@example.com',
  };

  beforeEach(async () => {
    prisma = {
      project: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      task: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    activityService = {
      createActivityLog: jest.fn().mockResolvedValue({}),
    };

    auditLogService = {
      log: jest.fn().mockResolvedValue({}),
    };

    entityValidationService = {
      verifyWorkspace: jest
        .fn()
        .mockResolvedValue({ id: 'ws-1', name: 'Acme' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrashService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: EntityValidationService, useValue: entityValidationService },
      ],
    }).compile();

    service = module.get<TrashService>(TrashService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTrashItems', () => {
    it('should list soft-deleted projects and tasks sorted by deletedAt', async () => {
      prisma.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          title: 'Old Project',
          key: 'OLD',
          slug: 'old-project',
          deletedAt: new Date('2026-09-10T10:00:00Z'),
          createdBy: { id: 'u1', name: 'User 1' },
        },
      ]);

      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Old Task',
          key: 'OLD-1',
          deletedAt: new Date('2026-09-12T10:00:00Z'),
          creator: { id: 'u1', name: 'User 1' },
          column: {
            id: 'col-1',
            title: 'Done',
            board: {
              id: 'board-1',
              title: 'Board',
              project: {
                id: 'proj-2',
                title: 'Active Project',
                key: 'ACT',
                deletedAt: null,
              },
            },
          },
        },
      ]);

      const result = await service.getTrashItems('ws-1', { type: 'ALL' });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('task-1'); // More recent deletion first
      expect(result.items[1].id).toBe('proj-1');
      expect(result.meta.total).toBe(2);
    });
  });

  describe('restoreItem', () => {
    it('should restore a soft-deleted project', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        title: 'Archived Project',
        workspaceId: 'ws-1',
        deletedAt: new Date(),
      });
      prisma.project.update.mockResolvedValue({
        id: 'proj-1',
        title: 'Archived Project',
        deletedAt: null,
        status: 'ACTIVE',
      });

      const result = await service.restoreItem(
        'ws-1',
        { itemType: 'PROJECT', itemId: 'proj-1' },
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(activityService.createActivityLog).toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException if restoring task whose parent project is deleted', async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        title: 'Deleted Task',
        deletedAt: new Date(),
        column: {
          board: {
            project: {
              id: 'proj-1',
              title: 'Deleted Project',
              deletedAt: new Date(),
            },
          },
        },
      });

      await expect(
        service.restoreItem(
          'ws-1',
          { itemType: 'TASK', itemId: 'task-1' },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should restore a task whose parent project is active', async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        title: 'Deleted Task',
        deletedAt: new Date(),
        column: {
          id: 'col-1',
          board: {
            id: 'board-1',
            project: {
              id: 'proj-1',
              title: 'Active Project',
              deletedAt: null,
            },
          },
        },
      });
      prisma.task.update.mockResolvedValue({
        id: 'task-1',
        title: 'Deleted Task',
        deletedAt: null,
      });

      const result = await service.restoreItem(
        'ws-1',
        { itemType: 'TASK', itemId: 'task-1' },
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(activityService.createActivityLog).toHaveBeenCalled();
    });
  });

  describe('emptyTrash', () => {
    it('should purge all deleted items when no itemId provided', async () => {
      prisma.task.deleteMany.mockResolvedValue({ count: 5 });
      prisma.project.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.emptyTrash('ws-1', mockUser);

      expect(result.success).toBe(true);
      expect(prisma.task.deleteMany).toHaveBeenCalled();
      expect(prisma.project.deleteMany).toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalled();
    });
  });
});
