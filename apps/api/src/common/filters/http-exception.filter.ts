import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse = {
      code: 'INTERNAL_ERROR',
      message: 'Une erreur interne est survenue',
      details: undefined as Record<string, unknown> | undefined,
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;

        if (resp.code && resp.message) {
          errorResponse = {
            code: resp.code as string,
            message: resp.message as string,
            details: resp.details as Record<string, unknown> | undefined,
          };
        } else if (resp.message) {
          // Handle validation errors from class-validator
          if (Array.isArray(resp.message)) {
            errorResponse = {
              code: 'VALIDATION_ERROR',
              message: 'Erreur de validation',
              details: { errors: resp.message },
            };
          } else {
            errorResponse = {
              code: this.getErrorCodeFromStatus(status),
              message: resp.message as string,
              details: undefined,
            };
          }
        }
      }
    }

    response.status(status).json({
      data: null,
      error: errorResponse,
    });
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
