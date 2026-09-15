import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LabelController } from './label.controller';
import { LabelService } from './label.service';

@Module({
  imports: [PrismaModule, ActivityModule],
  controllers: [LabelController],
  providers: [LabelService],
  exports: [LabelService],
})
export class LabelModule {}
