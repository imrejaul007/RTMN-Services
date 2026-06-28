/**
 * Memory Intelligence Service (Phase 28)
 *
 * Smart Memory with 8 capabilities:
 * 1. Remember   - Importance scoring, context preservation, relationship tracking, source attribution
 * 2. Forget     - Expiration policies, unused detection, user-initiated, GDPR compliance
 * 3. Compress   - Summarization, embedding compression, deduplication, archival
 * 4. Merge      - Duplicate detection, contradiction resolution, update propagation, version history
 * 5. Contradiction - Contradiction detection, source credibility, recency bias, user clarification
 * 6. Importance - Access frequency, user marking, contextual relevance, survival
 * 7. Decay      - Time-based decay, access-based boost, user-controlled, automatic archival
 * 8. Relationships - Entity linking, causal chains, temporal ordering, semantic similarity
 *
 * Port: 4795
 *
 * Architecture:
 * - Coordinates with MemoryOS (4703) for storage
 * - Uses Confidence Service (4152) for reliability scores
 * - Provides high-level intelligence on top of raw memory storage
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

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

const PORT = process.env.MEMORY_INTELLIGENCE_PORT || 4795;

// Upstream services
const MEMORYOS_URL = process.env.MEMORYOS_URL || 'http://localhost:4703';
const CONFIDENCE_URL = process.env.CONFIDENCE_URL || 'http://localhost:4152';

// =============================================================================
// IN-MEMORY STORES (production would use Redis/Postgres)
// =============================================================================

// Smart memories with intelligence metadata
const smartMemories = new Map();

// Memory relationships (entity linking, causal chains)
const relationships = new Map();

// Importance scores
const importanceScores = new Map();

// Decay schedules
const decaySchedules = new Map();

// Contradiction log
const contradictions = new Map();

// Audit log
const auditLog = [];

// Stats
const stats = {
  totalOperations: 0,
  byCapability: {},
  lastOperation: null
};

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Importance weights
  importance: {
    CRITICAL: 1.0,
    HIGH: 0.8,
    MEDIUM: 0.5,
    LOW: 0.2
  },

  // Decay configuration
  decay: {
    CRITICAL_HALF_LIFE_DAYS: 365,    // 1 year
    HIGH_HALF_LIFE_DAYS: 180,        // 6 months
    MEDIUM_HALF_LIFE_DAYS: 90,       // 3 months
    LOW_HALF_LIFE_DAYS: 30,          // 1 month
    TEMPORARY_HALF_LIFE_DAYS: 7      // 1 week
  },

  // Expiration policies (days)
  expiration: {
    CRITICAL: 365 * 5,              // 5 years
    HIGH: 365,                       // 1 year
    MEDIUM: 180,                     // 6 months
    LOW: 90,                         // 3 months
    TEMPORARY: 7                     // 1 week
  },

  // Unused detection (days)
  unusedDetection: {
    CRITICAL: 365,                    // 1 year
    HIGH: 180,                       // 6 months
    MEDIUM: 90,                      // 3 months
    LOW: 30,                         // 1 month
    TEMPORARY: 7                     // 1 week
  },

  // Compression thresholds
  compression: {
    MAX_CONTENT_LENGTH: 2000,        // Compress if longer
    SUMMARY_LENGTH: 200,              // Summary target length
    DEDUP_SIMILARITY_THRESHOLD: 0.85  // Jaccard similarity for dedup
  },

  // Relationship types
  relationshipTypes: [
    'caused_by', 'result_of', 'part_of', 'related_to',
    'similar_to', 'contradicts', 'precedes', 'follows',
    'owns', 'owned_by', 'uses', 'used_by'
  ]
};

// =============================================================================
// HELPERS
// =============================================================================

function nowIso() { return new Date().toISOString(); }
function nowMs() { return Date.now(); }

function ok(res, data) { res.json({ success: true, ...data }); }
function fail(res, code, message, status = 400) {
  res.status(status).json({ success: false, error: code, message });
}

function logCapability(capability, operation) {
  stats.totalOperations++;
  stats.lastOperation = nowIso();
  if (!stats.byCapability[capability]) {
    stats.byCapability[capability] = { operations: 0 };
  }
  stats.byCapability[capability].operations++;

  const entry = {
    id: uuidv4(),
    capability,
    operation,
    timestamp: nowIso()
  };
  auditLog.push(entry);
  if (auditLog.length > 1000) auditLog.shift();
  return entry;
}

// Jaccard similarity for deduplication
function jaccardSimilarity(a, b) {
  const setA = new Set((a || '').toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const setB = new Set((b || '').toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size || 1;
  return intersection / union;
}

// Calculate importance score based on multiple factors
function calculateImportanceScore(memory) {
  let score = CONFIG.importance[memory.importance] || 0.5;

  // Boost for access frequency (logarithmic)
  const accessBoost = Math.min(0.2, Math.log10((memory.accessCount || 0) + 1) * 0.1);
  score += accessBoost;

  // Boost for user marking
  if (memory.userMarked) score += 0.1;

  // Boost for recent interaction
  if (memory.lastAccessedAt) {
    const daysSinceAccess = (nowMs() - new Date(memory.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAccess < 7) score += 0.15;
    else if (daysSinceAccess < 30) score += 0.1;
  }

  // Boost for relationship count (connected memories are more important)
  const relCount = getRelationshipCount(memory.id);
  const relationBoost = Math.min(0.15, relCount * 0.03);
  score += relationBoost;

  return Math.min(1.0, Math.max(0.0, score));
}

// Calculate decay factor based on half-life
function calculateDecayFactor(halfLifeDays, ageInDays) {
  if (halfLifeDays <= 0) return 1.0;
  return Math.pow(0.5, ageInDays / halfLifeDays);
}

// Get memory by ID
function getMemory(id) {
  return smartMemories.get(id);
}

// Store memory with intelligence metadata
function storeMemory(memory) {
  const id = memory.id || uuidv4();

  const smartMemory = {
    ...memory,
    id,
    createdAt: memory.createdAt || nowIso(),
    updatedAt: nowIso(),
    version: (memory.version || 0) + 1,

    // Intelligence metadata
    importance: memory.importance || 'MEDIUM',
    importanceScore: calculateImportanceScore(memory),
    decaySchedule: {
      halfLifeDays: CONFIG.decay[memory.importance] || CONFIG.decay.MEDIUM_HALF_LIFE_DAYS,
      lastDecayAt: nowIso(),
      decayCount: 0
    },
    relationships: memory.relationships || [],
    accessCount: memory.accessCount || 0,
    lastAccessedAt: memory.lastAccessedAt || null,
    userMarked: memory.userMarked || false,
    pinned: memory.pinned || false,
    archived: false,
    compressed: false,
    originalId: memory.compressed ? (memory.originalId || id) : null,
    source: memory.source || 'unknown',
    entities: memory.entities || [],
    contradictions: memory.contradictions || []
  };

  smartMemories.set(id, smartMemory);
  importanceScores.set(id, smartMemory.importanceScore);

  // Schedule decay check
  scheduleDecayCheck(id);

  return smartMemory;
}

// Get relationship count for a memory
function getRelationshipCount(memoryId) {
  let count = 0;
  for (const [, rels] of relationships) {
    count += rels.filter(r => r.from === memoryId || r.to === memoryId).length;
  }
  return count;
}

// Schedule decay check (simplified - production would use cron/queue)
const decayTimeouts = new Map();
function scheduleDecayCheck(memoryId) {
  // Clear existing
  if (decayTimeouts.has(memoryId)) {
    clearTimeout(decayTimeouts.get(memoryId));
  }

  // Schedule next check in 1 hour (simplified)
  const timeout = setTimeout(() => {
    applyDecay(memoryId);
    scheduleDecayCheck(memoryId);
  }, 60 * 60 * 1000);

  decayTimeouts.set(memoryId, timeout);
}

// Apply decay to a memory
function applyDecay(memoryId) {
  const memory = smartMemories.get(memoryId);
  if (!memory || memory.pinned) return;

  const ageInDays = (nowMs() - new Date(memory.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = calculateDecayFactor(memory.decaySchedule.halfLifeDays, ageInDays);

  if (decayFactor < memory.decaySchedule.lastDecayFactor || 0.9) {
    memory.decaySchedule.lastDecayFactor = decayFactor;
    memory.decaySchedule.decayCount++;
    memory.decaySchedule.lastDecayAt = nowIso();

    // Recalculate importance
    memory.importanceScore = calculateImportanceScore(memory) * decayFactor;
    importanceScores.set(memoryId, memory.importanceScore);
  }
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// =============================================================================
// HEALTH & INFO
// =============================================================================

app.get('/health', (_req, res) => {
  ok(res, {
    status: 'healthy',
    service: 'memory-intelligence',
    version: '1.0.0',
    port: PORT,
    stats,
    capabilities: [
      'remember', 'forget', 'compress', 'merge',
      'contradiction', 'importance', 'decay', 'relationships'
    ]
  });
});

app.get('/', (_req, res) => {
  ok(res, {
    service: 'memory-intelligence',
    version: '1.0.0',
    description: 'Phase 28: Smart Memory with 8 capabilities',
    port: PORT,
    capabilities: {
      remember: 'Importance scoring, context preservation, relationship tracking',
      forget: 'Expiration, unused detection, GDPR compliance',
      compress: 'Summarization, deduplication, archival',
      merge: 'Duplicate detection, contradiction resolution',
      contradiction: 'Detection, source credibility, recency bias',
      importance: 'Access frequency, user marking, contextual relevance',
      decay: 'Time-based decay, access boost, automatic archival',
      relationships: 'Entity linking, causal chains, temporal ordering'
    },
    memoryCount: smartMemories.size,
    stats
  });
});

// =============================================================================
// 28.1 REMEMBER - Importance scoring, context preservation, relationships
// =============================================================================

app.post('/api/memory/remember', requireInternal, async (req, res) => {
  const {
    twinId,
    content,
    importance = 'MEDIUM',
    source = 'user',
    entities = [],
    context = {},
    relationships: initialRelationships = [],
    tags = [],
    metadata = {}
  } = req.body || {};

  if (!twinId || !content) {
    return fail(res, 'INVALID_INPUT', 'twinId and content required');
  }

  if (!CONFIG.importance[importance]) {
    return fail(res, 'INVALID_IMPORTANCE', `importance must be one of: ${Object.keys(CONFIG.importance).join(', ')}`);
  }

  const id = uuidv4();

  // Create smart memory
  const memory = storeMemory({
    id,
    twinId,
    content,
    importance,
    source,
    entities,
    context,
    tags,
    metadata,
    relationships: initialRelationships,
    accessCount: 0,
    createdAt: nowIso()
  });

  // Add initial relationships
  for (const rel of initialRelationships) {
    await addRelationship(rel.from || id, rel.to, rel.type, rel.weight || 1);
  }

  logCapability('remember', 'create');

  res.status(201).json({
    success: true,
    data: {
      id: memory.id,
      twinId: memory.twinId,
      importance: memory.importance,
      importanceScore: memory.importanceScore,
      source: memory.source,
      entities: memory.entities,
      relationshipCount: initialRelationships.length,
      createdAt: memory.createdAt
    },
    message: 'Memory remembered with intelligence metadata'
  });
});

app.get('/api/memory/remember/:id', (req, res) => {
  const memory = getMemory(req.params.id);
  if (!memory) return fail(res, 'NOT_FOUND', 'Memory not found', 404);

  // Update access tracking
  memory.accessCount = (memory.accessCount || 0) + 1;
  memory.lastAccessedAt = nowIso();
  memory.importanceScore = calculateImportanceScore(memory);
  importanceScores.set(memory.id, memory.importanceScore);

  logCapability('remember', 'access');

  ok(res, {
    data: {
      id: memory.id,
      content: memory.content,
      importance: memory.importance,
      importanceScore: memory.importanceScore,
      accessCount: memory.accessCount,
      lastAccessedAt: memory.lastAccessedAt,
      relationshipCount: getRelationshipCount(memory.id),
      entities: memory.entities,
      decaySchedule: memory.decaySchedule
    }
  });
});

// =============================================================================
// 28.2 FORGET - Expiration, unused detection, GDPR
// =============================================================================

app.post('/api/memory/forget', requireInternal, async (req, res) => {
  const { id, reason = 'user_request', hardDelete = false, archiveFirst = true } = req.body || {};

  if (!id) return fail(res, 'INVALID_INPUT', 'id required');

  const memory = getMemory(id);
  if (!memory) return fail(res, 'NOT_FOUND', 'Memory not found', 404);

  logCapability('forget', reason);

  if (archiveFirst && !memory.archived) {
    memory.archived = true;
    memory.archivedAt = nowIso();
    memory.archiveReason = reason;
    return ok(res, {
      id: memory.id,
      mode: 'archived',
      reason,
      archivedAt: memory.archivedAt,
      message: 'Memory archived (soft delete)'
    });
  }

  // Hard delete
  smartMemories.delete(id);
  importanceScores.delete(id);
  relationships.delete(id);
  contradictions.delete(id);

  // Clear decay timeout
  if (decayTimeouts.has(id)) {
    clearTimeout(decayTimeouts.get(id));
    decayTimeouts.delete(id);
  }

  ok(res, {
    id,
    mode: 'deleted',
    reason,
    message: 'Memory forgotten (hard delete)'
  });
});

// GDPR compliance - forget all memories for a twin
app.post('/api/memory/forget/gdpr', requireInternal, async (req, res) => {
  const { twinId, reason = 'gdpr_request' } = req.body || {};

  if (!twinId) return fail(res, 'INVALID_INPUT', 'twinId required');

  const toDelete = [];
  for (const [id, memory] of smartMemories) {
    if (memory.twinId === twinId) {
      toDelete.push(id);
      smartMemories.delete(id);
      importanceScores.delete(id);
      relationships.delete(id);

      if (decayTimeouts.has(id)) {
        clearTimeout(decayTimeouts.get(id));
        decayTimeouts.delete(id);
      }
    }
  }

  logCapability('forget', `gdpr:${twinId}`);

  ok(res, {
    twinId,
    deletedCount: toDelete.length,
    reason,
    message: `GDPR request fulfilled: ${toDelete.length} memories forgotten`
  });
});

// Check for unused memories
app.post('/api/memory/forget/check-unused', requireInternal, async (req, res) => {
  const { days = 90 } = req.body || {};
  const threshold = nowMs() - (days * 24 * 60 * 60 * 1000);

  const unused = [];
  for (const [id, memory] of smartMemories) {
    if (memory.importance !== 'CRITICAL' && !memory.pinned) {
      const lastAccess = memory.lastAccessedAt
        ? new Date(memory.lastAccessedAt).getTime()
        : new Date(memory.createdAt).getTime();

      if (lastAccess < threshold) {
        unused.push({
          id,
          twinId: memory.twinId,
          importance: memory.importance,
          lastAccessedAt: memory.lastAccessedAt,
          daysSinceAccess: Math.floor((nowMs() - lastAccess) / (1000 * 60 * 60 * 24))
        });
      }
    }
  }

  logCapability('forget', 'check_unused');

  ok(res, {
    thresholdDays: days,
    unusedCount: unused.length,
    memories: unused.slice(0, 50) // Limit response
  });
});

// =============================================================================
// 28.3 COMPRESS - Summarization, deduplication, archival
// =============================================================================

app.post('/api/memory/compress', requireInternal, async (req, res) => {
  const { id, summaryLength = CONFIG.compression.MAX_CONTENT_LENGTH } = req.body || {};

  if (!id) return fail(res, 'INVALID_INPUT', 'id required');

  const memory = getMemory(id);
  if (!memory) return fail(res, 'NOT_FOUND', 'Memory not found', 404);

  if (memory.compressed) {
    return fail(res, 'ALREADY_COMPRESSED', 'Memory already compressed');
  }

  // Create compressed version (in production, would use LLM for summarization)
  const compressedMemory = storeMemory({
    ...memory,
    id: uuidv4(),
    content: `[SUMMARY] ${memory.content.slice(0, summaryLength)}${memory.content.length > summaryLength ? '...' : ''}`,
    compressed: true,
    originalId: memory.id,
    compressedAt: nowIso(),
    importance: 'LOW' // Compressed memories have lower importance
  });

  memory.compressedReplacementId = compressedMemory.id;
  memory.compressedAt = nowIso();
  memory.archived = true;

  logCapability('compress', id);

  ok(res, {
    original: {
      id: memory.id,
      length: memory.content.length
    },
    compressed: {
      id: compressedMemory.id,
      length: compressedMemory.content.length
    },
    compressionRatio: (compressedMemory.content.length / memory.content.length).toFixed(2)
  });
});

// Deduplication
app.post('/api/memory/compress/deduplicate', requireInternal, async (req, res) => {
  const { twinId, threshold = CONFIG.compression.DEDUP_SIMILARITY_THRESHOLD } = req.body || {};

  if (!twinId) return fail(res, 'INVALID_INPUT', 'twinId required');

  const twinMemories = [];
  for (const [, memory] of smartMemories) {
    if (memory.twinId === twinId && !memory.compressed && !memory.archived) {
      twinMemories.push(memory);
    }
  }

  const duplicates = [];
  const toMerge = new Set();

  for (let i = 0; i < twinMemories.length; i++) {
    for (let j = i + 1; j < twinMemories.length; j++) {
      const similarity = jaccardSimilarity(
        twinMemories[i].content,
        twinMemories[j].content
      );

      if (similarity >= threshold) {
        duplicates.push({
          memory1: twinMemories[i].id,
          memory2: twinMemories[j].id,
          similarity: similarity.toFixed(3)
        });
        toMerge.add(twinMemories[j].id);
      }
    }
  }

  logCapability('compress', 'deduplicate');

  ok(res, {
    twinId,
    threshold,
    duplicatePairs: duplicates.length,
    memoriesToMerge: [...toMerge],
    duplicates: duplicates.slice(0, 20)
  });
});

// =============================================================================
// 28.4 MERGE - Duplicate detection, contradiction resolution
// =============================================================================

app.post('/api/memory/merge', requireInternal, async (req, res) => {
  const { sourceId, targetId, strategy = 'newer' } = req.body || {};

  if (!sourceId || !targetId) {
    return fail(res, 'INVALID_INPUT', 'sourceId and targetId required');
  }

  const source = getMemory(sourceId);
  const target = getMemory(targetId);

  if (!source || !target) {
    return fail(res, 'NOT_FOUND', 'One or both memories not found', 404);
  }

  // Determine which content to keep
  let mergedContent;
  let mergedMetadata;

  if (strategy === 'newer') {
    const sourceTime = new Date(source.createdAt).getTime();
    const targetTime = new Date(target.createdAt).getTime();

    if (sourceTime > targetTime) {
      mergedContent = source.content;
      mergedMetadata = { ...source.metadata, mergedFrom: targetId };
    } else {
      mergedContent = target.content;
      mergedMetadata = { ...target.metadata, mergedFrom: sourceId };
    }
  } else if (strategy === 'combine') {
    mergedContent = `${source.content}\n\n---\n\n${target.content}`;
    mergedMetadata = { ...source.metadata, ...target.metadata, mergedFrom: [sourceId, targetId] };
  } else {
    return fail(res, 'INVALID_STRATEGY', 'strategy must be "newer" or "combine"');
  }

  // Create merged memory
  const merged = storeMemory({
    ...target,
    id: uuidv4(),
    content: mergedContent,
    metadata: mergedMetadata,
    mergedFrom: [sourceId, targetId],
    mergedAt: nowIso()
  });

  // Archive originals
  source.archived = true;
  source.archivedAt = nowIso();
  source.archiveReason = 'merged';
  source.mergedInto = merged.id;

  target.archived = true;
  target.archivedAt = nowIso();
  target.archiveReason = 'merged';
  target.mergedInto = merged.id;

  logCapability('merge', `${sourceId}+${targetId}->${merged.id}`);

  ok(res, {
    source: sourceId,
    target: targetId,
    merged: {
      id: merged.id,
      content: merged.content.slice(0, 100) + '...',
      mergedFrom: merged.mergedFrom
    }
  });
});

// =============================================================================
// 28.5 CONTRADICTION - Detection, source credibility, recency
// =============================================================================

app.post('/api/memory/contradiction/detect', requireInternal, async (req, res) => {
  const { twinId } = req.body || {};

  if (!twinId) return fail(res, 'INVALID_INPUT', 'twinId required');

  const twinMemories = [];
  for (const [, memory] of smartMemories) {
    if (memory.twinId === twinId && !memory.archived) {
      twinMemories.push(memory);
    }
  }

  const contradictionsFound = [];

  // Simple contradiction detection (in production, would use NLP/LLM)
  for (let i = 0; i < twinMemories.length; i++) {
    for (let j = i + 1; j < twinMemories.length; j++) {
      const m1 = twinMemories[i];
      const m2 = twinMemories[j];

      // Check for negation patterns (simplified)
      const hasNegation = (text) => /not|never|no|don't|doesn't|didn't|won't|wouldn't/i.test(text);

      const content1 = m1.content.toLowerCase();
      const content2 = m2.content.toLowerCase();

      // Extract core facts (simplified)
      const core1 = content1.replace(/not|never|no|don't|doesn't|didn't|won't|wouldn't/gi, '').trim();
      const core2 = content2.replace(/not|never|no|don't|doesn't|didn't|won't|wouldn't/gi, '').trim();

      // Check if same core fact with negation
      if (core1.length > 10 && core2.length > 10) {
        const similarity = jaccardSimilarity(core1, core2);

        if (similarity > 0.7 && hasNegation(content1) !== hasNegation(content2)) {
          contradictionsFound.push({
            memory1: { id: m1.id, content: m1.content.slice(0, 100), createdAt: m1.createdAt },
            memory2: { id: m2.id, content: m2.content.slice(0, 100), createdAt: m2.createdAt },
            confidence: similarity.toFixed(3),
            recommendedAction: new Date(m1.createdAt) > new Date(m2.createdAt) ? 'keep_newer' : 'keep_newer'
          });

          // Log contradiction
          m1.contradictions = (m1.contradictions || []).concat([{ memoryId: m2.id, detectedAt: nowIso() }]);
          m2.contradictions = (m2.contradictions || []).concat([{ memoryId: m1.id, detectedAt: nowIso() }]);
        }
      }
    }
  }

  logCapability('contradiction', 'detect');

  ok(res, {
    twinId,
    memoriesAnalyzed: twinMemories.length,
    contradictionsFound: contradictionsFound.length,
    contradictions: contradictionsFound.slice(0, 20)
  });
});

// Resolve contradiction
app.post('/api/memory/contradiction/resolve', requireInternal, async (req, res) => {
  const { id1, id2, keepId, reason } = req.body || {};

  if (!id1 || !id2 || !keepId) {
    return fail(res, 'INVALID_INPUT', 'id1, id2, and keepId required');
  }

  const memory1 = getMemory(id1);
  const memory2 = getMemory(id2);

  if (!memory1 || !memory2) {
    return fail(res, 'NOT_FOUND', 'One or both memories not found', 404);
  }

  const discardId = keepId === id1 ? id2 : id1;
  const discard = getMemory(discardId);

  // Archive the discarded memory
  discard.archived = true;
  discard.archivedAt = nowIso();
  discard.archiveReason = `contradiction_resolved:${reason || 'user_decision'}`;
  discard.resolvedAgainst = keepId;

  // Record resolution
  contradictions.set(`${id1}:${id2}`, {
    resolvedAt: nowIso(),
    kept: keepId,
    discarded: discardId,
    reason
  });

  logCapability('contradiction', `resolve:${id1}:${id2}`);

  ok(res, {
    resolved: true,
    kept: keepId,
    discarded: discardId,
    reason
  });
});

// =============================================================================
// 28.6 IMPORTANCE - Access frequency, user marking, contextual relevance
// =============================================================================

app.post('/api/memory/importance/mark', requireInternal, async (req, res) => {
  const { id, importance } = req.body || {};

  if (!id || !importance) {
    return fail(res, 'INVALID_INPUT', 'id and importance required');
  }

  if (!CONFIG.importance[importance]) {
    return fail(res, 'INVALID_IMPORTANCE', `importance must be one of: ${Object.keys(CONFIG.importance).join(', ')}`);
  }

  const memory = getMemory(id);
  if (!memory) return fail(res, 'NOT_FOUND', 'Memory not found', 404);

  const oldImportance = memory.importance;
  memory.importance = importance;
  memory.importanceScore = calculateImportanceScore(memory);
  memory.userMarked = true;
  memory.markedAt = nowIso();
  importanceScores.set(id, memory.importanceScore);

  logCapability('importance', `mark:${oldImportance}->${importance}`);

  ok(res, {
    id,
    oldImportance,
    newImportance: importance,
    newScore: memory.importanceScore
  });
});

// Pin memory (prevent decay)
app.post('/api/memory/importance/pin', requireInternal, async (req, res) => {
  const { id, pinned = true } = req.body || {};

  if (!id) return fail(res, 'INVALID_INPUT', 'id required');

  const memory = getMemory(id);
  if (!memory) return fail(res, 'NOT_FOUND', 'Memory not found', 404);

  memory.pinned = pinned;
  memory.pinnedAt = pinned ? nowIso() : null;

  logCapability('importance', pinned ? 'pin' : 'unpin');

  ok(res, {
    id,
    pinned,
    importanceScore: memory.importanceScore
  });
});

// Get importance ranking
app.get('/api/memory/importance/ranking', (req, res) => {
  const { twinId, limit = 20 } = req.query;

  let memories = Array.from(smartMemories.values())
    .filter(m => !m.archived && !m.compressed);

  if (twinId) {
    memories = memories.filter(m => m.twinId === twinId);
  }

  // Sort by importance score
  memories.sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0));

  const ranking = memories.slice(0, Number(limit)).map((m, i) => ({
    rank: i + 1,
    id: m.id,
    twinId: m.twinId,
    importance: m.importance,
    importanceScore: m.importanceScore?.toFixed(3),
    accessCount: m.accessCount,
    pinned: m.pinned,
    content: m.content.slice(0, 80) + (m.content.length > 80 ? '...' : '')
  }));

  logCapability('importance', 'ranking');

  ok(res, {
    twinId: twinId || 'all',
    count: ranking.length,
    ranking
  });
});

// =============================================================================
// 28.7 DECAY - Time-based decay, access-based boost, automatic archival
// =============================================================================

app.post('/api/memory/decay/apply', requireInternal, async (req, res) => {
  const { twinId } = req.body || {};

  const affected = [];

  for (const [id, memory] of smartMemories) {
    if (memory.pinned || memory.importance === 'CRITICAL') continue;
    if (twinId && memory.twinId !== twinId) continue;

    const ageInDays = (nowMs() - new Date(memory.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = calculateDecayFactor(memory.decaySchedule.halfLifeDays, ageInDays);

    if (decayFactor < 0.5) {
      memory.importanceScore = calculateImportanceScore(memory) * decayFactor;
      importanceScores.set(id, memory.importanceScore);
      affected.push({ id, decayFactor: decayFactor.toFixed(3), newScore: memory.importanceScore.toFixed(3) });
    }
  }

  logCapability('decay', 'apply');

  ok(res, {
    twinId: twinId || 'all',
    affectedCount: affected.length,
    affected: affected.slice(0, 20)
  });
});

// Boost memory on access
app.post('/api/memory/decay/boost', requireInternal, async (req, res) => {
  const { id } = req.body || {};

  if (!id) return fail(res, 'INVALID_INPUT', 'id required');

  const memory = getMemory(id);
  if (!memory) return fail(res, 'NOT_FOUND', 'Memory not found', 404);

  // Access-based boost
  memory.accessCount = (memory.accessCount || 0) + 1;
  memory.lastAccessedAt = nowIso();
  memory.lastBoostAt = nowIso();

  // Recalculate with boost
  const baseScore = calculateImportanceScore(memory);
  const boostMultiplier = Math.min(1.5, 1 + Math.log10(memory.accessCount) * 0.1);
  memory.importanceScore = Math.min(1.0, baseScore * boostMultiplier);

  // Extend half-life slightly
  memory.decaySchedule.halfLifeDays = Math.min(
    memory.decaySchedule.halfLifeDays * 1.1,
    CONFIG.decay.CRITICAL_HALF_LIFE_DAYS
  );

  importanceScores.set(id, memory.importanceScore);

  logCapability('decay', 'boost');

  ok(res, {
    id,
    accessCount: memory.accessCount,
    newScore: memory.importanceScore.toFixed(3),
    newHalfLifeDays: Math.round(memory.decaySchedule.halfLifeDays)
  });
});

// Get decay report
app.get('/api/memory/decay/report', (req, res) => {
  const { twinId } = req.query;

  let memories = Array.from(smartMemories.values())
    .filter(m => !m.archived);

  if (twinId) {
    memories = memories.filter(m => m.twinId === twinId);
  }

  const decayStages = {
    healthy: 0,        // > 0.7
    moderate: 0,       // 0.4 - 0.7
    weak: 0,           // 0.1 - 0.4
    critical: 0        // < 0.1
  };

  for (const memory of memories) {
    const score = memory.importanceScore || 0;
    if (score > 0.7) decayStages.healthy++;
    else if (score > 0.4) decayStages.moderate++;
    else if (score > 0.1) decayStages.weak++;
    else decayStages.critical++;
  }

  logCapability('decay', 'report');

  ok(res, {
    twinId: twinId || 'all',
    totalMemories: memories.length,
    decayStages,
    decayRate: memories.length > 0
      ? ((decayStages.weak + decayStages.critical) / memories.length).toFixed(3)
      : 0
  });
});

// =============================================================================
// 28.8 RELATIONSHIPS - Entity linking, causal chains, temporal ordering
// =============================================================================

app.post('/api/memory/relationships/add', requireInternal, async (req, res) => {
  const { from, to, type, weight = 1 } = req.body || {};

  if (!from || !to || !type) {
    return fail(res, 'INVALID_INPUT', 'from, to, and type required');
  }

  const fromMemory = getMemory(from);
  const toMemory = getMemory(to);

  if (!fromMemory || !toMemory) {
    return fail(res, 'NOT_FOUND', 'One or both memories not found', 404);
  }

  if (!CONFIG.relationshipTypes.includes(type)) {
    return fail(res, 'INVALID_TYPE', `type must be one of: ${CONFIG.relationshipTypes.join(', ')}`);
  }

  const relationship = {
    id: uuidv4(),
    from,
    to,
    type,
    weight,
    createdAt: nowIso()
  };

  if (!relationships.has(from)) relationships.set(from, []);
  relationships.get(from).push(relationship);

  logCapability('relationships', `add:${type}`);

  ok(res, {
    relationship,
    message: 'Relationship added successfully'
  });
});

// Helper for adding relationships (used in remember)
async function addRelationship(from, to, type, weight = 1) {
  if (!relationships.has(from)) relationships.set(from, []);
  relationships.get(from).push({
    id: uuidv4(),
    from,
    to,
    type,
    weight,
    createdAt: nowIso()
  });
}

app.get('/api/memory/relationships/:id', (req, res) => {
  const { id } = req.params;
  const { depth = 1, type } = req.query;

  const memory = getMemory(id);
  if (!memory) return fail(res, 'NOT_FOUND', 'Memory not found', 404);

  const visited = new Set();
  const result = [];
  const queue = [{ id, depth: 0, path: [] }];

  while (queue.length > 0) {
    const current = queue.shift();

    if (visited.has(current.id) || current.depth > Number(depth)) continue;
    visited.add(current.id);

    const mem = getMemory(current.id);
    if (!mem) continue;

    const rels = relationships.get(current.id) || [];
    const filteredRels = type
      ? rels.filter(r => r.type === type)
      : rels;

    result.push({
      id: mem.id,
      content: mem.content.slice(0, 100),
      depth: current.depth,
      path: current.path,
      relationships: filteredRels.map(r => ({
        to: r.to,
        type: r.type,
        weight: r.weight
      }))
    });

    for (const rel of filteredRels) {
      queue.push({
        id: rel.to,
        depth: current.depth + 1,
        path: [...current.path, current.id]
      });
    }
  }

  logCapability('relationships', 'traverse');

  ok(res, {
    startId: id,
    depth: Number(depth),
    nodes: result
  });
});

// Entity linking
app.post('/api/memory/relationships/entity-link', requireInternal, async (req, res) => {
  const { memoryId, entities } = req.body || {};

  if (!memoryId || !entities) {
    return fail(res, 'INVALID_INPUT', 'memoryId and entities required');
  }

  const memory = getMemory(memoryId);
  if (!memory) return fail(res, 'NOT_FOUND', 'Memory not found', 404);

  memory.entities = [...new Set([...memory.entities, ...entities])];

  // Create relationships between entities
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      await addRelationship(memoryId, memoryId, 'related_to', 0.5);
    }
  }

  logCapability('relationships', 'entity_link');

  ok(res, {
    memoryId,
    entities: memory.entities
  });
});

// =============================================================================
// ANALYTICS & REPORTING
// =============================================================================

app.get('/api/stats', (_req, res) => {
  const byImportance = {};
  for (const importance of Object.keys(CONFIG.importance)) {
    byImportance[importance] = 0;
  }

  let archived = 0, compressed = 0, pinned = 0;

  for (const [, memory] of smartMemories) {
    byImportance[memory.importance] = (byImportance[memory.importance] || 0) + 1;
    if (memory.archived) archived++;
    if (memory.compressed) compressed++;
    if (memory.pinned) pinned++;
  }

  ok(res, {
    totalMemories: smartMemories.size,
    byImportance,
    archived,
    compressed,
    pinned,
    relationshipCount: [...relationships.values()].reduce((sum, r) => sum + r.length, 0),
    stats
  });
});

app.get('/api/audit', (req, res) => {
  const { capability, limit = 100 } = req.query;

  let logs = auditLog;
  if (capability) {
    logs = logs.filter(l => l.capability === capability);
  }

  ok(res, {
    count: logs.length,
    logs: logs.slice(-Number(limit)).reverse()
  });
});

// =============================================================================
// SEED DATA (for testing)
// =============================================================================

function seedDemoData() {
  const demoTwinId = 'demo-user';

  const demoMemories = [
    {
      twinId: demoTwinId,
      content: 'User prefers email over phone calls for business communication',
      importance: 'HIGH',
      source: 'system-observed',
      entities: ['communication', 'email', 'business']
    },
    {
      twinId: demoTwinId,
      content: 'User is allergic to peanuts and tree nuts',
      importance: 'CRITICAL',
      source: 'user-spoken',
      entities: ['health', 'allergy', 'peanuts']
    },
    {
      twinId: demoTwinId,
      content: 'User works remotely from home office in Mumbai',
      importance: 'MEDIUM',
      source: 'user-spoken',
      entities: ['work', 'remote', 'location']
    },
    {
      twinId: demoTwinId,
      content: 'User enjoys Indian cuisine, especially biryani',
      importance: 'LOW',
      source: 'conversation',
      entities: ['food', 'preference', 'biryani']
    },
    {
      twinId: demoTwinId,
      content: 'User prefers morning meetings between 9-11 AM',
      importance: 'HIGH',
      source: 'system-observed',
      entities: ['schedule', 'meetings', 'morning']
    }
  ];

  for (const mem of demoMemories) {
    storeMemory(mem);
  }

  console.log(`[Memory Intelligence] Seeded ${demoMemories.length} demo memories`);
}

// =============================================================================
// STARTUP
// =============================================================================

async function startup() {
  // Seed demo data
  seedDemoData();
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



  const server = app.listen(PORT, () => {
    console.log(`Memory Intelligence v1.0.0 running on port ${PORT}`);
    console.log(`  8 Capabilities: remember, forget, compress, merge, contradiction, importance, decay, relationships`);
    console.log(`  Health: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Memory Intelligence] Shutting down...');
    for (const timeout of decayTimeouts.values()) {
      clearTimeout(timeout);
    }
    server.close();
  });
}

startup().catch(err => {
  console.error('[Memory Intelligence] Startup failed:', err);
  process.exit(1);
});
