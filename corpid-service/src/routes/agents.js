/**
 * Agent Routes - AI Agent registration and management
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, ENTITY_TYPES } from '../index.js';

const router = Router();

/**
 * Register AI Agent
 * POST /api/agents/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, type, capabilities = [], ownerCorpId, metadata = {} } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }

    const corpId = `AGT-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    const now = new Date().toISOString();

    const agent = {
      corpId,
      type: 'AGENT',
      name,
      agentType: type, // sales, support, ops, etc.
      capabilities,
      ownerCorpId: ownerCorpId || null,
      status: 'active',
      trustScore: 70, // Agents start with higher trust
      verified: true, // Agents are pre-verified
      metadata,
      createdAt: now,
      updatedAt: now
    };

    // Store agent
    await redis.set(`corpId:entity:${corpId}`, JSON.stringify(agent));
    await redis.sadd('corpId:entities', corpId);
    await redis.sadd('corpId:type:AGENT', corpId);
    await redis.sadd('corpId:agents', corpId);

    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get agent
 * GET /api/agents/:corpId
 */
router.get('/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const agent = await redis.get(`corpId:entity:${corpId}`);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(JSON.parse(agent));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update agent capabilities
 * PATCH /api/agents/:corpId/capabilities
 */
router.patch('/:corpId/capabilities', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { capabilities } = req.body;

    const agent = await redis.get(`corpId:entity:${corpId}`);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const parsed = JSON.parse(agent);
    parsed.capabilities = capabilities;
    parsed.updatedAt = new Date().toISOString();

    await redis.set(`corpId:entity:${corpId}`, JSON.stringify(parsed));

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all agents
 * GET /api/agents
 */
router.get('/', async (req, res) => {
  try {
    const { type, owner, limit = 50 } = req.query;

    let corpIds;
    if (type) {
      corpIds = await redis.smembers(`corpId:type:AGENT`);
    } else {
      corpIds = await redis.smembers('corpId:agents');
    }

    const agents = [];
    for (const corpId of corpIds.slice(0, parseInt(limit))) {
      const agent = await redis.get(`corpId:entity:${corpId}`);
      if (agent) {
        const parsed = JSON.parse(agent);
        if (!owner || parsed.ownerCorpId === owner) {
          agents.push(parsed);
        }
      }
    }

    res.json({ agents, total: agents.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search agents by capability
 * GET /api/agents/search?capability=sales
 */
router.get('/search/find', async (req, res) => {
  try {
    const { capability, type } = req.query;

    const corpIds = await redis.smembers('corpId:agents');
    const matches = [];

    for (const corpId of corpIds) {
      const agent = await redis.get(`corpId:entity:${corpId}`);
      if (agent) {
        const parsed = JSON.parse(agent);
        const matchesCapability = !capability ||
          parsed.capabilities.some(c => c.toLowerCase().includes(capability.toLowerCase()));
        const matchesType = !type || parsed.agentType === type;

        if (matchesCapability && matchesType) {
          matches.push(parsed);
        }
      }
    }

    res.json({ agents: matches, total: matches.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
