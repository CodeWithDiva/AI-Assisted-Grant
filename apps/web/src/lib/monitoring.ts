/**
 * Error reporting. The Sentry SDK is only downloaded when VITE_SENTRY_DSN is set at build
 * time, so builds without it ship none of its code.
 */
type SentryModule = typeof import('@sentry/react');

const dsn = import.meta.env.VITE_SENTRY_DSN;
let sentry: Promise<SentryModule | null> = Promise.resolve(null);

export function initMonitoring(): void {
  if (!dsn) return;
  sentry = import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn,
      release: `grant-web@${__APP_VERSION__}`,
      environment: import.meta.env.MODE,
      sendDefaultPii: false,
    });
    return Sentry;
  });
}

export function reportError(error: unknown): void {
  void sentry.then((Sentry) => Sentry?.captureException(error));
}
