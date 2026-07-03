/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(message: string, status: HttpStatus, errors?: any) {
    super(
      {
        message,
        errors,
      },
      status,
    );
  }
}
