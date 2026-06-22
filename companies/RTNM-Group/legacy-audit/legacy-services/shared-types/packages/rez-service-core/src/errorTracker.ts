/**
 * Shared ErrorTracker module for REZ microservices.
 * Provides Sentry error tracking with consistent configuration across all services.
 *
 * Usage:
 *   import { ErrorTracker } from '@rez/service-core';
 *   ErrorTracker.init({ serviceName: 'my-service' });
 *   ErrorTracker.setupExpress(app);
 */

import * as Sentry from '@sentry/node';
import type { Express } from 'express';

export interface ErrorTrackerOptions {
  serviceName: string;
  dsn?: string;
  environment?: string;
  tracesSampleRate?: number;
}

/**
 * Initialize Sentry error tracking.
 * Safe to call multiple times - only initializes once.
 */
export function init(options: ErrorTrackerOptions): void {
  const dsn = options.dsn || process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn(`[ErrorTracker] SENTRY_DSN not configured for ${options.serviceName} - error tracking disabled`);
    return;
  }

  Sentry.init({
    dsn,
    environment: options.environment || process.env.NODE_ENV || 'production',
    serverName: options.serviceName,
    tracesSampleRate: options.tracesSampleRate ?? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  });

  logger.info([ErrorTracker] Initialized for ${options.serviceName}`);
}

/**
 * Set up Express middleware for request handling and error capture.
 * Call after creating the Express app but before routes.
 */
export function setupExpress(app: Express): void {
  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler());
  }
}

/**
 * Set up Express error handler middleware.
 * Call after all routes.
 */
export function setupErrorHandler(app: Express): void {
  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
  }
}

/**
 * Capture an exception manually.
 */
export function captureException(error: Error): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message manually.
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Add custom context to all future events.
 */
export function setContext(key: string, context: Record<string, unknown>): void {
  if (process.env.SENTRY_DSN) {
    Sentry.setContext(key, context);
  }
}

/**
 * Set the user for all future events.
 */
export function setUser(user: Sentry.User | null): void {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(user);
  }
}

export { Sentry };
