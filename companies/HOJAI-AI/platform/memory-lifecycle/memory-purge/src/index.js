/**
 * memory-purge — Automated memory purger with soft-delete tombstones
 * Port: 5329
 *
 * Tracks memory records and tombstones. Provides:
 * - Soft-delete (mark as purged but keep record ID for audit)
 * - Hard-delete (remove entirely)
 * - Sweep job to purge expired records
 * - Tombstone queries
 *
 * Storage: $DATA_DIR/purge.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5329', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'memory-lifecycle-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'purge.json');

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      records: {},     // id -> { subject_id, memory_type, content, created_at, purged, purged_at, purge_reason, hard_deleted }
      sweeps: {},      // id -> sweep run record
    }, null, 2));
  }
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { records: {}, sweeps: {} }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateRecord(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.subject_id) return 'subject_id required';
  if (!body.memory_type) return 'memory_type required';
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'memory-purge', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Records CRUD ----
  app.post('/records', requireInternal, (req, res) => {
    const err = validateRecord(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { subject_id, memory_type, content = '', created_at = nowIso() } = req.body;
    const record = {
      id: newId('mem'),
      subject_id, memory_type, content,
      created_at,
      purged: false,
      purged_at: null,
      purge_reason: null,
      hard_deleted: false,
    };
    data.records[record.id] = record;
    saveAll(data);
    res.status(201).json(record);
  });

  app.get('/records', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.records);
    if (req.query.subject_id) items = items.filter((r) => r.subject_id === req.query.subject_id);
    if (req.query.memory_type) items = items.filter((r) => r.memory_type === req.query.memory_type);
    if (req.query.purged === 'true') items = items.filter((r) => r.purged);
    else if (req.query.purged === 'false') items = items.filter((r) => !r.purged);
    const limit = parseInt(req.query.limit || '100', 10);
    items = items.slice(-limit);
    res.json({ count: items.length, records: items });
  });

  app.get('/records/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.records[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  // ---- Soft delete (tombstone) ----
  app.post('/records/:id/purge', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.records[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    if (r.hard_deleted) return res.status(400).json({ error: 'already_hard_deleted' });
    if (r.purged) return res.status(400).json({ error: 'already_purged' });
    r.purged = true;
    r.purged_at = nowIso();
    r.purge_reason = (req.body && req.body.reason) || 'unspecified';
    r.content = null;  // scrub PII
    saveAll(data);
    res.json(r);
  });

  // ---- Hard delete (irreversible) ----
  app.delete('/records/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.records[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    if (!r.purged) return res.status(400).json({ error: 'must_soft_delete_first' });
    // Replace record with tombstone
    const tombstone = {
      id: r.id,
      subject_id: r.subject_id,
      memory_type: r.memory_type,
      created_at: r.created_at,
      purged_at: r.purged_at,
      purge_reason: r.purge_reason,
      hard_deleted: true,
      hard_deleted_at: nowIso(),
    };
    data.records[r.id] = tombstone;
    saveAll(data);
    res.json({ hard_deleted: true, tombstone });
  });

  // ---- Sweep: bulk purge expired records ----
  // Input: list of {record_id, reason} to purge
  app.post('/sweep', requireInternal, (req, res) => {
    const { items } = req.body || {};
    if (!Array.isArray(items)) return res.status(400).json({ error: 'validation', message: 'items array required' });
    const data = loadAll();
    const sweep = {
      id: newId('swp'),
      started_at: nowIso(),
      completed_at: null,
      total: items.length,
      purged: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
    for (const item of items) {
      const r = data.records[item.record_id];
      if (!r) { sweep.failed++; sweep.errors.push({ record_id: item.record_id, error: 'not_found' }); continue; }
      if (r.purged) { sweep.skipped++; continue; }
      r.purged = true;
      r.purged_at = nowIso();
      r.purge_reason = item.reason || 'sweep';
      r.content = null;
      sweep.purged++;
    }
    sweep.completed_at = nowIso();
    data.sweeps[sweep.id] = sweep;
    if (Object.keys(data.sweeps).length > 200) {
      const keys = Object.keys(data.sweeps).sort((a, b) => data.sweeps[a].started_at.localeCompare(data.sweeps[b].started_at));
      for (const k of keys.slice(0, keys.length - 200)) delete data.sweeps[k];
    }
    saveAll(data);
    res.status(201).json(sweep);
  });

  app.get('/sweeps', requireInternal, (req, res) => {
    const data = loadAll();
    const items = Object.values(data.sweeps);
    const limit = parseInt(req.query.limit || '50', 10);
    res.json({ count: items.length, sweeps: items.slice(-limit) });
  });

  app.get('/sweeps/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const s = data.sweeps[req.params.id];
    if (!s) return res.status(404).json({ error: 'not_found' });
    res.json(s);
  });

  // 404 fallback
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`memory-purge listening on ${PORT}`));
}

module.exports = { createApp };