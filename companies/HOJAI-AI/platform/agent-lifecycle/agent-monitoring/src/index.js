/**
 * agent-monitoring — Quality / Performance / Cost Metrics
 * Port: 4914
 *
 * Records time-windowed metrics for agent versions:
 *   - quality:    success_rate, error_rate, user_rating, p95_accuracy
 *   - performance: latency_ms (p50/p95/p99), throughput_rps, queue_depth
 *   - cost:        tokens_used, cost_usd, cost_per_request
 *
 * Supports thresholds that, when breached, trigger alerts (and can
 * signal agent-rollback to revert).
 *
 * Storage: JSON file at $DATA_DIR/metrics.json
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4914', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'lifecycle-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'metrics.json');

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ datapoints: [], thresholds: {}, alerts: [] }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { datapoints: [], thresholds: {}, alerts: [] }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

const VALID_METRIC_KINDS = ['quality', 'performance', 'cost'];
const VALID_QUALITY = ['success_rate', 'error_rate', 'user_rating', 'p95_accuracy'];
const VALID_PERF = ['latency_ms', 'throughput_rps', 'queue_depth'];
const VALID_COST = ['tokens_used', 'cost_usd', 'cost_per_request'];

function validateDatapoint(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.agentId) return 'agentId required';
  if (!body.version) return 'version required';
  if (!body.kind || !VALID_METRIC_KINDS.includes(body.kind)) return `kind must be one of ${VALID_METRIC_KINDS.join(',')}`;
  if (typeof body.metric !== 'string' || !body.metric) return 'metric name required';
  if (typeof body.value !== 'number') return 'value must be number';
  return null;
}

function computePercentile(values, p) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function aggregateByWindow(datapoints, windowMs) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const inWindow = datapoints.filter((d) => new Date(d.recorded_at).getTime() >= cutoff);
  return inWindow;
}

function checkThresholds(agentId, version, datapoints, thresholds) {
  const key = `${agentId}@${version}`;
  const t = thresholds[key];
  if (!t) return [];
  const alerts = [];
  // Group by metric
  const byMetric = {};
  for (const d of datapoints) {
    const k = `${d.kind}:${d.metric}`;
    if (!byMetric[k]) byMetric[k] = [];
    byMetric[k].push(d.value);
  }
  for (const [mk, vals] of Object.entries(byMetric)) {
    const [kind, metric] = mk.split(':');
    const thresholdConfig = (t[kind] || {})[metric];
    if (!thresholdConfig) continue;
    // For latency_ms / cost / error_rate: alert if value > threshold
    // For success_rate / throughput: alert if value < threshold
    const breach = (val) => {
      if (thresholdConfig.max !== undefined && val > thresholdConfig.max) return `exceeded max ${thresholdConfig.max}`;
      if (thresholdConfig.min !== undefined && val < thresholdConfig.min) return `below min ${thresholdConfig.min}`;
      return null;
    };
    for (const v of vals) {
      const reason = breach(v);
      if (reason) {
        alerts.push({ kind, metric, value: v, reason, threshold: thresholdConfig });
        break; // one alert per metric per check
      }
    }
  }
  return alerts;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'agent-monitoring', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Set thresholds for an agent@version
  app.put('/agents/:agentId/versions/:version/thresholds', requireInternal, (req, res) => {
    const { agentId, version } = req.params;
    const data = loadAll();
    data.thresholds[`${agentId}@${version}`] = req.body || {};
    saveAll(data);
    res.json({ agent_id: agentId, version, thresholds: data.thresholds[`${agentId}@${version}`] });
  });

  // Get thresholds
  app.get('/agents/:agentId/versions/:version/thresholds', requireInternal, (req, res) => {
    const data = loadAll();
    const t = data.thresholds[`${req.params.agentId}@${req.params.version}`] || {};
    res.json({ agent_id: req.params.agentId, version: req.params.version, thresholds: t });
  });

  // Record a single metric datapoint
  app.post('/metrics', requireInternal, (req, res) => {
    const err = validateDatapoint(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const dp = {
      id: newId('m'),
      agent_id: req.body.agentId,
      version: req.body.version,
      kind: req.body.kind,
      metric: req.body.metric,
      value: req.body.value,
      recorded_at: req.body.recorded_at || nowIso(),
      tags: req.body.tags || {},
    };
    data.datapoints.push(dp);
    // Cap to last 10000 datapoints
    if (data.datapoints.length > 10000) data.datapoints = data.datapoints.slice(-10000);
    // Check thresholds and record alerts
    const agentDps = data.datapoints.filter((d) => d.agent_id === dp.agent_id && d.version === dp.version);
    const alerts = checkThresholds(dp.agent_id, dp.version, agentDps, data.thresholds);
    if (alerts.length) {
      for (const a of alerts) {
        data.alerts.push({
          id: newId('alert'),
          agent_id: dp.agent_id,
          version: dp.version,
          ...a,
          created_at: nowIso(),
          acknowledged: false,
        });
      }
      if (data.alerts.length > 1000) data.alerts = data.alerts.slice(-1000);
    }
    saveAll(data);
    res.status(201).json(dp);
  });

  // Batch record multiple datapoints
  app.post('/metrics/batch', requireInternal, (req, res) => {
    const { datapoints } = req.body || {};
    if (!Array.isArray(datapoints)) return res.status(400).json({ error: 'validation', message: 'datapoints array required' });
    const data = loadAll();
    const created = [];
    for (const dp of datapoints) {
      const err = validateDatapoint(dp);
      if (err) return res.status(400).json({ error: 'validation', message: err, bad_datapoint: dp });
      const full = {
        id: newId('m'),
        agent_id: dp.agentId,
        version: dp.version,
        kind: dp.kind,
        metric: dp.metric,
        value: dp.value,
        recorded_at: dp.recorded_at || nowIso(),
        tags: dp.tags || {},
      };
      data.datapoints.push(full);
      created.push(full);
    }
    if (data.datapoints.length > 10000) data.datapoints = data.datapoints.slice(-10000);
    saveAll(data);
    res.status(201).json({ count: created.length, datapoints: created });
  });

  // Query metrics with optional filters
  app.get('/metrics', requireInternal, (req, res) => {
    const data = loadAll();
    let items = data.datapoints.slice();
    if (req.query.agentId) items = items.filter((d) => d.agent_id === req.query.agentId);
    if (req.query.version) items = items.filter((d) => d.version === req.query.version);
    if (req.query.kind) items = items.filter((d) => d.kind === req.query.kind);
    if (req.query.metric) items = items.filter((d) => d.metric === req.query.metric);
    items = items.slice(-100).reverse();
    res.json({ count: items.length, datapoints: items });
  });

  // Aggregate metrics over a time window (default 1h)
  app.get('/metrics/aggregate', requireInternal, (req, res) => {
    const data = loadAll();
    const windowMs = parseInt(req.query.window_ms || (60 * 60 * 1000), 10);
    let items = data.datapoints.slice();
    if (req.query.agentId) items = items.filter((d) => d.agent_id === req.query.agentId);
    if (req.query.version) items = items.filter((d) => d.version === req.query.version);
    const inWindow = aggregateByWindow(items, windowMs);
    // Group by metric
    const byMetric = {};
    for (const d of inWindow) {
      const k = `${d.kind}:${d.metric}`;
      if (!byMetric[k]) byMetric[k] = { kind: d.kind, metric: d.metric, values: [] };
      byMetric[k].values.push(d.value);
    }
    const aggregated = Object.values(byMetric).map((m) => ({
      kind: m.kind,
      metric: m.metric,
      count: m.values.length,
      min: Math.min(...m.values),
      max: Math.max(...m.values),
      avg: m.values.reduce((s, v) => s + v, 0) / m.values.length,
      p50: computePercentile(m.values, 50),
      p95: computePercentile(m.values, 95),
      p99: computePercentile(m.values, 99),
    }));
    res.json({ window_ms: windowMs, count: inWindow.length, metrics: aggregated });
  });

  // List alerts (optionally filter)
  app.get('/alerts', requireInternal, (req, res) => {
    const data = loadAll();
    let items = data.alerts.slice().reverse();
    if (req.query.agentId) items = items.filter((a) => a.agent_id === req.query.agentId);
    if (req.query.acknowledged) items = items.filter((a) => String(a.acknowledged) === req.query.acknowledged);
    items = items.slice(0, 100);
    res.json({ count: items.length, alerts: items });
  });

  // Acknowledge an alert
  app.post('/alerts/:id/acknowledge', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.alerts.find((x) => x.id === req.params.id);
    if (!a) return res.status(404).json({ error: 'not_found' });
    a.acknowledged = true;
    a.acknowledged_at = nowIso();
    saveAll(data);
    res.json(a);
  });

  // Check thresholds now (manual trigger)
  app.post('/agents/:agentId/versions/:version/check', requireInternal, (req, res) => {
    const { agentId, version } = req.params;
    const data = loadAll();
    const dps = data.datapoints.filter((d) => d.agent_id === agentId && d.version === version);
    const alerts = checkThresholds(agentId, version, dps, data.thresholds);
    res.json({ alerts, threshold_count: Object.keys(data.thresholds[`${agentId}@${version}`] || {}).length });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[agent-monitoring] listening on :${PORT} data=${DATA_FILE}`));
}

module.exports = { createApp, validateDatapoint, computePercentile, aggregateByWindow, checkThresholds };