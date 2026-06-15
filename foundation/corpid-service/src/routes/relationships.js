/**
 * Relationship Routes - Entity relationships
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../index.js';

const router = Router();

// Relationship types
const RELATIONSHIP_TYPES = [
  'owns',
  'employs',
  'works_at',
  'manages',
  'supplies',
  'sells',
  'buys',
  'partners_with',
  'franchised_by',
  'licensed_to',
  'delegates_to',
  'trusts'
];

/**
 * Create relationship
 * POST /api/relationships
 */
router.post('/', async (req, res) => {
  try {
    const { fromCorpId, toCorpId, relationshipType, properties = {} } = req.body;

    if (!fromCorpId || !toCorpId || !relationshipType) {
      return res.status(400).json({
        error: 'fromCorpId, toCorpId, and relationshipType are required'
      });
    }

    // Verify both entities exist
    const from = await redis.get(`corpId:entity:${fromCorpId}`);
    const to = await redis.get(`corpId:entity:${toCorpId}`);

    if (!from || !to) {
      return res.status(404).json({ error: 'One or both entities not found' });
    }

    const relId = `rel_${uuidv4()}`;
    const relationship = {
      id: relId,
      fromCorpId,
      toCorpId,
      type: relationshipType,
      properties,
      createdAt: new Date().toISOString()
    };

    // Store relationship
    await redis.set(`corpId:rel:${relId}`, JSON.stringify(relationship));

    // Add to entity indexes
    await redis.sadd(`corpId:from:${fromCorpId}`, relId);
    await redis.sadd(`corpId:to:${toCorpId}`, relId);
    await redis.sadd(`corpId:rel:type:${relationshipType}`, relId);

    res.status(201).json(relationship);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get relationships for entity
 * GET /api/relationships/:corpId
 */
router.get('/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { direction = 'both' } = req.query;

    const relIds = new Set();

    if (direction === 'outbound' || direction === 'both') {
      const outbound = await redis.smembers(`corpId:from:${corpId}`);
      outbound.forEach(id => relIds.add(id));
    }

    if (direction === 'inbound' || direction === 'both') {
      const inbound = await redis.smembers(`corpId:to:${corpId}`);
      inbound.forEach(id => relIds.add(id));
    }

    const relationships = [];
    for (const relId of relIds) {
      const rel = await redis.get(`corpId:rel:${relId}`);
      if (rel) {
        relationships.push(JSON.parse(rel));
      }
    }

    res.json({ relationships, total: relationships.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete relationship
 * DELETE /api/relationships/:relId
 */
router.delete('/:relId', async (req, res) => {
  try {
    const { relId } = req.params;

    const rel = await redis.get(`corpId:rel:${relId}`);
    if (!rel) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    const parsed = JSON.parse(rel);

    // Remove from indexes
    await redis.srem(`corpId:from:${parsed.fromCorpId}`, relId);
    await redis.srem(`corpId:to:${parsed.toCorpId}`, relId);
    await redis.srem(`corpId:rel:type:${parsed.type}`, relId);

    // Delete relationship
    await redis.del(`corpId:rel:${relId}`);

    res.json({ success: true, deleted: relId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get relationship path between two entities
 * GET /api/relationships/path?from=&to=
 */
router.get('/path/find', async (req, res) => {
  try {
    const { from, to, maxDepth = 5 } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to are required' });
    }

    // BFS to find shortest path
    const visited = new Set();
    const queue = [{ corpId: from, path: [from] }];
    let found = null;

    while (queue.length > 0 && !found) {
      const current = queue.shift();

      if (current.corpId === to) {
        found = current.path;
        break;
      }

      if (visited.has(current.corpId) || current.path.length > parseInt(maxDepth)) {
        continue;
      }

      visited.add(current.corpId);

      // Get outbound relationships
      const relIds = await redis.smembers(`corpId:from:${current.corpId}`);
      for (const relId of relIds) {
        const rel = await redis.get(`corpId:rel:${relId}`);
        if (rel) {
          const parsed = JSON.parse(rel);
          if (!visited.has(parsed.toCorpId)) {
            queue.push({
              corpId: parsed.toCorpId,
              path: [...current.path, parsed.toCorpId]
            });
          }
        }
      }
    }

    res.json({
      found: !!found,
      path: found || [],
      length: found ? found.length - 1 : -1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
