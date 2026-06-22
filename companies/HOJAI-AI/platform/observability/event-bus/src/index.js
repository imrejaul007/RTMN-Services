/**
 * Event Bus Service v3.0 (ADR-0009 Phase 2 — Redis Streams backed)
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
 * ADR-0009 Phase 2: persistence is now backed by Redis Streams (via
 * @rtmn/shared/event-bus) plus Redis hashes for indexable state
 * (subscriptions, DLQ). The HTTP API is unchanged — every external
 * endpoint behaves identically to v2.0, but events survive service
 * restarts.
 *
 *   - Incoming HTTP POST /api/events → index locally + publishAsync to
 *     the rtmn:events stream so other services see it.
 *   - On boot, subscribe to rtmn:events and route every event through
 *     fanOut() (without re-publishing). This means services that
 *     emit() directly via the EventBus helper also flow through
 *     webhook fan-out.
 *   - Subscriptions live in a Redis hash (plus the in-memory map).
 *   - DLQ lives in a Redis list capped at MAX_DEAD_LETTERS.
 *
 * If Redis is unreachable, the service logs a warning and falls back
 * to in-memory PersistentMap so dev/test still works.
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { EventBus } from '@rtmn/shared/event-bus';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = parseInt(process.env.PORT || '4510', 10);
const SERVICE_NAME = 'event-bus';
const VERSION = '3.0.0';

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
// Persistence layer (ADR-0009 Phase 2)
// Redis Streams + Redis hash + Redis list. Falls back to in-memory
// if REDIS_URL is unset or unreachable.
// =====================
const REDIS_URL = process.env.REDIS_URL || null;
const STREAM_NAME = process.env.EVENT_STREAM_NAME || 'rtmn:events';
const EVENT_INDEX_KEY = 'event-bus:events-by-id';
const SUBSCRIPTIONS_KEY = 'event-bus:subscriptions';
const DLQ_KEY = 'event-bus:dlq';

let redis = null;
let useRedis = false;
if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    redis.on('ready', () => {
      useRedis = true;
      console.log(`[${SERVICE_NAME}] Connected to Redis at ${REDIS_URL}`);
    });
    redis.on('error', (err) => {
      if (useRedis) console.warn(`[${SERVICE_NAME}] Redis error: ${err.message}`);
      useRedis = false;
    });
  } catch (err) {
    console.warn(`[${SERVICE_NAME}] Failed to init Redis: ${err.message} — using in-memory fallback`);
    redis = null;
  }
} else {
  console.log(`[${SERVICE_NAME}] REDIS_URL not set — using in-memory stores`);
}

// In-memory fallback stores
const events = new PersistentMap('events', { serviceName: 'event-bus' });
const subscriptions = new PersistentMap('subscriptions', { serviceName: 'event-bus' });
const deadLetters = new PersistentMap('dead-letters', { serviceName: 'event-bus' });
const eventOrder = [];

const stats = {
  eventsPublished: 0,
  eventsDelivered: 0,
  eventsRetried: 0,
  eventsDeadLettered: 0,
  deliveryAttempts: 0,
  schemaMismatches: 0,
  redisFallbackHits: 0,
};

// =====================
// EventBus (Redis Streams publisher/subscriber)
// =====================
const eventBus = new EventBus({
  serviceName: 'event-bus',
  streamPrefix: STREAM_NAME.endsWith(':events') ? STREAM_NAME.slice(0, -':events'.length) + ':' : 'rtmn:',
  url: REDIS_URL || undefined,
  maxLen: MAX_EVENTS,
});

let eventBusConnected = false;
eventBus.connect().then(() => {
  eventBusConnected = true;
  // Subscribe to all events on the shared stream so services that emit
  // directly (SUTAR / Nexha / etc.) flow through our webhook fan-out.
  // We do NOT re-publish — that would loop. The HTTP POST /api/events
  // path does the index + publishAsync once; this consumer only does
  // fanOut to local webhook subscribers.
  return eventBus.subscribe(['*'], async (event) => {
    try {
      const legacyEvent = {
        id: event.eventId,
        type: event.type,
        source: event.source,
        payload: event.payload,
        headers: {},
        schema_version: event.schemaVersion,
        timestamp: event.emittedAt,
        tenantId: event.tenantId,
      };
      // If we originated this event via HTTP POST, we already stored
      // it locally — skip storage to avoid duplicates, but still
      // fan out to subscribers (in case any subscribed AFTER the POST).
      if (!events.has(legacyEvent.id)) {
        indexEvent(legacyEvent);
      }
      fanOut(legacyEvent);
    } catch (err) {
      console.error(`[${SERVICE_NAME}] stream consumer error:`, err.message);
    }
  });
}).catch((err) => {
  console.warn(`[${SERVICE_NAME}] EventBus connect failed: ${err.message} — inbound stream fan-out disabled`);
});

// =====================
// Redis-backed store helpers
// =====================
async function redisSetEvent(ev) {
  if (!useRedis || !redis) return false;
  try {
    await redis.hset(EVENT_INDEX_KEY, ev.id, JSON.stringify(ev));
    return true;
  } catch (err) { stats.redisFallbackHits++; return false; }
}
async function redisGetEvent(id) {
  if (!useRedis || !redis) return null;
  try {
    const raw = await redis.hget(EVENT_INDEX_KEY, id);
    return raw ? JSON.parse(raw) : null;
  } catch (err) { stats.redisFallbackHits++; return null; }
}
async function redisListEvents() {
  if (!useRedis || !redis) return null;
  try {
    const all = await redis.hvals(EVENT_INDEX_KEY);
    return all.map((s) => JSON.parse(s));
  } catch (err) { stats.redisFallbackHits++; return null; }
}
async function redisAddSubscription(sub) {
  if (!useRedis || !redis) return false;
  try { await redis.hset(SUBSCRIPTIONS_KEY, sub.id, JSON.stringify(sub)); return true; }
  catch (err) { stats.redisFallbackHits++; return false; }
}
async function redisGetSubscription(id) {
  if (!useRedis || !redis) return null;
  try {
    const raw = await redis.hget(SUBSCRIPTIONS_KEY, id);
    return raw ? JSON.parse(raw) : null;
  } catch (err) { stats.redisFallbackHits++; return null; }
}
async function redisListSubscriptions() {
  if (!useRedis || !redis) return null;
  try {
    const all = await redis.hvals(SUBSCRIPTIONS_KEY);
    return all.map((s) => JSON.parse(s));
  } catch (err) { stats.redisFallbackHits++; return null; }
}
async function redisDeleteSubscription(id) {
  if (!useRedis || !redis) return false;
  try { const n = await redis.hdel(SUBSCRIPTIONS_KEY, id); return n > 0; }
  catch (err) { stats.redisFallbackHits++; return false; }
}
async function redisAddDLQ(entry) {
  if (!useRedis || !redis) return false;
  try {
    await redis.rpush(DLQ_KEY, JSON.stringify(entry));
    await redis.ltrim(DLQ_KEY, -MAX_DEAD_LETTERS, -1);
    return true;
  } catch (err) { stats.redisFallbackHits++; return false; }
}
async function redisListDLQ() {
  if (!useRedis || !redis) return null;
  try {
    const all = await redis.lrange(DLQ_KEY, 0, -1);
    return all.map((s) => JSON.parse(s));
  } catch (err) { stats.redisFallbackHits++; return null; }
}
async function redisDeleteDLQ(id) {
  if (!useRedis || !redis) return false;
  try {
    const all = await redis.lrange(DLQ_KEY, 0, -1);
    for (let i = 0; i < all.length; i++) {
      const entry = JSON.parse(all[i]);
      if (entry.id === id) {
        await redis.lrem(DLQ_KEY, 1, all[i]);
        return true;
      }
    }
    return false;
  } catch (err) { stats.redisFallbackHits++; return false; }
}

// =====================
// Seed data
// =====================
async function seed() {
  // Idempotency: only seed if the stores are empty (first boot ever).
  const hasSeed = useRedis
    ? await redis.hlen(EVENT_INDEX_KEY).then((n) => n > 0)
    : events.size > 0;
  if (hasSeed) {
    console.log(`[${SERVICE_NAME}] Skipping seed — data already present`);
    return;
  }

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
  await persistSubscription(seedSub);

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
    await persistEvent(ev);
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

// indexEvent stores an event in memory + Redis hash but does NOT
// publish back to the stream. Used by both the HTTP POST path and
// the stream consumer (which must not re-publish, or we'd loop).
function indexEvent(ev) {
  if (events.has(ev.id)) return; // dedupe
  events.set(ev.id, ev);
  eventOrder.push(ev.id);
  while (events.size > MAX_EVENTS) {
    const oldId = eventOrder.shift();
    events.delete(oldId);
  }
  stats.eventsPublished++;
  redisSetEvent(ev).catch(() => undefined);
}

// storeEvent is the HTTP POST path: index locally AND publish to the
// stream so other services see it.
function storeEvent(ev) {
  indexEvent(ev);
  if (eventBusConnected) {
    eventBus.publishAsync(ev.type, ev.payload, {
      tenantId: ev.payload?.tenantId ?? null,
      source: ev.source,
      schemaVersion: ev.schema_version,
    }).catch((err) => {
      console.warn(`[${SERVICE_NAME}] stream publish failed: ${err.message}`);
    });
  }
}

async function persistEvent(ev) {
  indexEvent(ev);
}

async function persistSubscription(sub) {
  subscriptions.set(sub.id, sub);
  await redisAddSubscription(sub);
}
async function persistSubscriptionUpdate(sub) {
  subscriptions.set(sub.id, sub);
  await redisAddSubscription(sub);
}
async function persistSubscriptionDelete(id) {
  subscriptions.delete(id);
  await redisDeleteSubscription(id);
}
async function persistDLQ(entry) {
  deadLetters.set(entry.id, entry);
  while (deadLetters.size > MAX_DEAD_LETTERS) {
    const firstKey = deadLetters.keys().next().value;
    deadLetters.delete(firstKey);
  }
  await redisAddDLQ(entry);
}
async function persistDLQDelete(id) {
  deadLetters.delete(id);
  await redisDeleteDLQ(id);
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
    // Use the persistence helper so in-memory + Redis stay in sync
    // (Redis list is trimmed to MAX_DEAD_LETTERS via LTRIM).
    persistDLQ(dlqEntry).catch((err) => {
      console.warn(`[${SERVICE_NAME}] DLQ persist failed: ${err.message}`);
    });
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
    redis: useRedis ? 'connected' : (REDIS_URL ? 'fallback' : 'disabled'),
    eventBusStream: eventBusConnected ? 'subscribed' : 'disconnected',
    timestamp: new Date().toISOString(),
    queueSize: stats.eventsPublished - stats.eventsDelivered - stats.eventsDeadLettered
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: SERVICE_NAME, version: VERSION });
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
app.get('/api/events', async (req, res) => {
  const { type, source, since, until, limit, schemaVersion } = req.query;
  // Merge in-memory + Redis (de-duped by id)
  let result;
  if (useRedis) {
    const redisEvents = (await redisListEvents()) || [];
    const seen = new Set(redisEvents.map((e) => e.id));
    const memOnly = Array.from(events.values()).filter((e) => !seen.has(e.id));
    result = [...redisEvents, ...memOnly];
  } else {
    result = Array.from(events.values());
  }

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

app.get('/api/events/:id', async (req, res) => {
  let ev = events.get(req.params.id);
  if (!ev) ev = await redisGetEvent(req.params.id);
  if (!ev) return res.status(404).json({ error: 'event not found' });
  res.json(ev);
});

app.post('/api/events/replay/:id', requireAuth, async (req, res) => {
  let ev = events.get(req.params.id);
  if (!ev) ev = await redisGetEvent(req.params.id);
  if (!ev) return res.status(404).json({ error: 'event not found' });
  fanOut(ev);
  res.json({ ok: true, replayed: ev.id, type: ev.type });
});

// =====================
// Subscription CRUD
// =====================
app.post('/api/subscriptions',requireAuth,  async (req, res) => {
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
  await persistSubscription(sub);
  res.status(201).json(sub);
});

app.get('/api/subscriptions', async (req, res) => {
  let list;
  if (useRedis) {
    const redisList = (await redisListSubscriptions()) || [];
    const seen = new Set(redisList.map((s) => s.id));
    const memOnly = Array.from(subscriptions.values()).filter((s) => !seen.has(s.id));
    list = [...redisList, ...memOnly];
  } else {
    list = Array.from(subscriptions.values());
  }
  res.json({ count: list.length, subscriptions: list });
});

app.get('/api/subscriptions/:id', async (req, res) => {
  let sub = subscriptions.get(req.params.id);
  if (!sub) sub = await redisGetSubscription(req.params.id);
  if (!sub) return res.status(404).json({ error: 'subscription not found' });
  res.json(sub);
});

app.patch('/api/subscriptions/:id',requireAuth,  async (req, res) => {
  let sub = subscriptions.get(req.params.id);
  if (!sub) sub = await redisGetSubscription(req.params.id);
  if (!sub) return res.status(404).json({ error: 'subscription not found' });
  const allowed = ['typePattern', 'webhookUrl', 'headers', 'filter', 'retryPolicy', 'schemaVersion', 'active'];
  for (const k of allowed) {
    if (k in req.body) sub[k] = req.body[k];
  }
  sub.updatedAt = new Date().toISOString();
  await persistSubscriptionUpdate(sub);
  res.json(sub);
});

app.delete('/api/subscriptions/:id',requireAuth,  async (req, res) => {
  const ok = await persistSubscriptionDelete(req.params.id);
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
app.get('/api/dead-letter', async (req, res) => {
  let list;
  if (useRedis) {
    const redisList = (await redisListDLQ()) || [];
    const seen = new Set(redisList.map((d) => d.id));
    const memOnly = Array.from(deadLetters.values()).filter((d) => !seen.has(d.id));
    list = [...redisList, ...memOnly];
  } else {
    list = Array.from(deadLetters.values());
  }
  res.json({ count: list.length, entries: list });
});

app.post('/api/dead-letter/:id/replay', requireAuth, async (req, res) => {
  // Look in both stores (Phase 2)
  let dlq = deadLetters.get(req.params.id);
  if (!dlq) {
    const list = (await redisListDLQ()) || [];
    dlq = list.find((d) => d.id === req.params.id);
  }
  if (!dlq) return res.status(404).json({ error: 'dead-letter entry not found' });
  // Always remove the DLQ entry first so cleanup happens even if the
  // subscription is gone. Then attempt to re-dispatch if we still have
  // a subscription to dispatch to.
  await persistDLQDelete(dlq.id);
  let sub = subscriptions.get(dlq.subscriptionId);
  if (!sub) sub = await redisGetSubscription(dlq.subscriptionId);
  if (!sub) {
    return res.json({
      ok: true,
      deleted: dlq.id,
      note: 'subscription no longer exists — entry removed but no re-dispatch',
      eventId: dlq.event.id,
    });
  }
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
app.get('/api/stats', async (req, res) => {
  const totalSubs = subscriptions.size;
  const activeSubs = Array.from(subscriptions.values()).filter((s) => s.active).length;
  res.json({
    service: { name: SERVICE_NAME, version: VERSION },
    persistence: {
      mode: useRedis ? 'redis' : 'in-memory',
      redisUrl: REDIS_URL ? REDIS_URL.replace(/\/\/.*@/, '//***@') : null,
      fallbackHits: stats.redisFallbackHits,
    },
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
const server = app.listen(PORT, async () => {
  console.log(`[${SERVICE_NAME}] Event Bus v${VERSION} running on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] Persistence: ${useRedis ? 'Redis' : 'in-memory (fallback)'}`);
  if (process.env.SEED !== 'false') {
    const trySeed = async () => {
      if (REDIS_URL) {
        for (let i = 0; i < 20 && !useRedis; i++) await sleep(100);
      }
      await seed();
    };
    trySeed().catch((err) => console.error(`[${SERVICE_NAME}] seed error:`, err.message));
  }
});

const shutdown = async (signal) => {
  console.log(`[${SERVICE_NAME}] Received ${signal}, shutting down...`);
  try { await eventBus.quit(); } catch (_) { /* ignore */ }
  if (redis) { try { await redis.quit(); } catch (_) { /* ignore */ } }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

installGracefulShutdown(server);

export default app;
