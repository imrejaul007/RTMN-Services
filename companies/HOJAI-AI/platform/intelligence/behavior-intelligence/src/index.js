/**
 * RTMN Behavior Intelligence v1.0
 * User behavior analysis: events, profiles, anomalies, funnels.
 * @port 4788
 */

'use strict';

const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '4788', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'behavior-intelligence-internal-token';
const SERVICE_NAME = 'behavior-intelligence';
const DATA_DIR = () => process.env.DATA_DIR || path.join(__dirname, '..', 'data');

function ensureDir() {
  const dd = DATA_DIR();
  if (!fs.existsSync(dd)) fs.mkdirSync(dd, { recursive: true });
}

function storeFile(name) { return path.join(DATA_DIR(), `${name}.json`); }

function loadStore(name) {
  ensureDir();
  const f = storeFile(name);
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (_) { return {}; }
}

function saveStore(name, data) {
  ensureDir();
  const dd = DATA_DIR();
  const f = storeFile(name);
  const tmp = path.join(dd, '.tmp_' + crypto.randomBytes(4).toString('hex'));
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, f);
}

function createMap(name) {
  let map = new Map(Object.entries(loadStore(name)));
  return {
    get(k) { return map.get(k); },
    set(k, v) { map.set(k, v); saveStore(name, Object.fromEntries(map)); return this; },
    has(k) { return map.has(k); },
    delete(k) { map.delete(k); saveStore(name, Object.fromEntries(map)); return this; },
    get size() { return map.size; },
    values() { return map.values(); },
    forEach(fn) { map.forEach(fn); },
    clear() { map.clear(); saveStore(name, {}); },
    *[Symbol.iterator]() { yield* map; },
  };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH =
  (process.env.BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';

const BEHAVIOR_INTELLIGENCE_NO_LISTEN =
  (process.env.BEHAVIOR_INTELLIGENCE_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN)
    return res.status(401).json({ error: 'unauthorized' });
  next();
}

const authOrBypass = (req, res, next) =>
  BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH ? requireInternal(req, res, next) : next();

// ---------------------------------------------------------------------------
// Shared helpers (module-level for test imports)
// ---------------------------------------------------------------------------

function getUserProfile(userId, events) {
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

function detectAnomalies(windowMs, events) {
  const now = Date.now();
  const all = Array.from(events.values());
  const recent = all.filter(e => now - new Date(e.recordedAt).getTime() < windowMs);
  const eventCounts = {};
  for (const e of recent) eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
  const avg = recent.length / Math.max(1, Object.keys(eventCounts).length);
  const anomalies = [];
  for (const [event, count] of Object.entries(eventCounts)) {
    if (count > avg * 3)
      anomalies.push({ event, count, ratio: Number((count / Math.max(1, avg)).toFixed(2)), severity: count > avg * 5 ? 'high' : 'medium' });
  }
  return { windowMs, totalEvents: recent.length, anomalies, distinctEvents: Object.keys(eventCounts).length };
}

function computeFunnel(steps, events) {
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

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function createApp() {
  const events = createMap('events');
  const auditLog = [];

  function audit(action, actor, payload) {
    const e = { id: uuidv4(), service: SERVICE_NAME, action, actor: actor || 'system', payload: payload || {}, timestamp: new Date().toISOString() };
    auditLog.push(e); return e;
  }

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => { const s = Date.now(); res.on('finish', () => console.log(`[behavior-intelligence] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now()-s}ms)`)); next(); });

  app.post('/api/behavior/event',requireAuth,  authOrBypass, (req, res) => {
    const { userId, event, properties, actor } = req.body || {};
    if (!userId || !event) return res.status(400).json({ error: 'userId and event are required' });
    const entry = { id: uuidv4(), userId, event, properties: properties || {}, recordedAt: new Date().toISOString() };
    events.set(entry.id, entry);
    audit('behavior.event', actor || 'system', { userId, event });
    res.status(201).json(entry);
  });

  app.get('/api/behavior/events', (req, res) => {
    const { userId, event, limit } = req.query;
    let list = Array.from(events.values());
    if (userId) list = list.filter(e => e.userId === userId);
    if (event) list = list.filter(e => e.event === event);
    const max = Math.min(parseInt(limit, 10) || 100, 5000);
    res.json({ events: list.slice(-max).reverse(), count: list.length });
  });

  app.get('/api/behavior/user/:userId', (req, res) => {
    const profile = getUserProfile(req.params.userId, events);
    if (profile.totalEvents === 0) return res.status(404).json({ error: 'No events for this user' });
    res.json(profile);
  });

  app.get('/api/behavior/anomalies', (req, res) => {
    const windowMs = parseInt(req.query.windowMs, 10) || 3600000;
    res.json(detectAnomalies(windowMs, events));
  });

  app.post('/api/behavior/funnel',requireAuth,  authOrBypass, (req, res) => {
    const { steps, actor } = req.body || {};
    if (!Array.isArray(steps) || steps.length === 0) return res.status(400).json({ error: 'steps (non-empty array) is required' });
    const funnel = computeFunnel(steps, events);
    audit('behavior.funnel', actor || 'system', { steps });
    res.json({ funnel, count: funnel.length });
  });

  app.get('/api/behavior/audit', (req, res) => {
    const { action, limit } = req.query;
    let entries = auditLog;
    if (action) entries = entries.filter(e => e.action === action);
    const max = Math.min(parseInt(limit, 10) || 200, 5000);
    res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
  });

  app.get('/health', (_req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT }));
  app.get('/api/health', (_req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, events: events.size, audits: auditLog.length, uptime: process.uptime() }));
  app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

  app.use((err, _req, res, _next) => { console.error('[behavior-intelligence] error:', err); res.status(500).json({ error: 'Internal server error', message: err.message }); });

  return app;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const app = createApp();

app.authOrBypass = authOrBypass;
app.BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH = BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH;
app.BEHAVIOR_INTELLIGENCE_NO_LISTEN = BEHAVIOR_INTELLIGENCE_NO_LISTEN;
app.SERVICE_NAME = SERVICE_NAME;
app.getUserProfile = getUserProfile;
app.detectAnomalies = detectAnomalies;
app.computeFunnel = computeFunnel;

function start() {
  const server = app.listen(PORT, () => console.log(`behavior-intelligence running on port ${PORT}`));
  process.on('SIGTERM', () => { console.log('[behavior-intelligence] SIGTERM'); server.close(() => process.exit(0)); });
  process.on('SIGINT',  () => { console.log('[behavior-intelligence] SIGINT');  server.close(() => process.exit(0)); });
  return server;
}

if (require.main === module && !BEHAVIOR_INTELLIGENCE_NO_LISTEN) start();

module.exports = app;
module.exports.app = app;
module.exports.createApp = createApp;
module.exports.authOrBypass = authOrBypass;
module.exports.BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH = BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH;
module.exports.BEHAVIOR_INTELLIGENCE_NO_LISTEN = BEHAVIOR_INTELLIGENCE_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.getUserProfile = getUserProfile;
module.exports.detectAnomalies = detectAnomalies;
module.exports.computeFunnel = computeFunnel;
