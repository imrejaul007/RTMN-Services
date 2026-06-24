/**
 * agent-deprecation — Sunset Policy + Retirement
 * Port: 4916
 *
 * Manages the end-of-life process for agent versions:
 *   - Mark a version as deprecated (warning phase, with sunset date)
 *   - Issue notices to consumers (subscriber list)
 *   - Track active consumers still using the deprecated version
 *   - Retire the version (final state, no more usage allowed)
 *   - Migrate consumers to replacement version
 *
 * Storage: JSON file at $DATA_DIR/deprecation.json
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4916', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'lifecycle-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'deprecation.json');

const DEFAULT_NOTICE_DAYS = 90;
const DEFAULT_GRACE_DAYS = 30;

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ policies: {}, subscribers: {}, notices: [], retirements: [] }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { policies: {}, subscribers: {}, notices: [], retirements: [] }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function daysBetween(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (24 * 60 * 60 * 1000));
}

/** Compute days until sunset date. Negative means past due. */
function daysUntil(sunsetAt) {
  return daysBetween(nowIso(), sunsetAt);
}

function validateDeprecateRequest(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.agentId) return 'agentId required';
  if (!body.version) return 'version required';
  if (!body.reason) return 'reason required';
  if (!body.replacement_version) return 'replacement_version required';
  return null;
}

function validateSubscribeRequest(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.agentId) return 'agentId required';
  if (!body.version) return 'version required';
  if (!body.consumer) return 'consumer identifier required';
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'agent-deprecation', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Set default deprecation policy (global defaults)
  app.put('/policy', requireInternal, (req, res) => {
    const data = loadAll();
    data.policies.default = {
      notice_days: req.body.notice_days ?? DEFAULT_NOTICE_DAYS,
      auto_migrate: req.body.auto_migrate ?? true,
      grace_period_days: req.body.grace_period_days ?? DEFAULT_GRACE_DAYS,
      backup_before_retire: req.body.backup_before_retire ?? true,
    };
    saveAll(data);
    res.json(data.policies.default);
  });

  app.get('/policy', requireInternal, (_req, res) => {
    const data = loadAll();
    res.json(data.policies.default || { notice_days: DEFAULT_NOTICE_DAYS, auto_migrate: true, grace_period_days: DEFAULT_GRACE_DAYS, backup_before_retire: true });
  });

  // Mark a version as deprecated
  app.post('/deprecations', requireInternal, (req, res) => {
    const err = validateDeprecateRequest(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { agentId, version, reason, replacement_version, notice_days } = req.body;
    const data = loadAll();
    const policy = data.policies.default || {};
    const nd = notice_days ?? policy.notice_days ?? DEFAULT_NOTICE_DAYS;
    const deprecatedAt = nowIso();
    const sunsetAt = new Date(Date.now() + nd * 24 * 60 * 60 * 1000).toISOString();
    const key = `${agentId}@${version}`;
    if (data.policies[key]) {
      return res.status(409).json({ error: 'conflict', message: `${key} already deprecated` });
    }
    const policy_entry = {
      agent_id: agentId,
      version,
      reason,
      replacement_version,
      status: 'deprecated',
      deprecated_at: deprecatedAt,
      sunset_at: sunsetAt,
      notice_days: nd,
      auto_migrate: policy.auto_migrate ?? true,
      grace_period_days: policy.grace_period_days ?? DEFAULT_GRACE_DAYS,
      backup_before_retire: policy.backup_before_retire ?? true,
      days_until_sunset: nd,
    };
    data.policies[key] = policy_entry;
    saveAll(data);
    res.status(201).json(policy_entry);
  });

  // Get deprecation status for a version
  app.get('/deprecations/:agentId/:version', requireInternal, (req, res) => {
    const key = `${req.params.agentId}@${req.params.version}`;
    const data = loadAll();
    const p = data.policies[key];
    if (!p) return res.status(404).json({ error: 'not_found' });
    res.json({ ...p, days_until_sunset: daysUntil(p.sunset_at) });
  });

  // List all deprecations (optionally filter)
  app.get('/deprecations', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.entries(data.policies)
      .filter(([k]) => k !== 'default')
      .map(([k, v]) => ({ key: k, ...v, days_until_sunset: daysUntil(v.sunset_at) }));
    if (req.query.agentId) items = items.filter((i) => i.agent_id === req.query.agentId);
    if (req.query.status) items = items.filter((i) => i.status === req.query.status);
    res.json({ count: items.length, deprecations: items });
  });

  // Subscribe a consumer to deprecation notices for a version
  app.post('/subscribers', requireInternal, (req, res) => {
    const err = validateSubscribeRequest(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { agentId, version, consumer, contact } = req.body;
    const data = loadAll();
    const key = `${agentId}@${version}`;
    if (!data.subscribers[key]) data.subscribers[key] = [];
    // Upsert: replace if same consumer already subscribed
    const existing = data.subscribers[key].find((s) => s.consumer === consumer);
    if (existing) {
      existing.contact = contact || existing.contact;
      existing.updated_at = nowIso();
      return res.json(existing);
    }
    const sub = {
      id: newId('sub'),
      agent_id: agentId,
      version,
      consumer,
      contact: contact || null,
      migrated: false,
      created_at: nowIso(),
    };
    data.subscribers[key].push(sub);
    saveAll(data);
    res.status(201).json(sub);
  });

  // List subscribers for a version
  app.get('/subscribers', requireInternal, (req, res) => {
    const data = loadAll();
    const { agentId, version } = req.query;
    if (!agentId || !version) return res.status(400).json({ error: 'validation', message: 'agentId and version required' });
    const key = `${agentId}@${version}`;
    const subs = data.subscribers[key] || [];
    res.json({ count: subs.length, subscribers: subs });
  });

  // Issue notices (one per subscriber) — emits to /notices log
  app.post('/deprecations/:agentId/:version/notice', requireInternal, (req, res) => {
    const key = `${req.params.agentId}@${req.params.version}`;
    const data = loadAll();
    const policy = data.policies[key];
    if (!policy) return res.status(404).json({ error: 'not_found' });
    const subs = data.subscribers[key] || [];
    const issued = [];
    for (const s of subs) {
      const notice = {
        id: newId('note'),
        subscriber_id: s.id,
        consumer: s.consumer,
        agent_id: policy.agent_id,
        version: policy.version,
        replacement_version: policy.replacement_version,
        reason: policy.reason,
        sunset_at: policy.sunset_at,
        issued_at: nowIso(),
      };
      data.notices.push(notice);
      issued.push(notice);
    }
    if (data.notices.length > 5000) data.notices = data.notices.slice(-5000);
    saveAll(data);
    res.json({ count: issued.length, notices: issued });
  });

  // Migrate a subscriber to the replacement version
  app.post('/subscribers/:id/migrate', requireInternal, (req, res) => {
    const data = loadAll();
    let found = null;
    for (const [key, subs] of Object.entries(data.subscribers)) {
      const sub = subs.find((s) => s.id === req.params.id);
      if (sub) {
        sub.migrated = true;
        sub.migrated_at = nowIso();
        found = { subscriber: sub, key };
        break;
      }
    }
    if (!found) return res.status(404).json({ error: 'not_found' });
    saveAll(data);
    res.json(found.subscriber);
  });

  // Retire a version (final state)
  app.post('/deprecations/:agentId/:version/retire', requireInternal, (req, res) => {
    const key = `${req.params.agentId}@${req.params.version}`;
    const data = loadAll();
    const policy = data.policies[key];
    if (!policy) return res.status(404).json({ error: 'not_found' });
    if (policy.status === 'retired') return res.status(400).json({ error: 'invalid_op', message: 'already retired' });
    // Check subscribers
    const subs = data.subscribers[key] || [];
    const unMigrated = subs.filter((s) => !s.migrated);
    if (unMigrated.length > 0) {
      return res.status(400).json({ error: 'subscribers_remain', message: `${unMigrated.length} subscribers not yet migrated`, unMigrated });
    }
    policy.status = 'retired';
    policy.retired_at = nowIso();
    data.retirements.push({
      agent_id: policy.agent_id,
      version: policy.version,
      retired_at: policy.retired_at,
      reason: policy.reason,
      replacement_version: policy.replacement_version,
      subscriber_count: subs.length,
    });
    if (data.retirements.length > 1000) data.retirements = data.retirements.slice(-1000);
    saveAll(data);
    res.json(policy);
  });

  // Summary
  app.get('/summary', requireInternal, (_req, res) => {
    const data = loadAll();
    const items = Object.entries(data.policies).filter(([k]) => k !== 'default').map(([k, v]) => v);
    const byStatus = {};
    for (const i of items) byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    res.json({ total: items.length, by_status: byStatus, retirements: data.retirements.length, notices_issued: data.notices.length });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[agent-deprecation] listening on :${PORT} data=${DATA_FILE}`));
}

module.exports = { createApp, validateDeprecateRequest, validateSubscribeRequest, daysUntil };