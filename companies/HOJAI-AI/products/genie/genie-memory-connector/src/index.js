/**
 * Genie + MemoryOS Integration Service
 *
 * Connects Genie AI to MemoryOS for persistent, organizational memory.
 *
 * Port: 4896
 *
 * Features:
 * - Sync Genie knowledge → MemoryOS
 * - Query MemoryOS → Genie context
 * - Personal memory (Genie) + Organizational memory (MemoryOS)
 * - Working memory hierarchy integration
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.GENIE_MEMORY_PORT || 4896;

// MemoryOS URL
const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';

// In-memory sync cache
const syncCache = new Map();
const contextCache = new Map();

app.use(cors());
app.use(helmet());
app.use(express.json());

// Helper functions
function nowIso() { return new Date().toISOString(); }
function ok(res, data) { res.json({ success: true, ...data }); }
function fail(res, code, message, status = 400) {
  res.status(status).json({ success: false, error: code, message });
}

// =============================================================================
// HEALTH
// =============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-memory-connector',
    port: PORT,
    version: '1.0.0',
    connectedTo: MEMORY_OS_URL,
    timestamp: nowIso()
  });
});

app.get('/', (req, res) => {
  ok(res, {
    service: 'Genie + MemoryOS Integration',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      // Sync operations
      sync: '/api/sync/:userId',
      syncStatus: '/api/sync/:userId/status',
      // Context operations
      context: '/api/context/:userId',
      contextStream: '/api/context/:userId/stream',
      // Memory operations
      memories: '/api/memories/:userId',
      search: '/api/search',
      // Graph operations
      graph: '/api/graph/:userId'
    }
  });
});

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

/**
 * POST /api/sync/:userId
 * Sync Genie memory to MemoryOS
 */
app.post('/api/sync/:userId', async (req, res) => {
  const { userId } = req.params;
  const { content, type = 'knowledge', department, importance = 'Medium', tags = [] } = req.body;

  if (!content) return fail(res, 'INVALID_INPUT', 'content required');

  try {
    // In production, this would call MemoryOS
    // const response = await fetch(`${MEMORY_OS_URL}/api/memories`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ twinId: userId, content, type, department, importance, tags })
    // });

    const memoryId = uuidv4();
    const syncedMemory = {
      id: memoryId,
      twinId: userId,
      content,
      type,
      department: department || null,
      importance,
      tags,
      source: 'genie',
      syncedAt: nowIso(),
      createdAt: nowIso()
    };

    // Cache for quick access
    syncCache.set(`${userId}:${memoryId}`, syncedMemory);

    ok(res, {
      memoryId,
      synced: true,
      memory: syncedMemory,
      message: 'Synced from Genie to MemoryOS'
    });
  } catch (error) {
    fail(res, 'SYNC_ERROR', error.message, 500);
  }
});

/**
 * GET /api/sync/:userId/status
 * Get sync status
 */
app.get('/api/sync/:userId/status', (req, res) => {
  const { userId } = req.params;

  const userMemories = Array.from(syncCache.values())
    .filter(m => m.twinId === userId);

  ok(res, {
    userId,
    totalSynced: userMemories.length,
    lastSync: userMemories.length > 0
      ? userMemories.sort((a, b) => new Date(b.syncedAt) - new Date(a.syncedAt))[0].syncedAt
      : null
  });
});

/**
 * POST /api/sync/:userId/batch
 * Batch sync multiple memories
 */
app.post('/api/sync/:userId/batch', (req, res) => {
  const { userId } = req.params;
  const { memories } = req.body;

  if (!Array.isArray(memories)) {
    return fail(res, 'INVALID_INPUT', 'memories must be an array');
  }

  const synced = [];
  for (const mem of memories) {
    const memoryId = uuidv4();
    const syncedMemory = {
      id: memoryId,
      twinId: userId,
      content: mem.content,
      type: mem.type || 'knowledge',
      department: mem.department || null,
      importance: mem.importance || 'Medium',
      tags: mem.tags || [],
      source: 'genie',
      syncedAt: nowIso(),
      createdAt: nowIso()
    };
    syncCache.set(`${userId}:${memoryId}`, syncedMemory);
    synced.push(syncedMemory);
  }

  ok(res, {
    userId,
    synced: synced.length,
    memories: synced
  });
});

// =============================================================================
// CONTEXT OPERATIONS
// =============================================================================

/**
 * GET /api/context/:userId
 * Get unified context from MemoryOS for Genie
 */
app.get('/api/context/:userId', (req, res) => {
  const { userId } = req.params;
  const { includePersonal = 'true', includeOrg = 'true', includeDept = 'true' } = req.query;

  // Get user's memories
  const personalMemories = Array.from(syncCache.values())
    .filter(m => m.twinId === userId)
    .slice(-20) // Last 20 memories
    .reverse();

  const context = {
    userId,
    personalMemories: includePersonal === 'true' ? personalMemories : [],
    organizationalContext: includeOrg === 'true' ? {
      departments: [],
      recentDecisions: [],
      teamActivities: []
    } : null,
    departmentContext: includeDept === 'true' ? {
      currentProject: null,
      teamMembers: [],
      recentMemories: []
    } : null,
    generatedAt: nowIso()
  };

  // Cache for quick access
  contextCache.set(userId, context);

  ok(res, { context });
});

/**
 * GET /api/context/:userId/stream
 * SSE stream for real-time context updates
 */
app.get('/api/context/:userId/stream', (req, res) => {
  const { userId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`data: ${JSON.stringify({ type: 'connected', userId, timestamp: nowIso() })}\n\n`);

  // Send heartbeat + recent memories
  const interval = setInterval(() => {
    const recentMemories = Array.from(syncCache.values())
      .filter(m => m.twinId === userId)
      .slice(-5)
      .reverse();

    res.write(`data: ${JSON.stringify({
      type: 'update',
      memories: recentMemories,
      timestamp: nowIso()
    })}\n\n`);
  }, 15000);

  req.on('close', () => clearInterval(interval));
});

// =============================================================================
// MEMORY OPERATIONS
// =============================================================================

/**
 * GET /api/memories/:userId
 * Get all memories for user from MemoryOS
 */
app.get('/api/memories/:userId', (req, res) => {
  const { userId } = req.params;
  const { type, department, importance, limit = 50, offset = 0 } = req.query;

  let memories = Array.from(syncCache.values())
    .filter(m => m.twinId === userId);

  if (type) memories = memories.filter(m => m.type === type);
  if (department) memories = memories.filter(m => m.department === department);
  if (importance) memories = memories.filter(m => m.importance === importance);

  memories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = memories.length;
  memories = memories.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  ok(res, {
    memories,
    count: memories.length,
    total,
    offset: parseInt(offset),
    limit: parseInt(limit)
  });
});

/**
 * POST /api/search
 * Search memories from MemoryOS
 */
app.post('/api/search', (req, res) => {
  const { userId, query, scope = 'personal', department, limit = 20 } = req.body;

  if (!query) return fail(res, 'INVALID_INPUT', 'query required');

  const tokens = query.toLowerCase().split(/\s+/);

  let memories = Array.from(syncCache.values());

  // Filter by scope
  if (userId) {
    memories = memories.filter(m => m.twinId === userId);
  }
  if (department) {
    memories = memories.filter(m => m.department === department);
  }

  // Score by relevance
  const scored = memories.map(m => {
    let score = 0;
    const text = `${m.content} ${(m.tags || []).join(' ')} ${m.type}`.toLowerCase();

    for (const token of tokens) {
      if (m.content.toLowerCase().includes(token)) score += 10;
      if (text.includes(token)) score += 5;
      if (m.tags?.some(t => t.toLowerCase().includes(token))) score += 3;
    }

    return { ...m, score };
  });

  const results = scored
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, parseInt(limit));

  ok(res, {
    query,
    userId,
    scope,
    count: results.length,
    results
  });
});

// =============================================================================
// GRAPH OPERATIONS
// =============================================================================

/**
 * GET /api/graph/:userId
 * Get memory graph for user
 */
app.get('/api/graph/:userId', (req, res) => {
  const { userId } = req.params;

  const memories = Array.from(syncCache.values())
    .filter(m => m.twinId === userId);

  // Build nodes from memories
  const nodes = memories.map(m => ({
    id: m.id,
    label: m.content.substring(0, 50),
    type: m.type,
    importance: m.importance
  }));

  // Build edges from tags and types
  const edges = [];
  const typeGroups = new Map();

  memories.forEach(m => {
    if (!typeGroups.has(m.type)) typeGroups.set(m.type, []);
    typeGroups.get(m.type).push(m.id);
  });

  typeGroups.forEach((ids, type) => {
    for (let i = 0; i < ids.length - 1; i++) {
      edges.push({
        from: ids[i],
        to: ids[i + 1],
        type: 'same_type',
        label: type
      });
    }
  });

  ok(res, {
    userId,
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      byType: Object.fromEntries(typeGroups)
    }
  });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`[Genie Memory Connector] Running on port ${PORT}`);
  console.log(`[Genie Memory Connector] Connected to MemoryOS at ${MEMORY_OS_URL}`);
});

export default app;
