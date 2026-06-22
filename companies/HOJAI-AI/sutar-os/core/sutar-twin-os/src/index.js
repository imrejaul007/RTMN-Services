/**
 * SUTAR OS — Twin OS (port 4142)
 *
 * The SUTAR-scoped view over /services/twinos-hub (4705). Adds three things
 * the underlying TwinOS does not provide:
 *
 *   1. SUTAR capability tags per twin (negotiator, learner, planner, …)
 *   2. Intent-aware resolution — given an SUTAR intent (e.g. "negotiate_price"),
 *      return the best twin(s) for that intent
 *   3. Twin federation — a twin's SUTAR view may span multiple underlying
 *      twin services (commerce.customer + ai.intent for a "merchant" twin)
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
const axios = require('axios');

const { applyTenantContext } = require('../../sutar-shared/tenant');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4142;
const SERVICE_NAME = 'sutar-twin-os';
setupSecurity(app, { serviceName: 'sutar-twin-os' });
// ADR-0009 Phase 1: tenant context middleware. /health, /ready,
// /v1/info (if present) stay public; everything else under /api/ requires
// a tenant. Returns { getTenantId, tkey } for route-level use.
applyTenantContext(app, {
  serviceName: 'sutar-twin-os',
  publicPathPatterns: ["^\\/health$","^\\/health\\/.*$","^\\/ready$","^\\/v1\\/info$"].map(s => new RegExp(s)),
});
const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4705';
const twinOsClient = axios.create({ baseURL: TWINOS_URL, timeout: 2000 });

// SUTAR capability tags that a twin can carry
const CAPABILITIES = [
  'negotiator',    // can run price/terms negotiation
  'learner',       // improves over time from feedback
  'planner',       // produces multi-step plans
  'executor',      // executes plans in the real world
  'simulator',     // runs what-if scenarios
  'memory-keeper', // primary memory owner for an entity
  'intent-publisher', // publishes intents to intent-bus
  'intent-consumer',  // claims/resolves intents
];

// Composite SUTAR twins — virtual twins that span underlying twin services
const compositeTwins = new PersistentMap('composite-twins', { serviceName: 'sutar-twin-os' });
const tagRegistry = new PersistentMap('tag-registry', { serviceName: 'sutar-twin-os' });  // twinId -> [capability, ...]
const audit = [];

function seed() {
  // Seed a few SUTAR-specific composite twins so the service is never empty
  const seeds = [
    { id: 'sutar-merchant', name: 'Merchant Twin', services: ['commerce.merchant', 'commerce.product', 'commerce.order'], tags: ['negotiator', 'executor'] },
    { id: 'sutar-consumer', name: 'Consumer Twin', services: ['commerce.customer', 'commerce.wallet'], tags: ['intent-publisher'] },
    { id: 'sutar-facilitator', name: 'Facilitator Twin', services: ['agent.ai', 'decision.policy'], tags: ['negotiator', 'planner'] },
    { id: 'sutar-observer', name: 'Observer Twin', services: ['ai.memory', 'ai.simulation'], tags: ['simulator', 'learner'] },
  ];
  for (const s of seeds) {
    compositeTwins.set(s.id, { ...s, createdAt: new Date().toISOString() });
    tagRegistry.set(s.id, s.tags);
  }
}
seed();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok', service: SERVICE_NAME, sutarLayer: 2, port: PORT,
    counts: { compositeTwins: compositeTwins.size, tags: tagRegistry.size, audit: audit.length },
    capabilities: ['twins-list', 'twins-get', 'twins-resolve-for-intent', 'twins-tag', 'twins-untag'],
    timestamp: new Date().toISOString(),
  });
});

// ---------- Composite twins ----------

app.get('/api/twins', (_req, res) => {
  res.json({ count: compositeTwins.size, twins: Array.from(compositeTwins.values()) });
});

app.get('/api/twins/:id', (req, res) => {
  const t = compositeTwins.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'unknown sutar twin' });
  res.json(t);
});

app.post('/api/twins',requireAuth,  (req, res) => {
  const { id, name, services = [], tags = [] } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });
  if (compositeTwins.has(id)) return res.status(409).json({ error: 'twin exists' });
  const t = { id, name, services, tags, createdAt: new Date().toISOString() };
  compositeTwins.set(id, t);
  tagRegistry.set(id, tags);
  audit.push({ kind: 'create', twinId: id, at: Date.now() });
  res.status(201).json(t);
});

// ---------- Tagging ----------

app.post('/api/twins/:id/tags',requireAuth,  (req, res) => {
  const { tag } = req.body || {};
  if (!CAPABILITIES.includes(tag)) return res.status(400).json({ error: `tag must be one of: ${CAPABILITIES.join(',')}` });
  const t = compositeTwins.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'unknown twin' });
  t.tags = t.tags || [];
  if (!t.tags.includes(tag)) t.tags.push(tag);
  tagRegistry.set(req.params.id, t.tags);
  audit.push({ kind: 'tag', twinId: req.params.id, tag, at: Date.now() });
  res.json(t);
});

app.delete('/api/twins/:id/tags/:tag',requireAuth,  (req, res) => {
  const t = compositeTwins.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'unknown twin' });
  t.tags = (t.tags || []).filter(x => x !== req.params.tag);
  tagRegistry.set(req.params.id, t.tags);
  audit.push({ kind: 'untag', twinId: req.params.id, tag: req.params.tag, at: Date.now() });
  res.json(t);
});

// ---------- Intent-aware resolution ----------
// Given an SUTAR intent type, return the best twins for it.

const INTENT_TO_CAPABILITY = {
  negotiate_price: 'negotiator',
  request_recommendation: 'simulator',
  broadcast: 'intent-publisher',
  request_negotiation: 'negotiator',
  request_quote: 'negotiator',
  book_hotel: 'executor',
  book_table: 'executor',
  order_product: 'executor',
  escalate: 'planner',
};

app.post('/api/twins/resolve-for-intent',requireAuth,  (req, res) => {
  const { intentType } = req.body || {};
  if (!intentType) return res.status(400).json({ error: 'intentType required' });
  const requiredCap = INTENT_TO_CAPABILITY[intentType];
  if (!requiredCap) return res.json({ intentType, candidates: [] });
  const candidates = Array.from(compositeTwins.values()).filter(t => (t.tags || []).includes(requiredCap));
  res.json({ intentType, requiredCapability: requiredCap, count: candidates.length, candidates });
});

// ---------- Bridge to underlying TwinOS ----------

app.get('/api/twinos/proxy/:twinId', async (req, res) => {
  try {
    const r = await twinOsClient.get(`/api/twins/${encodeURIComponent(req.params.twinId)}`);
    res.json({ source: 'twinos-hub', twin: r.data });
  } catch (err) {
    res.status(err.response?.status || 502).json({ error: err.message, targetUrl: TWINOS_URL });
  }
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
