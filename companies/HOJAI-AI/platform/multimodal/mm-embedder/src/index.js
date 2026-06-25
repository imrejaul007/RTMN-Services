/**
 * mm-embedder — Multi-Modal Embedder (port 5347) — STUB
 *
 * Generates deterministic pseudo-embeddings from input bytes using SHA-256.
 * In production this would call CLIP / ImageBind / similar; the API is stable.
 *
 * Endpoints:
 *   POST /embed                   embed a single asset (returns vector + modality)
 *   POST /embed/batch             embed multiple assets
 *   GET  /embeddings              list all embeddings (filter by modality, asset_id)
 *   GET  /embeddings/:id          get single embedding
 *   DELETE /embeddings/:id        delete embedding
 *   GET  /models                  list supported modalities and dimensions
 *
 * Storage: $DATA_DIR/embeddings.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5347', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'mm-embedder-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'embeddings.json');
const VALID_MODALITIES = ['image', 'audio', 'video', 'text', 'document'];
const DEFAULT_DIM = 8;

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ embeddings: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { embeddings: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

// Deterministic pseudo-embedding from bytes
function hashEmbed(buf, dim) {
  // Use SHA-256 repeatedly to fill dimension
  const out = new Array(dim).fill(0);
  let seed = buf;
  let i = 0;
  while (i < dim) {
    const h = crypto.createHash('sha256').update(seed).digest();
    for (let j = 0; j < h.length && i < dim; j++, i++) {
      out[i] = ((h[j] - 128) / 128); // normalize to [-1, 1)
    }
    seed = h;
  }
  // Normalize to unit vector
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => Math.round((x / norm) * 1e6) / 1e6);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}
function validateEmbed(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.data) return 'data (base64) required';
  if (!body.modality || !VALID_MODALITIES.includes(body.modality)) return `modality must be one of ${VALID_MODALITIES.join(',')}`;
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-embedder', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/embed', requireInternal, (req, res) => {
    const err = validateEmbed(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const dim = parseInt(req.body.dimensions || DEFAULT_DIM, 10);
    if (dim < 4 || dim > 1024) return res.status(400).json({ error: 'invalid_dimensions', min: 4, max: 1024 });
    const buf = Buffer.from(req.body.data, 'base64');
    const vector = hashEmbed(buf, dim);
    const data = loadAll();
    const emb = {
      id: newId('emb'),
      asset_id: req.body.asset_id || null,
      modality: req.body.modality,
      model: req.body.model || `stub-${req.body.modality}`,
      dimensions: dim,
      vector,
      byte_size: buf.length,
      metadata: req.body.metadata || {},
      created_at: nowIso(),
    };
    data.embeddings[emb.id] = emb;
    saveAll(data);
    res.status(201).json(emb);
  });

  app.post('/embed/batch', requireInternal, (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items) return res.status(400).json({ error: 'items[] required' });
    const data = loadAll();
    const out = [];
    for (const it of items) {
      const e = validateEmbed(it);
      if (e) {
        out.push({ error: e });
        continue;
      }
      const dim = parseInt(it.dimensions || DEFAULT_DIM, 10);
      const buf = Buffer.from(it.data, 'base64');
      const emb = {
        id: newId('emb'),
        asset_id: it.asset_id || null,
        modality: it.modality,
        model: it.model || `stub-${it.modality}`,
        dimensions: dim,
        vector: hashEmbed(buf, dim),
        byte_size: buf.length,
        metadata: it.metadata || {},
        created_at: nowIso(),
      };
      data.embeddings[emb.id] = emb;
      out.push(emb);
    }
    saveAll(data);
    res.status(201).json({ count: out.length, embeddings: out });
  });

  app.get('/embeddings', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.embeddings);
    if (req.query.modality) items = items.filter((e) => e.modality === req.query.modality);
    if (req.query.asset_id) items = items.filter((e) => e.asset_id === req.query.asset_id);
    const limit = parseInt(req.query.limit || '100', 10);
    items = items.slice(-limit);
    res.json({ count: items.length, embeddings: items });
  });

  app.get('/embeddings/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const e = data.embeddings[req.params.id];
    if (!e) return res.status(404).json({ error: 'not_found' });
    res.json(e);
  });

  app.delete('/embeddings/:id', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.embeddings[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.embeddings[req.params.id];
    saveAll(data);
    res.json({ deleted: true, id: req.params.id });
  });

  app.get('/models', (_req, res) => res.json({
    modalities: VALID_MODALITIES,
    default_dimensions: DEFAULT_DIM,
    models: VALID_MODALITIES.map((m) => ({ name: `stub-${m}`, modality: m, dimensions: DEFAULT_DIM })),
  }));

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`mm-embedder listening on ${PORT}`));
}

module.exports = { createApp };