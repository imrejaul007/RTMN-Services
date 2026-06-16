// Sentry error tracking integration.
// Set SENTRY_DSN in .env to enable. Free tier: 5K events/mo.
import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/node';
import { Handlers } from '@sentry/node';

const SENTRY_ENABLED = process.env.SENTRY_DSN && !process.env.SENTRY_DSN.includes('replace_me');

let sentryHandler = null;

export function initSentry(app) {
  if (!SENTRY_ENABLED) {
    console.log('[sentry] Not configured (set SENTRY_DSN to enable)');
    return null;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    integrations: [
      new Integrations.Express({ app }),
      new Integrations.Http({ breadcrumbs: true })
    ]
  });

  app.use(Handlers.requestHandler());
  app.use(Handlers.tracingHandler());
  sentryHandler = Handlers.errorHandler();
  console.log('[sentry] Initialized');

  return sentryHandler;
}

export function getErrorHandler() {
  return sentryHandler;
}
