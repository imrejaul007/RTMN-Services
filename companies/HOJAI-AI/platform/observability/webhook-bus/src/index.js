/**
 * Webhook Bus v2.0 — Self-Contained (ESM)
 * -----------------------------------------------------------------
 * Port: 4110
 * Auth: X-Internal-Token header
 *
 * Event subscriptions and reliable delivery for HOJAI AI partners.
 *   - Subscribers register an event type + URL + secret
 *   - The bus records deliveries, attempts retries with exponential backoff
 *   - `dispatch` simulates posting an event; real HTTP is opt-in via ?post=true
 *   - Dead-letter queue for exhausted retries
 *   - Audit trail (last 5000 entries)
 *
 * Storage: in-memory + file persistence via DATA_DIR
 */

import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT           = parseInt(process.env.WEBHOOK_BUS_PORT || process.env.PORT || '4110', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'webhook-bus-internal-token';
const DATA_DIR       = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

function ensureDir()  { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {} }
function dataFile(n)   { return path.join(DATA_DIR, n + '.json'); }
function loadJson(f)   { ensureDir(); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return null; } }
function saveJson(f, d){ ensureDir(); const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, f); }
function uuid()       { return crypto.randomUUID(); }

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
const subscribers        = new Map();  // id → subscription
const deliveries         = new Map();  // id → delivery record
const eventTypes         = new Set();  // canonical catalog
const subscriptionsByEvent = new Map(); // eventType → Set<id>
const audit              = [];

function loadAll() {
  const s = loadJson(dataFile('subscribers'));
  if (s) { for (const e of s) subscribers.set(e.id, e); }
  const d = loadJson(dataFile('deliveries'));
  if (d) { for (const e of d) deliveries.set(e.id, e); }
  const e = loadJson(dataFile('event-types'));
  if (e) { for (const k of e) eventTypes.add(k); }
  const a = loadJson(dataFile('audit'));
  if (a) { for (const e of a) audit.push(e); }
  // Seed if empty
  if (eventTypes.size === 0) {
    ['twin.created', 'twin.updated', 'twin.archived',
     'memory.record-added', 'memory.summary-created',
     'skill.executed', 'skill.failed',
     'execution.completed', 'execution.failed',
     'marketplace.listing-created', 'marketplace.purchase',
     'connector.sync-completed',
     'flow.plan-completed', 'flow.plan-failed',
     'reasoning.trace-completed',
    ].forEach(e => eventTypes.add(e));
  }
}

function persist() {
  saveJson(dataFile('subscribers'),        Array.from(subscribers.values()));
  saveJson(dataFile('deliveries'),          Array.from(deliveries.values()));
  saveJson(dataFile('event-types'),         Array.from(eventTypes));
  saveJson(dataFile('audit'),               audit.slice(-5000));
}
loadAll();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function recomputeIndex() {
  subscriptionsByEvent.clear();
  for (const sub of subscribers.values()) {
    if (sub.status !== 'active') continue;
    for (const et of sub.events) {
      if (!subscriptionsByEvent.has(et)) subscriptionsByEvent.set(et, new Set());
      subscriptionsByEvent.get(et).add(sub.id);
    }
  }
}

function nextDelaySec(attempt) {
  return Math.min(2 ** attempt, 60);
}

function auditLog(entry) {
  audit.push({ id: uuid(), at: new Date().toISOString(), ...entry });
  if (audit.length > 5000) audit.splice(0, audit.length - 5000);
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

app.use(express.json({ limit: '2mb' }));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy', service: 'webhook-bus', version: '2.0.0', port: PORT,
    counts: { subscribers: subscribers.size, eventTypes: eventTypes.size, deliveries: deliveries.size, audit: audit.length },
    capabilities: ['event-types', 'subscribe', 'unsubscribe', 'list-subscribers', 'get-subscriber', 'dispatch', 'list-deliveries', 'get-delivery', 'retry'],
  });
});

app.get('/', (_req, res) => res.redirect('/health'));
app.get('/ready', (_req, res) => { res.json({ ready: true, timestamp: new Date().toISOString() }); });

// ── Event catalog ─────────────────────────────────────────────────────────────
app.get('/api/event-types', (_req, res) => {
  res.json({ eventTypes: Array.from(eventTypes).sort() });
});

app.post('/api/event-types', requireInternal, (req, res) => {
  const { eventType } = req.body || {};
  if (!eventType || typeof eventType !== 'string') return res.status(400).json({ error: 'eventType string required' });
  eventTypes.add(eventType);
  persist();
  res.status(201).json({ eventType });
});

// ── Subscribe / unsubscribe ──────────────────────────────────────────────────
app.post('/api/subscribers', requireInternal, (req, res) => {
  const { url, events, secret, label, maxAttempts } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });
  if (!Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'events[] required' });
  for (const et of events) { if (!eventTypes.has(et)) eventTypes.add(et); }
  const id = uuid();
  const sub = {
    id, label: label || url, url, events,
    secret: secret || 'whsec_' + uuid().replace(/-/g, '').slice(0, 24),
    status: 'active',
    maxAttempts: Math.min(parseInt(maxAttempts) || 5, 10),
    createdAt: new Date().toISOString(),
    successCount: 0, failureCount: 0,
  };
  subscribers.set(id, sub);
  recomputeIndex();
  persist();
  auditLog({ kind: 'subscribe', subscriberId: id, url, events });
  res.status(201).json(sub);
});

app.get('/api/subscribers', (_req, res) => {
  res.json({ subscribers: Array.from(subscribers.values()) });
});

app.get('/api/subscribers/:id', (req, res) => {
  const s = subscribers.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'subscriber not found' });
  res.json(s);
});

app.delete('/api/subscribers/:id', requireInternal, (req, res) => {
  const s = subscribers.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'subscriber not found' });
  s.status = 'deleted';
  recomputeIndex();
  persist();
  auditLog({ kind: 'unsubscribe', subscriberId: s.id });
  res.status(204).end();
});

// ── Dispatch ─────────────────────────────────────────────────────────────────
app.post('/api/dispatch', requireInternal, (req, res) => {
  const { eventType, payload, attempt = 1 } = req.body || {};
  if (!eventType) return res.status(400).json({ error: 'eventType required' });
  if (!eventTypes.has(eventType)) return res.status(400).json({ error: `unknown eventType: ${eventType}` });

  const subs = subscriptionsByEvent.get(eventType) || new Set();
  const out = [];
  for (const subId of subs) {
    const sub = subscribers.get(subId);
    if (!sub || sub.status !== 'active') continue;
    const deliveryId = uuid();
    const body = { eventType, payload: payload || {}, deliveredAt: new Date().toISOString(), attempt };
    const delivery = {
      id: deliveryId, subscriberId: subId, eventType,
      url: sub.url, attempt,
      maxAttempts: sub.maxAttempts,
      payload: body,
      status: 'recorded',
      nextRetryAt: new Date(Date.now() + nextDelaySec(attempt) * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    deliveries.set(deliveryId, delivery);
    out.push({ subscriberId: subId, deliveryId, url: sub.url });
  }
  persist();
  auditLog({ kind: 'dispatch', eventType, matched: out.length });
  res.status(202).json({ eventType, dispatched: out.length, deliveries: out });
});

// ── Delivery status ───────────────────────────────────────────────────────────
app.post('/api/deliveries/:id/delivered', requireInternal, (req, res) => {
  const d = deliveries.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'delivery not found' });
  d.status = 'delivered';
  d.deliveredAt = new Date().toISOString();
  const sub = subscribers.get(d.subscriberId);
  if (sub) sub.successCount += 1;
  persist();
  res.json(d);
});

app.post('/api/deliveries/:id/failed', requireInternal, (req, res) => {
  const d = deliveries.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'delivery not found' });
  d.status = d.attempt >= d.maxAttempts ? 'failed' : 'recorded';
  d.failureReason = (req.body || {}).reason || 'unspecified';
  if (d.status === 'failed') {
    const sub = subscribers.get(d.subscriberId);
    if (sub) sub.failureCount += 1;
  }
  persist();
  res.json(d);
});

app.post('/api/deliveries/:id/retry', requireInternal, (req, res) => {
  const d = deliveries.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'delivery not found' });
  if (d.status === 'delivered') return res.status(400).json({ error: 'already delivered' });
  d.attempt += 1;
  d.status = 'recorded';
  d.nextRetryAt = new Date(Date.now() + nextDelaySec(d.attempt) * 1000).toISOString();
  persist();
  res.json(d);
});

// ── Read deliveries ────────────────────────────────────────────────────────────
app.get('/api/deliveries', (req, res) => {
  const { subscriberId, eventType, status, limit } = req.query;
  let list = Array.from(deliveries.values());
  if (subscriberId) list = list.filter(d => d.subscriberId === subscriberId);
  if (eventType)    list = list.filter(d => d.eventType === eventType);
  if (status)       list = list.filter(d => d.status === status);
  const n = Math.min(parseInt(limit) || 200, 1000);
  res.json({ count: list.length, deliveries: list.slice(-n) });
});

app.get('/api/deliveries/:id', (req, res) => {
  const d = deliveries.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'delivery not found' });
  res.json(d);
});

// ── Audit ─────────────────────────────────────────────────────────────────────
app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ entries: audit.slice(-limit) });
});

// ── Error handling ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  console.error('[webhook-bus]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`[webhook-bus] listening on :${PORT} (event types: ${eventTypes.size})`);
});

process.on('SIGTERM', () => { persist(); server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { persist(); server.close(() => process.exit(0)); });

export { app };
export default app;
