/**
 * Memory Lifecycle Management API (port 4900)
 *
 * Full memory lifecycle: TTL → archival → deduplication → compression → GDPR.
 * Self-contained CommonJS — no external shared lib dependencies.
 *
 * Architecture:
 *   - memories: registry of all memories with TTL, archive, dedup metadata
 *   - policies: lifecycle policies per memory type
 *   - conflicts: conflict resolution records
 *   - analytics: storage/count/cost analytics
 *
 * @phase Phase 39
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.env.PORT, 10) || 4900;
const SERVICE_NAME = 'memory-lifecycle-api';
const VERSION = '1.0.0';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-dev-token';
const REQUIRE_AUTH = (process.env.SERVICE_REQUIRE_AUTH || 'true').toLowerCase() !== 'false';
const NO_LISTEN = (process.env.SERVICE_NO_LISTEN ?? '').toLowerCase() === 'true' || process.env.NODE_ENV === 'test';

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function authOrBypass(req, res, next) {
  if (REQUIRE_AUTH && req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} memoryId → memory */
const memories = new Map();

/** @type {Map<string, object>} policyId → policy */
const policies = new Map();

/** @type {Map<string, object>} conflictId → conflict */
const conflicts = new Map();

/** @type {Map<string, object>} archiveId → archivedRecord */
const archive = new Map();

const AUDIT_CAP = 5000;
const auditLog = [];

const stats = {
  memoriesCreated: 0,
  memoriesExpired: 0,
  memoriesArchived: 0,
  memoriesRestored: 0,
  memoriesPurged: 0,
  duplicatesMerged: 0,
  conflictsResolved: 0,
  gdprRequests: 0,
  errors: 0
};

const startedAt = new Date().toISOString();

// ---------------------------------------------------------------------------
// Seed default policies
// ---------------------------------------------------------------------------

(function seedPolicies() {
  const defaultPolicies = [
    {
      id: 'policy-ttl-working',
      name: 'Working Memory TTL',
      type: 'ttl',
      action: 'retain',
      retentionDays: 1,
      memoryTypes: ['working_memory', 'session'],
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'policy-ttl-short-term',
      name: 'Short-term Memory TTL',
      type: 'ttl',
      action: 'retain',
      retentionDays: 30,
      memoryTypes: ['short_term', 'context'],
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'policy-ttl-long-term',
      name: 'Long-term Memory TTL',
      type: 'ttl',
      action: 'retain',
      retentionDays: 365,
      memoryTypes: ['long_term', 'knowledge'],
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'policy-archive-90d',
      name: 'Archive After 90 Days',
      type: 'archive',
      action: 'archive',
      retentionDays: 90,
      memoryTypes: ['short_term', 'context', 'conversation'],
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'policy-dedup-default',
      name: 'Deduplication Policy',
      type: 'dedup',
      action: 'retain',
      similarityThreshold: 0.90,
      autoMerge: false,
      memoryTypes: ['knowledge', 'fact', 'preference'],
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ];
  for (const p of defaultPolicies) {
    policies.set(p.id, p);
  }
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function principalOf(req) {
  return req.headers['x-actor'] || req.headers['x-principal'] || 'anonymous';
}

function audit(entry) {
  const record = { ...entry, ts: new Date().toISOString(), actor: principalOf(entry._req || {}) };
  delete record._req;
  auditLog.push(record);
  if (auditLog.length > AUDIT_CAP) auditLog.splice(0, auditLog.length - AUDIT_CAP);
}

function isExpired(memory) {
  if (!memory.expiresAt) return false;
  return new Date(memory.expiresAt) < new Date();
}

function getByPolicy(memoryType) {
  const results = [];
  for (const p of policies.values()) {
    if (p.status !== 'active') continue;
    if (p.memoryTypes && p.memoryTypes.includes(memoryType)) {
      results.push(p);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();
app.use(helmet());
app.use(cors('*'));
app.use(express.json({ limit: '10mb' }));

// Readiness probe FIRST
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/health', (_req, res) => res.redirect(301, '/api/health'));

/** GET /api/health */
app.get('/api/health', (_req, res) => {
  const expiredCount = Array.from(memories.values()).filter(isExpired).length;
  const archivedCount = archive.size;
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: String(PORT),
    version: VERSION,
    counts: {
      memories: memories.size,
      policies: policies.size,
      conflicts: conflicts.size,
      archived: archivedCount,
      expired: expiredCount
    },
    stats,
    uptime: process.uptime(),
    startedAt,
    timestamp: new Date().toISOString()
  });
});

// ===============================
// MEMORIES CRUD
// ===============================

/** POST /api/memories — Create a memory */
app.post('/api/memories', authOrBypass, (req, res) => {
  const { memoryType, content, entityId, ttlDays, metadata, tags } = req.body || {};

  if (!memoryType || typeof memoryType !== 'string') {
    return res.status(400).json({ error: 'memoryType (string) is required' });
  }
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content (string) is required' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  // Auto-apply TTL from policy if not specified
  let expiresAt = null;
  if (ttlDays !== undefined && ttlDays !== null) {
    expiresAt = new Date(Date.now() + ttlDays * 86400 * 1000).toISOString();
  } else {
    const matchingPolicies = getByPolicy(memoryType).filter(p => p.type === 'ttl' && p.retentionDays);
    if (matchingPolicies.length > 0) {
      const p = matchingPolicies[0];
      expiresAt = new Date(Date.now() + p.retentionDays * 86400 * 1000).toISOString();
    }
  }

  const memory = {
    id,
    memoryType,
    content,
    entityId: entityId || null,
    metadata: (metadata && typeof metadata === 'object') ? metadata : {},
    tags: Array.isArray(tags) ? tags : [],
    status: 'active', // active | archived | expired | purged
    expiresAt,
    archivedAt: null,
    purgedAt: null,
    confidence: 1.0,
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: principalOf(req)
  };

  memories.set(id, memory);
  stats.memoriesCreated++;

  audit({ _req: req, op: 'memory.create', memoryId: id, memoryType });

  res.status(201).json({ message: 'Memory created', memory });
});

/** GET /api/memories — List memories */
app.get('/api/memories', (req, res) => {
  const { memoryType, entityId, status, expiring, limit, offset } = req.query;
  let list = Array.from(memories.values());

  if (memoryType) list = list.filter(m => m.memoryType === memoryType);
  if (entityId) list = list.filter(m => m.entityId === entityId);
  if (status) list = list.filter(m => m.status === status);
  if (expiring === 'true') {
    const threshold = new Date(Date.now() + 7 * 86400 * 1000);
    list = list.filter(m => m.expiresAt && new Date(m.expiresAt) < threshold && m.status === 'active');
  }

  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const off = parseInt(offset) || 0;
  const lim = Math.min(parseInt(limit) || 50, 500);
  const page = list.slice(off, off + lim);

  res.json({ count: list.length, limit: lim, offset: off, memories: page });
});

/** GET /api/memories/expiring — List memories expiring soon */
app.get('/api/memories/expiring', (req, res) => {
  const { days = 7 } = req.query;
  const threshold = new Date(Date.now() + parseInt(days) * 86400 * 1000);
  const list = Array.from(memories.values())
    .filter(m => m.expiresAt && new Date(m.expiresAt) < threshold && m.status === 'active')
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  res.json({ count: list.length, memories: list });
});

/** GET /api/memories/:id — Get one memory */
app.get('/api/memories/:id', (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Memory not found' });
  res.json({ memory: m });
});

/** PUT /api/memories/:id — Update memory */
app.put('/api/memories/:id', authOrBypass, (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Memory not found' });

  const { content, metadata, tags, expiresAt } = req.body || {};

  if (content !== undefined) m.content = content;
  if (metadata && typeof metadata === 'object') m.metadata = { ...m.metadata, ...metadata };
  if (Array.isArray(tags)) m.tags = tags;
  if (expiresAt !== undefined) m.expiresAt = expiresAt;
  m.version++;
  m.updatedAt = new Date().toISOString();

  audit({ _req: req, op: 'memory.update', memoryId: m.id });

  res.json({ message: 'Memory updated', memory: m });
});

/** DELETE /api/memories/:id — Delete memory */
app.delete('/api/memories/:id', authOrBypass, (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Memory not found' });

  memories.delete(m.id);
  audit({ _req: req, op: 'memory.delete', memoryId: m.id, memoryType: m.memoryType });

  res.json({ message: 'Memory deleted', id: m.id });
});

/** POST /api/memories/:id/extend — Extend TTL */
app.post('/api/memories/:id/extend', authOrBypass, (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Memory not found' });

  const { days } = req.body || {};
  if (typeof days !== 'number' || days <= 0) {
    return res.status(400).json({ error: 'days (positive number) is required' });
  }

  const currentExpiry = m.expiresAt ? new Date(m.expiresAt) : new Date();
  m.expiresAt = new Date(currentExpiry.getTime() + days * 86400 * 1000).toISOString();
  m.updatedAt = new Date().toISOString();

  audit({ _req: req, op: 'memory.extend', memoryId: m.id, extendedDays: days });

  res.json({ message: 'Memory TTL extended', memory: m });
});

// ===============================
// ARCHIVE / RESTORE
// ===============================

/** POST /api/archive — Archive memories older than threshold */
app.post('/api/archive', authOrBypass, (req, res) => {
  const { daysOld = 90, memoryType } = req.body || {};
  const threshold = new Date(Date.now() - parseInt(daysOld) * 86400 * 1000);

  let candidates = Array.from(memories.values())
    .filter(m => m.status === 'active' && new Date(m.createdAt) < threshold);

  if (memoryType) candidates = candidates.filter(m => m.memoryType === memoryType);

  const archived = [];
  for (const m of candidates) {
    m.status = 'archived';
    m.archivedAt = new Date().toISOString();
    const record = { ...m };
    archive.set(m.id, record);
    stats.memoriesArchived++;
    archived.push(m.id);
  }

  audit({ _req: req, op: 'archive.run', count: archived.length, daysOld, memoryType: memoryType || 'all' });

  res.json({ message: 'Archive complete', archivedCount: archived.length, archivedIds: archived });
});

/** POST /api/memories/:id/restore — Restore from archive */
app.post('/api/memories/:id/restore', authOrBypass, (req, res) => {
  const m = memories.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Memory not found' });
  if (m.status !== 'archived') {
    return res.status(400).json({ error: 'Can only restore archived memories' });
  }

  m.status = 'active';
  m.archivedAt = null;
  m.updatedAt = new Date().toISOString();
  archive.delete(m.id);
  stats.memoriesRestored++;

  audit({ _req: req, op: 'memory.restore', memoryId: m.id });

  res.json({ message: 'Memory restored', memory: m });
});

/** GET /api/archive — List archived memories */
app.get('/api/archive', (req, res) => {
  const { memoryType, limit, offset } = req.query;
  let list = Array.from(archive.values());
  if (memoryType) list = list.filter(m => m.memoryType === memoryType);
  list.sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));

  const off = parseInt(offset) || 0;
  const lim = Math.min(parseInt(limit) || 50, 500);
  res.json({ count: list.length, archived: list.slice(off, off + lim) });
});

// ===============================
// DEDUPLICATION
// ===============================

/** POST /api/dedup — Find duplicate memories */
app.post('/api/dedup', authOrBypass, (req, res) => {
  const { memoryType, similarityThreshold = 0.9, entityId } = req.body || {};

  let candidates = Array.from(memories.values()).filter(m => m.status === 'active');
  if (memoryType) candidates = candidates.filter(m => m.memoryType === memoryType);
  if (entityId) candidates = candidates.filter(m => m.entityId === entityId);

  // Simple similarity: same memoryType + overlapping tags + similar content length
  const duplicates = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i], b = candidates[j];
      if (a.memoryType !== b.memoryType) continue;

      // Compute simple similarity
      const lenA = a.content.length, lenB = b.content.length;
      const lenSim = lenA && lenB ? 1 - Math.abs(lenA - lenB) / Math.max(lenA, lenB) : 0;
      const tagOverlap = a.tags.length > 0 && b.tags.length > 0
        ? a.tags.filter(t => b.tags.includes(t)).length / Math.max(a.tags.length, b.tags.length)
        : 0.5;
      const similarity = lenSim * 0.6 + tagOverlap * 0.4;

      if (similarity >= parseFloat(similarityThreshold)) {
        duplicates.push({
          memoryA: { id: a.id, content: a.content.slice(0, 100), memoryType: a.memoryType },
          memoryB: { id: b.id, content: b.content.slice(0, 100), memoryType: b.memoryType },
          similarity: +similarity.toFixed(4)
        });
      }
    }
  }

  audit({ _req: req, op: 'dedup.find', found: duplicates.length, threshold: parseFloat(similarityThreshold) });

  res.json({ count: duplicates.length, duplicates });
});

/** POST /api/dedup/merge — Merge duplicate memories */
app.post('/api/dedup/merge', authOrBypass, (req, res) => {
  const { keepId, mergeIds } = req.body || {};

  if (!keepId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
    return res.status(400).json({ error: 'keepId and mergeIds (array) are required' });
  }

  const keeper = memories.get(keepId);
  if (!keeper) return res.status(404).json({ error: 'Keep memory not found' });

  const merged = [];
  for (const id of mergeIds) {
    const m = memories.get(id);
    if (!m || m.id === keepId) continue;
    if (m.memoryType !== keeper.memoryType) continue;

    // Merge tags
    for (const t of m.tags) {
      if (!keeper.tags.includes(t)) keeper.tags.push(t);
    }
    // Take newer metadata
    if (m.metadata && typeof m.metadata === 'object') {
      keeper.metadata = { ...keeper.metadata, ...m.metadata };
    }
    merged.push(id);
    memories.delete(id);
  }

  keeper.version++;
  keeper.updatedAt = new Date().toISOString();
  stats.duplicatesMerged += merged.length;

  audit({ _req: req, op: 'dedup.merge', keepId, mergedIds: merged });

  res.json({ message: 'Merge complete', keepId, mergedCount: merged.length });
});

/** GET /api/dedup/stats — Deduplication stats */
app.get('/api/dedup/stats', (_req, res) => {
  const byType = {};
  for (const m of memories.values()) {
    if (!byType[m.memoryType]) byType[m.memoryType] = 0;
    byType[m.memoryType]++;
  }

  res.json({
    totalMemories: memories.size,
    byMemoryType: byType,
    archivedMemories: archive.size,
    duplicatesMerged: stats.duplicatesMerged
  });
});

// ===============================
// CONFLICT RESOLUTION
// ===============================

/** POST /api/conflicts — Create/report a conflict */
app.post('/api/conflicts', authOrBypass, (req, res) => {
  const { memoryIdA, memoryIdB, conflictType, resolution } = req.body || {};

  if (!memoryIdA || !memoryIdB) {
    return res.status(400).json({ error: 'memoryIdA and memoryIdB are required' });
  }

  const id = uuidv4();
  const conflict = {
    id,
    memoryIdA,
    memoryIdB,
    conflictType: conflictType || 'contradiction',
    resolution: resolution || 'pending',
    resolvedAt: resolution ? new Date().toISOString() : null,
    resolvedBy: resolution ? principalOf(req) : null,
    createdAt: new Date().toISOString()
  };

  conflicts.set(id, conflict);
  audit({ _req: req, op: 'conflict.create', conflictId: id });

  res.status(201).json({ message: 'Conflict recorded', conflict });
});

/** GET /api/conflicts — List conflicts */
app.get('/api/conflicts', (req, res) => {
  const { resolution } = req.query;
  let list = Array.from(conflicts.values());
  if (resolution) list = list.filter(c => c.resolution === resolution);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json({ count: list.length, conflicts: list });
});

/** POST /api/conflicts/:id/resolve — Resolve a conflict */
app.post('/api/conflicts/:id/resolve', authOrBypass, (req, res) => {
  const c = conflicts.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Conflict not found' });

  const { resolution } = req.body || {};
  if (!resolution || !['keep_a', 'keep_b', 'merge', 'delete_both'].includes(resolution)) {
    return res.status(400).json({ error: 'resolution must be one of: keep_a, keep_b, merge, delete_both' });
  }

  c.resolution = resolution;
  c.resolvedAt = new Date().toISOString();
  c.resolvedBy = principalOf(req);
  stats.conflictsResolved++;

  audit({ _req: req, op: 'conflict.resolve', conflictId: c.id, resolution });

  res.json({ message: 'Conflict resolved', conflict: c });
});

// ===============================
// GDPR
// ===============================

/** POST /api/gdpr/delete — GDPR right to be forgotten */
app.post('/api/gdpr/delete', authOrBypass, (req, res) => {
  const { entityId } = req.body || {};
  if (!entityId) return res.status(400).json({ error: 'entityId is required' });

  const deleted = [];
  for (const [id, m] of memories) {
    if (m.entityId === entityId) {
      memories.delete(id);
      archive.delete(id);
      deleted.push(id);
    }
  }

  stats.gdprRequests++;
  audit({ _req: req, op: 'gdpr.delete', entityId, deletedCount: deleted.length });

  res.json({ message: 'GDPR deletion complete', entityId, deletedCount: deleted.length });
});

/** POST /api/gdpr/anonymize — Anonymize user data */
app.post('/api/gdpr/anonymize', authOrBypass, (req, res) => {
  const { entityId } = req.body || {};
  if (!entityId) return res.status(400).json({ error: 'entityId is required' });

  const anonymized = [];
  for (const [id, m] of memories) {
    if (m.entityId === entityId) {
      m.content = '[REDACTED]';
      m.metadata = {};
      m.entityId = null;
      m.updatedAt = new Date().toISOString();
      anonymized.push(id);
    }
  }

  stats.gdprRequests++;
  audit({ _req: req, op: 'gdpr.anonymize', entityId, anonymizedCount: anonymized.length });

  res.json({ message: 'Anonymization complete', entityId, anonymizedCount: anonymized.length });
});

/** POST /api/gdpr/export — Export all user data */
app.post('/api/gdpr/export', authOrBypass, (req, res) => {
  const { entityId } = req.body || {};
  if (!entityId) return res.status(400).json({ error: 'entityId is required' });

  const userMemories = Array.from(memories.values()).filter(m => m.entityId === entityId);

  audit({ _req: req, op: 'gdpr.export', entityId, exportedCount: userMemories.length });

  res.json({
    entityId,
    exportedAt: new Date().toISOString(),
    memoryCount: userMemories.length,
    memories: userMemories
  });
});

/** GET /api/gdpr/audit — GDPR audit log */
app.get('/api/gdpr/audit', (req, res) => {
  const entries = auditLog.filter(e => e.op && e.op.startsWith('gdpr.'));
  res.json({ count: entries.length, entries });
});

// ===============================
// POLICIES CRUD
// ===============================

/** GET /api/policies — List policies */
app.get('/api/policies', (req, res) => {
  const { type, status } = req.query;
  let list = Array.from(policies.values());
  if (type) list = list.filter(p => p.type === type);
  if (status) list = list.filter(p => p.status === status);
  res.json({ count: list.length, policies: list });
});

/** POST /api/policies — Create policy */
app.post('/api/policies', authOrBypass, (req, res) => {
  const { name, type, action, retentionDays, memoryTypes, similarityThreshold, autoMerge } = req.body || {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name (string) is required' });
  }
  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'type (string) is required' });
  }

  const id = uuidv4();
  const policy = {
    id,
    name,
    type,
    action: action || 'retain',
    retentionDays: retentionDays || null,
    memoryTypes: Array.isArray(memoryTypes) ? memoryTypes : [],
    similarityThreshold: similarityThreshold || null,
    autoMerge: autoMerge !== undefined ? autoMerge : false,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  policies.set(id, policy);
  audit({ _req: req, op: 'policy.create', policyId: id, name });

  res.status(201).json({ message: 'Policy created', policy });
});

/** PUT /api/policies/:id — Update policy */
app.put('/api/policies/:id', authOrBypass, (req, res) => {
  const p = policies.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Policy not found' });

  const { name, action, retentionDays, memoryTypes, similarityThreshold, autoMerge, status } = req.body || {};

  if (name !== undefined) p.name = name;
  if (action !== undefined) p.action = action;
  if (retentionDays !== undefined) p.retentionDays = retentionDays;
  if (Array.isArray(memoryTypes)) p.memoryTypes = memoryTypes;
  if (similarityThreshold !== undefined) p.similarityThreshold = similarityThreshold;
  if (autoMerge !== undefined) p.autoMerge = autoMerge;
  if (status !== undefined) p.status = status;

  audit({ _req: req, op: 'policy.update', policyId: p.id });

  res.json({ message: 'Policy updated', policy: p });
});

/** DELETE /api/policies/:id — Delete policy */
app.delete('/api/policies/:id', authOrBypass, (req, res) => {
  const p = policies.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Policy not found' });
  policies.delete(req.params.id);
  audit({ _req: req, op: 'policy.delete', policyId: req.params.id });
  res.json({ message: 'Policy deleted', id: req.params.id });
});

// ===============================
// ANALYTICS
// ===============================

/** GET /api/analytics/count — Memory counts by type */
app.get('/api/analytics/count', (_req, res) => {
  const byType = {};
  const byStatus = {};
  for (const m of memories.values()) {
    byType[m.memoryType] = (byType[m.memoryType] || 0) + 1;
    byStatus[m.status] = (byStatus[m.status] || 0) + 1;
  }

  res.json({
    total: memories.size,
    byMemoryType: byType,
    byStatus
  });
});

/** GET /api/analytics/storage — Storage estimates */
app.get('/api/analytics/storage', (_req, res) => {
  let totalChars = 0;
  for (const m of memories.values()) {
    totalChars += m.content.length;
  }

  const hotBytes = totalChars * 2; // rough UTF-16 estimate
  const coldBytes = Array.from(archive.values()).reduce((s, m) => s + (m.content?.length || 0) * 2, 0);

  res.json({
    estimatedHotBytes: hotBytes,
    estimatedColdBytes: coldBytes,
    estimatedTotalBytes: hotBytes + coldBytes,
    activeMemories: memories.size,
    archivedMemories: archive.size
  });
});

/** GET /api/analytics/stale — Stale memories (not accessed) */
app.get('/api/analytics/stale', (req, res) => {
  const { days = 90 } = req.query;
  const threshold = new Date(Date.now() - parseInt(days) * 86400 * 1000);
  const stale = Array.from(memories.values())
    .filter(m => m.status === 'active' && new Date(m.updatedAt) < threshold)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

  res.json({ count: stale.length, memories: stale.slice(0, 100) });
});

// ===============================
// STATS & AUDIT
// ===============================

/** GET /api/stats */
app.get('/api/stats', (_req, res) => {
  res.json({
    ...stats,
    totalMemories: memories.size,
    archivedMemories: archive.size,
    totalPolicies: policies.size,
    totalConflicts: conflicts.size,
    auditEntries: auditLog.length,
    uptime: process.uptime(),
    startedAt
  });
});

/** POST /api/stats/reset */
app.post('/api/stats/reset', authOrBypass, (req, res) => {
  for (const k of Object.keys(stats)) stats[k] = 0;
  res.json({ message: 'Stats reset', stats });
});

/** GET /api/audit */
app.get('/api/audit', (req, res) => {
  const { op, limit } = req.query;
  let list = auditLog.slice();
  if (op) list = list.filter(e => e.op === op);
  const lim = Math.min(parseInt(limit) || 200, 1000);
  res.json({ count: list.length, entries: list.slice(-lim) });
});

// ===============================
// ERROR HANDLERS
// ===============================

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }));
app.use((err, _req, res, _next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  stats.errors++;
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = app;
module.exports.PORT = PORT;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.VERSION = VERSION;
module.exports.REQUIRE_AUTH = REQUIRE_AUTH;
module.exports.memories = memories;
module.exports.policies = policies;
module.exports.conflicts = conflicts;
module.exports.archive = archive;
module.exports.stats = stats;
module.exports.auditLog = auditLog;
module.exports.authOrBypass = authOrBypass;
module.exports.requireInternal = requireInternal;

if (require.main === module && !NO_LISTEN) {
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on port ${PORT}`);
    console.log(`[${SERVICE_NAME}] health: http://localhost:${PORT}/api/health`);
  });
  process.on('SIGTERM', () => { console.log(`[${SERVICE_NAME}] SIGTERM`); server.close(() => process.exit(0)); });
  process.on('SIGINT', () => { console.log(`[${SERVICE_NAME}] SIGINT`); server.close(() => process.exit(0)); });
}
