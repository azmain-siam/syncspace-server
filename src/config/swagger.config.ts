/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('server API')
  .setDescription(
    'Official API documentation for the server API.\n\n' +
      'Use this documentation to explore all endpoints, models, authentication methods, and integration guides.',
  )
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter your JWT token here',
    },
    'access-token',
  )
  // .addServer('http://localhost:5000', 'Local Development')
  .build();

export const swaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    // tagsSorter: 'alpha',
    operationsSorter: function (a, b) {
      const methodsOrder = [
        'post',
        'get',
        'put',
        'delete',
        'patch',
        'options',
        'trace',
      ];
      let result =
        methodsOrder.indexOf(a.get('method')) -
        methodsOrder.indexOf(b.get('method'));
      if (result === 0) {
        result = a.get('path').localeCompare(b.get('path')); // Fallback to path if methods are the same
      }
      return result;
    },
  },
  customSiteTitle: 'server API Docs',
  customCss: `
      .swagger-ui .topbar { background-color: #111827 !important; }
      .topbar-wrapper img { content: url('/logo.svg'); width: 140px; }
    `,
};
