/**
 * SUTAR OS — Gateway (port 4140)
 *
 * The HTTP entry point for SUTAR OS. All SUTAR consumers (RTMN Hub, REZ,
 * external apps) should hit this service for /api/sutar/* requests.
 *
 * Responsibilities:
 *   1. Service registry — knows every SUTAR service, its port, status
 *   2. Request routing — forwards /api/sutar/<service>/<path> to the right port
 *   3. Aggregation — /api/sutar/status hits every SUTAR service in parallel
 *   4. Capability discovery — /api/sutar/capabilities returns the union of
 *      every SUTAR service's declared capabilities (cached for 30s)
 *
 * Layer: 2 (SUTAR Gateway)
 * Spec: docs/sutar-os/ARCHITECTURE.md
 */

const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const axios = require('axios');
const rezIntel = require('./rez-intel-client');

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4140;
const SERVICE_NAME = 'sutar-gateway';
setupSecurity(app, { serviceName: 'sutar-gateway' });
// =============================================================================
// SUTAR SERVICE REGISTRY
// =============================================================================
// Every SUTAR service from the spec, with its port and layer. If a service
// is offline, the gateway reports it in /api/sutar/status but still forwards
// requests (caller will get a 502 with service=offline).

const SERVICES = {
  // Layer 1 — observability
  monitoring:                   { name: 'SUTAR Monitoring',                  port: 3100, layer: 1, status: 'live' },

  // Layer 2 — gateway + twin + memory + identity + agent-id
  gateway:                      { name: 'SUTAR Gateway (self)',             port: 4140, layer: 2, status: 'live' },
  twinOS:                       { name: 'SUTAR Twin OS',                     port: 4142, layer: 2, status: 'live' },
  memoryBridge:                 { name: 'SUTAR Memory Bridge',               port: 4143, layer: 2, status: 'live' },
  identityOS:                   { name: 'SUTAR Identity OS',                 port: 4144, layer: 2, status: 'live' },
  agentID:                      { name: 'SUTAR Agent ID',                    port: 4145, layer: 2, status: 'live' },

  // Layer 3 — intent + network (REZ bridge is bundled into agent-network)
  intentBus:                    { name: 'SUTAR Intent Bus',                  port: 4154, layer: 3, status: 'live' },
  agentNetwork:                 { name: 'SUTAR Agent Network (+ REZ Bridge)', port: 4155, layer: 3, status: 'live' },

  // Layer 4 — decision + simulation + learning + flow + founder
  decisionEngine:               { name: 'SUTAR Decision Engine',             port: 4290, layer: 4, status: 'live' },
  simulationOS:                 { name: 'SUTAR Simulation OS',               port: 4241, layer: 4, status: 'live' },
  goalOS:                       { name: 'SUTAR Goal OS',                     port: 4242, layer: 4, status: 'live' },
  networkLearning:              { name: 'SUTAR Network Learning',            port: 4243, layer: 4, status: 'live' },
  flowOS:                       { name: 'SUTAR Flow OS',                     port: 4244, layer: 4, status: 'live' },
  founderOS:                    { name: 'SUTAR Founder OS',                  port: 4260, layer: 4, status: 'live' },

  // Layer 5 — marketplace + economy + usage + policy
  marketplace:                  { name: 'BLR AI Marketplace',              port: 4255, layer: 5, status: 'live' },
  economyOS:                    { name: 'SUTAR Economy OS',                  port: 4294, layer: 5, status: 'live' },
  usageTracker:                 { name: 'SUTAR Usage Tracker',               port: 4252, layer: 5, status: 'live' },
  policyOS:                     { name: 'SUTAR Policy OS',                   port: 4254, layer: 5, status: 'live' },

  // Layer 6 — trust + contracts + negotiation + teaming
  trustEngine:                  { name: 'SUTAR Trust Engine',                port: 4291, layer: 6, status: 'live' },
  contractsOS:                  { name: 'SUTAR Contracts OS',                port: 4292, layer: 6, status: 'live' },
  negotiationEngine:            { name: 'SUTAR Negotiation Engine',          port: 4293, layer: 6, status: 'live' },

  // Agent layer (orthogonal to the 7 layers) — team formation & leader election
  agentTeaming:                 { name: 'SUTAR Agent Teaming',               port: 4853, layer: 'agent', status: 'live' },

  // Layer 7 — exploration + discovery + evaluator + reputation + roi
  exploration:                  { name: 'SUTAR Exploration',                 port: 4255, layer: 7, status: 'live' },
  discovery:                    { name: 'SUTAR Discovery Engine',            port: 4256, layer: 7, status: 'live' },
  multiAgentEvaluator:          { name: 'SUTAR Multi-Agent Evaluator',       port: 4257, layer: 7, status: 'live' },
  reputationAggregator:         { name: 'SUTAR Reputation Aggregator',       port: 4258, layer: 7, status: 'live' },
  roiCalculator:                { name: 'SUTAR ROI Calculator',              port: 4259, layer: 7, status: 'live' },
};

const CLIENTS = {};
for (const [key, svc] of Object.entries(SERVICES)) {
  if (svc.status === 'live' && key !== 'gateway') {
    CLIENTS[key] = axios.create({
      baseURL: `http://localhost:${svc.port}`,
      timeout: 2000,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

async function checkHealth(key, svc) {
  if (key === 'gateway') return { status: 'ok', port: svc.port };
  const client = CLIENTS[key];
  if (!client) return { status: 'unknown', port: svc.port };
  try {
    const r = await client.get('/health', { timeout: 1500 });
    return { status: r.data?.status || 'ok', port: svc.port, version: r.data?.version };
  } catch (err) {
    return { status: 'offline', port: svc.port, error: err.message };
  }
}

app.get('/health', async (_req, res) => {
  const entries = await Promise.all(
    Object.entries(SERVICES).map(async ([key, svc]) => [key, await checkHealth(key, svc)])
  );
  const summary = Object.fromEntries(entries);
  const liveCount = entries.filter(([, v]) => v.status === 'ok' || v.status === 'live' || v.status === 'healthy').length;
  const total = entries.length;
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    sutarLayer: 2,
    port: PORT,
    counts: { services: total, live: liveCount, offline: total - liveCount },
    services: summary,
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// SERVICE REGISTRY (read-only views)
// =============================================================================

app.get('/api/sutar/services', requireAuth, (_req, res) => {
  res.json({
    count: Object.keys(SERVICES).length,
    services: SERVICES,
  });
});

app.get('/api/sutar/services/:key', requireAuth, (req, res) => {
  const svc = SERVICES[req.params.key];
  if (!svc) return res.status(404).json({ error: 'unknown service' });
  res.json(svc);
});

app.get('/api/sutar/layers', requireAuth, (_req, res) => {
  const layers = {};
  for (const [key, svc] of Object.entries(SERVICES)) {
    if (!layers[svc.layer]) layers[svc.layer] = [];
    layers[svc.layer].push({ key, name: svc.name, port: svc.port });
  }
  res.json({ count: Object.keys(layers).length, layers });
});

// Capability discovery: maps common task names to the SUTAR service(s) that
// can handle them. Used by Genie and other RTMN consumers to route work.
const CAPABILITY_MAP = {
  'team-formation':         ['agentTeaming'],
  'leader-election':        ['agentTeaming'],
  'task-dag':               ['agentTeaming'],
  'multi-agent-workflow':   ['agentTeaming', 'agentOrchestration'],
  'wallet':                 ['agentWallets'],
  'payment':                ['agentWallets', 'agentContracts'],
  'reputation':             ['agentReputation', 'trustNetwork'],
  'dispute':                ['disputeResolution'],
  'negotiation':            ['acpProtocol', 'negotiationEngine'],
  'merchant-discovery':     ['acnNetwork', 'agentMarketplace'],
  'agent-registry':         ['acnNetwork'],
  'analytics':              ['agentAnalytics'],
  'contract':               ['contractsOS'],
  'identity':               ['agentId', 'identityOS'],
  'memory':                 ['memoryBridge'],
};

app.get('/api/sutar/capabilities', requireAuth, (_req, res) => {
  res.json({
    count: Object.keys(CAPABILITY_MAP).length,
    capabilities: CAPABILITY_MAP,
    services: Object.fromEntries(
      Object.entries(SERVICES).map(([k, v]) => [k, v.name])
    ),
  });
});

// =============================================================================
// AGGREGATED STATUS (hit every service in parallel)
// =============================================================================

app.get('/api/sutar/status', requireAuth, async (_req, res) => {
  const entries = await Promise.all(
    Object.entries(SERVICES).map(async ([key, svc]) => {
      const r = await checkHealth(key, svc);
      return { key, ...svc, ...r };
    })
  );
  const live = entries.filter((e) => e.status === 'ok' || e.status === 'live').length;
  res.json({
    timestamp: new Date().toISOString(),
    total: entries.length,
    live,
    offline: entries.length - live,
    services: entries,
  });
});

// =============================================================================
// REQUEST ROUTING
// =============================================================================
// /api/sutar/<service-key>/<path>  →  http://localhost:<port>/<path>

app.all('/api/sutar/:service/:path(*)', async (req, res) => {
  const svc = SERVICES[req.params.service];
  if (!svc) return res.status(404).json({ error: `unknown sutar service: ${req.params.service}` });
  if (req.params.service === 'gateway') return res.status(400).json({ error: 'cannot route to self' });

  const client = CLIENTS[req.params.service];
  if (!client) return res.status(503).json({ error: `service ${req.params.service} not configured` });

  const path = req.params.path;
  try {
    let response;
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'DELETE') {
      response = await client[method.toLowerCase()](path, { params: req.query });
    } else {
      // POST, PUT, PATCH all carry a body
      response = await client[method.toLowerCase()](path, req.body, { params: req.query });
    }
    res.json({ success: true, service: req.params.service, ...response.data });
  } catch (err) {
    res.status(err.response?.status || 502).json({
      success: false,
      service: req.params.service,
      error: err.message,
      targetPort: svc.port,
    });
  }
});

// =============================================================================
// STARTUP
// =============================================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', requireInternal, async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body || {};
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

// Additional REZ Intelligence endpoints (shallow pattern)
app.post('/api/intel/classify-intent', requireAuth, async (req, res) => {
  try {
    const intent = await rezIntel.classifyIntent({ ...req.body }).catch(() => null);
    res.json({ success: !!intent, intent, source: intent ? 'rez-intel' : 'unavailable', fallback: !intent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/intel/next-best-action', requireAuth, async (req, res) => {
  try {
    const action = await rezIntel.getNextBestAction({ ...req.query }).catch(() => null);
    res.json({ success: !!action, action, source: action ? 'rez-intel' : 'unavailable', fallback: !action });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on :${PORT}`);
  console.log(`  ${Object.keys(SERVICES).length} SUTAR services registered`);
  console.log(`  Health:   http://localhost:${PORT}/health`);
  console.log(`  Status:   http://localhost:${PORT}/api/sutar/status`);
  console.log(`  Services: http://localhost:${PORT}/api/sutar/services`);
});
installGracefulShutdown(server);
