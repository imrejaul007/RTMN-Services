/**
 * Identity Routes - Create, read, update, delete entities
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, ENTITY_TYPES } from '../index.js';

const router = Router();

/**
 * Generate CorpID
 */
function generateCorpId(type) {
  const prefix = ENTITY_TYPES[type] || 'UNK';
  const unique = uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();
  return `${prefix}-${unique}`;
}

/**
 * Create new entity
 * POST /api/identity/create
 */
router.post('/create', async (req, res) => {
  try {
    const { type, name, email, phone, metadata = {} } = req.body;

    if (!type || !name) {
      return res.status(400).json({ error: 'type and name are required' });
    }

    if (!ENTITY_TYPES[type]) {
      return res.status(400).json({
        error: `Invalid type. Valid types: ${Object.keys(ENTITY_TYPES).join(', ')}`
      });
    }

    const corpId = generateCorpId(type);
    const now = new Date().toISOString();

    const entity = {
      corpId,
      type,
      name,
      email: email || null,
      phone: phone || null,
      metadata,
      verified: false,
      trustScore: 50, // Default trust score
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    // Store entity
    await redis.set(`corpId:entity:${corpId}`, JSON.stringify(entity));
    await redis.sadd('corpId:entities', corpId);
    await redis.sadd(`corpId:type:${type}`, corpId);

    logger?.info(`Created entity: ${corpId} (${type})`);

    res.status(201).json(entity);
  } catch (error) {
    logger?.error('Create entity error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get entity by CorpID
 * GET /api/identity/:corpId
 */
router.get('/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const entity = await redis.get(`corpId:entity:${corpId}`);

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json(JSON.parse(entity));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update entity
 * PATCH /api/identity/:corpId
 */
router.patch('/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const existing = await redis.get(`corpId:entity:${corpId}`);

    if (!existing) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const entity = JSON.parse(existing);
    const updates = req.body;

    // Don't allow changing corpId or type
    delete updates.corpId;
    delete updates.type;

    const updated = {
      ...entity,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await redis.set(`corpId:entity:${corpId}`, JSON.stringify(updated));

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify entity (KYC/KYB)
 * POST /api/identity/:corpId/verify
 */
router.post('/:corpId/verify', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { verificationType = 'basic' } = req.body;

    const existing = await redis.get(`corpId:entity:${corpId}`);
    if (!existing) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const entity = JSON.parse(existing);
    entity.verified = true;
    entity.verificationType = verificationType;
    entity.verifiedAt = new Date().toISOString();
    entity.updatedAt = new Date().toISOString();

    await redis.set(`corpId:entity:${corpId}`, JSON.stringify(entity));

    res.json({
      corpId,
      verified: true,
      verificationType,
      verifiedAt: entity.verifiedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search entities
 * GET /api/identity/search?q=...
 */
router.get('/search/find', async (req, res) => {
  try {
    const { q, type, limit = 20 } = req.query;

    let corpIds = [];

    if (type && ENTITY_TYPES[type]) {
      corpIds = await redis.smembers(`corpId:type:${type}`);
    } else {
      corpIds = await redis.smembers('corpId:entities');
    }

    const results = [];
    for (const corpId of corpIds.slice(0, parseInt(limit))) {
      const entity = await redis.get(`corpId:entity:${corpId}`);
      if (entity) {
        const parsed = JSON.parse(entity);
        if (!q || parsed.name.toLowerCase().includes(q.toLowerCase())) {
          results.push(parsed);
        }
      }
    }

    res.json({ results, total: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resolve identity across systems
 * POST /api/identity/resolve
 */
router.post('/resolve', async (req, res) => {
  try {
    const { email, phone, externalId } = req.body;

    // Search all entities for matching identifiers
    const corpIds = await redis.smembers('corpId:entities');
    const matches = [];

    for (const corpId of corpIds) {
      const entity = await redis.get(`corpId:entity:${corpId}`);
      if (entity) {
        const parsed = JSON.parse(entity);
        if (email && parsed.email === email) matches.push(parsed);
        if (phone && parsed.phone === phone) matches.push(parsed);
        if (externalId && parsed.metadata?.externalId === externalId) matches.push(parsed);
      }
    }

    res.json({
      resolved: matches.length > 0,
      matches,
      count: matches.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
