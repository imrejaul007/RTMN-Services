/**
 * incident-detector — Anomaly detection + noise dedup + grouping
 * Port: 5332
 *
 * Ingests metric events, detects anomalies, dedups noise, groups related events.
 * Incidents track lifecycle: detected → triaged → resolved → closed.
 *
 * Storage: $DATA_DIR/incidents.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5332', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'aiops-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'incidents.json');

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const VALID_STATUSES = ['detected', 'triaged', 'investigating', 'mitigated', 'resolved', 'closed'];
const DEFAULT_THRESHOLDS = { latency_ms: 1000, error_rate: 0.05, cpu_pct: 90, memory_pct: 90 };

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      incidents: {},
      events: [],
      thresholds: { ...DEFAULT_THRESHOLDS },
    }, null, 2));
  }
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { incidents: {}, events: [], thresholds: { ...DEFAULT_THRESHOLDS } }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function evaluateMetric(metric, value, thresholds) {
  if (metric === 'latency_ms' && value > thresholds.latency_ms) return { anomaly: true, severity: value > thresholds.latency_ms * 2 ? 'critical' : 'high' };
  if (metric === 'error_rate' && value > thresholds.error_rate) return { anomaly: true, severity: value > thresholds.error_rate * 2 ? 'critical' : 'high' };
  if (metric === 'cpu_pct' && value > thresholds.cpu_pct) return { anomaly: true, severity: value > 95 ? 'critical' : 'high' };
  if (metric === 'memory_pct' && value > thresholds.memory_pct) return { anomaly: true, severity: value > 95 ? 'critical' : 'high' };
  return { anomaly: false, severity: 'low' };
}

function fingerprintEvent(event) {
  // Group by metric + source + bucket-rounded value to dedup near-duplicates
  const bucket = Math.floor((event.value || 0) * 10) / 10;
  return `${event.metric}:${event.source}:${bucket}`;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'incident-detector', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Thresholds ----
  app.get('/thresholds', requireInternal, (_req, res) => {
    const data = loadAll();
    res.json(data.thresholds);
  });

  app.put('/thresholds', requireInternal, (req, res) => {
    const data = loadAll();
    const allowed = Object.keys(DEFAULT_THRESHOLDS);
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (typeof req.body[k] !== 'number') return res.status(400).json({ error: 'validation', message: `${k} must be a number` });
        data.thresholds[k] = req.body[k];
      }
    }
    saveAll(data);
    res.json(data.thresholds);
  });

  // ---- Event ingestion ----
  app.post('/events', requireInternal, (req, res) => {
    if (!req.body || !req.body.metric || req.body.value === undefined || !req.body.source) {
      return res.status(400).json({ error: 'validation', message: 'metric, value, source required' });
    }
    const data = loadAll();
    const event = {
      id: newId('evt'),
      timestamp: nowIso(),
      metric: req.body.metric,
      value: req.body.value,
      source: req.body.source,
      metadata: req.body.metadata || {},
    };
    data.events.push(event);
    if (data.events.length > 5000) data.events = data.events.slice(-5000);

    const eval_result = evaluateMetric(event.metric, event.value, data.thresholds);
    const fp = fingerprintEvent(event);

    if (!eval_result.anomaly) {
      saveAll(data);
      return res.status(201).json({ event, anomaly: false });
    }

    // Find existing open incident with same fingerprint
    const existing = Object.values(data.incidents).find((i) =>
      i.fingerprint === fp && ['detected', 'triaged', 'investigating', 'mitigated'].includes(i.status)
    );

    if (existing) {
      // Dedup: bump count, update severity if higher
      existing.event_count = (existing.event_count || 1) + 1;
      existing.last_seen_at = event.timestamp;
      existing.events.push(event.id);
      if (VALID_SEVERITIES.indexOf(eval_result.severity) > VALID_SEVERITIES.indexOf(existing.severity)) {
        existing.severity = eval_result.severity;
      }
      saveAll(data);
      return res.status(200).json({ event, anomaly: true, incident: existing, dedup: true });
    }

    // Create new incident
    const incident = {
      id: newId('inc'),
      fingerprint: fp,
      title: `${event.metric} anomaly on ${event.source}`,
      description: `${event.metric}=${event.value} exceeds threshold`,
      metric: event.metric,
      source: event.source,
      severity: eval_result.severity,
      status: 'detected',
      event_count: 1,
      events: [event.id],
      first_seen_at: event.timestamp,
      last_seen_at: event.timestamp,
      assigned_to: null,
      escalation_level: 0,
      tags: [],
      created_at: nowIso(),
      updated_at: nowIso(),
      resolved_at: null,
    };
    data.incidents[incident.id] = incident;
    saveAll(data);
    res.status(201).json({ event, anomaly: true, incident, dedup: false });
  });

  // ---- Incidents CRUD ----
  app.get('/incidents', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.incidents);
    if (req.query.status) items = items.filter((i) => i.status === req.query.status);
    if (req.query.severity) items = items.filter((i) => i.severity === req.query.severity);
    if (req.query.source) items = items.filter((i) => i.source === req.query.source);
    if (req.query.assigned_to) items = items.filter((i) => i.assigned_to === req.query.assigned_to);
    const limit = parseInt(req.query.limit || '100', 10);
    items = items.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
    res.json({ count: items.length, incidents: items });
  });

  app.get('/incidents/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const i = data.incidents[req.params.id];
    if (!i) return res.status(404).json({ error: 'not_found' });
    res.json(i);
  });

  app.put('/incidents/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const i = data.incidents[req.params.id];
    if (!i) return res.status(404).json({ error: 'not_found' });
    const { status, severity, assigned_to, tags, escalation_level } = req.body;
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'validation', message: 'bad status' });
      i.status = status;
      if (status === 'resolved' || status === 'closed') i.resolved_at = nowIso();
    }
    if (severity !== undefined) {
      if (!VALID_SEVERITIES.includes(severity)) return res.status(400).json({ error: 'validation', message: 'bad severity' });
      i.severity = severity;
    }
    if (assigned_to !== undefined) i.assigned_to = assigned_to;
    if (tags !== undefined) i.tags = tags;
    if (escalation_level !== undefined) i.escalation_level = escalation_level;
    i.updated_at = nowIso();
    saveAll(data);
    res.json(i);
  });

  // ---- Stats ----
  app.get('/stats', requireInternal, (_req, res) => {
    const data = loadAll();
    const all = Object.values(data.incidents);
    const by_status = {};
    const by_severity = {};
    for (const i of all) {
      by_status[i.status] = (by_status[i.status] || 0) + 1;
      by_severity[i.severity] = (by_severity[i.severity] || 0) + 1;
    }
    res.json({
      total: all.length,
      by_status,
      by_severity,
      total_events: data.events.length,
    });
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`incident-detector listening on ${PORT}`));
}

module.exports = { createApp };