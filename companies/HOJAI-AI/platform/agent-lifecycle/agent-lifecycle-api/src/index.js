/**
 * agent-lifecycle-api — Unified Gateway for Agent Lifecycle Services
 * Port: 4910
 *
 * Single entry point that proxies requests to the 6 lifecycle services:
 *   /versioning/*   → agent-versioning      (4911)
 *   /testing/*     → agent-testing         (4912)
 *   /deployment/*  → agent-deployment      (4913)
 *   /monitoring/*  → agent-monitoring      (4914)
 *   /rollback/*    → agent-rollback        (4915)
 *   /deprecation/* → agent-deprecation     (4916)
 *
 * Also exposes:
 *   GET  /                       — service catalog
 *   GET  /health                 — gateway health (also probes subservices)
 *   POST /agents/:agentId/release — orchestrated release pipeline:
 *     1. versioning: register version
 *     2. testing:    run suite
 *     3. deployment: create canary deployment
 *     4. (monitoring + rollback available via /monitoring/* and /rollback/*)
 */

const express = require('express');

const PORT = parseInt(process.env.PORT || '4910', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'lifecycle-internal-token';

const SUB_SERVICES = {
  versioning: { url: process.env.VERSIONING_URL || 'http://localhost:4911', name: 'agent-versioning', port: 4911 },
  testing: { url: process.env.TESTING_URL || 'http://localhost:4912', name: 'agent-testing', port: 4912 },
  deployment: { url: process.env.DEPLOYMENT_URL || 'http://localhost:4913', name: 'agent-deployment', port: 4913 },
  monitoring: { url: process.env.MONITORING_URL || 'http://localhost:4914', name: 'agent-monitoring', port: 4914 },
  rollback: { url: process.env.ROLLBACK_URL || 'http://localhost:4915', name: 'agent-rollback', port: 4915 },
  deprecation: { url: process.env.DEPRECATION_URL || 'http://localhost:4916', name: 'agent-deprecation', port: 4916 },
};

const ROUTE_MAP = [
  { prefix: '/versioning', service: 'versioning' },
  { prefix: '/testing', service: 'testing' },
  { prefix: '/deployment', service: 'deployment' },
  { prefix: '/monitoring', service: 'monitoring' },
  { prefix: '/rollback', service: 'rollback' },
  { prefix: '/deprecation', service: 'deprecation' },
];

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

/** Forward a request to the subservice. */
async function proxyTo(req, res, serviceKey, subPath) {
  const svc = SUB_SERVICES[serviceKey];
  if (!svc) return res.status(404).json({ error: 'unknown_service' });
  // Strip the gateway prefix from the path so the upstream gets the natural sub-path
  // E.g. for service 'versioning' and req.path '/versioning/agents/x/versions',
  // we want to forward to /agents/x/versions.
  const prefixes = ROUTE_MAP.filter((r) => r.service === serviceKey).map((r) => r.prefix);
  let urlPath = subPath;
  for (const p of prefixes) {
    if (urlPath === p) { urlPath = '/'; break; }
    if (urlPath.startsWith(p + '/')) { urlPath = urlPath.slice(p.length); break; }
  }
  if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
  const url = `${svc.url}${urlPath}`;
  // Reconstruct query string
  const qs = new URLSearchParams(req.query).toString();
  const fullUrl = qs ? `${url}?${qs}` : url;
  try {
    const fetchOpts = {
      method: req.method,
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN },
      signal: AbortSignal.timeout(5000),
    };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length) {
      fetchOpts.body = JSON.stringify(req.body);
    }
    const upstream = await fetch(fullUrl, fetchOpts);
    const text = await upstream.text();
    res.status(upstream.status);
    // Forward content-type if set
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream_unreachable', service: serviceKey, message: e.message });
  }
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', async (_req, res) => {
    const checks = {};
    let allHealthy = true;
    for (const [key, svc] of Object.entries(SUB_SERVICES)) {
      try {
        const r = await fetch(`${svc.url}/health`, { signal: AbortSignal.timeout(2000) });
        checks[key] = r.ok ? 'up' : `down (${r.status})`;
        if (!r.ok) allHealthy = false;
      } catch (e) {
        checks[key] = `down (${e.message})`;
        allHealthy = false;
      }
    }
    res.status(allHealthy ? 200 : 503).json({ ok: allHealthy, service: 'agent-lifecycle-api', port: PORT, subservices: checks });
  });
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Service catalog
  app.get('/', (_req, res) => {
    res.json({
      service: 'agent-lifecycle-api',
      version: '1.0.0',
      port: PORT,
      subservices: Object.fromEntries(Object.entries(SUB_SERVICES).map(([k, v]) => [k, { name: v.name, port: v.port }])),
      routes: ROUTE_MAP.map((r) => ({ prefix: r.prefix, subservice: SUB_SERVICES[r.service].name })),
    });
  });

  // Generic proxy via app.use middleware (matches prefix and any sub-path)
  for (const { prefix, service } of ROUTE_MAP) {
    const mountPath = `${prefix}`;
    app.use(mountPath, requireInternal, (req, res) => proxyTo(req, res, service, req.originalUrl));
  }

  // Orchestrated release: versioning → testing → deployment
  app.post('/agents/:agentId/release', requireInternal, async (req, res) => {
    const { agentId } = req.params;
    const { version, config, code, metadata, suite, strategy, canary_stages } = req.body || {};
    if (!version) return res.status(400).json({ error: 'validation', message: 'version is required' });
    const steps = [];

    // Step 1: register version
    try {
      const r = await fetch(`${SUB_SERVICES.versioning.url}/agents/${agentId}/versions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN },
        body: JSON.stringify({ version, config, code, metadata }),
        signal: AbortSignal.timeout(5000),
      });
      const j = await r.json();
      steps.push({ step: 'versioning', status: r.status, ok: r.ok, body: j });
      if (!r.ok) return res.status(502).json({ error: 'versioning_failed', steps });
    } catch (e) {
      return res.status(502).json({ error: 'versioning_unreachable', message: e.message });
    }

    // Step 2: register + run suite (if provided)
    let testingOk = true;
    if (suite && Array.isArray(suite.tests)) {
      try {
        const reg = await fetch(`${SUB_SERVICES.testing.url}/suites`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN },
          body: JSON.stringify({ agentId, version, suite }),
          signal: AbortSignal.timeout(5000),
        });
        const run = await fetch(`${SUB_SERVICES.testing.url}/suites/${agentId}@${version}/run`, {
          method: 'POST', headers: { 'X-Internal-Token': INTERNAL_TOKEN }, signal: AbortSignal.timeout(10000),
        });
        const runJ = await run.json();
        steps.push({ step: 'testing', status: run.status, ok: run.ok, body: runJ });
        if (!run.ok || runJ.status !== 'pass') testingOk = false;
      } catch (e) {
        steps.push({ step: 'testing', error: e.message });
        testingOk = false;
      }
    } else {
      steps.push({ step: 'testing', skipped: true });
    }

    // Step 3: deployment
    try {
      const r = await fetch(`${SUB_SERVICES.deployment.url}/deployments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN },
        body: JSON.stringify({ agentId, version, strategy, canary_stages }),
        signal: AbortSignal.timeout(5000),
      });
      const j = await r.json();
      steps.push({ step: 'deployment', status: r.status, ok: r.ok, body: j });
      if (!r.ok) return res.status(502).json({ error: 'deployment_failed', steps, testing_ok: testingOk });
    } catch (e) {
      return res.status(502).json({ error: 'deployment_unreachable', message: e.message });
    }

    res.status(201).json({ agent_id: agentId, version, testing_ok: testingOk, steps });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[agent-lifecycle-api] gateway on :${PORT} proxying 6 subservices`));
}

module.exports = { createApp, SUB_SERVICES, ROUTE_MAP };