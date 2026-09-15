import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailModule } from '../email/email.module';
import { EmailProcessor } from './email/email.processor';
import { EMAIL_QUEUE } from './email/email.queue';
import { EmailQueueService } from './email/email.queue.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
    }),
    EmailModule,
  ],
  providers: [EmailQueueService, EmailProcessor],
  exports: [EmailQueueService, BullModule],
})
export class QueueModule {}
