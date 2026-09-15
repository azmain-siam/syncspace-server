/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from './enums/audit-action.enum';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      workspaceMember: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create an audit log entry with workspaceId', async () => {
      prisma.auditLog.create.mockResolvedValue({
        id: 'log-1',
        workspaceId: 'ws-1',
        actorId: 'user-1',
        action: AuditAction.PASSWORD_CHANGED,
      });

      const result = await service.log({
        workspaceId: 'ws-1',
        actorId: 'user-1',
        action: AuditAction.PASSWORD_CHANGED,
      });

      expect(result).toBeDefined();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'ws-1',
          actorId: 'user-1',
          action: AuditAction.PASSWORD_CHANGED,
        }),
      });
    });
  });

  describe('getWorkspaceAuditLogs', () => {
    it('should fetch paginated audit logs for workspace members and events', async () => {
      prisma.workspaceMember.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          action: AuditAction.USER_LOGIN,
          actor: { id: 'user-1', name: 'Alice' },
          createdAt: new Date(),
        },
      ]);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await service.getWorkspaceAuditLogs('ws-1', {
        page: 1,
        limit: 20,
      });

      expect(result.auditLogs).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
