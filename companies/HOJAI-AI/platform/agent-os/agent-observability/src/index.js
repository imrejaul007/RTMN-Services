/**
 * agent-observability (port 4814) — Phase 32.11
 *
 * Traces, metrics, and structured logs for the HOJAI AI Agent OS.
 *   - Traces: trees of spans (parent → child) with durations and status
 *   - Metrics: time-bucketed aggregates (5-min windows) with p50/p95/p99
 *   - Logs: structured events with optional trace/span correlation
 *
 * Storage: file-backed JSON in data/traces.json, data/spans.json,
 *   data/metrics.json, data/logs.json.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4814;
const SERVICE_NAME = 'agent-observability';
const VERSION = '1.0.0';
const DATA_DIR = process.env.AGENT_OBSERVABILITY_DATA_DIR || path.join(__dirname, '../data');
const TRACES_FILE = path.join(DATA_DIR, 'traces.json');
const SPANS_FILE = path.join(DATA_DIR, 'spans.json');
const METRICS_FILE = path.join(DATA_DIR, 'metrics.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

const BUCKET_MS = 5 * 60 * 1000; // 5-minute windows
const DEFAULT_METRIC_BUCKETS = 12; // last hour by default
const PERCENTILE_SAMPLE_SIZE = 100;

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function nowIso() { return new Date().toISOString(); }
function rid(prefix) { return `${prefix}${crypto.randomBytes(8).toString('hex')}`; }
function toMs(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const t = new Date(value).getTime();
  return isNaN(t) ? null : t;
}

// ---------------------------------------------------------------------------
// Validation (pure functions)
// ---------------------------------------------------------------------------

const VALID_SPAN_KINDS = ['agent', 'tool', 'memory', 'llm', 'custom'];
const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

function validateTrace(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.agentId || typeof body.agentId !== 'string') errors.push('agentId required (string)');
  if (!body.name || typeof body.name !== 'string') errors.push('name required (string)');
  return errors;
}

function validateSpan(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.name || typeof body.name !== 'string') errors.push('name required (string)');
  if (!body.kind || !VALID_SPAN_KINDS.includes(body.kind)) {
    errors.push(`kind must be one of ${VALID_SPAN_KINDS.join(',')}`);
  }
  if (body.parentSpanId !== undefined && body.parentSpanId !== null && typeof body.parentSpanId !== 'string') {
    errors.push('parentSpanId must be string or null');
  }
  if (body.attributes !== undefined && (typeof body.attributes !== 'object' || Array.isArray(body.attributes))) {
    errors.push('attributes must be object');
  }
  return errors;
}

function validateMetric(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.name || typeof body.name !== 'string') errors.push('name required (string)');
  if (typeof body.value !== 'number' || !isFinite(body.value)) errors.push('value required (finite number)');
  return errors;
}

function validateLog(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.agentId || typeof body.agentId !== 'string') errors.push('agentId required (string)');
  if (!body.level || !VALID_LOG_LEVELS.includes(body.level)) {
    errors.push(`level must be one of ${VALID_LOG_LEVELS.join(',')}`);
  }
  if (!body.message || typeof body.message !== 'string') errors.push('message required (string)');
  if (body.attributes !== undefined && (typeof body.attributes !== 'object' || Array.isArray(body.attributes))) {
    errors.push('attributes must be object');
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Time bucketing & percentiles
// ---------------------------------------------------------------------------

/**
 * Compute the 5-minute bucket start (UTC, wall-clock aligned) for a timestamp.
 * Returns epoch milliseconds; returns null for null/invalid input.
 */
function timeBucket(timestamp) {
  if (timestamp == null) return null;
  const ms = toMs(timestamp);
  if (ms == null) return null;
  return Math.floor(ms / BUCKET_MS) * BUCKET_MS;
}

/**
 * Compute percentile using the nearest-rank method on a numeric array.
 * p is 0-100. Returns null for empty/invalid input.
 */
function percentile(arr, p) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  if (typeof p !== 'number' || isNaN(p)) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  const idx = Math.max(0, Math.min(sorted.length - 1, rank - 1));
  return sorted[idx];
}

/**
 * Compute aggregate statistics for an array of numbers.
 */
function summarizeValues(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return { count: 0, sum: 0, min: 0, max: 0, avg: 0, p50: null, p95: null, p99: null };
  }
  const count = values.length;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = sum / count;
  return {
    count,
    sum,
    min,
    max,
    avg,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
  };
}

/**
 * Generate a sequence of N consecutive 5-minute bucket starts ending at `endTs`.
 * Returns ascending-order list of bucket-start epoch ms.
 */
function calculateBuckets(endTs, n) {
  const end = toMs(endTs) ?? Date.now();
  const lastBucket = Math.floor(end / BUCKET_MS) * BUCKET_MS;
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(lastBucket - i * BUCKET_MS);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Trace tree & span helpers
// ---------------------------------------------------------------------------

/**
 * Build a parent → children tree from a flat list of spans.
 * Roots are spans with no parentSpanId. Returns { id, name, spans: [...] }.
 */
function buildTraceTree(trace, spans) {
  if (!trace) return null;
  const list = Array.isArray(spans) ? spans : [];
  const byId = new Map();
  for (const sp of list) {
    if (!sp) continue;
    byId.set(sp.id, {
      id: sp.id,
      name: sp.name,
      kind: sp.kind,
      parentSpanId: sp.parentSpanId || null,
      agentId: sp.agentId,
      startedAt: sp.startedAt,
      endedAt: sp.endedAt || null,
      durationMs: sp.durationMs != null ? sp.durationMs : null,
      attributes: sp.attributes || {},
      status: sp.status || 'ok',
      errorMessage: sp.errorMessage || null,
      children: [],
    });
  }
  const roots = [];
  for (const node of byId.values()) {
    if (!node.parentSpanId || !byId.has(node.parentSpanId)) {
      roots.push(node);
    } else {
      byId.get(node.parentSpanId).children.push(node);
    }
  }
  return {
    id: trace.id,
    agentId: trace.agentId,
    name: trace.name,
    startedAt: trace.startedAt,
    endedAt: trace.endedAt || null,
    status: trace.status,
    totalSpans: trace.totalSpans != null ? trace.totalSpans : list.length,
    totalDurationMs: trace.totalDurationMs != null ? trace.totalDurationMs : null,
    spans: roots,
  };
}

/**
 * Summarize a list of spans: counts, total duration, error count.
 */
function summarizeSpans(spans) {
  const list = Array.isArray(spans) ? spans.filter((s) => s != null) : [];
  const totalDuration = list.reduce((acc, s) => acc + (s.durationMs || 0), 0);
  const byStatus = list.reduce((acc, s) => {
    const k = s.status || 'ok';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const byKind = list.reduce((acc, s) => {
    const k = s.kind || 'custom';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  return {
    count: list.length,
    totalDurationMs: totalDuration,
    errorCount: byStatus.error || 0,
    byStatus,
    byKind,
  };
}

/**
 * Summarize activity for a single agent across traces, metrics, logs.
 */
function summarizeAgent(traces, metrics, logs, agentId) {
  if (!agentId) {
    return { agentId: null, traceCount: 0, metricCount: 0, logCount: 0 };
  }
  const agentTraces = Array.isArray(traces) ? traces.filter((t) => t && t.agentId === agentId) : [];
  const agentMetrics = Array.isArray(metrics) ? metrics.filter((m) => m && m.agentId === agentId) : [];
  const agentLogs = Array.isArray(logs) ? logs.filter((l) => l && l.agentId === agentId) : [];
  return {
    agentId,
    traceCount: agentTraces.length,
    metricCount: agentMetrics.length,
    logCount: agentLogs.length,
    errorCount: agentLogs.filter((l) => l.level === 'error').length,
    warnCount: agentLogs.filter((l) => l.level === 'warn').length,
  };
}

// ---------------------------------------------------------------------------
// Finders / listers
// ---------------------------------------------------------------------------

function findTrace(traces, id) { if (!Array.isArray(traces)) return null; return traces.find((t) => t && t.id === id) || null; }
function findSpan(spans, id) { if (!Array.isArray(spans)) return null; return spans.find((s) => s && s.id === id) || null; }
function listAll(arr) { return Array.isArray(arr) ? arr : []; }

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadTraces() {
  ensureDir();
  if (!fs.existsSync(TRACES_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(TRACES_FILE, 'utf8')); } catch { return []; }
}

function saveTraces(traces) {
  ensureDir();
  fs.writeFileSync(TRACES_FILE, JSON.stringify(traces, null, 2));
}

function loadSpans() {
  ensureDir();
  if (!fs.existsSync(SPANS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(SPANS_FILE, 'utf8')); } catch { return []; }
}

function saveSpans(spans) {
  ensureDir();
  fs.writeFileSync(SPANS_FILE, JSON.stringify(spans, null, 2));
}

function appendSpan(span) {
  ensureDir();
  const all = loadSpans();
  all.push(span);
  fs.writeFileSync(SPANS_FILE, JSON.stringify(all, null, 2));
  return span;
}

function loadMetrics() {
  ensureDir();
  if (!fs.existsSync(METRICS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8')); } catch { return []; }
}

function saveMetrics(metrics) {
  ensureDir();
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
}

function loadLogs() {
  ensureDir();
  if (!fs.existsSync(LOGS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8')); } catch { return []; }
}

function appendLog(log) {
  ensureDir();
  const all = loadLogs();
  all.push(log);
  fs.writeFileSync(LOGS_FILE, JSON.stringify(all, null, 2));
  return log;
}

// ---------------------------------------------------------------------------
// Metric aggregation
// ---------------------------------------------------------------------------

/**
 * Record a metric value into the appropriate bucket, updating count/sum/min/max
 * and appending to a sample (last 100) used for percentiles.
 */
function recordMetricValue(metrics, agentId, name, value, timestamp) {
  const ts = toMs(timestamp) ?? Date.now();
  const bucket = timeBucket(ts);
  let bucketRow = metrics.find((m) => m && m.agentId === agentId && m.name === name && m.timestamp === bucket);
  if (!bucketRow) {
    bucketRow = {
      agentId,
      name,
      timestamp: bucket,
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      avg: 0,
      p50: null,
      p95: null,
      p99: null,
      _sample: [],
    };
    metrics.push(bucketRow);
  }
  bucketRow.count += 1;
  bucketRow.sum += value;
  bucketRow.min = Math.min(bucketRow.min, value);
  bucketRow.max = Math.max(bucketRow.max, value);
  bucketRow.avg = bucketRow.sum / bucketRow.count;
  bucketRow._sample.push(value);
  if (bucketRow._sample.length > PERCENTILE_SAMPLE_SIZE) {
    bucketRow._sample = bucketRow._sample.slice(-PERCENTILE_SAMPLE_SIZE);
  }
  bucketRow.p50 = percentile(bucketRow._sample, 50);
  bucketRow.p95 = percentile(bucketRow._sample, 95);
  bucketRow.p99 = percentile(bucketRow._sample, 99);
  return bucketRow;
}

/**
 * Strip internal _sample arrays when serializing for output.
 */
function toMetricSummary(b) {
  if (!b) return b;
  const { _sample, ...rest } = b;
  return rest;
}

/**
 * Return the last N buckets for an agent, optionally filtered by metric name.
 */
function getRecentBuckets(metrics, agentId, n = DEFAULT_METRIC_BUCKETS, name = null) {
  const list = Array.isArray(metrics) ? metrics.filter((m) => m && m.agentId === agentId) : [];
  const filtered = name ? list.filter((m) => m.name === name) : list;
  filtered.sort((a, b) => a.timestamp - b.timestamp);
  return filtered.slice(-n).map(toMetricSummary);
}

/**
 * Return the last N buckets across ALL agents (system-wide view).
 */
function getSystemBuckets(metrics, n = DEFAULT_METRIC_BUCKETS) {
  const list = Array.isArray(metrics) ? metrics : [];
  const groups = new Map();
  for (const m of list) {
    const key = `${m.timestamp}|${m.name}`;
    if (!groups.has(key)) {
      groups.set(key, { timestamp: m.timestamp, name: m.name, count: 0, sum: 0, min: Infinity, max: -Infinity, _sample: [] });
    }
    const g = groups.get(key);
    g.count += m.count;
    g.sum += m.sum;
    g.min = Math.min(g.min, m.min);
    g.max = Math.max(g.max, m.max);
    if (Array.isArray(m._sample)) g._sample.push(...m._sample);
  }
  const arr = Array.from(groups.values()).map((g) => {
    g.avg = g.count > 0 ? g.sum / g.count : 0;
    if (g._sample.length > PERCENTILE_SAMPLE_SIZE) g._sample = g._sample.slice(-PERCENTILE_SAMPLE_SIZE);
    g.p50 = percentile(g._sample, 50);
    g.p95 = percentile(g._sample, 95);
    g.p99 = percentile(g._sample, 99);
    return toMetricSummary(g);
  });
  arr.sort((a, b) => a.timestamp - b.timestamp);
  return arr.slice(-n);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// Health
app.get('/health', (_req, res) => res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ---------------- Traces ----------------

app.post('/api/traces', (req, res) => {
  const errs = validateTrace(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });
  const traces = loadTraces();
  const now = new Date().toISOString();
  const trace = {
    id: rid('trc_'),
    agentId: req.body.agentId,
    name: req.body.name,
    startedAt: now,
    endedAt: null,
    status: 'running',
    totalSpans: 0,
    totalDurationMs: null,
  };
  traces.push(trace);
  saveTraces(traces);
  res.status(201).json(trace);
});

// IMPORTANT: specific routes must come BEFORE :id
app.post('/api/traces/:id/spans', (req, res) => {
  const traces = loadTraces();
  const trace = findTrace(traces, req.params.id);
  if (!trace) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const errs = validateSpan(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });
  const allSpans = loadSpans();
  if (req.body.parentSpanId && !findSpan(allSpans.filter((s) => s.traceId === trace.id), req.body.parentSpanId)) {
    return res.status(400).json({ error: 'invalid_parent', parentSpanId: req.body.parentSpanId });
  }
  const now = new Date().toISOString();
  const span = {
    id: rid('spn_'),
    traceId: trace.id,
    parentSpanId: req.body.parentSpanId || null,
    name: req.body.name,
    kind: req.body.kind,
    agentId: trace.agentId,
    startedAt: req.body.startedAt || now,
    endedAt: null,
    durationMs: null,
    attributes: req.body.attributes || {},
    status: 'ok',
    errorMessage: null,
  };
  appendSpan(span);
  const idx = traces.findIndex((t) => t.id === trace.id);
  traces[idx].totalSpans = (traces[idx].totalSpans || 0) + 1;
  saveTraces(traces);
  res.status(201).json(span);
});

// End a span — MUST come before GET /api/traces/:id
app.post('/api/traces/:id/spans/:spanId/end', (req, res) => {
  const traces = loadTraces();
  const trace = findTrace(traces, req.params.id);
  if (!trace) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const allSpans = loadSpans();
  const span = findSpan(allSpans, req.params.spanId);
  if (!span || span.traceId !== trace.id) {
    return res.status(404).json({ error: 'not_found', spanId: req.params.spanId });
  }
  const status = req.body && (req.body.status === 'error' || req.body.status === 'ok') ? req.body.status : 'ok';
  const errorMessage = req.body && req.body.errorMessage ? req.body.errorMessage : null;
  const endedAt = new Date().toISOString();
  span.endedAt = endedAt;
  span.durationMs = toMs(endedAt) - toMs(span.startedAt);
  span.status = status;
  span.errorMessage = errorMessage;
  saveSpans(allSpans);
  const traceSpans = allSpans.filter((s) => s.traceId === trace.id);
  const allEnded = traceSpans.every((s) => s.endedAt);
  if (allEnded) {
    const idx = traces.findIndex((t) => t.id === trace.id);
    traces[idx].endedAt = endedAt;
    traces[idx].status = traceSpans.some((s) => s.status === 'error') ? 'error' : 'ok';
    const startMs = toMs(traces[idx].startedAt);
    const endMs = toMs(endedAt);
    traces[idx].totalDurationMs = startMs != null && endMs != null ? endMs - startMs : null;
    saveTraces(traces);
  }
  res.json({
    id: span.id,
    traceId: span.traceId,
    durationMs: span.durationMs,
    status: span.status,
    errorMessage: span.errorMessage,
  });
});

// List traces (with filters)
app.get('/api/traces', (req, res) => {
  let traces = loadTraces();
  if (req.query.agentId) traces = traces.filter((t) => t.agentId === req.query.agentId);
  if (req.query.since) {
    const sinceMs = toMs(req.query.since);
    if (sinceMs != null) traces = traces.filter((t) => toMs(t.startedAt) >= sinceMs);
  }
  traces.sort((a, b) => toMs(b.startedAt) - toMs(a.startedAt));
  res.json({ count: traces.length, traces });
});

// Get one trace with all spans built into a tree
app.get('/api/traces/:id', (req, res) => {
  const traces = loadTraces();
  const trace = findTrace(traces, req.params.id);
  if (!trace) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const spans = loadSpans().filter((s) => s.traceId === trace.id);
  const tree = buildTraceTree(trace, spans);
  res.json(tree);
});

// ---------------- Metrics ----------------

// IMPORTANT: /api/metrics/system must come BEFORE /api/metrics/agents/:agentId
app.get('/api/metrics/system', (req, res) => {
  const n = parseInt(req.query.buckets, 10) || DEFAULT_METRIC_BUCKETS;
  const metrics = loadMetrics();
  const buckets = getSystemBuckets(metrics, n);
  res.json({ count: buckets.length, buckets });
});

// Record a metric for an agent — POST must come before GET :agentId
app.post('/api/metrics/agents/:agentId', (req, res) => {
  const errs = validateMetric(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });
  const metrics = loadMetrics();
  const bucket = recordMetricValue(
    metrics,
    req.params.agentId,
    req.body.name,
    req.body.value,
    req.body.timestamp || new Date().toISOString(),
  );
  saveMetrics(metrics);
  res.status(201).json(toMetricSummary(bucket));
});

// Get metrics for an agent
app.get('/api/metrics/agents/:agentId', (req, res) => {
  const n = parseInt(req.query.buckets, 10) || DEFAULT_METRIC_BUCKETS;
  const metrics = loadMetrics();
  const buckets = getRecentBuckets(metrics, req.params.agentId, n);
  res.json({ agentId: req.params.agentId, count: buckets.length, buckets });
});

// ---------------- Logs ----------------

app.post('/api/logs', (req, res) => {
  const errs = validateLog(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });
  const log = {
    id: rid('log_'),
    agentId: req.body.agentId,
    level: req.body.level,
    message: req.body.message,
    timestamp: req.body.timestamp || new Date().toISOString(),
    attributes: req.body.attributes || {},
    traceId: req.body.traceId || null,
    spanId: req.body.spanId || null,
  };
  appendLog(log);
  res.status(201).json(log);
});

app.get('/api/logs', (req, res) => {
  let logs = loadLogs();
  if (req.query.agentId) logs = logs.filter((l) => l.agentId === req.query.agentId);
  if (req.query.level) logs = logs.filter((l) => l.level === req.query.level);
  if (req.query.traceId) logs = logs.filter((l) => l.traceId === req.query.traceId);
  if (req.query.since) {
    const sinceMs = toMs(req.query.since);
    if (sinceMs != null) logs = logs.filter((l) => toMs(l.timestamp) >= sinceMs);
  }
  const limit = parseInt(req.query.limit, 10);
  logs.sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp));
  if (Number.isFinite(limit) && limit > 0) logs = logs.slice(0, limit);
  res.json({ count: logs.length, logs });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

if (require.main === module) {
  app.listen(PORT, () => {
    ensureDir();
    console.log(`${SERVICE_NAME} listening on :${PORT}`);
  });
}

module.exports = {
  app,
  PORT, SERVICE_NAME, VERSION, DATA_DIR,
  TRACES_FILE, SPANS_FILE, METRICS_FILE, LOGS_FILE,
  BUCKET_MS, DEFAULT_METRIC_BUCKETS, PERCENTILE_SAMPLE_SIZE,
  validateTrace, validateSpan, validateMetric, validateLog,
  timeBucket, percentile, summarizeValues, calculateBuckets,
  buildTraceTree, summarizeSpans, summarizeAgent,
  findTrace, findSpan, listAll,
  loadTraces, saveTraces, loadSpans, saveSpans, appendSpan,
  loadMetrics, saveMetrics, loadLogs, appendLog,
  recordMetricValue, toMetricSummary, getRecentBuckets, getSystemBuckets,
};