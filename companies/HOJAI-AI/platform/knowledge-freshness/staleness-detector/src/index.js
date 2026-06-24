/**
 * staleness-detector — Detect outdated knowledge, alerts, citations
 * Port: 5339
 *
 * Defines staleness rules (when a fact/document is considered stale).
 * Scans a registry of facts and emits alerts when staleness criteria are met.
 *
 * Storage: $DATA_DIR/staleness.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5339', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'knowledge-freshness-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'staleness.json');

const VALID_RULE_TYPES = ['max_age_days', 'min_freshness_score', 'no_recent_access'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ rules: {}, facts: {}, alerts: {} }, null, 2));
  }
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { rules: {}, facts: {}, alerts: {} }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function isStaleByRule(rule, fact, now = new Date()) {
  if (rule.type === 'max_age_days') {
    const ageMs = now - new Date(fact.created_at).getTime();
    return ageMs > rule.threshold * 24 * 60 * 60 * 1000;
  }
  if (rule.type === 'min_freshness_score') {
    return (fact.freshness_score || 1) < rule.threshold;
  }
  if (rule.type === 'no_recent_access') {
    if (!fact.last_accessed_at) return false;
    const since = now - new Date(fact.last_accessed_at).getTime();
    return since > rule.threshold * 24 * 60 * 60 * 1000;
  }
  return false;
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateRule(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name) return 'name required';
  if (!body.type || !VALID_RULE_TYPES.includes(body.type)) return `type must be one of ${VALID_RULE_TYPES.join(',')}`;
  if (typeof body.threshold !== 'number') return 'threshold (number) required';
  if (body.severity !== undefined && !VALID_SEVERITIES.includes(body.severity)) return 'bad severity';
  return null;
}

function validateFact(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.fact_id) return 'fact_id required';
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'staleness-detector', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Rules CRUD ----
  app.post('/rules', requireInternal, (req, res) => {
    const err = validateRule(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { name, description = '', type, threshold, severity = 'medium', applies_to = [] } = req.body;
    const rule = {
      id: newId('rul'),
      name, description, type, threshold, severity,
      applies_to: Array.isArray(applies_to) ? applies_to : [],
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    data.rules[rule.id] = rule;
    saveAll(data);
    res.status(201).json(rule);
  });

  app.get('/rules', requireInternal, (_req, res) => {
    const data = loadAll();
    res.json({ count: Object.keys(data.rules).length, rules: Object.values(data.rules) });
  });

  app.get('/rules/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.rules[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  app.delete('/rules/:id', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.rules[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.rules[req.params.id];
    saveAll(data);
    res.json({ deleted: true, id: req.params.id });
  });

  // ---- Facts registry (test stub) ----
  app.post('/facts', requireInternal, (req, res) => {
    const err = validateFact(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { fact_id, content = '', source = '', created_at = nowIso(), freshness_score = 1.0, last_accessed_at = null, citations = [] } = req.body;
    const fact = {
      fact_id, content, source, created_at, freshness_score, last_accessed_at,
      citations: Array.isArray(citations) ? citations : [],
      stale: false,
      stale_reasons: [],
    };
    data.facts[fact_id] = fact;
    saveAll(data);
    res.status(201).json(fact);
  });

  app.get('/facts', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.facts);
    if (req.query.stale === 'true') items = items.filter((f) => f.stale);
    else if (req.query.stale === 'false') items = items.filter((f) => !f.stale);
    res.json({ count: items.length, facts: items });
  });

  app.put('/facts/:fact_id', requireInternal, (req, res) => {
    const data = loadAll();
    const f = data.facts[req.params.fact_id];
    if (!f) return res.status(404).json({ error: 'not_found' });
    const allowed = ['content', 'source', 'freshness_score', 'last_accessed_at', 'citations'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) f[k] = req.body[k];
    }
    saveAll(data);
    res.json(f);
  });

  // ---- Scan: check all facts against all rules, emit alerts ----
  app.post('/scan', requireInternal, (_req, res) => {
    const data = loadAll();
    const rules = Object.values(data.rules);
    const now = new Date();
    const newAlerts = [];
    for (const f of Object.values(data.facts)) {
      f.stale = false;
      f.stale_reasons = [];
      for (const rule of rules) {
        if (rule.applies_to && rule.applies_to.length > 0 && !rule.applies_to.includes(f.source)) continue;
        if (isStaleByRule(rule, f, now)) {
          f.stale = true;
          f.stale_reasons.push({ rule_id: rule.id, rule_name: rule.name, type: rule.type, severity: rule.severity });
          // Dedupe alerts: don't create one if there's an open one for this fact+rule
          const existing = Object.values(data.alerts).find((a) => a.fact_id === f.fact_id && a.rule_id === rule.id && a.status === 'open');
          if (!existing) {
            const alert = {
              id: newId('alt'),
              fact_id: f.fact_id,
              rule_id: rule.id,
              rule_name: rule.name,
              severity: rule.severity,
              reason: `${rule.name} matched`,
              detected_at: now.toISOString(),
              status: 'open',
            };
            data.alerts[alert.id] = alert;
            newAlerts.push(alert);
          }
        }
      }
    }
    saveAll(data);
    res.json({ scanned: Object.keys(data.facts).length, new_alerts: newAlerts.length, total_alerts: Object.keys(data.alerts).length });
  });

  app.get('/alerts', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.alerts);
    if (req.query.status) items = items.filter((a) => a.status === req.query.status);
    if (req.query.severity) items = items.filter((a) => a.severity === req.query.severity);
    res.json({ count: items.length, alerts: items });
  });

  app.post('/alerts/:id/ack', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.alerts[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    a.status = 'acknowledged';
    a.acknowledged_at = nowIso();
    saveAll(data);
    res.json(a);
  });

  app.post('/alerts/:id/resolve', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.alerts[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    a.status = 'resolved';
    a.resolved_at = nowIso();
    saveAll(data);
    res.json(a);
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`staleness-detector listening on ${PORT}`));
}

module.exports = { createApp };