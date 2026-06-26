/**
 * Observability OS - Log Aggregation & Distributed Tracing
 * Port: 5273
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5273;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// In-memory stores
const logs = new Map();
const traces = new Map();
const metrics = new Map();
const alerts = new Map();

// Health
app.get('/health', (_, res) => res.json({
  status: 'healthy',
  service: 'observability-os',
  version: '1.0.0',
  port: PORT,
  capabilities: ['log_aggregation', 'distributed_tracing', 'metrics_collection', 'anomaly_detection', 'alerting']
}));

// Log Routes
app.post('/api/logs', (req, res) => {
  const { service, level, message, metadata, timestamp } = req.body;
  if (!service || !message) return res.status(400).json({ error: 'service and message required' });

  const log = {
    id: `log-${uuidv4().slice(0, 12)}`,
    service,
    level: level || 'info',
    message,
    metadata: metadata || {},
    timestamp: timestamp || new Date().toISOString(),
    requestId: req.headers['x-request-id'] || null
  };

  logs.set(log.id, log);
  res.status(201).json(log);
});

app.post('/api/logs/batch', (req, res) => {
  const { logs: logBatch } = req.body;
  if (!Array.isArray(logBatch)) return res.status(400).json({ error: 'logs array required' });

  const created = logBatch.map(log => {
    const id = `log-${uuidv4().slice(0, 12)}`;
    const entry = {
      id,
      service: log.service || 'unknown',
      level: log.level || 'info',
      message: log.message,
      metadata: log.metadata || {},
      timestamp: log.timestamp || new Date().toISOString()
    };
    logs.set(id, entry);
    return id;
  });

  res.status(201).json({ count: created.length, ids: created });
});

app.get('/api/logs', (req, res) => {
  let list = Array.from(logs.values());

  if (req.query.service) list = list.filter(l => l.service === req.query.service);
  if (req.query.level) list = list.filter(l => l.level === req.query.level);
  if (req.query.requestId) list = list.filter(l => l.requestId === req.query.requestId);

  // Sort by timestamp descending
  list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Pagination
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  res.json({
    count: list.length,
    total: list.length,
    logs: list.slice(offset, offset + limit)
  });
});

app.get('/api/logs/search', (req, res) => {
  const { query, service, start, end } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  let list = Array.from(logs.values());
  const lowerQuery = query.toLowerCase();

  list = list.filter(l =>
    l.message.toLowerCase().includes(lowerQuery) ||
    (l.service && l.service.toLowerCase().includes(lowerQuery))
  );

  if (service) list = list.filter(l => l.service === service);
  if (start) list = list.filter(l => new Date(l.timestamp) >= new Date(start));
  if (end) list = list.filter(l => new Date(l.timestamp) <= new Date(end));

  res.json({ count: list.length, logs: list.slice(0, 100) });
});

// Distributed Tracing Routes
app.post('/api/traces', (req, res) => {
  const { traceId, spanId, service, operation, duration, status, metadata } = req.body;
  if (!service || !operation) return res.status(400).json({ error: 'service and operation required' });

  const trace = {
    id: `trace-${uuidv4().slice(0, 12)}`,
    traceId: traceId || `trace-${uuidv4().slice(0, 16)}`,
    spanId: spanId || null,
    service,
    operation,
    duration: duration || 0,
    status: status || 'ok',
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  };

  traces.set(trace.id, trace);
  res.status(201).json(trace);
});

app.get('/api/traces/:traceId', (req, res) => {
  const traceList = Array.from(traces.values())
    .filter(t => t.traceId === req.params.traceId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (traceList.length === 0) return res.status(404).json({ error: 'Trace not found' });

  const totalDuration = traceList.reduce((sum, t) => sum + (t.duration || 0), 0);

  res.json({
    traceId: req.params.traceId,
    spans: traceList,
    spanCount: traceList.length,
    totalDuration
  });
});

app.get('/api/traces', (req, res) => {
  const { service, start, end } = req.query;

  let list = Array.from(traces.values());

  if (service) list = list.filter(t => t.service === service);
  if (start) list = list.filter(t => new Date(t.timestamp) >= new Date(start));
  if (end) list = list.filter(t => new Date(t.timestamp) <= new Date(end));

  // Group by traceId
  const byTrace = {};
  list.forEach(t => {
    if (!byTrace[t.traceId]) {
      byTrace[t.traceId] = { spans: [], totalDuration: 0 };
    }
    byTrace[t.traceId].spans.push(t);
    byTrace[t.traceId].totalDuration += t.duration || 0;
  });

  res.json({
    count: Object.keys(byTrace).length,
    traces: Object.entries(byTrace).map(([traceId, data]) => ({
      traceId,
      spanCount: data.spans.length,
      totalDuration: data.totalDuration,
      services: [...new Set(data.spans.map(s => s.service))]
    }))
  });
});

// Metrics Routes
app.post('/api/metrics', (req, res) => {
  const { service, metric, value, tags, timestamp } = req.body;
  if (!service || !metric || value === undefined) {
    return res.status(400).json({ error: 'service, metric, and value required' });
  }

  const met = {
    id: `met-${uuidv4().slice(0, 12)}`,
    service,
    metric,
    value,
    tags: tags || {},
    timestamp: timestamp || new Date().toISOString()
  };

  metrics.set(met.id, met);
  res.status(201).json(met);
});

app.get('/api/metrics', (req, res) => {
  const { service, metric, start, end } = req.query;

  let list = Array.from(metrics.values());

  if (service) list = list.filter(m => m.service === service);
  if (metric) list = list.filter(m => m.metric === metric);
  if (start) list = list.filter(m => new Date(m.timestamp) >= new Date(start));
  if (end) list = list.filter(m => new Date(m.timestamp) <= new Date(end));

  res.json({ count: list.length, metrics: list.slice(-100) });
});

app.get('/api/metrics/summary', (req, res) => {
  const { service, metric } = req.query;

  let list = Array.from(metrics.values());
  if (service) list = list.filter(m => m.service === service);
  if (metric) list = list.filter(m => m.metric === metric);

  if (list.length === 0) return res.json({ summary: null });

  const values = list.map(m => m.value);
  const sum = values.reduce((a, b) => a + b, 0);

  res.json({
    service: service || 'all',
    metric: metric || 'all',
    count: values.length,
    avg: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values)
  });
});

// Alerting Routes
app.post('/api/alerts', (req, res) => {
  const { service, severity, message, condition, threshold } = req.body;
  if (!service || !message) return res.status(400).json({ error: 'service and message required' });

  const alert = {
    id: `alert-${uuidv4().slice(0, 12)}`,
    service,
    severity: severity || 'warning',
    message,
    condition: condition || null,
    threshold: threshold || null,
    status: 'firing',
    createdAt: new Date().toISOString(),
    resolvedAt: null
  };

  alerts.set(alert.id, alert);
  res.status(201).json(alert);
});

app.get('/api/alerts', (req, res) => {
  let list = Array.from(alerts.values());
  if (req.query.status) list = list.filter(a => a.status === req.query.status);
  if (req.query.severity) list = list.filter(a => a.severity === req.query.severity);
  res.json({ count: list.length, alerts: list });
});

app.patch('/api/alerts/:id', (req, res) => {
  const alert = alerts.get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Not found' });

  if (req.body.status === 'resolved') {
    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
  }

  alerts.set(alert.id, alert);
  res.json(alert);
});

// Statistics
app.get('/api/stats', (_, res) => {
  res.json({
    logs: logs.size,
    traces: traces.size,
    metrics: metrics.size,
    alerts: alerts.size,
    firingAlerts: Array.from(alerts.values()).filter(a => a.status === 'firing').length
  });
});

app.listen(PORT, () => {
  console.log(`[ObservabilityOS] Observability OS running on port ${PORT}`);
  console.log('Capabilities: Log Aggregation, Distributed Tracing, Metrics, Alerting');
});
