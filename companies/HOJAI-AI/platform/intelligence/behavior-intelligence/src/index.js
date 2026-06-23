/**
 * RTMN Behavior Intelligence v1.0
 * User behavior analysis: events, profiles, anomalies, funnels.
 * @port 4788
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4788;
const SERVICE_NAME = 'behavior-intelligence';

const BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH =
  (process.env.BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const BEHAVIOR_INTELLIGENCE_NO_LISTEN =
  (process.env.BEHAVIOR_INTELLIGENCE_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';
const authOrBypass = (req, res, next) =>
  BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => { const s = Date.now(); res.on('finish', () => console.log(`[behavior-intelligence] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now()-s}ms)`)); next(); });

const events = new PersistentMap('events', { serviceName: SERVICE_NAME });
const auditLog = [];

function audit(action, actor, payload) {
  const e = { id: uuidv4(), service: SERVICE_NAME, action, actor: actor || 'system', payload: payload || {}, timestamp: new Date().toISOString() };
  auditLog.push(e); return e;
}

function getUserProfile(userId) {
  const userEvents = Array.from(events.values()).filter(e => e.userId === userId);
  const eventCounts = {};
  let lastSeen = null;
  for (const e of userEvents) {
    eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
    if (!lastSeen || e.recordedAt > lastSeen) lastSeen = e.recordedAt;
  }
  const topEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([event, count]) => ({ event, count }));
  return { userId, totalEvents: userEvents.length, topEvents, lastSeen, firstSeen: userEvents[0]?.recordedAt || null };
}

function detectAnomalies(windowMs = 3600000) {
  const now = Date.now();
  const all = Array.from(events.values());
  const recent = all.filter(e => now - new Date(e.recordedAt).getTime() < windowMs);
  const eventCounts = {};
  for (const e of recent) eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
  const avg = recent.length / Math.max(1, Object.keys(eventCounts).length);
  const anomalies = [];
  for (const [event, count] of Object.entries(eventCounts)) {
    if (count > avg * 3) anomalies.push({ event, count, ratio: Number((count / Math.max(1, avg)).toFixed(2)), severity: count > avg * 5 ? 'high' : 'medium' });
  }
  return { windowMs, totalEvents: recent.length, anomalies, distinctEvents: Object.keys(eventCounts).length };
}

function computeFunnel(steps) {
  const all = Array.from(events.values());
  const result = [];
  for (const step of steps) {
    const users = new Set(all.filter(e => e.event === step).map(e => e.userId));
    result.push({ step, users: users.size, conversionFromFirst: 0 });
  }
  if (result.length > 0 && result[0].users > 0) {
    for (const r of result) r.conversionFromFirst = Number((r.users / result[0].users).toFixed(3));
  }
  return result;
}

// POST /api/behavior/event
app.post('/api/behavior/event', authOrBypass, (req, res) => {
  const { userId, event, properties, actor } = req.body || {};
  if (!userId || !event) return res.status(400).json({ error: 'userId and event are required' });
  const entry = { id: uuidv4(), userId, event, properties: properties || {}, recordedAt: new Date().toISOString() };
  events.set(entry.id, entry);
  audit('behavior.event', actor || 'system', { userId, event });
  res.status(201).json(entry);
});

// GET /api/behavior/events
app.get('/api/behavior/events', (req, res) => {
  const { userId, event, limit } = req.query;
  let list = Array.from(events.values());
  if (userId) list = list.filter(e => e.userId === userId);
  if (event) list = list.filter(e => e.event === event);
  const max = Math.min(parseInt(limit, 10) || 100, 5000);
  res.json({ events: list.slice(-max).reverse(), count: list.length });
});

// GET /api/behavior/user/:userId
app.get('/api/behavior/user/:userId', (req, res) => {
  const profile = getUserProfile(req.params.userId);
  if (profile.totalEvents === 0) return res.status(404).json({ error: 'No events for this user' });
  res.json(profile);
});

// GET /api/behavior/anomalies
app.get('/api/behavior/anomalies', (req, res) => {
  const windowMs = parseInt(req.query.windowMs, 10) || 3600000;
  res.json(detectAnomalies(windowMs));
});

// POST /api/behavior/funnel
app.post('/api/behavior/funnel', authOrBypass, (req, res) => {
  const { steps, actor } = req.body || {};
  if (!Array.isArray(steps) || steps.length === 0) return res.status(400).json({ error: 'steps (non-empty array) is required' });
  const funnel = computeFunnel(steps);
  audit('behavior.funnel', actor || 'system', { steps });
  res.json({ funnel, count: funnel.length });
});

// GET /api/behavior/audit
app.get('/api/behavior/audit', (req, res) => {
  const { action, limit } = req.query;
  let entries = auditLog;
  if (action) entries = entries.filter(e => e.action === action);
  const max = Math.min(parseInt(limit, 10) || 200, 5000);
  res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, events: events.size, audits: auditLog.length, uptime: process.uptime() }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.use((err, req, res, next) => { console.error('[behavior-intelligence] error:', err); res.status(500).json({ error: 'Internal server error', message: err.message }); });

let server = null;
if (require.main === module && !BEHAVIOR_INTELLIGENCE_NO_LISTEN) {
  server = app.listen(PORT, () => console.log(`behavior-intelligence running on port ${PORT}`));
  installGracefulShutdown(server);
}

module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH = BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH;
module.exports.BEHAVIOR_INTELLIGENCE_NO_LISTEN = BEHAVIOR_INTELLIGENCE_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.getUserProfile = getUserProfile;
module.exports.detectAnomalies = detectAnomalies;
module.exports.computeFunnel = computeFunnel;