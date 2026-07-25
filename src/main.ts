import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import * as path from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { swaggerConfig, swaggerCustomOptions } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.use(helmet());
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  // Serve uploaded files statically at /uploads/*
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'public', 'uploads')),
  );

  app.setGlobalPrefix('api/v1', {
    exclude: ['/health'],
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  document.paths = Object.fromEntries(
    Object.entries(document.paths).map(([path, ops]) => [
      path,
      Object.fromEntries(
        Object.entries(ops).map(([method, op]) => [
          method,
          {
            ...op,
            security: [{ 'access-token': [] }],
          },
        ]),
      ),
    ]),
  );
  SwaggerModule.setup('docs', app, document, swaggerCustomOptions);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');

  await app.listen(port!, () => {
    logger.log(`SyncSpace API listening on port ${port}`);
  });
}
void bootstrap();
