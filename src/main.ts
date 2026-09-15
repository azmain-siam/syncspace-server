import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { swaggerConfig, swaggerCustomOptions } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:3000',
  );

  app.use(helmet());
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
    credentials: true,
  });

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

  const port = configService.get<number>('port', 5000);

  await app.listen(port, () => {
    logger.log(`SyncSpace API listening on port ${port}`);
  });
}
void bootstrap();
