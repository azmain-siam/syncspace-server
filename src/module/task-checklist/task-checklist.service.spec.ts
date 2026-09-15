/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityValidationService } from 'src/common/services/entity-validation.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskChecklistService } from './task-checklist.service';

describe('TaskChecklistService', () => {
  let service: TaskChecklistService;
  let prisma: any;
  let entityValidationService: any;
  let activityService: any;
  let eventEmitter: any;

  beforeEach(async () => {
    prisma = {
      taskChecklist: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    entityValidationService = {
      verifyTaskById: jest.fn().mockResolvedValue({
        id: 'task-1',
        title: 'Test Task',
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
      verifyAssignee: jest.fn().mockResolvedValue(true),
    };

    activityService = {
      createActivityLog: jest.fn().mockResolvedValue({}),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskChecklistService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntityValidationService, useValue: entityValidationService },
        { provide: ActivityService, useValue: activityService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<TaskChecklistService>(TaskChecklistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChecklistItems', () => {
    it('should return checklist items ordered by order asc', async () => {
      const mockItems = [
        { id: 'item-1', title: 'Task 1', isCompleted: false, order: 0 },
        { id: 'item-2', title: 'Task 2', isCompleted: true, order: 1 },
      ];
      prisma.taskChecklist.findMany.mockResolvedValue(mockItems);

      const result = await service.getChecklistItems('task-1');
      expect(result).toEqual(mockItems);
      expect(entityValidationService.verifyTaskById).toHaveBeenCalledWith(
        'task-1',
      );
    });
  });

  describe('createChecklistItem', () => {
    it('should create checklist item, log activity, and emit event', async () => {
      const mockUser: any = { id: 'user-1', name: 'John Doe' };
      const createdItem = {
        id: 'item-1',
        taskId: 'task-1',
        title: 'New Checklist Item',
        isCompleted: false,
        order: 0,
      };

      prisma.taskChecklist.findFirst.mockResolvedValue(null);
      prisma.taskChecklist.create.mockResolvedValue(createdItem);

      const result = await service.createChecklistItem(
        'task-1',
        { title: 'New Checklist Item' },
        mockUser,
      );

      expect(result).toEqual(createdItem);
      expect(activityService.createActivityLog).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'checklist.created',
        expect.any(Object),
      );
    });
  });

  describe('toggleChecklistItem', () => {
    it('should invert isCompleted status and emit event', async () => {
      const mockUser: any = { id: 'user-1', name: 'John Doe' };
      prisma.taskChecklist.findFirst.mockResolvedValue({
        id: 'item-1',
        taskId: 'task-1',
        title: 'Toggle Item',
        isCompleted: false,
      });

      prisma.taskChecklist.update.mockResolvedValue({
        id: 'item-1',
        title: 'Toggle Item',
        isCompleted: true,
      });

      const result = await service.toggleChecklistItem(
        'task-1',
        'item-1',
        mockUser,
      );
      expect(result.isCompleted).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'checklist.updated',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if checklist item does not exist', async () => {
      const mockUser: any = { id: 'user-1', name: 'John Doe' };
      prisma.taskChecklist.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleChecklistItem('task-1', 'invalid-item', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
