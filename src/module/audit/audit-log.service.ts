import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { calculatePaginationMeta } from 'src/common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { WorkspaceAuditQueryDto } from './dto/workspace-audit-query.dto';
import { AuditLogInput } from './interfaces/audit-log-input.interface';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Create audit log entry
  async log(input: AuditLogInput) {
    try {
      const entry = await this.prisma.auditLog.create({
        data: {
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          action: input.action,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: input.metadata,
        },
      });

      this.logger.log(
        `Audit Log Recorded [${input.action}] ${
          input.actorId ? `by User (${input.actorId})` : ''
        } ${input.workspaceId ? `in Workspace (${input.workspaceId})` : ''}`,
      );

      return entry;
    } catch (error: unknown) {
      const errStack = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        `Failed to record audit log [${input.action}]`,
        errStack,
      );
      // Non-blocking: audit log failure should not crash business flows unless explicitly critical
      return null;
    }
  }

  // Get audit logs (Paginated for platform admin reporting)
  async getAuditLogs(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
    };

    const [auditLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      auditLogs,
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  // Get audit logs for a specific workspace (for Workspace Owner and Admin)
  async getWorkspaceAuditLogs(
    workspaceId: string,
    query: WorkspaceAuditQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    });
    const memberUserIds = members.map((m) => m.userId);

    const where: Prisma.AuditLogWhereInput = {
      OR: [{ workspaceId }, { actorId: { in: memberUserIds } }],
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const [auditLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      auditLogs,
      meta: calculatePaginationMeta(total, page, limit),
    };
  }
}
