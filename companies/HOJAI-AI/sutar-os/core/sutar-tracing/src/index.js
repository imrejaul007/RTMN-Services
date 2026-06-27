/**
 * SUTAR OS — Distributed Tracing Service
 *
 * Provides request tracing, execution replay, and debugging
 * for autonomous agent operations across the SUTAR ecosystem.
 *
 * Endpoints:
 *   POST /api/traces              — Start a new trace
 *   GET  /api/traces/:traceId     — Get trace with all spans
 *   POST /api/traces/:traceId/spans — Add spans to a trace
 *   PUT  /api/traces/:traceId/end  — End a trace
 *   GET  /api/traces              — List traces (filterable)
 *   POST /api/replay/:traceId     — Replay a trace
 *   GET  /api/debug/:traceId      — Debug info for a trace
 *   GET  /api/metrics             — Tracing metrics
 *   GET  /health
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { setupSecurity, requireAuth } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());

setupSecurity(app, { serviceName: 'sutar-tracing' });

const PORT = process.env.TRACING_PORT || 4606;

// ---------- In-Memory Trace Store ----------
const traces = new Map(); // traceId → trace object
const spans = new Map(); // traceId → span[]
const MAX_TRACES = 10000;
const MAX_SPANS_PER_TRACE = 5000;

// ---------- Trace Management ----------
function startTrace(params) {
  const traceId = params.traceId || uuidv4();
  const trace = {
    traceId,
    serviceName: params.serviceName || 'sutar-os',
    operationName: params.operationName,
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'running',
    duration: null,
    parentTraceId: params.parentTraceId || null,
    sampled: params.sampled !== false,
    tags: params.tags || {},
    annotations: [],
    errorCount: 0,
    spanCount: 0,
    traceLevel: params.traceLevel || 'normal', // normal | verbose | critical
  };
  traces.set(traceId, trace);
  spans.set(traceId, []);

  // Evict oldest if over limit
  if (traces.size > MAX_TRACES) {
    const oldest = Array.from(traces.values()).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
    traces.delete(oldest.traceId);
    spans.delete(oldest.traceId);
  }

  return trace;
}

function addSpan(traceId, params) {
  const trace = traces.get(traceId);
  if (!trace) return { error: 'Trace not found' };

  const traceSpans = spans.get(traceId);
  if (traceSpans.length >= MAX_SPANS_PER_TRACE) {
    return { error: 'Max spans per trace reached', maxSpans: MAX_SPANS_PER_TRACE };
  }

  const spanId = uuidv4();
  const span = {
    spanId,
    traceId,
    parentSpanId: params.parentSpanId || null,
    operationName: params.operationName,
    serviceName: params.serviceName || trace.serviceName,
    startTime: params.startTime || new Date().toISOString(),
    endTime: null,
    duration: null,
    status: 'ok',
    tags: params.tags || {},
    logs: params.logs || [],
    annotations: params.annotations || [],
    error: params.error || null,
    localEndpoint: params.localEndpoint || { serviceName: trace.serviceName, ipv4: '127.0.0.1' },
  };

  traceSpans.push(span);
  trace.spanCount = traceSpans.length;

  if (params.error) {
    trace.errorCount++;
    span.status = 'error';
    span.tags['error'] = true;
    span.tags['error.kind'] = params.error.kind || 'Error';
    span.tags['error.message'] = params.error.message || 'Unknown error';
  }

  return span;
}

function endTrace(traceId, params = {}) {
  const trace = traces.get(traceId);
  if (!trace) return { error: 'Trace not found' };

  trace.endTime = params.endTime || new Date().toISOString();
  trace.status = params.status || (trace.errorCount > 0 ? 'error' : 'ok');
  trace.duration = new Date(trace.endTime).getTime() - new Date(trace.startTime).getTime();
  trace.annotations.push(...(params.annotations || []));

  return trace;
}

// ---------- Replay ----------
function replayTrace(traceId) {
  const trace = traces.get(traceId);
  if (!trace) return { error: 'Trace not found' };

  const traceSpans = spans.get(traceId) || [];
  const replayLog = [];

  for (const span of traceSpans) {
    replayLog.push({
      step: replayLog.length + 1,
      operation: span.operationName,
      service: span.serviceName,
      startTime: span.startTime,
      duration: span.duration || null,
      status: span.status,
      tags: span.tags,
      result: span.error ? { error: span.error.message } : { success: true },
    });
  }

  return {
    traceId,
    operationName: trace.operationName,
    totalSteps: replayLog.length,
    totalDuration: trace.duration,
    status: trace.status,
    steps: replayLog,
    replayedAt: new Date().toISOString(),
  };
}

// ---------- Debug ----------
function debugTrace(traceId) {
  const trace = traces.get(traceId);
  if (!trace) return { error: 'Trace not found' };

  const traceSpans = spans.get(traceId) || [];

  // Find the critical path (longest spans)
  const sortedSpans = [...traceSpans].sort((a, b) => {
    const aDur = a.duration || 0;
    const bDur = b.duration || 0;
    return bDur - aDur;
  });

  const criticalPath = [];
  let current = sortedSpans[0];
  while (current) {
    criticalPath.push({
      operation: current.operationName,
      service: current.serviceName,
      duration: current.duration || 0,
      spanId: current.spanId,
    });
    current = traceSpans.find(s => s.parentSpanId === current?.spanId);
  }

  // Error summary
  const errors = traceSpans.filter(s => s.status === 'error');

  return {
    traceId,
    summary: {
      status: trace.status,
      totalDuration: trace.duration,
      totalSpans: trace.spanCount,
      errorCount: trace.errorCount,
      serviceCount: new Set(traceSpans.map(s => s.serviceName)).size,
    },
    criticalPath,
    errors: errors.map(e => ({
      operation: e.operationName,
      service: e.serviceName,
      error: e.error,
      time: e.startTime,
    })),
    spanTimeline: traceSpans.map(s => ({
      operation: s.operationName,
      service: s.serviceName,
      start: s.startTime,
      duration: s.duration || 0,
      isRoot: !s.parentSpanId,
      hasChildren: traceSpans.some(child => child.parentSpanId === s.spanId),
    })),
  };
}

// ---------- Metrics ----------
function getTracingMetrics() {
  const activeTraces = Array.from(traces.values()).filter(t => t.status === 'running');
  const completedTraces = Array.from(traces.values()).filter(t => t.status !== 'running');
  const errorTraces = completedTraces.filter(t => t.status === 'error');

  const durations = completedTraces.map(t => t.duration).filter(Boolean).sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

  return {
    timestamp: new Date().toISOString(),
    activeTraces: activeTraces.length,
    completedTraces: completedTraces.length,
    errorTraces: errorTraces.length,
    totalTraces: traces.size,
    errorRate: completedTraces.length > 0 ? (errorTraces.length / completedTraces.length * 100).toFixed(2) + '%' : '0%',
    avgDuration: completedTraces.length > 0 ? Math.round(completedTraces.reduce((s, t) => s + (t.duration || 0), 0) / completedTraces.length) : 0,
    latency: { p50, p95, p99 },
    topServices: Object.entries(
      Array.from(spans.values()).flat().reduce((acc, s) => {
        acc[s.serviceName] = (acc[s.serviceName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ service: name, spanCount: count })),
  };
}

// ---------- Routes ----------
app.post('/api/traces', requireAuth, (req, res) => {
  const trace = startTrace(req.body);
  res.status(201).json(trace);
});

app.get('/api/traces', requireAuth, (req, res) => {
  const { status, serviceName, limit } = req.query;
  let list = Array.from(traces.values());
  if (status) list = list.filter(t => t.status === status);
  if (serviceName) list = list.filter(t => t.serviceName === serviceName);
  list.sort((a, b) => b.startTime.localeCompare(a.startTime));
  const pageSize = Math.min(parseInt(limit) || 100, 1000);
  res.json({ total: list.length, returned: Math.min(list.length, pageSize), traces: list.slice(0, pageSize) });
});

app.get('/api/traces/:traceId', requireAuth, (req, res) => {
  const trace = traces.get(req.params.traceId);
  if (!trace) return res.status(404).json({ error: 'Trace not found' });
  const traceSpans = spans.get(req.params.traceId) || [];
  res.json({ trace, spans: traceSpans });
});

app.post('/api/traces/:traceId/spans', requireAuth, (req, res) => {
  const span = addSpan(req.params.traceId, req.body);
  if (span.error) return res.status(400).json(span);
  res.status(201).json(span);
});

app.put('/api/traces/:traceId/end', requireAuth, (req, res) => {
  const trace = endTrace(req.params.traceId, req.body);
  if (trace.error) return res.status(404).json(trace);
  res.json(trace);
});

app.post('/api/replay/:traceId', requireAuth, (req, res) => {
  const replay = replayTrace(req.params.traceId);
  if (replay.error) return res.status(404).json(replay);
  res.json(replay);
});

app.get('/api/debug/:traceId', requireAuth, (req, res) => {
  const debug = debugTrace(req.params.traceId);
  if (debug.error) return res.status(404).json(debug);
  res.json(debug);
});

app.get('/api/metrics', requireAuth, (_req, res) => {
  res.json(getTracingMetrics());
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sutar-tracing',
    port: PORT,
    layer: 'Observability',
    activeTraces: Array.from(traces.values()).filter(t => t.status === 'running').length,
    totalTraces: traces.size,
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[sutar-tracing] listening on :${PORT}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });