import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';

@Module({
  imports: [ActivityModule],
  controllers: [BoardController],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
