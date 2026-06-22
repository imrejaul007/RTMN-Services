/**
 * RTMN Semantic Cache v1.0
 *
 * Semantic caching layer for LLM responses.
 * Cache LLM completions keyed by embedding similarity, not exact-match —
 * so "What's the weather?" and "Tell me the weather" hit the same entry.
 *
 * Features:
 *  - Bag-of-words + hashing vectorizer (no external embedding lib)
 *  - Cosine similarity lookup with configurable threshold
 *  - Cache CRUD with TTL + model filtering
 *  - Per-entry hit counts, cost-saved estimation, audit log
 *  - Batch lookup, batch embedding, "find similar to entry" queries
 *  - Standalone embedding service (POST /api/embed) for reuse
 *
 * Goal: 50%+ cost reduction on repeated / paraphrased prompts.
 *
 * @author HOJAI AI - Training & Model Platform (Division 7)
 * @version 1.0.0
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4772;
const SERVICE_NAME = 'semantic-cache';
const DEFAULT_DIM = 128;
const DEFAULT_THRESHOLD = 0.85;

// ============ IN-MEMORY STORAGE ============

/**
 * @typedef {Object} CacheEntry
 * @property {string}   id              - UUID
 * @property {string}   key             - opaque key (prompt fingerprint or explicit id)
 * @property {string}   prompt          - the original prompt that produced this response
 * @property {number[]} promptEmbedding - L2-normalized vector
 * @property {string}   response        - the cached LLM response
 * @property {string}   model           - model identifier
 * @property {Object}   metadata        - provider, tokensIn, tokensOut, costUsd, ...
 * @property {number}   hitCount        - number of times this entry has been served
 * @property {string}   createdAt       - ISO
 * @property {string}   lastHitAt       - ISO or null
 * @property {string|null} expiresAt    - ISO or null
 */

/** @type {Map<string, CacheEntry>} id -> entry */
const entries = new PersistentMap('entries', { serviceName: 'semantic-cache' });

/** @type {Array<Object>} append-only audit log */
const auditLog = [];

/** Cumulative counters — reset via POST /api/stats/reset */
const stats = {
  totalStores: 0,
  totalLookups: 0,
  totalHits: 0,
  totalMisses: 0,
  similaritySumAtHit: 0, // sum of similarities for averaging
  estimatedCostSavedUsd: 0
};

// ============ EMBEDDING ============

/**
 * FNV-1a 32-bit hash. Deterministic, no dependencies, fine for bucketing tokens.
 * @param {string} s
 * @returns {number} 32-bit unsigned int
 */
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // multiply by FNV prime (0x01000193) using shifts to stay in 32 bits
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/**
 * ~80 English stopwords. Kept inline so the service has zero file deps.
 * Adding a few common chat words (hi, ok, yes, no) because prompts contain them.
 */
const STOPWORDS = new Set([
  'a','about','above','after','again','against','all','am','an','and','any','are',
  'as','at','be','because','been','before','being','below','between','both','but','by',
  'could','did','do','does','doing','down','during','each','few','for','from','further',
  'had','has','have','having','he','her','here','hers','herself','him','himself','his',
  'how','i','if','in','into','is','it','its','itself','just','me','more','most','my',
  'myself','no','nor','not','now','of','off','on','once','only','or','other','our','ours',
  'ourselves','out','over','own','same','she','should','so','some','such','than','that',
  'the','their','theirs','them','themselves','then','there','these','they','this','those',
  'through','to','too','under','until','up','very','was','we','were','what','when','where',
  'which','while','who','whom','why','will','with','would','you','your','yours','yourself',
  'yourselves','hi','ok','okay','yes','please','thanks','thank'
]);

/**
 * Tokenize text: lowercase, split on non-word chars, drop stopwords and empty tokens.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  if (!text) return [];
  const lowered = String(text).toLowerCase();
  const raw = lowered.split(/[^a-z0-9]+/);
  const out = [];
  for (const t of raw) {
    if (!t) continue;
    if (t.length < 2) continue;
    if (STOPWORDS.has(t)) continue;
    out.push(t);
  }
  return out;
}

/**
 * Build an L2-normalized bag-of-words + hash vector.
 * Each token is hashed into a bucket (mod dim) and the count is accumulated.
 * Final vector is L2 normalized so cosine similarity == dot product.
 *
 * @param {string} text
 * @param {number} dim  vector dimensionality
 * @returns {number[]}
 */
function embed(text, dim = DEFAULT_DIM) {
  const vec = new Array(dim).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vec;

  // Term-frequency weight (count per token). Could be substituted for TF-IDF later.
  const tf = new PersistentMap('tf', { serviceName: 'semantic-cache' });
  for (const tok of tokens) {
    tf.set(tok, (tf.get(tok) || 0) + 1);
  }
  for (const [tok, count] of tf.entries()) {
    const idx = fnv1a(tok) % dim;
    vec[idx] += count;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] = vec[i] / norm;
  }
  return vec;
}

/**
 * Cosine similarity between two equal-length vectors. Assumes both are L2 normalized,
 * in which case cos = dot. We still compute it the safe way to handle non-normalized inputs.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} similarity in [-1, 1]
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Cheap fingerprint of a vector for use as a quick "exact-ish" prefilter
 * before doing full cosine. Not cryptographic — just lets us avoid scoring
 * totally unrelated entries in a future larger index.
 * @param {number[]} vec
 * @returns {string}
 */
function vectorFingerprint(vec) {
  let h = 0x811c9dc5;
  for (let i = 0; i < vec.length; i += 8) {
    const chunk = Math.round(vec[i] * 1000);
    h ^= chunk + i;
    h = (h * 0x01000193) >>> 0;
  }
  return 'fp_' + h.toString(16);
}

// ============ HELPERS ============

/**
 * Identify the requesting principal from headers.
 * @param {import('express').Request} req
 * @returns {string}
 */
function principalOf(req) {
  return (
    req.headers['x-actor'] ||
    req.headers['x-principal'] ||
    req.headers['x-user-id'] ||
    (req.headers.authorization ? 'auth:' + req.headers.authorization.slice(0, 12) : 'anonymous')
  );
}

/**
 * Record an audit entry.
 * @param {Object} entry
 */
function audit(entry) {
  const record = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry
  };
  auditLog.push(record);
  if (auditLog.length > 10000) auditLog.shift();
  return record;
}

/**
 * Strip heavy fields before returning an entry over the wire.
 * Embedding kept (clients may want it for debugging) but prompt echoed for clarity.
 * @param {CacheEntry} e
 */
function toPublicView(e) {
  return {
    id: e.id,
    key: e.key,
    prompt: e.prompt,
    promptEmbedding: e.promptEmbedding, // full vector — fine for debug
    response: e.response,
    model: e.model,
    metadata: e.metadata || {},
    hitCount: e.hitCount,
    createdAt: e.createdAt,
    lastHitAt: e.lastHitAt,
    expiresAt: e.expiresAt,
    expired: e.expiresAt ? new Date(e.expiresAt).getTime() < Date.now() : false
  };
}

/**
 * Estimate the dollar value saved when a cache hit avoids an LLM call.
 * Uses metadata.costUsd if present, otherwise a conservative per-model default.
 * @param {CacheEntry} e
 */
function estimatedCostOf(e) {
  const m = e.metadata || {};
  if (typeof m.costUsd === 'number' && m.costUsd > 0) return m.costUsd;
  const model = (e.model || '').toLowerCase();
  if (model.includes('gpt-4')) return 0.03;
  if (model.includes('gpt-3.5')) return 0.002;
  if (model.includes('claude')) return 0.015;
  if (model.includes('gemini')) return 0.001;
  if (model.includes('llama')) return 0.0005;
  return 0.005; // generic conservative default
}

/**
 * Remove expired entries in place. Called at startup and lazily during list ops.
 * @returns {number} number of entries removed
 */
function sweepExpired() {
  const now = Date.now();
  let removed = 0;
  for (const [id, e] of entries) {
    if (e.expiresAt && new Date(e.expiresAt).getTime() < now) {
      entries.delete(id);
      removed++;
    }
  }
  return removed;
}

// ============ EXPRESS APP ============

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '2mb' }));

// ============ HEALTH ============

app.get('/health', (req, res) => res.redirect(301, '/api/health'));

app.get('/api/health', (req, res) => {
  sweepExpired();
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    vectorDim: DEFAULT_DIM,
    defaultThreshold: DEFAULT_THRESHOLD,
    stats: {
      entries: entries.size,
      auditEntries: auditLog.length,
      hitRate: stats.totalLookups > 0
        ? +(stats.totalHits / stats.totalLookups).toFixed(4)
        : 0
    },
    timestamp: new Date().toISOString()
  });
});

// ============ EMBEDDING SERVICE ============

/**
 * POST /api/embed
 * Compute an embedding for a single text.
 * Body: { text, dim? }
 */
app.post('/api/embed',requireAuth,  (req, res) => {
  const { text, dim } = req.body || {};
  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'text (string) is required' });
  }
  const d = (typeof dim === 'number' && dim > 0 && dim <= 4096) ? dim : DEFAULT_DIM;
  const vec = embed(text, d);
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  res.json({
    embedding: vec,
    dimension: d,
    norm: Math.sqrt(norm),
    fingerprint: vectorFingerprint(vec),
    tokens: tokenize(text)
  });
});

/**
 * POST /api/embed/batch
 * Compute embeddings for multiple texts in one call.
 * Body: { texts: string[], dim? }
 */
app.post('/api/embed/batch',requireAuth,  (req, res) => {
  const { texts, dim } = req.body || {};
  if (!Array.isArray(texts)) {
    return res.status(400).json({ error: 'texts (array of strings) is required' });
  }
  if (texts.length > 500) {
    return res.status(400).json({ error: 'max 500 texts per batch' });
  }
  const d = (typeof dim === 'number' && dim > 0 && dim <= 4096) ? dim : DEFAULT_DIM;
  const out = texts.map(t => {
    const vec = embed(String(t || ''), d);
    let norm = 0;
    for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
    return {
      embedding: vec,
      dimension: d,
      norm: Math.sqrt(norm),
      fingerprint: vectorFingerprint(vec)
    };
  });
  res.json({ count: out.length, results: out });
});

/**
 * POST /api/similarity
 * Compute cosine similarity between two texts (or two vectors).
 * Body: { a: text|string[], b: text|string[], dim? }
 */
app.post('/api/similarity',requireAuth,  (req, res) => {
  const { a, b, dim } = req.body || {};
  if (a == null || b == null) {
    return res.status(400).json({ error: 'a and b are required' });
  }
  const d = (typeof dim === 'number' && dim > 0 && dim <= 4096) ? dim : DEFAULT_DIM;
  const va = Array.isArray(a) ? a : embed(String(a), d);
  const vb = Array.isArray(b) ? b : embed(String(b), d);
  res.json({
    similarity: +cosineSimilarity(va, vb).toFixed(6),
    dimension: d
  });
});

// ============ CACHE CRUD ============

/**
 * POST /api/cache
 * Store a cache entry.
 * Body: { prompt, response, model, metadata?, ttlSeconds? }
 *
 * If an entry with the same key already exists, we upsert (bump hitCount to 0,
 * replace response, preserve original id and createdAt).
 */
app.post('/api/cache',requireAuth,  (req, res) => {
  const { prompt, response, model, metadata, ttlSeconds, key } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt (non-empty string) is required' });
  }
  if (typeof response !== 'string') {
    return res.status(400).json({ error: 'response (string) is required' });
  }
  if (typeof model !== 'string' || !model.trim()) {
    return res.status(400).json({ error: 'model (string) is required' });
  }

  const vec = embed(prompt, DEFAULT_DIM);
  const fp = vectorFingerprint(vec);
  const entryKey = (typeof key === 'string' && key) ? key : fp;

  // Upsert if same key already exists.
  let existing = null;
  for (const e of entries.values()) {
    if (e.key === entryKey) { existing = e; break; }
  }

  const now = new Date().toISOString();
  if (existing) {
    existing.prompt = prompt;
    existing.promptEmbedding = vec;
    existing.response = response;
    existing.model = model;
    existing.metadata = metadata || {};
    existing.hitCount = 0;
    existing.lastHitAt = null;
    existing.expiresAt = ttlSeconds
      ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
      : null;
    stats.totalStores++;
    audit({
      op: 'store-upsert',
      entryId: existing.id,
      key: existing.key,
      model,
      principal: principalOf(req),
      success: true,
      ip: req.ip
    });
    return res.status(200).json({ message: 'Cache entry updated', entry: toPublicView(existing) });
  }

  const entry = {
    id: uuidv4(),
    key: entryKey,
    prompt,
    promptEmbedding: vec,
    response,
    model,
    metadata: metadata || {},
    hitCount: 0,
    createdAt: now,
    lastHitAt: null,
    expiresAt: ttlSeconds
      ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
      : null
  };
  entries.set(entry.id, entry);
  stats.totalStores++;
  audit({
    op: 'store',
    entryId: entry.id,
    key: entry.key,
    model,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });
  res.status(201).json({ message: 'Cache entry created', entry: toPublicView(entry) });
});

/**
 * GET /api/cache
 * List cache entries. Optional filters:
 *   ?model=gpt-4           filter by model
 *   ?limit=50&offset=0     pagination
 *   ?includeExpired=false  default false
 */
app.get('/api/cache', (req, res) => {
  const { model, limit, offset, includeExpired } = req.query;
  sweepExpired();

  let list = Array.from(entries.values());
  if (model) list = list.filter(e => e.model === model);
  if (includeExpired !== 'true') {
    const now = Date.now();
    list = list.filter(e => !e.expiresAt || new Date(e.expiresAt).getTime() > now);
  }
  list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

  const off = parseInt(offset) || 0;
  const lim = Math.min(parseInt(limit) || 50, 500);
  const page = list.slice(off, off + lim);
  res.json({
    count: list.length,
    limit: lim,
    offset: off,
    entries: page.map(toPublicView)
  });
});

/**
 * GET /api/cache/:id
 * Get a single cache entry by id.
 */
app.get('/api/cache/:id', (req, res) => {
  const e = entries.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Cache entry not found' });
  res.json({ entry: toPublicView(e) });
});

/**
 * DELETE /api/cache/:id
 * Delete a cache entry.
 */
app.delete('/api/cache/:id',requireAuth,  (req, res) => {
  const e = entries.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Cache entry not found' });
  entries.delete(req.params.id);
  audit({
    op: 'delete',
    entryId: e.id,
    key: e.key,
    model: e.model,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });
  res.json({ message: 'Cache entry deleted', id: e.id });
});

/**
 * POST /api/cache/clear
 * Clear entries, optionally filtered.
 * Body (optional): { model?, olderThan? (ISO timestamp) }
 */
app.post('/api/cache/clear',requireAuth,  (req, res) => {
  const body = req.body || {};
  const { model, olderThan } = body;
  let removed = 0;
  for (const [id, e] of entries) {
    let drop = true;
    if (model && e.model !== model) drop = false;
    if (drop && olderThan && new Date(e.createdAt).getTime() >= new Date(olderThan).getTime()) drop = false;
    if (drop) { entries.delete(id); removed++; }
  }
  audit({
    op: 'clear',
    removed,
    model: model || null,
    olderThan: olderThan || null,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });
  res.json({ message: 'Cache cleared', removed, remaining: entries.size });
});

/**
 * GET /api/cache/similar/:id
 * Return entries similar to the given one, sorted by similarity desc.
 * Optional ?topK=10 (default 10), ?threshold=0.5
 */
app.get('/api/cache/similar/:id', (req, res) => {
  const target = entries.get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Cache entry not found' });
  const topK = Math.min(parseInt(req.query.topK) || 10, 100);
  const threshold = (typeof req.query.threshold === 'string')
    ? parseFloat(req.query.threshold)
    : 0.5;

  const scored = [];
  for (const e of entries.values()) {
    if (e.id === target.id) continue;
    if (e.expiresAt && new Date(e.expiresAt).getTime() < Date.now()) continue;
    const sim = cosineSimilarity(target.promptEmbedding, e.promptEmbedding);
    if (sim >= threshold) scored.push({ entry: e, similarity: +sim.toFixed(6) });
  }
  scored.sort((a, b) => b.similarity - a.similarity);
  const top = scored.slice(0, topK);
  res.json({
    targetId: target.id,
    threshold,
    count: top.length,
    similar: top.map(s => ({
      id: s.entry.id,
      prompt: s.entry.prompt,
      model: s.entry.model,
      similarity: s.similarity,
      hitCount: s.entry.hitCount
    }))
  });
});

// ============ LOOKUP (the main endpoint) ============

/**
 * POST /api/lookup
 * The hot path. Given a prompt, find the most semantically similar cached entry.
 * Body: { prompt, model?, threshold?, topK? }
 * Response: { hit, entry?, similarity?, alternatives: [{id, similarity}] }
 *
 * If `model` is supplied, we only consider entries for that model. This is how
 * the inference gateway keeps GPT-4 hits from serving GPT-3.5 cached responses.
 */
app.post('/api/lookup',requireAuth,  (req, res) => {
  const { prompt, model, threshold, topK } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt (non-empty string) is required' });
  }
  const thr = (typeof threshold === 'number' && threshold >= -1 && threshold <= 1)
    ? threshold
    : DEFAULT_THRESHOLD;
  const k = Math.min(parseInt(topK) || 1, 20);
  const qvec = embed(prompt, DEFAULT_DIM);

  const now = Date.now();
  let best = null;
  const alts = []; // top-K alternatives (excluding best) for debugging

  for (const e of entries.values()) {
    if (e.expiresAt && new Date(e.expiresAt).getTime() < now) continue;
    if (model && e.model !== model) continue;
    const sim = cosineSimilarity(qvec, e.promptEmbedding);
    if (sim >= thr) {
      if (!best || sim > best.similarity) {
        if (best) alts.push({ id: best.entry.id, similarity: +best.similarity.toFixed(6) });
        best = { entry: e, similarity: sim };
      } else {
        alts.push({ id: e.id, similarity: +sim.toFixed(6) });
      }
    }
  }
  alts.sort((a, b) => b.similarity - a.similarity);
  const trimmedAlts = alts.slice(0, Math.max(0, k - 1));

  stats.totalLookups++;

  if (best) {
    best.entry.hitCount++;
    best.entry.lastHitAt = new Date().toISOString();
    stats.totalHits++;
    stats.similaritySumAtHit += best.similarity;
    const saved = estimatedCostOf(best.entry);
    stats.estimatedCostSavedUsd += saved;
    audit({
      op: 'lookup-hit',
      entryId: best.entry.id,
      similarity: +best.similarity.toFixed(6),
      model: best.entry.model,
      requestedModel: model || null,
      estimatedCostSavedUsd: +saved.toFixed(6),
      principal: principalOf(req),
      success: true,
      ip: req.ip
    });
    return res.json({
      hit: true,
      similarity: +best.similarity.toFixed(6),
      entry: toPublicView(best.entry),
      alternatives: trimmedAlts
    });
  }

  stats.totalMisses++;
  audit({
    op: 'lookup-miss',
    requestedModel: model || null,
    threshold: thr,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });
  res.json({
    hit: false,
    similarity: null,
    entry: null,
    alternatives: trimmedAlts
  });
});

/**
 * POST /api/lookup/batch
 * Batch lookup. Body: { prompts: [{prompt, model?, threshold?}, ...] }
 * Returns array of results in the same order.
 */
app.post('/api/lookup/batch',requireAuth,  (req, res) => {
  const { prompts } = req.body || {};
  if (!Array.isArray(prompts)) {
    return res.status(400).json({ error: 'prompts (array) is required' });
  }
  if (prompts.length > 200) {
    return res.status(400).json({ error: 'max 200 prompts per batch' });
  }
  // Reuse the single-lookup logic so behavior is identical.
  // We synthesise a fake req so we can call the handler; simpler to just inline the logic.
  const now = Date.now();
  const results = prompts.map(p => {
    if (!p || typeof p.prompt !== 'string' || !p.prompt.trim()) {
      return { hit: false, error: 'prompt (non-empty string) is required' };
    }
    const thr = (typeof p.threshold === 'number' && p.threshold >= -1 && p.threshold <= 1)
      ? p.threshold
      : DEFAULT_THRESHOLD;
    const qvec = embed(p.prompt, DEFAULT_DIM);
    let best = null;
    for (const e of entries.values()) {
      if (e.expiresAt && new Date(e.expiresAt).getTime() < now) continue;
      if (p.model && e.model !== p.model) continue;
      const sim = cosineSimilarity(qvec, e.promptEmbedding);
      if (sim >= thr && (!best || sim > best.similarity)) {
        best = { entry: e, similarity: sim };
      }
    }
    stats.totalLookups++;
    if (best) {
      best.entry.hitCount++;
      best.entry.lastHitAt = new Date().toISOString();
      stats.totalHits++;
      stats.similaritySumAtHit += best.similarity;
      stats.estimatedCostSavedUsd += estimatedCostOf(best.entry);
      return {
        hit: true,
        similarity: +best.similarity.toFixed(6),
        entry: toPublicView(best.entry)
      };
    }
    stats.totalMisses++;
    return { hit: false, similarity: null, entry: null };
  });

  audit({
    op: 'lookup-batch',
    count: prompts.length,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });
  res.json({ count: results.length, results });
});

// ============ STATS ============

/**
 * GET /api/stats
 * Cumulative stats: entries, hits, misses, hit rate, average similarity at hit,
 * estimated cost saved.
 */
app.get('/api/stats', (req, res) => {
  sweepExpired();
  const hitRate = stats.totalLookups > 0 ? stats.totalHits / stats.totalLookups : 0;
  const avgSim = stats.totalHits > 0 ? stats.similaritySumAtHit / stats.totalHits : 0;

  // Per-model breakdown
  const byModel = {};
  for (const e of entries.values()) {
    if (!byModel[e.model]) byModel[e.model] = { entries: 0, hits: 0 };
    byModel[e.model].entries++;
    byModel[e.model].hits += e.hitCount;
  }

  res.json({
    entries: entries.size,
    totalStores: stats.totalStores,
    totalLookups: stats.totalLookups,
    totalHits: stats.totalHits,
    totalMisses: stats.totalMisses,
    hitRate: +hitRate.toFixed(4),
    averageSimilarityAtHit: +avgSim.toFixed(4),
    estimatedCostSavedUsd: +stats.estimatedCostSavedUsd.toFixed(6),
    byModel,
    auditEntries: auditLog.length,
    vectorDim: DEFAULT_DIM,
    defaultThreshold: DEFAULT_THRESHOLD,
    uptimeStats: {
      startedAt: startedAt
    }
  });
});

/**
 * POST /api/stats/reset
 * Reset cumulative stats counters (does NOT touch cache entries).
 */
app.post('/api/stats/reset',requireAuth,  (req, res) => {
  stats.totalStores = 0;
  stats.totalLookups = 0;
  stats.totalHits = 0;
  stats.totalMisses = 0;
  stats.similaritySumAtHit = 0;
  stats.estimatedCostSavedUsd = 0;
  audit({ op: 'stats-reset', principal: principalOf(req), success: true, ip: req.ip });
  res.json({ message: 'Stats reset', stats });
});

// ============ AUDIT ============

/**
 * GET /api/audit
 * Optional filters: ?op=, ?entryId=, ?limit=200
 */
app.get('/api/audit', (req, res) => {
  let list = auditLog;
  if (req.query.op) list = list.filter(e => e.op === req.query.op);
  if (req.query.entryId) list = list.filter(e => e.entryId === req.query.entryId);
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ count: list.length, entries: list.slice(-limit) });
});

// ============ STARTUP: pre-seed example data ============
//
// Five entry groups, each containing paraphrases of the same question. They exist
// primarily so a fresh deploy demonstrates that similarity matching works end-to-end:
// curl /api/lookup with "Tell me the weather" will hit the cache populated by
// "What's the weather like?".

const startedAt = new Date().toISOString();

(function seed() {
  const seedGroups = [
    {
      model: 'gpt-3.5-turbo',
      metadata: { provider: 'openai', tokensIn: 12, tokensOut: 45, costUsd: 0.0002 },
      prompts: [
        'What is the weather in Paris today?',
        "What's the weather like in Paris right now?",
        'Tell me the current weather in Paris'
      ],
      response: 'It is currently 18°C and partly cloudy in Paris.'
    },
    {
      model: 'gpt-4',
      metadata: { provider: 'openai', tokensIn: 20, tokensOut: 110, costUsd: 0.006 },
      prompts: [
        'Explain quantum entanglement in simple terms',
        'Can you explain quantum entanglement simply?',
        'Help me understand quantum entanglement'
      ],
      response: 'Quantum entanglement is when two particles become linked so that the state of one instantly affects the other, no matter the distance between them.'
    },
    {
      model: 'claude-3-sonnet',
      metadata: { provider: 'anthropic', tokensIn: 8, tokensOut: 60, costUsd: 0.0009 },
      prompts: [
        'How do I make pasta carbonara?',
        'Give me a recipe for pasta carbonara',
        'Steps to cook carbonara pasta'
      ],
      response: 'Cook guanciale until crisp, whisk eggs with pecorino, toss with hot pasta off the heat, season with pepper. No cream.'
    },
    {
      model: 'gpt-3.5-turbo',
      metadata: { provider: 'openai', tokensIn: 6, tokensOut: 30, costUsd: 0.0001 },
      prompts: [
        'What is the capital of Japan?',
        'Which city is the capital of Japan?',
        "Japan's capital city?"
      ],
      response: 'Tokyo is the capital of Japan.'
    },
    {
      model: 'llama-3-70b',
      metadata: { provider: 'meta', tokensIn: 10, tokensOut: 55, costUsd: 0.0003 },
      prompts: [
        'Write a haiku about programming',
        'Compose a haiku on programming',
        'A haiku that is about coding please'
      ],
      response: 'Silent cursor blinks —\nlogic unfolds line by line,\nbugs become features.'
    }
  ];

  let seeded = 0;
  for (const g of seedGroups) {
    // Use the canonical first prompt as the canonical entry; store the others as separate
    // entries too, so lookup genuinely has multiple candidates to choose between.
    const allPrompts = g.prompts;
    for (const p of allPrompts) {
      const vec = embed(p, DEFAULT_DIM);
      const id = uuidv4();
      entries.set(id, {
        id,
        key: vectorFingerprint(vec),
        prompt: p,
        promptEmbedding: vec,
        response: g.response,
        model: g.model,
        metadata: g.metadata,
        hitCount: 0,
        createdAt: new Date().toISOString(),
        lastHitAt: null,
        expiresAt: null
      });
      seeded++;
    }
  }
  console.log(`[${SERVICE_NAME}] seeded ${seeded} example cache entries across ${seedGroups.length} groups`);
})();

// ============ ERROR HANDLERS ============

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ START ============
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  // TODO: In production, swap the in-memory Map for Redis or Postgres with pgvector
  // (and use an HNSW index for sub-millisecond nearest-neighbor lookup at scale).
  // TODO: In production, swap the bag-of-words vectorizer for a real embedding model
  // (text-embedding-3-small, voyage-2, or a local sentence-transformers service).
  // TODO: In production, add a per-tenant namespace on every key so caches don't leak
  // across customers in a multi-tenant inference gateway.
  console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] vector dim=${DEFAULT_DIM}, default threshold=${DEFAULT_THRESHOLD}`);
});
installGracefulShutdown(server);
