/**
 * Tier Routes
 * Memory tier-specific operations
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, MEMORY_TIERS } from '../index.js';

const router = Router();

/**
 * Get tier hierarchy
 * GET /api/tiers
 */
router.get('/', (req, res) => {
  const hierarchy = {
    personal: {
      tier: MEMORY_TIERS.PERSONAL,
      level: 1,
      description: 'Individual user memories - private to each user',
      parent: null,
      children: ['business'],
      example: 'User preferences, conversation history'
    },
    business: {
      tier: MEMORY_TIERS.BUSINESS,
      level: 2,
      description: 'Company-wide context - accessible to organization',
      parent: 'personal',
      children: ['industry'],
      example: 'Company policies, team knowledge'
    },
    industry: {
      tier: MEMORY_TIERS.INDUSTRY,
      level: 3,
      description: 'Industry knowledge - shared within industry',
      parent: 'business',
      children: ['ecosystem'],
      example: 'Best practices, market trends'
    },
    ecosystem: {
      tier: MEMORY_TIERS.ECOSYSTEM,
      level: 4,
      description: 'Cross-company context - RTMN-wide knowledge',
      parent: 'industry',
      children: ['agent'],
      example: 'Cross-industry patterns, network insights'
    },
    agent: {
      tier: MEMORY_TIERS.AGENT,
      level: 5,
      description: 'AI agent memories - learned behaviors',
      parent: 'ecosystem',
      children: [],
      example: 'Agent capabilities, learned skills'
    }
  };

  res.json({
    tiers: hierarchy,
    totalLevels: 5,
    flow: 'personal → business → industry → ecosystem → agent'
  });
});

/**
 * Store personal memory
 * POST /api/tiers/personal
 */
router.post('/personal', async (req, res) => {
  try {
    const { ownerId, content, metadata = {}, tags = [] } = req.body;

    if (!ownerId || !content) {
      return res.status(400).json({ error: 'ownerId and content required' });
    }

    const memoryId = `mem_${uuidv4()}`;
    const now = new Date().toISOString();

    const memory = {
      id: memoryId,
      tier: MEMORY_TIERS.PERSONAL,
      ownerId,
      type: 'semantic',
      content,
      metadata,
      tags,
      privacy: 'private',
      createdAt: now,
      updatedAt: now
    };

    await redis.set(`memory:${memoryId}`, JSON.stringify(memory));
    await redis.sadd(`memories:tier:${MEMORY_TIERS.PERSONAL}`, memoryId);
    await redis.sadd(`memories:tier:${MEMORY_TIERS.PERSONAL}:owner:${ownerId}`, memoryId);
    await redis.sadd(`memories:owner:${ownerId}`, memoryId);

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Store business memory
 * POST /api/tiers/business
 */
router.post('/business', async (req, res) => {
  try {
    const { ownerId, companyId, content, metadata = {}, tags = [] } = req.body;

    if (!ownerId || !companyId || !content) {
      return res.status(400).json({ error: 'ownerId, companyId, and content required' });
    }

    const memoryId = `mem_${uuidv4()}`;
    const now = new Date().toISOString();

    const memory = {
      id: memoryId,
      tier: MEMORY_TIERS.BUSINESS,
      ownerId,
      companyId,
      type: 'semantic',
      content,
      metadata,
      tags,
      privacy: 'company',
      createdAt: now,
      updatedAt: now
    };

    await redis.set(`memory:${memoryId}`, JSON.stringify(memory));
    await redis.sadd(`memories:tier:${MEMORY_TIERS.BUSINESS}`, memoryId);
    await redis.sadd(`memories:tier:${MEMORY_TIERS.BUSINESS}:company:${companyId}`, memoryId);
    await redis.sadd(`memories:company:${companyId}`, memoryId);

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Store industry memory
 * POST /api/tiers/industry
 */
router.post('/industry', async (req, res) => {
  try {
    const { industryId, content, metadata = {}, tags = [] } = req.body;

    if (!industryId || !content) {
      return res.status(400).json({ error: 'industryId and content required' });
    }

    const memoryId = `mem_${uuidv4()}`;
    const now = new Date().toISOString();

    const memory = {
      id: memoryId,
      tier: MEMORY_TIERS.INDUSTRY,
      industryId,
      type: 'semantic',
      content,
      metadata,
      tags,
      privacy: 'industry',
      createdAt: now,
      updatedAt: now
    };

    await redis.set(`memory:${memoryId}`, JSON.stringify(memory));
    await redis.sadd(`memories:tier:${MEMORY_TIERS.INDUSTRY}`, memoryId);
    await redis.sadd(`memories:tier:${MEMORY_TIERS.INDUSTRY}:industry:${industryId}`, memoryId);
    await redis.sadd(`memories:industry:${industryId}`, memoryId);

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Store ecosystem memory
 * POST /api/tiers/ecosystem
 */
router.post('/ecosystem', async (req, res) => {
  try {
    const { content, metadata = {}, tags = [] } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content required' });
    }

    const memoryId = `mem_${uuidv4()}`;
    const now = new Date().toISOString();

    const memory = {
      id: memoryId,
      tier: MEMORY_TIERS.ECOSYSTEM,
      type: 'semantic',
      content,
      metadata,
      tags,
      privacy: 'public',
      createdAt: now,
      updatedAt: now
    };

    await redis.set(`memory:${memoryId}`, JSON.stringify(memory));
    await redis.sadd(`memories:tier:${MEMORY_TIERS.ECOSYSTEM}`, memoryId);

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Store agent memory
 * POST /api/tiers/agent
 */
router.post('/agent', async (req, res) => {
  try {
    const { agentId, type = 'procedural', content, metadata = {}, tags = [] } = req.body;

    if (!agentId || !content) {
      return res.status(400).json({ error: 'agentId and content required' });
    }

    const memoryId = `mem_${uuidv4()}`;
    const now = new Date().toISOString();

    const memory = {
      id: memoryId,
      tier: MEMORY_TIERS.AGENT,
      agentId,
      type,
      content,
      metadata,
      tags,
      privacy: 'public',
      createdAt: now,
      updatedAt: now
    };

    await redis.set(`memory:${memoryId}`, JSON.stringify(memory));
    await redis.sadd(`memories:tier:${MEMORY_TIERS.AGENT}`, memoryId);
    await redis.sadd(`memories:tier:${MEMORY_TIERS.AGENT}:agent:${agentId}`, memoryId);
    await redis.sadd(`memories:agent:${agentId}`, memoryId);

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get tier statistics
 * GET /api/tiers/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {};

    for (const tier of Object.values(MEMORY_TIERS)) {
      const count = await redis.scard(`memories:tier:${tier}`);
      stats[tier] = count;
    }

    const total = await redis.scard('memories:all');

    res.json({
      total,
      byTier: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Propagate memory up tier hierarchy
 * POST /api/tiers/propagate
 */
router.post('/propagate', async (req, res) => {
  try {
    const { memoryId, targetTier } = req.body;

    const existing = await redis.get(`memory:${memoryId}`);
    if (!existing) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const memory = JSON.parse(existing);
    const currentTier = memory.tier;

    // Define hierarchy
    const hierarchy = ['personal', 'business', 'industry', 'ecosystem', 'agent'];
    const currentIndex = hierarchy.indexOf(currentTier);
    const targetIndex = hierarchy.indexOf(targetTier);

    if (targetIndex <= currentIndex) {
      return res.status(400).json({
        error: 'Can only propagate up the hierarchy (personal → business → industry → ecosystem → agent)'
      });
    }

    // Create new memory at target tier
    const newMemoryId = `mem_${uuidv4()}`;
    const now = new Date().toISOString();

    const propagatedMemory = {
      ...memory,
      id: newMemoryId,
      tier: targetTier,
      originalMemoryId: memoryId,
      propagatedAt: now,
      createdAt: now,
      updatedAt: now
    };

    await redis.set(`memory:${newMemoryId}`, JSON.stringify(propagatedMemory));
    await redis.sadd(`memories:tier:${targetTier}`, newMemoryId);

    // Add tier-specific index
    if (targetTier === 'business' && memory.companyId) {
      await redis.sadd(`memories:tier:${targetTier}:company:${memory.companyId}`, newMemoryId);
    } else if (targetTier === 'industry' && memory.industryId) {
      await redis.sadd(`memories:tier:${targetTier}:industry:${memory.industryId}`, newMemoryId);
    } else if (targetTier === 'agent' && memory.agentId) {
      await redis.sadd(`memories:tier:${targetTier}:agent:${memory.agentId}`, newMemoryId);
    }

    res.status(201).json({
      message: 'Memory propagated',
      originalMemoryId: memoryId,
      newMemoryId,
      fromTier: currentTier,
      toTier: targetTier
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
