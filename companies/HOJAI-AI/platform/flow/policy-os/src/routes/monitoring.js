/**
 * PolicyOS — Monitoring Routes (Phase P3)
 *
 * Endpoints:
 *  - GET  /api/monitoring/metrics       — all metrics
 *  - GET  /api/monitoring/metrics/:name — specific metric
 *  - GET  /api/monitoring/health        — health check
 *  - GET  /api/monitoring/sla          — SLA dashboard
 *  - GET  /api/monitoring/alerts        — active alerts
 *  - POST /api/monitoring/alerts/:id/resolve — resolve alert
 */

import { metrics, slaTracker, checkHealth, events } from '../services/monitoring.js';

export function registerMonitoringRoutes(app, {
  policies,
  customAuth,
}) {

  // ── GET /api/monitoring/metrics ────────────────────────────────────────────────

  app.get('/api/monitoring/metrics', customAuth, (req, res) => {
    const { name, window = '1m', limit = 50 } = req.query;
    if (name) {
      const data = window !== 'all'
        ? metrics.getWindow(window, name)
        : ['1m', '5m', '1h', '24h'].map(w => ({ window: w, data: metrics.getWindow(w, name) }));
      return res.json({ name, window, data });
    }
    res.json(metrics.getAll(parseInt(limit)));
  });

  // ── GET /api/monitoring/metrics/:name ─────────────────────────────────────────

  app.get('/api/monitoring/metrics/:name', customAuth, (req, res) => {
    const { name } = req.params;
    const { histogram, window } = req.query;
    if (histogram === 'true') {
      const h = metrics.getHistogram(name);
      return res.json(h || { error: 'No histogram data' });
    }
    if (window) {
      const data = metrics.getWindow(window, name);
      return res.json({ name, window, count: data.length, data: data.slice(-100) });
    }
    const counter = metrics.getCounter(name);
    const gauge = metrics.getGauge(name);
    res.json({ name, counter, gauge });
  });

  // ── GET /api/monitoring/health ────────────────────────────────────────────────

  app.get('/api/monitoring/health', (req, res) => {
    const health = checkHealth();
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // ── GET /api/monitoring/health/live ──────────────────────────────────────────
  // Kubernetes liveness probe

  app.get('/api/monitoring/health/live', (req, res) => {
    res.json({ alive: true, ts: Date.now() });
  });

  // ── GET /api/monitoring/health/ready ──────────────────────────────────────────
  // Kubernetes readiness probe

  app.get('/api/monitoring/health/ready', (req, res) => {
    const health = checkHealth();
    const policiesLoaded = policies instanceof Map ? policies.size >= 0 : true;
    const ready = health.healthy && policiesLoaded;
    res.status(ready ? 200 : 503).json({
      ready,
      checks: { ...health.checks, policiesLoaded },
      ts: Date.now(),
    });
  });

  // ── GET /api/monitoring/sla ──────────────────────────────────────────────────

  app.get('/api/monitoring/sla', customAuth, (req, res) => {
    const { window = 'hourly' } = req.query;
    const sla = slaTracker.getSLA(window);
    const alerts = slaTracker.getAlerts(true);
    res.json({ sla: sla || { error: 'No data for window' }, activeAlerts: alerts.length, alerts });
  });

  // ── GET /api/monitoring/alerts ───────────────────────────────────────────────

  app.get('/api/monitoring/alerts', customAuth, (req, res) => {
    const { active = 'true' } = req.query;
    const alerts = slaTracker.getAlerts(active !== 'false');
    res.json({ count: alerts.length, alerts });
  });

  // ── POST /api/monitoring/alerts/:id/resolve ─────────────────────────────────

  app.post('/api/monitoring/alerts/:id/resolve', customAuth, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid alert ID' });
    slaTracker.resolveAlert(id);
    res.json({ ok: true, alertId: id });
  });
}
