import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { ColumnController } from './column.controller';
import { ColumnService } from './column.service';

@Module({
  imports: [ActivityModule],
  controllers: [ColumnController],
  providers: [ColumnService],
  exports: [ColumnService],
})
export class ColumnModule {}
