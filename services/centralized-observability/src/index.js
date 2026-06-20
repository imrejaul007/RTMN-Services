// Centralized Observability (4153)
// Foundation service: aggregates metrics + traces + logs from across RTMN/HOJAI AI.
// Every other service can POST a sample here, and SRE can query aggregated stats.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

const PORT = process.env.PORT || 4153;
const SERVICE = 'centralized-observability';

// ---------- In-memory stores ----------
const metrics = new Map();    // metricId -> { id, name, type, value, labels, service, ts }
const traces = new Map();     // traceId  -> { id, name, service, spans, duration_ms, ts }
const logs = new Map();       // logId    -> { id, level, service, message, fields, ts }
const alerts = new Map();     // alertId  -> { id, name, condition, severity, status, fired_at }
const dashboards = new Map(); // dashId   -> { id, name, panels }

// ---------- Helpers ----------
const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx];
}

// ---------- Seed ----------
function seed() {
  // Metric series
  const metricSeeds = [
    { name: 'http_requests_total', type: 'counter', service: 'sales-os', value: 12453 },
    { name: 'http_requests_total', type: 'counter', service: 'marketing-os', value: 8721 },
    { name: 'http_requests_total', type: 'counter', service: 'restaurant-os', value: 5430 },
    { name: 'ai_inference_seconds', type: 'histogram', service: 'ai-intelligence', value: 0.42 },
    { name: 'ai_inference_seconds', type: 'histogram', service: 'ai-intelligence', value: 0.31 },
    { name: 'ai_inference_seconds', type: 'histogram', service: 'ai-intelligence', value: 0.55 },
    { name: 'db_query_seconds', type: 'histogram', service: 'memory-os', value: 0.012 },
    { name: 'cache_hit_ratio', type: 'gauge', service: 'semantic-cache', value: 0.78 }
  ];
  metricSeeds.forEach(m => {
    const id = uuid();
    metrics.set(id, { id, ...m, labels: {}, ts: new Date().toISOString() });
  });

  // Traces
  const traceSeeds = [
    { name: 'POST /api/orders', service: 'order-twin', duration_ms: 142 },
    { name: 'POST /api/twins/update', service: 'twinos-hub', duration_ms: 87 },
    { name: 'GET /api/customer360/:id', service: 'unified-os-hub', duration_ms: 312 },
    { name: 'POST /api/ai/chat', service: 'ai-intelligence', duration_ms: 854 }
  ];
  traceSeeds.forEach(t => {
    const id = uuid();
    traces.set(id, {
      id, ...t,
      spans: [
        { span_id: uuid(), name: 'auth', duration_ms: 5 },
        { span_id: uuid(), name: 'handler', duration_ms: t.duration_ms - 10 },
        { span_id: uuid(), name: 'db', duration_ms: 4 }
      ],
      ts: new Date().toISOString()
    });
  });

  // Alerts
  const alertSeeds = [
    { name: 'High error rate', condition: 'http_errors_5xx > 5/min', severity: 'critical', status: 'firing' },
    { name: 'High p99 latency', condition: 'p99_latency_ms > 1000', severity: 'warning', status: 'firing' },
    { name: 'Low cache hit ratio', condition: 'cache_hit_ratio < 0.5', severity: 'warning', status: 'resolved' },
    { name: 'Disk space low', condition: 'disk_free_pct < 10', severity: 'critical', status: 'firing' }
  ];
  alertSeeds.forEach(a => {
    const id = uuid();
    alerts.set(id, { id, ...a, fired_at: new Date(Date.now() - Math.random() * 3600000).toISOString() });
  });

  // Dashboards
  const dashSeeds = [
    { name: 'Platform Overview', panels: ['requests_total', 'error_rate', 'p99_latency', 'active_twins'] },
    { name: 'AI Inference', panels: ['inference_count', 'inference_p95', 'model_errors', 'token_usage'] }
  ];
  dashSeeds.forEach(d => {
    const id = uuid();
    dashboards.set(id, { id, ...d });
  });
}

// ---------- Routes ----------
app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy', metrics: metrics.size, traces: traces.size, logs: logs.size, alerts: alerts.size })));
app.get('/ready', (_req, res) => res.json(ok({ ready: true })));

// ---- Metrics ----
app.post('/api/metrics', (req, res) => {
  const { name, type, value, service, labels } = req.body || {};
  if (!name || !type || value == null || !service) return res.status(400).json(fail('name, type, value, service required'));
  const id = uuid();
  const metric = { id, name, type, value, service, labels: labels || {}, ts: new Date().toISOString() };
  metrics.set(id, metric);
  res.status(201).json(ok({ metric }));
});
app.get('/api/metrics', (req, res) => {
  const { service, name, type } = req.query;
  let list = [...metrics.values()];
  if (service) list = list.filter(m => m.service === service);
  if (name) list = list.filter(m => m.name === name);
  if (type) list = list.filter(m => m.type === type);
  res.json(ok({ metrics: list, count: list.length }));
});

// Aggregate: returns count/avg/sum/min/max/p50/p95/p99
app.get('/api/metrics/aggregate', (req, res) => {
  const { name, service } = req.query;
  if (!name) return res.status(400).json(fail('name required'));
  let list = [...metrics.values()].filter(m => m.name === name);
  if (service) list = list.filter(m => m.service === service);
  if (list.length === 0) return res.json(ok({ count: 0 }));
  const values = list.map(m => Number(m.value)).sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  res.json(ok({
    name, service: service || 'all',
    count: values.length,
    sum, avg: sum / values.length, min: values[0], max: values[values.length - 1],
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99)
  }));
});

// ---- Traces ----
app.post('/api/traces', (req, res) => {
  const { name, service, spans, duration_ms } = req.body || {};
  if (!name || !service) return res.status(400).json(fail('name, service required'));
  const id = uuid();
  const trace = { id, name, service, spans: spans || [], duration_ms: duration_ms || 0, ts: new Date().toISOString() };
  traces.set(id, trace);
  res.status(201).json(ok({ trace }));
});
app.get('/api/traces', (req, res) => {
  const { service, min_duration } = req.query;
  let list = [...traces.values()];
  if (service) list = list.filter(t => t.service === service);
  if (min_duration) list = list.filter(t => t.duration_ms >= Number(min_duration));
  res.json(ok({ traces: list, count: list.length }));
});
app.get('/api/traces/:id', (req, res) => {
  const trace = traces.get(req.params.id);
  if (!trace) return res.status(404).json(fail('trace not found'));
  res.json(ok({ trace }));
});

// ---- Logs ----
app.post('/api/logs', (req, res) => {
  const { level, service, message, fields } = req.body || {};
  if (!level || !service || !message) return res.status(400).json(fail('level, service, message required'));
  const id = uuid();
  const log = { id, level, service, message, fields: fields || {}, ts: new Date().toISOString() };
  logs.set(id, log);
  res.status(201).json(ok({ log }));
});
app.get('/api/logs', (req, res) => {
  const { level, service, q } = req.query;
  let list = [...logs.values()];
  if (level) list = list.filter(l => l.level === level);
  if (service) list = list.filter(l => l.service === service);
  if (q) list = list.filter(l => l.message.toLowerCase().includes(String(q).toLowerCase()));
  res.json(ok({ logs: list.slice(-100), count: list.length }));
});

// ---- Alerts ----
app.get('/api/alerts', (_req, res) => {
  const list = [...alerts.values()];
  const firing = list.filter(a => a.status === 'firing').length;
  res.json(ok({ alerts: list, total: list.length, firing }));
});
app.post('/api/alerts', (req, res) => {
  const { name, condition, severity } = req.body || {};
  if (!name || !condition || !severity) return res.status(400).json(fail('name, condition, severity required'));
  const id = uuid();
  const alert = { id, name, condition, severity, status: 'firing', fired_at: new Date().toISOString() };
  alerts.set(id, alert);
  res.status(201).json(ok({ alert }));
});
app.patch('/api/alerts/:id', (req, res) => {
  const alert = alerts.get(req.params.id);
  if (!alert) return res.status(404).json(fail('alert not found'));
  if (req.body.status) alert.status = req.body.status;
  res.json(ok({ alert }));
});

// ---- Dashboards ----
app.get('/api/dashboards', (_req, res) => res.json(ok({ dashboards: [...dashboards.values()] })));
app.post('/api/dashboards', (req, res) => {
  const { name, panels } = req.body || {};
  if (!name || !Array.isArray(panels)) return res.status(400).json(fail('name, panels[] required'));
  const id = uuid();
  const dash = { id, name, panels };
  dashboards.set(id, dash);
  res.status(201).json(ok({ dashboard: dash }));
});

// ---- Stats ----
app.get('/api/stats', (_req, res) => {
  const services = new Set([...metrics.values()].map(m => m.service));
  res.json(ok({
    metrics: metrics.size, traces: traces.size, logs: logs.size,
    alerts: alerts.size, firing_alerts: [...alerts.values()].filter(a => a.status === 'firing').length,
    dashboards: dashboards.size, services_observed: services.size
  }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));