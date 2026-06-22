/**
 * Sync Routes
 * Memory synchronization between tiers
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, MEMORY_TIERS } from '../index.js';

const router = Router();

/**
 * Sync memory between tiers
 * POST /api/sync
 */
router.post('/', async (req, res) => {
  try {
    const { memoryId, targetTier, merge = false } = req.body;

    const existing = await redis.get(`memory:${memoryId}`);
    if (!existing) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const memory = JSON.parse(existing);
    const now = new Date().toISOString();

    let syncedMemory;

    if (merge) {
      // Check if memory exists at target tier
      const existingIds = await redis.smembers(`memories:tier:${targetTier}`);
      const existingAtTarget = existingIds.find(async (id) => {
        const data = await redis.get(`memory:${id}`);
        return data && JSON.parse(data).content === memory.content;
      });

      if (existingAtTarget) {
        // Merge metadata
        const existingData = await redis.get(`memory:${existingAtTarget}`);
        const existingMem = JSON.parse(existingData);
        existingMem.metadata = { ...existingMem.metadata, ...memory.metadata };
        existingMem.tags = [...new Set([...existingMem.tags, ...memory.tags])];
        existingMem.updatedAt = now;
        await redis.set(`memory:${existingAtTarget}`, JSON.stringify(existingMem));

        return res.json({
          message: 'Memory merged',
          existingId: existingAtTarget,
          merged: true
        });
      }
    }

    // Create new memory at target tier
    syncedMemory = {
      ...memory,
      id: `mem_${uuidv4()}`,
      tier: targetTier,
      originalMemoryId: memoryId,
      syncedAt: now,
      createdAt: now,
      updatedAt: now
    };

    await redis.set(`memory:${syncedMemory.id}`, JSON.stringify(syncedMemory));
    await redis.sadd(`memories:tier:${targetTier}`, syncedMemory.id);

    res.status(201).json({
      message: 'Memory synced',
      originalId: memoryId,
      newId: syncedMemory.id,
      fromTier: memory.tier,
      toTier: targetTier
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Bulk sync memories to target tier
 * POST /api/sync/bulk
 */
router.post('/bulk', async (req, res) => {
  try {
    const { memoryIds, targetTier, preserveOriginal = true } = req.body;

    if (!memoryIds || !targetTier) {
      return res.status(400).json({ error: 'memoryIds and targetTier required' });
    }

    const results = { synced: [], failed: [] };

    for (const memoryId of memoryIds) {
      try {
        const existing = await redis.get(`memory:${memoryId}`);
        if (!existing) {
          results.failed.push({ memoryId, error: 'Not found' });
          continue;
        }

        const memory = JSON.parse(existing);
        const now = new Date().toISOString();

        const syncedMemory = {
          ...memory,
          id: `mem_${uuidv4()}`,
          tier: targetTier,
          originalMemoryId: memoryId,
          syncedAt: now,
          createdAt: now,
          updatedAt: now
        };

        await redis.set(`memory:${syncedMemory.id}`, JSON.stringify(syncedMemory));
        await redis.sadd(`memories:tier:${targetTier}`, syncedMemory.id);

        results.synced.push({
          originalId: memoryId,
          newId: syncedMemory.id
        });
      } catch (err) {
        results.failed.push({ memoryId, error: err.message });
      }
    }

    res.json({
      message: 'Bulk sync complete',
      total: memoryIds.length,
      synced: results.synced.length,
      failed: results.failed.length,
      details: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get sync history
 * GET /api/sync/history/:ownerId
 */
router.get('/history/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;

    const allIds = await redis.smembers(`memories:owner:${ownerId}`);

    const syncedMemories = [];

    for (const id of allIds) {
      const data = await redis.get(`memory:${id}`);
      if (data) {
        const mem = JSON.parse(data);
        if (mem.syncedAt || mem.originalMemoryId || mem.propagatedAt) {
          syncedMemories.push(mem);
        }
      }
    }

    // Sort by sync time
    syncedMemories.sort((a, b) => {
      const aTime = a.syncedAt || a.propagatedAt;
      const bTime = b.syncedAt || b.propagatedAt;
      return new Date(bTime) - new Date(aTime);
    });

    res.json({
      ownerId,
      history: syncedMemories,
      total: syncedMemories.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Revert synced memory
 * DELETE /api/sync/revert/:syncedMemoryId
 */
router.delete('/revert/:syncedMemoryId', async (req, res) => {
  try {
    const { syncedMemoryId } = req.params;

    const existing = await redis.get(`memory:${syncedMemoryId}`);
    if (!existing) {
      return res.status(404).json({ error: 'Synced memory not found' });
    }

    const memory = JSON.parse(existing);

    if (!memory.originalMemoryId) {
      return res.status(400).json({ error: 'This memory was not synced' });
    }

    // Remove synced memory
    await redis.del(`memory:${syncedMemoryId}`);
    await redis.srem(`memories:tier:${memory.tier}`, syncedMemoryId);

    res.json({
      message: 'Synced memory reverted',
      removedId: syncedMemoryId,
      originalId: memory.originalMemoryId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Auto-sync based on rules
 * POST /api/sync/auto
 */
router.post('/auto', async (req, res) => {
  try {
    const { ownerId, rules = [] } = req.body;

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId required' });
    }

    // Default rules
    const defaultRules = [
      {
        condition: { tier: 'personal', priority: 8 },
        action: 'sync',
        targetTier: 'business',
        trigger: 'high_priority'
      },
      {
        condition: { tier: 'business', tag: 'industry-trend' },
        action: 'sync',
        targetTier: 'industry',
        trigger: 'tag_match'
      }
    ];

    const activeRules = rules.length > 0 ? rules : defaultRules;
    const results = [];

    for (const rule of activeRules) {
      // Get memories matching condition
      const condition = rule.condition;
      let matchingIds = await redis.smembers(`memories:owner:${ownerId}`);

      if (condition.tier) {
        const tierIds = await redis.smembers(`memories:tier:${condition.tier}:owner:${ownerId}`);
        matchingIds = matchingIds.filter(id => tierIds.includes(id));
      }

      for (const id of matchingIds) {
        const data = await redis.get(`memory:${id}`);
        if (!data) continue;

        const mem = JSON.parse(data);

        // Check conditions
        let matches = true;
        if (condition.tag && !mem.tags?.includes(condition.tag)) matches = false;
        if (condition.priority && mem.priority < condition.priority) matches = false;

        if (matches && rule.action === 'sync') {
          // Sync memory
          const synced = {
            ...mem,
            id: `mem_${uuidv4()}`,
            tier: rule.targetTier,
            originalMemoryId: mem.id,
            syncedAt: new Date().toISOString(),
            syncRule: rule.trigger
          };

          await redis.set(`memory:${synced.id}`, JSON.stringify(synced));
          await redis.sadd(`memories:tier:${rule.targetTier}`, synced.id);

          results.push({
            originalId: mem.id,
            newId: synced.id,
            rule: rule.trigger
          });
        }
      }
    }

    res.json({
      message: 'Auto-sync complete',
      rulesApplied: activeRules.length,
      synced: results.length,
      details: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
