import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { ActivityModule } from './module/activity/activity.module';
import { AttachmentModule } from './module/attachment/attachment.module';
import { AuthModule } from './module/auth/auth.module';
import { BoardModule } from './module/board/board.module';
import { ColumnModule } from './module/column/column.module';
import { CommentModule } from './module/comment/comment.module';
import { EmailModule } from './module/email/email.module';
import { PrismaModule } from './module/prisma/prisma.module';
import { ProjectModule } from './module/project/project.module';
import { TaskLinkModule } from './module/task-link/task-link.module';
import { TaskModule } from './module/task/task.module';
import { UserModule } from './module/user/user.module';
import { WorkspaceModule } from './module/workspace/workspace.module';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 100 }] }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587,
          auth: {
            user: config.get<string>('EMAIL_USER'),
            pass: config.get<string>('EMAIL_PASS'),
          },
        },
      }),
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    EmailModule,
    WorkspaceModule,
    ProjectModule,
    ActivityModule,
    BoardModule,
    ColumnModule,
    TaskModule,
    CommentModule,
    AttachmentModule,
    TaskLinkModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
