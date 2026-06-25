/**
 * SUTAR OS — Intent Bus v2.0 — Self-Contained
 * -----------------------------------------------------------------
 * Layer: 14 (Autonomous Layer) / SUTAR OS Layer 3 — Agent Network
 * Port:  4154
 * Auth:  X-Internal-Token header
 *
 * Lightweight pub/sub for SUTAR agent intents. Agents publish structured
 * intents ("I want to book a hotel", "I want to negotiate a price"), other
 * agents subscribe to intents they can handle, and the bus routes or
 * broadcasts them.
 *
 * Endpoints:
 *   POST /api/intents/publish          Publish an intent
 *   GET  /api/intents                  Query intents (filters: capability, type, status)
 *   GET  /api/intents/:id              Get intent detail
 *   POST /api/intents/:id/claim        Claim an intent (only one claimer wins)
 *   POST /api/intents/:id/resolve      Mark intent resolved with result
 *   POST /api/intents/:id/cancel       Cancel an intent
 *   POST /api/subscriptions            Subscribe to a capability / type
 *   GET  /api/subscriptions            List subscriptions
 *   DELETE /api/subscriptions/:id      Cancel subscription
 *   GET  /api/subscriptions/:id/poll   Long-poll for intents matching subscription
 *   GET  /api/topics                   List active intent topics
 *   GET  /api/stats                    Bus statistics
 *   GET  /health
 *   GET  /ready
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT           = parseInt(process.env.PORT || '4154', 10);
const SERVICE_NAME   = 'sutar-intent-bus';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'intent-bus-internal-token';
const INTENT_TTL_MS  = 10 * 60 * 1000; // 10 minutes
const DATA_DIR       = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

function ensureDir()  { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {} }
function dataFile(n)   { return path.join(DATA_DIR, n + '.json'); }
function loadJson(f)   { ensureDir(); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return null; } }
function saveJson(f, d){ ensureDir(); const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, f); }
function uuid()       { return crypto.randomUUID(); }

// ---------------------------------------------------------------------------
// Storage (Map + file persistence)
// ---------------------------------------------------------------------------
const intents       = new Map();  // id → intent
const subscriptions = new Map();  // id → subscription

function loadAll() {
  const i = loadJson(dataFile('intents'));
  if (i) { for (const e of i) intents.set(e.id, e); }
  const s = loadJson(dataFile('subscriptions'));
  if (s) { for (const e of s) subscriptions.set(e.id, e); }
}
function persist() { saveJson(dataFile('intents'), Array.from(intents.values())); saveJson(dataFile('subscriptions'), Array.from(subscriptions.values())); }
loadAll();

// ---------------------------------------------------------------------------
// Valid types
// ---------------------------------------------------------------------------
const VALID_TYPES = [
  'book_hotel', 'book_table', 'order_product', 'negotiate_price',
  'request_payment', 'request_quote', 'request_recommendation',
  'request_negotiation', 'escalate', 'broadcast',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isExpired(intent) { return Date.now() - intent.publishedAt > INTENT_TTL_MS; }

function reaper() {
  for (const [id, intent] of intents) {
    if (intent.status === 'open' && isExpired(intent)) {
      intent.status = 'expired';
      intent.expiredAt = Date.now();
    }
  }
  persist();
}
setInterval(reaper, 30 * 1000).unref();

function matchesSubscription(intent, sub) {
  if (sub.capability && sub.capability !== intent.capability) return false;
  if (sub.type      && sub.type      !== intent.type)          return false;
  if (sub.priority  && intent.priority && sub.priority > intent.priority) return false;
  return true;
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '1mb' }));

// ---------- Health ----------
app.get('/health', (_req, res) => {
  const open = Array.from(intents.values()).filter(i => i.status === 'open').length;
  res.json({
    status: 'ok', service: SERVICE_NAME, sutarLayer: 3,
    layer: 'Agent Network / Intent Broadcast', port: PORT,
    counts: { intents: intents.size, openIntents: open, subscriptions: subscriptions.size },
    timestamp: new Date().toISOString(),
  });
});

// ---------- Intents ----------
app.post('/api/intents/publish', requireInternal, (req, res) => {
  const { type, capability, payload, priority = 5, ttlSeconds, publisher } = req.body || {};
  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of ${VALID_TYPES.join(', ')}` });
  }
  if (!capability || !publisher) {
    return res.status(400).json({ error: 'capability and publisher required' });
  }
  const id = uuid();
  const intent = {
    id, type, capability,
    payload: payload || {},
    priority,
    ttlSeconds: ttlSeconds || 600,
    publisher,
    status: 'open',
    publishedAt: Date.now(),
    claimedBy: null, claimedAt: null,
    resolvedAt: null, result: null,
    metadata: { matchCount: 0 },
  };
  intents.set(id, intent);

  let matchCount = 0;
  for (const sub of subscriptions.values()) {
    if (matchesSubscription(intent, sub)) matchCount++;
  }
  intent.metadata.matchCount = matchCount;
  persist();

  res.status(201).json({ intent });
});

app.get('/api/intents', (req, res) => {
  const { capability, type, status = 'open', publisher } = req.query;
  let rows = Array.from(intents.values());
  if (capability) rows = rows.filter(i => i.capability === capability);
  if (type)       rows = rows.filter(i => i.type === type);
  if (status)     rows = rows.filter(i => i.status === status);
  if (publisher)  rows = rows.filter(i => i.publisher === publisher);
  rows = rows
    .filter(i => !(status === 'open' && isExpired(i)))
    .sort((a, b) => b.priority - a.priority || b.publishedAt - a.publishedAt)
    .slice(0, 200);
  res.json({ count: rows.length, intents: rows });
});

app.get('/api/intents/:id', (req, res) => {
  const intent = intents.get(req.params.id);
  if (!intent) return res.status(404).json({ error: 'Intent not found' });
  res.json({ intent });
});

app.post('/api/intents/:id/claim', requireInternal, (req, res) => {
  const intent = intents.get(req.params.id);
  if (!intent)                          return res.status(404).json({ error: 'Intent not found' });
  if (intent.status !== 'open')        return res.status(409).json({ error: `Cannot claim intent in status ${intent.status}` });
  if (isExpired(intent)) {
    intent.status = 'expired';
    return res.status(410).json({ error: 'Intent expired' });
  }
  const { claimer } = req.body || {};
  if (!claimer) return res.status(400).json({ error: 'claimer required' });
  intent.status = 'claimed';
  intent.claimedBy = claimer;
  intent.claimedAt = Date.now();
  persist();
  res.json({ intent });
});

app.post('/api/intents/:id/resolve', requireInternal, (req, res) => {
  const intent = intents.get(req.params.id);
  if (!intent)                            return res.status(404).json({ error: 'Intent not found' });
  if (!['open', 'claimed'].includes(intent.status)) return res.status(409).json({ error: `Cannot resolve intent in status ${intent.status}` });
  const { result, resolver } = req.body || {};
  intent.status = 'resolved';
  intent.result = result || null;
  intent.resolvedBy = resolver || null;
  intent.resolvedAt = Date.now();
  persist();
  res.json({ intent });
});

app.post('/api/intents/:id/cancel', requireInternal, (req, res) => {
  const intent = intents.get(req.params.id);
  if (!intent)                            return res.status(404).json({ error: 'Intent not found' });
  if (!['open', 'claimed'].includes(intent.status)) return res.status(409).json({ error: `Cannot cancel intent in status ${intent.status}` });
  const { reason } = req.body || {};
  intent.status = 'cancelled';
  intent.cancelReason = reason || null;
  intent.cancelledAt = Date.now();
  persist();
  res.json({ intent });
});

// ---------- Subscriptions ----------
app.post('/api/subscriptions', requireInternal, (req, res) => {
  const { subscriber, capability, type, priority, callbackUrl } = req.body || {};
  if (!subscriber) return res.status(400).json({ error: 'subscriber required' });
  if (!capability && !type) return res.status(400).json({ error: 'capability or type required' });
  const id = uuid();
  const sub = {
    id, subscriber,
    capability: capability || null,
    type: type || null,
    priority: priority || null,
    callbackUrl: callbackUrl || null,
    createdAt: Date.now(),
    matchedCount: 0,
    lastMatchAt: null,
  };
  subscriptions.set(id, sub);

  let matched = 0;
  for (const intent of intents.values()) {
    if (intent.status === 'open' && matchesSubscription(intent, sub)) matched++;
  }
  sub.matchedCount = matched;
  sub.lastMatchAt = matched > 0 ? Date.now() : null;
  persist();

  res.status(201).json({ subscription: sub });
});

app.get('/api/subscriptions', (_req, res) => {
  res.json({ count: subscriptions.size, subscriptions: Array.from(subscriptions.values()) });
});

app.delete('/api/subscriptions/:id', requireInternal, (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  subscriptions.delete(req.params.id);
  persist();
  res.json({ deleted: true, subscription: sub });
});

app.get('/api/subscriptions/:id/poll', (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  const matches = Array.from(intents.values())
    .filter(i => i.status === 'open' && !isExpired(i) && matchesSubscription(i, sub))
    .sort((a, b) => b.priority - a.priority || b.publishedAt - a.publishedAt)
    .slice(0, 50);
  res.json({ count: matches.length, subscription: sub, intents: matches });
});

// ---------- Topics ----------
app.get('/api/topics', (_req, res) => {
  const topics = {};
  for (const intent of intents.values()) {
    const key = `${intent.capability}::${intent.type}`;
    if (!topics[key]) topics[key] = { capability: intent.capability, type: intent.type, open: 0, total: 0 };
    topics[key].total++;
    if (intent.status === 'open') topics[key].open++;
  }
  res.json({
    count: Object.keys(topics).length,
    topics: Object.values(topics).sort((a, b) => b.open - a.open),
  });
});

// ---------- Stats ----------
app.get('/api/stats', (_req, res) => {
  const byStatus = {};
  const byType   = {};
  for (const i of intents.values()) {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    byType[i.type]     = (byType[i.type]     || 0) + 1;
  }
  res.json({
    totals: {
      intents:      intents.size,
      openIntents:  Array.from(intents.values()).filter(i => i.status === 'open' && !isExpired(i)).length,
      subscriptions: subscriptions.size,
    },
    byStatus, byType,
    timestamp: new Date().toISOString(),
  });
});

// ---------- Root ----------
app.get('/', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    sutar: 'Layer 3 — Agent Network / Intent Broadcast',
    port: PORT,
    validTypes: VALID_TYPES,
    endpoints: [
      'POST /api/intents/publish',
      'GET  /api/intents',
      'GET  /api/intents/:id',
      'POST /api/intents/:id/claim',
      'POST /api/intents/:id/resolve',
      'POST /api/intents/:id/cancel',
      'POST /api/subscriptions',
      'GET  /api/subscriptions',
      'DELETE /api/subscriptions/:id',
      'GET  /api/subscriptions/:id/poll',
      'GET  /api/topics',
      'GET  /api/stats',
      'GET  /health',
      'GET  /ready',
    ],
  });
});

// ---------- Ready ----------
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] listening on http://localhost:${PORT}`);
  console.log(`[${SERVICE_NAME}] valid intent types: ${VALID_TYPES.join(', ')}`);
  console.log(`[${SERVICE_NAME}] intent TTL: ${INTENT_TTL_MS / 1000}s`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  persist();
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  persist();
  server.close(() => process.exit(0));
});

module.exports = { app, startServer: (port) => new Promise(resolve => {
  const s = app.listen(port || PORT, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
})};
