import { Prisma } from '@prisma/client';
import { AuditAction } from '../enums/audit-action.enum';

export interface AuditLogInput {
  workspaceId?: string;
  actorId?: string;
  action: AuditAction | string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
}
