/**
 * memory-retention — Memory retention rules per memory type
 * Port: 5327
 *
 * Defines how long each memory type should be retained, with default fallback.
 * Evaluates "is_expired" for any (memory_type, created_at) pair.
 *
 * Storage: $DATA_DIR/retention.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5327', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'memory-lifecycle-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'retention.json');

const DEFAULT_RETENTION_DAYS = 365;
const VALID_POLICIES = ['retain', 'archive', 'purge', 'review'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const seed = {
      rules: {},    // memory_type -> { retention_days, policy, on_expire }
      default: { retention_days: DEFAULT_RETENTION_DAYS, policy: 'archive', on_expire: 'archive' },
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  }
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { rules: {}, default: { retention_days: DEFAULT_RETENTION_DAYS, policy: 'archive' } }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateRule(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.memory_type) return 'memory_type required';
  if (body.retention_days !== undefined) {
    if (typeof body.retention_days !== 'number' || body.retention_days < 0) return 'retention_days must be non-negative number';
  }
  if (body.policy !== undefined && !VALID_POLICIES.includes(body.policy)) {
    return `policy must be one of ${VALID_POLICIES.join(',')}`;
  }
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'memory-retention', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Default rule ----
  app.get('/default', requireInternal, (_req, res) => {
    const data = loadAll();
    res.json(data.default);
  });

  app.put('/default', requireInternal, (req, res) => {
    const data = loadAll();
    if (req.body.retention_days !== undefined) {
      if (typeof req.body.retention_days !== 'number' || req.body.retention_days < 0) {
        return res.status(400).json({ error: 'validation', message: 'retention_days must be non-negative' });
      }
      data.default.retention_days = req.body.retention_days;
    }
    if (req.body.policy !== undefined) {
      if (!VALID_POLICIES.includes(req.body.policy)) return res.status(400).json({ error: 'validation', message: 'bad policy' });
      data.default.policy = req.body.policy;
    }
    data.default.updated_at = nowIso();
    saveAll(data);
    res.json(data.default);
  });

  // ---- Rules CRUD ----
  app.post('/rules', requireInternal, (req, res) => {
    const err = validateRule(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { memory_type, retention_days, policy = 'archive', on_expire = 'archive', description = '' } = req.body;
    data.rules[memory_type] = {
      memory_type,
      retention_days: retention_days !== undefined ? retention_days : data.default.retention_days,
      policy,
      on_expire,
      description,
      updated_at: nowIso(),
    };
    saveAll(data);
    res.status(201).json(data.rules[memory_type]);
  });

  app.get('/rules', requireInternal, (_req, res) => {
    const data = loadAll();
    res.json({ count: Object.keys(data.rules).length, rules: Object.values(data.rules), default: data.default });
  });

  app.get('/rules/:memory_type', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.rules[req.params.memory_type];
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  app.put('/rules/:memory_type', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.rules[req.params.memory_type];
    if (!r) return res.status(404).json({ error: 'not_found' });
    const { retention_days, policy, on_expire, description } = req.body;
    if (retention_days !== undefined) {
      if (typeof retention_days !== 'number' || retention_days < 0) return res.status(400).json({ error: 'validation', message: 'bad retention_days' });
      r.retention_days = retention_days;
    }
    if (policy !== undefined) {
      if (!VALID_POLICIES.includes(policy)) return res.status(400).json({ error: 'validation', message: 'bad policy' });
      r.policy = policy;
    }
    if (on_expire !== undefined) r.on_expire = on_expire;
    if (description !== undefined) r.description = description;
    r.updated_at = nowIso();
    data.rules[req.params.memory_type] = r;
    saveAll(data);
    res.json(r);
  });

  app.delete('/rules/:memory_type', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.rules[req.params.memory_type]) return res.status(404).json({ error: 'not_found' });
    delete data.rules[req.params.memory_type];
    saveAll(data);
    res.json({ deleted: true, memory_type: req.params.memory_type });
  });

  // ---- Evaluate: is a memory expired? ----
  app.post('/evaluate', requireInternal, (req, res) => {
    if (!req.body || !req.body.memory_type || !req.body.created_at) {
      return res.status(400).json({ error: 'validation', message: 'memory_type and created_at required' });
    }
    const { memory_type, created_at } = req.body;
    const data = loadAll();
    const rule = data.rules[memory_type] || {
      retention_days: data.default.retention_days,
      policy: data.default.policy,
      on_expire: data.default.policy,
    };
    const created = new Date(created_at);
    const expires = new Date(created.getTime() + rule.retention_days * 24 * 60 * 60 * 1000);
    const now = new Date();
    const is_expired = now > expires;
    const days_remaining = Math.ceil((expires - now) / (24 * 60 * 60 * 1000));
    res.json({
      memory_type,
      rule,
      created_at,
      expires_at: expires.toISOString(),
      is_expired,
      days_remaining: is_expired ? 0 : days_remaining,
      action: is_expired ? rule.on_expire : 'retain',
    });
  });

  // ---- Bulk: list all expired memory types given current date ----
  app.post('/evaluate-bulk', requireInternal, (req, res) => {
    const { items } = req.body || {};
    if (!Array.isArray(items)) return res.status(400).json({ error: 'validation', message: 'items array required' });
    const data = loadAll();
    const results = items.map((item) => {
      const rule = data.rules[item.memory_type] || {
        retention_days: data.default.retention_days,
        policy: data.default.policy,
        on_expire: data.default.policy,
      };
      const created = new Date(item.created_at);
      const expires = new Date(created.getTime() + rule.retention_days * 24 * 60 * 60 * 1000);
      const is_expired = new Date() > expires;
      return {
        memory_type: item.memory_type,
        created_at: item.created_at,
        is_expired,
        action: is_expired ? rule.on_expire : 'retain',
      };
    });
    res.json({ count: results.length, results });
  });

  // 404 fallback
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`memory-retention listening on ${PORT}`));
}

module.exports = { createApp };