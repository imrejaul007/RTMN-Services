/**
 * eval-platform-api — Main API gateway for the HOJAI evaluation platform.
 *
 * Port: 4780
 *
 * Exposes:
 *   GET  /api/health                          — health + version + sub-service map
 *   GET  /api/eval/platform/status            — aggregated health of all 7 sub-services
 *   POST /api/eval/full-run                   — convenience: dataset → judge → live → shadow → canary
 *   GET  /api/eval/services                   — list of sub-services + their ports
 *   ANY  /api/eval/:service/*                 — proxy to a sub-service
 *
 * Sub-services (all in eval-platform/):
 *   eval-datasets  4781
 *   eval-judges    4782
 *   eval-live      4783
 *   eval-shadow    4784
 *   eval-canary    4787
 *   eval-review    4788
 *   eval-benchmarks 4789
 *
 * (Ports 4785 and 4786 are reserved for connector-hub + reasoning-engine in the
 * training/eval neighborhood.)
 */

'use strict';

const express = require('express');

const PORT = parseInt(process.env.PORT || '4780', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'eval-platform-internal-token';
const PROXY_TIMEOUT_MS = parseInt(process.env.PROXY_TIMEOUT_MS || '8000', 10);

const SERVICES = {
  datasets:   { port: 4781, name: 'eval-datasets',   desc: 'Golden dataset CRUD, versioning, imports, splits' },
  judges:     { port: 4782, name: 'eval-judges',     desc: 'LLM-as-judge rubrics, scoring, calibration' },
  live:       { port: 4783, name: 'eval-live',       desc: 'Live production sampling + dashboards + alerts' },
  shadow:     { port: 4784, name: 'eval-shadow',     desc: 'A/B shadow runs + paired t-test + ship decision' },
  canary:     { port: 4787, name: 'eval-canary',     desc: 'Canary deployment + auto-rollback' },
  review:     { port: 4788, name: 'eval-review',     desc: 'Human review queue + inter-rater reliability' },
  benchmarks: { port: 4789, name: 'eval-benchmarks', desc: 'Standard + custom benchmarks + leaderboard' },
};

const BASE_URL = (name) => `http://localhost:${SERVICES[name].port}`;

// ---------- Pure helpers (exported for tests) ----------

function buildServiceMap(services) {
  return Object.entries(services).map(([key, s]) => ({ key, ...s }));
}

function buildFullRunSteps(opts = {}) {
  const steps = [];
  if (opts.datasetId) {
    steps.push({ step: 'split', service: 'datasets', endpoint: `/api/datasets/${opts.datasetId}/split` });
  }
  if (opts.judge && opts.text) {
    steps.push({ step: 'judge', service: 'judges', endpoint: '/api/score' });
  }
  if (opts.modelA && opts.modelB) {
    steps.push({ step: 'shadow', service: 'shadow', endpoint: '/api/shadow/start' });
    steps.push({ step: 'compare', service: 'shadow', endpoint: '/api/shadow/{id}/compare' });
  }
  if (opts.canaryBaseline && opts.canaryCandidate) {
    steps.push({ step: 'canary', service: 'canary', endpoint: '/api/canary/start' });
  }
  if (opts.publishBenchmarkId && opts.publishModelId) {
    steps.push({ step: 'benchmark', service: 'benchmarks', endpoint: `/api/benchmarks/${opts.publishBenchmarkId}/run` });
  }
  return steps;
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = PROXY_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function proxyTo(serviceKey, reqPath, method, body, headers = {}) {
  const svc = SERVICES[serviceKey];
  if (!svc) return { ok: false, status: 404, error: 'unknown_service', serviceKey };
  const url = `${BASE_URL(serviceKey)}${reqPath}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': INTERNAL_TOKEN,
      ...headers,
    },
  };
  if (body !== undefined && body !== null) opts.body = JSON.stringify(body);
  try {
    const res = await fetchWithTimeout(url, opts);
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { ok: res.ok, status: res.status, data: parsed };
  } catch (e) {
    return { ok: false, status: 502, error: 'proxy_failed', detail: String(e.message || e), serviceKey, url };
  }
}

async function aggregateHealth() {
  const results = await Promise.all(
    Object.entries(SERVICES).map(async ([key, s]) => {
      try {
        const res = await fetchWithTimeout(`${BASE_URL(key)}/api/health`, {}, 2000);
        const data = await res.json().catch(() => ({}));
        return { key, port: s.port, ok: res.ok, status: res.status, data };
      } catch (e) {
        return { key, port: s.port, ok: false, status: 0, error: String(e.message || e) };
      }
    })
  );
  const healthy = results.filter(r => r.ok).length;
  return { total: results.length, healthy, results };
}

// ---------- HTTP app ----------

function app(deps = {}) {
  const _proxyTo = deps.proxyTo || proxyTo;
  const _aggregateHealth = deps.aggregateHealth || aggregateHealth;

  const a = express();
  a.use(express.json({ limit: '2mb' }));

  a.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'eval-platform-api',
      port: PORT,
      version: '1.0.0',
      subServices: Object.keys(SERVICES).length,
      timestamp: Date.now(),
    });
  });

  a.get('/api/eval/services', (_req, res) => {
    res.json({
      count: Object.keys(SERVICES).length,
      services: buildServiceMap(SERVICES),
    });
  });

  a.get('/api/eval/platform/status', async (_req, res) => {
    const health = await _aggregateHealth();
    res.json({
      gateway: { ok: true, service: 'eval-platform-api', port: PORT },
      ...health,
    });
  });

  // Convenience: full evaluation pipeline descriptor (what would be called)
  a.post('/api/eval/full-run', (req, res) => {
    const opts = req.body || {};
    const steps = buildFullRunSteps(opts);
    if (steps.length === 0) {
      return res.status(400).json({
        error: 'no_steps',
        message: 'Provide at least one of: datasetId+text+judge, modelA+modelB, canaryBaseline+canaryCandidate, publishBenchmarkId+publishModelId',
      });
    }
    res.json({
      ok: true,
      stepCount: steps.length,
      steps,
      note: 'Call each step endpoint individually to execute. This endpoint returns the pipeline plan.',
    });
  });

  // Generic proxy to any sub-service
  a.all('/api/eval/:service/*', async (req, res) => {
    const { service } = req.params;
    const restPath = '/' + (req.params[0] || '');
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const fullPath = restPath + query;
    const result = await _proxyTo(service, fullPath, req.method, req.body);
    res.status(result.status).json(result.ok ? result.data : { error: result.error, detail: result.detail, upstream: result.data });
  });

  // Also support /api/eval/:service (no trailing path)
  a.all('/api/eval/:service', async (req, res) => {
    const { service } = req.params;
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const fullPath = '/' + query;
    const result = await _proxyTo(service, fullPath, req.method, req.body);
    res.status(result.status).json(result.ok ? result.data : { error: result.error, detail: result.detail, upstream: result.data });
  });

  return a;
}

function start() {
  const a = app();
  a.listen(PORT, () => {
    console.log(`[eval-platform-api] listening on :${PORT}`);
    console.log(`[eval-platform-api] sub-services: ${Object.keys(SERVICES).join(', ')}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = {
  app,
  start,
  SERVICES,
  buildServiceMap,
  buildFullRunSteps,
  proxyTo,
  aggregateHealth,
};