/**
 * Memory Context Engine (port 4793)
 *
 * Purpose
 * -------
 * Composes a relevant context window for any AI agent / LLM by combining:
 *   - MemoryOS (4703)            → primary recall (keyword + semantic)
 *   - Memory Confidence (4152)   → effective confidence + decay
 *   - Twin Memory Bridge (4704)  → twin ↔ memory partition links
 *   - (optional) Vector DB (4780) → semantic search fallback
 *
 * Why a separate service?
 * ------------------------
 * MemoryOS is a dumb store. The Context Engine is the *smart retriever* that
 * decides WHAT goes into the LLM's window, in what ORDER, with what
 * CONFIDENCE score, given:
 *   - a query
 *   - a twinId (whose memory to search)
 *   - a budget (max items / max tokens)
 *   - a recency window
 *   - a min-confidence threshold
 *
 * Endpoints
 * ---------
 *   GET  /health
 *   POST /api/context          main endpoint — build a context window
 *   POST /api/context/preview  dry-run (no confidence writeback)
 *   GET  /api/stats            recent calls + cache stats
 *
 * Port: 4790
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { requireAuthMw, requireAuth, getRequireAuth, setRequireAuth } from './auth.js';

const PORT = process.env.MEMORY_CONTEXT_ENGINE_PORT || 4793;

// Upstream services. Allow override for tests.
const MEMORYOS_URL    = process.env.MEMORYOS_URL    || 'http://localhost:4703';
const CONFIDENCE_URL  = process.env.CONFIDENCE_URL  || 'http://localhost:4152';
const BRIDGE_URL      = process.env.BRIDGE_URL      || 'http://localhost:4704';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));
app.use(requireAuthMw);

// Test helper: toggle auth on/off
app.get('/api/auth/toggle', (req, res) => {
  const on = req.query.on === 'true';
  setRequireAuth(on);
  res.json({ success: true, requireAuth: on, message: `Auth is now ${on ? 'REQUIRED' : 'disabled (dev mode)'}` });
});

// =============================================================================
// IN-MEMORY CACHE + STATS
// =============================================================================

const cache = new PersistentMap('cache', { serviceName: 'memory-context-engine' });         // key -> { ts, result }
const stats = {
  totalCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  byTwin: {},                    // twinId -> call count
  byMode: { keyword: 0, semantic: 0, hybrid: 0, working: 0 },
  recentErrors: [],
  lastCallAt: null,
};

const CACHE_TTL_MS = 30_000;     // 30s — enough to dedupe burst traffic

function cacheKey({ twinId, query, mode, limit, minConfidence, kinds }) {
  return JSON.stringify({ twinId, query, mode, limit, minConfidence, kinds: [...(kinds || [])].sort() });
}

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return e.result;
}

function cacheSet(key, result) {
  cache.set(key, { ts: Date.now(), result });
  // simple bounded cache
  if (cache.size > 500) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function nowIso() { return new Date().toISOString(); }

function fail(res, code, message, status = 400) {
  return res.status(status).json({ success: false, error: code, message });
}

async function safeFetchJson(url, opts = {}, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const j = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, body: j };
  } catch (e) {
    return { ok: false, status: 0, body: null, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

function ok(res, payload) {
  res.json({ success: true, ...payload });
}

// Score = relevance (from search) * confidence (from confidence) * recency (age decay)
function scoreMemory(mem, confidence, queryTerms) {
  const baseScore = (mem._relevance || 0.5);
  const conf = (confidence && confidence.effectiveConfidence != null) ? confidence.effectiveConfidence : 0.5;
  // recency: half-life of 30 days
  const ageDays = mem.ageDays || 0;
  const recency = Math.pow(0.5, ageDays / 30);
  // tiny boost for query-term overlap
  let overlap = 0;
  if (queryTerms && queryTerms.length) {
    const txt = (mem.content || '').toLowerCase();
    for (const t of queryTerms) if (txt.includes(t)) overlap += 0.05;
  }
  return Number((baseScore * conf * recency + overlap).toFixed(4));
}

function tokenize(q) {
  return (q || '').toLowerCase().split(/[^a-z0-9_]+/).filter(t => t.length > 1);
}

// =============================================================================
// CORE: build context window
// =============================================================================

async function buildContext({
  twinId, query, mode = 'hybrid', limit = 10, minConfidence = 0.0,
  kinds = ['semantic', 'long-term', 'episodic'],
  recencyDays = null,
  writeback = false,
}) {
  if (!twinId) throw new Error('twinId required');
  if (!query)   throw new Error('query required');

  stats.totalCalls += 1;
  stats.lastCallAt = nowIso();
  stats.byTwin[twinId] = (stats.byTwin[twinId] || 0) + 1;
  if (stats.byMode[mode] != null) stats.byMode[mode] += 1;

  const cacheK = cacheKey({ twinId, query, mode, limit, minConfidence, kinds });
  const cached = cacheGet(cacheK);
  if (cached) {
    stats.cacheHits += 1;
    return { ...cached, fromCache: true };
  }
  stats.cacheMisses += 1;

  const terms = tokenize(query);

  // 1) Resolve the twin's memory partitions (so we can scope by kind)
  const bindingRes = await safeFetchJson(`${BRIDGE_URL}/api/twins/${encodeURIComponent(twinId)}/binding`);
  const binding = bindingRes.ok ? bindingRes.body : null;

  // 2) Call MemoryOS search
  const searchParams = new URLSearchParams({
    twinId, q: query, mode, limit: String(Math.max(limit * 3, 30)),
  });
  const searchRes = await safeFetchJson(`${MEMORYOS_URL}/api/memories/search?${searchParams}`);
  if (!searchRes.ok) {
    const e = { at: nowIso(), stage: 'memoryos.search', status: searchRes.status, error: searchRes.error || (searchRes.body && searchRes.body.message) || 'unknown' };
    stats.recentErrors.push(e);
    if (stats.recentErrors.length > 50) stats.recentErrors.shift();
    throw new Error(`MemoryOS search failed: ${e.error}`);
  }
  const candidates = (searchRes.body && searchRes.body.results) || [];

  // 3) Optionally filter by recency
  let filtered = candidates;
  if (recencyDays != null) {
    const cutoff = Date.now() - recencyDays * 86400000;
    filtered = filtered.filter(m => new Date(m.createdAt).getTime() >= cutoff);
  }

  // 4) Filter by kinds (if the bridge says the twin has those kinds bound)
  if (binding && binding.partitions) {
    const boundKinds = new Set(Object.keys(binding.partitions));
    filtered = filtered.filter(m => boundKinds.has(m.kind) || m.kind === 'long-term');
  }

  // 5) Fetch confidence for each candidate (best-effort, batch when possible)
  const confById = new PersistentMap('conf-by-id', { serviceName: 'memory-context-engine' });
  if (filtered.length) {
    const ids = filtered.map(m => m.id);
    const confRes = await safeFetchJson(`${CONFIDENCE_URL}/api/facts?minConfidence=0`);
    if (confRes.ok && Array.isArray(confRes.body && confRes.body.facts)) {
      for (const f of confRes.body.facts) confById.set(f.id, f);
    }
    // mark which memories have a confidence record
    for (const m of filtered) m._hasConfidence = confById.has(m.id);
  }

  // 6) Score & filter by minConfidence
  const scored = filtered.map(m => {
    const conf = confById.get(m.id) || { effectiveConfidence: 0.5, decayFactor: 1.0 };
    const s = scoreMemory(m, conf, terms);
    return { memory: m, confidence: conf, score: s };
  }).filter(x => (x.confidence.effectiveConfidence || 0) >= minConfidence);

  // 7) Sort by score desc, take top N
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  // 8) Optional writeback — track that these memories were used in a context.
  // MemoryOS doesn't have a dedicated /access endpoint yet (planned Phase 6),
  // so we just bump an internal counter via the read path's natural side-effect
  // by touching each memory's GET to increment accessCount.
  if (writeback && top.length) {
    await Promise.all(top.map(t =>
      safeFetchJson(`${MEMORYOS_URL}/api/memories/${encodeURIComponent(t.memory.id)}`)
    ));
  }

  const result = {
    twinId, query, mode, limit, minConfidence, kinds, recencyDays,
    binding: binding || null,
    count: top.length,
    items: top.map(t => ({
      memory: t.memory,
      score: t.score,
      confidence: t.confidence,
      source: 'memory-context-engine',
    })),
    stats: { candidates: candidates.length, afterFilter: filtered.length, afterScore: scored.length },
  };
  cacheSet(cacheK, result);
  return { ...result, fromCache: false };
}

// =============================================================================
// ROUTES
// =============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'memory-context-engine',
    version: '1.0.0',
    port: PORT,
    timestamp: nowIso(),
    upstreams: {
      memoryOs: MEMORYOS_URL,
      confidence: CONFIDENCE_URL,
      bridge: BRIDGE_URL,
    },
    cache: { size: cache.size, ttlMs: CACHE_TTL_MS },
    stats: { ...stats, byTwin: { ...stats.byTwin }, byMode: { ...stats.byMode } },
    capabilities: [
      'build-context-window',
      'preview-context',
      'multi-mode-search',
      'confidence-weighted',
      'recency-weighted',
      'binding-aware',
      'optional-writeback',
    ],
  });
});

app.get('/', (_req, res) => res.redirect('/health'));

app.post('/api/context',requireAuth,  async (req, res) => {
  try {
    const result = await buildContext({
      twinId: req.body.twinId,
      query: req.body.query,
      mode: req.body.mode || 'hybrid',
      limit: Math.min(Math.max(parseInt(req.body.limit) || 10, 1), 50),
      minConfidence: Number(req.body.minConfidence) || 0,
      kinds: Array.isArray(req.body.kinds) ? req.body.kinds : undefined,
      recencyDays: req.body.recencyDays != null ? Number(req.body.recencyDays) : null,
      writeback: !!req.body.writeback,
    });
    ok(res, { data: result });
  } catch (e) {
    fail(res, 'CONTEXT_BUILD_FAILED', e.message, 500);
  }
});

app.post('/api/context/preview',requireAuth,  async (req, res) => {
  try {
    const result = await buildContext({
      ...req.body, writeback: false,
      limit: Math.min(Math.max(parseInt(req.body.limit) || 10, 1), 50),
    });
    ok(res, { data: result });
  } catch (e) {
    fail(res, 'CONTEXT_BUILD_FAILED', e.message, 500);
  }
});

app.get('/api/stats', (_req, res) => {
  res.json({ ...stats, byTwin: { ...stats.byTwin }, byMode: { ...stats.byMode } });
});

// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

export default app;
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Memory Context Engine running on port ${PORT}`);
    console.log(`  MemoryOS:  ${MEMORYOS_URL}`);
    console.log(`  Confidence: ${CONFIDENCE_URL}`);
    console.log(`  Bridge:    ${BRIDGE_URL}`);
  });
  installGracefulShutdown(server);
}

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  console.error('[memory-context-engine]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});
