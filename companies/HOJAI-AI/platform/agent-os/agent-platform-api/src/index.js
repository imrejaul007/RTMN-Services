/**
 * agent-platform-api (port 4802) — Phase 32.12
 *
 * Main API gateway for the HOJAI AI Agent OS. Single entry point that:
 *   - Exposes its own health + service map
 *   - Aggregates health of all 11 sub-services in parallel
 *   - Provides convenience endpoints (/api/agent/full-deploy, /api/agent/registry/search)
 *   - Proxies all other requests to the corresponding sub-service via native fetch
 *
 * Exposes:
 *   GET  /api/health                              — gateway health + version + sub-service map
 *   GET  /api/agent/services                      — list of sub-services + ports
 *   GET  /api/agent/platform/status               — aggregated health of all 11 sub-services
 *   POST /api/agent/full-deploy                   — multi-step pipeline (agent → caps → tools → skills → context → execution)
 *   GET  /api/agent/registry/search               — capability-based discovery (proxies to agent-registry)
 *   ANY  /api/agent/:service/*                    — HTTP proxy to a sub-service
 *   ANY  /api/agent/:service                      — HTTP proxy (no trailing path)
 *
 * Sub-services (all in platform/agent-os/):
 *   agent-registry          4803
 *   capability-store        4804
 *   tool-registry           4805
 *   skill-library           4806
 *   message-bus             4807
 *   scheduler               4808
 *   context-store           4809
 *   agent-memory-bridge     4811
 *   agent-orchestrator      4812
 *   agent-execution-engine  4813
 *   agent-observability     4814
 *
 * (Port 4810 = merchant-agents, outside this gateway; ports 4815-4817 reserved for future use.)
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const PORT = parseInt(process.env.PORT || '4802', 10);
const SERVICE_NAME = 'agent-platform-api';
const VERSION = '1.0.0';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'agent-platform-internal-token';
const PROXY_TIMEOUT_MS = parseInt(process.env.PROXY_TIMEOUT_MS || '8000', 10);
const HEALTH_TIMEOUT_MS = parseInt(process.env.HEALTH_TIMEOUT_MS || '2000', 10);

const SERVICES = {
  registry:     { port: 4803, name: 'agent-registry',         desc: 'Central agent identity, versioning, heartbeat' },
  capabilities: { port: 4804, name: 'capability-store',       desc: 'Capability registry, requirements, taxonomy' },
  tools:        { port: 4805, name: 'tool-registry',          desc: 'Tool registry: schemas, IO, auth, rate limits' },
  skills:       { port: 4806, name: 'skill-library',          desc: 'Reusable skill library (composed of capabilities + tools)' },
  messagebus:   { port: 4807, name: 'message-bus',            desc: 'Pub/sub + direct messaging between agents' },
  scheduler:    { port: 4808, name: 'scheduler',              desc: 'Cron + one-shot + recurring schedule management' },
  context:      { port: 4809, name: 'context-store',          desc: 'Conversation/session context store' },
  memory:       { port: 4811, name: 'agent-memory-bridge',    desc: 'Bridge between agent contexts and MemoryOS' },
  orchestrator: { port: 4812, name: 'agent-orchestrator',     desc: 'Multi-step DAG workflow orchestration' },
  execution:    { port: 4813, name: 'agent-execution-engine', desc: 'Run-time execution of agents (sync + async)' },
  observability:{ port: 4814, name: 'agent-observability',    desc: 'Metrics, traces, logs, alerts for the Agent OS' },
};

const SUB_SERVICE_COUNT = Object.keys(SERVICES).length;

// Helper kept as a closure so it can be parameterised per call (important for
// tests that pass a custom services map).
const baseUrlFor = (services) => (key) => `http://localhost:${services[key].port}`;

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Convert the SERVICES map to an array of service descriptors with keys.
 * Handles null/undefined input by returning an empty array.
 */
function buildServiceMap(services) {
  if (!services || typeof services !== 'object') return [];
  return Object.entries(services).map(([key, s]) => ({
    key,
    name: s.name,
    port: s.port,
    desc: s.desc,
  }));
}

/**
 * List service descriptors (thin wrapper around buildServiceMap for symmetry).
 */
function listServices(services) {
  return buildServiceMap(services);
}

/**
 * Build the array of deploy steps for `/api/agent/full-deploy`.
 *
 * Returns:
 *   [
 *     { step: 'create-agent',  service: 'registry', method: 'POST', endpoint: '/api/agents',            body: { name, type } },
 *     { step: 'attach-caps',   service: 'registry', method: 'PATCH', endpoint: '/api/agents/{id}',     body: { capabilities: [...] } },
 *     { step: 'attach-tools',  service: 'registry', method: 'PATCH', endpoint: '/api/agents/{id}',     body: { tools: [...] } },
 *     { step: 'attach-skills', service: 'registry', method: 'PATCH', endpoint: '/api/agents/{id}',     body: { skills: [...] } },
 *     { step: 'create-context',service: 'context',  method: 'POST',  endpoint: '/api/contexts',         body: { agentId, scope } },
 *     { step: 'start-execution',service: 'execution',method: 'POST', endpoint: '/api/executions',       body: { agentId, goal } }  // only if goal provided
 *   ]
 *
 * Handles null/undefined opts gracefully.
 */
function buildFullDeploySteps(opts = {}) {
  const o = opts || {};
  const steps = [];

  if (!o.name || !o.type) {
    // Without a name and type we can't create an agent; return empty list so the
    // caller can react appropriately (matches eval-platform's "no_steps" pattern).
    return steps;
  }

  // Step 1: create the agent
  const agentBody = { name: o.name, type: o.type };
  if (o.owner) agentBody.owner = o.owner;
  if (o.metadata) agentBody.metadata = o.metadata;
  steps.push({
    step: 'create-agent',
    service: 'registry',
    method: 'POST',
    endpoint: '/api/agents',
    body: agentBody,
  });

  // Step 2-4: attach caps / tools / skills (each is its own PATCH so the
  // version snapshot only captures that delta).
  if (Array.isArray(o.capabilities) && o.capabilities.length > 0) {
    steps.push({
      step: 'attach-caps',
      service: 'registry',
      method: 'PATCH',
      endpoint: '/api/agents/{id}',
      body: { capabilities: o.capabilities },
    });
  }
  if (Array.isArray(o.tools) && o.tools.length > 0) {
    steps.push({
      step: 'attach-tools',
      service: 'registry',
      method: 'PATCH',
      endpoint: '/api/agents/{id}',
      body: { tools: o.tools },
    });
  }
  if (Array.isArray(o.skills) && o.skills.length > 0) {
    steps.push({
      step: 'attach-skills',
      service: 'registry',
      method: 'PATCH',
      endpoint: '/api/agents/{id}',
      body: { skills: o.skills },
    });
  }

  // Step 5: create a context for the agent
  const contextBody = { agentId: '{id}', scope: o.scope || 'default' };
  if (o.contextMetadata) contextBody.metadata = o.contextMetadata;
  steps.push({
    step: 'create-context',
    service: 'context',
    method: 'POST',
    endpoint: '/api/contexts',
    body: contextBody,
  });

  // Step 6 (optional): start an execution if a goal is provided
  if (o.goal) {
    steps.push({
      step: 'start-execution',
      service: 'execution',
      method: 'POST',
      endpoint: '/api/executions',
      body: { agentId: '{id}', goal: o.goal, inputs: o.inputs || {} },
    });
  }

  return steps;
}

/**
 * Parse an incoming request path into the service key + the remaining path.
 * Returns null if the input isn't a recognized sub-service key.
 *
 * Used by tests to validate the proxy routing logic.
 */
function parseServicePath(path, services) {
  if (!path || typeof path !== 'string') return null;
  const servicesToCheck = services || SERVICES;
  const match = path.match(/^\/?([\w-]+)(?:\/(.*))?$/);
  if (!match) return null;
  const [, key, rest] = match;
  if (!Object.prototype.hasOwnProperty.call(servicesToCheck, key)) return null;
  return {
    key,
    restPath: rest ? `/${rest}` : '/',
  };
}

/**
 * Native fetch with a timeout via AbortController.
 */
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

/**
 * Proxy a request to a sub-service.
 *
 * Returns a normalized result envelope:
 *   { ok, status, data?, error?, detail?, serviceKey, url }
 *
 * If the sub-service key is unknown the result has status: 404.
 * If the fetch fails (network error / timeout) the result has status: 502.
 */
async function proxyTo(serviceKey, reqPath, method, body, headers = {}, services = SERVICES) {
  const svc = services[serviceKey];
  if (!svc) {
    return { ok: false, status: 404, error: 'unknown_service', serviceKey };
  }
  const url = `${baseUrlFor(services)(serviceKey)}${reqPath}`;
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
    return { ok: res.ok, status: res.status, data: parsed, serviceKey, url };
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: 'proxy_failed',
      detail: String(e.message || e),
      serviceKey,
      url,
    };
  }
}

/**
 * Aggregate health across all sub-services in parallel.
 *
 * Each sub-service is fetched at `/api/health` with a tight 2s timeout.
 * Returns { total, healthy, services } where services contains per-service entries
 * with key/port/healthy/latencyMs/error? so the operator can see at a glance
 * which sub-service is down.
 */
async function aggregateHealth(services = SERVICES, timeoutMs = HEALTH_TIMEOUT_MS) {
  const start = Date.now();
  const urlOf = baseUrlFor(services);
  const results = await Promise.all(
    Object.entries(services).map(async ([key, s]) => {
      const t0 = Date.now();
      try {
        const res = await fetchWithTimeout(`${urlOf(key)}/api/health`, {}, timeoutMs);
        const data = await res.json().catch(() => ({}));
        return {
          key,
          port: s.port,
          name: s.name,
          healthy: res.ok,
          latencyMs: Date.now() - t0,
          status: res.status,
          data,
        };
      } catch (e) {
        return {
          key,
          port: s.port,
          name: s.name,
          healthy: false,
          latencyMs: Date.now() - t0,
          status: 0,
          error: String(e.message || e),
        };
      }
    })
  );
  const healthy = results.filter((r) => r.healthy).length;
  return {
    ok: true,
    total: results.length,
    healthy,
    services: results,
    aggregatedAt: new Date(start).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// HTTP app
// ---------------------------------------------------------------------------

function app(deps = {}) {
  const _proxyTo = deps.proxyTo || proxyTo;
  const _aggregateHealth = deps.aggregateHealth || aggregateHealth;
  const _buildFullDeploySteps = deps.buildFullDeploySteps || buildFullDeploySteps;
  const _services = deps.services || SERVICES;
  const _port = deps.port || PORT;

  const a = express();
  a.use(helmet());
  a.use(cors());
  a.use(express.json({ limit: '2mb' }));
  if (process.env.NODE_ENV !== 'test') a.use(morgan('tiny'));

  // ---------- Specific routes (MUST come before /api/agent/:service/*) ----------

  // Gateway health
  a.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: SERVICE_NAME,
      port: _port,
      version: VERSION,
      subServices: Object.keys(_services).length,
      timestamp: new Date().toISOString(),
    });
  });

  // List sub-services
  a.get('/api/agent/services', (_req, res) => {
    const list = buildServiceMap(_services);
    res.json({
      count: list.length,
      services: list,
    });
  });

  // Aggregated health
  a.get('/api/agent/platform/status', async (_req, res) => {
    const health = await _aggregateHealth(_services);
    res.json({
      gateway: {
        ok: true,
        service: SERVICE_NAME,
        port: _port,
        version: VERSION,
      },
      ...health,
    });
  });

  // Convenience: full-deploy pipeline descriptor
  a.post('/api/agent/full-deploy', (req, res) => {
    const opts = req.body || {};
    const steps = _buildFullDeploySteps(opts);
    if (steps.length === 0) {
      return res.status(400).json({
        error: 'no_steps',
        message: 'Provide at least name + type to create an agent. Optionally capabilities[], tools[], skills[], goal, scope, owner, metadata.',
      });
    }
    res.json({
      ok: true,
      stepCount: steps.length,
      steps,
      note: 'Call each step endpoint individually to execute. This endpoint returns the pipeline plan. After step 1 (create-agent) succeeds, substitute {id} with the returned agent id in steps 2-6.',
    });
  });

  // Capability-based discovery (proxies to agent-registry's /api/agents/search)
  a.get('/api/agent/registry/search', async (req, res) => {
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const result = await _proxyTo('registry', `/api/agents/search${queryString}`, 'GET', null, {}, _services);
    res.status(result.status).json(result.ok ? result.data : {
      error: result.error,
      detail: result.detail,
      upstream: result.data,
    });
  });

  // ---------- Generic proxy to any sub-service ----------

  // /api/agent/:service/*
  a.all('/api/agent/:service/*', async (req, res) => {
    const { service } = req.params;
    const restPath = '/' + (req.params[0] || '');
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const fullPath = restPath + query;
    const result = await _proxyTo(service, fullPath, req.method, req.body, {}, _services);
    res.status(result.status).json(result.ok ? result.data : {
      error: result.error,
      detail: result.detail,
      upstream: result.data,
      serviceKey: result.serviceKey,
    });
  });

  // /api/agent/:service (no trailing path)
  a.all('/api/agent/:service', async (req, res) => {
    const { service } = req.params;
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const fullPath = '/' + query;
    const result = await _proxyTo(service, fullPath, req.method, req.body, {}, _services);
    res.status(result.status).json(result.ok ? result.data : {
      error: result.error,
      detail: result.detail,
      upstream: result.data,
      serviceKey: result.serviceKey,
    });
  });

  // 404
  a.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

  return a;
}

function start() {
  const a = app();
  a.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
    console.log(`[${SERVICE_NAME}] sub-services: ${Object.keys(SERVICES).join(', ')}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = {
  app,
  start,
  PORT,
  SERVICE_NAME,
  VERSION,
  SERVICES,
  // Pure helpers
  buildServiceMap,
  buildFullDeploySteps,
  parseServicePath,
  proxyTo,
  fetchWithTimeout,
  aggregateHealth,
  listServices,
};