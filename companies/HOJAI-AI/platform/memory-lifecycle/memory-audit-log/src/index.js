/**
 * memory-audit-log — Immutable audit trail for memory operations
 * Port: 5330
 *
 * Append-only audit log. Each entry has a hash chain link to the previous
 * entry to detect tampering. Provides query and verification APIs.
 *
 * Storage: $DATA_DIR/audit.json (append-only, never delete)
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5330', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'memory-lifecycle-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'audit.json');
const GENESIS_HASH = '0'.repeat(64);

const VALID_ACTIONS = [
  'memory.create', 'memory.read', 'memory.update', 'memory.delete',
  'consent.grant', 'consent.withdraw', 'consent.expire',
  'governance.allow', 'governance.deny', 'governance.flag',
  'gdpr.forget', 'gdpr.export', 'gdpr.rectify', 'gdpr.access',
  'purge.soft', 'purge.hard', 'purge.sweep',
  'retention.evaluate', 'retention.expire',
];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ entries: [], head_hash: GENESIS_HASH }, null, 2));
  }
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { entries: [], head_hash: GENESIS_HASH }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function computeHash(entry, prevHash) {
  const payload = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    action: entry.action,
    actor: entry.actor,
    subject_id: entry.subject_id,
    target: entry.target,
    prev_hash: prevHash,
    metadata: entry.metadata,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateEntry(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.action || !VALID_ACTIONS.includes(body.action)) return `action must be one of ${VALID_ACTIONS.join(',')}`;
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'memory-audit-log', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Append entry ----
  app.post('/entries', requireInternal, (req, res) => {
    const err = validateEntry(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { action, actor = 'system', subject_id = null, target = null, metadata = {} } = req.body;
    const entry = {
      id: newId('aud'),
      timestamp: nowIso(),
      action,
      actor,
      subject_id,
      target,
      metadata,
      prev_hash: data.head_hash,
    };
    entry.hash = computeHash(entry, data.head_hash);
    data.entries.push(entry);
    data.head_hash = entry.hash;
    saveAll(data);
    res.status(201).json(entry);
  });

  // ---- Query entries ----
  app.get('/entries', requireInternal, (req, res) => {
    const data = loadAll();
    let items = data.entries.slice();
    if (req.query.action) items = items.filter((e) => e.action === req.query.action);
    if (req.query.actor) items = items.filter((e) => e.actor === req.query.actor);
    if (req.query.subject_id) items = items.filter((e) => e.subject_id === req.query.subject_id);
    if (req.query.target) items = items.filter((e) => e.target === req.query.target);
    if (req.query.since) items = items.filter((e) => e.timestamp >= req.query.since);
    if (req.query.until) items = items.filter((e) => e.timestamp <= req.query.until);
    const limit = parseInt(req.query.limit || '100', 10);
    items = items.slice(-limit);
    res.json({ count: items.length, entries: items, head_hash: data.head_hash });
  });

  app.get('/entries/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const e = data.entries.find((x) => x.id === req.params.id);
    if (!e) return res.status(404).json({ error: 'not_found' });
    res.json(e);
  });

  // ---- Verify chain integrity ----
  app.get('/verify', requireInternal, (_req, res) => {
    const data = loadAll();
    let prevHash = GENESIS_HASH;
    const broken = [];
    for (let i = 0; i < data.entries.length; i++) {
      const e = data.entries[i];
      const expected = computeHash(e, prevHash);
      if (expected !== e.hash || e.prev_hash !== prevHash) {
        broken.push({ index: i, id: e.id, expected_hash: expected, actual_hash: e.hash });
      }
      prevHash = e.hash;
    }
    res.json({
      ok: broken.length === 0,
      total_entries: data.entries.length,
      head_hash: data.head_hash,
      broken_entries: broken,
    });
  });

  // ---- Stats ----
  app.get('/stats', requireInternal, (_req, res) => {
    const data = loadAll();
    const counts = {};
    for (const e of data.entries) counts[e.action] = (counts[e.action] || 0) + 1;
    res.json({
      total: data.entries.length,
      by_action: counts,
      head_hash: data.head_hash,
    });
  });

  // 404 fallback
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`memory-audit-log listening on ${PORT}`));
}

module.exports = { createApp };