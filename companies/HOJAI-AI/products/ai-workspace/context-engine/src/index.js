/**
 * RTMN Context Engine
 *
 * Request-scoped context propagation service for multi-agent workflows.
 * Inspired by OpenTelemetry Context API, W3C Trace Context, and AsyncLocalStorage patterns.
 *
 * @module context-engine
 * @version 1.0.0
 * @port 4746
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '4746', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'context-engine-internal-token';
const SERVICE_NAME = 'context-engine';
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

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN)
    return res.status(401).json({ error: 'unauthorized' });
  next();
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPAN_KINDS = ['internal', 'server', 'client', 'producer', 'consumer'];
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTraceId() { return uuidv4().replace(/-/g, ''); }
function generateSpanId() { return uuidv4().replace(/-/g, '').substring(0, 16); }
function isHex(value, len) { return typeof value === 'string' && new RegExp(`^[0-9a-f]{${len}}$`).test(value); }

function computeDuration(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, end - start);
}

function buildSpanTree(spans) {
  const byId = new Map();
  spans.forEach((s) => byId.set(s.id, { ...s, children: [] }));
  const roots = [];
  byId.forEach((node) => {
    if (node.parentSpanId && byId.has(node.parentSpanId)) {
      byId.get(node.parentSpanId).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function buildTimeline(spans) {
  return spans
    .slice()
    .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0))
    .map((s) => ({
      id: s.id, name: s.name, kind: s.kind, status: s.status,
      startTime: s.startTime, endTime: s.endTime, durationMs: s.durationMs, parentSpanId: s.parentSpanId,
    }));
}

function computeExpiry(ttlSeconds) {
  const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 3600;
  return new Date(Date.now() + ttl * 1000).toISOString();
}

function isValidSpanKind(kind) { return SPAN_KINDS.includes(kind); }
function isValidLogLevel(level) { return LOG_LEVELS.includes(level); }

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function createApp() {
  const contexts = createMap('contexts');
  const traceIndex = createMap('trace-index');
  const auditLog = [];
  let sweepTimer = null;

  function recordAudit(action, contextId, details = {}) {
    auditLog.push({ id: uuidv4(), action, contextId, timestamp: new Date().toISOString(), details });
    if (auditLog.length > 1000) auditLog.shift();
  }

  function sweepExpired() {
    const now = Date.now();
    contexts.forEach((ctx, id) => {
      if (ctx.status === 'ended') return;
      if (new Date(ctx.expiresAt).getTime() <= now) {
        ctx.status = 'expired';
        ctx.endedAt = new Date().toISOString();
        recordAudit('expire', id, { traceId: ctx.traceId });
      }
    });
  }

  function seedExample() {
    const rootSpanId = generateSpanId();
    const child1SpanId = generateSpanId();
    const child2SpanId = generateSpanId();
    const grandchildSpanId = generateSpanId();
    const traceId = generateTraceId();
    const contextId = uuidv4();
    const now = Date.now();
    const t = (offset) => new Date(now + offset).toISOString();
    const rootSpan = { id: rootSpanId, name: 'order.process', kind: 'server', parentSpanId: null, attributes: { 'http.method': 'POST', 'http.route': '/api/orders' }, startTime: t(0), endTime: t(450), status: 'ok', durationMs: 450 };
    const child1 = { id: child1SpanId, name: 'inventory.reserve', kind: 'client', parentSpanId: rootSpanId, attributes: { 'db.system': 'mongodb' }, startTime: t(50), endTime: t(180), status: 'ok', durationMs: 130 };
    const child2 = { id: child2SpanId, name: 'payment.charge', kind: 'client', parentSpanId: rootSpanId, attributes: { 'payment.provider': 'stripe' }, startTime: t(200), endTime: t(420), status: 'ok', durationMs: 220 };
    const grandchild = { id: grandchildSpanId, name: 'wallet.debit', kind: 'internal', parentSpanId: child2SpanId, attributes: { 'wallet.id': 'wal_abc123' }, startTime: t(250), endTime: t(400), status: 'ok', durationMs: 150 };
    const example = {
      id: contextId, traceId, spanId: rootSpanId, parentSpanId: null, principal: 'user_42', tenantId: 'tenant_acme', requestId: uuidv4(),
      attributes: { 'service.name': 'order-os', 'deployment.env': 'dev' }, baggage: { 'user.tier': 'gold', 'feature.flags': 'checkout-v2' },
      spans: [rootSpan, child1, child2, grandchild],
      logs: [{ id: uuidv4(), level: 'info', message: 'Order received', fields: { orderId: 'ord_777' }, timestamp: t(5) }],
      status: 'active', createdAt: t(0), expiresAt: new Date(now + 3600 * 1000).toISOString(), endedAt: null,
    };
    contexts.set(contextId, example);
    traceIndex.set(traceId, contextId);
    recordAudit('seed', contextId, { traceId });
  }

  seedExample();

  // Run a periodic expiry sweep (disabled in test env)
  if (process.env.NODE_ENV !== 'test') {
    sweepTimer = setInterval(sweepExpired, 60 * 1000).unref();
  }

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // POST /api/contexts
  app.post('/api/contexts', requireInternal, (req, res) => {
    const { traceId: providedTrace, spanId: providedSpan, parentSpanId, principal, tenantId, requestId, attributes, baggage, ttlSeconds } = req.body || {};
    const traceId = providedTrace || generateTraceId();
    const spanId = providedSpan || generateSpanId();
    const contextId = uuidv4();
    const now = new Date().toISOString();
    const ctx = {
      id: contextId, traceId, spanId, parentSpanId: parentSpanId || null,
      principal: principal || null, tenantId: tenantId || null,
      requestId: requestId || uuidv4(),
      attributes: attributes && typeof attributes === 'object' ? attributes : {},
      baggage: baggage && typeof baggage === 'object' ? baggage : {},
      spans: [], logs: [], status: 'active', createdAt: now, expiresAt: computeExpiry(ttlSeconds), endedAt: null,
    };
    contexts.set(contextId, ctx);
    traceIndex.set(traceId, contextId);
    recordAudit('create', contextId, { traceId });
    res.status(201).json(ctx);
  });

  // GET /api/contexts
  app.get('/api/contexts', (req, res) => {
    const { principal, tenantId, status } = req.query;
    let list = Array.from(contexts.values());
    if (principal) list = list.filter(c => c.principal === principal);
    if (tenantId) list = list.filter(c => c.tenantId === tenantId);
    if (status) list = list.filter(c => c.status === status);
    res.json({ count: list.length, contexts: list });
  });

  // GET /api/contexts/:id
  app.get('/api/contexts/:id', (req, res) => {
    const ctx = contexts.get(req.params.id);
    if (!ctx) return res.status(404).json({ error: 'Context not found' });
    res.json(ctx);
  });

  // PATCH /api/contexts/:id
  app.patch('/api/contexts/:id', requireInternal, (req, res) => {
    const ctx = contexts.get(req.params.id);
    if (!ctx) return res.status(404).json({ error: 'Context not found' });
    const { attributes, baggage, status, ttlSeconds } = req.body || {};
    if (attributes && typeof attributes === 'object') ctx.attributes = { ...ctx.attributes, ...attributes };
    if (baggage && typeof baggage === 'object') ctx.baggage = { ...ctx.baggage, ...baggage };
    if (status) {
      if (!['active', 'ended', 'expired'].includes(status))
        return res.status(400).json({ error: 'status must be one of: active, ended, expired' });
      ctx.status = status;
      if (status === 'ended') { ctx.endedAt = new Date().toISOString(); }
    }
    if (ttlSeconds !== undefined) ctx.expiresAt = computeExpiry(ttlSeconds);
    contexts.set(ctx.id, ctx);
    recordAudit('update', ctx.id, { changed: Object.keys(req.body || {}) });
    res.json(ctx);
  });

  // DELETE /api/contexts/:id
  app.delete('/api/contexts/:id', requireInternal, (req, res) => {
    const ctx = contexts.get(req.params.id);
    if (!ctx) return res.status(404).json({ error: 'Context not found' });
    ctx.status = 'deleted';
    ctx.endedAt = new Date().toISOString();
    contexts.set(ctx.id, ctx);
    recordAudit('delete', ctx.id, {});
    res.json({ deleted: true, id: ctx.id });
  });

  // POST /api/contexts/:id/spans
  app.post('/api/contexts/:id/spans', requireInternal, (req, res) => {
    const ctx = contexts.get(req.params.id);
    if (!ctx) return res.status(404).json({ error: 'Context not found' });
    if (ctx.status !== 'active') return res.status(409).json({ error: `Context is ${ctx.status} and cannot accept spans` });
    const { name, kind = 'internal', parentSpanId = null, attributes = {}, startTime, endTime, status = 'ok' } = req.body || {};
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Span name is required' });
    if (!isValidSpanKind(kind)) return res.status(400).json({ error: `Invalid span kind. Must be one of: ${SPAN_KINDS.join(', ')}` });
    if (parentSpanId && !ctx.spans.find((s) => s.id === parentSpanId)) return res.status(400).json({ error: 'parentSpanId does not reference a known span' });
    const span = { id: generateSpanId(), name, kind, parentSpanId, attributes: attributes && typeof attributes === 'object' ? attributes : {}, startTime: startTime || new Date().toISOString(), endTime: endTime || null, status: ['ok', 'error', 'unset'].includes(status) ? status : 'ok', durationMs: null };
    span.durationMs = computeDuration(span.startTime, span.endTime);
    ctx.spans.push(span);
    recordAudit('span.add', ctx.id, { spanId: span.id, name: span.name });
    res.status(201).json(span);
  });

  // GET /api/contexts/:id/spans
  app.get('/api/contexts/:id/spans', (req, res) => {
    const ctx = contexts.get(req.params.id);
    if (!ctx) return res.status(404).json({ error: 'Context not found' });
    res.json({ contextId: ctx.id, traceId: ctx.traceId, tree: buildSpanTree(ctx.spans), flat: ctx.spans });
  });

  // GET /api/contexts/:id/timeline
  app.get('/api/contexts/:id/timeline', (req, res) => {
    const ctx = contexts.get(req.params.id);
    if (!ctx) return res.status(404).json({ error: 'Context not found' });
    res.json({ contextId: ctx.id, traceId: ctx.traceId, entries: buildTimeline(ctx.spans) });
  });

  // POST /api/contexts/:id/logs
  app.post('/api/contexts/:id/logs', requireInternal, (req, res) => {
    const ctx = contexts.get(req.params.id);
    if (!ctx) return res.status(404).json({ error: 'Context not found' });
    const { level = 'info', message, fields } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message is required' });
    if (!isValidLogLevel(level)) return res.status(400).json({ error: `Invalid level. Must be one of: ${LOG_LEVELS.join(', ')}` });
    const log = { id: uuidv4(), level, message, fields: fields && typeof fields === 'object' ? fields : {}, timestamp: new Date().toISOString() };
    ctx.logs.push(log);
    recordAudit('log.add', ctx.id, { logId: log.id, level });
    res.status(201).json(log);
  });

  // GET /api/contexts/:id/logs
  app.get('/api/contexts/:id/logs', (req, res) => {
    const ctx = contexts.get(req.params.id);
    if (!ctx) return res.status(404).json({ error: 'Context not found' });
    res.json({ contextId: ctx.id, traceId: ctx.traceId, count: ctx.logs.length, logs: ctx.logs });
  });

  // POST /api/contexts/lookup
  app.post('/api/contexts/lookup', requireInternal, (req, res) => {
    const { traceId, principal, tenantId } = req.body || {};
    if (traceId) {
      const contextId = traceIndex.get(traceId);
      if (!contextId) return res.status(404).json({ error: 'No context found for traceId' });
      const ctx = contexts.get(contextId);
      if (!ctx) return res.status(404).json({ error: 'Context not found' });
      return res.json(ctx);
    }
    if (principal || tenantId) {
      const matches = Array.from(contexts.values()).filter((c) => {
        if (principal && c.principal !== principal) return false;
        if (tenantId && c.tenantId !== tenantId) return false;
        return true;
      });
      return res.json({ count: matches.length, contexts: matches });
    }
    res.status(400).json({ error: 'Provide either traceId or principal/tenantId to look up a context' });
  });

  // POST /api/contexts/propagate
  app.post('/api/contexts/propagate', requireInternal, (req, res) => {
    const { traceparent, tracestate, baggage } = req.body || {};
    if (!traceparent || typeof traceparent !== 'string') return res.status(400).json({ error: 'traceparent header is required' });
    const parts = traceparent.split('-');
    if (parts.length !== 4) return res.status(400).json({ error: 'Invalid traceparent format. Expected: 00-<trace>-<span>-<flags>' });
    const [version, traceId, spanId, flags] = parts;
    if (version !== '00') return res.status(400).json({ error: `Unsupported traceparent version: ${version}` });
    if (!isHex(traceId, 32)) return res.status(400).json({ error: 'traceparent traceId must be 32 hex chars' });
    if (!isHex(spanId, 16)) return res.status(400).json({ error: 'traceparent spanId must be 16 hex chars' });
    if (!isHex(flags, 2)) return res.status(400).json({ error: 'traceparent flags must be 2 hex chars' });
    const parsedTracestate = typeof tracestate === 'string' && tracestate.length > 0
      ? tracestate.split(',').map(kv => kv.trim()).filter(Boolean).reduce((acc, kv) => { const [k, v] = kv.split('=').map(x => (x || '').trim()); if (k && v) acc[k] = v; return acc; }, {})
      : {};
    const propagated = { traceId, parentSpanId: spanId, flags, sampled: (parseInt(flags, 16) & 0x01) === 1, tracestate: parsedTracestate, baggage: baggage && typeof baggage === 'object' ? baggage : {}, extractedAt: new Date().toISOString() };
    const existingContextId = traceIndex.get(traceId);
    if (existingContextId) {
      const ctx = contexts.get(existingContextId);
      recordAudit('propagate.existing', ctx.id, { traceId });
      return res.json({ ...propagated, contextId: ctx.id, existing: true });
    }
    recordAudit('propagate.new', null, { traceId });
    res.json({ ...propagated, contextId: null, existing: false });
  });

  // GET /api/audit
  app.get('/api/audit', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    res.json({ count: auditLog.length, entries: auditLog.slice(-limit).reverse() });
  });

  // GET /api/health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, version: '1.0.0', contexts: contexts.size, traces: traceIndex.size, uptimeSeconds: Math.floor(process.uptime()) });
  });

  // GET /health
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT });
  });

  // GET /ready
  app.get('/ready', (_req, res) => {
    res.json({ ready: true, timestamp: new Date().toISOString() });
  });

  return { app, contexts, traceIndex, auditLog, stopSweep: () => { if (sweepTimer) clearInterval(sweepTimer); } };
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const { app, stopSweep } = createApp();

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`ContextEngine running on port ${PORT}`);
    console.log(`Health:        http://localhost:${PORT}/api/health`);
    console.log(`Contexts API:  http://localhost:${PORT}/api/contexts`);
  });
  process.on('SIGTERM', () => { console.log('[ContextEngine] SIGTERM'); server.close(() => process.exit(0)); });
  process.on('SIGINT',  () => { console.log('[ContextEngine] SIGINT');  server.close(() => process.exit(0)); });
}

module.exports = app;
module.exports.app = app;
module.exports.createApp = createApp;
module.exports.stopSweep = stopSweep;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.SPAN_KINDS = SPAN_KINDS;
module.exports.LOG_LEVELS = LOG_LEVELS;
module.exports.generateTraceId = generateTraceId;
module.exports.generateSpanId = generateSpanId;
