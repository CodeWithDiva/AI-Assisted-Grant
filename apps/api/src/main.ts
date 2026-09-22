import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ReportingExceptionFilter } from './common/monitoring/reporting-exception.filter';
import { initMonitoring } from './common/monitoring/sentry';
import type { Env } from './config/env';
import { APP_VERSION } from './config/version';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  initMonitoring(config, `grant-api@${APP_VERSION}`);
  app.useGlobalFilters(new ReportingExceptionFilter(app.get(HttpAdapterHost).httpAdapter));

  // Section text can be long, but not unbounded.
  app.useBodyParser('json', { limit: '2mb' });
  const proxyHops = config.get('TRUST_PROXY_HOPS', { infer: true });
  if (proxyHops) app.set('trust proxy', proxyHops);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: allowedOrigin(config), credentials: true });
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  try {
    await app.listen(port);
  } catch (error) {
    // The usual cause in development: an earlier API process is still holding the port.
    if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      Logger.error(
        `Port ${port} is already in use. Another API is still running — stop it (or set PORT to a free port) and start again.`,
        'Bootstrap',
      );
      process.exit(1);
    }
    throw error;
  }
  Logger.log(`API running at http://localhost:${port}/api/v1`, 'Bootstrap');
}

/**
 * Production allows exactly one origin. Development also accepts localhost, 127.0.0.1 and
 * private LAN addresses, so opening the app by IP (or on a phone) does not fail CORS.
 */
function allowedOrigin(config: ConfigService<Env, true>) {
  const webOrigin = config.get('WEB_ORIGIN', { infer: true });
  if (config.get('NODE_ENV', { infer: true }) === 'production') return webOrigin;

  const localPattern =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/;

  return (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    // No Origin header: curl, health checks, same-origin navigations.
    if (!origin) return callback(null, true);
    callback(null, origin === webOrigin || localPattern.test(origin));
  };
}

void bootstrap();
