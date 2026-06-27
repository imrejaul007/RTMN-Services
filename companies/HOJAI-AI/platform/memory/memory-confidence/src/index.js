/**
 * Memory Confidence & Decay Engine (port 4152)
 *
 * Pairs with MemoryOS (4703). MemoryOS treats all memories as equally true
 * forever. THIS service tracks *how reliable* each fact actually is:
 *
 *   effective = clamp01(base * decay * contradictionFactor)
 *   effectiveHalfLife = baseHalfLife * (1 + 0.5 * reinforcements)
 *
 * 3 signals:
 *   - base            — initial confidence from source (user-spoken=0.6,
 *                       system-observed=0.9, third-party-api=0.7,
 *                       agent-generated=0.5)
 *   - decay           — exp(-ln2 * age_days / effectiveHalfLife). Default 90-day
 *                       half-life. Each reinforce call extends the effective
 *                       half-life by 50% (so 1 reinforce = 135d, 2 = 180d, etc.)
 *                       — reinforced facts decay slower (used more = trusted more)
 *   - contradiction   — drops to (1 - 0.5 * contradictionCount), floored at 0
 *
 * Endpoints:
 *   GET    /health
 *   POST   /api/facts                      create fact
 *   GET    /api/facts/:id                  one fact + 4 signals + effective
 *   GET    /api/facts                      filter (twinId, source, minConfidence, sort)
 *   PATCH  /api/facts/:id                  update base / halfLife / metadata
 *   DELETE /api/facts/:id
 *   POST   /api/facts/:id/reinforce        { amount?, reason }  +conf
 *   POST   /api/facts/:id/contradict       { amount?, reason }  -conf
 *   POST   /api/facts/:id/recall           track recall (no conf change)
 *   GET    /api/recall/:twinId             confidence-sorted recall
 *   GET    /api/report/:twinId             confidence distribution
 *   GET    /api/report/:twinId/staleness   facts about to drop
 *   POST   /api/sync-from-memoryos         pull from MemoryOS 4703
 *   GET    /api/audit                      every conf change
 *
 * Port: 4152
 * Pattern: in-memory Map (matches twin-capability-profile, goal-conflict-engine, etc.)
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import * as persistence from './persistence.js';
import { requireAuthMw, requireAuth, setRequireAuth, getRequireAuth } from './auth.js';

const PORT = process.env.MEMORY_CONFIDENCE_PORT || 4152;
const MEMORYOS_URL = process.env.MEMORYOS_URL || 'http://localhost:4703';

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

// JWT auth via CorpID (off by default; set REQUIRE_AUTH=true to enforce).
// Middleware is sourced from @rtmn/shared/auth (see ./auth.js).
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(requireAuthMw);

// Test helper: toggle auth on/off
app.get('/api/auth/toggle', (req, res) => {
  const on = req.query.on === 'true';
  setRequireAuth(on);
  res.json({ success: true, requireAuth: on, message: `Auth is now ${on ? 'REQUIRED' : 'disabled (dev mode)'}` });
});
app.use(morgan('tiny'));

// =============================================================================
// STORES
// =============================================================================

const facts = new PersistentMap('facts', { serviceName: 'memory-confidence' });         // id -> fact
const recallEvents = [];         // append-only usage log (bounded)
const audit = [];                // every confidence change

// =============================================================================
// SEED — 8 example facts (mix of fresh / stale / contradicted / reinforced)
// =============================================================================

const now = Date.now();
const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
const SOURCE_BASE = {
  'user-spoken': 0.6,
  'system-observed': 0.9,
  'third-party-api': 0.7,
  'agent-generated': 0.5,
  'seeded': 0.95
};

const SEED_FACTS = [
  // Fresh, high-confidence, system-observed
  { id: 'f-1', twinId: 'demo', content: 'Customer John prefers email contact', source: 'system-observed', baseConfidence: 0.9, halfLifeDays: 90, ageDays: 2, reinforcements: 0, contradictions: 0 },
  // Medium, user-spoken, decent
  { id: 'f-2', twinId: 'demo', content: 'John birthday is March 15', source: 'user-spoken', baseConfidence: 0.6, halfLifeDays: 365, ageDays: 30, reinforcements: 1, contradictions: 0 },
  // Stale — 200 days old, half-life 90 → at ~21% confidence
  { id: 'f-3', twinId: 'demo', content: 'John works at Acme Corp', source: 'user-spoken', baseConfidence: 0.6, halfLifeDays: 90, ageDays: 200, reinforcements: 0, contradictions: 0 },
  // Reinforced several times — high effective confidence
  { id: 'f-4', twinId: 'demo', content: 'John is vegetarian', source: 'user-spoken', baseConfidence: 0.6, halfLifeDays: 180, ageDays: 45, reinforcements: 8, contradictions: 0 },
  // Contradicted once — drops to ~50% of base
  { id: 'f-5', twinId: 'demo', content: 'John lives in Mumbai', source: 'user-spoken', baseConfidence: 0.6, halfLifeDays: 365, ageDays: 60, reinforcements: 0, contradictions: 1 },
  // Agent-generated, recent, untouched
  { id: 'f-6', twinId: 'demo', content: 'John likely interested in product X', source: 'agent-generated', baseConfidence: 0.5, halfLifeDays: 30, ageDays: 3, reinforcements: 0, contradictions: 0 },
  // Third-party API, very recent
  { id: 'f-7', twinId: 'demo', content: 'John credit score 750 (from bureau)', source: 'third-party-api', baseConfidence: 0.7, halfLifeDays: 30, ageDays: 1, reinforcements: 0, contradictions: 0 },
  // Twin 'acme' instead of demo
  { id: 'f-8', twinId: 'acme', content: 'Acme preferred shipping is FedEx', source: 'system-observed', baseConfidence: 0.9, halfLifeDays: 365, ageDays: 10, reinforcements: 2, contradictions: 0 }
];

for (const s of SEED_FACTS) {
  facts.set(s.id, {
    id: s.id,
    twinId: s.twinId,
    content: s.content,
    source: s.source,
    baseConfidence: s.baseConfidence,
    halfLifeDays: s.halfLifeDays,
    reinforcements: s.reinforcements,
    contradictions: s.contradictions,
    recallCount: 0,
    createdAt: daysAgo(s.ageDays),
    updatedAt: nowIso(),
    metadata: {}
  });
}

// =============================================================================
// HELPERS
// =============================================================================

function nowIso() { return new Date().toISOString(); }
function ok(res, data) { res.json({ success: true, ...data }); }
function fail(res, code, message, status = 400) { res.status(status).json({ success: false, error: code, message }); }

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function ageDays(createdAt) { return (Date.now() - new Date(createdAt).getTime()) / 86400000; }

function effectiveHalfLife(halfLifeDays, reinforcements) {
  // Each reinforce extends the half-life by 50%
  return halfLifeDays * (1 + 0.5 * reinforcements);
}

function decayFactor(createdAt, halfLifeDays, reinforcements = 0) {
  const age = ageDays(createdAt);
  const hl = effectiveHalfLife(halfLifeDays, reinforcements);
  if (hl <= 0) return 1;
  return Math.exp(-Math.LN2 * age / hl);
}

function contradictionFactor(contradictions) {
  return clamp01(1 - 0.5 * contradictions);
}

function effectiveConfidence(f) {
  return clamp01(
    f.baseConfidence
    * decayFactor(f.createdAt, f.halfLifeDays, f.reinforcements)
    * contradictionFactor(f.contradictions)
  );
}

function annotate(f) {
  const hl = effectiveHalfLife(f.halfLifeDays, f.reinforcements);
  const decay = decayFactor(f.createdAt, f.halfLifeDays, f.reinforcements);
  const contra = contradictionFactor(f.contradictions);
  return {
    ...f,
    ageDays: ageDays(f.createdAt),
    effectiveHalfLifeDays: Number(hl.toFixed(2)),
    decayFactor: Number(decay.toFixed(4)),
    contradictionFactor: Number(contra.toFixed(4)),
    effectiveConfidence: Number(effectiveConfidence(f).toFixed(4))
  };
}

function auditLog(entry) {
  const a = { id: `aud-${uuidv4()}`, timestamp: nowIso(), ...entry };
  audit.push(a);
  if (audit.length > 5000) audit.shift();
  return a;
}

// =============================================================================
// ROUTES
// =============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'memory-confidence',
    version: '1.0.0',
    port: PORT,
    storage: { mongodb: persistence.isUsingMongo() ? 'connected' : 'in-memory fallback' },
    timestamp: nowIso(),
    counts: {
      facts: facts.size,
      recallEvents: recallEvents.length,
      auditEntries: audit.length
    },
    capabilities: [
      'create-fact',
      'get-fact',
      'list-facts',
      'update-fact',
      'delete-fact',
      'reinforce',
      'contradict',
      'recall',
      'confidence-recall',
      'confidence-report',
      'staleness-report',
      'sync-from-memoryos'
    ]
  });
});

app.get('/', (_req, res) => res.redirect('/health'));

// ── Facts CRUD ────────────────────────────────────────────────────────

// Create
app.post('/api/facts',requireAuth,  async (req, res) => {
  const { twinId, content, source = 'agent-generated', baseConfidence, halfLifeDays = 90, metadata = {} } = req.body || {};
  if (!twinId || !content) return fail(res, 'validation', 'twinId and content required');
  const base = baseConfidence != null ? Number(baseConfidence) : SOURCE_BASE[source];
  if (base == null || isNaN(base)) return fail(res, 'validation', `unknown source "${source}" — provide baseConfidence or use one of: ${Object.keys(SOURCE_BASE).join(', ')}`);
  const f = {
    id: `f-${uuidv4().slice(0, 8)}`,
    twinId, content, source,
    baseConfidence: clamp01(base),
    halfLifeDays: Math.max(1, Number(halfLifeDays) || 90),
    reinforcements: 0,
    contradictions: 0,
    recallCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metadata
  };
  facts.set(f.id, f);
  await persistence.factUpsert(f);
  await persistence.auditAppend({ kind: 'fact-create', factId: f.id, twinId, source, base: f.baseConfidence, ts: nowIso() });
  auditLog({ kind: 'fact-create', factId: f.id, twinId, source, base: f.baseConfidence });
  res.status(201).json(annotate(f));
});

// Get one
app.get('/api/facts/:id', (req, res) => {
  const f = facts.get(req.params.id);
  if (!f) return fail(res, 'not_found', `fact ${req.params.id} not found`, 404);
  res.json(annotate(f));
});

// List with filters
app.get('/api/facts', (req, res) => {
  const { twinId, source, minConfidence, sort = 'effective-desc' } = req.query;
  let list = Array.from(facts.values()).map(annotate);
  if (twinId) list = list.filter(f => f.twinId === twinId);
  if (source) list = list.filter(f => f.source === source);
  if (minConfidence != null) list = list.filter(f => f.effectiveConfidence >= Number(minConfidence));
  if (sort === 'effective-desc') list.sort((a, b) => b.effectiveConfidence - a.effectiveConfidence);
  else if (sort === 'effective-asc') list.sort((a, b) => a.effectiveConfidence - b.effectiveConfidence);
  else if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else if (sort === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json({ count: list.length, facts: list });
});

// Update
app.patch('/api/facts/:id',requireAuth,  async (req, res) => {
  const f = facts.get(req.params.id);
  if (!f) return fail(res, 'not_found', `fact ${req.params.id} not found`, 404);
  const { baseConfidence, halfLifeDays, metadata, content } = req.body || {};
  if (baseConfidence != null) f.baseConfidence = clamp01(Number(baseConfidence));
  if (halfLifeDays != null) f.halfLifeDays = Math.max(1, Number(halfLifeDays));
  if (metadata) f.metadata = { ...f.metadata, ...metadata };
  if (content) f.content = content;
  f.updatedAt = nowIso();
  await persistence.factUpsert(f);
  await persistence.auditAppend({ kind: 'fact-update', factId: f.id, changes: Object.keys(req.body || {}), ts: nowIso() });
  auditLog({ kind: 'fact-update', factId: f.id, changes: Object.keys(req.body || {}) });
  res.json(annotate(f));
});

// Delete
app.delete('/api/facts/:id',requireAuth,  async (req, res) => {
  const f = facts.get(req.params.id);
  if (!f) return fail(res, 'not_found', `fact ${req.params.id} not found`, 404);
  facts.delete(req.params.id);
  await persistence.factDelete(req.params.id);
  await persistence.auditAppend({ kind: 'fact-delete', factId: req.params.id, twinId: f.twinId, ts: nowIso() });
  auditLog({ kind: 'fact-delete', factId: req.params.id, twinId: f.twinId });
  res.status(204).end();
});

// ── Confidence actions ────────────────────────────────────────────────

// Reinforce
app.post('/api/facts/:id/reinforce',requireAuth,  async (req, res) => {
  const f = facts.get(req.params.id);
  if (!f) return fail(res, 'not_found', `fact ${req.params.id} not found`, 404);
  const { amount, reason } = req.body || {};
  const inc = amount != null ? Number(amount) : 0.05;
  f.reinforcements += 1;
  f.updatedAt = nowIso();
  const before = effectiveConfidence(f);
  await persistence.factUpsert(f);
  await persistence.auditAppend({ kind: 'reinforce', factId: f.id, twinId: f.twinId, before: Number(before.toFixed(4)), reason: reason || '', ts: nowIso() });
  auditLog({ kind: 'reinforce', factId: f.id, twinId: f.twinId, before: Number(before.toFixed(4)), reason: reason || '' });
  res.json(annotate(f));
});

// Contradict
app.post('/api/facts/:id/contradict',requireAuth,  async (req, res) => {
  const f = facts.get(req.params.id);
  if (!f) return fail(res, 'not_found', `fact ${req.params.id} not found`, 404);
  const { amount, reason } = req.body || {};
  const inc = amount != null ? Number(amount) : 0.5;
  f.contradictions += 1;
  f.updatedAt = nowIso();
  const before = effectiveConfidence(f);
  await persistence.factUpsert(f);
  await persistence.auditAppend({ kind: 'contradict', factId: f.id, twinId: f.twinId, before: Number(before.toFixed(4)), reason: reason || '', ts: nowIso() });
  auditLog({ kind: 'contradict', factId: f.id, twinId: f.twinId, before: Number(before.toFixed(4)), reason: reason || '' });
  res.json(annotate(f));
});

// Recall (track usage, no conf change)
app.post('/api/facts/:id/recall',requireAuth,  async (req, res) => {
  const f = facts.get(req.params.id);
  if (!f) return fail(res, 'not_found', `fact ${req.params.id} not found`, 404);
  const { context } = req.body || {};
  f.recallCount += 1;
  f.updatedAt = nowIso();
  const evt = { factId: f.id, twinId: f.twinId, context: context || '', at: nowIso() };
  recallEvents.push(evt);
  if (recallEvents.length > 5000) recallEvents.shift();
  await persistence.factUpsert(f);
  await persistence.recallAppend(evt);
  res.json(annotate(f));
});

// ── Confidence-sorted recall ──────────────────────────────────────────

app.get('/api/recall/:twinId', (req, res) => {
  const { minConfidence = 0, limit = 25, sort = 'effective-desc' } = req.query;
  let list = Array.from(facts.values()).filter(f => f.twinId === req.params.twinId).map(annotate);
  list = list.filter(f => f.effectiveConfidence >= Number(minConfidence));
  if (sort === 'effective-desc') list.sort((a, b) => b.effectiveConfidence - a.effectiveConfidence);
  else if (sort === 'recall-count') list.sort((a, b) => b.recallCount - a.recallCount);
  res.json({
    twinId: req.params.twinId,
    minConfidence: Number(minConfidence),
    count: list.length,
    facts: list.slice(0, Number(limit))
  });
});

// ── Reports ───────────────────────────────────────────────────────────

// Confidence distribution
app.get('/api/report/:twinId', (req, res) => {
  const list = Array.from(facts.values()).filter(f => f.twinId === req.params.twinId).map(annotate);
  const buckets = { high: 0, medium: 0, low: 0, stale: 0 };
  for (const f of list) {
    if (f.effectiveConfidence >= 0.7) buckets.high++;
    else if (f.effectiveConfidence >= 0.4) buckets.medium++;
    else if (f.effectiveConfidence >= 0.1) buckets.low++;
    else buckets.stale++;
  }
  res.json({
    twinId: req.params.twinId,
    total: list.length,
    buckets,
    averageConfidence: list.length > 0
      ? Number((list.reduce((s, f) => s + f.effectiveConfidence, 0) / list.length).toFixed(4))
      : 0,
    facts: list
  });
});

// Staleness report — facts about to drop below threshold
app.get('/api/report/:twinId/staleness', (req, res) => {
  const { threshold = 0.3, window = 30 } = req.query;
  const list = Array.from(facts.values())
    .filter(f => f.twinId === req.params.twinId)
    .map(annotate)
    .filter(f => f.effectiveConfidence < Number(threshold) || f.effectiveConfidence < 0.5)
    .map(f => {
      // project confidence N days into the future
      const futureDate = new Date(Date.now() + Number(window) * 86400000);
      const ageAtFuture = (futureDate.getTime() - new Date(f.createdAt).getTime()) / 86400000;
      const hl = effectiveHalfLife(f.halfLifeDays, f.reinforcements);
      const projectedDecay = hl > 0 ? Math.exp(-Math.LN2 * ageAtFuture / hl) : 1;
      const projected = clamp01(
        f.baseConfidence * projectedDecay
        * contradictionFactor(f.contradictions)
      );
      return { ...f, projectedConfidenceInDays: Number(projected.toFixed(4)), windowDays: Number(window) };
    })
    .sort((a, b) => a.effectiveConfidence - b.effectiveConfidence);
  res.json({
    twinId: req.params.twinId,
    threshold: Number(threshold),
    windowDays: Number(window),
    count: list.length,
    facts: list
  });
});

// ── MemoryOS sync ─────────────────────────────────────────────────────

app.post('/api/sync-from-memoryos',requireAuth,  async (req, res) => {
  try {
    const r = await fetch(`${MEMORYOS_URL}/api/memories`, { timeout: 3000 });
    if (!r.ok) {
      return fail(res, 'memoryos_unreachable', `MemoryOS returned ${r.status}`, 502);
    }
    const data = await r.json();
    const list = Array.isArray(data) ? data : (data.data || data.memories || []);
    let synced = 0;
    for (const m of list) {
      // Skip if already synced (same id)
      if (facts.has(m.id)) continue;
      // Map MemoryOS type to source
      const source = m.type === 'observation' ? 'system-observed'
                   : m.type === 'decision'  ? 'agent-generated'
                   : 'user-spoken';
      const f = {
        id: m.id,
        twinId: m.twinId || 'unknown',
        content: m.content || '',
        source,
        baseConfidence: SOURCE_BASE[source] || 0.7,
        halfLifeDays: m.kind === 'working' ? 7 : 90,
        reinforcements: 0,
        contradictions: 0,
        recallCount: 0,
        createdAt: m.createdAt || nowIso(),
        updatedAt: m.updatedAt || nowIso(),
        metadata: { syncedFrom: 'memoryos', originalType: m.type, originalKind: m.kind }
      };
      facts.set(f.id, f);
      synced++;
    }
    auditLog({ kind: 'memoryos-sync', synced, total: facts.size });
    res.json({ success: true, synced, total: facts.size });
  } catch (err) {
    fail(res, 'memoryos_unreachable', `MemoryOS unreachable at ${MEMORYOS_URL}: ${err.message}`, 502);
  }
});

// ── Audit ─────────────────────────────────────────────────────────────

app.get('/api/audit', async (req, res) => {
  const { kind, limit } = req.query;
  let list;
  if (persistence.isUsingMongo()) {
    // Prefer Mongo so we get history that survived a restart
    const mongoList = await persistence.auditListAll();
    list = (mongoList || []).slice().reverse();
  } else {
    list = audit.slice().reverse();
  }
  if (kind) list = list.filter(a => a.kind === kind);
  if (limit) list = list.slice(0, parseInt(limit));
  res.json({ count: list.length, audit: list });
});

// =============================================================================
// START — with persistence init and warm-up
// =============================================================================

// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

export default app;
if (process.env.NODE_ENV !== 'test') {
  startup().catch(err => {
    console.error('memory-confidence startup failed:', err);
    process.exit(1);
  });
}

async function startup() {
  await persistence.connect();
  if (persistence.isUsingMongo()) {
    try {
      const all = await persistence.factsListAll();
      if (all && all.length) {
        for (const f of all) facts.set(f.id, f);
        console.log(`[memory-confidence] warmed up ${all.length} facts from MongoDB`);
      }
    } catch (e) {
      console.warn('[memory-confidence] warmup failed:', e.message);
    }
  }
  const server = app.listen(PORT, () => {
    console.log(`Memory Confidence Engine running on port ${PORT}`);
    console.log(`  Storage: ${persistence.isUsingMongo() ? 'MongoDB' : 'in-memory (fallback)'}`);
    console.log(`  ${facts.size} facts loaded (incl. seeds)`);
  });
  installGracefulShutdown(server);
}
