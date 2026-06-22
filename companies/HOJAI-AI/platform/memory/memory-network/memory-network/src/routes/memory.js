/**
 * Memory Routes
 * Core memory operations with tier support
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, MEMORY_TIERS, MEMORY_TYPES, PRIVACY_LEVELS, PRIORITY_LEVELS } from '../index.js';

const router = Router();

/**
 * Store memory with tier
 * POST /api/memory/:tier
 */
router.post('/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    const {
      ownerId,
      type = 'semantic',
      content,
      metadata = {},
      tags = [],
      privacy = 'private',
      priority = 5,
      expiresAt = null
    } = req.body;

    // Validate tier
    if (!Object.values(MEMORY_TIERS).includes(tier)) {
      return res.status(400).json({
        error: `Invalid tier. Valid: ${Object.values(MEMORY_TIERS).join(', ')}`
      });
    }

    // Validate type
    if (!Object.values(MEMORY_TYPES).includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Valid: ${Object.values(MEMORY_TYPES).join(', ')}`
      });
    }

    if (!content || !ownerId) {
      return res.status(400).json({ error: 'ownerId and content are required' });
    }

    const memoryId = `mem_${uuidv4()}`;
    const now = new Date().toISOString();

    const memory = {
      id: memoryId,
      tier,
      ownerId,
      type,
      content,
      metadata,
      tags,
      privacy,
      priority: priority || PRIORITY_LEVELS.NORMAL,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessedAt: null
    };

    // Store memory
    await redis.set(`memory:${memoryId}`, JSON.stringify(memory));

    // Index by tier and owner
    await redis.sadd(`memories:tier:${tier}`, memoryId);
    await redis.sadd(`memories:tier:${tier}:owner:${ownerId}`, memoryId);
    await redis.sadd('memories:all', memoryId);

    // Index by type
    await redis.sadd(`memories:type:${type}`, memoryId);

    // Index by owner
    await redis.sadd(`memories:owner:${ownerId}`, memoryId);

    // Index by tags
    for (const tag of tags) {
      await redis.sadd(`memories:tag:${tag}`, memoryId);
    }

    // Index by privacy
    await redis.sadd(`memories:privacy:${privacy}`, memoryId);

    // Time-based index
    await redis.zadd('memories:created', Date.now(), memoryId);

    // Priority index
    await redis.zadd(`memories:priority:${ownerId}`, priority || 5, memoryId);

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all memories for owner
 * GET /api/memory/:ownerId
 */
router.get('/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { tier, type, tags, limit = 100, offset = 0 } = req.query;

    let memoryIds = await redis.smembers(`memories:owner:${ownerId}`);

    if (!memoryIds || memoryIds.length === 0) {
      return res.json({
        ownerId,
        memories: [],
        total: 0
      });
    }

    // Filter by tier
    if (tier) {
      const tierIds = await redis.smembers(`memories:tier:${tier}:owner:${ownerId}`);
      memoryIds = memoryIds.filter(id => tierIds.includes(id));
    }

    // Filter by type
    if (type) {
      memoryIds = memoryIds.filter(id =>
        redis.sismember(`memories:type:${type}`, id)
      );
    }

    // Filter by tags
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : [tags];
      for (const tag of tagList) {
        const tagIds = await redis.smembers(`memories:tag:${tag}`);
        memoryIds = memoryIds.filter(id => tagIds.includes(id));
      }
    }

    // Pagination
    memoryIds = memoryIds.slice(Number(offset), Number(offset) + Number(limit));

    // Get memory data
    const memories = await Promise.all(
      memoryIds.map(async (id) => {
        const data = await redis.get(`memory:${id}`);
        if (data) {
          const mem = JSON.parse(data);
          // Update access count
          mem.accessCount = (mem.accessCount || 0) + 1;
          mem.lastAccessedAt = new Date().toISOString();
          await redis.set(`memory:${id}`, JSON.stringify(mem));
          return mem;
        }
        return null;
      })
    );

    res.json({
      ownerId,
      tier: tier || 'all',
      memories: memories.filter(m => m),
      total: memories.filter(m => m).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get memory by ID
 * GET /api/memory/memory/:id
 */
router.get('/memory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const memory = await redis.get(`memory:${id}`);

    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const mem = JSON.parse(memory);
    mem.accessCount = (mem.accessCount || 0) + 1;
    mem.lastAccessedAt = new Date().toISOString();
    await redis.set(`memory:${id}`, JSON.stringify(mem));

    res.json(mem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update memory
 * PUT /api/memory/memory/:id
 */
router.put('/memory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await redis.get(`memory:${id}`);

    if (!existing) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const memory = JSON.parse(existing);
    const { content, metadata, tags, privacy, priority, expiresAt } = req.body;

    if (content) memory.content = content;
    if (metadata) memory.metadata = { ...memory.metadata, ...metadata };
    if (tags) memory.tags = tags;
    if (privacy) memory.privacy = privacy;
    if (priority) memory.priority = priority;
    if (expiresAt !== undefined) memory.expiresAt = expiresAt;

    memory.updatedAt = new Date().toISOString();

    await redis.set(`memory:${id}`, JSON.stringify(memory));

    res.json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete memory
 * DELETE /api/memory/memory/:id
 */
router.delete('/memory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await redis.get(`memory:${id}`);

    if (!existing) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const memory = JSON.parse(existing);

    // Remove from all indexes
    await redis.del(`memory:${id}`);
    await redis.srem('memories:all', id);
    await redis.srem(`memories:tier:${memory.tier}`, id);
    await redis.srem(`memories:tier:${memory.tier}:owner:${memory.ownerId}`, id);
    await redis.srem(`memories:type:${memory.type}`, id);
    await redis.srem(`memories:owner:${memory.ownerId}`, id);
    await redis.srem(`memories:privacy:${memory.privacy}`, id);
    await redis.zrem('memories:created', id);

    // Remove tag indexes
    for (const tag of memory.tags || []) {
      await redis.srem(`memories:tag:${tag}`, id);
    }

    res.json({ message: 'Memory deleted', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search memories
 * POST /api/memory/search
 */
router.post('/search', async (req, res) => {
  try {
    const {
      ownerId,
      query,
      tier,
      type,
      tags = [],
      limit = 50
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const searchLower = query.toLowerCase();
    let memoryIds = [];

    // Get candidate IDs based on filters
    if (ownerId) {
      memoryIds = await redis.smembers(`memories:owner:${ownerId}`);
    } else {
      memoryIds = await redis.smembers('memories:all');
    }

    if (tier) {
      const tierIds = await redis.smembers(`memories:tier:${tier}`);
      memoryIds = memoryIds.filter(id => tierIds.includes(id));
    }

    if (type) {
      const typeIds = await redis.smembers(`memories:type:${type}`);
      memoryIds = memoryIds.filter(id => typeIds.includes(id));
    }

    // Search
    const memories = [];
    for (const id of memoryIds.slice(0, Number(limit) * 2)) {
      const data = await redis.get(`memory:${id}`);
      if (data) {
        const mem = JSON.parse(data);
        const contentMatch = mem.content.toLowerCase().includes(searchLower);
        const metaMatch = JSON.stringify(mem.metadata).toLowerCase().includes(searchLower);
        const tagMatch = mem.tags?.some(t => t.toLowerCase().includes(searchLower));

        if (contentMatch || metaMatch || tagMatch) {
          memories.push({
            ...mem,
            relevance: contentMatch ? 2 : (metaMatch || tagMatch ? 1 : 0)
          });
        }
      }
    }

    // Sort by relevance
    memories.sort((a, b) => b.relevance - a.relevance);

    res.json({
      query,
      memories: memories.slice(0, Number(limit)),
      total: memories.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get memories by tier for owner
 * GET /api/memory/:ownerId/tier/:tier
 */
router.get('/:ownerId/tier/:tier', async (req, res) => {
  try {
    const { ownerId, tier } = req.params;
    const memoryIds = await redis.smembers(`memories:tier:${tier}:owner:${ownerId}`);

    const memories = await Promise.all(
      memoryIds.map(async (id) => {
        const data = await redis.get(`memory:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    res.json({
      ownerId,
      tier,
      memories: memories.filter(m => m),
      total: memoryIds.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get memory statistics
 * GET /api/memory/stats/:ownerId
 */
router.get('/stats/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;

    const allIds = await redis.smembers(`memories:owner:${ownerId}`);

    // Count by tier
    const byTier = {};
    for (const tier of Object.values(MEMORY_TIERS)) {
      const tierIds = await redis.smembers(`memories:tier:${tier}:owner:${ownerId}`);
      byTier[tier] = tierIds.length;
    }

    // Count by type
    const byType = {};
    for (const type of Object.values(MEMORY_TYPES)) {
      byType[type] = allIds.filter(id =>
        redis.sismember(`memories:type:${type}`, id)
      ).length;
    }

    // Calculate total priority
    const priorities = await Promise.all(
      allIds.map(async (id) => {
        const data = await redis.get(`memory:${id}`);
        return data ? JSON.parse(data).priority || 5 : 5;
      })
    );

    res.json({
      ownerId,
      totalMemories: allIds.length,
      byTier,
      byType,
      avgPriority: priorities.length > 0
        ? (priorities.reduce((a, b) => a + b, 0) / priorities.length).toFixed(2)
        : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
