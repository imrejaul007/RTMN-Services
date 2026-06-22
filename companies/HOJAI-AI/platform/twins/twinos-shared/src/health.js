/**
 * RTMN TwinOS - Health module (Phase 5)
 *
 * Adds `/ready` and a richer `/health` to a twin service. The two are
 * intentionally distinct:
 *
 *   - /health   liveness — "is the process up and serving HTTP?"
 *   - /ready    readiness — "is the service ready to take traffic?"
 *
 * Usage:
 *
 *   installHealthRoutes(app, {
 *     serviceName: 'voice-twin',
 *     version: '2.0.0',
 *     checks: [
 *       { name: 'storage', check: async () => voices.size > 0 || true },
 *       { name: 'event-bus', check: async () => (await fetch('http://localhost:4510/health')).ok }
 *     ],
 *     stats: () => ({ voices: voices.size, profiles: profiles.size })
 *   });
 */

import { logger } from './index.js';

export async function runChecks(checks = []) {
  const results = [];
  for (const c of checks) {
    const t0 = Date.now();
    let ok = false;
    let err = null;
    try {
      ok = !!(await c.check());
    } catch (e) {
      ok = false;
      err = (e && e.message) || String(e);
    }
    results.push({
      name: c.name,
      ok,
      durationMs: Date.now() - t0,
      ...(err ? { error: err } : {})
    });
  }
  return results;
}

export function installHealthRoutes(app, opts = {}) {
  const {
    serviceName = 'twin-service',
    version = '2.0.0',
    checks = [],
    stats = null,
    path = '/'
  } = opts;

  let cached = null;
  const TTL_MS = (opts.readinessCacheMs != null) ? opts.readinessCacheMs : 5000;

  async function _readiness() {
    if (cached && (Date.now() - cached.at) < TTL_MS) return cached;
    const results = await runChecks(checks);
    const ok = results.every(r => r.ok);
    cached = { at: Date.now(), ok, results };
    return cached;
  }

  app.get(`${path}health`, (req, res) => {
    const body = {
      status: 'healthy',
      service: serviceName,
      version,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memory: process.memoryUsage()
    };
    if (typeof stats === 'function') {
      try { body.stats = stats(); } catch (e) { body.statsError = e.message; }
    }
    res.json(body);
  });

  app.get(`${path}ready`, async (req, res) => {
    try {
      const r = await _readiness();
      const body = {
        status: r.ok ? 'ready' : 'not_ready',
        service: serviceName,
        version,
        timestamp: new Date().toISOString(),
        checks: r.results
      };
      res.status(r.ok ? 200 : 503).json(body);
    } catch (e) {
      logger.error('readiness_check_failed', { error: e.message });
      res.status(503).json({ status: 'not_ready', service: serviceName, error: e.message });
    }
  });
}

export default installHealthRoutes;
