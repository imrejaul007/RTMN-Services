/**
 * agent-memory-bridge (port 4811) — Phase 32.6
 *
 * Per-agent abstraction over MemoryOS (port 4703). Each agent gets a personal
 * memory partition persisted at data/agent-memory/<agentId>.json.
 *
 * Capabilities:
 *   - Store memories with type tags (fact, preference, experience, context)
 *   - Search by query (substring + type filter) with match scoring
 *   - Confidence scoring (recency + frequency boost)
 *   - Local fallback when MemoryOS unreachable
 *   - Sync queue tracking pending sync to MemoryOS
 *
 * Storage: file-backed JSON, one file per agent at data/agent-memory/<agentId>.json
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4811;
const SERVICE_NAME = 'agent-memory-bridge';
const VERSION = '1.0.0';
const DATA_DIR = process.env.AGENT_MEMORY_BRIDGE_DATA_DIR || path.join(__dirname, '../data');
const PARTITION_DIR = path.join(DATA_DIR, 'agent-memory');
const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';
const SYNC_TIMEOUT_MS = 2000;

const VALID_TYPES = ['fact', 'preference', 'experience', 'context'];
const RECENCY_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day
const RECENCY_DECAY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const FREQ_CAP = 0.3;
const TYPE_BOOST = 0.2;
const TAG_BOOST = 0.3;
const SUBSTRING_BASE = 0.5;

function ensureDir() { try { fs.mkdirSync(PARTITION_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function nowIso() { return new Date().toISOString(); }
function rid() { return crypto.randomBytes(8).toString('hex'); }
function memoryId() { return `mem_${rid()}`; }
function partitionPath(agentId) {
  // Sanitize: replace anything that's not a safe filename char with underscore
  const safe = String(agentId).replace(/[^a-zA-Z0-9_.-]/g, '_');
  return path.join(PARTITION_DIR, `${safe}.json`);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateMemory(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.agentId || typeof body.agentId !== 'string') errors.push('agentId required (string)');
  if (!body.type || !VALID_TYPES.includes(body.type)) {
    errors.push(`type must be one of ${VALID_TYPES.join(',')}`);
  }
  if (body.content === undefined || body.content === null || typeof body.content !== 'string' || body.content.length === 0) {
    errors.push('content required (non-empty string)');
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      errors.push('tags must be array when provided');
    } else if (body.tags.some((t) => typeof t !== 'string')) {
      errors.push('tags must contain only strings');
    }
  }
  if (body.confidence !== undefined) {
    if (typeof body.confidence !== 'number' || body.confidence < 0 || body.confidence > 1) {
      errors.push('confidence must be number in [0,1] when provided');
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Pure functions - memory normalization, confidence, scoring
// ---------------------------------------------------------------------------

function normalizeMemory(body, existing) {
  const now = nowIso();
  const tags = Array.isArray(body.tags)
    ? body.tags
    : (Array.isArray(existing?.tags) ? existing.tags : []);
  return {
    id: body.id || existing?.id || memoryId(),
    agentId: body.agentId || existing?.agentId,
    type: body.type || existing?.type,
    content: body.content !== undefined ? body.content : (existing?.content || ''),
    tags,
    confidence: body.confidence !== undefined ? body.confidence : (existing?.confidence ?? 0.5),
    accessCount: body.accessCount !== undefined ? body.accessCount : (existing?.accessCount || 0),
    lastAccessedAt: body.lastAccessedAt || existing?.lastAccessedAt || now,
    createdAt: existing?.createdAt || now,
    syncedToMemoryOS: existing?.syncedToMemoryOS ?? false,
    syncAttempts: existing?.syncAttempts || 0,
  };
}

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

function computeConfidence(memory, nowMs) {
  if (!memory || typeof memory !== 'object') return 0.5;
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  const base = typeof memory.confidence === 'number' ? memory.confidence : 0.5;

  // Recency boost: +0.1 if accessed within last day, decays linearly to 0 over 30 days
  const lastTs = memory.lastAccessedAt ? Date.parse(memory.lastAccessedAt) : null;
  let recencyBoost = 0;
  if (lastTs && !Number.isNaN(lastTs)) {
    const ageMs = Math.max(0, now - lastTs);
    if (ageMs <= RECENCY_WINDOW_MS) {
      recencyBoost = 0.1;
    } else if (ageMs < RECENCY_DECAY_MS) {
      const remaining = RECENCY_DECAY_MS - ageMs;
      const span = RECENCY_DECAY_MS - RECENCY_WINDOW_MS;
      recencyBoost = clamp(0.1 * (remaining / span), 0, 0.1);
    } else {
      recencyBoost = 0;
    }
  }

  // Frequency boost: +0.05 * log2(accessCount + 1), capped at 0.3
  const ac = typeof memory.accessCount === 'number' && memory.accessCount > 0 ? memory.accessCount : 0;
  const freqBoost = Math.min(FREQ_CAP, 0.05 * Math.log2(ac + 1));

  return clamp(base + recencyBoost + freqBoost, 0, 1);
}

function scoreMatch(memory, query, typeFilter, tagFilter) {
  if (!memory || typeof memory !== 'object') return 0;
  const q = (query || '').toString().toLowerCase().trim();
  if (!q) return 0;
  const content = (memory.content || '').toString().toLowerCase();
  const substringMatch = content.includes(q);
  if (!substringMatch) return 0;

  let score = SUBSTRING_BASE;
  if (typeFilter && memory.type === typeFilter) score += TYPE_BOOST;
  if (tagFilter) {
    const tags = Array.isArray(memory.tags) ? memory.tags : [];
    const tagMatch = tags.some((t) => String(t).toLowerCase() === String(tagFilter).toLowerCase());
    if (tagMatch) score += TAG_BOOST;
  }
  return score;
}

function searchByQuery(memories, query, typeFilter) {
  if (!Array.isArray(memories)) return [];
  let pool = memories;
  if (typeFilter) pool = filterByType(pool, typeFilter);
  const scored = pool
    .map((m) => ({ memory: m, score: scoreMatch(m, query, typeFilter) }))
    .filter((r) => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.map((r) => r.memory);
}

function filterByType(memories, type) {
  if (!Array.isArray(memories)) return [];
  if (!type) return memories;
  return memories.filter((m) => m && m.type === type);
}

function filterByTag(memories, tag) {
  if (!Array.isArray(memories)) return [];
  if (!tag) return memories;
  const lower = String(tag).toLowerCase();
  return memories.filter((m) => {
    if (!m || !Array.isArray(m.tags)) return false;
    return m.tags.some((t) => String(t).toLowerCase() === lower);
  });
}

function rankMemories(memories) {
  if (!Array.isArray(memories)) return [];
  return [...memories].sort((a, b) => {
    const ca = computeConfidence(a);
    const cb = computeConfidence(b);
    return cb - ca;
  });
}

function summarizeTypes(memories) {
  const out = { fact: 0, preference: 0, experience: 0, context: 0 };
  if (!Array.isArray(memories)) return out;
  for (const m of memories) {
    if (m && out[m.type] !== undefined) out[m.type] += 1;
  }
  return out;
}

function averageConfidence(memories) {
  if (!Array.isArray(memories) || memories.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const m of memories) {
    if (m && typeof computeConfidence(m) === 'number') {
      sum += computeConfidence(m);
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

// ---------------------------------------------------------------------------
// Storage - per-agent partition files
// ---------------------------------------------------------------------------

function ensurePartition(agentId) {
  if (!agentId) return null;
  ensureDir();
  const p = partitionPath(agentId);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify([], null, 2));
  }
  return p;
}

function loadMemories(agentId) {
  if (!agentId) return [];
  ensurePartition(agentId);
  const p = partitionPath(agentId);
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMemories(agentId, memories) {
  ensurePartition(agentId);
  const p = partitionPath(agentId);
  fs.writeFileSync(p, JSON.stringify(Array.isArray(memories) ? memories : [], null, 2));
}

function findMemory(memories, memoryId) {
  if (!Array.isArray(memories)) return null;
  return memories.find((m) => m && m.id === memoryId) || null;
}

function findMemoryIndex(memories, memoryId) {
  if (!Array.isArray(memories)) return -1;
  return memories.findIndex((m) => m && m.id === memoryId);
}

function listAll(memories) { return Array.isArray(memories) ? memories : []; }

// ---------------------------------------------------------------------------
// MemoryOS integration - non-blocking sync with timeout
// ---------------------------------------------------------------------------

async function syncToMemoryOS(memory) {
  if (!memory || typeof memory !== 'object') return { ok: false, reason: 'invalid' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  try {
    const res = await fetch(`${MEMORY_OS_URL}/api/memory/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: memory.agentId,
        content: memory.content,
        type: memory.type,
        tags: memory.tags || [],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: `status_${res.status}` };
    return { ok: true };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, reason: err?.name === 'AbortError' ? 'timeout' : 'network' };
  }
}

// Fire-and-forget sync; never await in the request path
function scheduleSync(agentId, memoryId) {
  setImmediate(async () => {
    try {
      const memories = loadMemories(agentId);
      const idx = findMemoryIndex(memories, memoryId);
      if (idx === -1) return;
      const result = await syncToMemoryOS(memories[idx]);
      const refreshed = loadMemories(agentId);
      const j = findMemoryIndex(refreshed, memoryId);
      if (j === -1) return;
      refreshed[j].syncAttempts = (refreshed[j].syncAttempts || 0) + 1;
      refreshed[j].syncedToMemoryOS = !!result.ok;
      saveMemories(agentId, refreshed);
    } catch (_) {
      // Swallow - local is source of truth
    }
  });
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

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

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// Health
app.get('/health', (_req, res) => res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// Create memory (auto-sync attempt to MemoryOS, fallback local)
app.post('/api/agents/:agentId/memories', requireInternal, (req, res) => {
  const errs = validateMemory({ ...req.body, agentId: req.params.agentId });
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const memories = loadMemories(req.params.agentId);
  const memory = normalizeMemory({ ...req.body, agentId: req.params.agentId }, null);
  memories.push(memory);
  saveMemories(req.params.agentId, memories);

  // Fire-and-forget sync to MemoryOS
  scheduleSync(req.params.agentId, memory.id);

  res.status(201).json(memory);
});

// List memories (filters: ?type=, ?tag=)
app.get('/api/agents/:agentId/memories', (req, res) => {
  let memories = loadMemories(req.params.agentId);
  if (req.query.type) memories = filterByType(memories, req.query.type);
  if (req.query.tag) memories = filterByTag(memories, req.query.tag);
  res.json({ agentId: req.params.agentId, count: memories.length, memories });
});

// IMPORTANT: specific routes must come BEFORE :memoryId
app.get('/api/agents/:agentId/memories/search', (req, res) => {
  let memories = loadMemories(req.params.agentId);
  const results = searchByQuery(memories, req.query.q, req.query.type);
  res.json({ agentId: req.params.agentId, query: req.query.q || '', count: results.length, memories: results });
});

app.get('/api/agents/:agentId/sync-queue', (req, res) => {
  const memories = loadMemories(req.params.agentId);
  const pending = memories.filter((m) => !m.syncedToMemoryOS);
  res.json({ agentId: req.params.agentId, count: pending.length, pending });
});

app.post('/api/agents/:agentId/recall', requireInternal, (req, res) => {
  const body = req.body || {};
  const memories = loadMemories(req.params.agentId);
  const results = searchByQuery(memories, body.q, body.type);
  const limit = Number.isInteger(body.limit) && body.limit > 0 ? body.limit : 5;
  const top = results.slice(0, limit);
  res.json({ agentId: req.params.agentId, query: body.q || '', count: top.length, memories: top });
});

app.get('/api/agents/:agentId/stats', (req, res) => {
  const memories = loadMemories(req.params.agentId);
  const byType = summarizeTypes(memories);
  const pendingSync = memories.filter((m) => !m.syncedToMemoryOS).length;
  const avgConfidence = averageConfidence(memories);
  res.json({
    agentId: req.params.agentId,
    total: memories.length,
    byType,
    pendingSync,
    avgConfidence,
  });
});

app.post('/api/agents/:agentId/memories/:memoryId/sync', requireInternal, (req, res) => {
  const memories = loadMemories(req.params.agentId);
  const idx = findMemoryIndex(memories, req.params.memoryId);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.memoryId });

  // Fire-and-forget retry
  scheduleSync(req.params.agentId, req.params.memoryId);
  res.json({ ...memories[idx], retryQueued: true });
});

// Get one (updates lastAccessedAt + accessCount)
app.get('/api/agents/:agentId/memories/:memoryId', (req, res) => {
  const memories = loadMemories(req.params.agentId);
  const idx = findMemoryIndex(memories, req.params.memoryId);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.memoryId });
  memories[idx].accessCount = (memories[idx].accessCount || 0) + 1;
  memories[idx].lastAccessedAt = nowIso();
  saveMemories(req.params.agentId, memories);
  res.json(memories[idx]);
});

// Update (content/tags/confidence)
app.patch('/api/agents/:agentId/memories/:memoryId', requireInternal, (req, res) => {
  const memories = loadMemories(req.params.agentId);
  const idx = findMemoryIndex(memories, req.params.memoryId);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.memoryId });

  const body = req.body || {};
  // Only content/tags/confidence are mutable per spec
  if (body.content !== undefined) {
    if (typeof body.content !== 'string' || body.content.length === 0) {
      return res.status(400).json({ error: 'validation', details: ['content must be non-empty string'] });
    }
    memories[idx].content = body.content;
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.some((t) => typeof t !== 'string')) {
      return res.status(400).json({ error: 'validation', details: ['tags must be array of strings'] });
    }
    memories[idx].tags = body.tags;
  }
  if (body.confidence !== undefined) {
    if (typeof body.confidence !== 'number' || body.confidence < 0 || body.confidence > 1) {
      return res.status(400).json({ error: 'validation', details: ['confidence must be in [0,1]'] });
    }
    memories[idx].confidence = body.confidence;
  }
  saveMemories(req.params.agentId, memories);
  res.json(memories[idx]);
});

// Delete
app.delete('/api/agents/:agentId/memories/:memoryId', requireInternal, (req, res) => {
  const memories = loadMemories(req.params.agentId);
  const idx = findMemoryIndex(memories, req.params.memoryId);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.memoryId });
  const [removed] = memories.splice(idx, 1);
  saveMemories(req.params.agentId, memories);
  res.json({ deleted: true, memory: removed });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

if (require.main === module) {
  app.listen(PORT, () => {
    ensureDir();
    console.log(`${SERVICE_NAME} listening on :${PORT}`);
  });
}

module.exports = {
  app,
  PORT, SERVICE_NAME, VERSION,
  DATA_DIR, PARTITION_DIR, MEMORY_OS_URL, SYNC_TIMEOUT_MS,
  VALID_TYPES, RECENCY_WINDOW_MS, RECENCY_DECAY_MS, FREQ_CAP,
  TYPE_BOOST, TAG_BOOST, SUBSTRING_BASE,
  validateMemory, normalizeMemory, computeConfidence, scoreMatch,
  searchByQuery, filterByType, filterByTag, rankMemories,
  summarizeTypes, averageConfidence,
  ensurePartition, loadMemories, saveMemories, findMemory, listAll,
  syncToMemoryOS,
};