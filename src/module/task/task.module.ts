import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [ActivityModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
