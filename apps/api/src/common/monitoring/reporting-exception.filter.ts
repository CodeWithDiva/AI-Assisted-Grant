import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';
import { Sentry } from './sentry';

/** 4xx responses are expected (bad input, expired session); only server faults are reported. */
export function shouldReport(exception: unknown): boolean {
  return !(exception instanceof HttpException) || exception.getStatus() >= 500;
}

/** Reports unexpected errors, then lets Nest send its normal response. */
@Catch()
export class ReportingExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (shouldReport(exception)) {
      Sentry.withScope((scope) => {
        if (host.getType() === 'http') {
          const request = host.switchToHttp().getRequest<Request>();
          // The route pattern, not the URL: ids and invitation tokens stay out of the report.
          scope.setTag('route', `${request.method} ${request.route?.path ?? 'unmatched'}`);
        }
        Sentry.captureException(exception);
      });
    }
    super.catch(exception, host);
  }
}
