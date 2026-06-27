/**
 * Observability Engine - Workflow tracing, metrics collection, and monitoring
 * Provides distributed tracing, performance metrics, and health dashboards
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
const PORT = process.env.PORT || 5381;

app.use(cors());
app.use(express.json());

// Storage
const traces = new Map(); // traceId -> trace data
const spans = new Map(); // spanId -> span data
const metrics = new Map(); // metricKey -> aggregated value
const alerts = []; // active alerts
const dashboards = new Map(); // dashboardId -> config

// Trace types
const TRACE_STATUS = {
  OK: 'ok',
  ERROR: 'error',
  TIMEOUT: 'timeout',
};

// Create trace
function createTrace(workflowId, options = {}) {
  const traceId = crypto.randomUUID();
  const now = Date.now();

  const trace = {
    id: traceId,
    workflowId,
    instanceId: options.instanceId,
    status: TRACE_STATUS.OK,
    startTime: now,
    endTime: null,
    duration: 0,
    rootSpanId: null,
    spans: [],
    tags: options.tags || {},
    annotations: options.annotations || [],
    error: null,
    metadata: options.metadata || {},
  };

  traces.set(traceId, trace);
  return trace;
}

// Create span
function createSpan(traceId, options = {}) {
  const spanId = crypto.randomUUID();
  const now = Date.now();
  const trace = traces.get(traceId);

  if (!trace) {
    throw new Error('Trace not found');
  }

  const span = {
    id: spanId,
    traceId,
    parentId: options.parentId || null,
    name: options.name || 'unnamed',
    service: options.service || 'unknown',
    operation: options.operation || 'unknown',
    startTime: now,
    endTime: null,
    duration: 0,
    status: TRACE_STATUS.OK,
    tags: options.tags || {},
    logs: [],
    annotations: [],
    error: null,
    children: [],
  };

  spans.set(spanId, span);

  // Link to trace
  if (!trace.rootSpanId) {
    trace.rootSpanId = spanId;
  }
  trace.spans.push(spanId);

  // Link to parent
  if (options.parentId) {
    const parent = spans.get(options.parentId);
    if (parent) {
      parent.children.push(spanId);
    }
  }

  traces.set(traceId, trace);
  return span;
}

// Complete span
function completeSpan(spanId, options = {}) {
  const span = spans.get(spanId);
  if (!span) {
    throw new Error('Span not found');
  }

  span.endTime = Date.now();
  span.duration = span.endTime - span.startTime;

  if (options.status) {
    span.status = options.status;
  }

  if (options.error) {
    span.status = TRACE_STATUS.ERROR;
    span.error = options.error;
  }

  if (options.tags) {
    span.tags = { ...span.tags, ...options.tags };
  }

  if (options.logs) {
    span.logs.push(...options.logs);
  }

  spans.set(spanId, span);

  // Update trace status if error
  const trace = traces.get(span.traceId);
  if (trace && span.status === TRACE_STATUS.ERROR) {
    trace.status = TRACE_STATUS.ERROR;
    trace.error = options.error || 'Span error';
    traces.set(span.traceId, trace);
  }

  // Record metrics
  recordMetric(`span.duration.${span.service}.${span.operation}`, span.duration);

  return span;
}

// Complete trace
function completeTrace(traceId, options = {}) {
  const trace = traces.get(traceId);
  if (!trace) {
    throw new Error('Trace not found');
  }

  trace.endTime = Date.now();
  trace.duration = trace.endTime - trace.startTime;

  if (options.status) {
    trace.status = options.status;
  }

  if (options.error) {
    trace.status = TRACE_STATUS.ERROR;
    trace.error = options.error;
  }

  traces.set(traceId, trace);

  // Record metrics
  recordMetric('trace.duration', trace.duration);
  recordMetric('trace.count', 1);
  if (trace.status === TRACE_STATUS.ERROR) {
    recordMetric('trace.errors', 1);
  }

  return trace;
}

// Record metric
function recordMetric(key, value) {
  if (!metrics.has(key)) {
    metrics.set(key, {
      key,
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      avg: 0,
      lastUpdated: Date.now(),
    });
  }

  const m = metrics.get(key);
  m.count++;
  m.sum += value;
  m.avg = m.sum / m.count;
  m.min = Math.min(m.min, value);
  m.max = Math.max(m.max, value);
  m.lastUpdated = Date.now();

  metrics.set(key, m);
}

// Get metrics
function getMetrics(filter = {}) {
  let result = Array.from(metrics.values());

  if (filter.prefix) {
    result = result.filter(m => m.key.startsWith(filter.prefix));
  }

  if (filter.service) {
    result = result.filter(m => m.key.includes(filter.service));
  }

  return result;
}

// Create alert
function createAlert(alertData) {
  const alert = {
    id: crypto.randomUUID(),
    ...alertData,
    status: 'active',
    createdAt: Date.now(),
    resolvedAt: null,
  };

  alerts.push(alert);
  return alert;
}

// Get alerts
function getAlerts(options = {}) {
  let result = [...alerts];

  if (options.status) {
    result = result.filter(a => a.status === options.status);
  }

  if (options.severity) {
    result = result.filter(a => a.severity === options.severity);
  }

  if (options.limit) {
    result = result.slice(-options.limit);
  }

  return result;
}

// Resolve alert
function resolveAlert(alertId) {
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) {
    throw new Error('Alert not found');
  }

  alert.status = 'resolved';
  alert.resolvedAt = Date.now();
  return alert;
}

// Create dashboard
function createDashboard(config) {
  const dashboard = {
    id: crypto.randomUUID(),
    name: config.name || 'Unnamed Dashboard',
    widgets: config.widgets || [],
    filters: config.filters || {},
    layout: config.layout || 'grid',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  dashboards.set(dashboard.id, dashboard);
  return dashboard;
}

// Get dashboard
function getDashboard(dashboardId) {
  return dashboards.get(dashboardId) || null;
}

// Get trace
function getTrace(traceId) {
  return traces.get(traceId) || null;
}

// Get trace with spans
function getTraceWithSpans(traceId) {
  const trace = traces.get(traceId);
  if (!trace) return null;

  const traceSpans = trace.spans.map(spanId => spans.get(spanId)).filter(Boolean);

  return {
    ...trace,
    spanDetails: traceSpans,
  };
}

// Query traces
function queryTraces(options = {}) {
  let result = Array.from(traces.values());

  if (options.workflowId) {
    result = result.filter(t => t.workflowId === options.workflowId);
  }

  if (options.status) {
    result = result.filter(t => t.status === options.status);
  }

  if (options.since) {
    result = result.filter(t => t.startTime >= options.since);
  }

  if (options.limit) {
    result = result.slice(-options.limit);
  }

  // Sort by start time descending
  result.sort((a, b) => b.startTime - a.startTime);

  return result;
}

// Get dashboard data
function getDashboardData(dashboardId, timeRange = '1h') {
  const dashboard = dashboards.get(dashboardId);
  if (!dashboard) {
    throw new Error('Dashboard not found');
  }

  const now = Date.now();
  const rangeMs = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };

  const since = now - (rangeMs[timeRange] || rangeMs['1h']);

  const data = {
    dashboard,
    timeRange,
    since,
    metrics: getMetrics({ prefix: 'trace.' }),
    spans: getMetrics({ prefix: 'span.' }),
    traces: queryTraces({ since, limit: 100 }),
    alerts: getAlerts({ status: 'active' }),
    summary: {
      totalTraces: 0,
      errorRate: 0,
      avgDuration: 0,
      p95Duration: 0,
    },
  };

  // Calculate summary
  const recentTraces = data.traces;
  data.summary.totalTraces = recentTraces.length;
  const errors = recentTraces.filter(t => t.status === TRACE_STATUS.ERROR).length;
  data.summary.errorRate = recentTraces.length > 0 ? (errors / recentTraces.length) * 100 : 0;

  const durations = recentTraces.map(t => t.duration).filter(d => d > 0);
  if (durations.length > 0) {
    data.summary.avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    durations.sort((a, b) => a - b);
    data.summary.p95Duration = durations[Math.floor(durations.length * 0.95)] || 0;
  }

  return data;
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'observability-engine', port: PORT });
});

app.post('/api/traces', requireInternal, (req, res) => {
  try {
    const trace = createTrace(req.body.workflowId, req.body.options);
    res.status(201).json(trace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/traces/:traceId', (req, res) => {
  try {
    const includeSpans = req.query.includeSpans === 'true';
    const trace = includeSpans
      ? getTraceWithSpans(req.params.traceId)
      : getTrace(req.params.traceId);

    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }
    res.json(trace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/traces', (req, res) => {
  try {
    const options = {
      workflowId: req.query.workflowId,
      status: req.query.status,
      since: req.query.since ? parseInt(req.query.since) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
    };
    const traces = queryTraces(options);
    res.json(traces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/traces/:traceId/spans', requireInternal, (req, res) => {
  try {
    const span = createSpan(req.params.traceId, req.body);
    res.status(201).json(span);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/spans/:spanId', requireInternal, (req, res) => {
  try {
    const span = completeSpan(req.params.spanId, req.body);
    res.json(span);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/traces/:traceId/complete', requireInternal, (req, res) => {
  try {
    const trace = completeTrace(req.params.traceId, req.body);
    res.json(trace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metrics', (req, res) => {
  try {
    const filter = {
      prefix: req.query.prefix,
      service: req.query.service,
    };
    const metricsData = getMetrics(filter);
    res.json(metricsData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/metrics/record', requireInternal, (req, res) => {
  try {
    const { key, value } = req.body;
    recordMetric(key, value);
    res.json({ recorded: true, key, value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/alerts', (req, res) => {
  try {
    const options = {
      status: req.query.status,
      severity: req.query.severity,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
    };
    const alertsData = getAlerts(options);
    res.json(alertsData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts', requireInternal, (req, res) => {
  try {
    const alert = createAlert(req.body);
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/alerts/:alertId/resolve', requireInternal, (req, res) => {
  try {
    const alert = resolveAlert(req.params.alertId);
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dashboards', requireInternal, (req, res) => {
  try {
    const dashboard = createDashboard(req.body);
    res.status(201).json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboards/:id', (req, res) => {
  try {
    const dashboard = getDashboard(req.params.id);
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboards/:id/data', (req, res) => {
  try {
    const timeRange = req.query.timeRange || '1h';
    const data = getDashboardData(req.params.id, timeRange);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/status', (req, res) => {
  const recentTraces = queryTraces({ since: Date.now() - 60000 });
  const errors = recentTraces.filter(t => t.status === TRACE_STATUS.ERROR).length;

  res.json({
    healthy: true,
    traces: traces.size,
    spans: spans.size,
    metrics: metrics.size,
    activeAlerts: getAlerts({ status: 'active' }).length,
    recentErrorRate: recentTraces.length > 0 ? (errors / recentTraces.length) * 100 : 0,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Observability Engine service running on port ${PORT}`);
});

export { app, createTrace, createSpan, completeSpan, completeTrace, recordMetric, getMetrics, createAlert, getAlerts, resolveAlert, createDashboard, getDashboard, getTrace, queryTraces, getDashboardData, TRACE_STATUS };