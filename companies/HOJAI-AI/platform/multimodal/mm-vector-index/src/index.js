/**
 * mm-vector-index — Multi-Modal Vector Index (port 5348)
 *
 * Stores per-modality buckets of vectors; cosine-similarity search returns top-K.
 * Compatible with mm-embedder output.
 *
 * Endpoints:
 *   POST /buckets                     create bucket for a modality
 *   GET  /buckets                     list buckets
 *   GET  /buckets/:modality           get bucket info
 *   DELETE /buckets/:modality         delete bucket + all its vectors
 *   POST /buckets/:modality/vectors   add a vector to bucket
 *   POST /buckets/:modality/search    search top-K similar
 *   DELETE /buckets/:modality/vectors/:id   delete vector
 *   GET  /stats                       counts across buckets
 *
 * Storage: $DATA_DIR/vectors.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5348', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'mm-vector-index-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'vectors.json');
const VALID_MODALITIES = ['image', 'audio', 'video', 'text', 'document'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ buckets: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { buckets: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-vector-index', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/buckets', requireInternal, (req, res) => {
    const { modality, dimensions } = req.body || {};
    if (!modality || !VALID_MODALITIES.includes(modality)) return res.status(400).json({ error: 'invalid_modality', valid: VALID_MODALITIES });
    if (!dimensions || typeof dimensions !== 'number' || dimensions < 1) return res.status(400).json({ error: 'dimensions (positive number) required' });
    const data = loadAll();
    if (data.buckets[modality]) return res.status(409).json({ error: 'already_exists', modality });
    data.buckets[modality] = {
      modality,
      dimensions,
      vectors: {},
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    saveAll(data);
    res.status(201).json(data.buckets[modality]);
  });

  app.get('/buckets', requireInternal, (_req, res) => {
    const data = loadAll();
    const items = Object.values(data.buckets).map((b) => ({
      modality: b.modality, dimensions: b.dimensions, vector_count: Object.keys(b.vectors).length,
      created_at: b.created_at, updated_at: b.updated_at,
    }));
    res.json({ count: items.length, buckets: items });
  });

  app.get('/buckets/:modality', requireInternal, (req, res) => {
    const data = loadAll();
    const b = data.buckets[req.params.modality];
    if (!b) return res.status(404).json({ error: 'not_found' });
    res.json({ modality: b.modality, dimensions: b.dimensions, vector_count: Object.keys(b.vectors).length });
  });

  app.delete('/buckets/:modality', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.buckets[req.params.modality]) return res.status(404).json({ error: 'not_found' });
    delete data.buckets[req.params.modality];
    saveAll(data);
    res.json({ deleted: true, modality: req.params.modality });
  });

  app.post('/buckets/:modality/vectors', requireInternal, (req, res) => {
    const data = loadAll();
    const b = data.buckets[req.params.modality];
    if (!b) return res.status(404).json({ error: 'bucket_not_found' });
    const v = req.body?.vector;
    if (!Array.isArray(v)) return res.status(400).json({ error: 'vector[] required' });
    if (v.length !== b.dimensions) return res.status(400).json({ error: 'dimension_mismatch', expected: b.dimensions, got: v.length });
    if (!v.every((x) => typeof x === 'number' && Number.isFinite(x))) return res.status(400).json({ error: 'vector must be all numbers' });
    const id = newId('vec');
    b.vectors[id] = {
      id,
      vector: v,
      asset_id: req.body.asset_id || null,
      embedding_id: req.body.embedding_id || null,
      metadata: req.body.metadata || {},
      created_at: nowIso(),
    };
    b.updated_at = nowIso();
    saveAll(data);
    res.status(201).json(b.vectors[id]);
  });

  app.post('/buckets/:modality/search', requireInternal, (req, res) => {
    const data = loadAll();
    const b = data.buckets[req.params.modality];
    if (!b) return res.status(404).json({ error: 'bucket_not_found' });
    const q = req.body?.vector;
    if (!Array.isArray(q)) return res.status(400).json({ error: 'vector[] required' });
    if (q.length !== b.dimensions) return res.status(400).json({ error: 'dimension_mismatch', expected: b.dimensions, got: q.length });
    const k = parseInt(req.body.k || '10', 10);
    const minScore = parseFloat(req.body.min_score ?? '-Infinity');
    const results = Object.values(b.vectors)
      .map((v) => ({ id: v.id, score: Math.round(cosineSim(q, v.vector) * 1e6) / 1e6, asset_id: v.asset_id, embedding_id: v.embedding_id, metadata: v.metadata }))
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    res.json({ modality: b.modality, count: results.length, results });
  });

  app.delete('/buckets/:modality/vectors/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const b = data.buckets[req.params.modality];
    if (!b) return res.status(404).json({ error: 'bucket_not_found' });
    if (!b.vectors[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete b.vectors[req.params.id];
    b.updated_at = nowIso();
    saveAll(data);
    res.json({ deleted: true, id: req.params.id });
  });

  app.get('/stats', requireInternal, (_req, res) => {
    const data = loadAll();
    const out = {};
    let total = 0;
    for (const [mod, b] of Object.entries(data.buckets)) {
      const c = Object.keys(b.vectors).length;
      out[mod] = c;
      total += c;
    }
    res.json({ bucket_count: Object.keys(data.buckets).length, total_vectors: total, by_modality: out });
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`mm-vector-index listening on ${PORT}`));
}

module.exports = { createApp };