/**
 * studio-rag — RAG (Retrieval-Augmented Generation) configurator
 * Port: 4906
 *
 * A RAG pipeline has:
 * - knowledge_base: collection of documents with metadata
 * - chunking: {strategy, chunk_size, chunk_overlap, separator}
 * - embeddings: {model, dimension}
 * - retrieval: {strategy: 'vector'|'bm25'|'hybrid', top_k, score_threshold, rerank}
 * - generation: {model, prompt_template, max_tokens}
 *
 * Endpoints:
 * - /knowledge-bases: CRUD for KBs
 * - /knowledge-bases/:id/documents: add/list/delete documents
 * - /query: search a KB (mock semantic + BM25)
 *
 * Storage: $DATA_DIR/rag.json (knowledge_bases, documents, queries)
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4906', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'studio-internal-token';

const RAG_FILE = path.join(DATA_DIR, 'rag.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RAG_FILE)) fs.writeFileSync(RAG_FILE, JSON.stringify({ knowledge_bases: {}, name_to_id: {}, documents: {}, queries: [] }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(RAG_FILE, 'utf8')); } catch (_) { return { knowledge_bases: {}, name_to_id: {}, documents: {}, queries: [] }; } }
function saveAll(d) { const tmp = RAG_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, RAG_FILE); }

function findKB(data, idOrName) {
  if (data.knowledge_bases[idOrName]) return data.knowledge_bases[idOrName];
  const id = data.name_to_id[idOrName];
  if (id && data.knowledge_bases[id]) return data.knowledge_bases[id];
  return null;
}

const VALID_CHUNK_STRATEGIES = ['fixed', 'sentence', 'paragraph', 'semantic', 'sliding'];
const VALID_RETRIEVAL_STRATEGIES = ['vector', 'bm25', 'hybrid'];
const VALID_EMBEDDING_MODELS = ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002', 'cohere-embed-v3', 'voyage-2'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// Mock semantic + BM25 search: returns top-k documents with scores
function mockSearch(query, documents, kb, topK) {
  const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were', 'will', 'with']);
  const qTokens = query.toLowerCase().split(/\s+/).filter((t) => t && !STOPWORDS.has(t));
  const results = [];
  for (const doc of documents) {
    const text = (doc.title + ' ' + doc.content).toLowerCase();
    const tokens = text.split(/\s+/).filter(Boolean);
    // BM25-lite (skip stopwords)
    let score = 0;
    for (const qt of qTokens) {
      const tf = tokens.filter((t) => t === qt).length;
      if (tf > 0) score += 1 + Math.log(1 + tf);
    }
    // Title bonus
    if (doc.title && qTokens.some(qt => doc.title.toLowerCase().includes(qt))) score += 2;
    if (score > 0) {
      results.push({
        document_id: doc.id,
        title: doc.title,
        score: parseFloat(score.toFixed(4)),
        snippet: doc.content.slice(0, 200),
        chunk_index: 0
      });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

function validateKB(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name || typeof body.name !== 'string') return 'name required';
  if (body.chunking !== undefined) {
    if (!body.chunking.strategy) return 'chunking.strategy required if chunking provided';
    if (!VALID_CHUNK_STRATEGIES.includes(body.chunking.strategy)) return `invalid chunking strategy: ${body.chunking.strategy}`;
    if (body.chunking.chunk_size !== undefined && body.chunking.chunk_size < 50) return 'chunk_size must be >= 50';
  }
  if (body.embeddings !== undefined && body.embeddings.model && !VALID_EMBEDDING_MODELS.includes(body.embeddings.model)) {
    return `invalid embedding model: ${body.embeddings.model}`;
  }
  if (body.retrieval !== undefined) {
    if (body.retrieval.strategy && !VALID_RETRIEVAL_STRATEGIES.includes(body.retrieval.strategy)) {
      return `invalid retrieval strategy: ${body.retrieval.strategy}`;
    }
    if (body.retrieval.top_k !== undefined && (body.retrieval.top_k < 1 || body.retrieval.top_k > 100)) {
      return 'top_k must be 1-100';
    }
  }
  return null;
}

function validateDocument(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.title || typeof body.title !== 'string') return 'title required';
  if (!body.content || typeof body.content !== 'string') return 'content required';
  if (body.content.length > 5_000_000) return 'content too large (5MB max)';
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => res.json({
    ok: true, service: 'studio-rag', port: PORT,
    chunk_strategies: VALID_CHUNK_STRATEGIES,
    retrieval_strategies: VALID_RETRIEVAL_STRATEGIES,
    embedding_models: VALID_EMBEDDING_MODELS
  }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Capabilities
  app.get('/capabilities', requireInternal, (_req, res) => {
    res.json({
      chunk_strategies: VALID_CHUNK_STRATEGIES,
      retrieval_strategies: VALID_RETRIEVAL_STRATEGIES,
      embedding_models: VALID_EMBEDDING_MODELS
    });
  });

  // ----- Knowledge Bases -----

  // Create KB
  app.post('/knowledge-bases', requireInternal, (req, res) => {
    const err = validateKB(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { name, description = '', project_id, user_id, chunking = {}, embeddings = {}, retrieval = {}, generation = {} } = req.body;
    if (!project_id) return res.status(400).json({ error: 'validation', message: 'project_id required' });
    if (!user_id) return res.status(400).json({ error: 'validation', message: 'user_id required' });
    const data = loadAll();
    if (data.name_to_id[name]) return res.status(409).json({ error: 'conflict', message: `KB ${name} exists` });
    const kb = {
      id: newId('kb'),
      name,
      description,
      project_id,
      user_id,
      chunking: {
        strategy: 'fixed',
        chunk_size: 512,
        chunk_overlap: 50,
        ...chunking
      },
      embeddings: {
        model: 'text-embedding-3-small',
        dimension: 1536,
        ...embeddings
      },
      retrieval: {
        strategy: 'vector',
        top_k: 5,
        score_threshold: 0.0,
        rerank: false,
        ...retrieval
      },
      generation: {
        model: 'gpt-4',
        prompt_template: 'Answer based on context: {{context}}\n\nQuestion: {{query}}',
        max_tokens: 1024,
        ...generation
      },
      document_count: 0,
      status: 'active',
      created_at: nowIso(),
      updated_at: nowIso()
    };
    data.knowledge_bases[kb.id] = kb;
    data.name_to_id[name] = kb.id;
    saveAll(data);
    res.status(201).json(kb);
  });

  // List KBs
  app.get('/knowledge-bases', requireInternal, (req, res) => {
    const data = loadAll();
    const seen = new Set();
    const items = [];
    for (const kb of Object.values(data.knowledge_bases)) {
      if (!kb.id || seen.has(kb.id)) continue;
      seen.add(kb.id);
      if (req.query.project_id && kb.project_id !== req.query.project_id) continue;
      if (req.query.user_id && kb.user_id !== req.query.user_id) continue;
      items.push(kb);
    }
    res.json({ count: items.length, knowledge_bases: items });
  });

  // Get KB by id or name
  app.get('/knowledge-bases/:idOrName', requireInternal, (req, res) => {
    const data = loadAll();
    const kb = findKB(data, req.params.idOrName);
    if (!kb) return res.status(404).json({ error: 'not_found' });
    res.json(kb);
  });

  // Update KB
  app.put('/knowledge-bases/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const kb = data.knowledge_bases[req.params.id];
    if (!kb) return res.status(404).json({ error: 'not_found' });
    const err = validateKB({ ...kb, ...req.body });
    if (err) return res.status(400).json({ error: 'validation', message: err });
    ['description', 'chunking', 'embeddings', 'retrieval', 'generation', 'status'].forEach((k) => {
      if (req.body[k] !== undefined) {
        if (['chunking', 'embeddings', 'retrieval', 'generation'].includes(k)) {
          kb[k] = { ...kb[k], ...req.body[k] };
        } else {
          kb[k] = req.body[k];
        }
      }
    });
    kb.updated_at = nowIso();
    saveAll(data);
    res.json(kb);
  });

  // Delete KB
  app.delete('/knowledge-bases/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const kb = data.knowledge_bases[req.params.id];
    if (!kb) return res.status(404).json({ error: 'not_found' });
    delete data.knowledge_bases[kb.id];
    delete data.name_to_id[kb.name];
    // Also delete documents in this KB
    for (const [docId, doc] of Object.entries(data.documents)) {
      if (doc.knowledge_base_id === kb.id) delete data.documents[docId];
    }
    saveAll(data);
    res.json({ deleted: true, knowledge_base_id: req.params.id });
  });

  // ----- Documents -----

  // Add document to KB
  app.post('/knowledge-bases/:idOrName/documents', requireInternal, (req, res) => {
    const err = validateDocument(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const kb = findKB(data, req.params.idOrName);
    if (!kb) return res.status(404).json({ error: 'not_found', message: 'KB not found' });
    const { title, content, source_url = '', metadata = {} } = req.body;
    const doc = {
      id: newId('doc'),
      knowledge_base_id: kb.id,
      knowledge_base_name: kb.name,
      title,
      content,
      source_url,
      metadata,
      chunk_count: Math.max(1, Math.ceil(content.length / (kb.chunking.chunk_size || 512))),
      indexed: true,
      indexed_at: nowIso(),
      created_at: nowIso()
    };
    data.documents[doc.id] = doc;
    kb.document_count = (kb.document_count || 0) + 1;
    kb.updated_at = nowIso();
    saveAll(data);
    res.status(201).json(doc);
  });

  // List documents in KB
  app.get('/knowledge-bases/:idOrName/documents', requireInternal, (req, res) => {
    const data = loadAll();
    const kb = findKB(data, req.params.idOrName);
    if (!kb) return res.status(404).json({ error: 'not_found' });
    const docs = Object.values(data.documents).filter((d) => d.knowledge_base_id === kb.id);
    res.json({ count: docs.length, documents: docs });
  });

  // Get document
  app.get('/documents/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const doc = data.documents[req.params.id];
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json(doc);
  });

  // Delete document
  app.delete('/documents/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const doc = data.documents[req.params.id];
    if (!doc) return res.status(404).json({ error: 'not_found' });
    const kb = data.knowledge_bases[doc.knowledge_base_id];
    delete data.documents[req.params.id];
    if (kb) {
      kb.document_count = Math.max(0, (kb.document_count || 0) - 1);
      kb.updated_at = nowIso();
    }
    saveAll(data);
    res.json({ deleted: true, document_id: req.params.id });
  });

  // ----- Query -----

  // Query a KB
  app.post('/knowledge-bases/:idOrName/query', requireInternal, (req, res) => {
    const { query, top_k, user_id = 'anonymous' } = req.body || {};
    if (!query || typeof query !== 'string') return res.status(400).json({ error: 'validation', message: 'query required' });
    const data = loadAll();
    const kb = findKB(data, req.params.idOrName);
    if (!kb) return res.status(404).json({ error: 'not_found' });
    const k = top_k || kb.retrieval.top_k || 5;
    const docs = Object.values(data.documents).filter((d) => d.knowledge_base_id === kb.id);
    const results = mockSearch(query, docs, kb, k);
    const q = {
      id: newId('q'),
      knowledge_base_id: kb.id,
      user_id,
      query,
      result_count: results.length,
      results,
      created_at: nowIso()
    };
    data.queries.push(q);
    if (data.queries.length > 10000) data.queries = data.queries.slice(-10000);
    saveAll(data);
    res.json(q);
  });

  // List query history
  app.get('/queries', requireInternal, (req, res) => {
    const data = loadAll();
    let items = data.queries.slice().reverse();
    if (req.query.knowledge_base_id) items = items.filter((q) => q.knowledge_base_id === req.query.knowledge_base_id);
    if (req.query.user_id) items = items.filter((q) => q.user_id === req.query.user_id);
    const limit = parseInt(req.query.limit || '50', 10);
    items = items.slice(0, Math.min(limit, 200));
    res.json({ count: items.length, queries: items });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[studio-rag] listening on :${PORT}`));
}

module.exports = { createApp, VALID_CHUNK_STRATEGIES, VALID_RETRIEVAL_STRATEGIES, VALID_EMBEDDING_MODELS, mockSearch };
