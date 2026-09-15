/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { LabelService } from './label.service';

describe('LabelService', () => {
  let service: LabelService;
  let prisma: any;
  let entityValidationService: any;
  let activityService: any;

  const mockUser: any = {
    id: 'user-1',
    name: 'Alice Developer',
    email: 'alice@example.com',
  };

  beforeEach(async () => {
    prisma = {
      taskLabel: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      task: {
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    entityValidationService = {
      verifyWorkspace: jest
        .fn()
        .mockResolvedValue({ id: 'ws-1', name: 'Acme' }),
      verifyTaskById: jest.fn().mockResolvedValue({
        id: 'task-1',
        title: 'Fix auth bug',
        column: {
          board: {
            id: 'board-1',
            project: {
              id: 'project-1',
              workspaceId: 'ws-1',
            },
          },
        },
      }),
    };

    activityService = {
      createActivityLog: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
        { provide: EntityValidationService, useValue: entityValidationService },
      ],
    }).compile();

    service = module.get<LabelService>(LabelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLabel', () => {
    it('should create a label successfully', async () => {
      prisma.taskLabel.findFirst.mockResolvedValue(null);
      prisma.taskLabel.create.mockResolvedValue({
        id: 'label-1',
        workspaceId: 'ws-1',
        name: 'Bug',
        color: '#EF4444',
      });

      const result = await service.createLabel(
        'ws-1',
        { name: 'Bug', color: '#EF4444' },
        mockUser,
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 'label-1',
          name: 'Bug',
          color: '#EF4444',
        }),
      );
      expect(activityService.createActivityLog).toHaveBeenCalled();
    });

    it('should throw ConflictException if label with same name exists', async () => {
      prisma.taskLabel.findFirst.mockResolvedValue({
        id: 'label-1',
        name: 'Bug',
      });

      await expect(
        service.createLabel(
          'ws-1',
          { name: 'Bug', color: '#EF4444' },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getWorkspaceLabels', () => {
    it('should return all workspace labels', async () => {
      prisma.taskLabel.findMany.mockResolvedValue([
        { id: 'label-1', name: 'Bug', color: '#EF4444', _count: { tasks: 3 } },
        {
          id: 'label-2',
          name: 'Feature',
          color: '#10B981',
          _count: { tasks: 5 },
        },
      ]);

      const result = await service.getWorkspaceLabels('ws-1');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Bug');
    });
  });

  describe('attachLabelToTask', () => {
    it('should connect label to task', async () => {
      prisma.taskLabel.findFirst.mockResolvedValue({
        id: 'label-1',
        workspaceId: 'ws-1',
        name: 'Bug',
      });
      prisma.task.update.mockResolvedValue({
        id: 'task-1',
        title: 'Fix auth bug',
        labels: [{ id: 'label-1', name: 'Bug', color: '#EF4444' }],
      });

      const result = await service.attachLabelToTask(
        'task-1',
        'label-1',
        mockUser,
      );

      expect(result.labels).toHaveLength(1);
      expect(activityService.createActivityLog).toHaveBeenCalled();
    });
  });

  describe('detachLabelFromTask', () => {
    it('should disconnect label from task', async () => {
      prisma.taskLabel.findFirst.mockResolvedValue({
        id: 'label-1',
        workspaceId: 'ws-1',
        name: 'Bug',
      });
      prisma.task.update.mockResolvedValue({
        id: 'task-1',
        title: 'Fix auth bug',
        labels: [],
      });

      const result = await service.detachLabelFromTask(
        'task-1',
        'label-1',
        mockUser,
      );

      expect(result.labels).toHaveLength(0);
      expect(activityService.createActivityLog).toHaveBeenCalled();
    });
  });
});
