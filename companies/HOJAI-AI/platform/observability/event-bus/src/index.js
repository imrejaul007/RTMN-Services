/**
 * Event Bus Service v2.0
 * ----------------------
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
 * NOTE: Persistence is in-memory. All events, subscriptions, and dead-letter
 * entries live in JS Maps. Service restart wipes state. This is intentional
 * for the in-process broker; production deployments should plug a real
 * persistence layer (Redis / Kafka / Postgres) behind the same interface.
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
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = parseInt(process.env.PORT || '4510', 10);
const SERVICE_NAME = 'event-bus';
const VERSION = '2.0.0';

// Webhook signing secret — overridable in production via env
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'rtmn-event-bus-secret';

// Capacity limits
const MAX_EVENTS = parseInt(process.env.MAX_EVENTS || '10000', 10);
const MAX_DEAD_LETTERS = parseInt(process.env.MAX_DEAD_LETTERS || '1000', 10);
const WEBHOOK_TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000', 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================
// In-memory stores
// =====================
const events = new PersistentMap('events', { serviceName: 'event-bus' });          // eventId -> event
const subscriptions = new PersistentMap('subscriptions', { serviceName: 'event-bus' });   // subId -> subscription
const deadLetters = new PersistentMap('dead-letters', { serviceName: 'event-bus' });     // dlqId -> deadLetter entry
const stats = {
  eventsPublished: 0,
  eventsDelivered: 0,
  eventsRetried: 0,
  eventsDeadLettered: 0,
  deliveryAttempts: 0,
  schemaMismatches: 0
};

// Insertion order tracking (Map preserves insertion order, so the array tracks newest first)
const eventOrder = [];   // array of eventIds, index 0 is oldest, end is newest

// =====================
// Seed data
// =====================
function seed() {
  // 1 subscription
  const seedSub = {
    id: uuidv4(),
    typePattern: 'order.*',
    webhookUrl: 'http://localhost:5500/api/orders/webhook',
    headers: { 'X-Tenant': 'demo' },
    filter: null,
    retryPolicy: { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 },
    schemaVersion: null,
    createdAt: new Date().toISOString(),
    active: true
  };
  subscriptions.set(seedSub.id, seedSub);

  // 5 sample events
  const sample = [
    { type: 'order.created',     source: 'mock', payload: { orderId: 'o-1001', amount: 49.99, tenantId: 't-1' } },
    { type: 'order.updated',     source: 'mock', payload: { orderId: 'o-1001', status: 'paid' } },
    { type: 'user.created',      source: 'mock', payload: { userId: 'u-2001', email: 'alice@example.com' } },
    { type: 'payment.completed', source: 'mock', payload: { paymentId: 'p-3001', amount: 49.99, tenantId: 't-1' } },
    { type: 'inventory.low',     source: 'mock', payload: { sku: 'sku-42', qty: 3 } }
  ];
  for (const s of sample) {
    const ev = makeEvent(s);
    storeEvent(ev);
  }
  console.log(`[${SERVICE_NAME}] Seeded 1 subscription + ${sample.length} events`);
}

function makeEvent({ type, source, payload, headers, schema_version }) {
  return {
    id: uuidv4(),
    type,
    source: source || 'unknown',
    payload: payload || {},
    headers: headers || {},
    schema_version: schema_version || '1.0',
    timestamp: new Date().toISOString()
  };
}

function storeEvent(ev) {
  events.set(ev.id, ev);
  eventOrder.push(ev.id);
  // Evict oldest if over capacity
  while (events.size > MAX_EVENTS) {
    const oldId = eventOrder.shift();
    events.delete(oldId);
  }
  stats.eventsPublished++;
}

// =====================
// Type pattern matching
// =====================
function matchTypePattern(pattern, type) {
  if (!pattern || pattern === '*') return true;
  if (pattern === type) return true;
  // `prefix.*` matches `prefix.X`, `prefix.X.Y`, etc.
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return type === prefix || type.startsWith(prefix + '.');
  }
  // `*.suffix` matches `X.suffix`, `X.Y.suffix`, etc.
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    const parts = type.split('.');
    return parts[parts.length - 1] === suffix;
  }
  return false;
}

// =====================
// Payload filter evaluation
// Supports dotted paths like "payload.tenantId", "payload.tags.color"
// =====================
function evaluateFilter(filter, event) {
  if (!filter || typeof filter !== 'object') return true;
  for (const [path, expected] of Object.entries(filter)) {
    const actual = getNested(event, path);
    if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

function getNested(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

// =====================
// Schema version comparison
// =====================
function schemaVersionAccepts(subscriberVersion, eventVersion) {
  // Accepts null/undefined subscriber version = any
  if (!subscriberVersion) return true;
  if (!eventVersion) return true;
  // Subscriber may declare minimum, e.g. "1.0+" meaning >=1.0
  let minVersion = subscriberVersion;
  let isMin = false;
  if (typeof subscriberVersion === 'string' && subscriberVersion.endsWith('+')) {
    minVersion = subscriberVersion.slice(0, -1);
    isMin = true;
  }
  const parseVersion = (v) => {
    if (typeof v !== 'string') return [0, 0];
    const [maj, min = '0'] = v.split('.');
    return [parseInt(maj, 10) || 0, parseInt(min, 10) || 0];
  };
  const [sMaj, sMin] = parseVersion(minVersion);
  const [eMaj, eMin] = parseVersion(eventVersion);
  if (isMin) {
    if (eMaj > sMaj) return true;
    if (eMaj === sMaj && eMin >= sMin) return true;
    return false;
  }
  return sMaj === eMaj && sMin === eMin;
}

// =====================
// Webhook signing
// =====================
function signBody(body, secret = WEBHOOK_SECRET) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

// =====================
// Webhook delivery (HTTP POST)
// =====================
async function deliverWebhook(sub, event, attempt) {
  stats.deliveryAttempts++;
  const body = JSON.stringify({
    id: event.id,
    type: event.type,
    source: event.source,
    payload: event.payload,
    headers: event.headers,
    schema_version: event.schema_version,
    timestamp: event.timestamp
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
        ...(sub.headers || {})
      },
      body,
      signal: controller.signal
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
  // Pattern + filter + schema checks
  if (!sub.active) return;
  if (!matchTypePattern(sub.typePattern, event.type)) return;
  if (!evaluateFilter(sub.filter, event)) return;
  if (!schemaVersionAccepts(sub.schemaVersion, event.schema_version)) {
    stats.schemaMismatches++;
    console.warn(
      `[${SERVICE_NAME}] schema mismatch: sub=${sub.id} event=${event.id} ` +
      `subVersion=${sub.schemaVersion} eventVersion=${event.schema_version} — delivering anyway`
    );
  }

  const policy = sub.retryPolicy || { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 };
  let attempt = 1;
  let result = await deliverWebhook(sub, event, attempt);

  while (!result.ok && attempt < policy.maxAttempts) {
    stats.eventsRetried++;
    attempt++;
    const delay = policy.backoffMs * Math.pow(policy.backoffMultiplier, attempt - 2);
    await sleep(delay);
    result = await deliverWebhook(sub, event, attempt);
  }

  if (!result.ok) {
    // Dead-letter
    const dlqEntry = {
      id: uuidv4(),
      event,
      subscriptionId: sub.id,
      webhookUrl: sub.webhookUrl,
      attempts: attempt,
      lastError: result.error,
      lastStatus: result.status,
      deadLetteredAt: new Date().toISOString()
    };
    deadLetters.set(dlqEntry.id, dlqEntry);
    // Bound the DLQ
    while (deadLetters.size > MAX_DEAD_LETTERS) {
      const firstKey = deadLetters.keys().next().value;
      deadLetters.delete(firstKey);
    }
    stats.eventsDeadLettered++;
    console.warn(
      `[${SERVICE_NAME}] DLQ: event=${event.id} sub=${sub.id} attempts=${attempt} error=${result.error}`
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fanOut(event) {
  // Async, non-blocking
  for (const sub of subscriptions.values()) {
    setImmediate(() => {
      dispatchToSubscription(sub, event).catch((err) => {
        console.error(`[${SERVICE_NAME}] dispatch error sub=${sub.id}:`, err.message);
      });
    });
  }
}

// =====================
// Health
// =====================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    version: VERSION,
    port: PORT,
    timestamp: new Date().toISOString(),
    queueSize: stats.eventsPublished - stats.eventsDelivered - stats.eventsDeadLettered
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: SERVICE_NAME });
});

// =====================
// Publishing
// =====================
app.post('/api/events',requireAuth,  (req, res) => {
  const { type, source, payload, headers, schema_version } = req.body || {};
  if (!type) return res.status(400).json({ error: 'type required' });
  const event = makeEvent({
    type,
    source,
    payload,
    headers,
    schema_version
  });
  storeEvent(event);
  fanOut(event);
  res.status(201).json(event);
});

app.post('/api/events/batch',requireAuth,  (req, res) => {
  const { events: batch } = req.body || {};
  if (!Array.isArray(batch)) {
    return res.status(400).json({ error: 'events array required' });
  }
  const stored = [];
  for (const item of batch) {
    if (!item || !item.type) continue;
    const ev = makeEvent(item);
    storeEvent(ev);
    fanOut(ev);
    stored.push(ev);
  }
  res.status(201).json({ count: stored.length, events: stored });
});

// =====================
// Event listing / retrieval
// =====================
app.get('/api/events', (req, res) => {
  const { type, source, since, until, limit, schemaVersion } = req.query;
  let result = Array.from(events.values());

  if (type) result = result.filter((e) => matchTypePattern(String(type), e.type));
  if (source) result = result.filter((e) => e.source === source);
  if (schemaVersion) result = result.filter((e) => e.schema_version === schemaVersion);
  if (since) {
    const sinceMs = Date.parse(since);
    if (!isNaN(sinceMs)) result = result.filter((e) => Date.parse(e.timestamp) >= sinceMs);
  }
  if (until) {
    const untilMs = Date.parse(until);
    if (!isNaN(untilMs)) result = result.filter((e) => Date.parse(e.timestamp) <= untilMs);
  }

  // Newest first
  result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const lim = limit ? parseInt(limit, 10) : 100;
  result = result.slice(0, lim);
  res.json({ count: result.length, events: result });
});

app.get('/api/events/:id', (req, res) => {
  const ev = events.get(req.params.id);
  if (!ev) return res.status(404).json({ error: 'event not found' });
  res.json(ev);
});

app.post('/api/events/replay/:id',requireAuth,  (req, res) => {
  const ev = events.get(req.params.id);
  if (!ev) return res.status(404).json({ error: 'event not found' });
  // Re-publish — store a new event id but copy payload? Spec says re-publish.
  // We re-fan-out the SAME event to current subscribers.
  fanOut(ev);
  res.json({ ok: true, replayed: ev.id, type: ev.type });
});

// =====================
// Subscription CRUD
// =====================
app.post('/api/subscriptions',requireAuth,  (req, res) => {
  const {
    typePattern,
    webhookUrl,
    headers,
    filter,
    retryPolicy,
    schemaVersion
  } = req.body || {};

  if (!typePattern) return res.status(400).json({ error: 'typePattern required' });
  if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl required' });

  const sub = {
    id: uuidv4(),
    typePattern,
    webhookUrl,
    headers: headers || {},
    filter: filter || null,
    retryPolicy: retryPolicy || { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 },
    schemaVersion: schemaVersion || null,
    createdAt: new Date().toISOString(),
    active: true
  };
  subscriptions.set(sub.id, sub);
  res.status(201).json(sub);
});

app.get('/api/subscriptions', (req, res) => {
  res.json({ count: subscriptions.size, subscriptions: Array.from(subscriptions.values()) });
});

app.get('/api/subscriptions/:id', (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'subscription not found' });
  res.json(sub);
});

app.patch('/api/subscriptions/:id',requireAuth,  (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'subscription not found' });
  const allowed = ['typePattern', 'webhookUrl', 'headers', 'filter', 'retryPolicy', 'schemaVersion', 'active'];
  for (const k of allowed) {
    if (k in req.body) sub[k] = req.body[k];
  }
  sub.updatedAt = new Date().toISOString();
  subscriptions.set(sub.id, sub);
  res.json(sub);
});

app.delete('/api/subscriptions/:id',requireAuth,  (req, res) => {
  const ok = subscriptions.delete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'subscription not found' });
  res.json({ ok: true, deleted: req.params.id });
});

// =====================
// Subscription-level replay
// Re-deliver all events since `cursor` (event id) to the given subscription.
// =====================
app.post('/api/subscriptions/:id/replay-from/:cursor',requireAuth,  (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'subscription not found' });
  const cursorIndex = eventOrder.indexOf(req.params.cursor);
  const startIdx = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const replayed = [];
  for (let i = startIdx; i < eventOrder.length; i++) {
    const ev = events.get(eventOrder[i]);
    if (!ev) continue;
    setImmediate(() => {
      dispatchToSubscription(sub, ev).catch((err) => {
        console.error(`[${SERVICE_NAME}] replay dispatch error:`, err.message);
      });
    });
    replayed.push(ev.id);
  }
  res.json({ ok: true, count: replayed.length, replayed, subscriptionId: sub.id });
});

// =====================
// Dead-letter queue
// =====================
app.get('/api/dead-letter', (req, res) => {
  res.json({ count: deadLetters.size, entries: Array.from(deadLetters.values()) });
});

app.post('/api/dead-letter/:id/replay',requireAuth,  (req, res) => {
  const dlq = deadLetters.get(req.params.id);
  if (!dlq) return res.status(404).json({ error: 'dead-letter entry not found' });
  const sub = subscriptions.get(dlq.subscriptionId);
  if (!sub) return res.status(404).json({ error: 'subscription no longer exists' });
  deadLetters.delete(dlq.id);
  setImmediate(() => {
    dispatchToSubscription(sub, dlq.event).catch((err) => {
      console.error(`[${SERVICE_NAME}] DLQ replay error:`, err.message);
    });
  });
  res.json({ ok: true, replayed: dlq.id, eventId: dlq.event.id, subscriptionId: sub.id });
});

// =====================
// Stats
// =====================
app.get('/api/stats', (req, res) => {
  const totalSubs = subscriptions.size;
  const activeSubs = Array.from(subscriptions.values()).filter((s) => s.active).length;
  res.json({
    events: {
      stored: events.size,
      capacity: MAX_EVENTS,
      published: stats.eventsPublished,
      delivered: stats.eventsDelivered,
      retried: stats.eventsRetried,
      deadLettered: stats.eventsDeadLettered
    },
    subscriptions: {
      total: totalSubs,
      active: activeSubs,
      inactive: totalSubs - activeSubs
    },
    deadLetter: {
      size: deadLetters.size,
      capacity: MAX_DEAD_LETTERS
    },
    delivery: {
      attempts: stats.deliveryAttempts,
      successRate:
        stats.deliveryAttempts > 0
          ? Number((stats.eventsDelivered / stats.deliveryAttempts).toFixed(4))
          : 0
    },
    schemaMismatches: stats.schemaMismatches,
    uptimeMs: process.uptime() * 1000
  });
});

// =====================
// 404 + error handlers
// =====================
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] Unhandled error:`, err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: err.message || 'unexpected error'
  });
});

// =====================
// Start
// =====================
const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Event Bus v${VERSION} running on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] In-memory persistence (Map). Restart wipes state.`);
  if (process.env.SEED !== 'false') {
    seed();
  }
});
installGracefulShutdown(server);

export default app;
