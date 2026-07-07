/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | undefined;

    // Handle NestJS HttpExceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || message;
      error = exception.name;

      return response.status(status).json({
        success: false,
        statusCode: status,
        message,
        data: null,
        error,
      });
    }

    // Prisma Errors
    if (this.isPrismaError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      message = this.mapPrismaError(exception);
      error = (exception as any).code;

      return response.status(status).json({
        success: false,
        statusCode: status,
        message,
        data: null,
        error,
      });
    }

    // Unknown error fallback
    this.logger.error(
      message,
      exception instanceof Error ? exception.stack : String(exception),
    );

    return response.status(status).json({
      success: false,
      statusCode: status,
      message,
      data: null,
      error: String(exception),
    });
  }

  private isPrismaError(e: any): boolean {
    return e && typeof e === 'object' && e.code?.startsWith('P');
  }

  // private mapPrismaError(e: any): string {
  //   const code = e.code;
  //   switch (code) {
  //     case 'P2002':
  //       return 'Duplicate value. A unique constraint was violated.';
  //     case 'P2025':
  //       return 'Record not found.';
  //     default:
  //       return 'Database error occurred.';
  //   }
  // }

  private mapPrismaError(e: any): string {
    switch (e.code) {
      case 'P2002':
        return 'Duplicate value. A unique constraint was violated.';
      case 'P2025':
        return 'Record not found.';
      case 'P2003':
        return 'Foreign key constraint failed.';
      case 'P2000':
        return 'Value too long for field.';
      case 'P1000':
        return 'Database connection error.';
      default:
        // console.error('Unhandled Prisma error:', e);
        this.logger.error('Unhandled Prisma error', JSON.stringify(e));
        return 'Database error occurred.';
    }
  }
}
