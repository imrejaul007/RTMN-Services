/**
 * ObservabilityOS - Monitoring, Metrics & Analytics
 *
 * Monitors:
 * - AI Worker performance (accuracy, latency, throughput)
 * - Token usage and cost
 * - Workflow execution
 * - User analytics
 * - Business metrics
 * - System health
 * - SLA monitoring
 * - Anomaly detection
 * - Prometheus metrics endpoint
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import {
  prometheusRegistry,
  alertRulesGenerator,
  recordingRulesGenerator
} from './prometheus.js';

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

app.use(cors(), express.json());
const PORT = process.env.OBSERVABILITY_OS_PORT || 4592;

// Register standard Prometheus metrics
prometheusRegistry.registerStandardMetrics();

// In-memory stores
const metrics = new Map();           // metricKey -> metric data
const traces = new Map();          // traceId -> trace data
const logs = new Map();           // logId -> log entry
const alerts = new Map();         // alertId -> alert
const dashboards = new Map();    // dashboardId -> dashboard config
const reports = new Map();      // reportId -> report
const anomalies = new Map();    // anomalyId -> anomaly

// Metric types
const METRIC_TYPES = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  SUMMARY: 'summary'
};

// Agent metric categories
const AGENT_CATEGORIES = {
  PERFORMANCE: 'performance',
  ACCURACY: 'accuracy',
  LATENCY: 'latency',
  TOKEN_USAGE: 'token_usage',
  COST: 'cost',
  ERROR: 'error',
  SATISFACTION: 'satisfaction'
};

// Alert severity
const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * METRICS API
 */

// POST /api/metrics - Record a metric
app.post('/api/metrics', requireInternal, (req, res) => {
  const { name, type, value, labels, timestamp, unit } = req.body;

  if (!name || value === undefined) {
    return res.status(400).json({ error: 'name and value are required' });
  }

  const metricKey = name;
  const now = timestamp ? new Date(timestamp) : new Date();

  let metric = metrics.get(metricKey);
  if (!metric) {
    metric = {
      name,
      type: type || METRIC_TYPES.GAUGE,
      values: [],
      labels: labels || {},
      unit,
      createdAt: now.toISOString()
    };
    metrics.set(metricKey, metric);
  }

  const entry = {
    value,
    labels: labels || {},
    timestamp: now.toISOString()
  };

  metric.values.push(entry);

  // Keep last 10000 values
  if (metric.values.length > 10000) {
    metric.values = metric.values.slice(-10000);
  }

  metric.lastUpdated = now.toISOString();

  res.status(201).json({
    success: true,
    metric: {
      name,
      value,
      timestamp: entry.timestamp
    }
  });
});

// POST /api/metrics/batch - Record multiple metrics
app.post('/api/metrics/batch', requireInternal, (req, res) => {
  const { metrics: metricList } = req.body;

  if (!metricList || !Array.isArray(metricList)) {
    return res.status(400).json({ error: 'metrics array is required' });
  }

  const results = [];

  for (const m of metricList) {
    const metricKey = m.name;
    const now = m.timestamp ? new Date(m.timestamp) : new Date();

    let metric = metrics.get(metricKey);
    if (!metric) {
      metric = {
        name: m.name,
        type: m.type || METRIC_TYPES.GAUGE,
        values: [],
        labels: m.labels || {},
        unit: m.unit,
        createdAt: now.toISOString()
      };
      metrics.set(metricKey, metric);
    }

    const entry = {
      value: m.value,
      labels: m.labels || {},
      timestamp: now.toISOString()
    };

    metric.values.push(entry);
    metric.lastUpdated = now.toISOString();

    results.push({ name: m.name, recorded: true });
  }

  res.status(201).json({
    success: true,
    count: results.length,
    results
  });
});

// GET /api/metrics - List all metrics
app.get('/api/metrics', (req, res) => {
  const { prefix, limit = 100 } = req.query;

  let metricList = Array.from(metrics.entries());

  if (prefix) {
    metricList = metricList.filter(([key]) => key.startsWith(prefix));
  }

  metricList = metricList.slice(0, parseInt(limit));

  res.json({
    success: true,
    count: metricList.length,
    metrics: metricList.map(([key, metric]) => ({
      name: key,
      type: metric.type,
      lastValue: metric.values[metric.values.length - 1]?.value,
      lastUpdated: metric.lastUpdated,
      valuesCount: metric.values.length
    }))
  });
});

// GET /api/metrics/:name - Get metric details
app.get('/api/metrics/:name', (req, res) => {
  const metric = metrics.get(req.params.name);
  if (!metric) {
    return res.status(404).json({ error: 'Metric not found' });
  }

  const { from, to, aggregation = 'raw', bucket = '1h' } = req.query;

  let values = metric.values;

  // Filter by time range
  if (from) {
    values = values.filter(v => new Date(v.timestamp) >= new Date(from));
  }
  if (to) {
    values = values.filter(v => new Date(v.timestamp) <= new Date(to));
  }

  // Aggregate
  if (aggregation === 'avg') {
    // Group by bucket and average
    const grouped = groupByTime(values, bucket);
    values = grouped.map(([key, group]) => ({
      timestamp: key,
      value: group.reduce((sum, v) => sum + v.value, 0) / group.length
    }));
  } else if (aggregation === 'sum') {
    const grouped = groupByTime(values, bucket);
    values = grouped.map(([key, group]) => ({
      timestamp: key,
      value: group.reduce((sum, v) => sum + v.value, 0)
    }));
  } else if (aggregation === 'max') {
    const grouped = groupByTime(values, bucket);
    values = grouped.map(([key, group]) => ({
      timestamp: key,
      value: Math.max(...group.map(v => v.value))
    }));
  } else if (aggregation === 'min') {
    const grouped = groupByTime(values, bucket);
    values = grouped.map(([key, group]) => ({
      timestamp: key,
      value: Math.min(...group.map(v => v.value))
    }));
  }

  res.json({
    success: true,
    metric: {
      name: metric.name,
      type: metric.type,
      unit: metric.unit,
      from: from || metric.createdAt,
      to: to || new Date().toISOString(),
      aggregation,
      points: values.length,
      data: values
    }
  });
});

// GET /api/metrics/:name/latest - Get latest value
app.get('/api/metrics/:name/latest', (req, res) => {
  const metric = metrics.get(req.params.name);
  if (!metric) {
    return res.status(404).json({ error: 'Metric not found' });
  }

  const latest = metric.values[metric.values.length - 1];

  res.json({
    success: true,
    metric: {
      name: metric.name,
      value: latest?.value,
      timestamp: latest?.timestamp,
      unit: metric.unit
    }
  });
});

/**
 * AI WORKER METRICS
 */

// POST /api/ai/metrics - Record AI worker metrics
app.post('/api/ai/metrics', requireInternal, (req, res) => {
  const { agentId, category, value, metadata } = req.body;

  if (!agentId || !category || value === undefined) {
    return res.status(400).json({ error: 'agentId, category, and value are required' });
  }

  const metricName = `ai_worker.${category}.${agentId}`;

  // Record the metric
  const now = new Date();
  let metric = metrics.get(metricName);
  if (!metric) {
    metric = {
      name: metricName,
      type: METRIC_TYPES.GAUGE,
      values: [],
      labels: { agentId, category },
      createdAt: now.toISOString()
    };
    metrics.set(metricName, metric);
  }

  metric.values.push({
    value,
    metadata,
    timestamp: now.toISOString()
  });

  if (metric.values.length > 10000) {
    metric.values = metric.values.slice(-10000);
  }

  // Check for anomalies
  checkForAnomalies(metricName, value, { agentId, category });

  res.status(201).json({
    success: true,
    metric: metricName
  });
});

// GET /api/ai/metrics/:agentId - Get agent performance metrics
app.get('/api/ai/metrics/:agentId', (req, res) => {
  const { agentId } = req.params;
  const { period = '24h' } = req.query;

  const periodMs = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }[period] || 24 * 60 * 60 * 1000;

  const since = new Date(Date.now() - periodMs);

  const agentMetrics = {
    agentId,
    period,
    metrics: {}
  };

  for (const [name, metric] of metrics.entries()) {
    if (metric.labels.agentId === agentId) {
      const relevantValues = metric.values.filter(v => new Date(v.timestamp) >= since);

      if (relevantValues.length > 0) {
        const values = relevantValues.map(v => v.value);
        agentMetrics.metrics[metric.labels.category] = {
          count: values.length,
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          latest: values[values.length - 1],
          trend: calculateTrend(values)
        };
      }
    }
  }

  res.json({
    success: true,
    ...agentMetrics
  });
});

// GET /api/ai/leaderboard - AI worker leaderboard
app.get('/api/ai/leaderboard', (req, res) => {
  const { category = 'accuracy', limit = 10 } = req.query;

  const leaderboard = [];

  for (const [name, metric] of metrics.entries()) {
    if (metric.labels.category === category) {
      const values = metric.values.slice(-100);
      if (values.length > 0) {
        const avgValue = values.reduce((a, b) => a + b.value, 0) / values.length;
        leaderboard.push({
          agentId: metric.labels.agentId,
          category,
          avgScore: Math.round(avgValue * 100) / 100,
          totalRequests: values.length,
          lastActivity: metric.lastUpdated
        });
      }
    }
  }

  leaderboard.sort((a, b) => b.avgScore - a.avgScore);

  res.json({
    success: true,
    category,
    leaderboard: leaderboard.slice(0, parseInt(limit))
  });
});

/**
 * TRACES
 */

// POST /api/traces - Record a trace
app.post('/api/traces', requireInternal, (req, res) => {
  const { name, duration, status, metadata, spans } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const traceId = uuidv4();
  const now = new Date();

  const trace = {
    id: traceId,
    name,
    duration: duration || 0,
    status: status || 'ok', // ok, error, timeout
    metadata: metadata || {},
    spans: spans || [],
    timestamp: now.toISOString()
  };

  traces.set(traceId, trace);

  // Keep last 10000 traces
  if (traces.size > 10000) {
    const oldest = Array.from(traces.keys())[0];
    traces.delete(oldest);
  }

  res.status(201).json({
    success: true,
    traceId
  });
});

// GET /api/traces - List traces
app.get('/api/traces', (req, res) => {
  const { name, status, limit = 100, offset = 0 } = req.query;

  let traceList = Array.from(traces.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (name) {
    traceList = traceList.filter(t => t.name.includes(name));
  }
  if (status) {
    traceList = traceList.filter(t => t.status === status);
  }

  const total = traceList.length;
  traceList = traceList.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({
    success: true,
    total,
    offset: parseInt(offset),
    limit: parseInt(limit),
    traces: traceList.map(t => ({
      id: t.id,
      name: t.name,
      duration: t.duration,
      status: t.status,
      timestamp: t.timestamp
    }))
  });
});

// GET /api/traces/:id - Get trace details
app.get('/api/traces/:id', (req, res) => {
  const trace = traces.get(req.params.id);
  if (!trace) {
    return res.status(404).json({ error: 'Trace not found' });
  }
  res.json({ success: true, trace });
});

/**
 * LOGS
 */

// POST /api/logs - Record a log
app.post('/api/logs', requireInternal, (req, res) => {
  const { level, message, source, metadata } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const logId = uuidv4();
  const now = new Date();

  const log = {
    id: logId,
    level: level || 'info', // debug, info, warn, error
    message,
    source: source || 'unknown',
    metadata: metadata || {},
    timestamp: now.toISOString()
  };

  logs.set(logId, log);

  // Keep last 50000 logs
  if (logs.size > 50000) {
    const oldest = Array.from(logs.keys())[0];
    logs.delete(oldest);
  }

  res.status(201).json({
    success: true,
    logId
  });
});

// GET /api/logs - Query logs
app.get('/api/logs', (req, res) => {
  const { level, source, query, from, to, limit = 100 } = req.query;

  let logList = Array.from(logs.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (level) {
    logList = logList.filter(l => l.level === level);
  }
  if (source) {
    logList = logList.filter(l => l.source.includes(source));
  }
  if (query) {
    logList = logList.filter(l => l.message.includes(query));
  }
  if (from) {
    logList = logList.filter(l => new Date(l.timestamp) >= new Date(from));
  }
  if (to) {
    logList = logList.filter(l => new Date(l.timestamp) <= new Date(to));
  }

  logList = logList.slice(0, parseInt(limit));

  res.json({
    success: true,
    count: logList.length,
    logs: logList
  });
});

// GET /api/logs/stats - Log statistics
app.get('/api/logs/stats', (req, res) => {
  const { period = '1h' } = req.query;

  const periodMs = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000
  }[period] || 60 * 60 * 1000;

  const since = new Date(Date.now() - periodMs);

  const recentLogs = Array.from(logs.values())
    .filter(l => new Date(l.timestamp) >= since);

  const stats = {
    total: recentLogs.length,
    byLevel: {},
    bySource: {}
  };

  for (const log of recentLogs) {
    stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
  }

  res.json({
    success: true,
    period,
    stats
  });
});

/**
 * ALERTS
 */

// POST /api/alerts - Create alert
app.post('/api/alerts', requireInternal, (req, res) => {
  const { name, condition, threshold, severity, duration, notification } = req.body;

  if (!name || !condition || threshold === undefined) {
    return res.status(400).json({ error: 'name, condition, and threshold are required' });
  }

  const alertId = uuidv4();
  const now = new Date();

  const alert = {
    id: alertId,
    name,
    condition, // e.g., "error_rate > 0.05"
    threshold,
    severity: severity || ALERT_SEVERITY.WARNING,
    duration: duration || 300, // 5 minutes in seconds
    notification: notification || { type: 'log' },
    status: 'active',
    triggered: false,
    triggeredAt: null,
    resolvedAt: null,
    createdAt: now.toISOString()
  };

  alerts.set(alertId, alert);

  res.status(201).json({
    success: true,
    alert: {
      id: alertId,
      name,
      status: alert.status
    }
  });
});

// GET /api/alerts - List alerts
app.get('/api/alerts', (req, res) => {
  const { status } = req.query;

  let alertList = Array.from(alerts.values());

  if (status) {
    alertList = alertList.filter(a => a.status === status);
  }

  res.json({
    success: true,
    count: alertList.length,
    alerts: alertList.map(a => ({
      id: a.id,
      name: a.name,
      condition: a.condition,
      severity: a.severity,
      status: a.status,
      triggeredAt: a.triggeredAt,
      resolvedAt: a.resolvedAt
    }))
  });
});

// GET /api/alerts/:id - Get alert details
app.get('/api/alerts/:id', (req, res) => {
  const alert = alerts.get(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  res.json({ success: true, alert });
});

// POST /api/alerts/:id/acknowledge - Acknowledge alert
app.post('/api/alerts/:id/acknowledge', requireInternal, (req, res) => {
  const alert = alerts.get(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  alert.status = 'acknowledged';
  alert.acknowledgedAt = new Date().toISOString();

  res.json({
    success: true,
    alert
  });
});

// POST /api/alerts/:id/resolve - Resolve alert
app.post('/api/alerts/:id/resolve', requireInternal, (req, res) => {
  const alert = alerts.get(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  alert.status = 'resolved';
  alert.resolvedAt = new Date().toISOString();
  alert.triggered = false;

  res.json({
    success: true,
    alert
  });
});

/**
 * ANOMALIES
 */

// GET /api/anomalies - List anomalies
app.get('/api/anomalies', (req, res) => {
  const { status, limit = 50 } = req.query;

  let anomalyList = Array.from(anomalies.values())
    .sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));

  if (status) {
    anomalyList = anomalyList.filter(a => a.status === status);
  }

  res.json({
    success: true,
    count: anomalyList.length,
    anomalies: anomalyList.slice(0, parseInt(limit))
  });
});

/**
 * DASHBOARDS
 */

// GET /api/dashboards - List dashboards
app.get('/api/dashboards', (req, res) => {
  res.json({
    success: true,
    dashboards: [
      { id: 'ceo', name: 'CEO Dashboard', description: 'Executive overview' },
      { id: 'operations', name: 'Operations Dashboard', description: 'Daily ops metrics' },
      { id: 'finance', name: 'Finance Dashboard', description: 'Revenue and costs' },
      { id: 'ai-workforce', name: 'AI Workforce Dashboard', description: 'Agent performance' },
      { id: 'engineering', name: 'Engineering Dashboard', description: 'System health' },
      { id: 'security', name: 'Security Dashboard', description: 'Security events' }
    ]
  });
});

// GET /api/dashboards/:id - Get dashboard data
app.get('/api/dashboards/:id', (req, res) => {
  const dashboardData = generateDashboardData(req.params.id);
  res.json({
    success: true,
    dashboard: dashboardData
  });
});

/**
 * ANALYTICS
 */

// GET /api/analytics/overview - Platform overview
app.get('/api/analytics/overview', (req, res) => {
  const { period = '24h' } = req.query;

  const periodMs = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }[period] || 24 * 60 * 60 * 1000;

  const since = new Date(Date.now() - periodMs);

  // Calculate metrics
  const overview = {
    platform: {
      totalRequests: 0,
      activeUsers: 0,
      uptime: 99.9,
      avgLatency: 0,
      errorRate: 0
    },
    aiWorkers: {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      avgAccuracy: 0,
      avgLatency: 0
    },
    business: {
      revenue: 0,
      transactions: 0,
      newCustomers: 0,
      churnRate: 0
    },
    alerts: {
      total: 0,
      active: 0,
      critical: 0
    }
  };

  // Count metrics
  for (const [, metric] of metrics.entries()) {
    const recent = metric.values.filter(v => new Date(v.timestamp) >= since);
    if (recent.length > 0) {
      const values = recent.map(v => v.value);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      if (metric.name.includes('requests')) {
        overview.platform.totalRequests += values.reduce((a, b) => a + b, 0);
      }
      if (metric.name.includes('tokens')) {
        overview.aiWorkers.totalTokens += values.reduce((a, b) => a + b, 0);
      }
      if (metric.name.includes('cost')) {
        overview.aiWorkers.totalCost += values.reduce((a, b) => a + b, 0);
      }
      if (metric.name.includes('accuracy')) {
        overview.aiWorkers.avgAccuracy = avg;
      }
      if (metric.name.includes('latency')) {
        overview.aiWorkers.avgLatency = avg;
      }
    }
  }

  // Count active alerts
  for (const [, alert] of alerts.entries()) {
    overview.alerts.total++;
    if (alert.status === 'active' || alert.status === 'acknowledged') {
      overview.alerts.active++;
    }
    if (alert.severity === ALERT_SEVERITY.CRITICAL && alert.status === 'active') {
      overview.alerts.critical++;
    }
  }

  res.json({
    success: true,
    period,
    overview
  });
});

// GET /api/analytics/realtime - Real-time metrics
app.get('/api/analytics/realtime', (req, res) => {
  const realtime = {
    timestamp: new Date().toISOString(),
    requests: {
      total: 0,
      success: 0,
      errors: 0
    },
    latency: {
      p50: 0,
      p95: 0,
      p99: 0
    },
    aiWorkers: {
      active: 0,
      idle: 0,
      error: 0
    },
    queues: {
      pending: 0,
      processing: 0
    }
  };

  // Get recent metrics
  const recentTraces = Array.from(traces.values())
    .filter(t => new Date(t.timestamp) >= new Date(Date.now() - 60000));

  if (recentTraces.length > 0) {
    const durations = recentTraces.map(t => t.duration).filter(d => d > 0);
    if (durations.length > 0) {
      durations.sort((a, b) => a - b);
      realtime.latency.p50 = durations[Math.floor(durations.length * 0.5)] || 0;
      realtime.latency.p95 = durations[Math.floor(durations.length * 0.95)] || 0;
      realtime.latency.p99 = durations[Math.floor(durations.length * 0.99)] || 0;
    }
    realtime.requests.total = recentTraces.length;
    realtime.requests.errors = recentTraces.filter(t => t.status === 'error').length;
    realtime.requests.success = recentTraces.filter(t => t.status === 'ok').length;
  }

  res.json({
    success: true,
    ...realtime
  });
});

/**
 * HELPER FUNCTIONS
 */

function groupByTime(values, bucket) {
  const bucketMs = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  }[bucket] || 60 * 60 * 1000;

  const groups = new Map();

  for (const v of values) {
    const time = new Date(v.timestamp).getTime();
    const bucketKey = Math.floor(time / bucketMs) * bucketMs;
    const key = new Date(bucketKey).toISOString();

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(v);
  }

  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function calculateTrend(values) {
  if (values.length < 2) return 'stable';

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) * (i - xMean);
  }

  const slope = numerator / denominator;

  if (slope > 0.1) return 'increasing';
  if (slope < -0.1) return 'decreasing';
  return 'stable';
}

function checkForAnomalies(metricName, value, labels) {
  const metric = metrics.get(metricName);
  if (!metric || metric.values.length < 10) return;

  const recentValues = metric.values.slice(-20).map(v => v.value);
  const mean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
  const stdDev = Math.sqrt(recentValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / recentValues.length);

  const zScore = Math.abs((value - mean) / stdDev);

  if (zScore > 3) {
    const anomalyId = uuidv4();
    anomalies.set(anomalyId, {
      id: anomalyId,
      metric: metricName,
      value,
      expected: mean,
      deviation: zScore,
      labels,
      status: 'detected',
      detectedAt: new Date().toISOString()
    });

    // Trigger alert if high deviation
    if (zScore > 4) {
      // Would trigger notification here
    }
  }
}

function generateDashboardData(dashboardId) {
  const dashboards = {
    ceo: {
      id: 'ceo',
      name: 'CEO Dashboard',
      widgets: [
        { type: 'kpi', title: 'Monthly Revenue', value: 245000, change: 12.5 },
        { type: 'kpi', title: 'Active Companies', value: 1250, change: 8.2 },
        { type: 'kpi', title: 'AI Workers Deployed', value: 8430, change: 15.3 },
        { type: 'kpi', title: 'Customer Satisfaction', value: 94.2, change: 2.1 },
        { type: 'chart', title: 'Revenue Trend', chartType: 'line', data: [] },
        { type: 'chart', title: 'Companies by Industry', chartType: 'pie', data: [] }
      ]
    },
    operations: {
      id: 'operations',
      name: 'Operations Dashboard',
      widgets: [
        { type: 'kpi', title: 'Active Deployments', value: 342, change: 5.2 },
        { type: 'kpi', title: 'Avg Deploy Time', value: '4.2 min', change: -15 },
        { type: 'kpi', title: 'Success Rate', value: 99.2, change: 0.3 },
        { type: 'kpi', title: 'Open Incidents', value: 3, change: -2 }
      ]
    },
    'ai-workforce': {
      id: 'ai-workforce',
      name: 'AI Workforce Dashboard',
      widgets: [
        { type: 'kpi', title: 'Total AI Workers', value: 8430, change: 15 },
        { type: 'kpi', title: 'Avg Accuracy', value: 89.4, change: 1.2 },
        { type: 'kpi', title: 'Total Tasks', value: 2450000, change: 22 },
        { type: 'kpi', title: 'Token Usage', value: '1.2B', change: 18 },
        { type: 'chart', title: 'Top Performing Agents', chartType: 'bar', data: [] },
        { type: 'table', title: 'Agent Leaderboard', columns: ['Agent', 'Tasks', 'Accuracy', 'Cost'], data: [] }
      ]
    }
  };

  return dashboards[dashboardId] || dashboards.ceo;
}

/**
 * PROMETHEUS METRICS ENDPOINT
 * /metrics - Prometheus exposition format
 */

// GET /metrics - Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  // Add default labels
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(prometheusRegistry.toPrometheusFormat());
});

// GET /api/prometheus/rules - Get Prometheus alert rules
app.get('/api/prometheus/rules', (req, res) => {
  const rules = alertRulesGenerator.generateAlertRules();
  res.json({
    success: true,
    rules
  });
});

// GET /api/prometheus/recording-rules - Get Prometheus recording rules
app.get('/api/prometheus/recording-rules', (req, res) => {
  const rules = recordingRulesGenerator.generateRecordingRules();
  res.json({
    success: true,
    rules
  });
});

// GET /api/prometheus/dashboard - Get Grafana dashboard JSON
app.get('/api/prometheus/dashboard', (req, res) => {
  const dashboard = alertRulesGenerator.generateGrafanaDashboard();
  res.json({
    success: true,
    dashboard
  });
});

// POST /api/prometheus/record - Record a metric via Prometheus registry
app.post('/api/prometheus/record', requireInternal, (req, res) => {
  const { metric, type, value, labels } = req.body;

  if (!metric || value === undefined) {
    return res.status(400).json({ error: 'metric and value are required' });
  }

  const metricType = type || 'gauge';

  try {
    if (metricType === 'counter') {
      prometheusRegistry.incCounter(metric, value, labels);
    } else if (metricType === 'gauge') {
      if (value > 0) {
        prometheusRegistry.incGauge(metric, value, labels);
      } else {
        prometheusRegistry.setGauge(metric, Math.abs(value), labels);
      }
    } else {
      prometheusRegistry.observe(metric, value, labels);
    }

    res.json({ success: true, metric, value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'observability-os',
    status: 'healthy',
    version: '2.0.0',
    stats: {
      metrics: metrics.size,
      traces: traces.size,
      logs: logs.size,
      alerts: alerts.size,
      anomalies: anomalies.size
    },
    prometheus: {
      registeredMetrics: prometheusRegistry.metrics.size,
      counters: prometheusRegistry.counterMetrics.size,
      gauges: prometheusRegistry.gaugeMetrics.size,
      histograms: prometheusRegistry.histogramMetrics.size,
      summaries: prometheusRegistry.summaryMetrics.size
    }
  });
});

app.listen(PORT, () => {
  // Start pushgateway if enabled
  prometheusRegistry.startPushgateway();

  console.log(`
╔══════════════════════════════════════════════════════╗
║  ObservabilityOS — PORT ${PORT}                     ║
║  Monitoring, Metrics & Analytics                  ║
╠══════════════════════════════════════════════════════╣
║  Metrics: ${metrics.size.toString().padEnd(39)}║
║  Traces: ${traces.size.toString().padEnd(41)}║
║  Logs: ${logs.size.toString().padEnd(43)}║
║  Alerts: ${alerts.size.toString().padEnd(40)}║
║  Anomalies: ${anomalies.size.toString().padEnd(37)}║
╠══════════════════════════════════════════════════════╣
║  Prometheus:                                       ║
║    Counters: ${prometheusRegistry.counterMetrics.size.toString().padEnd(34)}║
║    Gauges: ${prometheusRegistry.gaugeMetrics.size.toString().padEnd(35)}║
║    Histograms: ${prometheusRegistry.histogramMetrics.size.toString().padEnd(30)}║
║    Summaries: ${prometheusRegistry.summaryMetrics.size.toString().padEnd(30)}║
╠══════════════════════════════════════════════════════╣
║  Endpoints:                                       ║
║    GET  /metrics          (Prometheus format)      ║
║    GET  /api/prometheus/rules                       ║
║    POST /api/prometheus/record                    ║
╚══════════════════════════════════════════════════════╝
`);
});
});

export default app;
