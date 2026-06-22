/**
 * Error Tracking - Sentry Integration
 *
 * Features:
 * - Error tracking
 * - Performance monitoring
 * - Session replay
 * - User feedback
 */

import * as Sentry from 'sentry-expo';

// ============================================================================
// CONFIG
// ============================================================================

const SENTRY_DSN = process.env.SENTRY_DSN || '';

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] No DSN configured');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    enableInExpoDevelopment: true,
    debug: process.env.NODE_ENV === 'development',

    // Performance monitoring
    tracesSampleRate: 0.1,

    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Ignore errors
    ignoreErrors: [
      'Network Error',
      'Request timeout',
      'No internet connection',
    ],
  });

  console.log('[Sentry] Initialized');
}

// ============================================================================
// ERROR REPORTING
// ============================================================================

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}

// ============================================================================
// USER TRACKING
// ============================================================================

export function setUser(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email,
  });
}

export function clearUser() {
  Sentry.setUser(null);
}

// ============================================================================
// CONTEXT
// ============================================================================

export function setContext(key: string, value: Record<string, unknown>) {
  Sentry.setContext(key, value);
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now(),
  });
}

// ============================================================================
// PERFORMANCE
// ============================================================================

export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

export default {
  init: initSentry,
  captureError,
  captureMessage,
  setUser,
  clearUser,
  setContext,
  addBreadcrumb,
  startTransaction,
};
