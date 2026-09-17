import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import type { Env } from '../../config/env';

/**
 * Turns on error reporting when SENTRY_DSN is set; without it every capture call is a no-op.
 * Request bodies, cookies and headers are never sent — proposals and RFPs are confidential.
 */
export function initMonitoring(config: ConfigService<Env, true>, release: string): boolean {
  const dsn = config.get('SENTRY_DSN', { infer: true });
  if (!dsn) return false;

  Sentry.init({
    dsn,
    release,
    environment:
      config.get('SENTRY_ENVIRONMENT', { infer: true }) ?? config.get('NODE_ENV', { infer: true }),
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
  Logger.log('Error reporting to Sentry is on', 'Monitoring');
  return true;
}

export { Sentry };
