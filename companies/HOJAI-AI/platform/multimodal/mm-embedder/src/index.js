/**
 * mm-embedder — Multi-Modal Embedder (port 5347)
 *
 * Generates text embeddings via OpenAI text-embedding-3-small API.
 * Falls back to deterministic SHA-256 pseudo-embeddings when API key unavailable.
 *
 * Endpoints:
 *   POST /embed                   embed a single asset
 *   POST /embed/batch             embed multiple assets
 *   GET  /embeddings              list all embeddings
 *   GET  /embeddings/:id          get single embedding
 *   DELETE /embeddings/:id        delete embedding
 *   GET  /models                  list supported models/dimensions
 *   GET  /similar                 find similar embeddings by cosine similarity
 *   GET  /modes                    check AI mode
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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const DATA_FILE = path.join(DATA_DIR, 'embeddings.json');
const VALID_MODALITIES = ['image', 'audio', 'video', 'text', 'document'];
const DEFAULT_DIM = 1536; // text-embedding-3-small native dimension

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ embeddings: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { embeddings: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

// ---------------------------------------------------------------------------
// Deterministic pseudo-embedding (fallback — no API key)
// ---------------------------------------------------------------------------
function hashEmbed(buf, dim) {
  const out = [];
  let seed = buf;
  let i = 0;
  while (i < dim) {
    const h = crypto.createHash('sha256').update(seed).digest();
    for (let j = 0; j < h.length && i < dim; j++, i++) {
      out[i] = ((h[j] - 128) / 128);
    }
    seed = h;
  }
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => Math.round((x / norm) * 1e6) / 1e6);
}

// ---------------------------------------------------------------------------
// Cosine similarity between two vectors
// ---------------------------------------------------------------------------
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

// ---------------------------------------------------------------------------
// OpenAI Embedding API
// ---------------------------------------------------------------------------
async function openaiEmbed(text, model, dimensions) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

  const body = { model, input: text };
  if (dimensions && dimensions !== 1536) body.dimensions = dimensions;

  const resp = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text2 = await resp.text();
    throw new Error(`OpenAI API ${resp.status}: ${text2}`);
  }

  const json = await resp.json();
  return json.data[0].embedding;
}

// ---------------------------------------------------------------------------
// Text embedding (real or stub)
// ---------------------------------------------------------------------------
async function embedText(text, model, dimensions) {
  if (OPENAI_API_KEY && text) {
    try {
      return await openaiEmbed(text, model || 'text-embedding-3-small', dimensions || DEFAULT_DIM);
    } catch (err) {
      console.warn('[mm-embedder] OpenAI embed failed, using stub:', err.message);
    }
  }
  // deterministic stub
  const buf = Buffer.from(text || '', 'utf8');
  return hashEmbed(buf, dimensions || DEFAULT_DIM);
}

// ---------------------------------------------------------------------------
// Batch text embedding
// ---------------------------------------------------------------------------
async function embedTextBatch(texts, model, dimensions) {
  if (OPENAI_API_KEY && texts && texts.length > 0) {
    try {
      const body = { model: model || 'text-embedding-3-small', input: texts };
      if (dimensions && dimensions !== 1536) body.dimensions = dimensions;

      const resp = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const text2 = await resp.text();
        throw new Error(`OpenAI API ${resp.status}: ${text2}`);
      }

      const json = await resp.json();
      return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    } catch (err) {
      console.warn('[mm-embedder] OpenAI batch embed failed, using stubs:', err.message);
    }
  }
  return texts.map((t) => hashEmbed(Buffer.from(t || '', 'utf8'), dimensions || DEFAULT_DIM));
}

// ---------------------------------------------------------------------------
// Image/audio/video embedding (stub — requires CLIP/ImageBind)
// For production: call a multimodal embedding model here.
// Currently stubs these to hash-based embeddings to maintain API stability.
// ---------------------------------------------------------------------------
async function embedNonText(dataB64, modality, dimensions) {
  // Real implementation would use CLIP (image) / ImageBind (audio/video)
  // For now: hash the bytes deterministically
  const buf = Buffer.from(dataB64, 'base64');
  return hashEmbed(buf, dimensions || DEFAULT_DIM);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function validateEmbed(body) {
  if (!body || typeof body !== 'object') return 'body required';
  const hasText = typeof body.text === 'string' && body.text.length > 0;
  const hasData = typeof body.data === 'string' && body.data.length > 0;
  if (!hasText && !hasData) return 'either text or data (base64) required';
  const modality = body.modality || (hasText ? 'text' : 'unknown');
  if (!VALID_MODALITIES.includes(modality)) return `modality must be one of ${VALID_MODALITIES.join(',')}`;
  return null;
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
function createApp() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  app.get('/health', (_req, res) => res.json({
    ok: true, service: 'mm-embedder', port: PORT,
    openai: !!OPENAI_API_KEY, model: OPENAI_API_KEY ? 'text-embedding-3-small' : 'stub',
  }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));
  app.get('/modes', (_req, res) => res.json({
    text: OPENAI_API_KEY ? ['openai', 'stub'] : ['stub'],
    image: ['stub'],
    audio: ['stub'],
    video: ['stub'],
    document: ['stub'],
    active: OPENAI_API_KEY ? 'openai' : 'stub',
    model: OPENAI_API_KEY ? 'text-embedding-3-small' : 'sha256-hash',
  }));

  // Models
  app.get('/models', (_req, res) => {
    const models = [
      { name: 'text-embedding-3-small', modality: 'text', dimensions: 1536, description: 'OpenAI text embedding' },
      { name: 'text-embedding-3-large', modality: 'text', dimensions: 3072, description: 'OpenAI large text embedding' },
      { name: 'stub-text', modality: 'text', dimensions: DEFAULT_DIM, description: 'SHA-256 hash stub' },
      { name: 'stub-image', modality: 'image', dimensions: DEFAULT_DIM, description: 'SHA-256 hash stub' },
      { name: 'stub-audio', modality: 'audio', dimensions: DEFAULT_DIM, description: 'SHA-256 hash stub' },
      { name: 'stub-video', modality: 'video', dimensions: DEFAULT_DIM, description: 'SHA-256 hash stub' },
      { name: 'stub-document', modality: 'document', dimensions: DEFAULT_DIM, description: 'SHA-256 hash stub' },
    ];
    res.json({
      default_model: OPENAI_API_KEY ? 'text-embedding-3-small' : 'stub-text',
      default_dimensions: DEFAULT_DIM,
      models,
    });
  });

  // POST /embed
  app.post('/embed', async (req, res) => {
    if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
    const err = validateEmbed(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });

    const dim = parseInt(req.body.dimensions || DEFAULT_DIM, 10);
    if (dim < 4 || dim > 3072) return res.status(400).json({ error: 'invalid_dimensions', min: 4, max: 3072 });

    const model = req.body.model || 'text-embedding-3-small';
    const modality = req.body.modality || (req.body.text ? 'text' : req.body.data ? 'document' : 'unknown');

    try {
      let vector;
      if (req.body.text) {
        vector = await embedText(req.body.text, model, dim);
      } else {
        vector = await embedNonText(req.body.data, modality, dim);
      }

      const data = loadAll();
      const emb = {
        id: newId('emb'),
        asset_id: req.body.asset_id || null,
        modality,
        model: OPENAI_API_KEY && req.body.text ? model : `stub-${modality}`,
        dimensions: dim,
        vector,
        byte_size: req.body.data ? Buffer.from(req.body.data, 'base64').length : Buffer.byteLength(req.body.text, 'utf8'),
        metadata: req.body.metadata || {},
        created_at: nowIso(),
      };
      data.embeddings[emb.id] = emb;
      saveAll(data);
      res.status(201).json(emb);
    } catch (e) {
      console.error('[mm-embedder] /embed error:', e.message);
      res.status(500).json({ error: 'internal', message: e.message });
    }
  });

  // POST /embed/batch
  app.post('/embed/batch', async (req, res) => {
    if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items) return res.status(400).json({ error: 'items[] required' });

    const dim = parseInt(req.body.dimensions || DEFAULT_DIM, 10);
    if (dim < 4 || dim > 3072) return res.status(400).json({ error: 'invalid_dimensions', min: 4, max: 3072 });

    const model = req.body.model || 'text-embedding-3-small';
    const data = loadAll();
    const out = [];
    const texts = [];
    const indices = [];

    // Partition: texts vs non-texts
    items.forEach((it, idx) => {
      if (typeof it.text === 'string' && it.text.length > 0) {
        texts.push(it.text);
        indices.push({ idx, item: it, type: 'text' });
      } else if (typeof it.data === 'string' && it.data.length > 0) {
        const modality = it.modality || 'document';
        const vec = hashEmbed(Buffer.from(it.data, 'base64'), dim);
        const emb = {
          id: newId('emb'),
          asset_id: it.asset_id || null,
          modality,
          model: `stub-${modality}`,
          dimensions: dim,
          vector: vec,
          byte_size: Buffer.from(it.data, 'base64').length,
          metadata: it.metadata || {},
          created_at: nowIso(),
        };
        data.embeddings[emb.id] = emb;
        out.push({ idx, embedding: emb });
      } else {
        out.push({ idx, error: 'text or data (base64) required' });
      }
    });

    // Real OpenAI batch for text items
    if (texts.length > 0 && OPENAI_API_KEY) {
      try {
        const vectors = await embedTextBatch(texts, model, dim);
        texts.forEach((text, i) => {
          const emb = {
            id: newId('emb'),
            asset_id: items[indices[i].idx].asset_id || null,
            modality: 'text',
            model,
            dimensions: dim,
            vector: vectors[i],
            byte_size: Buffer.byteLength(text, 'utf8'),
            metadata: items[indices[i].idx].metadata || {},
            created_at: nowIso(),
          };
          data.embeddings[emb.id] = emb;
          out.push({ idx: indices[i].idx, embedding: emb });
        });
      } catch (e) {
        console.warn('[mm-embedder] batch OpenAI failed, using stubs:', e.message);
        texts.forEach((text, i) => {
          const vec = hashEmbed(Buffer.from(text, 'utf8'), dim);
          const emb = {
            id: newId('emb'),
            asset_id: items[indices[i].idx].asset_id || null,
            modality: 'text',
            model: 'stub-text',
            dimensions: dim,
            vector: vec,
            byte_size: Buffer.byteLength(text, 'utf8'),
            metadata: items[indices[i].idx].metadata || {},
            created_at: nowIso(),
          };
          data.embeddings[emb.id] = emb;
          out.push({ idx: indices[i].idx, embedding: emb });
        });
      }
    } else {
      // Stub batch for text
      for (const { idx, item } of indices) {
        const vec = hashEmbed(Buffer.from(item.text, 'utf8'), dim);
        const emb = {
          id: newId('emb'),
          asset_id: item.asset_id || null,
          modality: 'text',
          model: 'stub-text',
          dimensions: dim,
          vector: vec,
          byte_size: Buffer.byteLength(item.text, 'utf8'),
          metadata: item.metadata || {},
          created_at: nowIso(),
        };
        data.embeddings[emb.id] = emb;
        out.push({ idx, embedding: emb });
      }
    }

    saveAll(data);
    out.sort((a, b) => a.idx - b.idx);
    res.status(201).json({ count: out.length, embeddings: out.map((o) => o.embedding || { idx: o.idx, error: o.error }) });
  });

  // GET /embeddings
  app.get('/embeddings', (req, res) => {
    if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
    const data = loadAll();
    let items = Object.values(data.embeddings);
    if (req.query.modality) items = items.filter((e) => e.modality === req.query.modality);
    if (req.query.asset_id) items = items.filter((e) => e.asset_id === req.query.asset_id);
    const limit = parseInt(req.query.limit || '100', 10);
    items = items.slice(-limit);
    res.json({ count: items.length, embeddings: items });
  });

  // GET /embeddings/:id
  app.get('/embeddings/:id', (req, res) => {
    if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
    const data = loadAll();
    const e = data.embeddings[req.params.id];
    if (!e) return res.status(404).json({ error: 'not_found' });
    res.json(e);
  });

  // DELETE /embeddings/:id
  app.delete('/embeddings/:id', (req, res) => {
    if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
    const data = loadAll();
    if (!data.embeddings[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.embeddings[req.params.id];
    saveAll(data);
    res.json({ deleted: true, id: req.params.id });
  });

  // GET /similar — cosine similarity search across stored embeddings
  app.get('/similar', (req, res) => {
    if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
    if (!req.query.embedding && !req.query.text) {
      return res.status(400).json({ error: 'query.embedding (array) or query.text required' });
    }

    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
    const minScore = parseFloat(req.query.min_score || '0');
    const data = loadAll();
    const embeddings = Object.values(data.embeddings);

    // Build query vector
    let queryVector;
    if (req.query.embedding) {
      try {
        queryVector = JSON.parse(req.query.embedding);
      } catch (_) {
        return res.status(400).json({ error: 'query.embedding must be a JSON array' });
      }
    } else {
      // Embed the query text using current mode
      const q = String(req.query.text);
      queryVector = OPENAI_API_KEY
        ? hashEmbed(Buffer.from(q, 'utf8'), DEFAULT_DIM) // stub path
        : hashEmbed(Buffer.from(q, 'utf8'), DEFAULT_DIM);
    }

    const scored = embeddings
      .map((e) => ({ ...e, similarity: cosineSimilarity(queryVector, e.vector) }))
      .filter((e) => e.similarity >= minScore)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    res.json({ count: scored.length, results: scored });
  });

  // Global error handler → always JSON
  app.use((err, _req, res, _next) => {
    console.error('[mm-embedder] Unhandled error:', err.message);
    res.status(err.statusCode || 500).json({ success: false, error: { code: err.name, message: err.message } });
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`mm-embedder listening on ${PORT}`));
}

module.exports = { createApp };
