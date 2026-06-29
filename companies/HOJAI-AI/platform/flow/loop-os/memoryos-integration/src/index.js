/**
 * LoopOS MemoryOS Integration
 * Persist loop state to MemoryOS for long-term memory
 * Port: 4741
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4741;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';
const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// In-memory cache (short-term)
const memoryCache = new Map();
const SESSION_TTL = 3600000; // 1 hour

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-memoryos-integration',
  version: '1.0.0',
  port: PORT,
  memoryOsUrl: MEMORY_OS_URL,
  cachedItems: memoryCache.size
}));

app.get('/ready', async (_req, res) => {
  try {
    await axios.get(`${MEMORY_OS_URL}/health`, { timeout: 2000 });
    res.json({ ready: true, memoryOsConnected: true });
  } catch {
    res.json({ ready: true, memoryOsConnected: false });
  }
});

// ── Memory Operations ─────────────────────────────────────

/**
 * Store loop execution in MemoryOS
 * POST /api/memory/loops
 */
app.post('/api/memory/loops', requireAuth, async (req, res) => {
  const { loopId, twinId, executionId, state, actions, checkpoints, metadata = {} } = req.body || {};

  if (!loopId) return res.status(400).json({ error: 'loopId is required' });

  const memoryEntry = {
    id: `loop-memory-${randomUUID().slice(0, 8)}`,
    type: 'loop_execution',
    loopId,
    twinId,
    executionId,
    state,
    actions,
    checkpoints,
    metadata,
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };

  // Cache locally
  memoryCache.set(memoryEntry.id, memoryEntry);

  // Persist to MemoryOS
  try {
    await axios.post(`${MEMORY_OS_URL}/api/memories`, {
      entityId: twinId || loopId,
      entityType: 'loop',
      memoryType: 'execution_history',
      content: JSON.stringify(memoryEntry),
      importance: metadata.critical ? 0.9 : 0.6,
      tags: ['loop', loopId, metadata.actionType || 'general']
    });
    memoryEntry.syncedToMemory = true;
  } catch (err) {
    logger.warn('Failed to sync to MemoryOS:', err.message);
    memoryEntry.syncedToMemory = false;
  }

  res.status(201).json(memoryEntry);
});

/**
 * Get loop memory history
 * GET /api/memory/loops/:loopId
 */
app.get('/api/memory/loops/:loopId', async (req, res) => {
  const { limit = 50 } = req.query;

  // Get from cache
  let memories = [...memoryCache.values()]
    .filter(m => m.loopId === req.params.loopId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, Number(limit));

  // Also try MemoryOS
  try {
    const response = await axios.get(`${MEMORY_OS_URL}/api/memories`, {
      params: { entityId: req.params.loopId, type: 'loop', limit: Number(limit) }
    });
    if (response.data.memories) {
      memories = [...memories, ...response.data.memories.map(m => ({
        ...JSON.parse(m.content),
        fromMemoryOS: true
      }))];
    }
  } catch (err) {
    logger.warn('Failed to fetch from MemoryOS:', err.message);
  }

  res.json({ count: memories.length, memories });
});

/**
 * Store action result in MemoryOS
 * POST /api/memory/actions
 */
app.post('/api/memory/actions', requireAuth, async (req, res) => {
  const { loopId, twinId, actionId, actionType, input, output, success, duration, cost } = req.body || {};

  const actionMemory = {
    id: `action-memory-${randomUUID().slice(0, 8)}`,
    type: 'action_execution',
    loopId,
    twinId,
    actionId,
    actionType,
    input,
    output,
    success,
    duration,
    cost,
    timestamp: new Date().toISOString()
  };

  memoryCache.set(actionMemory.id, actionMemory);

  // Persist to MemoryOS
  try {
    await axios.post(`${MEMORY_OS_URL}/api/memories`, {
      entityId: twinId,
      entityType: 'agent',
      memoryType: 'action_history',
      content: JSON.stringify(actionMemory),
      importance: success ? 0.5 : 0.8, // Higher importance for failures
      tags: ['action', actionType, success ? 'success' : 'failure']
    });
  } catch (err) {
    logger.warn('Failed to sync action to MemoryOS:', err.message);
  }

  res.status(201).json(actionMemory);
});

/**
 * Get action patterns (learned behaviors)
 * GET /api/memory/patterns/:twinId
 */
app.get('/api/memory/patterns/:twinId', async (req, res) => {
  try {
    const response = await axios.get(`${MEMORY_OS_URL}/api/memories`, {
      params: { entityId: req.params.twinId, type: 'agent', memoryType: 'action_history' }
    });

    const memories = response.data.memories || [];

    // Analyze patterns
    const patterns = analyzePatterns(memories);

    res.json({ twinId: req.params.twinId, patterns });
  } catch (err) {
    logger.error('Failed to get patterns:', err.message);
    res.status(500).json({ error: 'Failed to get patterns', message: err.message });
  }
});

/**
 * Store decision in MemoryOS
 * POST /api/memory/decisions
 */
app.post('/api/memory/decisions', requireAuth, async (req, res) => {
  const { loopId, twinId, context, decision, reasoning, outcome } = req.body || {};

  const decisionMemory = {
    id: `decision-${randomUUID().slice(0, 8)}`,
    type: 'decision',
    loopId,
    twinId,
    context,
    decision,
    reasoning,
    outcome,
    timestamp: new Date().toISOString()
  };

  memoryCache.set(decisionMemory.id, decisionMemory);

  // Persist to MemoryOS
  try {
    await axios.post(`${MEMORY_OS_URL}/api/memories`, {
      entityId: twinId,
      entityType: 'agent',
      memoryType: 'decision_history',
      content: JSON.stringify(decisionMemory),
      importance: 0.7,
      tags: ['decision', context?.type || 'general']
    });
  } catch (err) {
    logger.warn('Failed to sync decision to MemoryOS:', err.message);
  }

  res.status(201).json(decisionMemory);
});

/**
 * Get decisions for learning
 * GET /api/memory/decisions/:twinId
 */
app.get('/api/memory/decisions/:twinId', async (req, res) => {
  const { success, limit = 100 } = req.query;

  try {
    const response = await axios.get(`${MEMORY_OS_URL}/api/memories`, {
      params: { entityId: req.params.twinId, memoryType: 'decision_history', limit: Number(limit) }
    });

    let decisions = (response.data.memories || []).map(m => JSON.parse(m.content));

    if (success !== undefined) {
      decisions = decisions.filter(d => d.outcome?.success === (success === 'true'));
    }

    res.json({ twinId: req.params.twinId, count: decisions.length, decisions });
  } catch (err) {
    logger.error('Failed to get decisions:', err.message);
    res.status(500).json({ error: 'Failed to get decisions', message: err.message });
  }
});

/**
 * Store checkpoint
 * POST /api/memory/checkpoints
 */
app.post('/api/memory/checkpoints', requireAuth, async (req, res) => {
  const { loopId, twinId, stateSnapshot, reason } = req.body || {};

  const checkpoint = {
    id: `checkpoint-${randomUUID().slice(0, 8)}`,
    type: 'checkpoint',
    loopId,
    twinId,
    stateSnapshot,
    reason,
    timestamp: new Date().toISOString()
  };

  memoryCache.set(checkpoint.id, checkpoint);

  try {
    await axios.post(`${MEMORY_OS_URL}/api/memories`, {
      entityId: twinId,
      entityType: 'agent',
      memoryType: 'checkpoint',
      content: JSON.stringify(checkpoint),
      importance: 0.8,
      tags: ['checkpoint', loopId]
    });
  } catch (err) {
    logger.warn('Failed to sync checkpoint to MemoryOS:', err.message);
  }

  res.status(201).json(checkpoint);
});

/**
 * Get checkpoints for recovery
 * GET /api/memory/checkpoints/:loopId
 */
app.get('/api/memory/checkpoints/:loopId', async (req, res) => {
  try {
    const response = await axios.get(`${MEMORY_OS_URL}/api/memories`, {
      params: { entityType: 'agent', memoryType: 'checkpoint', tags: req.params.loopId }
    });

    const checkpoints = (response.data.memories || [])
      .map(m => JSON.parse(m.content))
      .filter(c => c.loopId === req.params.loopId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ loopId: req.params.loopId, count: checkpoints.length, checkpoints });
  } catch (err) {
    logger.error('Failed to get checkpoints:', err.message);
    res.status(500).json({ error: 'Failed to get checkpoints', message: err.message });
  }
});

/**
 * Query MemoryOS for relevant context
 * POST /api/memory/query
 */
app.post('/api/memory/query', requireAuth, async (req, res) => {
  const { twinId, query, types = [], limit = 20 } = req.body || {};

  try {
    const response = await axios.post(`${MEMORY_OS_URL}/api/query`, {
      entityId: twinId,
      query,
      memoryTypes: types,
      limit
    });

    res.json(response.data);
  } catch (err) {
    logger.error('Memory query failed:', err.message);
    res.status(500).json({ error: 'Memory query failed', message: err.message });
  }
});

// ── Helper Functions ───────────────────────────────────

function analyzePatterns(memories) {
  const patterns = [];
  const actionCounts = {};
  const successRates = {};
  const timePatterns = {};

  for (const memory of memories) {
    const action = memory.actionType || 'unknown';
    const success = memory.success;

    // Count actions
    actionCounts[action] = (actionCounts[action] || 0) + 1;

    // Success rates
    if (!successRates[action]) {
      successRates[action] = { success: 0, total: 0 };
    }
    successRates[action].total++;
    if (success) successRates[action].success++;

    // Time patterns
    const hour = new Date(memory.timestamp).getHours();
    timePatterns[hour] = timePatterns[hour] || { total: 0, success: 0 };
    timePatterns[hour].total++;
    if (success) timePatterns[hour].success++;
  }

  // Best performing action types
  const ranked = Object.entries(successRates)
    .map(([action, stats]) => ({
      action,
      count: actionCounts[action],
      successRate: Math.round((stats.success / stats.total) * 100),
      confidence: stats.total > 10 ? 'high' : 'low'
    }))
    .sort((a, b) => b.successRate - a.successRate);

  // Best time for actions
  const bestTimes = Object.entries(timePatterns)
    .filter(([, stats]) => stats.total >= 5)
    .map(([hour, stats]) => ({
      hour: parseInt(hour),
      successRate: Math.round((stats.success / stats.total) * 100),
      count: stats.total
    }))
    .sort((a, b) => b.successRate - a.successRate);

  patterns.push({
    type: 'action_ranking',
    data: ranked.slice(0, 10)
  });

  patterns.push({
    type: 'optimal_timing',
    data: bestTimes.slice(0, 5)
  });

  return patterns;
}

// ── Cache Cleanup ────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, entry] of memoryCache) {
    if (now - new Date(entry.timestamp).getTime() > SESSION_TTL) {
      memoryCache.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.info(`Cache cleanup: removed ${cleaned} old entries`);
  }
}, 300000); // Every 5 minutes

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS MemoryOS Integration listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
