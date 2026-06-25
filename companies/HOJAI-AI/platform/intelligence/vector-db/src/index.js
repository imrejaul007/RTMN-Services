/**
 * RTMN Vector Database v1.0
 *
 * In-memory vector store inspired by Pinecone, Qdrant, and pgvector.
 * Lightweight Pinecone/Qdrant alternative for the RTMN ecosystem — no external
 * DB needed, no native deps, runs anywhere Node runs.
 *
 * Features:
 *  - Namespaced collections (cosine | dot | euclidean similarity)
 *  - Vector CRUD: upsert (single + batch), get, delete (single + batch), list (paginated)
 *  - Search with optional metadata filters (eq, ne, gt, gte, lt, lte, in, nin, exists)
 *  - Standalone embedding service (POST /api/embed) — bag-of-words + FNV-1a hash
 *  - Search-by-text convenience endpoint (vectorizes + searches in one call)
 *  - Top-level /api/query (collection name in body, no path param)
 *  - Stats, audit log (10k cap), health
 *
 * @author HOJAI AI - Training & Model Platform (Division 7)
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.env.PORT, 10) || 4780;
const SERVICE_NAME = 'vector-db';
const VERSION = '1.0.0';
const DEFAULT_DIM = 128;
const VALID_METRICS = new Set(['cosine', 'dot', 'euclidean']);
const AUDIT_CAP = 10000;

// ============ IN-MEMORY STORAGE ============

/**
 * @typedef {Object} Vector
 * @property {string}   id         - UUID
 * @property {number[]} values     - the embedding (dim = collection.dimension)
 * @property {Object}   metadata   - arbitrary user metadata
 * @property {string|undefined} document - optional source text
 * @property {string}   createdAt  - ISO
 */

/**
 * @typedef {Object} Collection
 * @property {string}   id         - UUID
 * @property {string}   name       - unique collection name
 * @property {number}   dimension  - required dim of every vector
 * @property {string}   metric     - cosine | dot | euclidean
 * @property {Map<string, Vector>} vectors - id -> vector
 * @property {Object}   index      - sparse inverted map: field -> value -> Set(vectorId)
 *                                   (populated lazily for filter speed; not required for correctness)
 * @property {string}   createdAt  - ISO
 */

/** @type {Map<string, Collection>} name -> collection */
const collections = new PersistentMap('collections', { serviceName: 'vector-db' });

/** @type {Array<Object>} append-only audit log, capped at AUDIT_CAP */
const auditLog = [];

/** Cumulative counters — reset via POST /api/stats/reset */
const stats = {
  totalCollectionsCreated: 0,
  totalCollectionsDeleted: 0,
  totalVectorUpserts: 0,
  totalVectorDeletes: 0,
  totalSearches: 0,
  totalSearchesAudited: 0 // subset of totalSearches that produced matches and were audited
};

const startedAt = new Date().toISOString();

// ============ EMBEDDING (re-implemented from semantic-cache for service independence) ============

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
 * ~80 English stopwords — kept inline so the service has zero file deps.
 * Copied verbatim from semantic-cache for cross-service consistency.
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
  const tf = new PersistentMap('tf', { serviceName: 'vector-db' });
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

// ============ SIMILARITY FUNCTIONS ============

/**
 * Cosine similarity between two equal-length vectors. Assumes both may or may not be
 * L2 normalized — we compute it the safe way to handle non-normalized inputs.
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
 * Dot product similarity. If both vectors are L2 normalized, this is equivalent to
 * cosine. If not, it scales with magnitude — clients that use this should normalize.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function dotSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Euclidean similarity — convert distance to a [0, 1] score via 1 / (1 + distance).
 * Smaller distance = higher score. Identical vectors → 1.0; orthogonal = ~0.5; very far → ~0.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} score in (0, 1]
 */
function euclideanSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  const dist = Math.sqrt(sum);
  return 1 / (1 + dist);
}

/**
 * Pick the right similarity function for a collection.
 * @param {string} metric
 * @returns {(a: number[], b: number[]) => number}
 */
function similarityFor(metric) {
  switch (metric) {
    case 'dot': return dotSimilarity;
    case 'euclidean': return euclideanSimilarity;
    case 'cosine':
    default: return cosineSimilarity;
  }
}

// ============ FILTER EVALUATION ============

/**
 * Evaluate a single filter condition against a metadata object.
 * @param {{field: string, op: string, value?: any}} cond
 * @param {Object} metadata
 * @returns {boolean}
 */
function evalCondition(cond, metadata) {
  if (!cond || typeof cond !== 'object') return true;
  const { field, op } = cond;
  if (!field || !op) return true;
  const v = metadata ? metadata[field] : undefined;
  const has = metadata && Object.prototype.hasOwnProperty.call(metadata, field) &&
              metadata[field] !== undefined && metadata[field] !== null;

  switch (op) {
    case 'eq':
      // If client specified a value, require equality. If field is absent, fail.
      return v === cond.value;
    case 'ne':
      return v !== cond.value;
    case 'gt':
      return has && typeof v === 'number' && v > cond.value;
    case 'gte':
      return has && typeof v === 'number' && v >= cond.value;
    case 'lt':
      return has && typeof v === 'number' && v < cond.value;
    case 'lte':
      return has && typeof v === 'number' && v <= cond.value;
    case 'in':
      return Array.isArray(cond.value) && cond.value.includes(v);
    case 'nin':
      return Array.isArray(cond.value) && !cond.value.includes(v);
    case 'exists':
      // cond.value is a boolean — true means field must be present
      if (cond.value === false) return !has;
      return has;
    default:
      return false;
  }
}

/**
 * Evaluate a filter (array of conditions AND'd together, or single condition object).
 * Missing or empty filter = match everything.
 * @param {Array|Object|null|undefined} filter
 * @param {Object} metadata
 * @returns {boolean}
 */
function evaluateFilter(filter, metadata) {
  if (!filter) return true;
  if (Array.isArray(filter)) {
    if (filter.length === 0) return true;
    for (const c of filter) {
      if (!evalCondition(c, metadata)) return false;
    }
    return true;
  }
  // Single condition object
  return evalCondition(filter, metadata);
}

// ============ HELPERS ============

/**
 * Identify the requesting principal from headers.
 * Mirrors the semantic-cache pattern: x-actor, x-principal, x-user-id, then auth prefix.
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
 * Record an audit entry. Capped at AUDIT_CAP (FIFO).
 * @param {Object} entry
 * @returns {Object} the recorded entry (with id and timestamp)
 */
function audit(entry) {
  const record = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry
  };
  auditLog.push(record);
  if (auditLog.length > AUDIT_CAP) auditLog.shift();
  return record;
}

/**
 * Validate that a number[] is well-formed.
 * @param {any} values
 * @returns {string|null} error message or null
 */
function validateValues(values) {
  if (!Array.isArray(values)) return 'values must be a number[]';
  if (values.length === 0) return 'values must not be empty';
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] !== 'number' || !Number.isFinite(values[i])) {
      return `values[${i}] is not a finite number`;
    }
  }
  return null;
}

/**
 * Public view of a collection. Includes vector count.
 * @param {Collection} c
 */
function collectionView(c) {
  return {
    id: c.id,
    name: c.name,
    dimension: c.dimension,
    metric: c.metric,
    vectorCount: c.vectors.size,
    createdAt: c.createdAt
  };
}

/**
 * Public view of a single vector.
 * @param {Vector} v
 * @param {{includeValues?: boolean, includeDocument?: boolean}} [opts]
 */
function vectorView(v, opts = {}) {
  const out = {
    id: v.id,
    metadata: v.metadata || {}
  };
  if (opts.includeValues !== false) out.values = v.values; // default true per spec
  if (v.document !== undefined) out.document = v.document;
  out.createdAt = v.createdAt;
  return out;
}

/**
 * Estimate memory usage of a single vector (rough).
 * 8 bytes per float64 + 200 bytes overhead for object/id/timestamps.
 * @param {Vector} v
 * @returns {number} bytes
 */
function estimateVectorBytes(v) {
  return v.values.length * 8 + 200;
}

/**
 * Update the lazy inverted index when a vector is upserted.
 * Index structure: { field: { value: Set(vectorId) } }
 * @param {Collection} c
 * @param {Vector} v
 */
function indexUpsert(c, v) {
  if (!v.metadata) return;
  for (const [k, val] of Object.entries(v.metadata)) {
    if (val === undefined || val === null) continue;
    if (!c.index[k]) c.index[k] = new PersistentMap('collection-3', { serviceName: 'vector-db' });
    const key = String(val);
    if (!c.index[k].has(key)) c.index[k].set(key, new Set());
    c.index[k].get(key).add(v.id);
  }
}

/**
 * Remove a vector from the inverted index.
 * @param {Collection} c
 * @param {Vector} v
 */
function indexRemove(c, v) {
  if (!v.metadata) return;
  for (const [k, val] of Object.entries(v.metadata)) {
    if (val === undefined || val === null) continue;
    const fIdx = c.index[k];
    if (!fIdx) continue;
    const key = String(val);
    const set = fIdx.get(key);
    if (set) {
      set.delete(v.id);
      if (set.size === 0) fIdx.delete(key);
    }
    if (fIdx.size === 0) delete c.index[k];
  }
}

// ============ EXPRESS APP ============

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));

// Top-level health redirect (per spec)
app.get('/health', (req, res) => res.redirect(301, '/api/health'));

// ============ HEALTH ============

app.get('/api/health', (req, res) => {
  let totalVectors = 0;
  for (const c of collections.values()) totalVectors += c.vectors.size;
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: VERSION,
    collections: collections.size,
    totalVectors,
    uptime: startedAt,
    timestamp: new Date().toISOString()
  });
});

// ============ EMBEDDING SERVICE ============

/**
 * POST /api/embed
 * Compute an embedding for a single text using the in-process FNV-1a bag-of-words
 * vectorizer. This is THE shared vectorizer used by RAG and other RTMN services.
 * Body: { text, dimension? }
 * Response: { vector, dim, norm }
 */
app.post('/api/embed',requireAuth,  (req, res) => {
  const { text, dimension } = req.body || {};
  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'text (string) is required', code: 'TEXT_REQUIRED' });
  }
  const dim = (typeof dimension === 'number' && dimension > 0 && dimension <= 4096)
    ? Math.floor(dimension)
    : DEFAULT_DIM;
  const vec = embed(text, dim);
  let normSq = 0;
  for (let i = 0; i < vec.length; i++) normSq += vec[i] * vec[i];
  res.json({
    vector: vec,
    dim,
    norm: Math.sqrt(normSq)
  });
});

// ============ COLLECTIONS ============

/**
 * POST /api/collections
 * Create a new collection.
 * Body: { name, dimension, metric? }
 */
app.post('/api/collections',requireAuth,  (req, res) => {
  const { name, dimension, metric } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name (non-empty string) is required', code: 'NAME_REQUIRED' });
  }
  if (typeof dimension !== 'number' || !Number.isInteger(dimension) || dimension <= 0 || dimension > 4096) {
    return res.status(400).json({ error: 'dimension (positive integer, max 4096) is required', code: 'DIMENSION_REQUIRED' });
  }
  const m = (typeof metric === 'string') ? metric.toLowerCase() : 'cosine';
  if (!VALID_METRICS.has(m)) {
    return res.status(400).json({
      error: `metric must be one of: ${Array.from(VALID_METRICS).join(', ')}`,
      code: 'INVALID_METRIC'
    });
  }
  if (collections.has(name)) {
    return res.status(409).json({ error: `collection '${name}' already exists`, code: 'COLLECTION_EXISTS' });
  }
  const collection = {
    id: uuidv4(),
    name,
    dimension,
    metric: m,
    vectors: new PersistentMap('collection-4', { serviceName: 'vector-db' }),
    index: {},
    createdAt: new Date().toISOString()
  };
  collections.set(name, collection);
  stats.totalCollectionsCreated++;
  audit({
    action: 'collection.create',
    collection: name,
    dimension,
    metric: m,
    actor: principalOf(req),
    success: true
  });
  res.status(201).json(collectionView(collection));
});

/**
 * GET /api/collections
 * List all collections with counts.
 */
app.get('/api/collections', (req, res) => {
  const list = Array.from(collections.values()).map(collectionView);
  res.json({ collections: list, count: list.length });
});

/**
 * GET /api/collections/:name
 * Get one collection.
 */
app.get('/api/collections/:name', (req, res) => {
  const c = collections.get(req.params.name);
  if (!c) return res.status(404).json({ error: `collection '${req.params.name}' not found`, code: 'COLLECTION_NOT_FOUND' });
  res.json(collectionView(c));
});

/**
 * DELETE /api/collections/:name
 * Delete collection and all its vectors.
 */
app.delete('/api/collections/:name',requireAuth,  (req, res) => {
  const c = collections.get(req.params.name);
  if (!c) return res.status(404).json({ error: `collection '${req.params.name}' not found`, code: 'COLLECTION_NOT_FOUND' });
  const droppedCount = c.vectors.size;
  collections.delete(req.params.name);
  stats.totalCollectionsDeleted++;
  audit({
    action: 'collection.delete',
    collection: req.params.name,
    droppedVectors: droppedCount,
    actor: principalOf(req),
    success: true
  });
  res.json({ message: 'collection deleted', name: req.params.name, droppedVectors: droppedCount });
});

/**
 * PATCH /api/collections/:name
 * Update dimension or metric. Only allowed when collection is empty.
 */
app.patch('/api/collections/:name',requireAuth,  (req, res) => {
  const c = collections.get(req.params.name);
  if (!c) return res.status(404).json({ error: `collection '${req.params.name}' not found`, code: 'COLLECTION_NOT_FOUND' });
  if (c.vectors.size > 0) {
    return res.status(409).json({
      error: 'collection is not empty; clear vectors before updating schema',
      code: 'COLLECTION_NOT_EMPTY'
    });
  }
  const { dimension, metric } = req.body || {};
  if (dimension !== undefined) {
    if (typeof dimension !== 'number' || !Number.isInteger(dimension) || dimension <= 0 || dimension > 4096) {
      return res.status(400).json({ error: 'dimension (positive integer, max 4096) is required', code: 'DIMENSION_REQUIRED' });
    }
    c.dimension = dimension;
  }
  if (metric !== undefined) {
    const m = String(metric).toLowerCase();
    if (!VALID_METRICS.has(m)) {
      return res.status(400).json({
        error: `metric must be one of: ${Array.from(VALID_METRICS).join(', ')}`,
        code: 'INVALID_METRIC'
      });
    }
    c.metric = m;
  }
  audit({
    action: 'collection.update',
    collection: req.params.name,
    dimension: c.dimension,
    metric: c.metric,
    actor: principalOf(req),
    success: true
  });
  res.json(collectionView(c));
});

// ============ VECTORS ============

/**
 * Helper: validate collection + values + write a single vector (used by upsert and batch).
 * Returns { error, status, code } on failure, or { vector } on success.
 */
function upsertOne(collection, payload) {
  if (!payload || typeof payload !== 'object') {
    return { error: 'payload must be an object', status: 400, code: 'INVALID_PAYLOAD' };
  }
  const { id, values, metadata, document } = payload;
  const verr = validateValues(values);
  if (verr) return { error: verr, status: 400, code: 'INVALID_VALUES' };
  if (values.length !== collection.dimension) {
    return {
      error: `values length ${values.length} does not match collection dimension ${collection.dimension}`,
      status: 409,
      code: 'DIMENSION_MISMATCH'
    };
  }
  if (metadata !== undefined && (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata))) {
    return { error: 'metadata must be a plain object', status: 400, code: 'INVALID_METADATA' };
  }
  if (document !== undefined && typeof document !== 'string') {
    return { error: 'document must be a string', status: 400, code: 'INVALID_DOCUMENT' };
  }
  // Upsert: if id given and exists, replace; else create with given id or new uuid.
  const vid = (typeof id === 'string' && id.trim()) ? id : uuidv4();
  const existing = collection.vectors.get(vid);
  if (existing) {
    indexRemove(collection, existing);
  }
  const vec = {
    id: vid,
    values: Array.from(values),
    metadata: metadata || {},
    document: document,
    createdAt: existing ? existing.createdAt : new Date().toISOString()
  };
  collection.vectors.set(vid, vec);
  indexUpsert(collection, vec);
  return { vector: vec, isNew: !existing };
}

/**
 * POST /api/collections/:name/vectors
 * Upsert a single vector.
 * Body: { id?, values, metadata?, document? }
 */
app.post('/api/collections/:name/vectors',requireAuth,  (req, res) => {
  const c = collections.get(req.params.name);
  if (!c) return res.status(404).json({ error: `collection '${req.params.name}' not found`, code: 'COLLECTION_NOT_FOUND' });
  const result = upsertOne(c, req.body);
  if (result.error) return res.status(result.status).json({ error: result.error, code: result.code });
  stats.totalVectorUpserts++;
  audit({
    action: result.isNew ? 'vector.insert' : 'vector.update',
    collection: req.params.name,
    vectorId: result.vector.id,
    actor: principalOf(req),
    success: true
  });
  res.status(result.isNew ? 201 : 200).json({
    id: result.vector.id,
    collection: req.params.name,
    isNew: result.isNew,
    vector: vectorView(result.vector)
  });
});

/**
 * POST /api/collections/:name/vectors/batch
 * Batch upsert. Body: { vectors: [{ id?, values, metadata?, document? }, ...] }
 */
app.post('/api/collections/:name/vectors/batch',requireAuth,  (req, res) => {
  const c = collections.get(req.params.name);
  if (!c) return res.status(404).json({ error: `collection '${req.params.name}' not found`, code: 'COLLECTION_NOT_FOUND' });
  const { vectors } = req.body || {};
  if (!Array.isArray(vectors)) {
    return res.status(400).json({ error: 'vectors (array) is required', code: 'VECTORS_REQUIRED' });
  }
  if (vectors.length === 0) {
    return res.status(400).json({ error: 'vectors must not be empty', code: 'VECTORS_EMPTY' });
  }
  if (vectors.length > 1000) {
    return res.status(400).json({ error: 'max 1000 vectors per batch', code: 'BATCH_TOO_LARGE' });
  }
  const ids = [];
  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < vectors.length; i++) {
    const r = upsertOne(c, vectors[i]);
    if (r.error) {
      return res.status(r.status).json({ error: `vectors[${i}]: ${r.error}`, code: r.code });
    }
    ids.push(r.vector.id);
    if (r.isNew) inserted++; else updated++;
  }
  stats.totalVectorUpserts += ids.length;
  audit({
    action: 'vector.batch-upsert',
    collection: req.params.name,
    count: ids.length,
    inserted,
    updated,
    actor: principalOf(req),
    success: true
  });
  res.status(201).json({ inserted: ids.length, ids, newCount: inserted, updatedCount: updated });
});

/**
 * GET /api/collections/:name/vectors/:vectorId
 * Get a single vector.
 */
app.get('/api/collections/:name/vectors/:vectorId', (req, res) => {
  const c = collections.get(req.params.name);
  if (!c) return res.status(404).json({ error: `collection '${req.params.name}' not found`, code: 'COLLECTION_NOT_FOUND' });
  const v = c.vectors.get(req.params.vectorId);
  if (!v) return res.status(404).json({ error: 'vector not found', code: 'VECTOR_NOT_FOUND' });
  const includeValues = req.query.includeValues !== 'false'; // default true
  res.json({
    id: v.id,
    collection: req.params.name,
    vector: vectorView(v, { includeValues, includeDocument: true })
  });
});

/**
 * DELETE /api/collections/:name/vectors/:vectorId
 * Delete a single vector.
 */
app.delete('/api/collections/:name/vectors/:vectorId',requireAuth,  (req, res) => {
  const c = collections.get(req.params.name);
  if (!c) return res.status(404).json({ error: `collection '${req.params.name}' not found`, code: 'COLLECTION_NOT_FOUND' });
  const v = c.vectors.get(req.params.vectorId);
  if (!v) return res.status(404).json({ error: 'vector not found', code: 'VECTOR_NOT_FOUND' });
  indexRemove(c, v);
  c.vectors.delete(req.params.vectorId);
  stats.totalVectorDeletes++;
  audit({
    action: 'vector.delete',
    collection: req.params.name,
    vectorId: req.params.vectorId,
    actor: principalOf(req),
    success: true
  });
  res.json({ message: 'vector deleted', id: req.params.vectorId, collection: req.params.name });
});

/**
 * POST /api/collections/:name/vectors/delete-batch
 * Batch delete. Body: { ids: [...] }
 */
app.post('/api/collections/:name/vectors/delete-batch',requireAuth,  (req, res) => {
  const c = collections.get(req.params.name);
  if (!c) return res.status(404).json({ error: `collection '${req.params.name}' not found`, code: 'COLLECTION_NOT_FOUND' });
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids (non-empty array) is required', code: 'IDS_REQUIRED' });
  }
  if (ids.length > 1000) {
    return res.status(400).json({ error: 'max 1000 ids per batch', code: 'BATCH_TOO_LARGE' });
  }
  const deleted = [];
  const missing = [];
  for (const id of ids) {
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'ids must be strings', code: 'INVALID_ID' });
    }
    const v = c.vectors.get(id);
    if (v) {
      indexRemove(c, v);
      c.vectors.delete(id);
      deleted.push(id);
    } else {
      missing.push(id);
    }
  }
  stats.totalVectorDeletes += deleted.length;
  audit({
    action: 'vector.batch-delete',
    collection: req.params.name,
    requested: ids.length,
    deleted: deleted.length,
    missing: missing.length,
    actor: principalOf(req),
    success: true
  });
  res.json({ deleted: deleted.length, deletedIds: deleted, missing, requested: ids.length });
});

/**
 * GET /api/collections/:name/vectors?limit=50&offset=0
 * List vectors (paginated).
 */
app.get('/api/collections/:name/vectors', (req, res) => {
  const c = collections.get(req.params.name);
  if (!c) return res.status(404).json({ error: `collection '${req.params.name}' not found`, code: 'COLLECTION_NOT_FOUND' });
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const includeValues = req.query.includeValues !== 'false'; // default true

  const all = Array.from(c.vectors.values());
  // Stable order: by createdAt asc, then id asc
  all.sort((a, b) => {
    if (a.createdAt < b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;
    return a.id < b.id ? -1 : 1;
  });
  const page = all.slice(offset, offset + limit);
  res.json({
    collection: req.params.name,
    count: all.length,
    limit,
    offset,
    vectors: page.map(v => vectorView(v, { includeValues, includeDocument: true }))
  });
});

// ============ SEARCH (the core) ============

/**
 * Core search — shared by /api/collections/:name/search and /api/query.
 * @param {Collection} c
 * @param {number[]} queryVec
 * @param {{topK?: number, filter?: any, includeValues?: boolean, includeDocuments?: boolean}} opts
 * @returns {{ matches: Array, took_ms: number }}
 */
function performSearch(c, queryVec, opts) {
  const startedAt = Date.now();
  const topK = Math.min(Math.max(parseInt(opts.topK, 10) || 10, 1), 100);
  const includeValues = opts.includeValues !== false; // default true
  const includeDocuments = opts.includeDocuments !== false; // default true
  const sim = similarityFor(c.metric);

  // Optional audit: only log "interesting" searches (those with matches)
  const candidates = [];
  for (const v of c.vectors.values()) {
    if (opts.filter && !evaluateFilter(opts.filter, v.metadata)) continue;
    const score = sim(queryVec, v.values);
    candidates.push({ vector: v, score });
  }
  // Sort by score desc (higher = more similar). For euclidean, our 1/(1+d) score
  // is also higher = closer, so the same direction works.
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, topK);

  const took_ms = Date.now() - startedAt;
  return {
    matches: top.map(({ vector: v, score }) => {
      const m = {
        id: v.id,
        score: +score.toFixed(6),
        metadata: v.metadata || {}
      };
      if (includeValues) m.values = v.values;
      if (includeDocuments && v.document !== undefined) m.document = v.document;
      return m;
    }),
    took_ms
  };
}

/**
 * POST /api/collections/:name/search
 * Body: { query: number[], topK?, filter?, includeValues?, includeDocuments? }
 */
app.post('/api/collections/:name/search',requireAuth,  (req, res) => {
  const c = collections.get(req.params.name);
  if (!c) return res.status(404).json({ error: `collection '${req.params.name}' not found`, code: 'COLLECTION_NOT_FOUND' });
  const { query, topK, filter, includeValues, includeDocuments } = req.body || {};
  const verr = validateValues(query);
  if (verr) return res.status(400).json({ error: `query: ${verr}`, code: 'INVALID_QUERY' });
  if (query.length !== c.dimension) {
    return res.status(409).json({
      error: `query dimension ${query.length} does not match collection dimension ${c.dimension}`,
      code: 'DIMENSION_MISMATCH'
    });
  }
  const result = performSearch(c, query, { topK, filter, includeValues, includeDocuments });
  stats.totalSearches++;
  // Per spec: audit searches that return results above a threshold.
  // We use 0.5 as the "meaningful" threshold; the client knows the metric.
  const topMatch = result.matches[0];
  const thresholdForAudit = c.metric === 'cosine' ? 0.5 : 0.5;
  const isInteresting = !!topMatch && topMatch.score >= thresholdForAudit;
  if (isInteresting) {
    stats.totalSearchesAudited++;
    audit({
      action: 'search.hit',
      collection: req.params.name,
      topScore: topMatch.score,
      matchCount: result.matches.length,
      topK: Math.min(Math.max(parseInt(topK, 10) || 10, 1), 100),
      actor: principalOf(req),
      success: true
    });
  }
  res.json({
    collection: req.params.name,
    metric: c.metric,
    matches: result.matches,
    count: result.matches.length,
    took_ms: result.took_ms
  });
});

/**
 * POST /api/collections/:name/search-by-text
 * Convenience: vectorize text with the in-process FNV-1a vectorizer (dim=128)
 * and run a search. Caveat: the target collection MUST have dimension=128.
 * Body: { text, topK?, filter?, includeDocuments? }
 */
app.post('/api/collections/:name/search-by-text',requireAuth,  (req, res) => {
  const c = collections.get(req.params.name);
  if (!c) return res.status(404).json({ error: `collection '${req.params.name}' not found`, code: 'COLLECTION_NOT_FOUND' });
  const { text, topK, filter, includeDocuments } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text (non-empty string) is required', code: 'TEXT_REQUIRED' });
  }
  if (c.dimension !== DEFAULT_DIM) {
    return res.status(409).json({
      error: `search-by-text requires collection dimension ${DEFAULT_DIM} (the shared FNV-1a vectorizer produces fixed-dim vectors); this collection is dim=${c.dimension}`,
      code: 'DIMENSION_MISMATCH'
    });
  }
  const query = embed(text, c.dimension);
  const result = performSearch(c, query, { topK, filter, includeDocuments });
  stats.totalSearches++;
  audit({
    action: 'search.text',
    collection: req.params.name,
    textPreview: text.slice(0, 80),
    matchCount: result.matches.length,
    actor: principalOf(req),
    success: true
  });
  res.json({
    collection: req.params.name,
    metric: c.metric,
    queryText: text,
    matches: result.matches,
    count: result.matches.length,
    took_ms: result.took_ms
  });
});

/**
 * POST /api/query
 * Top-level alternative: collection name is in the body.
 * Body: { collection, query, topK?, filter?, includeValues?, includeDocuments? }
 */
app.post('/api/query',requireAuth,  (req, res) => {
  const { collection: collName, query, topK, filter, includeValues, includeDocuments } = req.body || {};
  if (typeof collName !== 'string' || !collName.trim()) {
    return res.status(400).json({ error: 'collection (string) is required', code: 'COLLECTION_REQUIRED' });
  }
  const c = collections.get(collName);
  if (!c) return res.status(404).json({ error: `collection '${collName}' not found`, code: 'COLLECTION_NOT_FOUND' });
  const verr = validateValues(query);
  if (verr) return res.status(400).json({ error: `query: ${verr}`, code: 'INVALID_QUERY' });
  if (query.length !== c.dimension) {
    return res.status(409).json({
      error: `query dimension ${query.length} does not match collection dimension ${c.dimension}`,
      code: 'DIMENSION_MISMATCH'
    });
  }
  const result = performSearch(c, query, { topK, filter, includeValues, includeDocuments });
  stats.totalSearches++;
  res.json({
    collection: collName,
    metric: c.metric,
    matches: result.matches,
    count: result.matches.length,
    took_ms: result.took_ms
  });
});

// ============ STATS ============

/**
 * GET /api/stats
 * Aggregate stats: collections, total vectors, per-collection counts, memory estimate.
 */
app.get('/api/stats', (req, res) => {
  let totalVectors = 0;
  let totalMemoryBytes = 0;
  const byCollection = [];
  for (const c of collections.values()) {
    let mem = 0;
    for (const v of c.vectors.values()) mem += estimateVectorBytes(v);
    totalVectors += c.vectors.size;
    totalMemoryBytes += mem;
    byCollection.push({ name: c.name, count: c.vectors.size, dimension: c.dimension, metric: c.metric, memoryBytes: mem });
  }
  res.json({
    collections: collections.size,
    vectors: totalVectors,
    byCollection,
    memoryEstimateKb: +(totalMemoryBytes / 1024).toFixed(2),
    counters: {
      totalCollectionsCreated: stats.totalCollectionsCreated,
      totalCollectionsDeleted: stats.totalCollectionsDeleted,
      totalVectorUpserts: stats.totalVectorUpserts,
      totalVectorDeletes: stats.totalVectorDeletes,
      totalSearches: stats.totalSearches,
      totalSearchesAudited: stats.totalSearchesAudited
    },
    auditEntries: auditLog.length,
    uptime: startedAt
  });
});

/**
 * POST /api/stats/reset
 * Reset all cumulative counters (does NOT delete collections or vectors).
 */
app.post('/api/stats/reset',requireAuth,  (req, res) => {
  stats.totalCollectionsCreated = 0;
  stats.totalCollectionsDeleted = 0;
  stats.totalVectorUpserts = 0;
  stats.totalVectorDeletes = 0;
  stats.totalSearches = 0;
  stats.totalSearchesAudited = 0;
  audit({ action: 'stats.reset', actor: principalOf(req), success: true });
  res.json({ message: 'stats reset', stats: { ...stats } });
});

// ============ AUDIT ============

/**
 * GET /api/audit?limit=100
 * Optional filters: ?action=, ?collection=
 */
app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  let list = auditLog;
  if (req.query.action) list = list.filter(e => e.action === req.query.action);
  if (req.query.collection) list = list.filter(e => e.collection === req.query.collection);
  // Return the most recent N
  const tail = list.slice(-limit);
  res.json({ count: list.length, returned: tail.length, entries: tail });
});

// ============ ERROR HANDLERS ============

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, code: 'ROUTE_NOT_FOUND' }));

app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
});

// ============ START ============
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  // TODO: In production, swap the in-memory Map for Redis or Postgres with pgvector
  //       and use an HNSW index for sub-millisecond nearest-neighbor lookup at scale.
  // TODO: Swap the bag-of-words vectorizer for a real embedding model
  //       (text-embedding-3-small, voyage-2, or a local sentence-transformers service).
  // TODO: Add per-tenant namespacing on every key.
  console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] default dim=${DEFAULT_DIM}, metrics=${Array.from(VALID_METRICS).join('|')}`);
});
installGracefulShutdown(server);
