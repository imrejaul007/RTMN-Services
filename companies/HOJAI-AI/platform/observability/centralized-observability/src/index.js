/**
 * HOJAI Centralized Observability Platform (port 4900) — Phase 21
 * ---------------------------------------------------------------------------
 * Single pane of glass for all HOJAI AI services:
 *
 *   - Service Registry    — register/de-register services, track uptime
 *   - Health Aggregation  — poll /health on all registered services
 *   - Metrics Collection — ingest counters, gauges, histograms per service
 *   - Log Aggregation    — ingest structured log lines from all services
 *   - Trace Collection   — ingest spans and assemble into traces
 *   - Alert Rules        — threshold-based alerting (latency, error rate, downtime)
 *   - Alert History      — track firing/resolved state over time
 *   - Dashboard API      — aggregated views (service health, error rate, latency p50/p95)
 *   - Dependency Graph   — track which services call which
 *
 * Storage:   file-backed JSON (atomic temp+rename writes)
 * Auth:      X-Internal-Token header
 * Upstream polling requires internal tokens for each service
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '4900', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'centralized-observability-token';
const DATA_DIR = () => process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '30000', 10);
const RETENTION_MS = parseInt(process.env.RETENTION_MS || String(7 * 24 * 60 * 60 * 1000), 10); // 7 days

function ensureDir() {
  const d = DATA_DIR();
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}
function dataFile(name) {
  ensureDir();
  return path.join(DATA_DIR(), `${name}.json`);
}

function load(name, defaults) {
  const f = dataFile(name);
  if (!fs.existsSync(f)) return defaults;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (_) { return defaults; }
}

function save(name, data) {
  const f = dataFile(name);
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, f);
}

// ---------------------------------------------------------------------------
// In-memory state (reloaded from disk on start)
// ---------------------------------------------------------------------------

let registry = load('registry', { services: {} });          // { [id]: ServiceReg }
let metrics = load('metrics', { series: {} });              // { [serviceId]: MetricSeries[] }
let logs = load('logs', { entries: [] });                  // LogEntry[]
let traces = load('traces', { traces: {}, spans: {} });    // TraceMap
let alerts = load('alerts', { rules: [], history: [] });   // AlertState
let deps = load('dependencies', { edges: {} });             // { [serviceId]: string[] }
let pollState = { timers: {} };

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function now() { return Date.now(); }
function newId(prefix) { return `${prefix}_${crypto.randomBytes(4).toString('hex')}`; }

function trimOld(arr, maxAge = RETENTION_MS) {
  const cutoff = now() - maxAge;
  return arr.filter(e => (e.timestamp || 0) >= cutoff);
}

function percentiles(arr, pcts = [50, 95, 99]) {
  if (!arr.length) return {};
  const sorted = [...arr].sort((a, b) => a - b);
  const result = {};
  for (const p of pcts) {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    result[`p${p}`] = sorted[Math.max(0, idx)];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

function maybeAuth(req, res, next) {
  // Allow unauthenticated reads for dashboards
  if (req.headers['x-internal-token'] === INTERNAL_TOKEN) req.isInternal = true;
  next();
}

// ---------------------------------------------------------------------------
// Service Registry
// ---------------------------------------------------------------------------

function svcHealthColor(status) {
  return status === 'up' ? '#22c55e' : status === 'degraded' ? '#f59e0b' : '#ef4444';
}

// ---------------------------------------------------------------------------
// Alert evaluation
// ---------------------------------------------------------------------------

function evaluateAlerts(serviceId, metricValues) {
  const fired = [];
  for (const rule of alerts.rules) {
    if (rule.serviceId && rule.serviceId !== serviceId) continue;
    if (!rule.metric) continue;
    const val = metricValues[rule.metric];
    if (val === undefined) continue;
    let triggered = false;
    if (rule.operator === 'gt' && val > rule.threshold) triggered = true;
    if (rule.operator === 'lt' && val < rule.threshold) triggered = true;
    if (rule.operator === 'gte' && val >= rule.threshold) triggered = true;
    if (rule.operator === 'lte' && val <= rule.threshold) triggered = true;
    if (rule.operator === 'eq' && val === rule.threshold) triggered = true;
    if (triggered) fired.push(rule);
  }
  return fired;
}

function recordAlert(rule, serviceId) {
  const entry = {
    id: newId('alt'),
    ruleId: rule.id,
    ruleName: rule.name,
    serviceId,
    severity: rule.severity || 'warning',
    message: `${rule.name}: ${rule.metric} is ${rule.operator} ${rule.threshold} (current: ${JSON.stringify(metricValuesForAlert(rule, serviceId))})`,
    firedAt: new Date().toISOString(),
    resolvedAt: null,
  };
  alerts.history.push(entry);
  if (alerts.history.length > 5000) alerts.history = alerts.history.slice(-5000);
  save('alerts', alerts);
  return entry;
}

function metricValuesForAlert(rule, serviceId) {
  const series = metrics.series[serviceId] || {};
  const points = series[rule.metric];
  if (!points || !points.length) return undefined;
  return points[points.length - 1].value;
}

// ---------------------------------------------------------------------------
// Health polling
// ---------------------------------------------------------------------------

async function pollService(serviceId) {
  const svc = registry.services[serviceId];
  if (!svc || !svc.healthUrl) return;

  const start = Date.now();
  try {
    const res = await axios.get(`${svc.healthUrl}/health`, {
      timeout: 5000,
      headers: svc.internalToken ? { 'x-internal-token': svc.internalToken } : {},
    });
    const latency = Date.now() - start;
    const status = (res.data?.status === 'ok' || res.data?.ok) ? 'up' : 'degraded';

    svc.lastHealth = { status, latency, at: new Date().toISOString(), httpStatus: res.status };

    // Record latency metric
    ingestMetric(serviceId, 'health_latency_ms', latency, 'gauge');
    ingestMetric(serviceId, 'health_status', status === 'up' ? 1 : status === 'degraded' ? 0.5 : 0, 'gauge');

    registry.services[serviceId] = svc;
    save('registry', registry);

    // Evaluate alerts
    const vals = { health_latency_ms: latency, health_status: status === 'up' ? 1 : 0 };
    const fired = evaluateAlerts(serviceId, vals);
    for (const rule of fired) {
      // Avoid duplicate alerts within 5 minutes
      const recent = alerts.history.find(h => h.ruleId === rule.id && !h.resolvedAt &&
        (now() - new Date(h.firedAt).getTime()) < 300000);
      if (!recent) recordAlert(rule, serviceId);
    }
  } catch (err) {
    const latency = Date.now() - start;
    svc.lastHealth = { status: 'down', latency, at: new Date().toISOString(), error: err.message };
    registry.services[serviceId] = svc;
    save('registry', registry);
    ingestMetric(serviceId, 'health_status', 0, 'gauge');
    const vals = { health_status: 0 };
    const fired = evaluateAlerts(serviceId, vals);
    for (const rule of fired) {
      const recent = alerts.history.find(h => h.ruleId === rule.id && !h.resolvedAt &&
        (now() - new Date(h.firedAt).getTime()) < 300000);
      if (!recent) recordAlert(rule, serviceId);
    }
  }
}

function startPolling(serviceId) {
  if (pollState.timers[serviceId]) clearInterval(pollState.timers[serviceId]);
  pollState.timers[serviceId] = setInterval(() => pollService(serviceId), POLL_INTERVAL_MS);
  // Immediate first poll
  pollService(serviceId);
}

function stopPolling(serviceId) {
  if (pollState.timers[serviceId]) {
    clearInterval(pollState.timers[serviceId]);
    delete pollState.timers[serviceId];
  }
}

// ---------------------------------------------------------------------------
// Metric ingestion
// ---------------------------------------------------------------------------

function ingestMetric(serviceId, metric, value, type = 'counter') {
  if (!metrics.series[serviceId]) metrics.series[serviceId] = {};
  if (!metrics.series[serviceId][metric]) {
    metrics.series[serviceId][metric] = [];
  }
  const point = { value: Number(value), timestamp: now() };
  metrics.series[serviceId][metric].push(point);
  // Trim to last 1000 points per metric
  if (metrics.series[serviceId][metric].length > 1000) {
    metrics.series[serviceId][metric] = metrics.series[serviceId][metric].slice(-1000);
  }
  save('metrics', metrics);
}

function aggregateMetrics(serviceId, metric, windowMs = 3600000) {
  const series = metrics.series[serviceId]?.[metric];
  if (!series || !series.length) return null;
  const cutoff = now() - windowMs;
  const window = series.filter(p => p.timestamp >= cutoff);
  if (!window.length) return null;
  const vals = window.map(p => p.value);
  const pcts = percentiles(vals);
  return {
    count: vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    sum: vals.reduce((a, b) => a + b, 0),
    ...pcts,
  };
}

// ---------------------------------------------------------------------------
// Log ingestion
// ---------------------------------------------------------------------------

function ingestLog(serviceId, level, message, meta) {
  const entry = {
    id: newId('log'),
    serviceId,
    level: level || 'info',
    message,
    meta: meta || {},
    timestamp: new Date().toISOString(),
    ts: now(),
  };
  logs.entries.push(entry);
  // Trim old logs
  logs.entries = trimOld(logs.entries);
  if (logs.entries.length > 10000) logs.entries = logs.entries.slice(-10000);
  save('logs', logs);
}

// ---------------------------------------------------------------------------
// Trace ingestion
// ---------------------------------------------------------------------------

function ingestSpan(serviceId, traceId, span) {
  if (!traces.spans[traceId]) traces.spans[traceId] = {};
  traces.spans[traceId][span.id] = { ...span, serviceId, traceId, receivedAt: now() };
  save('traces', traces);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use((_req, res, next) => { res.set('X-Platform', 'HOJAI-Observability'); next(); });

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'centralized-observability', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ── Service Registry ────────────────────────────────────────────────────

  app.get('/api/services', maybeAuth, (_req, res) => {
    const list = Object.values(registry.services).map(s => ({
      id: s.id,
      name: s.name,
      version: s.version,
      status: s.lastHealth?.status || 'unknown',
      latencyMs: s.lastHealth?.latency,
      lastCheck: s.lastHealth?.at,
      endpoints: s.endpoints,
    }));
    res.json({ count: list.length, services: list });
  });

  app.post('/api/services', requireInternal, (req, res) => {
    const { id, name, version, healthUrl, internalToken, endpoints, dependencies } = req.body || {};
    if (!id || !name) return res.status(400).json({ error: 'id and name required' });
    const svc = {
      id, name, version: version || '1.0.0',
      healthUrl: healthUrl || null,
      internalToken: internalToken || null,
      endpoints: endpoints || [],
      dependencies: dependencies || [],
      registeredAt: new Date().toISOString(),
      lastHealth: null,
    };
    registry.services[id] = svc;
    save('registry', registry);
    if (healthUrl) startPolling(id);
    res.status(201).json({ success: true, service: svc });
  });

  app.delete('/api/services/:id', requireInternal, (req, res) => {
    const { id } = req.params;
    if (!registry.services[id]) return res.status(404).json({ error: 'not_found' });
    stopPolling(id);
    delete registry.services[id];
    save('registry', registry);
    res.json({ success: true, deleted: id });
  });

  app.post('/api/services/:id/poll', requireInternal, async (req, res) => {
    await pollService(req.params.id);
    res.json({ success: true, health: registry.services[req.params.id]?.lastHealth });
  });

  // ── Metrics ─────────────────────────────────────────────────────────────

  app.post('/api/metrics/:serviceId', requireInternal, (req, res) => {
    const { serviceId } = req.params;
    const { metrics: mList } = req.body || {};
    if (!Array.isArray(mList)) return res.status(400).json({ error: 'metrics[] required' });
    for (const { metric, value, type } of mList) {
      ingestMetric(serviceId, metric, value, type);
    }
    res.json({ success: true, count: mList.length });
  });

  app.get('/api/metrics/:serviceId/:metric', maybeAuth, (req, res) => {
    const { serviceId, metric } = req.params;
    const windowMs = parseInt(req.query.window || '3600000', 10);
    const agg = aggregateMetrics(serviceId, metric, windowMs);
    if (!agg) return res.status(404).json({ error: 'no data' });
    res.json({ serviceId, metric, windowMs, ...agg });
  });

  app.get('/api/metrics/:serviceId', maybeAuth, (req, res) => {
    const { serviceId } = req.params;
    const series = metrics.series[serviceId] || {};
    const result = {};
    for (const [metric, points] of Object.entries(series)) {
      const windowMs = parseInt(req.query.window || '3600000', 10);
      result[metric] = aggregateMetrics(serviceId, metric, windowMs);
    }
    res.json({ serviceId, metrics: result });
  });

  // ── Logs ────────────────────────────────────────────────────────────────

  app.post('/api/logs/:serviceId', requireInternal, (req, res) => {
    const { serviceId } = req.params;
    let { entries } = req.body || {};
    if (!Array.isArray(entries)) {
      // Single log: { level, message, meta }
      if (req.body.level || req.body.message) {
        entries = [req.body];
      } else {
        return res.status(400).json({ error: 'entries[] or {level, message} required' });
      }
    }
    for (const e of entries) ingestLog(serviceId, e.level, e.message, e.meta);
    res.json({ success: true, count: entries.length });
  });

  app.get('/api/logs', maybeAuth, (req, res) => {
    const { serviceId, level, q, limit } = req.query;
    let filtered = logs.entries;
    if (serviceId) filtered = filtered.filter(e => e.serviceId === serviceId);
    if (level) filtered = filtered.filter(e => e.level === level);
    if (q) { const qq = q.toLowerCase(); filtered = filtered.filter(e => e.message.toLowerCase().includes(qq)); }
    filtered = filtered.slice(-(parseInt(limit || '100', 10)));
    res.json({ count: filtered.length, entries: filtered });
  });

  // ── Traces ──────────────────────────────────────────────────────────────

  app.post('/api/traces/:serviceId', requireInternal, (req, res) => {
    const { serviceId } = req.params;
    const { spans } = req.body || [];
    if (!Array.isArray(spans)) return res.status(400).json({ error: 'spans[] required' });
    for (const span of spans) {
      const traceId = span.traceId || span.trace_id || newId('tr');
      ingestSpan(serviceId, traceId, span);
    }
    res.json({ success: true, count: spans.length });
  });

  app.get('/api/traces/:traceId', maybeAuth, (req, res) => {
    const { traceId } = req.params;
    const spanMap = traces.spans[traceId];
    if (!spanMap) return res.status(404).json({ error: 'not_found' });
    const spanList = Object.values(spanMap).sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
    res.json({ traceId, spans: spanList, count: spanList.length });
  });

  // ── Alerts ───────────────────────────────────────────────────────────────

  app.get('/api/alerts/rules', maybeAuth, (_req, res) => {
    res.json({ rules: alerts.rules });
  });

  app.post('/api/alerts/rules', requireInternal, (req, res) => {
    const { name, metric, operator, threshold, serviceId, severity, windowMs } = req.body || {};
    if (!name || !metric || !operator || threshold === undefined) {
      return res.status(400).json({ error: 'name, metric, operator, threshold required' });
    }
    const rule = {
      id: newId('alr'),
      name, metric, operator, threshold,
      serviceId: serviceId || null,
      severity: severity || 'warning',
      windowMs: windowMs || 300000,
      createdAt: new Date().toISOString(),
    };
    alerts.rules.push(rule);
    save('alerts', alerts);
    res.status(201).json({ success: true, rule });
  });

  app.delete('/api/alerts/rules/:id', requireInternal, (req, res) => {
    const before = alerts.rules.length;
    alerts.rules = alerts.rules.filter(r => r.id !== req.params.id);
    if (alerts.rules.length === before) return res.status(404).json({ error: 'not_found' });
    save('alerts', alerts);
    res.json({ success: true });
  });

  app.get('/api/alerts/history', maybeAuth, (req, res) => {
    const { serviceId, severity, status, limit } = req.query;
    let history = alerts.history;
    if (serviceId) history = history.filter(h => h.serviceId === serviceId);
    if (severity) history = history.filter(h => h.severity === severity);
    if (status === 'active') history = history.filter(h => !h.resolvedAt);
    if (status === 'resolved') history = history.filter(h => !!h.resolvedAt);
    history = history.slice(-(parseInt(limit || '100', 10)));
    res.json({ count: history.length, entries: history.reverse() });
  });

  app.post('/api/alerts/history/:id/resolve', requireInternal, (req, res) => {
    const entry = alerts.history.find(h => h.id === req.params.id);
    if (!entry) return res.status(404).json({ error: 'not_found' });
    entry.resolvedAt = new Date().toISOString();
    save('alerts', alerts);
    res.json({ success: true, entry });
  });

  // ── Dashboard ───────────────────────────────────────────────────────────

  app.get('/api/dashboard/summary', maybeAuth, (_req, res) => {
    const services = Object.values(registry.services);
    const byStatus = { up: 0, degraded: 0, down: 0, unknown: 0 };
    for (const s of services) {
      const status = s.lastHealth?.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
    const recentErrors = logs.entries.filter(e => e.level === 'error').slice(-20);
    const activeAlerts = alerts.history.filter(h => !h.resolvedAt);
    const bySeverity = { critical: 0, warning: 0, info: 0 };
    for (const a of activeAlerts) bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;

    res.json({
      services: {
        total: services.length,
        byStatus,
      },
      alerts: {
        total: alerts.rules.length,
        active: activeAlerts.length,
        bySeverity,
      },
      errors: {
        count: recentErrors.length,
        recent: recentErrors.slice(-10),
      },
      metrics: {
        servicesWithData: Object.keys(metrics.series).length,
        totalLogEntries: logs.entries.length,
        totalTraces: Object.keys(traces.spans).length,
      },
    });
  });

  app.get('/api/dashboard/service/:serviceId', maybeAuth, (req, res) => {
    const { serviceId } = req.params;
    const svc = registry.services[serviceId];
    if (!svc) return res.status(404).json({ error: 'not_found' });

    const svcMetrics = metrics.series[serviceId] || {};
    const aggMetrics = {};
    for (const [metric, points] of Object.entries(svcMetrics)) {
      aggMetrics[metric] = aggregateMetrics(serviceId, metric, 3600000);
    }

    const svcLogs = logs.entries.filter(e => e.serviceId === serviceId).slice(-50);
    const svcAlerts = alerts.history.filter(h => h.serviceId === serviceId && !h.resolvedAt);

    res.json({
      service: {
        id: svc.id,
        name: svc.name,
        status: svc.lastHealth?.status || 'unknown',
        latencyMs: svc.lastHealth?.latency,
        lastCheck: svc.lastHealth?.at,
      },
      metrics: aggMetrics,
      logs: svcLogs.slice(-20),
      activeAlerts: svcAlerts,
    });
  });

  // ── Dependencies ─────────────────────────────────────────────────────────

  app.get('/api/dependencies', maybeAuth, (_req, res) => {
    const edges = [];
    for (const [from, toList] of Object.entries(deps.edges)) {
      for (const to of toList) {
        edges.push({ from, to });
      }
    }
    res.json({ nodes: Object.values(registry.services).map(s => ({ id: s.id, name: s.name })), edges });
  });

  app.post('/api/dependencies', requireInternal, (req, res) => {
    const { from, to } = req.body || {};
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });
    if (!deps.edges[from]) deps.edges[from] = [];
    if (!deps.edges[from].includes(to)) deps.edges[from].push(to);
    save('dependencies', deps);
    res.json({ success: true });
  });

  // ── Flush/cleanup endpoints ───────────────────────────────────────────────

  app.post('/api/maintenance/flush', requireInternal, (_req, res) => {
    logs.entries = trimOld(logs.entries);
    for (const [sid, mSeries] of Object.entries(metrics.series)) {
      for (const [metric, points] of Object.entries(mSeries)) {
        metrics.series[sid][metric] = trimOld(points);
      }
    }
    alerts.history = trimOld(alerts.history);
    save('logs', logs);
    save('metrics', metrics);
    save('alerts', alerts);
    res.json({ success: true, at: new Date().toISOString() });
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

if (require.main === module) {
  const app = createApp();
  // Start polling for all registered services with healthUrls
  for (const [id, svc] of Object.entries(registry.services)) {
    if (svc.healthUrl) startPolling(id);
  }
  app.listen(PORT, () => {
    console.log(`centralized-observability listening on ${PORT}`);
    console.log(`Registered services: ${Object.keys(registry.services).length}`);
    console.log(`Alert rules: ${alerts.rules.length}`);
  });
}

module.exports = { createApp, startPolling, stopPolling };
