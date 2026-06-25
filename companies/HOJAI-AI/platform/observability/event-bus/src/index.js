/**
 * Event Bus Service v3.0 — Self-Contained
 * -----------------------------------------------------------------
 * Cross-service pub/sub with:
 *   - HTTP webhook delivery (HMAC-SHA256 signed)
 *   - Type pattern matching (order.*, *.created, *)
 *   - Payload-based filtering (e.g. {"payload.tenantId": "t-1"})
 *   - Async, non-blocking dispatch via setImmediate
 *   - Configurable retry policy with exponential backoff
 *   - Dead-letter queue for events that exhaust retries
 *   - Event store / replay by id and by cursor
 *   - Schema versioning (mismatch logged but still delivered for back-compat)
 *   - Subscription management (CRUD)
 *   - Stats & monitoring
 *
 * Storage: in-memory Map (file-backed via DATA_DIR)
 * Auth:    X-Internal-Token header
 * Port:     4510
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '4510', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'event-bus-internal-token';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'rtmn-event-bus-secret';
const WEBHOOK_TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000', 10);
const MAX_EVENTS = parseInt(process.env.MAX_EVENTS || '10000', 10);
const MAX_DEAD_LETTERS = parseInt(process.env.MAX_DEAD_LETTERS || '1000', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {} }

function dataFile(name) { return path.join(DATA_DIR, name + '.json'); }

function loadJson(file) {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return null; }
}

function saveJson(file, data) {
  ensureDir();
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

// ---------------------------------------------------------------------------
// Storage (in-memory Map + file persistence)
// ---------------------------------------------------------------------------

const events       = new Map();  // id → event
const subscriptions = new Map();  // id → subscription
const deadLetters   = new Map();  // id → dlq entry
const eventOrder    = [];         // chronological list of event ids

function persistEvents() {
  const list = eventOrder.map(id => events.get(id)).filter(Boolean);
  saveJson(dataFile('events'), list);
}

function persistSubscriptions() {
  saveJson(dataFile('subscriptions'), Array.from(subscriptions.values()));
}

function persistDLQ() {
  const entries = Array.from(deadLetters.values()).slice(-MAX_DEAD_LETTERS);
  saveJson(dataFile('dlq'), entries);
}

function loadAll() {
  const evs = loadJson(dataFile('events'));
  if (evs && Array.isArray(evs)) {
    evs.forEach(e => { events.set(e.id, e); eventOrder.push(e.id); });
  }
  const subs = loadJson(dataFile('subscriptions'));
  if (subs && Array.isArray(subs)) {
    subs.forEach(s => subscriptions.set(s.id, s));
  }
  const dlq = loadJson(dataFile('dlq'));
  if (dlq && Array.isArray(dlq)) {
    dlq.forEach(d => deadLetters.set(d.id, d));
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN)
    return res.status(401).json({ error: 'unauthorized' });
  next();
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

function seed() {
  if (events.size > 0 || subscriptions.size > 0) return;

  const subId = uuidv4();
  subscriptions.set(subId, {
    id: subId,
    typePattern: 'order.*',
    webhookUrl: 'http://localhost:5500/api/orders/webhook',
    headers: { 'X-Tenant': 'demo' },
    filter: null,
    retryPolicy: { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 },
    schemaVersion: null,
    createdAt: nowIso(), active: true,
  });

  const samples = [
    { type: 'order.created',     source: 'mock', payload: { orderId: 'o-1001', amount: 49.99, tenantId: 't-1' } },
    { type: 'order.updated',     source: 'mock', payload: { orderId: 'o-1001', status: 'paid' } },
    { type: 'user.created',      source: 'mock', payload: { userId: 'u-2001', email: 'alice@example.com' } },
    { type: 'payment.completed', source: 'mock', payload: { paymentId: 'p-3001', amount: 49.99, tenantId: 't-1' } },
    { type: 'inventory.low',     source: 'mock', payload: { sku: 'sku-42', qty: 3 } },
  ];
  samples.forEach(s => indexEvent(makeEvent(s)));
  persistSubscriptions();
  persistEvents();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowIso() { return new Date().toISOString(); }

function uuidv4() {
  return crypto.randomBytes(16).toString('hex');
}

function makeEvent({ type, source, payload, headers, schema_version }) {
  return { id: uuidv4(), type, source: source || 'unknown', payload: payload || {},
    headers: headers || {}, schema_version: schema_version || '1.0', timestamp: nowIso() };
}

function indexEvent(ev) {
  if (events.has(ev.id)) return;
  events.set(ev.id, ev);
  eventOrder.push(ev.id);
  while (events.size > MAX_EVENTS) {
    const oldId = eventOrder.shift();
    events.delete(oldId);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

function matchTypePattern(pattern, type) {
  if (!pattern || pattern === '*') return true;
  if (pattern === type) return true;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return type === prefix || type.startsWith(prefix + '.');
  }
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return type.split('.').pop() === suffix;
  }
  return false;
}

function evaluateFilter(filter, event) {
  if (!filter || typeof filter !== 'object') return true;
  for (const [path, expected] of Object.entries(filter)) {
    const actual = getNested(event, path);
    if (Array.isArray(expected)) { if (!expected.includes(actual)) return false; }
    else if (actual !== expected) return false;
  }
  return true;
}

function getNested(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) { if (cur == null) return undefined; cur = cur[p]; }
  return cur;
}

function schemaVersionAccepts(subVer, evVer) {
  if (!subVer) return true;
  if (!evVer) return true;
  let minVer = subVer, isMin = false;
  if (typeof subVer === 'string' && subVer.endsWith('+')) { minVer = subVer.slice(0, -1); isMin = true; }
  const parseV = v => { if (typeof v !== 'string') return [0,0]; const [a, b='0'] = v.split('.'); return [parseInt(a)||0, parseInt(b)||0]; };
  const [sM, sm] = parseV(minVer);
  const [eM, em] = parseV(evVer);
  if (isMin) { if (eM > sM) return true; if (eM === sM && em >= sm) return true; return false; }
  return sM === eM && sm === em;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

const stats = {
  eventsPublished: 0, eventsDelivered: 0, eventsRetried: 0,
  eventsDeadLettered: 0, deliveryAttempts: 0, schemaMismatches: 0,
};

// ---------------------------------------------------------------------------
// Webhook delivery
// ---------------------------------------------------------------------------

function signBody(body, secret) {
  return crypto.createHmac('sha256', secret || WEBHOOK_SECRET).update(body).digest('hex');
}

async function deliverWebhook(sub, event, attempt) {
  stats.deliveryAttempts++;
  const body = JSON.stringify({
    id: event.id, type: event.type, source: event.source,
    payload: event.payload, headers: event.headers,
    schema_version: event.schema_version, timestamp: event.timestamp,
  });
  const signature = signBody(body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(sub.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Bus-Id': event.id,
        'X-Event-Bus-Type': event.type,
        'X-Event-Bus-Signature': `sha256=${signature}`,
        'X-Event-Bus-Delivery-Attempt': String(attempt),
        'X-Event-Bus-Subscription': sub.id,
        ...(sub.headers || {}),
      },
      body, signal: controller.signal,
    });
    clearTimeout(timer);
    if (response.status >= 200 && response.status < 300) {
      stats.eventsDelivered++;
      return { ok: true, status: response.status, attempt };
    }
    return { ok: false, status: response.status, attempt, error: `HTTP ${response.status}` };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, status: 0, attempt, error: err.message || String(err) };
  }
}

async function dispatchToSubscription(sub, event) {
  if (!sub.active) return;
  if (!matchTypePattern(sub.typePattern, event.type)) return;
  if (!evaluateFilter(sub.filter, event)) return;
  if (!schemaVersionAccepts(sub.schemaVersion, event.schema_version)) {
    stats.schemaMismatches++;
    console.warn(`[event-bus] schema mismatch: sub=${sub.id} event=${event.id}`);
  }
  const policy = sub.retryPolicy || { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 };
  let attempt = 1;
  let result = await deliverWebhook(sub, event, attempt);
  while (!result.ok && attempt < policy.maxAttempts) {
    stats.eventsRetried++;
    attempt++;
    await sleep(policy.backoffMs * Math.pow(policy.backoffMultiplier, attempt - 2));
    result = await deliverWebhook(sub, event, attempt);
  }
  if (!result.ok) {
    const dlqEntry = {
      id: uuidv4(), event, subscriptionId: sub.id, webhookUrl: sub.webhookUrl,
      attempts: attempt, lastError: result.error, lastStatus: result.status,
      deadLetteredAt: nowIso(),
    };
    deadLetters.set(dlqEntry.id, dlqEntry);
    while (deadLetters.size > MAX_DEAD_LETTERS) {
      const firstKey = deadLetters.keys().next().value;
      deadLetters.delete(firstKey);
    }
    persistDLQ();
    stats.eventsDeadLettered++;
  }
}

function fanOut(event) {
  for (const sub of subscriptions.values()) {
    setImmediate(() => {
      dispatchToSubscription(sub, event).catch(err => {
        console.error(`[event-bus] dispatch error sub=${sub.id}:`, err.message);
      });
    });
  }
}

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function createApp() {
  events.clear(); eventOrder.length = 0;
  subscriptions.clear();
  deadLetters.clear();
  // Reset stats
  Object.assign(stats, { eventsPublished: 0, eventsDelivered: 0, eventsDeadLettered: 0, deliveryAttempts: 0, eventsRetried: 0, schemaMismatches: 0 });
  loadAll();
  seed();

  const a = express();
  a.use(express.json({ limit: '10mb' }));

  a.get('/health', (_req, res) => res.json({
    status: 'ok', service: 'event-bus', version: '3.0.0', port: PORT,
    timestamp: nowIso(), queueSize: stats.eventsPublished - stats.eventsDelivered - stats.eventsDeadLettered,
  }));
  a.get('/ready', (_req, res) => res.json({ ready: true, service: 'event-bus', version: '3.0.0' }));

  // Publish events
  a.post('/api/events', requireInternal, (req, res) => {
    const { type, source, payload, headers, schema_version } = req.body || {};
    if (!type) return res.status(400).json({ error: 'type required' });
    const ev = makeEvent({ type, source, payload, headers, schema_version });
    indexEvent(ev);
    stats.eventsPublished++;
    fanOut(ev);
    res.status(201).json(ev);
  });

  a.post('/api/events/batch', requireInternal, (req, res) => {
    const { events: batch } = req.body || {};
    if (!Array.isArray(batch)) return res.status(400).json({ error: 'events array required' });
    const stored = [];
    for (const item of batch) {
      if (!item || !item.type) continue;
      const ev = makeEvent(item);
      indexEvent(ev);
      stats.eventsPublished++;
      fanOut(ev);
      stored.push(ev);
    }
    res.status(201).json({ count: stored.length, events: stored });
  });

  // Event listing
  a.get('/api/events', (req, res) => {
    let result = Array.from(events.values());
    if (req.query.type) result = result.filter(e => matchTypePattern(req.query.type, e.type));
    if (req.query.source) result = result.filter(e => e.source === req.query.source);
    if (req.query.schemaVersion) result = result.filter(e => e.schema_version === req.query.schemaVersion);
    if (req.query.since) {
      const sinceMs = Date.parse(req.query.since);
      if (!isNaN(sinceMs)) result = result.filter(e => Date.parse(e.timestamp) >= sinceMs);
    }
    result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const lim = req.query.limit ? Math.min(parseInt(req.query.limit), 1000) : 100;
    res.json({ count: result.length, events: result.slice(0, lim) });
  });

  a.get('/api/events/:id', (req, res) => {
    const ev = events.get(req.params.id);
    if (!ev) return res.status(404).json({ error: 'event not found' });
    res.json(ev);
  });

  a.post('/api/events/replay/:id', requireInternal, (req, res) => {
    const ev = events.get(req.params.id);
    if (!ev) return res.status(404).json({ error: 'event not found' });
    fanOut(ev);
    res.json({ ok: true, replayed: ev.id, type: ev.type });
  });

  // Subscriptions CRUD
  a.post('/api/subscriptions', requireInternal, (req, res) => {
    const { typePattern, webhookUrl, headers, filter, retryPolicy, schemaVersion } = req.body || {};
    if (!typePattern) return res.status(400).json({ error: 'typePattern required' });
    if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl required' });
    const sub = {
      id: uuidv4(), typePattern, webhookUrl,
      headers: headers || {}, filter: filter || null,
      retryPolicy: retryPolicy || { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 },
      schemaVersion: schemaVersion || null,
      createdAt: nowIso(), active: true,
    };
    subscriptions.set(sub.id, sub);
    persistSubscriptions();
    res.status(201).json(sub);
  });

  a.get('/api/subscriptions', (_req, res) => {
    res.json({ count: subscriptions.size, subscriptions: Array.from(subscriptions.values()) });
  });

  a.get('/api/subscriptions/:id', (req, res) => {
    const sub = subscriptions.get(req.params.id);
    if (!sub) return res.status(404).json({ error: 'subscription not found' });
    res.json(sub);
  });

  a.patch('/api/subscriptions/:id', requireInternal, (req, res) => {
    const sub = subscriptions.get(req.params.id);
    if (!sub) return res.status(404).json({ error: 'subscription not found' });
    for (const k of ['typePattern','webhookUrl','headers','filter','retryPolicy','schemaVersion','active']) {
      if (k in req.body) sub[k] = req.body[k];
    }
    sub.updatedAt = nowIso();
    subscriptions.set(sub.id, sub);
    persistSubscriptions();
    res.json(sub);
  });

  a.delete('/api/subscriptions/:id', requireInternal, (req, res) => {
    if (!subscriptions.has(req.params.id)) return res.status(404).json({ error: 'subscription not found' });
    subscriptions.delete(req.params.id);
    persistSubscriptions();
    res.json({ ok: true, deleted: req.params.id });
  });

  // Subscription replay from cursor
  a.post('/api/subscriptions/:id/replay-from/:cursor', requireInternal, (req, res) => {
    const sub = subscriptions.get(req.params.id);
    if (!sub) return res.status(404).json({ error: 'subscription not found' });
    const cursorIndex = eventOrder.indexOf(req.params.cursor);
    const startIdx = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    const replayed = [];
    for (let i = startIdx; i < eventOrder.length; i++) {
      const ev = events.get(eventOrder[i]);
      if (!ev) continue;
      setImmediate(() => { dispatchToSubscription(sub, ev).catch(err => console.error(err.message)); });
      replayed.push(ev.id);
    }
    res.json({ ok: true, count: replayed.length, replayed, subscriptionId: sub.id });
  });

  // Dead-letter queue
  a.get('/api/dead-letter', (_req, res) => {
    res.json({ count: deadLetters.size, entries: Array.from(deadLetters.values()) });
  });

  a.post('/api/dead-letter/:id/replay', requireInternal, (req, res) => {
    const dlq = deadLetters.get(req.params.id);
    if (!dlq) return res.status(404).json({ error: 'dead-letter entry not found' });
    deadLetters.delete(dlq.id);
    persistDLQ();
    const sub = subscriptions.get(dlq.subscriptionId);
    if (!sub) return res.json({ ok: true, deleted: dlq.id, note: 'subscription gone — entry removed' });
    setImmediate(() => { dispatchToSubscription(sub, dlq.event).catch(err => console.error(err.message)); });
    res.json({ ok: true, replayed: dlq.id, eventId: dlq.event.id, subscriptionId: sub.id });
  });

  // Stats
  a.get('/api/stats', (_req, res) => {
    const totalSubs = subscriptions.size;
    const activeSubs = Array.from(subscriptions.values()).filter(s => s.active).length;
    res.json({
      service: { name: 'event-bus', version: '3.0.0' },
      events: { stored: events.size, capacity: MAX_EVENTS, published: stats.eventsPublished, delivered: stats.eventsDelivered, retried: stats.eventsRetried, deadLettered: stats.eventsDeadLettered },
      subscriptions: { total: totalSubs, active: activeSubs, inactive: totalSubs - activeSubs },
      deadLetter: { size: deadLetters.size, capacity: MAX_DEAD_LETTERS },
      delivery: { attempts: stats.deliveryAttempts, successRate: stats.deliveryAttempts > 0 ? Number((stats.eventsDelivered / stats.deliveryAttempts).toFixed(4)) : 0 },
      schemaMismatches: stats.schemaMismatches,
      uptimeMs: Math.round(process.uptime() * 1000),
    });
  });

  // Signature endpoint (for webhook verification)
  a.post('/api/sign', requireInternal, (req, res) => {
    const { body } = req.body || {};
    if (typeof body !== 'string') return res.status(400).json({ error: 'body string required' });
    res.json({ signature: signBody(body) });
  });

  // 404 + error
  a.use((req, res) => res.status(404).json({ error: 'not found', path: req.originalUrl }));
  a.use((err, req, res) => { console.error('[event-bus] error:', err); res.status(500).json({ error: 'internal error', message: err.message }); });

  return a;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function start() {
  const a = createApp();
  const server = a.listen(PORT, () => {
    console.log(`[event-bus] Event Bus v3.0.0 running on :${PORT}`);
    console.log(`[event-bus] health: http://localhost:${PORT}/health`);
  });
  const shutdown = (sig) => { console.log(`[event-bus] ${sig}, shutting down...`); server.close(() => process.exit(0)); };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) start();

const _createApp = createApp;

module.exports = {
  createApp: _createApp,
  app: _createApp,
  start,
  startServer: (port) => {
    const a = _createApp();
    return new Promise(resolve => {
      const s = a.listen(port || PORT, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
    });
  },
};
