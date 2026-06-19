// Sentry error tracking integration.
// Set SENTRY_DSN in .env to enable. Free tier: 5K events/mo.
const SENTRY_ENABLED = process.env.SENTRY_DSN && !process.env.SENTRY_DSN.includes('replace_me');

let sentryHandler = null;

export function initSentry(app) {
  if (!SENTRY_ENABLED) {
    console.log('[sentry] Not configured (set SENTRY_DSN to enable)');
    return null;
  }

  import('express').then(({ default: express }) => {
    // Dynamic import to avoid crashing if sentry isn't installed
    import('@sentry/node').then(async (Sentry) => {
      const { SentryInit } = await import('@sentry/node');
      SentryInit({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        integrations: [
          new Sentry.Integrations.Express({ app }),
          new Sentry.Integrations.Http({ breadcrumbs: true })
        ]
      });
      app.use(Sentry.Handlers.requestHandler());
      app.use(Sentry.Handlers.tracingHandler());
      sentryHandler = Sentry.Handlers.errorHandler();
      console.log('[sentry] Initialized');
    }).catch(() => {
      console.warn('[sentry] @sentry/node not installed; skipping');
    });
  });

  return sentryHandler;
}

export function getErrorHandler() {
  return sentryHandler;
}