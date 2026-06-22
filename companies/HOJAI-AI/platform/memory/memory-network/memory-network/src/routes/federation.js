/**
 * Federation Routes
 * Cross-tier memory queries
 */

import { Router } from 'express';
import { redis, MEMORY_TIERS } from '../index.js';

const router = Router();

/**
 * Federated search across memory tiers
 * POST /api/federation/search
 */
router.post('/search', async (req, res) => {
  try {
    const {
      query,
      tiers = Object.values(MEMORY_TIERS),
      ownerId,
      companyId,
      industryId,
      limit = 50
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const searchLower = query.toLowerCase();
    const results = { memories: [], byTier: {} };

    for (const tier of tiers) {
      let memoryIds = [];

      // Get base IDs based on scope
      if (ownerId) {
        memoryIds = await redis.smembers(`memories:tier:${tier}:owner:${ownerId}`);
      } else if (companyId) {
        memoryIds = await redis.smembers(`memories:tier:${tier}:company:${companyId}`);
      } else if (industryId) {
        memoryIds = await redis.smembers(`memories:tier:${tier}:industry:${industryId}`);
      } else {
        memoryIds = await redis.smembers(`memories:tier:${tier}`);
      }

      // Search within tier
      const tierResults = [];
      for (const id of memoryIds) {
        const data = await redis.get(`memory:${id}`);
        if (data) {
          const mem = JSON.parse(data);
          if (
            mem.content.toLowerCase().includes(searchLower) ||
            JSON.stringify(mem.metadata).toLowerCase().includes(searchLower) ||
            mem.tags?.some(t => t.toLowerCase().includes(searchLower))
          ) {
            tierResults.push(mem);
          }
        }
      }

      results.byTier[tier] = tierResults.length;
      results.memories.push(...tierResults);
    }

    // Sort by tier hierarchy (personal first, then business, etc.)
    const tierOrder = { personal: 1, business: 2, industry: 3, ecosystem: 4, agent: 5 };
    results.memories.sort((a, b) => (tierOrder[a.tier] || 99) - (tierOrder[b.tier] || 99));

    results.memories = results.memories.slice(0, Number(limit));

    res.json({
      query,
      tiers,
      total: results.memories.length,
      byTier: results.byTier,
      memories: results.memories
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get context across tiers
 * GET /api/federation/context/:ownerId
 */
router.get('/context/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { scope = 'all' } = req.query;

    const context = {
      personal: [],
      business: [],
      industry: [],
      ecosystem: [],
      agent: []
    };

    // Get personal memories
    const personalIds = await redis.smembers(`memories:tier:${MEMORY_TIERS.PERSONAL}:owner:${ownerId}`);
    for (const id of personalIds.slice(0, 20)) {
      const data = await redis.get(`memory:${id}`);
      if (data) context.personal.push(JSON.parse(data));
    }

    // Get business memories
    const businessIds = await redis.smembers(`memories:tier:${MEMORY_TIERS.BUSINESS}:owner:${ownerId}`);
    for (const id of businessIds.slice(0, 10)) {
      const data = await redis.get(`memory:${id}`);
      if (data) context.business.push(JSON.parse(data));
    }

    // Get agent memories
    const agentIds = await redis.smembers(`memories:tier:${MEMORY_TIERS.AGENT}`);
    for (const id of agentIds.slice(0, 10)) {
      const data = await redis.get(`memory:${id}`);
      if (data) context.agent.push(JSON.parse(data));
    }

    // If scope includes ecosystem
    if (scope === 'all') {
      const ecosystemIds = await redis.smembers(`memories:tier:${MEMORY_TIERS.ECOSYSTEM}`);
      for (const id of ecosystemIds.slice(0, 5)) {
        const data = await redis.get(`memory:${id}`);
        if (data) context.ecosystem.push(JSON.parse(data));
      }
    }

    res.json({
      ownerId,
      context
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Aggregate memories across tiers
 * POST /api/federation/aggregate
 */
router.post('/aggregate', async (req, res) => {
  try {
    const {
      ownerId,
      tiers = Object.values(MEMORY_TIERS),
      groupBy = 'tier'
    } = req.body;

    const allIds = [];

    for (const tier of tiers) {
      const ids = await redis.smembers(`memories:tier:${tier}:owner:${ownerId}`);
      allIds.push(...ids.map(id => ({ id, tier })));
    }

    const memories = await Promise.all(
      allIds.map(async ({ id, tier }) => {
        const data = await redis.get(`memory:${id}`);
        return data ? { ...JSON.parse(data), tier } : null;
      })
    );

    const validMemories = memories.filter(m => m);

    // Group by specified field
    const grouped = validMemories.reduce((acc, mem) => {
      const key = groupBy === 'tier' ? mem.tier :
                   groupBy === 'type' ? mem.type :
                   groupBy === 'privacy' ? mem.privacy : 'other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(mem);
      return acc;
    }, {});

    res.json({
      ownerId,
      total: validMemories.length,
      grouped,
      groupBy
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get related memories across tiers
 * GET /api/federation/related/:memoryId
 */
router.get('/related/:memoryId', async (req, res) => {
  try {
    const { memoryId } = req.params;
    const memory = await redis.get(`memory:${memoryId}`);

    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const mem = JSON.parse(memory);
    const related = [];

    // Find memories with shared tags
    for (const tag of mem.tags || []) {
      const tagIds = await redis.smembers(`memories:tag:${tag}`);
      for (const id of tagIds) {
        if (id !== memoryId) {
          const data = await redis.get(`memory:${id}`);
          if (data) {
            related.push({
              ...JSON.parse(data),
              relationType: 'tag',
              sharedTag: tag
            });
          }
        }
      }
    }

    // Find memories from same owner
    if (mem.ownerId) {
      const ownerIds = await redis.smembers(`memories:owner:${mem.ownerId}`);
      for (const id of ownerIds) {
        if (id !== memoryId && !related.find(r => r.id === id)) {
          const data = await redis.get(`memory:${id}`);
          if (data) {
            related.push({
              ...JSON.parse(data),
              relationType: 'owner'
            });
          }
        }
      }
    }

    res.json({
      memory: mem,
      related: related.slice(0, 20),
      total: related.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
