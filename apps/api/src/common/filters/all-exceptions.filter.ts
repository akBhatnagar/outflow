import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * Returns a normalized RFC-7807 problem+json body for every error.
 * Maps Prisma known errors to sensible HTTP statuses.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail: string | undefined;
    let errors: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      title = exception.message;
      if (typeof response === 'object' && response !== null) {
        const body = response as Record<string, unknown>;
        detail = (body.message as string) ?? title;
        errors = body.errors;
      } else {
        detail = String(response);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          title = 'Conflict';
          detail = `Unique constraint failed on field(s): ${(exception.meta?.target as string[])?.join(', ') ?? 'unknown'}`;
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          title = 'Not Found';
          detail = 'Record not found';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          title = 'Bad Request';
          detail = exception.message;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        { path: req.url, method: req.method, err: exception },
        'Unhandled exception',
      );
    }

    res.status(status).type('application/problem+json').json({
      type: 'about:blank',
      title,
      status,
      detail,
      errors,
      instance: req.url,
    });
  }
}
