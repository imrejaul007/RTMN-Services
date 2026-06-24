/**
 * escalation-engine — Escalation policies (level 1 → 2 → 3) with timeouts
 * Port: 5335
 *
 * Policies define ordered levels (each with targets + timeout).
 * When an incident is escalated, the engine tracks current level,
 * triggers notifications when timeout expires, and supports manual overrides.
 *
 * Storage: $DATA_DIR/escalations.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5335', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'aiops-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'escalations.json');

const VALID_TARGET_TYPES = ['user', 'rotation', 'team', 'webhook'];
const VALID_ESC_STATUSES = ['active', 'acknowledged', 'resolved', 'cancelled'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ policies: {}, escalations: {} }, null, 2));
  }
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { policies: {}, escalations: {} }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validatePolicy(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name) return 'name required';
  if (!Array.isArray(body.levels) || body.levels.length === 0) return 'levels array required';
  for (let i = 0; i < body.levels.length; i++) {
    const lv = body.levels[i];
    if (lv.level === undefined || typeof lv.level !== 'number') return `level ${i}: level (number) required`;
    if (!Array.isArray(lv.targets) || lv.targets.length === 0) return `level ${i}: targets required`;
    for (const t of lv.targets) {
      if (!t.type || !VALID_TARGET_TYPES.includes(t.type)) return `level ${i}: target type must be one of ${VALID_TARGET_TYPES.join(',')}`;
    }
    if (lv.timeout_seconds !== undefined && typeof lv.timeout_seconds !== 'number') return `level ${i}: timeout_seconds must be number`;
  }
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'escalation-engine', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Policy CRUD ----
  app.post('/policies', requireInternal, (req, res) => {
    const err = validatePolicy(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { name, description = '', severity_filter = [], levels } = req.body;
    const policy = {
      id: newId('pol'),
      name, description, severity_filter, levels,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    data.policies[policy.id] = policy;
    saveAll(data);
    res.status(201).json(policy);
  });

  app.get('/policies', requireInternal, (_req, res) => {
    const data = loadAll();
    res.json({ count: Object.keys(data.policies).length, policies: Object.values(data.policies) });
  });

  app.get('/policies/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const p = data.policies[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    res.json(p);
  });

  app.put('/policies/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const p = data.policies[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    const err = validatePolicy({ ...p, ...req.body });
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { name, description, severity_filter, levels } = req.body;
    if (name !== undefined) p.name = name;
    if (description !== undefined) p.description = description;
    if (severity_filter !== undefined) p.severity_filter = severity_filter;
    if (levels !== undefined) p.levels = levels;
    p.updated_at = nowIso();
    saveAll(data);
    res.json(p);
  });

  app.delete('/policies/:id', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.policies[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.policies[req.params.id];
    saveAll(data);
    res.json({ deleted: true, id: req.params.id });
  });

  // ---- Active escalations ----
  app.post('/escalations', requireInternal, (req, res) => {
    if (!req.body || !req.body.policy_id || !req.body.incident_id) {
      return res.status(400).json({ error: 'validation', message: 'policy_id and incident_id required' });
    }
    const data = loadAll();
    const policy = data.policies[req.body.policy_id];
    if (!policy) return res.status(404).json({ error: 'policy_not_found' });
    if (policy.severity_filter && policy.severity_filter.length > 0 && req.body.severity && !policy.severity_filter.includes(req.body.severity)) {
      return res.status(400).json({ error: 'severity_not_in_filter' });
    }

    const sortedLevels = [...policy.levels].sort((a, b) => a.level - b.level);
    const first = sortedLevels[0];
    const now = new Date();
    const escalation = {
      id: newId('esc'),
      policy_id: policy.id,
      incident_id: req.body.incident_id,
      severity: req.body.severity || null,
      current_level: first.level,
      level_started_at: now.toISOString(),
      level_expires_at: first.timeout_seconds ? new Date(now.getTime() + first.timeout_seconds * 1000).toISOString() : null,
      targets_notified: first.targets,
      level_history: [{ level: first.level, started_at: now.toISOString(), ended_at: null, by: 'auto' }],
      status: 'active',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    data.escalations[escalation.id] = escalation;
    saveAll(data);
    res.status(201).json(escalation);
  });

  app.get('/escalations', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.escalations);
    if (req.query.status) items = items.filter((e) => e.status === req.query.status);
    if (req.query.policy_id) items = items.filter((e) => e.policy_id === req.query.policy_id);
    if (req.query.incident_id) items = items.filter((e) => e.incident_id === req.query.incident_id);
    res.json({ count: items.length, escalations: items });
  });

  app.get('/escalations/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const e = data.escalations[req.params.id];
    if (!e) return res.status(404).json({ error: 'not_found' });
    res.json(e);
  });

  // Acknowledge: stops escalation at current level
  app.post('/escalations/:id/ack', requireInternal, (req, res) => {
    const data = loadAll();
    const e = data.escalations[req.params.id];
    if (!e) return res.status(404).json({ error: 'not_found' });
    if (e.status !== 'active') return res.status(400).json({ error: 'not_active' });
    e.status = 'acknowledged';
    e.acknowledged_by = (req.body && req.body.user_id) || 'unknown';
    e.acknowledged_at = nowIso();
    e.updated_at = nowIso();
    saveAll(data);
    res.json(e);
  });

  // Resolve: terminates escalation
  app.post('/escalations/:id/resolve', requireInternal, (req, res) => {
    const data = loadAll();
    const e = data.escalations[req.params.id];
    if (!e) return res.status(404).json({ error: 'not_found' });
    e.status = 'resolved';
    e.resolved_at = nowIso();
    e.updated_at = nowIso();
    saveAll(data);
    res.json(e);
  });

  // Cancel
  app.post('/escalations/:id/cancel', requireInternal, (req, res) => {
    const data = loadAll();
    const e = data.escalations[req.params.id];
    if (!e) return res.status(404).json({ error: 'not_found' });
    e.status = 'cancelled';
    e.cancelled_at = nowIso();
    e.updated_at = nowIso();
    saveAll(data);
    res.json(e);
  });

  // Manual escalate: jump to next level
  app.post('/escalations/:id/escalate', requireInternal, (req, res) => {
    const data = loadAll();
    const e = data.escalations[req.params.id];
    if (!e) return res.status(404).json({ error: 'not_found' });
    if (e.status !== 'active') return res.status(400).json({ error: 'not_active' });
    const policy = data.policies[e.policy_id];
    const sortedLevels = [...policy.levels].sort((a, b) => a.level - b.level);
    const nextLevelIdx = sortedLevels.findIndex((l) => l.level > e.current_level);
    if (nextLevelIdx === -1) return res.status(400).json({ error: 'already_at_top_level' });
    const next = sortedLevels[nextLevelIdx];
    const now = new Date();
    // Close current level
    const current = e.level_history.find((h) => h.ended_at === null);
    if (current) current.ended_at = now.toISOString();
    e.current_level = next.level;
    e.level_started_at = now.toISOString();
    e.level_expires_at = next.timeout_seconds ? new Date(now.getTime() + next.timeout_seconds * 1000).toISOString() : null;
    e.targets_notified = next.targets;
    e.level_history.push({ level: next.level, started_at: now.toISOString(), ended_at: null, by: 'manual' });
    e.updated_at = now.toISOString();
    saveAll(data);
    res.json(e);
  });

  // 404 fallback
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`escalation-engine listening on ${PORT}`));
}

module.exports = { createApp };