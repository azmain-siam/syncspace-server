import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { AuthModule } from './module/auth/auth.module';
import { EmailService } from './module/email/email.service';
import { PrismaModule } from './module/prisma/prisma.module';
import { UserModule } from './module/user/user.module';
import { WorkspaceModule } from './module/workspace/workspace.module';
import { ProjectModule } from './module/project/project.module';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    // LoggerModule.forRoot({
    //   pinoHttp: {
    //     level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    //     transport:
    //       process.env.NODE_ENV !== 'production'
    //         ? {
    //             target: 'pino-pretty',
    //           }
    //         : undefined,
    //   },
    // }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 10 }] }),
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
    WorkspaceModule,
    ProjectModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    EmailService,
  ],
})
export class AppModule {}
