/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceRole } from '@prisma/client';
import { User } from 'src/common/interfaces/user.interface';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/enums/activity-action.enum';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceService } from './workspace.service';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let prisma: any;
  let activityService: any;
  let auditLogService: any;

  const mockUser: User = {
    id: 'user-1',
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      workspace: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      workspaceMember: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      project: {
        create: jest.fn(),
      },
      board: {
        create: jest.fn(),
      },
      boardColumn: {
        create: jest.fn(),
      },
      task: {
        create: jest.fn(),
      },
    };

    activityService = {
      createActivityLog: jest.fn().mockResolvedValue({}),
    };

    auditLogService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deleteWorkspace', () => {
    it('should soft-delete workspace and record activity and audit log', async () => {
      const workspace = {
        id: 'ws-1',
        name: 'Workspace Alpha',
        ownerId: 'user-1',
        deletedAt: null,
      };

      prisma.workspace.findFirst.mockResolvedValue(workspace);
      prisma.workspace.update.mockResolvedValue({
        ...workspace,
        deletedAt: new Date(),
      });

      const result = await service.deleteWorkspace('ws-1', mockUser);

      expect(result).toBeNull();
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(activityService.createActivityLog).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          workspaceId: 'ws-1',
          actorId: 'user-1',
          action: ActivityAction.WORKSPACE_DELETED,
        }),
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          actorId: 'user-1',
          action: AuditAction.WORKSPACE_DELETED,
        }),
      );
    });

    it('should throw NotFoundException if workspace does not exist or is already deleted', async () => {
      prisma.workspace.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteWorkspace('ws-unknown', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the workspace owner', async () => {
      prisma.workspace.findFirst.mockResolvedValue({
        id: 'ws-1',
        name: 'Workspace Alpha',
        ownerId: 'other-owner-id',
        deletedAt: null,
      });

      await expect(service.deleteWorkspace('ws-1', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('leaveWorkspace', () => {
    it('should allow non-owner member to leave workspace voluntarily', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: WorkspaceRole.MEMBER,
      });
      prisma.workspaceMember.delete.mockResolvedValue({});

      const result = await service.leaveWorkspace('ws-1', mockUser);

      expect(result).toBeNull();
      expect(prisma.workspaceMember.delete).toHaveBeenCalledWith({
        where: {
          workspaceId_userId: {
            workspaceId: 'ws-1',
            userId: 'user-1',
          },
        },
      });
      expect(activityService.createActivityLog).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          workspaceId: 'ws-1',
          actorId: 'user-1',
          action: ActivityAction.MEMBER_LEFT,
        }),
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          actorId: 'user-1',
          action: AuditAction.WORKSPACE_LEFT,
        }),
      );
    });

    it('should prevent workspace owner from leaving', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: WorkspaceRole.OWNER,
      });

      await expect(service.leaveWorkspace('ws-1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user is not a member', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(service.leaveWorkspace('ws-1', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMyWorkspaces', () => {
    it('should return workspaces excluding soft-deleted ones', async () => {
      const workspaces = [{ id: 'ws-1', name: 'Alpha', deletedAt: null }];
      prisma.workspace.findMany.mockResolvedValue(workspaces);

      const result = await service.getMyWorkspaces('user-1');

      expect(result).toEqual(workspaces);
      expect(prisma.workspace.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          members: { some: { userId: 'user-1' } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
