import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { ProjectTasksController } from './project-tasks.controller';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [ActivityModule],
  controllers: [ProjectController, ProjectTasksController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
