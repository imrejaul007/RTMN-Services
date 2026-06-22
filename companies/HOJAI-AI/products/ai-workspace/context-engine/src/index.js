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

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = 4746;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// =============================================================================
// In-memory storage
// =============================================================================

/**
 * Map of contextId -> Context object
 * TODO: Replace with MongoDB persistence layer for production durability
 */
const contexts = new PersistentMap('contexts', { serviceName: 'context-engine' });

/**
 * Map of traceId -> contextId (for fast trace-based lookups)
 */
const traceIndex = new PersistentMap('trace-index', { serviceName: 'context-engine' });

/**
 * Audit log of all mutations
 */
const auditLog = [];

/**
 * Span kinds per OpenTelemetry specification
 */
const SPAN_KINDS = ['internal', 'server', 'client', 'producer', 'consumer'];

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate a 32-char hex trace ID (W3C Trace Context compliant).
 * @returns {string}
 */
function generateTraceId() {
  // W3C trace-id must be 16 bytes = 32 hex chars
  return uuidv4().replace(/-/g, '');
}

/**
 * Generate a 16-char hex span ID (W3C Trace Context compliant).
 * @returns {string}
 */
function generateSpanId() {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

/**
 * Validate a hex string of the expected length.
 * @param {string} value
 * @param {number} len
 * @returns {boolean}
 */
function isHex(value, len) {
  return typeof value === 'string' && new RegExp(`^[0-9a-f]{${len}}$`).test(value);
}

/**
 * Compute durationMs given a span's start and end times.
 * @param {string} startTime
 * @param {string|null} endTime
 * @returns {number|null}
 */
function computeDuration(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, end - start);
}

/**
 * Build a span tree from a flat list of spans.
 * @param {Array} spans
 * @returns {Array} tree of span nodes
 */
function buildSpanTree(spans) {
  const byId = new PersistentMap('by-id', { serviceName: 'context-engine' });
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

/**
 * Flatten a span tree in chronological order with durations.
 * @param {Array} spans
 * @returns {Array} timeline entries
 */
function buildTimeline(spans) {
  return spans
    .slice()
    .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0))
    .map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      status: s.status,
      startTime: s.startTime,
      endTime: s.endTime,
      durationMs: s.durationMs,
      parentSpanId: s.parentSpanId,
    }));
}

/**
 * Compute the effective expiry for a new/updated context.
 * @param {number} ttlSeconds
 * @returns {string} ISO timestamp
 */
function computeExpiry(ttlSeconds) {
  const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 3600;
  return new Date(Date.now() + ttl * 1000).toISOString();
}

/**
 * Sweep expired contexts. Returns number removed.
 * @returns {number}
 */
function sweepExpired() {
  const now = Date.now();
  let removed = 0;
  contexts.forEach((ctx, id) => {
    if (ctx.status === 'ended') return;
    if (new Date(ctx.expiresAt).getTime() <= now) {
      ctx.status = 'expired';
      ctx.endedAt = new Date().toISOString();
      removed += 1;
      recordAudit('expire', id, { traceId: ctx.traceId });
    }
  });
  return removed;
}

/**
 * Append an audit entry.
 * @param {string} action
 * @param {string} contextId
 * @param {object} details
 */
function recordAudit(action, contextId, details = {}) {
  auditLog.push({
    id: uuidv4(),
    action,
    contextId,
    timestamp: new Date().toISOString(),
    details,
  });
  // Cap audit log to last 1000 entries
  if (auditLog.length > 1000) auditLog.shift();
}

// =============================================================================
// Pre-seeded data
// =============================================================================

function seedExample() {
  const rootSpanId = generateSpanId();
  const child1SpanId = generateSpanId();
  const child2SpanId = generateSpanId();
  const grandchildSpanId = generateSpanId();
  const traceId = generateTraceId();
  const contextId = uuidv4();

  const now = Date.now();
  const t = (offset) => new Date(now + offset).toISOString();

  const rootSpan = {
    id: rootSpanId,
    name: 'order.process',
    kind: 'server',
    parentSpanId: null,
    attributes: { 'http.method': 'POST', 'http.route': '/api/orders' },
    startTime: t(0),
    endTime: t(450),
    status: 'ok',
    durationMs: 450,
  };
  const child1 = {
    id: child1SpanId,
    name: 'inventory.reserve',
    kind: 'client',
    parentSpanId: rootSpanId,
    attributes: { 'db.system': 'mongodb' },
    startTime: t(50),
    endTime: t(180),
    status: 'ok',
    durationMs: 130,
  };
  const child2 = {
    id: child2SpanId,
    name: 'payment.charge',
    kind: 'client',
    parentSpanId: rootSpanId,
    attributes: { 'payment.provider': 'stripe' },
    startTime: t(200),
    endTime: t(420),
    status: 'ok',
    durationMs: 220,
  };
  const grandchild = {
    id: grandchildSpanId,
    name: 'wallet.debit',
    kind: 'internal',
    parentSpanId: child2SpanId,
    attributes: { 'wallet.id': 'wal_abc123' },
    startTime: t(250),
    endTime: t(400),
    status: 'ok',
    durationMs: 150,
  };

  const example = {
    id: contextId,
    traceId,
    spanId: rootSpanId,
    parentSpanId: null,
    principal: 'user_42',
    tenantId: 'tenant_acme',
    requestId: uuidv4(),
    attributes: { 'service.name': 'order-os', 'deployment.env': 'dev' },
    baggage: { 'user.tier': 'gold', 'feature.flags': 'checkout-v2' },
    spans: [rootSpan, child1, child2, grandchild],
    logs: [
      {
        id: uuidv4(),
        level: 'info',
        message: 'Order received',
        fields: { orderId: 'ord_777' },
        timestamp: t(5),
      },
    ],
    status: 'active',
    createdAt: t(0),
    expiresAt: new Date(now + 3600 * 1000).toISOString(),
    endedAt: null,
  };

  contexts.set(contextId, example);
  traceIndex.set(traceId, contextId);
  recordAudit('seed', contextId, { traceId });
}

seedExample();

// Run a periodic expiry sweep
setInterval(sweepExpired, 60 * 1000).unref();

// =============================================================================
// Validation helpers
// =============================================================================

/**
 * Validate span kind.
 * @param {string} kind
 * @returns {boolean}
 */
function isValidSpanKind(kind) {
  return SPAN_KINDS.includes(kind);
}

/**
 * Validate log level.
 * @param {string} level
 * @returns {boolean}
 */
function isValidLogLevel(level) {
  return LOG_LEVELS.includes(level);
}

// =============================================================================
// Routes - Context CRUD
// =============================================================================

/**
 * POST /api/contexts
 * Create a new context.
 */
app.post('/api/contexts',requireAuth,  (req, res) => {
  const {
    traceId: providedTrace,
    spanId: providedSpan,
    parentSpanId,
    principal,
    tenantId,
    requestId,
    attributes,
    baggage,
    ttlSeconds,
  } = req.body || {};

  const traceId =
    providedTrace && isHex(providedTrace, 32)
      ? providedTrace
      : generateTraceId();
  const spanId =
    providedSpan && isHex(providedSpan, 16) ? providedSpan : generateSpanId();

  if (providedTrace && !isHex(providedTrace, 32)) {
    return res
      .status(400)
      .json({ error: 'traceId must be a 32-character hex string' });
  }
  if (providedSpan && !isHex(providedSpan, 16)) {
    return res
      .status(400)
      .json({ error: 'spanId must be a 16-character hex string' });
  }

  const contextId = uuidv4();
  const now = new Date().toISOString();

  const context = {
    id: contextId,
    traceId,
    spanId,
    parentSpanId: parentSpanId || null,
    principal: principal || null,
    tenantId: tenantId || null,
    requestId: requestId || uuidv4(),
    attributes: attributes && typeof attributes === 'object' ? attributes : {},
    baggage: baggage && typeof baggage === 'object' ? baggage : {},
    spans: [],
    logs: [],
    status: 'active',
    createdAt: now,
    expiresAt: computeExpiry(ttlSeconds),
    endedAt: null,
  };

  contexts.set(contextId, context);
  traceIndex.set(traceId, contextId);
  recordAudit('create', contextId, { traceId, principal, tenantId });

  res.status(201).json(context);
});

/**
 * GET /api/contexts/active
 * List all currently active (not ended/expired) contexts.
 * NOTE: must be declared BEFORE /:id route to avoid shadowing.
 */
app.get('/api/contexts/active', (req, res) => {
  sweepExpired();
  const active = Array.from(contexts.values()).filter(
    (c) => c.status === 'active'
  );
  res.json({ count: active.length, contexts: active });
});

/**
 * GET /api/contexts/:id
 * Retrieve a context by id.
 */
app.get('/api/contexts/:id', (req, res) => {
  const ctx = contexts.get(req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Context not found' });
  res.json(ctx);
});

/**
 * PUT /api/contexts/:id
 * Merge attributes and/or baggage into a context.
 */
app.put('/api/contexts/:id',requireAuth,  (req, res) => {
  const ctx = contexts.get(req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Context not found' });
  if (ctx.status !== 'active') {
    return res
      .status(409)
      .json({ error: `Context is ${ctx.status} and cannot be modified` });
  }

  const { attributes, baggage, ttlSeconds, status: newStatus } = req.body || {};

  if (attributes && typeof attributes === 'object') {
    ctx.attributes = { ...ctx.attributes, ...attributes };
  }
  if (baggage && typeof baggage === 'object') {
    ctx.baggage = { ...ctx.baggage, ...baggage };
  }
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
    ctx.expiresAt = computeExpiry(ttlSeconds);
  }
  if (newStatus === 'ended') {
    ctx.status = 'ended';
    ctx.endedAt = new Date().toISOString();
  }

  recordAudit('update', ctx.id, {
    attributesKeys: Object.keys(ctx.attributes),
    baggageKeys: Object.keys(ctx.baggage),
  });
  res.json(ctx);
});

/**
 * DELETE /api/contexts/:id
 * End a context (marks status as ended).
 */
app.delete('/api/contexts/:id',requireAuth,  (req, res) => {
  const ctx = contexts.get(req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Context not found' });

  ctx.status = 'ended';
  ctx.endedAt = new Date().toISOString();
  recordAudit('end', ctx.id, { traceId: ctx.traceId });
  res.json({ message: 'Context ended', context: ctx });
});

// =============================================================================
// Routes - Spans
// =============================================================================

/**
 * POST /api/contexts/:id/spans
 * Add a child span to a context.
 */
app.post('/api/contexts/:id/spans',requireAuth,  (req, res) => {
  const ctx = contexts.get(req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Context not found' });
  if (ctx.status !== 'active') {
    return res
      .status(409)
      .json({ error: `Context is ${ctx.status} and cannot accept spans` });
  }

  const {
    name,
    kind = 'internal',
    parentSpanId = null,
    attributes = {},
    startTime,
    endTime,
    status = 'ok',
  } = req.body || {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Span name is required' });
  }
  if (!isValidSpanKind(kind)) {
    return res
      .status(400)
      .json({ error: `Invalid span kind. Must be one of: ${SPAN_KINDS.join(', ')}` });
  }
  if (parentSpanId && !ctx.spans.find((s) => s.id === parentSpanId)) {
    return res
      .status(400)
      .json({ error: 'parentSpanId does not reference a known span' });
  }

  const span = {
    id: generateSpanId(),
    name,
    kind,
    parentSpanId,
    attributes: attributes && typeof attributes === 'object' ? attributes : {},
    startTime: startTime || new Date().toISOString(),
    endTime: endTime || null,
    status: ['ok', 'error', 'unset'].includes(status) ? status : 'ok',
    durationMs: null,
  };
  span.durationMs = computeDuration(span.startTime, span.endTime);

  ctx.spans.push(span);
  recordAudit('span.add', ctx.id, { spanId: span.id, name: span.name });

  // TODO: real-time span export to Jaeger/Tempo
  res.status(201).json(span);
});

/**
 * GET /api/contexts/:id/spans
 * Return spans as a hierarchical tree.
 */
app.get('/api/contexts/:id/spans', (req, res) => {
  const ctx = contexts.get(req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Context not found' });
  res.json({
    contextId: ctx.id,
    traceId: ctx.traceId,
    tree: buildSpanTree(ctx.spans),
    flat: ctx.spans,
  });
});

/**
 * GET /api/contexts/:id/timeline
 * Chronological list of spans with durations.
 */
app.get('/api/contexts/:id/timeline', (req, res) => {
  const ctx = contexts.get(req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Context not found' });
  res.json({
    contextId: ctx.id,
    traceId: ctx.traceId,
    entries: buildTimeline(ctx.spans),
  });
});

// =============================================================================
// Routes - Logs
// =============================================================================

/**
 * POST /api/contexts/:id/logs
 * Append a log entry to a context.
 */
app.post('/api/contexts/:id/logs',requireAuth,  (req, res) => {
  const ctx = contexts.get(req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Context not found' });

  const { level = 'info', message, fields = {} } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Log message is required' });
  }
  if (!isValidLogLevel(level)) {
    return res
      .status(400)
      .json({ error: `Invalid log level. Must be one of: ${LOG_LEVELS.join(', ')}` });
  }

  const entry = {
    id: uuidv4(),
    level,
    message,
    fields: fields && typeof fields === 'object' ? fields : {},
    timestamp: new Date().toISOString(),
  };
  ctx.logs.push(entry);
  recordAudit('log.append', ctx.id, { logId: entry.id, level });
  res.status(201).json(entry);
});

/**
 * GET /api/contexts/:id/logs
 * Retrieve all logs for a context (newest last).
 */
app.get('/api/contexts/:id/logs', (req, res) => {
  const ctx = contexts.get(req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Context not found' });
  res.json({
    contextId: ctx.id,
    traceId: ctx.traceId,
    count: ctx.logs.length,
    logs: ctx.logs,
  });
});

// =============================================================================
// Routes - Lookup & Propagation
// =============================================================================

/**
 * POST /api/contexts/lookup
 * Resolve a context by traceId or by (principal, tenantId).
 */
app.post('/api/contexts/lookup',requireAuth,  (req, res) => {
  const { traceId, principal, tenantId } = req.body || {};

  if (traceId) {
    const contextId = traceIndex.get(traceId);
    if (!contextId) {
      return res.status(404).json({ error: 'No context found for traceId' });
    }
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

  res.status(400).json({
    error: 'Provide either traceId or principal/tenantId to look up a context',
  });
});

/**
 * POST /api/contexts/propagate
 * Extract a context from W3C Trace Context headers.
 *
 * Headers accepted in body:
 *   { traceparent: "00-<traceId>-<spanId>-<flags>", tracestate: "k=v,k2=v2" }
 */
app.post('/api/contexts/propagate',requireAuth,  (req, res) => {
  const { traceparent, tracestate, baggage } = req.body || {};
  if (!traceparent || typeof traceparent !== 'string') {
    return res.status(400).json({ error: 'traceparent header is required' });
  }

  // W3C: version-traceId-spanId-flags
  const parts = traceparent.split('-');
  if (parts.length !== 4) {
    return res
      .status(400)
      .json({ error: 'Invalid traceparent format. Expected: 00-<trace>-<span>-<flags>' });
  }
  const [version, traceId, spanId, flags] = parts;
  if (version !== '00') {
    return res
      .status(400)
      .json({ error: `Unsupported traceparent version: ${version}` });
  }
  if (!isHex(traceId, 32)) {
    return res
      .status(400)
      .json({ error: 'traceparent traceId must be 32 hex chars' });
  }
  if (!isHex(spanId, 16)) {
    return res
      .status(400)
      .json({ error: 'traceparent spanId must be 16 hex chars' });
  }
  if (!isHex(flags, 2)) {
    return res.status(400).json({ error: 'traceparent flags must be 2 hex chars' });
  }

  // TODO: W3C Baggage header propagation
  const parsedTracestate =
    typeof tracestate === 'string' && tracestate.length > 0
      ? tracestate
          .split(',')
          .map((kv) => kv.trim())
          .filter(Boolean)
          .reduce((acc, kv) => {
            const [k, v] = kv.split('=').map((x) => (x || '').trim());
            if (k && v) acc[k] = v;
            return acc;
          }, {})
      : {};

  const propagated = {
    traceId,
    parentSpanId: spanId,
    flags,
    sampled: (parseInt(flags, 16) & 0x01) === 1,
    tracestate: parsedTracestate,
    baggage: baggage && typeof baggage === 'object' ? baggage : {},
    extractedAt: new Date().toISOString(),
  };

  // Try to attach to existing context for this trace if one exists
  const existingContextId = traceIndex.get(traceId);
  if (existingContextId) {
    const ctx = contexts.get(existingContextId);
    recordAudit('propagate.existing', ctx.id, { traceId });
    return res.json({ ...propagated, contextId: ctx.id, existing: true });
  }

  recordAudit('propagate.new', null, { traceId });
  res.json({ ...propagated, contextId: null, existing: false });
});

// =============================================================================
// Routes - Audit & Health
// =============================================================================

/**
 * GET /api/audit
 * Return recent audit log entries.
 */
app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  res.json({
    count: auditLog.length,
    entries: auditLog.slice(-limit).reverse(),
  });
});

/**
 * GET /api/health
 * Service health check.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ContextEngine',
    port: PORT,
    version: '1.0.0',
    contexts: contexts.size,
    traces: traceIndex.size,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/**
 * GET /health
 * Alternate health endpoint (compatibility).
 */
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ContextEngine', port: PORT });
});

// =============================================================================
// TODO: Persistence & Integration (not yet implemented)
// =============================================================================
// TODO: persistence to MongoDB - replace in-memory Maps with a collection
// TODO: real-time span export to Jaeger/Tempo via OTLP
// TODO: async-hook-based automatic context propagation in Node.js (AsyncLocalStorage)
// TODO: W3C Baggage header propagation (baggage header parsing/serialization)
// TODO: Sampling rules per tenant/principal
// TODO: Distributed lock for concurrent span updates

// =============================================================================
// Bootstrap
// =============================================================================

if (require.main === module) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


  const server = app.listen(PORT, () => {
    console.log(`ContextEngine running on port ${PORT}`);
    console.log(`Health:        http://localhost:${PORT}/api/health`);
    console.log(`Contexts API:  http://localhost:${PORT}/api/contexts`);
  });
  installGracefulShutdown(server);
}

module.exports = app;
