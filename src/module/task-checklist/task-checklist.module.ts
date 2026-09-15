import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TaskChecklistController } from './task-checklist.controller';
import { TaskChecklistService } from './task-checklist.service';

@Module({
  imports: [PrismaModule, ActivityModule],
  controllers: [TaskChecklistController],
  providers: [TaskChecklistService],
  exports: [TaskChecklistService],
})
export class TaskChecklistModule {}
