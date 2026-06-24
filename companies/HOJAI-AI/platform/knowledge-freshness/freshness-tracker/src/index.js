/**
 * freshness-tracker — Per-document/fact freshness scores + decay function
 * Port: 5338
 *
 * Each document/fact has a freshness score in [0, 1] that decays linearly
 * over its TTL. Score is recomputed on access or update.
 *
 * Storage: $DATA_DIR/freshness.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5338', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'knowledge-freshness-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'freshness.json');
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;  // 7 days

function nowIso() { return new Date().toISOString(); }
function nowMs() { return Date.now(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ documents: {}, default_ttl: DEFAULT_TTL_SECONDS }, null, 2));
  }
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { documents: {}, default_ttl: DEFAULT_TTL_SECONDS }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

// Decay: linear from 1.0 at created_at to 0.0 at created_at + ttl
function computeFreshness(doc, now = nowMs()) {
  const ttlMs = (doc.ttl_seconds || DEFAULT_TTL_SECONDS) * 1000;
  const age = now - new Date(doc.created_at).getTime();
  if (age < 0) return 1.0;
  if (age >= ttlMs) return 0.0;
  // age < 1s is treated as fully fresh to avoid float drift on freshly created docs
if (age < 1000) return 1.0;
return Math.round(Math.max(0, Math.min(1, 1 - age / ttlMs)) * 1e6) / 1e6;
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateTrack(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.doc_id) return 'doc_id required';
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'freshness-tracker', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.get('/default-ttl', requireInternal, (_req, res) => {
    const data = loadAll();
    res.json({ default_ttl: data.default_ttl });
  });

  app.put('/default-ttl', requireInternal, (req, res) => {
    if (!req.body || typeof req.body.default_ttl !== 'number') return res.status(400).json({ error: 'validation', message: 'default_ttl (number) required' });
    const data = loadAll();
    data.default_ttl = req.body.default_ttl;
    saveAll(data);
    res.json({ default_ttl: data.default_ttl });
  });

  // ---- Track a document ----
  app.post('/track', requireInternal, (req, res) => {
    const err = validateTrack(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { doc_id, source = '', metadata = {}, ttl_seconds = data.default_ttl } = req.body;
    if (data.documents[doc_id]) {
      const d = data.documents[doc_id];
      d.refreshed_at = nowIso();
      d.source = source || d.source;
      d.metadata = { ...d.metadata, ...metadata };
      d.ttl_seconds = ttl_seconds;
      d.created_at = nowIso();  // refresh resets the clock
      saveAll(data);
      const fresh = computeFreshness(d);
      return res.json({ ...d, freshness: fresh });
    }
    const doc = {
      doc_id,
      source, metadata,
      ttl_seconds,
      created_at: nowIso(),
      refreshed_at: nowIso(),
      access_count: 0,
      last_accessed_at: null,
    };
    data.documents[doc_id] = doc;
    saveAll(data);
    const fresh = computeFreshness(doc);
    res.status(201).json({ ...doc, freshness: fresh });
  });

  // ---- List documents ----
  app.get('/documents', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.documents);
    if (req.query.source) items = items.filter((d) => d.source === req.query.source);
    if (req.query.min_freshness !== undefined) {
      const min = parseFloat(req.query.min_freshness);
      items = items.filter((d) => computeFreshness(d) >= min);
    }
    if (req.query.max_freshness !== undefined) {
      const max = parseFloat(req.query.max_freshness);
      items = items.filter((d) => computeFreshness(d) <= max);
    }
    const enriched = items.map((d) => ({ ...d, freshness: computeFreshness(d) }));
    res.json({ count: enriched.length, documents: enriched });
  });

  // ---- Get document with current freshness ----
  app.get('/documents/:doc_id', requireInternal, (req, res) => {
    const data = loadAll();
    const d = data.documents[req.params.doc_id];
    if (!d) return res.status(404).json({ error: 'not_found' });
    res.json({ ...d, freshness: computeFreshness(d) });
  });

  // ---- Access (records access, returns current freshness) ----
  app.post('/documents/:doc_id/access', requireInternal, (req, res) => {
    const data = loadAll();
    const d = data.documents[req.params.doc_id];
    if (!d) return res.status(404).json({ error: 'not_found' });
    d.access_count = (d.access_count || 0) + 1;
    d.last_accessed_at = nowIso();
    saveAll(data);
    res.json({ ...d, freshness: computeFreshness(d) });
  });

  // ---- Delete document ----
  app.delete('/documents/:doc_id', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.documents[req.params.doc_id]) return res.status(404).json({ error: 'not_found' });
    delete data.documents[req.params.doc_id];
    saveAll(data);
    res.json({ deleted: true, doc_id: req.params.doc_id });
  });

  // ---- Stats ----
  app.get('/stats', requireInternal, (_req, res) => {
    const data = loadAll();
    const docs = Object.values(data.documents);
    const buckets = { fresh: 0, good: 0, stale: 0, expired: 0 };
    for (const d of docs) {
      const f = computeFreshness(d);
      if (f >= 0.75) buckets.fresh++;
      else if (f >= 0.5) buckets.good++;
      else if (f > 0) buckets.stale++;
      else buckets.expired++;
    }
    res.json({ total: docs.length, by_freshness: buckets, default_ttl: data.default_ttl });
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`freshness-tracker listening on ${PORT}`));
}

module.exports = { createApp };