/**
 * SUTAR OS — Agent ID (port 4145)
 *
 * Every SUTAR agent gets a persistent ID + a capability manifest. The
 * manifest is the authoritative description of what the agent can do and
 * what intents it can claim.
 *
 * Layer: 2 (Twin + Memory + Identity + Agent ID)
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');

const { applyTenantContext } = require('../../sutar-shared/tenant');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4145;
const SERVICE_NAME = 'sutar-agent-id';
setupSecurity(app, { serviceName: 'sutar-agent-id' });
// ADR-0009 Phase 1: tenant context middleware. /health, /ready,
// /v1/info (if present) stay public; everything else under /api/ requires
// a tenant. Returns { getTenantId, tkey } for route-level use.
applyTenantContext(app, {
  serviceName: 'sutar-agent-id',
  publicPathPatterns: ["^\\/health$","^\\/health\\/.*$","^\\/ready$","^\\/v1\\/info$"].map(s => new RegExp(s)),
});
const agents = new PersistentMap('agents', { serviceName: 'sutar-agent-id' });
const audit = [];

const CAPABILITY_CATALOG = [
  { name: 'negotiate', intents: ['negotiate_price', 'request_negotiation', 'request_quote'] },
  { name: 'transact', intents: ['book_hotel', 'book_table', 'order_product', 'request_payment'] },
  { name: 'recommend', intents: ['request_recommendation'] },
  { name: 'escalate', intents: ['escalate'] },
  { name: 'broadcast', intents: ['broadcast'] },
];

function seed() {
  const seeds = [
    { agentId: 'agent-restaurant-001', name: 'Restaurant Booking Agent', capabilities: ['transact', 'recommend'] },
    { agentId: 'agent-hotel-001', name: 'Hotel Booking Agent', capabilities: ['transact'] },
    { agentId: 'agent-negotiator-001', name: 'Price Negotiator', capabilities: ['negotiate'] },
    { agentId: 'agent-recommender-001', name: 'Personal Recommender', capabilities: ['recommend'] },
    { agentId: 'agent-escalation-001', name: 'Escalation Handler', capabilities: ['escalate'] },
  ];
  for (const s of seeds) {
    agents.set(s.agentId, {
      ...s,
      manifest: buildManifest(s.capabilities),
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  }
}

function buildManifest(caps) {
  const intents = new Set();
  for (const c of caps) {
    const found = CAPABILITY_CATALOG.find(x => x.name === c);
    if (found) found.intents.forEach(i => intents.add(i));
  }
  return { capabilities: caps, intents: Array.from(intents) };
}

seed();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok', service: SERVICE_NAME, sutarLayer: 2, port: PORT,
    counts: { agents: agents.size, audit: audit.length },
    capabilities: ['agents-list', 'agents-get', 'agents-create', 'agents-add-cap', 'agents-remove-cap', 'manifest-for-intent'],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/agents', (_req, res) => {
  res.json({ count: agents.size, agents: Array.from(agents.values()) });
});

app.get('/api/agents/:agentId', (req, res) => {
  const a = agents.get(req.params.agentId);
  if (!a) return res.status(404).json({ error: 'unknown agent' });
  res.json(a);
});

app.post('/api/agents',requireAuth,  (req, res) => {
  const { name, capabilities = [] } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = `agent-${uuid().slice(0, 12)}`;
  const agent = {
    agentId: id,
    name,
    capabilities,
    manifest: buildManifest(capabilities),
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  agents.set(id, agent);
  audit.push({ kind: 'create', agentId: id, at: Date.now() });
  res.status(201).json(agent);
});

app.post('/api/agents/:agentId/capabilities',requireAuth,  (req, res) => {
  const { capability } = req.body || {};
  if (!CAPABILITY_CATALOG.find(c => c.name === capability)) return res.status(400).json({ error: `capability must be one of: ${CAPABILITY_CATALOG.map(c => c.name).join(',')}` });
  const a = agents.get(req.params.agentId);
  if (!a) return res.status(404).json({ error: 'unknown agent' });
  if (!a.capabilities.includes(capability)) a.capabilities.push(capability);
  a.manifest = buildManifest(a.capabilities);
  audit.push({ kind: 'add-cap', agentId: req.params.agentId, capability, at: Date.now() });
  res.json(a);
});

app.delete('/api/agents/:agentId/capabilities/:capability',requireAuth,  (req, res) => {
  const a = agents.get(req.params.agentId);
  if (!a) return res.status(404).json({ error: 'unknown agent' });
  a.capabilities = a.capabilities.filter(c => c !== req.params.capability);
  a.manifest = buildManifest(a.capabilities);
  audit.push({ kind: 'remove-cap', agentId: req.params.agentId, capability: req.params.capability, at: Date.now() });
  res.json(a);
});

// Which agents can handle a given intent type?
app.post('/api/manifest/agents-for-intent',requireAuth,  (req, res) => {
  const { intentType } = req.body || {};
  if (!intentType) return res.status(400).json({ error: 'intentType required' });
  const matches = Array.from(agents.values()).filter(a => (a.manifest.intents || []).includes(intentType));
  res.json({ intentType, count: matches.length, agents: matches.map(a => ({ agentId: a.agentId, name: a.name })) });
});

app.get('/api/audit', (_req, res) => {
  res.json({ count: audit.length, audit: audit.slice(-100) });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on :${PORT}`);
});
installGracefulShutdown(server);
