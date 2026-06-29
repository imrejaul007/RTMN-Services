/**
 * LoopOS Event Bus
 * Service-to-service communication
 * Port: 4752
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4752;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// In-memory stores
const subscriptions = new Map();  // eventType -> Set<subscription>
const eventHistory = [];
const MAX_HISTORY = 10000;

// Event types that services can emit
const EVENT_TYPES = {
  // Loop events
  LOOP_CREATED: 'loop.created',
  LOOP_STARTED: 'loop.started',
  LOOP_COMPLETED: 'loop.completed',
  LOOP_FAILED: 'loop.failed',
  LOOP_PAUSED: 'loop.paused',

  // Budget events
  BUDGET_WARNING: 'budget.warning',
  BUDGET_EXCEEDED: 'budget.exceeded',
  BUDGET_RESET: 'budget.reset',

  // Trust events
  TRUST_UPDATED: 'trust.updated',
  TRUST_PROMOTED: 'trust.promoted',
  TRUST_DEMOTED: 'trust.demoted',
  VIOLATION: 'trust.violation',

  // Verification events
  VERIFICATION_CREATED: 'verification.created',
  VERIFICATION_APPROVED: 'verification.approved',
  VERIFICATION_REJECTED: 'verification.rejected',
  VERIFICATION_ESCALATED: 'verification.escalated',

  // Escalation events
  ESCALATION_CREATED: 'escalation.created',
  ESCALATION_APPROVED: 'escalation.approved',
  ESCALATION_REJECTED: 'escalation.rejected',

  // Fleet events
  AGENT_REGISTERED: 'fleet.agent.registered',
  AGENT_HEALTHY: 'fleet.agent.healthy',
  AGENT_UNHEALTHY: 'fleet.agent.unhealthy',

  // Generic
  ERROR: 'error',
  INFO: 'info'
};

// SSE clients for real-time
const sseClients = new Set();

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-event-bus',
  version: '1.0.0',
  port: PORT,
  subscriptions: subscriptions.size,
  eventTypes: Object.keys(EVENT_TYPES).length,
  historySize: eventHistory.length
}));

// ── Emit Events ─────────────────────────────────────────

/**
 * Emit an event
 * POST /api/events
 */
app.post('/api/events', (req, res) => {
  const {
    type,
    source,
    data = {},
    correlationId,
    priority = 'normal'
  } = req.body || {};

  if (!type) return res.status(400).json({ error: 'type is required' });

  const event = {
    id: `evt-${randomUUID().slice(0, 8)}`,
    type,
    source,
    data,
    correlationId: correlationId || `corr-${randomUUID().slice(0, 8)}`,
    priority,
    timestamp: new Date().toISOString()
  };

  // Store in history
  eventHistory.push(event);
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.shift();
  }

  // Deliver to subscribers
  deliverEvent(event);

  // Broadcast to SSE clients
  broadcastSSE(event);

  logger.info(`Event: ${type} from ${source}`);

  res.status(201).json({ eventId: event.id, delivered: true });
});

/**
 * Emit batch events
 * POST /api/events/batch
 */
app.post('/api/events/batch', (req, res) => {
  const { events = [] } = req.body || {};

  if (!events.length) {
    return res.status(400).json({ error: 'events array required' });
  }

  const results = [];
  for (const event of events) {
    const result = await emitEventSync({ ...event, priority: event.priority || 'normal' });
    results.push(result);
  }

  res.status(201).json({ count: results.length, events: results });
});

// ── Subscribe ────────────────────────────────────────────

/**
 * Subscribe to event types
 * POST /api/subscribe
 */
app.post('/api/subscribe', (req, res) => {
  const {
    subscriberId,
    events = [],
    callbackUrl,
    webhook = false
  } = req.body || {};

  if (!subscriberId || !events.length) {
    return res.status(400).json({ error: 'subscriberId and events required' });
  }

  const subscription = {
    id: `sub-${randomUUID().slice(0, 8)}`,
    subscriberId,
    events: new Set(events),
    callbackUrl,
    webhook,
    createdAt: new Date().toISOString()
  };

  for (const eventType of events) {
    if (!subscriptions.has(eventType)) {
      subscriptions.set(eventType, new Set());
    }
    subscriptions.get(eventType).add(subscription);
  }

  logger.info(`Subscriber ${subscriberId} subscribed to ${events.length} events`);

  res.status(201).json({ subscriptionId: subscription.id, events });
});

/**
 * Unsubscribe
 * DELETE /api/subscribe/:subscriberId
 */
app.delete('/api/subscribe/:subscriberId', (req, res) => {
  let removed = 0;

  for (const [eventType, subs] of subscriptions) {
    for (const sub of subs) {
      if (sub.subscriberId === req.params.subscriberId) {
        subs.delete(sub);
        removed++;
      }
    }
    if (subs.size === 0) {
      subscriptions.delete(eventType);
    }
  }

  res.json({ removed });
});

/**
 * Get subscriptions
 * GET /api/subscriptions
 */
app.get('/api/subscriptions', (req, res) => {
  const { subscriberId } = req.query;
  let items = [];

  for (const subs of subscriptions.values()) {
    for (const sub of subs) {
      if (!subscriberId || sub.subscriberId === subscriberId) {
        items.push({ ...sub, events: [...sub.events] });
      }
    }
  }

  res.json({ count: items.length, subscriptions: items });
});

// ── Query Events ────────────────────────────────────────

/**
 * Get event history
 * GET /api/events
 */
app.get('/api/events', (req, res) => {
  const { type, source, since, until, limit = 100 } = req.query;

  let events = [...eventHistory];

  if (type) events = events.filter(e => e.type === type);
  if (source) events = events.filter(e => e.source === source);
  if (since) events = events.filter(e => new Date(e.timestamp) >= new Date(since));
  if (until) events = events.filter(e => new Date(e.timestamp) <= new Date(until));

  events = events.slice(-Number(limit));

  res.json({ count: events.length, events });
});

/**
 * Get event by ID
 * GET /api/events/:id
 */
app.get('/api/events/:id', (req, res) => {
  const event = eventHistory.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

/**
 * Get event types
 * GET /api/event-types
 */
app.get('/api/event-types', (_req, res) => {
  const types = Object.entries(EVENT_TYPES).map(([name, type]) => ({
    name,
    type,
    subscriberCount: subscriptions.get(type)?.size || 0
  }));

  res.json({ count: types.length, types });
});

// ── SSE (Server-Sent Events) ───────────────────────────

/**
 * Subscribe via SSE
 * GET /api/stream
 */
app.get('/api/stream', (req, res) => {
  const { events: eventFilter } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = randomUUID();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sseClients.add(clientId);

  // Send initial connection event
  sendEvent({ type: 'connected', clientId });

  // Keep-alive
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);

  // Cleanup on close
  req.on('close', () => {
    sseClients.delete(clientId);
    clearInterval(keepAlive);
  });
});

// ── Event Delivery ──────────────────────────────────────

function deliverEvent(event) {
  const subs = subscriptions.get(event.type);
  if (!subs || subs.size === 0) return;

  for (const sub of subs) {
    try {
      if (sub.webhook && sub.callbackUrl) {
        deliverWebhook(sub, event);
      }
    } catch (err) {
      logger.error(`Failed to deliver ${event.id} to ${sub.subscriberId}:`, err.message);
    }
  }
}

async function deliverWebhook(sub, event) {
  const { default: axios } = await import('axios');

  try {
    await axios.post(sub.callbackUrl, event, {
      headers: {
        'Content-Type': 'application/json',
        'X-Event-ID': event.id,
        'X-Event-Type': event.type,
        'X-Subscriber-ID': sub.subscriberId
      },
      timeout: 5000
    });
  } catch (err) {
    logger.error(`Webhook delivery failed:`, err.message);
  }
}

function broadcastSSE(event) {
  if (sseClients.size === 0) return;

  const message = `data: ${JSON.stringify(event)}\n\n`;

  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// ── Analytics ──────────────────────────────────────────

/**
 * Get event analytics
 * GET /api/analytics
 */
app.get('/api/analytics', (req, res) => {
  const { period = '1h' } = req.query;

  const periodMs = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000
  }[period] || 60 * 60 * 1000;

  const since = new Date(Date.now() - periodMs);
  const recent = eventHistory.filter(e => new Date(e.timestamp) >= since);

  const byType = {};
  const bySource = {};
  const byPriority = { low: 0, normal: 0, high: 0 };

  for (const event of recent) {
    byType[event.type] = (byType[event.type] || 0) + 1;
    bySource[event.source] = (bySource[event.source] || 0) + 1;
    byPriority[event.priority] = (byPriority[event.priority] || 0) + 1;
  }

  const topTypes = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([type, count]) => ({ type, count }));

  const topSources = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));

  res.json({
    period,
    totalEvents: recent.length,
    byType: topTypes,
    bySource: topSources,
    byPriority,
    activeSubscribers: sseClients.size,
    timestamp: new Date().toISOString()
  });
});

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS Event Bus listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export { EVENT_TYPES, emitEvent: (event) => emitEventSync(event) };
export default app;
