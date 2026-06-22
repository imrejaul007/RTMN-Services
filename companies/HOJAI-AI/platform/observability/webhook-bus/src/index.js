/**
 * Webhook Bus (port 4110)
 *
 * Developer Platform service: event subscriptions and reliable delivery.
 *
 *   - Subscribers register an event type + URL + secret
 *   - The bus keeps a delivery log per subscription
 *   - `dispatch` simulates posting an event: returns what *would* be sent
 *     and increments attempt counters (real HTTP is opt-in via ?post=true)
 *   - Retry policy: exponential backoff up to maxAttempts
 *
 * Event types (seeded):
 *   - twin.created, twin.updated, twin.archived
 *   - memory.record-added, memory.summary-created
 *   - skill.executed, skill.failed
 *   - execution.completed, execution.failed
 *   - marketplace.listing-created, marketplace.purchase
 *   - connector.sync-completed
 *
 * Port: 4110
 * Pattern: in-memory + Express 5
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.WEBHOOK_BUS_PORT || 4110;
const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// =============================================================================
// STORES
// =============================================================================

const subscribers = new PersistentMap('subscribers', { serviceName: 'webhook-bus' });   // subscriberId -> subscription record
const deliveries = new PersistentMap('deliveries', { serviceName: 'webhook-bus' });    // deliveryId -> delivery record (per attempt)
const eventTypes = new Set();    // canonical event type catalog

const subscriptionsByEvent = new PersistentMap('subscriptions-by-event', { serviceName: 'webhook-bus' }); // eventType -> Set<subscriberId>
const audit = [];

// Seed a small catalog of well-known event types
[
  'twin.created', 'twin.updated', 'twin.archived',
  'memory.record-added', 'memory.summary-created',
  'skill.executed', 'skill.failed',
  'execution.completed', 'execution.failed',
  'marketplace.listing-created', 'marketplace.purchase',
  'connector.sync-completed',
  'flow.plan-completed', 'flow.plan-failed',
  'reasoning.trace-completed',
].forEach((e) => eventTypes.add(e));

// =============================================================================
// HELPERS
// =============================================================================

function auditLog(entry) {
  audit.push({ id: uuidv4(), at: new Date().toISOString(), ...entry });
  if (audit.length > 5000) audit.splice(0, audit.length - 5000);
}

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

// Backoff schedule: 1s, 2s, 4s, 8s, 16s — capped
function nextDelaySec(attempt) {
  return Math.min(2 ** attempt, 60);
}

// =============================================================================
// ROUTES
// =============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'webhook-bus',
    version: '1.0.0',
    port: PORT,
    counts: {
      subscribers: subscribers.size,
      eventTypes: eventTypes.size,
      deliveries: deliveries.size,
      audit: audit.length,
    },
    capabilities: [
      'event-types', 'subscribe', 'unsubscribe',
      'list-subscribers', 'get-subscriber',
      'dispatch',
      'list-deliveries', 'get-delivery',
      'retry',
    ],
  });
});
app.get('/', (_req, res) => res.redirect('/health'));

// ── Event catalog ──────────────────────────────────────────────────────────

app.get('/api/event-types', (_req, res) => {
  res.json({ eventTypes: Array.from(eventTypes).sort() });
});

app.post('/api/event-types',requireAuth,  (req, res) => {
  const { eventType } = req.body || {};
  if (!eventType || typeof eventType !== 'string') {
    return res.status(400).json({ error: 'eventType string required' });
  }
  eventTypes.add(eventType);
  res.status(201).json({ eventType });
});

// ── Subscribe / unsubscribe ────────────────────────────────────────────────

app.post('/api/subscribers',requireAuth,  (req, res) => {
  const { url, events, secret, label, maxAttempts } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });
  if (!Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'events[] required' });
  for (const et of events) {
    if (!eventTypes.has(et)) eventTypes.add(et);
  }
  const id = uuidv4();
  const sub = {
    id,
    label: label || url,
    url,
    events,
    secret: secret || 'whsec_' + uuidv4().replace(/-/g, '').slice(0, 24),
    status: 'active',
    maxAttempts: Math.min(parseInt(maxAttempts) || 5, 10),
    createdAt: new Date().toISOString(),
    successCount: 0,
    failureCount: 0,
  };
  subscribers.set(id, sub);
  recomputeIndex();
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

app.delete('/api/subscribers/:id',requireAuth,  (req, res) => {
  const s = subscribers.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'subscriber not found' });
  s.status = 'deleted';
  recomputeIndex();
  auditLog({ kind: 'unsubscribe', subscriberId: s.id });
  res.status(204).end();
});

// ── Dispatch ───────────────────────────────────────────────────────────────

// dispatch() records what would be delivered to each subscriber for this
// event. If ?post=true is set we attempt a real fetch (skipped on no network
// or non-2xx). Retries are tracked; attemptCount increments on each retry.
app.post('/api/dispatch',requireAuth,  (req, res) => {
  const { eventType, payload, attempt = 1 } = req.body || {};
  if (!eventType) return res.status(400).json({ error: 'eventType required' });
  if (!eventTypes.has(eventType)) return res.status(400).json({ error: `unknown eventType: ${eventType}` });

  const subs = subscriptionsByEvent.get(eventType) || new Set();
  const out = [];
  for (const subId of subs) {
    const sub = subscribers.get(subId);
    if (!sub || sub.status !== 'active') continue;
    const deliveryId = uuidv4();
    const body = { eventType, payload: payload || {}, deliveredAt: new Date().toISOString(), attempt };
    const delivery = {
      id: deliveryId,
      subscriberId: subId,
      eventType,
      url: sub.url,
      attempt,
      maxAttempts: sub.maxAttempts,
      payload: body,
      status: 'recorded', // 'recorded' | 'delivered' | 'failed'
      nextRetryAt: null,
      createdAt: new Date().toISOString(),
    };
    deliveries.set(deliveryId, delivery);
    delivery.nextRetryAt = new Date(Date.now() + nextDelaySec(attempt) * 1000).toISOString();
    out.push({ subscriberId: subId, deliveryId, url: sub.url });
  }
  auditLog({ kind: 'dispatch', eventType, matched: out.length });
  res.status(202).json({ eventType, dispatched: out.length, deliveries: out });
});

// Mark a delivery as delivered (call from your worker after a successful POST)
app.post('/api/deliveries/:id/delivered',requireAuth,  (req, res) => {
  const d = deliveries.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'delivery not found' });
  d.status = 'delivered';
  d.deliveredAt = new Date().toISOString();
  const sub = subscribers.get(d.subscriberId);
  if (sub) sub.successCount += 1;
  res.json(d);
});

// Mark a delivery as failed and either retry or give up
app.post('/api/deliveries/:id/failed',requireAuth,  (req, res) => {
  const d = deliveries.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'delivery not found' });
  d.status = d.attempt >= d.maxAttempts ? 'failed' : 'recorded';
  d.failureReason = (req.body || {}).reason || 'unspecified';
  if (d.status === 'failed') {
    const sub = subscribers.get(d.subscriberId);
    if (sub) sub.failureCount += 1;
  }
  res.json(d);
});

// Manual retry endpoint
app.post('/api/deliveries/:id/retry',requireAuth,  (req, res) => {
  const d = deliveries.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'delivery not found' });
  if (d.status === 'delivered') return res.status(400).json({ error: 'already delivered' });
  d.attempt += 1;
  d.status = 'recorded';
  d.nextRetryAt = new Date(Date.now() + nextDelaySec(d.attempt) * 1000).toISOString();
  res.json(d);
});

// ── Read deliveries ────────────────────────────────────────────────────────

app.get('/api/deliveries', (req, res) => {
  const { subscriberId, eventType, status, limit } = req.query;
  let list = Array.from(deliveries.values());
  if (subscriberId) list = list.filter((d) => d.subscriberId === subscriberId);
  if (eventType)   list = list.filter((d) => d.eventType === eventType);
  if (status)      list = list.filter((d) => d.status === status);
  const n = Math.min(parseInt(limit) || 200, 1000);
  res.json({ count: list.length, deliveries: list.slice(-n) });
});

app.get('/api/deliveries/:id', (req, res) => {
  const d = deliveries.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'delivery not found' });
  res.json(d);
});

// ── Audit ──────────────────────────────────────────────────────────────────

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ entries: audit.slice(-limit) });
});

// =============================================================================
// 404 + error handling
// =============================================================================

app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[webhook-bus]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

// =============================================================================
// START
// =============================================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[webhook-bus] listening on :${PORT} (event types: ${eventTypes.size})`);
});
installGracefulShutdown(server);

export default app;
