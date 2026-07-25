import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';
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
        }`,
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

    const totalPages = Math.ceil(total / limit);

    return {
      auditLogs,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}
