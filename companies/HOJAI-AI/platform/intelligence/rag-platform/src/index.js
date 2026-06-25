/**
 * RTMN RAG Platform v1.0
 *
 * Retrieval-Augmented Generation framework for the RTMN ecosystem.
 * Ties together:
 *   - Vector DB (port 4780) — for storing/retrieving document embeddings
 *   - Inference Gateway (port 4770) — for LLM completion via /api/complete
 *
 * Pipeline:
 *   1. Document ingestion: chunk content → call vector-db /api/embed → upsert chunks
 *   2. RAG query: embed query → search top-k → assemble context → call inference-gateway
 *   3. Retrieval-only: embed query → search top-k (no LLM call)
 *
 * Design choices:
 *   - In-memory document registry (Map). Vector storage delegated to vector-db.
 *   - 128-dim embedding shared with vector-db and semantic-cache (FNV-1a bag-of-words).
 *   - Chunking: sentence-boundary-aware sliding window on characters.
 *   - Auto-creates vector-db collection (dim=128, cosine) on first ingestion.
 *   - Clean degradation: if either upstream is down, /api/health reports it.
 *
 * @author HOJAI AI - Data & Knowledge Cloud (Division 6)
 * @version 1.0.0
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.env.PORT, 10) || 4781;
const SERVICE_NAME = 'rag-platform';
const VERSION = '1.0.0';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'rag-platform-internal-token';
const REQUIRE_AUTH = (process.env.RAG_PLATFORM_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const NO_LISTEN = (process.env.RAG_PLATFORM_NO_LISTEN ?? '').toLowerCase() === 'true' || process.env.NODE_ENV === 'test';

const VECTOR_DB_URL = process.env.VECTOR_DB_URL || 'http://localhost:4780';
const INFERENCE_URL = process.env.INFERENCE_URL || 'http://localhost:4770';
const DEFAULT_CHUNK_SIZE = parseInt(process.env.DEFAULT_CHUNK_SIZE, 10) || 500;
const DEFAULT_CHUNK_OVERLAP = parseInt(process.env.DEFAULT_CHUNK_OVERLAP, 10) || 50;
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = parseFloat(process.env.DEFAULT_TEMPERATURE) || 0.3;
const DEFAULT_TOP_K = parseInt(process.env.DEFAULT_TOP_K, 10) || 5;

// ============================================================
// In-memory stores
// ============================================================

/** @type {Map<string, Document>} documentId → document */
const documents = new Map();

/** append-only audit log, cap 10000 (FIFO) */
const auditLog = [];

/** running counters */
const stats = {
  documentsIngested: 0,
  documentsDeleted: 0,
  totalChunksCreated: 0,
  queriesAnswered: 0,
  retrievalsOnly: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  errors: 0
};

/** mutable config */
const config = {
  vectorDbUrl: VECTOR_DB_URL,
  inferenceUrl: INFERENCE_URL,
  defaultChunkSize: DEFAULT_CHUNK_SIZE,
  defaultChunkOverlap: DEFAULT_CHUNK_OVERLAP,
  defaultModel: DEFAULT_MODEL,
  defaultTemperature: DEFAULT_TEMPERATURE,
  defaultTopK: DEFAULT_TOP_K
};

// ============================================================
// Upstream HTTP helper (built-in http module, no fetch/axios)
// ============================================================

/**
 * @param {string} host  hostname or "host:port"
 * @param {number} port
 * @param {string} method
 * @param {string} path
 * @param {object} [body]  JSON-serializable
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<{ status: number, body: any, headers: object }>}
 */
function httpJson(host, port, method, path, body, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const data = (body !== null && body !== undefined) ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host,
        port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        },
        timeout: timeoutMs
      },
      (res) => {
        let chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed = raw;
          const ct = res.headers['content-type'] || '';
          if (ct.includes('application/json') && raw) {
            try { parsed = JSON.parse(raw); } catch { parsed = raw; }
          }
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        });
      }
    );
    req.on('timeout', () => { req.destroy(new Error(`Request timed out after ${timeoutMs}ms`)); });
    req.on('error', (err) => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

/** convenience: parse "http://host:port" into {host, port} */
function parseUrl(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: parseInt(u.port, 10) || (u.protocol === 'https:' ? 443 : 80) };
  } catch (e) {
    return null;
  }
}

// ============================================================
// Chunking
// ============================================================

/**
 * Naive sentence tokenizer: splits on . ! ? followed by whitespace and capital letter,
 * OR newline. Good enough for English + code.
 * @param {string} text
 * @returns {string[]}
 */
function splitSentences(text) {
  if (!text) return [];
  // Protect common abbreviations
  const protectedText = text
    .replace(/\b(Mr|Mrs|Ms|Dr|St|Sr|Jr|vs|etc|e\.g|i\.e)\./gi, '$1<DOT>')
    .replace(/\b([A-Z])\.([A-Z])\.([A-Z])\./g, '$1<DOT>$2<DOT>$3<DOT>');
  // Split on sentence terminators
  const parts = protectedText.split(/(?<=[.!?])\s+|\n+/);
  return parts
    .map((p) => p.replace(/<DOT>/g, '.').trim())
    .filter((p) => p.length > 0);
}

/**
 * Build chunks from text using a sentence-boundary-aware sliding window.
 * @param {string} text
 * @param {number} chunkSize    target chars per chunk
 * @param {number} chunkOverlap chars to overlap
 * @returns {Array<{ text: string, start: number, end: number, chunkIndex: number }>}
 */
function chunkText(text, chunkSize, chunkOverlap) {
  if (!text || text.length === 0) return [];
  if (chunkSize <= 0) throw new Error('chunkSize must be > 0');
  if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
    throw new Error('chunkOverlap must be >= 0 and < chunkSize');
  }

  // If text is short, single chunk
  if (text.length <= chunkSize) {
    return [{ text, start: 0, end: text.length, chunkIndex: 0 }];
  }

  // Greedy packing: walk sentences, accumulate until chunkSize, emit, overlap by last N chars.
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return [{ text, start: 0, end: text.length, chunkIndex: 0 }];
  }

  const chunks = [];
  let buffer = '';
  let bufferStart = 0;
  let cursor = 0;
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const tentative = buffer.length === 0 ? s : buffer + ' ' + s;

    if (tentative.length > chunkSize && buffer.length > 0) {
      // Emit buffer
      const bufStart = cursor - buffer.length;
      chunks.push({
        text: buffer.trim(),
        start: bufStart,
        end: cursor,
        chunkIndex: chunkIndex++
      });

      // Build overlap from tail of buffer
      const overlapText = buffer.slice(Math.max(0, buffer.length - chunkOverlap));
      buffer = overlapText + (overlapText.length > 0 ? ' ' : '') + s;
      bufferStart = cursor - overlapText.length;
    } else {
      buffer = tentative;
      bufferStart = bufferStart === 0 && i === 0 ? cursor : bufferStart;
    }
    cursor += s.length + 1; // +1 for the space we added
  }

  if (buffer.trim().length > 0) {
    const bufStart = cursor - buffer.length;
    chunks.push({
      text: buffer.trim(),
      start: bufStart,
      end: cursor,
      chunkIndex: chunkIndex++
    });
  }

  return chunks;
}

// ============================================================
// Vector DB & Inference Gateway helpers
// ============================================================

async function ensureCollection(collectionName, dimension = 128) {
  const u = parseUrl(config.vectorDbUrl);
  if (!u) throw new Error('Invalid VECTOR_DB_URL');
  // Try create; if 409 already exists, that's fine
  const r = await httpJson(u.host, u.port, 'POST', '/api/collections',
    { name: collectionName, dimension, metric: 'cosine' }, 5000);
  if (r.status === 201) return { created: true, collection: r.body };
  if (r.status === 409) return { created: false, collection: collectionName };
  throw new Error(`vector-db create collection failed: ${r.status} ${JSON.stringify(r.body)}`);
}

async function embedText(text, dimension = 128) {
  const u = parseUrl(config.vectorDbUrl);
  if (!u) throw new Error('Invalid VECTOR_DB_URL');
  const r = await httpJson(u.host, u.port, 'POST', '/api/embed',
    { text, dimension }, 5000);
  if (r.status !== 200) {
    throw new Error(`vector-db embed failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body.vector;
}

async function upsertVector(collectionName, vectorId, values, metadata, document) {
  const u = parseUrl(config.vectorDbUrl);
  const r = await httpJson(u.host, u.port, 'POST',
    `/api/collections/${encodeURIComponent(collectionName)}/vectors`,
    { id: vectorId, values, metadata, document }, 5000);
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`vector-db upsert failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body;
}

async function searchCollection(collectionName, query, topK, filter) {
  const u = parseUrl(config.vectorDbUrl);
  const r = await httpJson(u.host, u.port, 'POST',
    `/api/collections/${encodeURIComponent(collectionName)}/search`,
    { query, topK, filter }, 10000);
  if (r.status !== 200) {
    throw new Error(`vector-db search failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body;
}

async function deleteVector(collectionName, vectorId) {
  const u = parseUrl(config.vectorDbUrl);
  const r = await httpJson(u.host, u.port, 'DELETE',
    `/api/collections/${encodeURIComponent(collectionName)}/vectors/${encodeURIComponent(vectorId)}`,
    null, 5000);
  return r.status === 200 || r.status === 404;
}

async function llmComplete({ model, messages, temperature, maxTokens, metadata }) {
  const u = parseUrl(config.inferenceUrl);
  const r = await httpJson(u.host, u.port, 'POST', '/api/complete', {
    model, messages, options: { temperature, maxTokens }, metadata
  }, 30000);
  if (r.status !== 200) {
    throw new Error(`inference-gateway complete failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body;
}

async function checkUpstreamHealth() {
  const results = { vectorDb: 'down', inferenceGateway: 'down' };
  try {
    const u = parseUrl(config.vectorDbUrl);
    const r = await httpJson(u.host, u.port, 'GET', '/api/health', null, 2000);
    if (r.status === 200) results.vectorDb = 'up';
  } catch (e) {
    // down
  }
  try {
    const u = parseUrl(config.inferenceUrl);
    const r = await httpJson(u.host, u.port, 'GET', '/api/health', null, 2000);
    if (r.status === 200) results.inferenceGateway = 'up';
  } catch (e) {
    // down
  }
  return results;
}

// ============================================================
// Helpers
// ============================================================

function principalOf(req) {
  return (
    req.headers['x-actor'] ||
    req.headers['x-principal'] ||
    req.headers['x-user-id'] ||
    (req.headers.authorization ? 'auth:' + req.headers.authorization.slice(0, 12) : 'anonymous')
  );
}

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

function publicDocumentView(doc, includeContent = false) {
  return {
    id: doc.id,
    collection: doc.collection,
    chunks: doc.chunks.map((c) => ({
      vectorId: c.vectorId,
      chunkIndex: c.chunkIndex,
      start: c.start,
      end: c.end
    })),
    chunkCount: doc.chunks.length,
    metadata: doc.metadata || {},
    createdAt: doc.createdAt,
    ...(includeContent ? { content: doc.content } : {})
  };
}

function determineConfidence(topScore) {
  if (topScore === undefined || topScore === null) return 'low';
  if (topScore >= 0.5) return 'high';
  if (topScore >= 0.2) return 'medium';
  return 'low';
}

function defaultSystemPrompt() {
  return 'You are HOJAI AI, a helpful assistant. Answer questions based only on the provided context. Be concise. If the context does not contain the answer, say so clearly.';
}

function buildContext(matches) {
  return matches
    .map((m, i) => `[Source ${i + 1}] ${m.document || '[no document text]'}`)
    .join('\n\n');
}

function buildUserPrompt(query, context) {
  return `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer using only the context above. If the context doesn't contain the answer, say so.`;
}

// ============================================================
// Auth
// ============================================================

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

const authOrBypass = (req, res, next) => REQUIRE_AUTH ? requireInternal(req, res, next) : next();

// ============================================================
// Express app
// ============================================================

const app = express();

app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '20mb' }));

// Top-level health redirect
app.get('/health', (req, res) => res.redirect(301, '/api/health'));

// ============ HEALTH ============

app.get('/api/health', async (req, res) => {
  const deps = await checkUpstreamHealth();
  const status = (deps.vectorDb === 'up' || deps.inferenceGateway === 'up') ? 'healthy' : 'degraded';
  res.json({
    status,
    service: SERVICE_NAME,
    port: PORT,
    version: VERSION,
    documents: documents.size,
    totalChunks: Array.from(documents.values()).reduce((s, d) => s + d.chunks.length, 0),
    uptime: process.uptime(),
    dependencies: deps,
    timestamp: new Date().toISOString()
  });
});

// ============ DOCUMENT INGESTION ============

/**
 * POST /api/documents
 * Body: { collection, documentId?, content, metadata?, chunkSize?, chunkOverlap? }
 */
app.post('/api/documents',authOrBypass,  async (req, res) => {
  const start = Date.now();
  const { collection, documentId, content, metadata, chunkSize, chunkOverlap } = req.body || {};
  if (typeof collection !== 'string' || !collection.trim()) {
    return res.status(400).json({ error: 'collection (string) is required', code: 'COLLECTION_REQUIRED' });
  }
  if (typeof content !== 'string' || content.length === 0) {
    return res.status(400).json({ error: 'content (non-empty string) is required', code: 'CONTENT_REQUIRED' });
  }
  const cs = chunkSize || config.defaultChunkSize;
  const co = chunkOverlap !== undefined ? chunkOverlap : config.defaultChunkOverlap;
  if (cs <= 0 || cs > 50000) {
    return res.status(400).json({ error: 'chunkSize must be 1..50000', code: 'INVALID_CHUNK_SIZE' });
  }
  if (co < 0 || co >= cs) {
    return res.status(400).json({ error: 'chunkOverlap must be >= 0 and < chunkSize', code: 'INVALID_CHUNK_OVERLAP' });
  }
  const docId = (typeof documentId === 'string' && documentId.trim()) ? documentId.trim() : uuidv4();
  if (documents.has(docId)) {
    return res.status(409).json({ error: `document '${docId}' already exists`, code: 'DOCUMENT_EXISTS' });
  }

  // 1. Chunk
  let chunks;
  try {
    chunks = chunkText(content, cs, co);
  } catch (e) {
    return res.status(400).json({ error: e.message, code: 'CHUNKING_FAILED' });
  }
  if (chunks.length === 0) {
    return res.status(400).json({ error: 'no chunks generated from content', code: 'NO_CHUNKS' });
  }

  // 2. Ensure collection exists
  try {
    await ensureCollection(collection, 128);
  } catch (e) {
    stats.errors += 1;
    return res.status(502).json({ error: 'failed to ensure collection: ' + e.message, code: 'VECTOR_DB_UNREACHABLE' });
  }

  // 3. Embed + upsert each chunk
  const chunkRecords = [];
  const vectorIds = [];
  try {
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const vectorId = `${docId}-chunk-${i}`;
      const chunkMetadata = {
        ...(metadata || {}),
        documentId: docId,
        chunkIndex: i,
        start: c.start,
        end: c.end
      };
      const vec = await embedText(c.text, 128);
      await upsertVector(collection, vectorId, vec, chunkMetadata, c.text);
      chunkRecords.push({ vectorId, chunkIndex: i, start: c.start, end: c.end });
      vectorIds.push(vectorId);
    }
  } catch (e) {
    stats.errors += 1;
    // Best-effort cleanup of partial chunks
    for (const vid of vectorIds) {
      try { await deleteVector(collection, vid); } catch {}
    }
    return res.status(502).json({ error: 'embedding/upsert failed: ' + e.message, code: 'EMBED_OR_UPSERT_FAILED' });
  }

  // 4. Save document record
  const doc = {
    id: docId,
    collection,
    content,
    chunks: chunkRecords,
    metadata: metadata || {},
    createdAt: new Date().toISOString()
  };
  documents.set(docId, doc);
  stats.documentsIngested += 1;
  stats.totalChunksCreated += chunks.length;

  audit({
    action: 'document.ingest',
    documentId: docId,
    collection,
    chunksCreated: chunks.length,
    contentLength: content.length,
    actor: principalOf(req),
    durationMs: Date.now() - start
  });

  res.status(201).json({
    documentId: docId,
    collection,
    chunksCreated: chunks.length,
    totalChunks: chunks.length,
    vectorIds,
    took_ms: Date.now() - start
  });
});

/**
 * GET /api/documents/:documentId?includeContent=true|false
 */
app.get('/api/documents/:documentId', (req, res) => {
  const doc = documents.get(req.params.documentId);
  if (!doc) return res.status(404).json({ error: `document '${req.params.documentId}' not found`, code: 'DOCUMENT_NOT_FOUND' });
  const includeContent = req.query.includeContent === 'true';
  res.json(publicDocumentView(doc, includeContent));
});

/**
 * DELETE /api/documents/:documentId
 */
app.delete('/api/documents/:documentId',authOrBypass,  async (req, res) => {
  const doc = documents.get(req.params.documentId);
  if (!doc) return res.status(404).json({ error: `document '${req.params.documentId}' not found`, code: 'DOCUMENT_NOT_FOUND' });

  const deleted = [];
  for (const c of doc.chunks) {
    try {
      await deleteVector(doc.collection, c.vectorId);
      deleted.push(c.vectorId);
    } catch (e) {
      // continue
    }
  }
  documents.delete(req.params.documentId);
  stats.documentsDeleted += 1;
  audit({
    action: 'document.delete',
    documentId: doc.id,
    collection: doc.collection,
    chunkVectorsDeleted: deleted.length,
    actor: principalOf(req)
  });
  res.json({ message: 'document deleted', documentId: doc.id, collection: doc.collection, chunkVectorsDeleted: deleted.length });
});

/**
 * GET /api/documents?collection=NAME
 */
app.get('/api/documents', (req, res) => {
  const coll = req.query.collection;
  const list = Array.from(documents.values())
    .filter((d) => !coll || d.collection === coll)
    .map((d) => publicDocumentView(d, false));
  res.json({ count: list.length, documents: list });
});

// ============ RETRIEVAL-ONLY ============

/**
 * POST /api/retrieve
 * Body: { collection, query, topK?, filter? }
 */
app.post('/api/retrieve',authOrBypass,  async (req, res) => {
  const start = Date.now();
  const { collection, query, topK, filter } = req.body || {};
  if (typeof collection !== 'string' || !collection.trim()) {
    return res.status(400).json({ error: 'collection (string) is required', code: 'COLLECTION_REQUIRED' });
  }
  if (typeof query !== 'string' || query.length === 0) {
    return res.status(400).json({ error: 'query (non-empty string) is required', code: 'QUERY_REQUIRED' });
  }
  const tk = topK || config.defaultTopK;

  let queryVec;
  try {
    queryVec = await embedText(query, 128);
  } catch (e) {
    stats.errors += 1;
    return res.status(502).json({ error: 'embed failed: ' + e.message, code: 'EMBED_FAILED' });
  }
  let result;
  try {
    result = await searchCollection(collection, queryVec, tk, filter);
  } catch (e) {
    stats.errors += 1;
    return res.status(502).json({ error: 'search failed: ' + e.message, code: 'SEARCH_FAILED' });
  }

  stats.retrievalsOnly += 1;
  audit({
    action: 'retrieve',
    collection,
    query: query.slice(0, 200),
    topK: tk,
    matchCount: result.matches ? result.matches.length : 0,
    actor: principalOf(req),
    durationMs: Date.now() - start
  });

  res.json({
    matches: result.matches || [],
    queryEmbedding: queryVec,
    took_ms: Date.now() - start
  });
});

// ============ RAG QUERY ============

/**
 * POST /api/rag/query
 * Body: { collection, query, topK?, filter?, systemPrompt?, model?, temperature?, maxTokens?, includeSources? }
 */
app.post('/api/rag/query',authOrBypass,  async (req, res) => {
  const start = Date.now();
  const {
    collection, query, topK, filter,
    systemPrompt, model, temperature, maxTokens,
    includeSources
  } = req.body || {};

  if (typeof collection !== 'string' || !collection.trim()) {
    return res.status(400).json({ error: 'collection (string) is required', code: 'COLLECTION_REQUIRED' });
  }
  if (typeof query !== 'string' || query.length === 0) {
    return res.status(400).json({ error: 'query (non-empty string) is required', code: 'QUERY_REQUIRED' });
  }

  const tk = topK || config.defaultTopK;
  const mdl = model || config.defaultModel;
  const temp = temperature !== undefined ? temperature : config.defaultTemperature;
  const sysPrompt = systemPrompt || defaultSystemPrompt();
  const wantSources = includeSources !== false; // default true

  // 1. Embed query
  let queryVec;
  try {
    queryVec = await embedText(query, 128);
  } catch (e) {
    stats.errors += 1;
    return res.status(502).json({ error: 'embed failed: ' + e.message, code: 'EMBED_FAILED' });
  }

  // 2. Search
  let result;
  try {
    result = await searchCollection(collection, queryVec, tk, filter);
  } catch (e) {
    stats.errors += 1;
    return res.status(502).json({ error: 'search failed: ' + e.message, code: 'SEARCH_FAILED' });
  }
  const matches = result.matches || [];

  // 3. Build context + prompt
  const context = buildContext(matches);
  const userPrompt = buildUserPrompt(query, context);

  // 4. Call LLM
  let completion;
  try {
    completion = await llmComplete({
      model: mdl,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: temp,
      maxTokens,
      metadata: { source: 'rag-platform', collection, queryLength: query.length, topK: tk }
    });
  } catch (e) {
    stats.errors += 1;
    return res.status(502).json({ error: 'LLM completion failed: ' + e.message, code: 'LLM_FAILED' });
  }

  stats.queriesAnswered += 1;
  stats.totalPromptTokens += completion.usage?.tokensIn || 0;
  stats.totalCompletionTokens += completion.usage?.tokensOut || 0;

  const topScore = matches.length > 0 ? matches[0].score : null;
  const confidence = determineConfidence(topScore);

  audit({
    action: 'rag.query',
    collection,
    query: query.slice(0, 200),
    topK: tk,
    matchCount: matches.length,
    topScore,
    model: completion.model,
    confidence,
    actor: principalOf(req),
    durationMs: Date.now() - start
  });

  const response = {
    answer: completion.text,
    model: completion.model,
    provider: completion.provider,
    usage: completion.usage || {},
    took_ms: Date.now() - start,
    confidence,
    matchCount: matches.length,
    topScore
  };
  if (wantSources) {
    response.sources = matches.map((m) => ({
      vectorId: m.id,
      score: m.score,
      document: m.document,
      metadata: m.metadata || {},
      chunkIndex: (m.metadata && m.metadata.chunkIndex) !== undefined ? m.metadata.chunkIndex : null
    }));
  }
  res.json(response);
});

/**
 * POST /api/rag/stream  (not yet implemented)
 */
app.post('/api/rag/stream',authOrBypass,  (req, res) => {
  res.status(501).json({
    error: 'NOT_IMPLEMENTED',
    message: 'Streaming responses are planned for v1.1. Use /api/rag/query for non-streaming.',
    status: 'planned'
  });
});

// ============ CONFIG ============

app.get('/api/config', (req, res) => res.json({ ...config }));

app.post('/api/config',authOrBypass,  (req, res) => {
  const { vectorDbUrl, inferenceUrl, defaultChunkSize, defaultChunkOverlap, defaultModel, defaultTemperature, defaultTopK } = req.body || {};
  if (vectorDbUrl !== undefined) {
    if (typeof vectorDbUrl !== 'string' || !vectorDbUrl.startsWith('http')) {
      return res.status(400).json({ error: 'vectorDbUrl must be a valid http(s) URL', code: 'INVALID_VECTOR_DB_URL' });
    }
    config.vectorDbUrl = vectorDbUrl;
  }
  if (inferenceUrl !== undefined) {
    if (typeof inferenceUrl !== 'string' || !inferenceUrl.startsWith('http')) {
      return res.status(400).json({ error: 'inferenceUrl must be a valid http(s) URL', code: 'INVALID_INFERENCE_URL' });
    }
    config.inferenceUrl = inferenceUrl;
  }
  if (defaultChunkSize !== undefined) {
    if (typeof defaultChunkSize !== 'number' || defaultChunkSize <= 0 || defaultChunkSize > 50000) {
      return res.status(400).json({ error: 'defaultChunkSize must be 1..50000', code: 'INVALID_CHUNK_SIZE' });
    }
    config.defaultChunkSize = defaultChunkSize;
  }
  if (defaultChunkOverlap !== undefined) {
    if (typeof defaultChunkOverlap !== 'number' || defaultChunkOverlap < 0 || defaultChunkOverlap >= config.defaultChunkSize) {
      return res.status(400).json({ error: 'defaultChunkOverlap must be >= 0 and < defaultChunkSize', code: 'INVALID_CHUNK_OVERLAP' });
    }
    config.defaultChunkOverlap = defaultChunkOverlap;
  }
  if (defaultModel !== undefined) {
    if (typeof defaultModel !== 'string' || !defaultModel.trim()) {
      return res.status(400).json({ error: 'defaultModel must be a non-empty string', code: 'INVALID_MODEL' });
    }
    config.defaultModel = defaultModel;
  }
  if (defaultTemperature !== undefined) {
    if (typeof defaultTemperature !== 'number' || defaultTemperature < 0 || defaultTemperature > 2) {
      return res.status(400).json({ error: 'defaultTemperature must be 0..2', code: 'INVALID_TEMPERATURE' });
    }
    config.defaultTemperature = defaultTemperature;
  }
  if (defaultTopK !== undefined) {
    if (typeof defaultTopK !== 'number' || defaultTopK <= 0 || defaultTopK > 100) {
      return res.status(400).json({ error: 'defaultTopK must be 1..100', code: 'INVALID_TOPK' });
    }
    config.defaultTopK = defaultTopK;
  }
  audit({ action: 'config.update', config: { ...config }, actor: principalOf(req) });
  res.json({ message: 'config updated', config: { ...config } });
});

// ============ STATS & AUDIT ============

app.get('/api/stats', (req, res) => {
  const byCollection = {};
  for (const d of documents.values()) {
    if (!byCollection[d.collection]) byCollection[d.collection] = { documents: 0, chunks: 0 };
    byCollection[d.collection].documents += 1;
    byCollection[d.collection].chunks += d.chunks.length;
  }
  res.json({
    ...stats,
    byCollection,
    totalDocuments: documents.size,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/stats/reset',authOrBypass,  (req, res) => {
  const old = { ...stats };
  stats.queriesAnswered = 0;
  stats.retrievalsOnly = 0;
  stats.totalPromptTokens = 0;
  stats.totalCompletionTokens = 0;
  stats.errors = 0;
  res.json({ message: 'query counters reset', previous: old });
});

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  const action = req.query.action;
  let entries = auditLog.slice();
  if (action) entries = entries.filter((e) => e.action === action);
  entries.reverse();
  res.json({ count: entries.length, entries: entries.slice(0, limit) });
});

// ============ READINESS ============

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ============ 404 & ERRORS ============

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }));
app.use((err, _req, res, _next) => {
  console.error(`[${SERVICE_NAME}] Unhandled error:`, err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// ============ START ============

if (require.main === module && !NO_LISTEN) {
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
    console.log(`[${SERVICE_NAME}] health: http://localhost:${PORT}/api/health`);
    console.log(`[${SERVICE_NAME}] vector-db: ${VECTOR_DB_URL}`);
    console.log(`[${SERVICE_NAME}] inference: ${INFERENCE_URL}`);
    console.log(`[${SERVICE_NAME}] defaults: chunk=${DEFAULT_CHUNK_SIZE}/${DEFAULT_CHUNK_OVERLAP} model=${DEFAULT_MODEL} temp=${DEFAULT_TEMPERATURE} topK=${DEFAULT_TOP_K}`);
  });

  process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
  process.on('SIGINT',  () => { server.close(() => process.exit(0)); });
}

module.exports = app;
module.exports.app = app;
module.exports.PORT = PORT;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.VERSION = VERSION;
module.exports.REQUIRE_AUTH = REQUIRE_AUTH;
module.exports.documents = documents;
module.exports.stats = stats;
module.exports.auditLog = auditLog;
module.exports.config = config;
module.exports.chunkText = chunkText;
module.exports.splitSentences = splitSentences;
module.exports.buildContext = buildContext;
module.exports.buildUserPrompt = buildUserPrompt;
module.exports.authOrBypass = authOrBypass;
module.exports.requireInternal = requireInternal;
