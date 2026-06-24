/**
 * SUTAR OS — Monitoring (port 3100)
 *
 * Base observability layer for SUTAR. Tracks service health (via /health
 * probes), accepts metric samples, exposes alert rules, and provides a
 * log aggregator for unified inspection.
 *
 * Endpoints:
 *   POST /api/probe                       Record a service health probe result
 *   GET  /api/services                    List known services + last health status
 *   GET  /api/services/:id/health         Last probe result for a service
 *   GET  /api/services/:id/history        Probe history (last N)
 *   POST /api/metrics                     Push a metric sample
 *   GET  /api/metrics/:service            Get latest metric samples for service
 *   POST /api/alerts/rules                Create an alert rule
 *   GET  /api/alerts/rules                List alert rules
 *   DELETE /api/alerts/rules/:id          Remove alert rule
 *   GET  /api/alerts/active               List active alerts (rules that have fired)
 *   POST /api/alerts/active/:id/resolve   Resolve an active alert
 *   POST /api/logs                        Push a log entry
 *   GET  /api/logs                        List logs (filter by service/level)
 *   GET  /api/stats                       Aggregate counts
 *   GET  /health
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');
const rezIntel = require('./rez-intel-client');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 3100;
const SERVICE_NAME = 'sutar-monitoring';
setupSecurity(app, { serviceName: 'sutar-monitoring' });
// ---------- Stores ----------
const services = new PersistentMap('services', { serviceName: 'sutar-monitoring' });   // id -> { id, name, url, port, lastStatus, lastProbedAt }
const probes = [];            // history: { serviceId, status, latencyMs, httpStatus, timestamp, error }
const metrics = new PersistentMap('metrics', { serviceName: 'sutar-monitoring' });    // serviceId -> [{ name, value, tags, timestamp }]
const alertRules = new PersistentMap('alert-rules', { serviceName: 'sutar-monitoring' }); // ruleId -> { id, name, serviceId, metric, comparator, threshold, severity, ... }
const activeAlerts = new PersistentMap('active-alerts', { serviceName: 'sutar-monitoring' });
const logs = [];              // { service, level, message, timestamp, meta }

// ---------- Seed ----------
function seed() {
  // Known SUTAR services (target URLs the monitor will check)
  const known = [
    { id: 'svc-intent-bus', name: 'SUTAR Intent Bus', url: 'http://localhost:4154', port: 4154 },
    { id: 'svc-usage-tracker', name: 'SUTAR Usage Tracker', url: 'http://localhost:4252', port: 4252 },
    { id: 'svc-simulation-os', name: 'SUTAR Simulation OS', url: 'http://localhost:4241', port: 4241 },
    { id: 'svc-discovery-engine', name: 'SUTAR Discovery Engine', url: 'http://localhost:4256', port: 4256 },
    { id: 'svc-roi-calculator', name: 'SUTAR ROI Calculator', url: 'http://localhost:4259', port: 4259 },
    { id: 'svc-decision-engine', name: 'SUTAR Decision Engine', url: 'http://localhost:4240', port: 4240 },
    { id: 'svc-goal-os', name: 'SUTAR Goal OS', url: 'http://localhost:4242', port: 4242 },
    { id: 'svc-trust-engine', name: 'SUTAR Trust Engine', url: 'http://localhost:4180', port: 4180 },
    { id: 'svc-negotiation-ai', name: 'SUTAR Negotiation AI', url: 'http://localhost:4850', port: 4850 },
    { id: 'svc-ai-intelligence', name: 'HOJAI Intelligence', url: 'http://localhost:4881', port: 4881 }
  ];
  for (const s of known) {
    services.set(s.id, { ...s, lastStatus: 'unknown', lastProbedAt: null, lastLatencyMs: null });
    metrics.set(s.id, []);
  }

  // Sample alert rule
  const ruleId = uuid();
  alertRules.set(ruleId, {
    id: ruleId,
    name: 'High latency on SUTAR services',
    serviceId: '*',
    metric: 'http_latency_ms',
    comparator: 'gt',
    threshold: 1000,
    severity: 'warning',
    enabled: true,
    createdAt: Date.now()
  });
}

// ---------- Helpers ----------
async function probeService(svc) {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(svc.url + '/health', { signal: ctrl.signal });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    const status = res.ok ? 'healthy' : 'unhealthy';
    const probe = { serviceId: svc.id, status, latencyMs, httpStatus: res.status, timestamp: Date.now(), error: null };
    probes.push(probe);
    svc.lastStatus = status;
    svc.lastProbedAt = probe.timestamp;
    svc.lastLatencyMs = latencyMs;
    evaluateRulesFor(svc, probe);
    return probe;
  } catch (err) {
    const latencyMs = Date.now() - start;
    const probe = { serviceId: svc.id, status: 'unreachable', latencyMs, httpStatus: null, timestamp: Date.now(), error: err.message };
    probes.push(probe);
    svc.lastStatus = 'unreachable';
    svc.lastProbedAt = probe.timestamp;
    svc.lastLatencyMs = latencyMs;
    evaluateRulesFor(svc, probe);
    return probe;
  }
}

function evaluateRulesFor(svc, probe) {
  for (const rule of alertRules.values()) {
    if (!rule.enabled) continue;
    if (rule.serviceId !== '*' && rule.serviceId !== svc.id) continue;
    let value = null;
    if (rule.metric === 'http_latency_ms') value = probe.latencyMs;
    else if (rule.metric === 'http_status') value = probe.httpStatus;
    if (value == null) continue;

    let fired = false;
    if (rule.comparator === 'gt' && value > rule.threshold) fired = true;
    else if (rule.comparator === 'gte' && value >= rule.threshold) fired = true;
    else if (rule.comparator === 'lt' && value < rule.threshold) fired = true;
    else if (rule.comparator === 'lte' && value <= rule.threshold) fired = true;
    else if (rule.comparator === 'eq' && value === rule.threshold) fired = true;
    else if (rule.comparator === 'ne' && value !== rule.threshold) fired = true;

    if (fired) {
      // Don't double-fire
      const existing = Array.from(activeAlerts.values()).find(a => a.ruleId === rule.id && a.serviceId === svc.id && !a.resolved);
      if (!existing) {
        const id = uuid();
        activeAlerts.set(id, {
          id, ruleId: rule.id, ruleName: rule.name,
          serviceId: svc.id, serviceName: svc.name,
          metric: rule.metric, value, threshold: rule.threshold,
          comparator: rule.comparator, severity: rule.severity,
          firedAt: Date.now(), resolved: false, resolvedAt: null
        });
      }
    } else {
      // Auto-resolve if condition no longer met
      const existing = Array.from(activeAlerts.values()).find(a => a.ruleId === rule.id && a.serviceId === svc.id && !a.resolved);
      if (existing) {
        existing.resolved = true;
        existing.resolvedAt = Date.now();
        existing.autoResolved = true;
      }
    }
  }
}

// Background probe every 30s
setInterval(async () => {
  for (const svc of services.values()) {
    try { await probeService(svc); } catch (_) { /* ignore */ }
  }
}, 30 * 1000).unref();

// ---------- Health ----------
app.get('/health', (_req, res) => {
  const servicesArr = Array.from(services.values());
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    sutarLayer: 1,
    layer: 'Base Observability',
    port: PORT,
    counts: {
      services: services.size,
      probes: probes.length,
      metrics: Array.from(metrics.values()).reduce((s, arr) => s + arr.length, 0),
      alertRules: alertRules.size,
      activeAlerts: Array.from(activeAlerts.values()).filter(a => !a.resolved).length,
      logs: logs.length
    },
    healthy: servicesArr.filter(s => s.lastStatus === 'healthy').length,
    timestamp: new Date().toISOString()
  });
});

// ---------- Probes ----------
app.post('/api/probe',requireAuth,  async (req, res) => {
  const { serviceId } = req.body || {};
  if (!serviceId || !services.has(serviceId)) return res.status(404).json({ error: 'Service not registered. Use /api/services to register first.' });
  const svc = services.get(serviceId);
  const probe = await probeService(svc);
  res.json({ probe });
});

app.post('/api/probe/all',requireAuth,  async (_req, res) => {
  const results = [];
  for (const svc of services.values()) {
    results.push(await probeService(svc));
  }
  res.json({ count: results.length, results });
});

// ---------- Services ----------
app.get('/api/services', (_req, res) => {
  const rows = Array.from(services.values()).map(s => ({
    id: s.id, name: s.name, url: s.url, port: s.port,
    lastStatus: s.lastStatus, lastProbedAt: s.lastProbedAt, lastLatencyMs: s.lastLatencyMs
  }));
  res.json({ count: rows.length, services: rows });
});

app.get('/api/services/:id/health', (req, res) => {
  const svc = services.get(req.params.id);
  if (!svc) return res.status(404).json({ error: 'Service not found' });
  res.json({
    serviceId: svc.id, name: svc.name,
    lastStatus: svc.lastStatus, lastProbedAt: svc.lastProbedAt, lastLatencyMs: svc.lastLatencyMs
  });
});

app.get('/api/services/:id/history', (req, res) => {
  const limit = Number(req.query.limit) || 100;
  const rows = probes.filter(p => p.serviceId === req.params.id).slice(-limit);
  res.json({ serviceId: req.params.id, count: rows.length, probes: rows });
});

// ---------- Metrics ----------
app.post('/api/metrics',requireAuth,  (req, res) => {
  const { serviceId, name, value, tags } = req.body || {};
  if (!serviceId || !metrics.has(serviceId) || !name || value == null) {
    return res.status(400).json({ error: 'serviceId (registered), name, value required' });
  }
  const sample = { name, value: Number(value), tags: tags || {}, timestamp: Date.now() };
  metrics.get(serviceId).push(sample);
  // Cap per-service history
  const arr = metrics.get(serviceId);
  if (arr.length > 1000) arr.splice(0, arr.length - 1000);
  res.status(201).json({ sample });
});

app.get('/api/metrics/:serviceId', (req, res) => {
  const arr = metrics.get(req.params.serviceId) || [];
  const limit = Number(req.query.limit) || 100;
  res.json({ serviceId: req.params.serviceId, count: arr.length, samples: arr.slice(-limit) });
});

// ---------- Alerts ----------
app.post('/api/alerts/rules',requireAuth,  (req, res) => {
  const { name, serviceId, metric, comparator, threshold, severity = 'info' } = req.body || {};
  if (!name || !serviceId || !metric || !comparator || threshold == null) {
    return res.status(400).json({ error: 'name, serviceId, metric, comparator, threshold required' });
  }
  const id = uuid();
  const rule = { id, name, serviceId, metric, comparator, threshold: Number(threshold), severity, enabled: true, createdAt: Date.now() };
  alertRules.set(id, rule);
  res.status(201).json({ rule });
});

app.get('/api/alerts/rules', (_req, res) => {
  res.json({ count: alertRules.size, rules: Array.from(alertRules.values()) });
});

app.delete('/api/alerts/rules/:id',requireAuth,  (req, res) => {
  if (!alertRules.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
  alertRules.delete(req.params.id);
  res.json({ deleted: true });
});

app.get('/api/alerts/active', (_req, res) => {
  const rows = Array.from(activeAlerts.values()).filter(a => !a.resolved);
  res.json({ count: rows.length, alerts: rows });
});

app.post('/api/alerts/active/:id/resolve',requireAuth,  (req, res) => {
  const alert = activeAlerts.get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  if (alert.resolved) return res.status(409).json({ error: 'Already resolved' });
  alert.resolved = true;
  alert.resolvedAt = Date.now();
  alert.resolvedBy = req.body?.resolvedBy || 'manual';
  res.json({ alert });
});

// ---------- Logs ----------
app.post('/api/logs',requireAuth,  (req, res) => {
  const { service, level = 'info', message, meta } = req.body || {};
  if (!service || !message) return res.status(400).json({ error: 'service and message required' });
  const entry = { service, level, message, meta: meta || {}, timestamp: Date.now() };
  logs.push(entry);
  if (logs.length > 5000) logs.splice(0, logs.length - 5000);
  res.status(201).json({ entry });
});

app.get('/api/logs', (req, res) => {
  const { service, level, limit = 100 } = req.query;
  let rows = logs;
  if (service) rows = rows.filter(l => l.service === service);
  if (level) rows = rows.filter(l => l.level === level);
  rows = rows.slice(-Number(limit));
  res.json({ count: rows.length, logs: rows });
});

// ---------- Stats ----------
app.get('/api/stats', (_req, res) => {
  const servicesArr = Array.from(services.values());
  const byStatus = {};
  for (const s of servicesArr) byStatus[s.lastStatus] = (byStatus[s.lastStatus] || 0) + 1;
  res.json({
    services: { total: services.size, byStatus },
    probes: probes.length,
    metrics: Array.from(metrics.values()).reduce((s, arr) => s + arr.length, 0),
    alertRules: alertRules.size,
    activeAlerts: Array.from(activeAlerts.values()).filter(a => !a.resolved).length,
    resolvedAlerts: Array.from(activeAlerts.values()).filter(a => a.resolved).length,
    logs: logs.length,
    timestamp: new Date().toISOString()
  });
});

// ---------- Root ----------
app.get('/', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    sutar: 'Layer 1 — Base Observability',
    port: PORT,
    endpoints: [
      'POST /api/probe',
      'POST /api/probe/all',
      'GET  /api/services',
      'GET  /api/services/:id/health',
      'GET  /api/services/:id/history',
      'POST /api/metrics',
      'GET  /api/metrics/:serviceId',
      'POST /api/alerts/rules',
      'GET  /api/alerts/rules',
      'DELETE /api/alerts/rules/:id',
      'GET  /api/alerts/active',
      'POST /api/alerts/active/:id/resolve',
      'POST /api/logs',
      'GET  /api/logs',
      'GET  /api/stats',
      'GET  /health'
    ]
  });
});

seed();
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body || {};
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] listening on http://localhost:${PORT}`);
  console.log(`[${SERVICE_NAME}] seeded ${services.size} known services, ${alertRules.size} alert rule(s)`);
  // Probe all services once on boot
  setTimeout(async () => {
    for (const svc of services.values()) {
      try { await probeService(svc); } catch (_) {}
    }
    console.log(`[${SERVICE_NAME}] initial probes complete`);
  }, 1000);
});
installGracefulShutdown(server);
