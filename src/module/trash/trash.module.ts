import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { AuditLogModule } from '../audit/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TrashController } from './trash.controller';
import { TrashService } from './trash.service';

@Module({
  imports: [PrismaModule, ActivityModule, AuditLogModule],
  controllers: [TrashController],
  providers: [TrashService],
  exports: [TrashService],
})
export class TrashModule {}
