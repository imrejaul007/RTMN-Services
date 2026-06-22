/**
 * RTMN TwinOS - Phase 5 Bundled Installer
 *
 * Convenience entry point that wires lifecycle + merge + SSE + ready/health
 * into a twin service in one call. Returns a `cleanup` callback that
 * callers should pass to `installGracefulShutdown(server, cleanup)` so the
 * SSE hub drains and any pending telemetry flushes cleanly on SIGTERM.
 */

import { lifecycleRouter } from './lifecycle.js';
import { mergeRouter } from './merge.js';
import { sseRouter, SSEHub } from './sse.js';
import { installHealthRoutes } from './health.js';
import { logger } from './index.js';

export function installPhase5(app, opts = {}) {
  const {
    serviceName = 'twin-service',
    version = '2.0.0',
    twinType = 'twin',
    store = null,
    stats = null,
    checks = [],
    sse = null,
    requireAuth = null,
    strictLimiter = null,
    platform = null,
    publish = null
  } = opts;

  // 1. Health (always; non-destructive)
  // Resolve serviceName lazily so we work even when the caller hasn't
  // declared `const SERVICE_NAME = ...` yet at module-eval time.
  const _serviceName = () => serviceName
    || (typeof globalThis.SERVICE_NAME === 'string' ? globalThis.SERVICE_NAME : null)
    || (typeof process !== 'undefined' && process.env.SERVICE_NAME) || 'twin';
  installHealthRoutes(app, { serviceName: _serviceName(), version, stats, checks });
  logger.info('phase5_health_installed', { serviceName: _serviceName(), checks: checks.length });

  // 2. Lifecycle + merge
  if (store) {
    const commonRouterOpts = { store, twinType, platform, publish, requireAuth, strictLimiter };
    app.use('/api/twins', lifecycleRouter(commonRouterOpts));
    app.use('/api/twins', mergeRouter(commonRouterOpts));
    logger.info('phase5_lifecycle_merge_installed', { serviceName: _serviceName(), twinType, mount: '/api/twins' });
  } else {
    logger.warn('phase5_skipped_lifecycle_merge', { serviceName: _serviceName(), reason: 'no store provided' });
  }

  // 3. SSE
  if (sse && sse.enabled) {
    if (!app.locals.sseHub) {
      const hub = new SSEHub({ eventBusUrl: sse.eventBusUrl });
      hub.start();
      app.locals.sseHub = hub;
      app.locals.sseHubServiceName = serviceName;
    }
    app.use('/api/events', sseRouter({ hub: app.locals.sseHub, twinType, requireAuth }));
    logger.info('phase5_sse_installed', { serviceName, twinType, mount: '/api/events' });
  }

  // 4. Build a cleanup callback for graceful shutdown.
  const cleanupFns = [];

  if (store && typeof store.flush === 'function') {
    cleanupFns.push(async () => {
      try { await store.flush(); } catch (_e) { /* best-effort */ }
    });
  }
  if (sse && sse.enabled && app.locals.sseHub) {
    const hub = app.locals.sseHub;
    cleanupFns.push(async () => {
      try { await hub.stop(); } catch (_e) { /* best-effort */ }
    });
  }
  if (publish) {
    cleanupFns.push(async () => {
      try { await publish('service.shutdown', { serviceName, at: new Date().toISOString() }); } catch (_e) { /* swallow */ }
    });
  }

  const phase5Cleanup = async () => {
    logger.info('phase5_shutdown_start', { serviceName });
    for (const fn of cleanupFns) {
      try { await fn(); } catch (e) { logger.warn('phase5_cleanup_error', { error: e.message }); }
    }
    logger.info('phase5_shutdown_done', { serviceName });
  };

  app.locals.phase5Cleanup = phase5Cleanup;

  return phase5Cleanup;
}

export default installPhase5;
