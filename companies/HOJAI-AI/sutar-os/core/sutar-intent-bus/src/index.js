/**
 * SUTAR OS — Intent Bus
 *
 * Pub/Sub bus for agent intent communication.
 * Agents publish intents and subscribe to patterns.
 *
 * Endpoints:
 *   POST /api/intents       — Publish an intent
 *   GET  /api/intents       — List matching intents
 *   POST /api/subscriptions — Subscribe to intent patterns
 *   GET  /api/subscriptions  — List subscriptions
 *   DELETE /api/subscriptions/:id — Cancel subscription
 *   GET  /api/bus/status    — Bus health + stats
 *   GET  /health
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { setupSecurity, requireAuth } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());
setupSecurity(app, { serviceName: 'sutar-intent-bus' });

const PORT = process.env.INTENT_BUS_PORT || 4154;

// ---------- In-Memory Stores ----------
const intents = [];           // published intents
const subscriptions = new Map(); // id -> { pattern, subscriberId, callbackUrl, createdAt }
const MAX_INTENTS = 10000;
const MAX_SUBSCRIPTIONS = 5000;

// ---------- Intent Matching ----------
function matchPattern(intent, pattern) {
  const p = pattern.toLowerCase();
  const i = intent.action.toLowerCase();
  const source = (intent.source || '').toLowerCase();
  const target = (intent.target || '').toLowerCase();
  const tags = (intent.tags || []).map(t => t.toLowerCase());

  if (p === '*') return true;
  if (p === i) return true;
  if (p.startsWith('action:') && i === p.slice(7)) return true;
  if (p.startsWith('source:') && source.includes(p.slice(7))) return true;
  if (p.startsWith('target:') && target.includes(p.slice(7))) return true;
  if (p.startsWith('tag:') && tags.some(t => t.includes(p.slice(4)))) return true;
  if (p.includes('*')) {
    const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$', 'i');
    if (regex.test(intent.action)) return true;
  }
  return false;
}

function findMatchingSubscriptions(intent) {
  const matches = [];
  for (const [, sub] of subscriptions) {
    if (matchPattern(intent, sub.pattern)) {
      matches.push(sub);
    }
  }
  return matches;
}

// ---------- Publish Intent ----------
function publishIntent(params) {
  const intentId = uuidv4();
  const intent = {
    intentId,
    action: params.action,
    source: params.source,
    target: params.target,
    priority: params.priority || 'normal',  // low, normal, high, critical
    payload: params.payload || {},
    tags: params.tags || [],
    timestamp: new Date().toISOString(),
    ttl: params.ttl || 3600, // seconds
    correlationId: params.correlationId || null,
    replyTo: params.replyTo || null,
  };

  intents.push(intent);

  // Evict oldest if over limit
  while (intents.length > MAX_INTENTS) {
    intents.shift();
  }

  // Deliver to matching subscribers
  const matched = findMatchingSubscriptions(intent);

  return { intent, delivered: matched.length };
}

// ---------- Subscription Management ----------
function createSubscription(params) {
  const subId = uuidv4();
  const sub = {
    id: subId,
    pattern: params.pattern || '*',
    subscriberId: params.subscriberId,
    callbackUrl: params.callbackUrl,
    description: params.description,
    createdAt: new Date().toISOString(),
    active: true,
    matchedCount: 0,
    lastMatchedAt: null,
  };
  subscriptions.set(subId, sub);

  while (subscriptions.size > MAX_SUBSCRIPTIONS) {
    const oldest = Array.from(subscriptions.entries()).sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt))[0];
    subscriptions.delete(oldest[0]);
  }

  return sub;
}

function cancelSubscription(subId) {
  const sub = subscriptions.get(subId);
  if (!sub) return { error: 'Subscription not found' };
  sub.active = false;
  subscriptions.delete(subId);
  return { id: subId, status: 'cancelled' };
}

// ---------- Routes ----------
app.post('/api/intents', requireAuth, (req, res) => {
  const result = publishIntent(req.body);
  res.status(201).json(result);
});

app.get('/api/intents', requireAuth, (req, res) => {
  const { action, source, target, since, limit } = req.query;
  let list = [...intents];
  if (action) list = list.filter(i => matchPattern(i, action));
  if (source) list = list.filter(i => (i.source || '').includes(source));
  if (target) list = list.filter(i => (i.target || '').includes(target));
  if (since) list = list.filter(i => i.timestamp >= since);
  list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const pageSize = Math.min(parseInt(limit) || 100, 1000);
  res.json({ total: intents.length, returned: Math.min(list.length, pageSize), intents: list.slice(0, pageSize) });
});

app.post('/api/subscriptions', requireAuth, (req, res) => {
  const sub = createSubscription(req.body);
  res.status(201).json(sub);
});

app.get('/api/subscriptions', requireAuth, (req, res) => {
  const { subscriberId, active, pattern } = req.query;
  let list = Array.from(subscriptions.values());
  if (subscriberId) list = list.filter(s => s.subscriberId === subscriberId);
  if (active !== undefined) list = list.filter(s => s.active === (active === 'true'));
  if (pattern) list = list.filter(s => matchPattern({ action: pattern }, s.pattern));
  res.json({ total: subscriptions.size, returned: list.length, subscriptions: list });
});

app.delete('/api/subscriptions/:id', requireAuth, (req, res) => {
  const result = cancelSubscription(req.params.id);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

app.get('/api/bus/status', requireAuth, (_req, res) => {
  const now = Date.now();
  const recentIntents = intents.filter(i => now - new Date(i.timestamp).getTime() < 60000);
  const highPriorityRecent = recentIntents.filter(i => i.priority === 'high' || i.priority === 'critical');
  res.json({
    service: 'sutar-intent-bus',
    status: 'healthy',
    totalIntents: intents.length,
    recentIntentsLastMin: recentIntents.length,
    highPriorityLastMin: highPriorityRecent.length,
    totalSubscriptions: subscriptions.size,
    activeSubscriptions: Array.from(subscriptions.values()).filter(s => s.active).length,
    patterns: Array.from(new Set(Array.from(subscriptions.values()).map(s => s.pattern))).slice(0, 20),
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sutar-intent-bus',
    port: PORT,
    layer: 'Intent + Network',
    intents: intents.length,
    subscriptions: subscriptions.size,
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[sutar-intent-bus] listening on :${PORT}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
