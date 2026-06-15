import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring
  integrations: [
    nodeProfilingIntegration(),
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
  ],

  // Sampling
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Profiling
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release
  release: process.env.GIT_SHA || process.env.npm_package_version,

  // Tags
  tags: {
    service: process.env.SERVICE_NAME || 'unknown',
    version: process.env.npm_package_version || 'unknown',
  },

  // Before send
  beforeSend(event, hint) {
    // Filter out health check errors
    if (event.request?.url?.includes('/health')) {
      return null;
    }

    // Filter out specific error types
    const error = hint?.originalException;
    if (error instanceof Error && error.message === 'Health check timeout') {
      return null;
    }

    return event;
  },

  // Ignore errors
  ignoreErrors: [
    'Health check timeout',
    'ECONNREFUSED',
  ],

  // Maximum breadcrumbs
  maxBreadcrumbs: 50,

  // Context
  initialScope: {
    tags: {
      service: process.env.SERVICE_NAME || 'unknown',
    },
  },
});

// Error handler middleware
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Handle all errors except health checks
    return !error.message?.includes('health');
  },
});

// Request handler
export const sentryRequestHandler = Sentry.Handlers.requestHandler({
  // Don't include body for performance
  include: {
    headers: true,
    cookies: false,
    data: false,
    env: false,
    user: false,
  },
});

// Tracing handler
export const sentryTracingHandler = Sentry.Handlers.tracingHandler();

export default Sentry;
