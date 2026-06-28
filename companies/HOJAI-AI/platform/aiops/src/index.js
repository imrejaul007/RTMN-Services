// AIOps OS - Production observability, metrics, alerts, incidents, dashboards. Port 4898
import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from './store.js';

const app = express();
const PORT = 4898;
app.use(express.json());

const ALERT_STATES = ['firing', 'acknowledged', 'resolved', 'snoozed'];
const INCIDENT_STATES = ['open', 'investigating', 'mitigating', 'resolved', 'closed'];
const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low', 'info'];

// --- Metrics ---
function loadMetrics() { return readJson('metrics.json') || []; }
function saveMetrics(metrics) { writeJson('metrics.json', metrics); }

app.get('/api/metrics', (req, res) => {
  const { service, from, to, limit = 100 } = req.query;
  let metrics = loadMetrics();
  if (service) metrics = metrics.filter(m => m.service === service);
  if (from) metrics = metrics.filter(m => new Date(m.timestamp) >= new Date(from));
  if (to) metrics = metrics.filter(m => new Date(m.timestamp) <= new Date(to));
  res.json({ metrics: metrics.slice(-parseInt(limit)), count: metrics.length });
});

app.post('/api/metrics',requireAuth,  (req, res) => {
  const { service, name, value, unit, labels = {} } = req.body;
  if (!service || !name || value === undefined) return res.status(400).json({ error: 'service, name, value required' });
  const metric = { id: uuidv4(), service, name, value: parseFloat(value), unit, labels, timestamp: new Date().toISOString() };
  const metrics = loadMetrics();
  metrics.push(metric);
  saveMetrics(metrics);
  res.status(201).json(metric);
});

app.get('/api/metrics/summary', (req, res) => {
  const { service, window = '1h' } = req.query;
  let metrics = loadMetrics();
  if (service) metrics = metrics.filter(m => m.service === service);
  const summary = {};
  metrics.forEach(m => {
    if (!summary[m.name]) summary[m.name] = { count: 0, sum: 0, min: Infinity, max: -Infinity };
    summary[m.name].count++;
    summary[m.name].sum += m.value;
    summary[m.name].min = Math.min(summary[m.name].min, m.value);
    summary[m.name].max = Math.max(summary[m.name].max, m.value);
  });
  Object.values(summary).forEach(s => { s.avg = s.count ? s.sum / s.count : 0; });
  res.json({ summary, window, service: service || 'all', metricCount: metrics.length });
});

// --- Alerts ---
function loadAlerts() { return readJson('alerts.json') || []; }
function saveAlerts(alerts) { writeJson('alerts.json', alerts); }

app.get('/api/alerts', (req, res) => {
  const { state, severity, service } = req.query;
  let alerts = loadAlerts();
  if (state) alerts = alerts.filter(a => a.state === state);
  if (severity) alerts = alerts.filter(a => a.severity === severity);
  if (service) alerts = alerts.filter(a => a.service === service);
  res.json({ alerts, count: alerts.length });
});

app.get('/api/alerts/:id', (req, res) => {
  const alert = loadAlerts().find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json(alert);
});

app.post('/api/alerts',requireAuth,  (req, res) => {
  const { name, description, severity = 'medium', service, condition, threshold } = req.body;
  if (!name || !service) return res.status(400).json({ error: 'name and service required' });
  const alert = {
    id: uuidv4(), name, description, severity, service, condition, threshold,
    state: 'firing',
    fireCount: 0,
    lastFiredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const alerts = loadAlerts();
  alerts.push(alert);
  saveAlerts(alerts);
  res.status(201).json(alert);
});

app.post('/api/alerts/:id/acknowledge',requireAuth,  (req, res) => {
  const alerts = loadAlerts();
  const idx = alerts.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Alert not found' });
  alerts[idx].state = 'acknowledged';
  alerts[idx].acknowledgedAt = new Date().toISOString();
  saveAlerts(alerts);
  res.json(alerts[idx]);
});

app.post('/api/alerts/:id/resolve',requireAuth,  (req, res) => {
  const alerts = loadAlerts();
  const idx = alerts.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Alert not found' });
  alerts[idx].state = 'resolved';
  alerts[idx].resolvedAt = new Date().toISOString();
  saveAlerts(alerts);
  res.json(alerts[idx]);
});

app.post('/api/alerts/:id/snooze',requireAuth,  (req, res) => {
  const { duration = 3600 } = req.body; // seconds
  const alerts = loadAlerts();
  const idx = alerts.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Alert not found' });
  alerts[idx].state = 'snoozed';
  alerts[idx].snoozedUntil = new Date(Date.now() + duration * 1000).toISOString();
  saveAlerts(alerts);
  res.json(alerts[idx]);
});

// --- Incidents ---
function loadIncidents() { return readJson('incidents.json') || []; }
function saveIncidents(incidents) { writeJson('incidents.json', incidents); }

app.get('/api/incidents', (req, res) => {
  const { state, severity } = req.query;
  let incidents = loadIncidents();
  if (state) incidents = incidents.filter(i => i.state === state);
  if (severity) incidents = incidents.filter(i => i.severity === severity);
  res.json({ incidents, count: incidents.length });
});

app.get('/api/incidents/:id', (req, res) => {
  const incident = loadIncidents().find(i => i.id === req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  res.json(incident);
});

app.post('/api/incidents',requireAuth,  (req, res) => {
  const { title, description, severity = 'medium', service, alertIds = [] } = req.body;
  if (!title || !service) return res.status(400).json({ error: 'title and service required' });
  const incident = {
    id: uuidv4(), title, description, severity, service, alertIds,
    state: 'open',
    timeline: [{ event: 'created', timestamp: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const incidents = loadIncidents();
  incidents.push(incident);
  saveIncidents(incidents);
  res.status(201).json(incident);
});

app.post('/api/incidents/:id/timeline',requireAuth,  (req, res) => {
  const { event, note } = req.body;
  if (!event) return res.status(400).json({ error: 'event required' });
  const incidents = loadIncidents();
  const idx = incidents.findIndex(i => i.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Incident not found' });
  incidents[idx].timeline.push({ event, note, timestamp: new Date().toISOString() });
  incidents[idx].updatedAt = new Date().toISOString();
  saveIncidents(incidents);
  res.json(incidents[idx]);
});

app.post('/api/incidents/:id/transition',requireAuth,  (req, res) => {
  const { toState } = req.body;
  if (!INCIDENT_STATES.includes(toState)) return res.status(400).json({ error: 'Invalid state' });
  const incidents = loadIncidents();
  const idx = incidents.findIndex(i => i.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Incident not found' });
  incidents[idx].state = toState;
  incidents[idx].timeline.push({ event: `transitioned_to_${toState}`, timestamp: new Date().toISOString() });
  incidents[idx].updatedAt = new Date().toISOString();
  saveIncidents(incidents);
  res.json(incidents[idx]);
});

// --- Dashboards ---
function loadDashboards() { return readJson('dashboards.json') || []; }
function saveDashboards(dashboards) { writeJson('dashboards.json', dashboards); }

app.get('/api/dashboards', (req, res) => {
  const dashboards = loadDashboards();
  res.json({ dashboards, count: dashboards.length });
});

app.get('/api/dashboards/:id', (req, res) => {
  const dashboard = loadDashboards().find(d => d.id === req.params.id);
  if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
  res.json(dashboard);
});

app.post('/api/dashboards',requireAuth,  (req, res) => {
  const { name, description, widgets = [], filters = {} } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const dashboard = { id: uuidv4(), name, description, widgets, filters, createdAt: new Date().toISOString() };
  const dashboards = loadDashboards();
  dashboards.push(dashboard);
  saveDashboards(dashboards);
  res.status(201).json(dashboard);
});

app.delete('/api/dashboards/:id',requireAuth,  (req, res) => {
  const dashboards = loadDashboards();
  const idx = dashboards.findIndex(d => d.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Dashboard not found' });
  dashboards.splice(idx, 1);
  saveDashboards(dashboards);
  res.json({ deleted: true });
});

// --- Status Page ---
app.get('/api/status', (req, res) => {
  const services = {};
  loadMetrics().slice(-50).forEach(m => { services[m.service] = services[m.service] || {}; services[m.service].lastMetric = m; });
  loadAlerts().filter(a => a.state === 'firing').forEach(a => { services[a.service] = services[a.service] || {}; services[a.service].firingAlerts = (services[a.service].firingAlerts || 0) + 1; });
  const overall = Object.values(services).some(s => s.firingAlerts) ? 'degraded' : 'operational';
  res.json({ overall, services, timestamp: new Date().toISOString() });
});

// --- Service Health ---
app.get('/api/health/:service', (req, res) => {
  const service = req.params.service;
  const metrics = loadMetrics().filter(m => m.service === service);
  const alerts = loadAlerts().filter(a => a.service === service);
  const incidents = loadIncidents().filter(i => i.service === service);
  const recentMetrics = metrics.slice(-10);
  const healthScore = alerts.filter(a => a.state === 'firing').length === 0 && incidents.filter(i => i.state === 'open').length === 0 ? 100 : Math.max(0, 100 - alerts.filter(a => a.state === 'firing').length * 20 - incidents.filter(i => i.state === 'open').length * 30);
  res.json({
    service,
    healthScore,
    status: healthScore === 100 ? 'healthy' : healthScore > 50 ? 'degraded' : 'unhealthy',
    metrics: { count: metrics.length, recent: recentMetrics },
    alerts: { total: alerts.length, firing: alerts.filter(a => a.state === 'firing').length },
    incidents: { total: incidents.length, open: incidents.filter(i => i.state === 'open').length },
  });
});

// Health
app.get('/health', (req, res) => res.json({ service: 'aiops-os', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => { console.log(`AIOps OS running on port ${PORT}`); });
export default server;
