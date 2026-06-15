/**
 * Memory Routes - Store, retrieve, search memories
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, MEMORY_TYPES } from '../index.js';

const router = Router();

/**
 * Store memory
 * POST /api/memories
 */
router.post('/', async (req, res) => {
  try {
    const { corpId, type, content, metadata = {} } = req.body;

    if (!corpId || !type || !content) {
      return res.status(400).json({ error: 'corpId, type, and content are required' });
    }

    if (!Object.values(MEMORY_TYPES).includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Valid types: ${Object.values(MEMORY_TYPES).join(', ')}`
      });
    }

    const memoryId = `mem_${uuidv4()}`;
    const now = new Date().toISOString();

    const memory = {
      id: memoryId,
      corpId,
      type,
      content,
      metadata,
      importance: metadata.importance || 5, // 1-10
      accessCount: 0,
      lastAccessed: null,
      createdAt: now,
      updatedAt: now
    };

    // Store memory
    await redis.set(`memory:${memoryId}`, JSON.stringify(memory));

    // Index by corpId and type
    await redis.sadd(`memory:entity:${corpId}`, memoryId);
    await redis.sadd(`memory:type:${type}`, memoryId);
    await redis.sadd('memory:entities', corpId);

    // Add to searchable index
    await redis.zadd(`memory:search:${corpId}`, Date.now(), memoryId);

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get memory by ID
 * GET /api/memories/:memoryId
 */
router.get('/:memoryId', async (req, res) => {
  try {
    const { memoryId } = req.params;
    const memory = await redis.get(`memory:${memoryId}`);

    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const parsed = JSON.parse(memory);

    // Update access stats
    parsed.accessCount++;
    parsed.lastAccessed = new Date().toISOString();
    await redis.set(`memory:${memoryId}`, JSON.stringify(parsed));

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all memories for a CorpID
 * GET /api/memories/entity/:corpId
 */
router.get('/entity/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { type, limit = 50 } = req.query;

    let memoryIds;
    if (type) {
      // Get memories for this entity of this type
      const entityMemories = await redis.smembers(`memory:entity:${corpId}`);
      const typeMemories = await redis.smembers(`memory:type:${type}`);
      memoryIds = entityMemories.filter(id => typeMemories.includes(id));
    } else {
      memoryIds = await redis.smembers(`memory:entity:${corpId}`);
    }

    const memories = [];
    for (const memoryId of memoryIds.slice(0, parseInt(limit))) {
      const memory = await redis.get(`memory:${memoryId}`);
      if (memory) {
        memories.push(JSON.parse(memory));
      }
    }

    // Sort by importance
    memories.sort((a, b) => b.importance - a.importance);

    res.json({ memories, total: memories.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search memories
 * POST /api/memories/search
 */
router.post('/search', async (req, res) => {
  try {
    const { corpId, query, type, limit = 20 } = req.body;

    if (!corpId) {
      return res.status(400).json({ error: 'corpId is required' });
    }

    const memoryIds = await redis.smembers(`memory:entity:${corpId}`);
    const results = [];

    for (const memoryId of memoryIds) {
      const memory = await redis.get(`memory:${memoryId}`);
      if (memory) {
        const parsed = JSON.parse(memory);

        // Filter by type if specified
        if (type && parsed.type !== type) continue;

        // Search in content
        if (query) {
          const searchStr = parsed.content.toLowerCase();
          const queryLower = query.toLowerCase();

          if (searchStr.includes(queryLower)) {
            // Calculate relevance score
            const index = searchStr.indexOf(queryLower);
            const relevance = 10 - Math.min(index / 10, 9);
            results.push({ ...parsed, relevance });
          }
        } else {
          results.push({ ...parsed, relevance: parsed.importance });
        }
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    res.json({ results: results.slice(0, parseInt(limit)), total: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update memory
 * PATCH /api/memories/:memoryId
 */
router.patch('/:memoryId', async (req, res) => {
  try {
    const { memoryId } = req.params;
    const existing = await redis.get(`memory:${memoryId}`);

    if (!existing) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const memory = JSON.parse(existing);
    const updates = req.body;

    // Don't allow changing id or corpId
    delete updates.id;
    delete updates.corpId;

    const updated = {
      ...memory,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await redis.set(`memory:${memoryId}`, JSON.stringify(updated));

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete memory
 * DELETE /api/memories/:memoryId
 */
router.delete('/:memoryId', async (req, res) => {
  try {
    const { memoryId } = req.params;
    const existing = await redis.get(`memory:${memoryId}`);

    if (!existing) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const memory = JSON.parse(existing);

    // Remove from indexes
    await redis.srem(`memory:entity:${memory.corpId}`, memoryId);
    await redis.srem(`memory:type:${memory.type}`, memoryId);
    await redis.zrem(`memory:search:${memory.corpId}`, memoryId);

    // Delete memory
    await redis.del(`memory:${memoryId}`);

    res.json({ success: true, deleted: memoryId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Consolidate memories (for learning)
 * POST /api/memories/:corpId/consolidate
 */
router.post('/:corpId/consolidate', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { type } = req.body;

    const memoryIds = await redis.smembers(`memory:entity:${corpId}`);
    const episodic = [];
    const semantic = [];

    for (const memoryId of memoryIds) {
      const memory = await redis.get(`memory:${memoryId}`);
      if (memory) {
        const parsed = JSON.parse(memory);
        if (parsed.type === MEMORY_TYPES.EPISODIC) {
          episodic.push(parsed);
        } else if (parsed.type === MEMORY_TYPES.SEMANTIC) {
          semantic.push(parsed);
        }
      }
    }

    // Extract key facts from episodic to semantic
    const newFacts = episodic
      .filter(m => m.importance >= 7)
      .map(m => ({
        fact: m.content.slice(0, 200),
        source: m.id,
        extractedAt: new Date().toISOString()
      }));

    res.json({
      corpId,
      episodicCount: episodic.length,
      semanticCount: semantic.length,
      extractedFacts: newFacts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
