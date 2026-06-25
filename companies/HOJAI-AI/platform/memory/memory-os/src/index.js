import helmet from 'helmet';
import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { v4 as uuidv4 } from 'uuid';
import persistence from './persistence.js';
import embedClient from './embed-client.js';
import { requireAuthMw, requireAuth, getRequireAuth, setRequireAuth } from './auth.js';

/**
 * MemoryOS - The Universal Memory Layer
 *
 * One of the 3 foundational pillars of HOJAI AI:
 *   - TwinOS   = Identity & Representation Layer ("What am I?")
 *   - MemoryOS = Knowledge & Experience Layer  ("What do I know?")
 *   - SkillOS  = Capability Layer              ("What can I do?")
 *
 * Port: 4703
 *
 * Storage: MongoDB (with in-process Map fallback when MONGODB_URI is unset/unreachable).
 * Embeddings: vector-db (port 4780) — auto-embed on write, vector similarity on search.
 *
 * Phase 1+2 (June 21, 2026):
 *   - MongoDB persistence (graceful fallback)
 *   - Embedding integration with vector-db
 *   - Hybrid search: keyword + semantic
 */

const app = express();

const PORT = process.env.PORT || 4703;
const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(express.json({ limit: '2mb' }));

app.use(helmet());

// JWT auth via CorpID (off by default; set REQUIRE_AUTH=true to enforce).
// `requireAuthMw` is used as both the global middleware and the per-route
// guard — it's the same function. The actual CorpID-backed middleware lives
// in @rtmn/shared/auth; ./auth is just a thin shim that picks the public paths.
app.use(requireAuthMw);

// =============================================================================
// IN-MEMORY STORES (write-through cache; durable copy in MongoDB)
// =============================================================================

const memories = new PersistentMap('memories', { serviceName: 'memory-os' });          // id -> memory record
const knowledgeGraph = new PersistentMap('knowledge-graph', { serviceName: 'memory-os' });    // entity id -> { type, links: [{ to, rel }] }
const timelines = new PersistentMap('timelines', { serviceName: 'memory-os' });         // twinId -> [memory ids chronologically]
const summaries = new PersistentMap('summaries', { serviceName: 'memory-os' });         // id -> summary
const sharingPolicies = new PersistentMap('sharing-policies', { serviceName: 'memory-os' });   // memoryId -> [policies]
const workingMemory = new PersistentMap('working-memory', { serviceName: 'memory-os' });     // twinId -> working memory
const longTermMemory = new PersistentMap('long-term-memory', { serviceName: 'memory-os' });    // twinId -> long-term entries
const accessLog = [];                // privacy audit log
const historyStore = new PersistentMap('history-store', { serviceName: 'memory-os' });      // memoryId -> [{ version, snapshot, changedAt }]
const contradictions = new PersistentMap('contradictions', { serviceName: 'memory-os' });    // memoryId -> [{ amount, reason, ts }]

// =============================================================================
// WRITE-THROUGH HELPERS (Map + Mongo + optional embed)
// =============================================================================

async function persistMemory(m) {
  memories.set(m.id, m);
  if (persistence.isUsingMongo()) {
    try { await persistence.memoryInsert(m); } catch (e) { console.warn('persistMemory mongo failed', e.message); }
  }
  embedAndStore(m).catch(() => { /* silent */ });
}

async function embedAndStore(m) {
  try {
    const text = `${m.content || ''} ${(m.tags || []).join(' ')}`.trim();
    if (!text) return;
    const vec = await embedClient.embed(text);
    if (!vec) return;
    const up = await embedClient.upsert({
      id: m.id,
      values: vec,
      metadata: { twinId: m.twinId, type: m.type, kind: m.kind, importance: m.importance },
      document: text.slice(0, 1000),
    });
    if (up && (up.id || up.vectorId)) {
      const vectorId = up.id || up.vectorId;
      m.vectorId = vectorId;
      m.embeddedAt = new Date().toISOString();
      if (persistence.isUsingMongo()) {
        await persistence.memoryAddEmbeddingId(m.id, vectorId);
      }
    }
  } catch (e) {
    // Never block writes on embedding failure
  }
}

async function persistMemoryUpdate(m) {
  memories.set(m.id, m);
  if (persistence.isUsingMongo()) {
    try { await persistence.memoryReplace(m); } catch (e) { console.warn('persistMemoryUpdate mongo failed', e.message); }
  }
}

async function persistMemoryDelete(id) {
  memories.delete(id);
  historyStore.delete(id);
  contradictions.delete(id);
  if (persistence.isUsingMongo()) {
    try { await persistence.memoryDelete(id); } catch (e) { console.warn('persistMemoryDelete mongo failed', e.message); }
  }
}

async function persistTimelineAppend(twinId, memoryId) {
  if (!timelines.has(twinId)) timelines.set(twinId, []);
  timelines.get(twinId).push(memoryId);
  if (persistence.isUsingMongo()) {
    try { await persistence.timelineAppend(twinId, memoryId); } catch (e) { /* ignore */ }
  }
}

async function persistHistory(memoryId, entry) {
  // NOTE: in-memory push is the caller's responsibility (see recordHistory).
  // This function only writes to Mongo. Pushing here too caused duplicate
  // history entries and double-incremented version numbers (1,3,5,7 instead of 1,2,3,4).
  if (persistence.isUsingMongo()) {
    try { await persistence.historyInsert(memoryId, entry); } catch (e) { /* ignore */ }
  }
}

async function persistAudit(entry) {
  accessLog.push(entry);
  if (accessLog.length > 5000) accessLog.shift();
  if (persistence.isUsingMongo()) {
    try { await persistence.auditAppend(entry); } catch (e) { /* ignore */ }
  }
}

async function persistKGNode(node) {
  knowledgeGraph.set(node.id, node);
  if (persistence.isUsingMongo()) {
    try { await persistence.kgNodeUpsert(node); } catch (e) { /* ignore */ }
  }
}

async function persistKGUpdateLinks(id, links) {
  const n = knowledgeGraph.get(id);
  if (n) n.links = links;
  if (persistence.isUsingMongo()) {
    try { await persistence.kgNodeUpdateLinks(id, links); } catch (e) { /* ignore */ }
  }
}

async function persistWorking(twinId, wm) {
  workingMemory.set(twinId, wm);
  if (persistence.isUsingMongo()) {
    try { await persistence.workingSet(twinId, wm); } catch (e) { /* ignore */ }
  }
}

async function persistLongtermAppend(twinId, entry) {
  if (!longTermMemory.has(twinId)) longTermMemory.set(twinId, []);
  longTermMemory.get(twinId).push(entry);
  if (persistence.isUsingMongo()) {
    try { await persistence.longtermAppend(twinId, entry); } catch (e) { /* ignore */ }
  }
}

async function persistSummary(summary) {
  summaries.set(summary.id, summary);
  if (persistence.isUsingMongo()) {
    try { await persistence.summaryInsert(summary); } catch (e) { /* ignore */ }
  }
}

async function persistSharingAppend(memoryId, policy) {
  if (!sharingPolicies.has(memoryId)) sharingPolicies.set(memoryId, []);
  sharingPolicies.get(memoryId).push(policy);
  if (persistence.isUsingMongo()) {
    try { await persistence.sharingAppend(memoryId, policy); } catch (e) { /* ignore */ }
  }
}

async function persistContradictionAppend(memoryId, entry) {
  if (!contradictions.has(memoryId)) contradictions.set(memoryId, []);
  contradictions.get(memoryId).push(entry);
  if (persistence.isUsingMongo()) {
    try { await persistence.contradictionAppend(memoryId, entry); } catch (e) { /* ignore */ }
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function nowIso() { return new Date().toISOString(); }
function ok(res, data) { res.json({ success: true, ...data }); }
function fail(res, code, message, status = 400) { res.status(status).json({ success: false, error: code, message }); }
function log(memoryId, op, principal = 'anonymous') {
  const entry = { id: uuidv4(), memoryId, op, principal, ts: nowIso() };
  persistAudit(entry).catch(() => { /* swallow */ });
}

// =============================================================================
// VOCABULARY & VALIDATION
// =============================================================================

const ALLOWED_TYPES = [
  'identity', 'preference', 'knowledge', 'experience', 'relationship',
  'conversation', 'decision', 'event', 'workflow', 'goal',
  'financial', 'shopping', 'health', 'learning', 'ai'
];

const ALLOWED_IMPORTANCE = ['Critical', 'High', 'Medium', 'Low', 'Temporary'];
const ALLOWED_LIFECYCLE = [
  'created', 'captured', 'indexed', 'connected', 'learned',
  'recalled', 'summarized', 'archived', 'deleted'
];
const DEFAULT_RETENTION_DAYS = 90;

function isValidType(t) { return ALLOWED_TYPES.includes(t); }
function isValidImportance(i) { return ALLOWED_IMPORTANCE.includes(i); }
function isValidLifecycle(s) { return ALLOWED_LIFECYCLE.includes(s); }

function isExpired(m) {
  if (!m || !m.expiresAt) return false;
  return new Date(m.expiresAt).getTime() <= Date.now();
}

function dayKey(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}

function snapshotMemory(m) {
  return {
    content: m.content,
    tags: JSON.parse(JSON.stringify(m.tags || [])),
    visibility: m.visibility,
    type: m.type,
    kind: m.kind,
    importance: m.importance,
    lifecycleStage: m.lifecycleStage,
    metadata: JSON.parse(JSON.stringify(m.metadata || {})),
    ttl: m.ttl || null,
    expiresAt: m.expiresAt || null,
    confidence: m.confidence ?? 0.5
  };
}

function recordHistory(m) {
  if (!historyStore.has(m.id)) historyStore.set(m.id, []);
  const list = historyStore.get(m.id);
  const entry = {
    version: list.length + 1,
    snapshot: snapshotMemory(m),
    changedAt: nowIso()
  };
  list.push(entry);
  m.version = list.length;
  persistHistory(m.id, entry).catch(() => { /* ignore */ });
}

function computeDecay(m) {
  const baseline = 0.005;
  const last = m.accessedAt ? new Date(m.accessedAt).getTime() : new Date(m.createdAt).getTime();
  const days = Math.max(0, (Date.now() - last) / (1000 * 60 * 60 * 24));
  const decay = days * baseline;
  const current = m.confidence ?? 0.5;
  return Math.max(0, Math.min(1, current - decay));
}

function checkExpiredOrFail(m, res) {
  if (isExpired(m)) {
    log(m.id, 'gone');
    fail(res, 'GONE', 'memory expired', 410);
    return true;
  }
  return false;
}

// =============================================================================
// HEALTH + INFO
// =============================================================================

// Test helper: toggle auth on/off at runtime
app.get('/api/auth/toggle', (req, res) => {
  const on = req.query.on === 'true';
  setRequireAuth(on);
  ok(res, { requireAuth: on, message: `Auth is now ${on ? 'REQUIRED' : 'disabled (dev mode)'}` });
});

app.get('/', (_req, res) => ok(res, {
  service: 'memory-os',
  version: '2.1.0',
  port: PORT,
  description: 'HOJAI AI MemoryOS - The Knowledge & Experience Layer ("What do I know?")',
  pillars: ['TwinOS (4705)', 'MemoryOS (4703)', 'SkillOS (4743)'],
  features: 18,
  storage: {
    mongodb: persistence.isUsingMongo() ? 'connected' : 'in-memory (fallback)',
    vectorDb: embedClient.VECTOR_DB_URL,
  },
  capabilities: [
    'crud', 'search-keyword', 'search-semantic', 'search-hybrid', 'search-timeline',
    'knowledge-graph', 'working-memory', 'long-term-memory', 'summarization',
    'versioning', 'history', 'revert', 'lifecycle-transitions',
    'confidence-strengthen-weaken', 'smart-forgetting',
    'sharing-policies', 'audit-log', 'analytics'
  ]
}));

app.get('/health', (_req, res) => ok(res, {
  status: 'healthy',
  service: 'MemoryOS',
  port: PORT,
  version: '2.1.0',
  storage: {
    mongodb: persistence.isUsingMongo() ? 'connected' : 'fallback',
    vectorDb: embedClient.VECTOR_DB_URL,
  },
  stats: {
    memories: memories.size,
    knowledgeGraph: knowledgeGraph.size,
    timelines: timelines.size,
    summaries: summaries.size,
    workingMemory: workingMemory.size,
    longTermMemory: longTermMemory.size,
    accessLog: accessLog.length
  },
  timestamp: nowIso()
}));

// =============================================================================
// CORE: Memory CRUD
// =============================================================================

app.post('/api/memories',requireAuth,  async (req, res) => {
  const {
    twinId, type = 'general', content, tags = [], visibility = 'private', metadata = {},
    importance = 'Medium', ttl, lifecycleStage, confidence
  } = req.body || {};
  if (!twinId || !content) return fail(res, 'INVALID_INPUT', 'twinId and content required');
  if (!isValidType(type)) {
    return fail(res, 'INVALID_TYPE', `type must be one of: ${ALLOWED_TYPES.join(', ')}`);
  }
  if (!isValidImportance(importance)) {
    return fail(res, 'INVALID_IMPORTANCE', `importance must be one of: ${ALLOWED_IMPORTANCE.join(', ')}`);
  }
  const stage = lifecycleStage || 'created';
  if (!isValidLifecycle(stage)) {
    return fail(res, 'INVALID_LIFECYCLE', `lifecycleStage must be one of: ${ALLOWED_LIFECYCLE.join(', ')}`);
  }
  const id = uuidv4();
  let expiresAt = null;
  if (ttl) {
    const d = new Date(ttl);
    if (!isNaN(d.getTime())) expiresAt = d.toISOString();
  }
  const m = {
    id, twinId, type, content, tags, visibility, metadata,
    kind: metadata.kind || 'long-term',
    importance,
    lifecycleStage: stage,
    version: 1,
    confidence: typeof confidence === 'number' ? Math.max(0, Math.min(1, confidence)) : 0.5,
    ttl: ttl || null,
    expiresAt,
    contradictions: 0,
    accessCount: 0,
    createdAt: nowIso(), updatedAt: nowIso()
  };
  await persistMemory(m);
  await persistTimelineAppend(twinId, id);
  recordHistory(m);
  log(id, 'create');
  res.status(201).json({ success: true, data: m });
});

// IMPORTANT: Specific routes must come BEFORE /api/memories/:id
app.get('/api/memories/search', async (req, res) => {
  const { q, twinId, mode = 'keyword', from, to, limit = 25 } = req.query;
  if (!q) return fail(res, 'INVALID_INPUT', 'q required');

  const twinFilter = twinId ? { twinId } : {};
  const dateFilter = {};
  if (from) dateFilter.createdAt = { ...(dateFilter.createdAt || {}), $gte: from };
  if (to) dateFilter.createdAt = { ...(dateFilter.createdAt || {}), $lte: to };

  // Try Mongo first if available, fall back to Map
  let pool = [];
  if (persistence.isUsingMongo()) {
    const r = await persistence.memoryList({ ...twinFilter, ...dateFilter }, { limit: 5000 });
    if (r) pool = r.list;
  }
  if (pool.length === 0) {
    pool = Array.from(memories.values());
    if (twinId) pool = pool.filter(m => m.twinId === twinId);
    if (from) pool = pool.filter(m => m.createdAt >= from);
    if (to) pool = pool.filter(m => m.createdAt <= to);
  }

  const needle = String(q).toLowerCase();

  // Score with keyword
  const kwScored = pool.map(m => {
    const hay = `${m.content || ''} ${(m.tags || []).join(' ')} ${m.type || ''}`.toLowerCase();
    let score = 0;
    needle.split(/\s+/).forEach(w => { if (w && hay.includes(w)) score += 1; });
    return { m, kwScore: score };
  });
  const keywordHits = kwScored.filter(s => s.kwScore > 0);
  const maxKw = Math.max(1, ...keywordHits.map(s => s.kwScore));

  // Score with semantic (vector)
  let semHits = new PersistentMap('sem-hits', { serviceName: 'memory-os' }); // id -> semantic score
  if (mode === 'semantic' || mode === 'hybrid') {
    const semRes = await embedClient.searchByText({ text: q, topK: 50 });
    if (semRes && Array.isArray(semRes.results || semRes.matches)) {
      for (const r of (semRes.results || semRes.matches)) {
        semHits.set(r.id, r.score || r.similarity || 0);
      }
    } else if (semRes && semRes.id) {
      semHits.set(semRes.id, semRes.score || 0);
    }
  }

  // Combine
  let combined = [];
  if (mode === 'semantic') {
    combined = Array.from(semHits.entries())
      .map(([id, semScore]) => {
        const m = pool.find(x => x.id === id);
        return m ? { m, score: semScore } : null;
      })
      .filter(Boolean);
  } else if (mode === 'hybrid') {
    const allIds = new Set([...keywordHits.map(s => s.m.id), ...semHits.keys()]);
    combined = Array.from(allIds).map(id => {
      const m = pool.find(x => x.id === id);
      if (!m) return null;
      const kw = (keywordHits.find(s => s.m.id === id)?.kwScore || 0) / maxKw;
      const sem = semHits.get(id) || 0;
      return { m, score: 0.3 * kw + 0.7 * sem };
    }).filter(Boolean);
  } else if (mode === 'timeline') {
    combined = pool.map(m => ({ m, score: 0 })).sort((a, b) => b.m.createdAt.localeCompare(a.m.createdAt));
  } else if (mode === 'similarity') {
    combined = keywordHits.map(s => {
      const sa = jaccard(s.m.tags || [], needle.split(/\s+/));
      return { m: s.m, score: sa + s.kwScore * 0.5 };
    }).sort((a, b) => b.score - a.score);
  } else {
    // keyword (default)
    combined = keywordHits.map(s => ({ m: s.m, score: s.kwScore })).sort((a, b) => b.score - a.score);
  }

  ok(res, {
    mode,
    count: combined.length,
    results: combined.slice(0, Number(limit)).map(s => ({ ...s.m, score: Number(s.score.toFixed(4)) })),
  });
});

app.get('/api/memories/timeline/:twinId', (req, res) => {
  const ids = timelines.get(req.params.twinId) || [];
  const list = ids.map(id => memories.get(id)).filter(Boolean);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ok(res, { twinId: req.params.twinId, count: list.length, memories: list });
});

app.get('/api/memories/timeline', (req, res) => {
  const { from, to, twinId, limit = 100 } = req.query;
  let list = Array.from(memories.values());
  if (twinId) list = list.filter(m => m.twinId === twinId);
  if (from) list = list.filter(m => m.createdAt >= from);
  if (to) list = list.filter(m => m.createdAt <= to);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ok(res, { count: list.length, memories: list.slice(0, Number(limit)) });
});

app.get('/api/memories/summaries', (req, res) => {
  const { twinId } = req.query;
  let list = Array.from(summaries.values());
  if (twinId) list = list.filter(s => s.twinId === twinId);
  ok(res, { count: list.length, summaries: list });
});

app.get('/api/memories', (req, res) => {
  const { twinId, type, kind, tag, visibility, q, limit = 50 } = req.query;
  let list = Array.from(memories.values());
  if (twinId) list = list.filter(m => m.twinId === twinId);
  if (type) list = list.filter(m => m.type === type);
  if (kind) list = list.filter(m => m.kind === kind);
  if (visibility) list = list.filter(m => m.visibility === visibility);
  if (tag) list = list.filter(m => (m.tags || []).includes(tag));
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter(m => (m.content || '').toLowerCase().includes(needle) || (m.tags || []).some(t => t.toLowerCase().includes(needle)));
  }
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ok(res, { count: list.length, memories: list.slice(0, Number(limit)) });
});

app.get('/api/memories/:id', (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  const expired = checkExpiredOrFail(m, res);
  if (expired) return;
  m.accessedAt = nowIso();
  m.accessCount = (m.accessCount || 0) + 1;
  log(m.id, 'read');
  ok(res, { data: m });
});

app.put('/api/memories/:id',requireAuth,  async (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  if ('type' in req.body && !isValidType(req.body.type)) {
    return fail(res, 'INVALID_TYPE', `type must be one of: ${ALLOWED_TYPES.join(', ')}`);
  }
  if ('importance' in req.body && !isValidImportance(req.body.importance)) {
    return fail(res, 'INVALID_IMPORTANCE', `importance must be one of: ${ALLOWED_IMPORTANCE.join(', ')}`);
  }
  if ('lifecycleStage' in req.body && !isValidLifecycle(req.body.lifecycleStage)) {
    return fail(res, 'INVALID_LIFECYCLE', `lifecycleStage must be one of: ${ALLOWED_LIFECYCLE.join(', ')}`);
  }
  for (const k of ['content', 'tags', 'visibility', 'metadata', 'type', 'kind', 'importance', 'lifecycleStage']) {
    if (k in req.body) m[k] = req.body[k];
  }
  if ('ttl' in req.body) {
    m.ttl = req.body.ttl || null;
    if (req.body.ttl) {
      const d = new Date(req.body.ttl);
      m.expiresAt = isNaN(d.getTime()) ? null : d.toISOString();
    } else {
      m.expiresAt = null;
    }
  }
  m.updatedAt = nowIso();
  recordHistory(m);
  await persistMemoryUpdate(m);
  log(m.id, 'update');
  ok(res, { data: m });
});

app.delete('/api/memories/:id',requireAuth,  async (req, res) => {
  if (!memories.has(req.params.id)) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  log(req.params.id, 'delete');
  await persistMemoryDelete(req.params.id);
  ok(res, { deleted: req.params.id });
});

// =============================================================================
// IMPORTANCE-FILTERED LISTING
// =============================================================================

app.get('/api/memories/by-importance/:level', (req, res) => {
  const level = req.params.level;
  if (!isValidImportance(level)) {
    return fail(res, 'INVALID_IMPORTANCE', `importance must be one of: ${ALLOWED_IMPORTANCE.join(', ')}`);
  }
  const list = Array.from(memories.values()).filter(m => m.importance === level);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ok(res, { importance: level, count: list.length, memories: list });
});

// =============================================================================
// JACCARD (used in similarity / old-semantic modes)
// =============================================================================

function jaccard(a = [], b = []) {
  const A = new Set(a.map(s => String(s).toLowerCase()));
  const B = new Set(b.map(s => String(s).toLowerCase()));
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size || 1;
  return inter / union;
}

// =============================================================================
// SMART FORGETTING (GDPR-style retention / TTL)
// =============================================================================

app.post('/api/memories/:id/forget',requireAuth,  async (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  const { reason = 'gdpr_request', hardDelete = true, archiveFirst = true } = req.body || {};
  if (archiveFirst && m.lifecycleStage !== 'archived') {
    m.lifecycleStage = 'archived';
    m.archivedAt = nowIso();
    recordHistory(m);
  }
  log(m.id, `forget:${reason}`);
  if (hardDelete) {
    await persistMemoryDelete(m.id);
    return ok(res, { forgotten: m.id, mode: 'hard', reason });
  }
  await persistMemoryUpdate(m);
  ok(res, { forgotten: m.id, mode: 'soft', reason });
});

app.post('/api/memories/cleanup-expired',requireAuth,  async (req, res) => {
  const now = Date.now();
  let removed = 0;
  for (const [id, m] of memories.entries()) {
    if (m.expiresAt && new Date(m.expiresAt).getTime() <= now) {
      log(id, 'cleanup-expired');
      await persistMemoryDelete(id);
      removed += 1;
    }
  }
  // Also ask Mongo to do its own cleanup
  if (persistence.isUsingMongo()) {
    const nowIsoStr = new Date(now).toISOString();
    const dbRemoved = await persistence.cleanupExpired(nowIsoStr);
    if (typeof dbRemoved === 'number') removed = Math.max(removed, dbRemoved);
  }
  ok(res, { removed, remaining: memories.size });
});

// =============================================================================
// LIFECYCLE TRANSITIONS
// =============================================================================

app.post('/api/memories/:id/transition',requireAuth,  async (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  const { to, reason = null } = req.body || {};
  if (!to) return fail(res, 'INVALID_INPUT', 'to required');
  if (!isValidLifecycle(to)) {
    return fail(res, 'INVALID_LIFECYCLE', `lifecycleStage must be one of: ${ALLOWED_LIFECYCLE.join(', ')}`);
  }
  const from = m.lifecycleStage;
  m.lifecycleStage = to;
  m.updatedAt = nowIso();
  if (to === 'archived') m.archivedAt = nowIso();
  if (to === 'deleted') {
    log(m.id, `lifecycle-delete${reason ? `:${reason}` : ''}`);
    await persistMemoryDelete(m.id);
    return ok(res, { id: m.id, from, to, deleted: true });
  }
  recordHistory(m);
  await persistMemoryUpdate(m);
  log(m.id, `transition:${from}->${to}`);
  ok(res, { data: { id: m.id, from, to, reason, at: m.updatedAt } });
});

// =============================================================================
// ANALYTICS
// =============================================================================

app.get('/api/memories/analytics/growth', (_req, res) => {
  const buckets = {};
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  for (const m of memories.values()) {
    const key = dayKey(m.createdAt);
    if (key in buckets) buckets[key] += 1;
  }
  const series = Object.entries(buckets).map(([day, count]) => ({ day, count }));
  const total = series.reduce((s, x) => s + x.count, 0);
  ok(res, { days: 30, total, series });
});

app.get('/api/memories/analytics/by-type', (_req, res) => {
  const counts = {};
  for (const t of ALLOWED_TYPES) counts[t] = 0;
  for (const m of memories.values()) {
    counts[m.type] = (counts[m.type] || 0) + 1;
  }
  ok(res, { total: memories.size, byType: counts });
});

app.get('/api/memories/analytics/recall-freq', (req, res) => {
  const { limit = 10, twinId } = req.query;
  let list = Array.from(memories.values());
  if (twinId) list = list.filter(m => m.twinId === twinId);
  list.sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0));
  ok(res, {
    count: list.length,
    top: list.slice(0, Number(limit)).map(m => ({
      id: m.id,
      twinId: m.twinId,
      type: m.type,
      importance: m.importance,
      content: (m.content || '').slice(0, 120),
      accessCount: m.accessCount || 0,
      lastAccessedAt: m.accessedAt || null
    }))
  });
});

// =============================================================================
// VERSIONING
// =============================================================================

app.get('/api/memories/:id/history', (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  const list = historyStore.get(m.id) || [];
  ok(res, {
    id: m.id,
    currentVersion: m.version || 1,
    count: list.length,
    history: list.map(h => ({ version: h.version, changedAt: h.changedAt, snapshot: h.snapshot }))
  });
});

app.post('/api/memories/:id/revert',requireAuth,  async (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  const { version } = req.body || {};
  if (!version) return fail(res, 'INVALID_INPUT', 'version required');
  const list = historyStore.get(m.id) || [];
  const target = list.find(h => h.version === Number(version));
  if (!target) return fail(res, 'VERSION_NOT_FOUND', `version ${version} not found`, 404);
  const snap = target.snapshot;
  m.content = snap.content;
  m.tags = snap.tags;
  m.visibility = snap.visibility;
  m.type = snap.type;
  m.kind = snap.kind;
  m.importance = snap.importance;
  m.lifecycleStage = snap.lifecycleStage || m.lifecycleStage;
  m.metadata = snap.metadata;
  m.ttl = snap.ttl;
  m.expiresAt = snap.expiresAt;
  m.confidence = snap.confidence ?? m.confidence;
  m.updatedAt = nowIso();
  recordHistory(m);
  await persistMemoryUpdate(m);
  log(m.id, `revert:${version}`);
  ok(res, { data: m, revertedTo: Number(version) });
});

// =============================================================================
// MEMORY CONFIDENCE WRITEBACK
// =============================================================================

app.post('/api/memories/:id/strengthen',requireAuth,  async (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  const expired = checkExpiredOrFail(m, res);
  if (expired) return;
  const { amount = 0.1 } = req.body || {};
  const delta = Number(amount);
  if (!Number.isFinite(delta)) return fail(res, 'INVALID_INPUT', 'amount must be numeric');
  m.confidence = Math.max(0, Math.min(1, (m.confidence ?? 0.5) + delta));
  m.lastReinforcedAt = nowIso();
  m.updatedAt = nowIso();
  recordHistory(m);
  await persistMemoryUpdate(m);
  log(m.id, 'strengthen');
  ok(res, { data: { id: m.id, confidence: m.confidence, decayFactor: computeDecay(m), effectiveConfidence: computeDecay(m) } });
});

app.post('/api/memories/:id/weaken',requireAuth,  async (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  const expired = checkExpiredOrFail(m, res);
  if (expired) return;
  const { amount = 0.1, reason = 'contradiction' } = req.body || {};
  const delta = Number(amount);
  if (!Number.isFinite(delta)) return fail(res, 'INVALID_INPUT', 'amount must be numeric');
  m.confidence = Math.max(0, Math.min(1, (m.confidence ?? 0.5) - delta));
  m.contradictions = (m.contradictions || 0) + 1;
  m.lastContradictedAt = nowIso();
  m.updatedAt = nowIso();
  await persistContradictionAppend(m.id, { amount: delta, reason, ts: nowIso() });
  recordHistory(m);
  await persistMemoryUpdate(m);
  log(m.id, `weaken:${reason}`);
  ok(res, { data: { id: m.id, confidence: m.confidence, contradictions: m.contradictions, decayFactor: computeDecay(m), effectiveConfidence: computeDecay(m) } });
});

app.get('/api/memories/:id/confidence', (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  const expired = checkExpiredOrFail(m, res);
  if (expired) return;
  const contradictionsList = contradictions.get(m.id) || [];
  ok(res, {
    id: m.id,
    confidence: m.confidence ?? 0.5,
    decayFactor: computeDecay(m),
    effectiveConfidence: computeDecay(m),
    contradictions: m.contradictions || 0,
    contradictionLog: contradictionsList,
    lastReinforcedAt: m.lastReinforcedAt || null,
    lastContradictedAt: m.lastContradictedAt || null
  });
});

// =============================================================================
// BULK OPERATIONS
// =============================================================================

app.post('/api/memories/bulk-create',requireAuth,  async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!items) return fail(res, 'INVALID_INPUT', 'items array required');
  const created = [];
  const errors = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i] || {};
    const {
      twinId, type = 'general', content, tags = [], visibility = 'private', metadata = {},
      importance = 'Medium', ttl, lifecycleStage, confidence
    } = item;
    if (!twinId || !content) { errors.push({ index: i, error: 'twinId and content required' }); continue; }
    if (!isValidType(type)) { errors.push({ index: i, error: `invalid type: ${type}` }); continue; }
    if (!isValidImportance(importance)) { errors.push({ index: i, error: `invalid importance: ${importance}` }); continue; }
    const stage = lifecycleStage || 'created';
    if (!isValidLifecycle(stage)) { errors.push({ index: i, error: `invalid lifecycle: ${stage}` }); continue; }
    const id = uuidv4();
    let expiresAt = null;
    if (ttl) {
      const d = new Date(ttl);
      if (!isNaN(d.getTime())) expiresAt = d.toISOString();
    }
    const m = {
      id, twinId, type, content, tags, visibility, metadata,
      kind: metadata.kind || 'long-term',
      importance,
      lifecycleStage: stage,
      version: 1,
      confidence: typeof confidence === 'number' ? Math.max(0, Math.min(1, confidence)) : 0.5,
      ttl: ttl || null,
      expiresAt,
      contradictions: 0,
      accessCount: 0,
      createdAt: nowIso(), updatedAt: nowIso()
    };
    await persistMemory(m);
    await persistTimelineAppend(twinId, id);
    recordHistory(m);
    log(id, 'bulk-create');
    created.push(m);
  }
  res.status(201).json({ success: true, createdCount: created.length, errorCount: errors.length, created, errors });
});

app.post('/api/memories/bulk-delete',requireAuth,  async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
  if (!ids) return fail(res, 'INVALID_INPUT', 'ids array required');
  const deleted = [];
  const notFound = [];
  for (const id of ids) {
    if (memories.has(id)) {
      log(id, 'bulk-delete');
      await persistMemoryDelete(id);
      deleted.push(id);
    } else {
      notFound.push(id);
    }
  }
  ok(res, { deletedCount: deleted.length, notFoundCount: notFound.length, deleted, notFound });
});

// =============================================================================
// PER-TWIN SEARCH
// =============================================================================

app.get('/api/twins/:twinId/memories', (req, res) => {
  const { twinId } = req.params;
  const { type, importance, lifecycleStage, q, limit = 50, offset = 0 } = req.query;
  let list = Array.from(memories.values()).filter(m => m.twinId === twinId);
  if (type) list = list.filter(m => m.type === type);
  if (importance) list = list.filter(m => m.importance === importance);
  if (lifecycleStage) list = list.filter(m => m.lifecycleStage === lifecycleStage);
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter(m => (m.content || '').toLowerCase().includes(needle) || (m.tags || []).some(t => t.toLowerCase().includes(needle)));
  }
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = list.length;
  const lim = Number(limit);
  const off = Number(offset);
  ok(res, { twinId, total, count: list.slice(off, off + lim).length, limit: lim, offset: off, memories: list.slice(off, off + lim) });
});

// =============================================================================
// KNOWLEDGE GRAPH
// =============================================================================

app.post('/api/knowledge-graph/nodes',requireAuth,  async (req, res) => {
  const { id, type = 'entity', label, metadata = {} } = req.body || {};
  if (!id || !label) return fail(res, 'INVALID_INPUT', 'id and label required');
  const existing = knowledgeGraph.get(id);
  const node = { id, type, label, metadata, links: existing?.links || [] };
  await persistKGNode(node);
  res.status(201).json({ success: true, data: node });
});

app.get('/api/knowledge-graph/nodes/:id', (req, res) => {
  const n = knowledgeGraph.get(req.params.id);
  if (!n) return fail(res, 'NOT_FOUND', 'node not found', 404);
  ok(res, { data: n });
});

app.post('/api/knowledge-graph/edges',requireAuth,  async (req, res) => {
  const { from, to, rel, weight = 1 } = req.body || {};
  if (!from || !to || !rel) return fail(res, 'INVALID_INPUT', 'from, to, rel required');
  const a = knowledgeGraph.get(from);
  const b = knowledgeGraph.get(to);
  if (!a || !b) return fail(res, 'NODE_NOT_FOUND', 'one or both nodes missing', 404);
  const edge = { to, rel, weight, createdAt: nowIso() };
  a.links.push(edge);
  await persistKGUpdateLinks(from, a.links);
  ok(res, { data: edge });
});

app.get('/api/knowledge-graph/walk', (req, res) => {
  const { start, depth = 2, rel } = req.query;
  if (!start) return fail(res, 'INVALID_INPUT', 'start required');
  const visited = new Set();
  const queue = [{ id: start, d: 0, path: [] }];
  const found = [];
  while (queue.length) {
    const { id, d, path } = queue.shift();
    if (visited.has(id) || d > Number(depth)) continue;
    visited.add(id);
    const node = knowledgeGraph.get(id);
    if (!node) continue;
    found.push({ id, type: node.type, label: node.label, depth: d, path: [...path, id] });
    for (const e of (node.links || [])) {
      if (rel && e.rel !== rel) continue;
      queue.push({ id: e.to, d: d + 1, path: [...path, id] });
    }
  }
  ok(res, { start, depth: Number(depth), count: found.length, nodes: found });
});

// =============================================================================
// WORKING MEMORY
// =============================================================================

app.put('/api/memory/working/:twinId',requireAuth,  async (req, res) => {
  const { context, currentTask, currentConversation, currentWorkflow } = req.body || {};
  const wm = {
    twinId: req.params.twinId,
    context: context || {},
    currentTask: currentTask || null,
    currentConversation: currentConversation || null,
    currentWorkflow: currentWorkflow || null,
    updatedAt: nowIso()
  };
  await persistWorking(req.params.twinId, wm);
  ok(res, { data: wm });
});

app.get('/api/memory/working/:twinId', (req, res) => {
  const wm = workingMemory.get(req.params.twinId);
  if (!wm) return fail(res, 'NOT_FOUND', 'no working memory for twin', 404);
  ok(res, { data: wm });
});

// =============================================================================
// LONG-TERM MEMORY
// =============================================================================

app.post('/api/memory/longterm/:twinId',requireAuth,  async (req, res) => {
  const { key, value, kind = 'preference' } = req.body || {};
  if (!key) return fail(res, 'INVALID_INPUT', 'key required');
  const entry = { id: uuidv4(), key, value, kind, createdAt: nowIso() };
  await persistLongtermAppend(req.params.twinId, entry);
  res.status(201).json({ success: true, data: entry });
});

app.get('/api/memory/longterm/:twinId', (req, res) => {
  ok(res, { twinId: req.params.twinId, entries: longTermMemory.get(req.params.twinId) || [] });
});

// =============================================================================
// SUMMARIZATION
// =============================================================================

app.post('/api/memories/summarize',requireAuth,  async (req, res) => {
  const { twinId, period = 'day', from, to } = req.body || {};
  let list = Array.from(memories.values());
  if (twinId) list = list.filter(m => m.twinId === twinId);
  if (from) list = list.filter(m => m.createdAt >= from);
  if (to) list = list.filter(m => m.createdAt <= to);
  const byKind = {};
  for (const m of list) byKind[m.kind] = (byKind[m.kind] || 0) + 1;
  const summary = {
    id: uuidv4(),
    twinId, period, from, to,
    totalMemories: list.length,
    byKind,
    firstAt: list.length ? list.map(m => m.createdAt).sort()[0] : null,
    lastAt: list.length ? list.map(m => m.createdAt).sort().slice(-1)[0] : null,
    sample: list.slice(0, 3).map(m => ({ id: m.id, content: m.content.slice(0, 100), type: m.type, kind: m.kind })),
    createdAt: nowIso()
  };
  await persistSummary(summary);
  ok(res, { data: summary });
});

// =============================================================================
// SHARING POLICIES
// =============================================================================

app.post('/api/memories/:id/sharing',requireAuth,  async (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  const { principal, scopes = ['read'], ttlSeconds } = req.body || {};
  if (!principal) return fail(res, 'INVALID_INPUT', 'principal required');
  const id = uuidv4();
  const policy = { id, principal, scopes, ttlSeconds, createdAt: nowIso() };
  await persistSharingAppend(m.id, policy);
  res.status(201).json({ success: true, data: policy });
});

app.get('/api/memories/:id/sharing', (req, res) => {
  ok(res, { policies: sharingPolicies.get(req.params.id) || [] });
});

// =============================================================================
// AUDIT
// =============================================================================

app.get('/api/memories/:id/audit', (req, res) => {
  const list = accessLog.filter(a => a.memoryId === req.params.id);
  ok(res, { count: list.length, log: list });
});

app.get('/api/audit', (req, res) => {
  const { principal, op, limit = 100 } = req.query;
  let list = accessLog;
  if (principal) list = list.filter(a => a.principal === principal);
  if (op) list = list.filter(a => a.op === op);
  ok(res, { count: list.length, log: list.slice(-Number(limit)).reverse() });
});

// =============================================================================
// LEARNING
// =============================================================================

app.post('/api/memory/learn', requireAuth, async (req, res) => {
  const { twinId, interaction, outcome = 'neutral', score = 0.5, importance = 'Medium', tags = [] } = req.body || {};
  if (!twinId || !interaction) return fail(res, 'INVALID_INPUT', 'twinId and interaction required');
  if (!isValidImportance(importance)) return fail(res, 'INVALID_IMPORTANCE', `importance must be one of: ${ALLOWED_IMPORTANCE.join(', ')}`);

  // 1. Persist the new learning memory
  const id = uuidv4();
  const allTags = ['learning', outcome, ...(tags || [])];
  const m = {
    id, twinId, type: 'learning', kind: 'experience',
    content: `[${outcome}] ${interaction} (score=${score})`,
    tags: allTags, metadata: { outcome, score, relatedReinforced: 0, contradicted: [] },
    importance, lifecycleStage: 'created', version: 1, confidence: 0.5,
    contradictions: 0, accessCount: 0,
    createdAt: nowIso(), updatedAt: nowIso()
  };
  await persistMemory(m);
  await persistTimelineAppend(twinId, id);
  recordHistory(m);

  // 2. Find related existing memories for this twin (tag + content overlap)
  const interactionTokens = String(interaction).toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const candidates = [];
  for (const [, existing] of memories.entries()) {
    if (existing.twinId !== twinId) continue;
    if (existing.id === id) continue;
    const tagOverlap = jaccard(allTags, existing.tags || []);
    if (tagOverlap < 0.1) continue;            // unrelated → skip
    const contentLower = String(existing.content || '').toLowerCase();
    const contentOverlap = interactionTokens.filter(t => contentLower.includes(t)).length;
    if (tagOverlap < 0.1 && contentOverlap === 0) continue;
    candidates.push({ mem: existing, score: tagOverlap + contentOverlap * 0.1 });
  }
  candidates.sort((a, b) => b.score - a.score);
  const related = candidates.slice(0, 5);

  // 3. Reinforce related memories (bump confidence + accessCount)
  const reinforced = [];
  for (const { mem } of related) {
    const before = mem.confidence ?? 0.5;
    mem.confidence = Math.min(1, before + 0.05);
    mem.accessCount = (mem.accessCount || 0) + 1;
    mem.accessedAt = nowIso();
    mem.updatedAt = nowIso();
    if (mem.lifecycleStage === 'created') mem.lifecycleStage = 'active';
    recordHistory(mem);
    await persistMemoryUpdate(mem);
    reinforced.push({ id: mem.id, before, after: mem.confidence });
  }
  m.metadata.relatedReinforced = reinforced.length;

  // 4. Contradiction check — negative outcome or low score contradicts related positive memories
  const isContradictory = outcome === 'negative' || Number(score) < 0.3;
  const contradictionsFound = [];
  if (isContradictory) {
    for (const { mem } of related) {
      // mark a contradiction only if the related memory was positive/high-confidence
      const prevConf = mem.confidence ?? 0.5;
      mem.contradictions = (mem.contradictions || 0) + 1;
      mem.confidence = Math.max(0, prevConf - 0.1);
      mem.updatedAt = nowIso();
      const entry = { amount: -0.1, reason: `learn:${outcome}`, ts: nowIso(), fromLearningId: id };
      if (!contradictions.has(mem.id)) contradictions.set(mem.id, []);
      contradictions.get(mem.id).push(entry);
      recordHistory(mem);
      await persistMemoryUpdate(mem);
      await persistContradictionAppend(mem.id, entry);
      contradictionsFound.push({ id: mem.id, newConfidence: mem.confidence });
    }
    m.metadata.contradicted = contradictionsFound;
  }

  // 5. Promote to long-term if importance is High or score is strong
  const shouldPromote = importance === 'High' || importance === 'Critical' || Number(score) >= 0.8;
  let promoted = false;
  if (shouldPromote) {
    m.lifecycleStage = 'long-term';
    if (!longTermMemory.has(twinId)) longTermMemory.set(twinId, []);
    const ltEntry = { memoryId: id, promotedAt: nowIso(), reason: importance === 'High' || importance === 'Critical' ? 'importance' : 'score' };
    longTermMemory.get(twinId).push(ltEntry);
    await persistLongtermAppend(twinId, ltEntry);
    recordHistory(m);
    await persistMemoryUpdate(m);
    promoted = true;
  }

  ok(res, {
    data: m,
    learning: {
      persisted: true,
      relatedReinforced: reinforced.length,
      reinforced,
      contradictionsFound: contradictionsFound.length,
      contradictions: contradictionsFound,
      promotedToLongTerm: promoted,
    }
  });
});

// =============================================================================
// CONVENIENCE ROUTES
// =============================================================================

app.post('/api/memory/personal/:twinId',requireAuth,  async (req, res) => {
  const { content, tags = [], importance = 'Medium' } = req.body || {};
  if (!content) return fail(res, 'INVALID_INPUT', 'content required');
  if (!isValidImportance(importance)) return fail(res, 'INVALID_IMPORTANCE', `importance must be one of: ${ALLOWED_IMPORTANCE.join(', ')}`);
  const id = uuidv4();
  const m = {
    id, twinId: req.params.twinId, kind: 'personal', type: 'identity', content, tags, visibility: 'private',
    importance, lifecycleStage: 'created', version: 1, confidence: 0.5,
    contradictions: 0, accessCount: 0,
    createdAt: nowIso(), updatedAt: nowIso()
  };
  await persistMemory(m);
  await persistTimelineAppend(req.params.twinId, id);
  recordHistory(m);
  res.status(201).json({ success: true, data: m });
});

app.post('/api/memory/business/:twinId',requireAuth,  async (req, res) => {
  const { content, tags = [], importance = 'Medium' } = req.body || {};
  if (!content) return fail(res, 'INVALID_INPUT', 'content required');
  if (!isValidImportance(importance)) return fail(res, 'INVALID_IMPORTANCE', `importance must be one of: ${ALLOWED_IMPORTANCE.join(', ')}`);
  const id = uuidv4();
  const m = {
    id, twinId: req.params.twinId, kind: 'business', type: 'knowledge', content, tags, visibility: 'team',
    importance, lifecycleStage: 'created', version: 1, confidence: 0.5,
    contradictions: 0, accessCount: 0,
    createdAt: nowIso(), updatedAt: nowIso()
  };
  await persistMemory(m);
  await persistTimelineAppend(req.params.twinId, id);
  recordHistory(m);
  res.status(201).json({ success: true, data: m });
});

app.post('/api/memory/decision/:twinId',requireAuth,  async (req, res) => {
  const { decision, why, alternatives = [], outcome = null, importance = 'High' } = req.body || {};
  if (!decision || !why) return fail(res, 'INVALID_INPUT', 'decision and why required');
  if (!isValidImportance(importance)) return fail(res, 'INVALID_IMPORTANCE', `importance must be one of: ${ALLOWED_IMPORTANCE.join(', ')}`);
  const id = uuidv4();
  const content = `Decision: ${decision}\nWhy: ${why}\nAlternatives: ${alternatives.join(' | ')}\nOutcome: ${outcome || 'pending'}`;
  const m = {
    id, twinId: req.params.twinId, kind: 'decision', type: 'decision', content,
    tags: ['decision', ...(alternatives || [])], visibility: 'team',
    metadata: { decision, why, alternatives, outcome },
    importance, lifecycleStage: 'created', version: 1, confidence: 0.5,
    contradictions: 0, accessCount: 0,
    createdAt: nowIso(), updatedAt: nowIso()
  };
  await persistMemory(m);
  await persistTimelineAppend(req.params.twinId, id);
  recordHistory(m);
  res.status(201).json({ success: true, data: m });
});

// =============================================================================
// BACKFILL endpoint — for ops to backfill embeddings for existing memories
// =============================================================================

app.post('/api/memories/backfill-vectors',requireAuth,  async (req, res) => {
  if (!persistence.isUsingMongo()) {
    return fail(res, 'NO_MONGO', 'backfill requires MongoDB', 400);
  }
  const pending = await persistence.memoryBackfillMissingVectors();
  ok(res, { pending: pending || 0, message: 'embeddings will be backfilled on next read' });
});

// =============================================================================
// 404 + error
// =============================================================================

app.use((req, res) => fail(res, 'NOT_FOUND', `route ${req.method} ${req.path} not found`, 404));

app.use((err, _req, res, _next) => {
  console.error('MemoryOS error:', err);
  fail(res, 'INTERNAL_ERROR', err.message || 'unexpected error', 500);
});

// =============================================================================
// START — with persistence init and warm-up
// =============================================================================

async function startup() {
  await persistence.connect();
  if (persistence.isUsingMongo()) {
    try {
      // Warm up memories
      const r = await persistence.memoryList({}, { limit: 100000 });
      if (r && r.list) {
        for (const m of r.list) memories.set(m.id, m);
        console.log(`[MemoryOS] warmed up with ${r.list.length} memories from MongoDB`);
      }
      // Warm up history (so /revert works after restart)
      const histCursor = await persistence.getDb().collection('history').find({}).limit(100000);
      const histEntries = await histCursor.toArray();
      for (const h of histEntries) {
        if (!historyStore.has(h.memoryId)) historyStore.set(h.memoryId, []);
        historyStore.get(h.memoryId).push({
          version: h.version,
          snapshot: h.snapshot,
          changedAt: h.changedAt,
        });
      }
      console.log(`[MemoryOS] warmed up ${histEntries.length} history entries`);
      // Warm up knowledge graph, timelines, working, long-term, summaries
      const kgCursor = await persistence.getDb().collection('knowledgeNodes').find({}).limit(100000);
      const kgNodes = await kgCursor.toArray();
      for (const n of kgNodes) knowledgeGraph.set(n.id || n._id, n);
      const tlCursor = await persistence.getDb().collection('timelines').find({}).limit(100000);
      const tlEntries = await tlCursor.toArray();
      for (const t of tlEntries) {
        if (!timelines.has(t.twinId)) timelines.set(t.twinId, []);
        timelines.get(t.twinId).push(t);
      }
      const wmCursor = await persistence.getDb().collection('workingMemory').find({}).limit(100000);
      const wmEntries = await wmCursor.toArray();
      for (const w of wmEntries) workingMemory.set(w.twinId, w);
      const ltCursor = await persistence.getDb().collection('longTermMemory').find({}).limit(100000);
      const ltEntries = await ltCursor.toArray();
      for (const l of ltEntries) {
        if (!longTermMemory.has(l.twinId)) longTermMemory.set(l.twinId, []);
        longTermMemory.get(l.twinId).push(l);
      }
      const smCursor = await persistence.getDb().collection('summaries').find({}).limit(100000);
      const smEntries = await smCursor.toArray();
      for (const s of smEntries) summaries.set(s.id || s._id, s);
      console.log(`[MemoryOS] warmed up kg=${kgNodes.length} tl=${tlEntries.length} wm=${wmEntries.length} lt=${ltEntries.length} sm=${smEntries.length}`);
    } catch (e) {
      console.warn('[MemoryOS] warmup failed:', e.message);
    }
  }
  // Pre-create the vector collection (best-effort)
  embedClient.ensureCollection().catch(() => { /* silent */ });
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


  const server = app.listen(PORT, () => {
    console.log(`MemoryOS v2.1.0 running on port ${PORT} - The Knowledge & Experience Layer ("What do I know?")`);
    console.log(`  Storage: ${persistence.isUsingMongo() ? 'MongoDB' : 'in-memory (fallback)'}`);
    console.log(`  Vector DB: ${embedClient.VECTOR_DB_URL}`);
    console.log(`  Health: http://localhost:${PORT}/health`);
  });
  installGracefulShutdown(server);
}

startup().catch(err => {
  console.error('MemoryOS startup failed:', err);
  process.exit(1);
});

// Safety nets — never crash the process on an unhandled rejection or exception.
// A single async bug in one route should not take down the whole memory layer.
process.on('unhandledRejection', (reason) => {
  console.error('[MemoryOS] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[MemoryOS] uncaughtException:', err);
});
