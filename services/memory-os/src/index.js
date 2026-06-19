/**
 * MemoryOS - The Universal Memory Layer
 *
 * One of the 3 foundational pillars of HOJAI AI:
 *   - TwinOS   = Identity & Representation Layer ("What am I?")
 *   - MemoryOS = Knowledge & Experience Layer  ("What do I know?")
 *   - SkillOS  = Capability Layer              ("What can I do?")
 *
 * Port: 4703
 * Pattern: in-memory Map (matches TwinOS / SkillOS / SUTAR services)
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4703;
const app = express();
app.use(express.json());

// =============================================================================
// IN-MEMORY STORES
// =============================================================================

const memories = new Map();          // id -> memory record
const knowledgeGraph = new Map();    // entity id -> { type, links: [{ to, rel }] }
const timelines = new Map();         // twinId -> [memory ids chronologically]
const summaries = new Map();         // id -> summary
const sharingPolicies = new Map();   // memoryId -> [policies]
const workingMemory = new Map();     // twinId -> working memory
const longTermMemory = new Map();    // twinId -> long-term entries
const accessLog = [];                // privacy audit log

// =============================================================================
// HELPERS
// =============================================================================

function nowIso() { return new Date().toISOString(); }
function ok(res, data) { res.json({ success: true, ...data }); }
function fail(res, code, message, status = 400) { res.status(status).json({ success: false, error: code, message }); }
function log(memoryId, op, principal = 'anonymous') {
  accessLog.push({ id: uuidv4(), memoryId, op, principal, ts: nowIso() });
  if (accessLog.length > 5000) accessLog.shift();
}

// =============================================================================
// HEALTH + INFO
// =============================================================================

app.get('/', (_req, res) => ok(res, {
  service: 'memory-os',
  version: '2.0.0',
  port: PORT,
  description: 'HOJAI AI MemoryOS - The Knowledge & Experience Layer ("What do I know?")',
  pillars: ['TwinOS (4705)', 'MemoryOS (4703)', 'SkillOS (4743)'],
  features: 18
}));

app.get('/health', (_req, res) => ok(res, {
  status: 'healthy',
  service: 'MemoryOS',
  port: PORT,
  version: '2.0.0',
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

app.post('/api/memories', (req, res) => {
  const { twinId, type = 'general', content, tags = [], visibility = 'private', metadata = {} } = req.body || {};
  if (!twinId || !content) return fail(res, 'INVALID_INPUT', 'twinId and content required');
  const id = uuidv4();
  const m = {
    id, twinId, type, content, tags, visibility, metadata,
    kind: metadata.kind || 'long-term',
    createdAt: nowIso(), updatedAt: nowIso()
  };
  memories.set(id, m);
  if (!timelines.has(twinId)) timelines.set(twinId, []);
  timelines.get(twinId).push(id);
  log(id, 'create');
  res.status(201).json({ success: true, data: m });
});

// IMPORTANT: Specific routes must come BEFORE /api/memories/:id
app.get('/api/memories/search', (req, res) => {
  const { q, twinId, mode = 'keyword', from, to, limit = 25 } = req.query;
  if (!q) return fail(res, 'INVALID_INPUT', 'q required');
  const needle = String(q).toLowerCase();
  let list = Array.from(memories.values());
  if (twinId) list = list.filter(m => m.twinId === twinId);
  if (from) list = list.filter(m => m.createdAt >= from);
  if (to) list = list.filter(m => m.createdAt <= to);
  const scored = list.map(m => {
    const hay = `${m.content} ${m.tags.join(' ')} ${m.type}`.toLowerCase();
    let score = 0;
    needle.split(/\s+/).forEach(w => { if (w && hay.includes(w)) score += 1; });
    return { m, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  if (mode === 'similarity') {
    scored.sort((x, y) => {
      const sa = jaccard(x.m.tags, String(q).split(/\s+/));
      const sb = jaccard(y.m.tags, String(q).split(/\s+/));
      return sb - sa;
    });
  } else if (mode === 'semantic') {
    scored.sort((x, y) => jaccard(y.m.tags, String(q).split(/\s+/)) - jaccard(x.m.tags, String(q).split(/\s+/)));
  } else if (mode === 'timeline') {
    scored.sort((x, y) => y.m.createdAt.localeCompare(x.m.createdAt));
  }
  ok(res, { mode, count: scored.length, results: scored.slice(0, Number(limit)).map(s => ({ ...s.m, score: s.score })) });
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
  if (tag) list = list.filter(m => m.tags.includes(tag));
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter(m => (m.content || '').toLowerCase().includes(needle) || m.tags.some(t => t.toLowerCase().includes(needle)));
  }
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ok(res, { count: list.length, memories: list.slice(0, Number(limit)) });
});

app.get('/api/memories/:id', (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  m.accessedAt = nowIso();
  m.accessCount = (m.accessCount || 0) + 1;
  log(m.id, 'read');
  ok(res, { data: m });
});

app.put('/api/memories/:id', (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  for (const k of ['content', 'tags', 'visibility', 'metadata', 'type', 'kind']) {
    if (k in req.body) m[k] = req.body[k];
  }
  m.updatedAt = nowIso();
  log(m.id, 'update');
  ok(res, { data: m });
});

app.delete('/api/memories/:id', (req, res) => {
  if (!memories.has(req.params.id)) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  log(req.params.id, 'delete');
  memories.delete(req.params.id);
  ok(res, { deleted: req.params.id });
});

// =============================================================================
// 14. MEMORY SEARCH  (semantic, keyword, similarity, timeline)
// =============================================================================

function jaccard(a = [], b = []) {
  const A = new Set(a.map(s => String(s).toLowerCase()));
  const B = new Set(b.map(s => String(s).toLowerCase()));
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size || 1;
  return inter / union;
}

app.get('/api/memories/search', (req, res) => {
  const { q, twinId, mode = 'keyword', from, to, limit = 25 } = req.query;
  if (!q) return fail(res, 'INVALID_INPUT', 'q required');
  const needle = String(q).toLowerCase();
  let list = Array.from(memories.values());
  if (twinId) list = list.filter(m => m.twinId === twinId);
  if (from) list = list.filter(m => m.createdAt >= from);
  if (to) list = list.filter(m => m.createdAt <= to);
  const scored = list.map(m => {
    const hay = `${m.content} ${m.tags.join(' ')} ${m.type}`.toLowerCase();
    let score = 0;
    needle.split(/\s+/).forEach(w => { if (w && hay.includes(w)) score += 1; });
    return { m, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  if (mode === 'similarity') {
    scored.sort((x, y) => {
      const sa = jaccard(x.m.tags, String(q).split(/\s+/));
      const sb = jaccard(y.m.tags, String(q).split(/\s+/));
      return sb - sa;
    });
  } else if (mode === 'semantic') {
    // Use tag-overlap as a proxy for semantic similarity
    scored.sort((x, y) => jaccard(y.m.tags, String(q).split(/\s+/)) - jaccard(x.m.tags, String(q).split(/\s+/)));
  } else if (mode === 'timeline') {
    scored.sort((x, y) => y.m.createdAt.localeCompare(x.m.createdAt));
  }
  ok(res, { mode, count: scored.length, results: scored.slice(0, Number(limit)).map(s => ({ ...s.m, score: s.score })) });
});

// =============================================================================
// 10. SEMANTIC MEMORY  (Knowledge Graph)
// =============================================================================

app.post('/api/knowledge-graph/nodes', (req, res) => {
  const { id, type = 'entity', label, metadata = {} } = req.body || {};
  if (!id || !label) return fail(res, 'INVALID_INPUT', 'id and label required');
  const existing = knowledgeGraph.get(id);
  const node = { id, type, label, metadata, links: existing?.links || [] };
  knowledgeGraph.set(id, node);
  res.status(201).json({ success: true, data: node });
});

app.get('/api/knowledge-graph/nodes/:id', (req, res) => {
  const n = knowledgeGraph.get(req.params.id);
  if (!n) return fail(res, 'NOT_FOUND', 'node not found', 404);
  ok(res, { data: n });
});

app.post('/api/knowledge-graph/edges', (req, res) => {
  const { from, to, rel, weight = 1 } = req.body || {};
  if (!from || !to || !rel) return fail(res, 'INVALID_INPUT', 'from, to, rel required');
  const a = knowledgeGraph.get(from);
  const b = knowledgeGraph.get(to);
  if (!a || !b) return fail(res, 'NODE_NOT_FOUND', 'one or both nodes missing', 404);
  const edge = { to, rel, weight, createdAt: nowIso() };
  a.links.push(edge);
  knowledgeGraph.set(from, a);
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
// 11. EPISODIC MEMORY  (chronological timeline)  -- handled above
// =============================================================================

// =============================================================================
// 12. WORKING MEMORY  (current task/conversation/workflow)
// =============================================================================

app.put('/api/memory/working/:twinId', (req, res) => {
  const { context, currentTask, currentConversation, currentWorkflow } = req.body || {};
  const wm = {
    twinId: req.params.twinId,
    context: context || {},
    currentTask: currentTask || null,
    currentConversation: currentConversation || null,
    currentWorkflow: currentWorkflow || null,
    updatedAt: nowIso()
  };
  workingMemory.set(req.params.twinId, wm);
  ok(res, { data: wm });
});

app.get('/api/memory/working/:twinId', (req, res) => {
  const wm = workingMemory.get(req.params.twinId);
  if (!wm) return fail(res, 'NOT_FOUND', 'no working memory for twin', 404);
  ok(res, { data: wm });
});

// =============================================================================
// 13. LONG-TERM MEMORY  (permanent preferences/experience/learning)
// =============================================================================

app.post('/api/memory/longterm/:twinId', (req, res) => {
  const { key, value, kind = 'preference' } = req.body || {};
  if (!key) return fail(res, 'INVALID_INPUT', 'key required');
  const list = longTermMemory.get(req.params.twinId) || [];
  const entry = { id: uuidv4(), key, value, kind, createdAt: nowIso() };
  list.push(entry);
  longTermMemory.set(req.params.twinId, list);
  res.status(201).json({ success: true, data: entry });
});

app.get('/api/memory/longterm/:twinId', (req, res) => {
  ok(res, { twinId: req.params.twinId, entries: longTermMemory.get(req.params.twinId) || [] });
});

// =============================================================================
// 16. MEMORY SUMMARIZATION
// =============================================================================

app.post('/api/memories/summarize', (req, res) => {
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
  summaries.set(summary.id, summary);
  ok(res, { data: summary });
});

// =============================================================================
// 17. MEMORY SHARING (policy-based)
// =============================================================================

app.post('/api/memories/:id/sharing', (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return fail(res, 'NOT_FOUND', 'memory not found', 404);
  const { principal, scopes = ['read'], ttlSeconds } = req.body || {};
  if (!principal) return fail(res, 'INVALID_INPUT', 'principal required');
  const id = uuidv4();
  const policy = { id, principal, scopes, ttlSeconds, createdAt: nowIso() };
  const list = sharingPolicies.get(m.id) || [];
  list.push(policy);
  sharingPolicies.set(m.id, list);
  res.status(201).json({ success: true, data: policy });
});

app.get('/api/memories/:id/sharing', (req, res) => {
  ok(res, { policies: sharingPolicies.get(req.params.id) || [] });
});

// =============================================================================
// 18. MEMORY PRIVACY (audit log)
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
// 15. MEMORY LEARNING  (record interactions to improve)
// =============================================================================

app.post('/api/memory/learn', (req, res) => {
  const { twinId, interaction, outcome = 'neutral', score = 0.5 } = req.body || {};
  if (!twinId || !interaction) return fail(res, 'INVALID_INPUT', 'twinId and interaction required');
  const id = uuidv4();
  const m = {
    id, twinId, type: 'learning', kind: 'experience',
    content: `[${outcome}] ${interaction} (score=${score})`,
    tags: ['learning', outcome], metadata: { outcome, score },
    createdAt: nowIso(), updatedAt: nowIso()
  };
  memories.set(id, m);
  if (!timelines.has(twinId)) timelines.set(twinId, []);
  timelines.get(twinId).push(id);
  ok(res, { data: m });
});

// =============================================================================
// CONVENIENCE: kind-specific helpers
// =============================================================================

app.post('/api/memory/personal/:twinId', (req, res) => {
  const { content, tags = [] } = req.body || {};
  if (!content) return fail(res, 'INVALID_INPUT', 'content required');
  const id = uuidv4();
  const m = { id, twinId: req.params.twinId, kind: 'personal', type: 'personal', content, tags, visibility: 'private', createdAt: nowIso(), updatedAt: nowIso() };
  memories.set(id, m);
  if (!timelines.has(req.params.twinId)) timelines.set(req.params.twinId, []);
  timelines.get(req.params.twinId).push(id);
  res.status(201).json({ success: true, data: m });
});

app.post('/api/memory/business/:twinId', (req, res) => {
  const { content, tags = [] } = req.body || {};
  if (!content) return fail(res, 'INVALID_INPUT', 'content required');
  const id = uuidv4();
  const m = { id, twinId: req.params.twinId, kind: 'business', type: 'business', content, tags, visibility: 'team', createdAt: nowIso(), updatedAt: nowIso() };
  memories.set(id, m);
  if (!timelines.has(req.params.twinId)) timelines.set(req.params.twinId, []);
  timelines.get(req.params.twinId).push(id);
  res.status(201).json({ success: true, data: m });
});

app.post('/api/memory/decision/:twinId', (req, res) => {
  const { decision, why, alternatives = [], outcome = null } = req.body || {};
  if (!decision || !why) return fail(res, 'INVALID_INPUT', 'decision and why required');
  const id = uuidv4();
  const content = `Decision: ${decision}\nWhy: ${why}\nAlternatives: ${alternatives.join(' | ')}\nOutcome: ${outcome || 'pending'}`;
  const m = { id, twinId: req.params.twinId, kind: 'decision', type: 'decision', content, tags: ['decision', ...(alternatives || [])], visibility: 'team', metadata: { decision, why, alternatives, outcome }, createdAt: nowIso(), updatedAt: nowIso() };
  memories.set(id, m);
  if (!timelines.has(req.params.twinId)) timelines.set(req.params.twinId, []);
  timelines.get(req.params.twinId).push(id);
  res.status(201).json({ success: true, data: m });
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
// START
// =============================================================================

app.listen(PORT, () => {
  console.log(`MemoryOS v2.0.0 running on port ${PORT} - The Knowledge & Experience Layer ("What do I know?")`);
  console.log(`  Health: http://localhost:${PORT}/health`);
});
