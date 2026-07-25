import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { TaskLinkController } from './task-link.controller';
import { TaskLinkService } from './task-link.service';

@Module({
  imports: [ActivityModule],
  controllers: [TaskLinkController],
  providers: [TaskLinkService],
  exports: [TaskLinkService],
})
export class TaskLinkModule {}
