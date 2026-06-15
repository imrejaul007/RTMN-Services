/**
 * Context Routes - Get context for AI interactions
 */

import { Router } from 'express';
import { redis, MEMORY_TYPES } from '../index.js';

const router = Router();

/**
 * Get context for AI conversation
 * POST /api/context/get
 */
router.post('/get', async (req, res) => {
  try {
    const { corpId, query, limit = 10 } = req.body;

    if (!corpId) {
      return res.status(400).json({ error: 'corpId is required' });
    }

    // Get recent memories
    const memoryIds = await redis.smembers(`memory:entity:${corpId}`);
    const memories = [];

    for (const memoryId of memoryIds.slice(0, 50)) {
      const memory = await redis.get(`memory:${memoryId}`);
      if (memory) {
        memories.push(JSON.parse(memory));
      }
    }

    // Build context
    const context = {
      corpId,
      episodic: memories.filter(m => m.type === MEMORY_TYPES.EPISODIC).slice(-5),
      semantic: memories.filter(m => m.type === MEMORY_TYPES.SEMANTIC).slice(-5),
      relational: memories.filter(m => m.type === MEMORY_TYPES.RELATIONAL).slice(-5),
      procedural: memories.filter(m => m.type === MEMORY_TYPES.PROCEDURAL).slice(-5),
      recentActivity: memories
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5)
    };

    res.json(context);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get conversation history
 * GET /api/context/history/:corpId
 */
router.get('/history/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { limit = 20 } = req.query;

    // Get episodic memories (conversation = episodic)
    const memoryIds = await redis.smembers(`memory:entity:${corpId}`);
    const conversations = [];

    for (const memoryId of memoryIds) {
      const memory = await redis.get(`memory:${memoryId}`);
      if (memory) {
        const parsed = JSON.parse(memory);
        if (parsed.type === MEMORY_TYPES.EPISODIC && parsed.metadata?.conversation) {
          conversations.push(parsed);
        }
      }
    }

    // Sort by timestamp
    conversations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      conversations: conversations.slice(0, parseInt(limit)),
      total: conversations.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Store conversation turn
 * POST /api/context/conversation
 */
router.post('/conversation', async (req, res) => {
  try {
    const { corpId, role, content, metadata = {} } = req.body;

    if (!corpId || !role || !content) {
      return res.status(400).json({ error: 'corpId, role, and content are required' });
    }

    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const memory = {
      id: memoryId,
      corpId,
      type: MEMORY_TYPES.EPISODIC,
      content,
      metadata: {
        ...metadata,
        conversation: true,
        role
      },
      importance: 5,
      accessCount: 0,
      createdAt: now,
      updatedAt: now
    };

    await redis.set(`memory:${memoryId}`, JSON.stringify(memory));
    await redis.sadd(`memory:entity:${corpId}`, memoryId);
    await redis.sadd('memory:entities', corpId);

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get preferences
 * GET /api/context/preferences/:corpId
 */
router.get('/preferences/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;

    // Get semantic memories (preferences = semantic)
    const memoryIds = await redis.smembers(`memory:entity:${corpId}`);
    const preferences = [];

    for (const memoryId of memoryIds) {
      const memory = await redis.get(`memory:${memoryId}`);
      if (memory) {
        const parsed = JSON.parse(memory);
        if (parsed.type === MEMORY_TYPES.SEMANTIC && parsed.metadata?.preference) {
          preferences.push(parsed);
        }
      }
    }

    res.json({ preferences, total: preferences.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Store preference
 * POST /api/context/preferences
 */
router.post('/preferences', async (req, res) => {
  try {
    const { corpId, key, value, category = 'general' } = req.body;

    if (!corpId || !key || value === undefined) {
      return res.status(400).json({ error: 'corpId, key, and value are required' });
    }

    const memoryId = `mem_pref_${uuidv4()}`;
    const now = new Date().toISOString();

    const memory = {
      id: memoryId,
      corpId,
      type: MEMORY_TYPES.SEMANTIC,
      content: `Preference: ${key} = ${value}`,
      metadata: {
        preference: true,
        key,
        value,
        category
      },
      importance: 7,
      accessCount: 0,
      createdAt: now,
      updatedAt: now
    };

    await redis.set(`memory:${memoryId}`, JSON.stringify(memory));
    await redis.sadd(`memory:entity:${corpId}`, memoryId);
    await redis.sadd('memory:entities', corpId);

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
