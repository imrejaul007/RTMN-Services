/**
 * Twin Routes
 * CRUD operations for unified twins
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, TWIN_TYPES } from '../index.js';

const router = Router();

/**
 * Create a new twin with taxonomy
 * POST /api/twins
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      type,
      subtype,
      industry,
      data = {},
      metadata = {},
      parentTwinId = null
    } = req.body;

    // Validation
    if (!name || !type) {
      return res.status(400).json({
        error: 'name and type are required'
      });
    }

    // Validate type
    if (!Object.values(TWIN_TYPES).includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Valid types: ${Object.values(TWIN_TYPES).join(', ')}`
      });
    }

    const twinId = `twin_${uuidv4()}`;
    const now = new Date().toISOString();

    const twin = {
      id: twinId,
      name,
      type,
      subtype: subtype || null,
      industry: industry || null,
      parentTwinId,
      data,
      metadata,
      relationships: [],
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    // Store twin
    await redis.set(`twin:${twinId}`, JSON.stringify(twin));
    await redis.sadd('twins:all', twinId);
    await redis.sadd(`twins:type:${type}`, twinId);

    // Index by subtype if provided
    if (subtype) {
      await redis.sadd(`twins:subtype:${subtype}`, twinId);
    }

    // Index by industry if provided
    if (industry) {
      await redis.sadd(`twins:industry:${industry}`, twinId);
    }

    // Index by parent if provided (inheritance)
    if (parentTwinId) {
      await redis.sadd(`twins:child:${parentTwinId}`, twinId);
      await redis.sadd(`twins:parent:${twinId}`, parentTwinId);
    }

    res.status(201).json(twin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get twin by ID
 * GET /api/twins/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const twin = await redis.get(`twin:${id}`);

    if (!twin) {
      return res.status(404).json({ error: 'Twin not found' });
    }

    res.json(JSON.parse(twin));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update twin
 * PUT /api/twins/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await redis.get(`twin:${id}`);

    if (!existing) {
      return res.status(404).json({ error: 'Twin not found' });
    }

    const twin = JSON.parse(existing);
    const { name, type, subtype, industry, data, metadata } = req.body;

    // Update fields
    if (name) twin.name = name;
    if (type) {
      if (!Object.values(TWIN_TYPES).includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
      }
      // Remove from old type index
      await redis.srem(`twins:type:${twin.type}`, id);
      twin.type = type;
      await redis.sadd(`twins:type:${type}`, id);
    }
    if (subtype !== undefined) twin.subtype = subtype;
    if (industry !== undefined) twin.industry = industry;
    if (data) twin.data = { ...twin.data, ...data };
    if (metadata) twin.metadata = { ...twin.metadata, ...metadata };

    twin.updatedAt = new Date().toISOString();
    twin.version = (twin.version || 0) + 1;

    await redis.set(`twin:${id}`, JSON.stringify(twin));

    res.json(twin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete twin
 * DELETE /api/twins/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await redis.get(`twin:${id}`);

    if (!existing) {
      return res.status(404).json({ error: 'Twin not found' });
    }

    const twin = JSON.parse(existing);

    // Remove from all indexes
    await redis.del(`twin:${id}`);
    await redis.srem('twins:all', id);
    await redis.srem(`twins:type:${twin.type}`, id);

    if (twin.subtype) {
      await redis.srem(`twins:subtype:${twin.subtype}`, id);
    }
    if (twin.industry) {
      await redis.srem(`twins:industry:${twin.industry}`, id);
    }

    // Remove parent-child relationships
    if (twin.parentTwinId) {
      await redis.srem(`twins:child:${twin.parentTwinId}`, id);
    }
    await redis.del(`twins:child:${id}`);
    await redis.del(`twins:parent:${id}`);

    res.json({ message: 'Twin deleted', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get twins by type
 * GET /api/twins/type/:type
 */
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { subtype, industry, limit = 100, offset = 0 } = req.query;

    if (!Object.values(TWIN_TYPES).includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    let twinIds = await redis.smembers(`twins:type:${type}`);

    // Filter by subtype
    if (subtype) {
      const subtypeIds = await redis.smembers(`twins:subtype:${subtype}`);
      twinIds = twinIds.filter(id => subtypeIds.includes(id));
    }

    // Filter by industry
    if (industry) {
      const industryIds = await redis.smembers(`twins:industry:${industry}`);
      twinIds = twinIds.filter(id => industryIds.includes(id));
    }

    // Pagination
    twinIds = twinIds.slice(Number(offset), Number(offset) + Number(limit));

    // Get twin data
    const twins = await Promise.all(
      twinIds.map(async (id) => {
        const data = await redis.get(`twin:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    res.json({
      type,
      twins: twins.filter(t => t),
      total: twinIds.length,
      pagination: { limit: Number(limit), offset: Number(offset) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get twins by subtype
 * GET /api/twins/subtype/:subtype
 */
router.get('/subtype/:subtype', async (req, res) => {
  try {
    const { subtype } = req.params;
    const twinIds = await redis.smembers(`twins:subtype:${subtype}`);

    const twins = await Promise.all(
      twinIds.map(async (id) => {
        const data = await redis.get(`twin:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    res.json({
      subtype,
      twins: twins.filter(t => t),
      total: twinIds.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get twins by industry
 * GET /api/twins/industry/:industry
 */
router.get('/industry/:industry', async (req, res) => {
  try {
    const { industry } = req.params;
    const twinIds = await redis.smembers(`twins:industry:${industry}`);

    const twins = await Promise.all(
      twinIds.map(async (id) => {
        const data = await redis.get(`twin:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    res.json({
      industry,
      twins: twins.filter(t => t),
      total: twinIds.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search twins
 * POST /api/twins/search
 */
router.post('/search', async (req, res) => {
  try {
    const { query, type, subtype, industry, limit = 50 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const searchLower = query.toLowerCase();

    // Get candidate IDs
    let candidateIds = await redis.smembers('twins:all');

    if (type) {
      const typeIds = await redis.smembers(`twins:type:${type}`);
      candidateIds = candidateIds.filter(id => typeIds.includes(id));
    }
    if (subtype) {
      const subtypeIds = await redis.smembers(`twins:subtype:${subtype}`);
      candidateIds = candidateIds.filter(id => subtypeIds.includes(id));
    }
    if (industry) {
      const industryIds = await redis.smembers(`twins:industry:${industry}`);
      candidateIds = candidateIds.filter(id => industryIds.includes(id));
    }

    // Search
    const twins = [];
    for (const id of candidateIds.slice(0, Number(limit))) {
      const data = await redis.get(`twin:${id}`);
      if (data) {
        const twin = JSON.parse(data);
        if (
          twin.name.toLowerCase().includes(searchLower) ||
          JSON.stringify(twin.data).toLowerCase().includes(searchLower)
        ) {
          twins.push(twin);
        }
      }
    }

    res.json({
      query,
      twins,
      total: twins.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get related twins
 * GET /api/twins/:id/related
 */
router.get('/:id/related', async (req, res) => {
  try {
    const { id } = req.params;

    const twin = await redis.get(`twin:${id}`);
    if (!twin) {
      return res.status(404).json({ error: 'Twin not found' });
    }

    // Get children
    const childIds = await redis.smembers(`twins:child:${id}`);
    const children = await Promise.all(
      childIds.map(async (childId) => {
        const data = await redis.get(`twin:${childId}`);
        return data ? JSON.parse(data) : null;
      })
    );

    // Get parents
    const parentIds = await redis.smembers(`twins:parent:${id}`);
    const parents = await Promise.all(
      parentIds.map(async (parentId) => {
        const data = await redis.get(`twin:${parentId}`);
        return data ? JSON.parse(data) : null;
      })
    );

    res.json({
      twin: JSON.parse(twin),
      parents: parents.filter(p => p),
      children: children.filter(c => c)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add relationship
 * POST /api/twins/:id/relationships
 */
router.post('/:id/relationships', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetTwinId, relationshipType, metadata = {} } = req.body;

    const twin = await redis.get(`twin:${id}`);
    if (!twin) {
      return res.status(404).json({ error: 'Twin not found' });
    }

    const targetTwin = await redis.get(`twin:${targetTwinId}`);
    if (!targetTwin) {
      return res.status(404).json({ error: 'Target twin not found' });
    }

    const twinData = JSON.parse(twin);

    // Add relationship
    const relationship = {
      targetTwinId,
      type: relationshipType,
      metadata,
      createdAt: new Date().toISOString()
    };

    if (!twinData.relationships) {
      twinData.relationships = [];
    }
    twinData.relationships.push(relationship);
    twinData.updatedAt = new Date().toISOString();

    await redis.set(`twin:${id}`, JSON.stringify(twinData));

    // Index relationship
    await redis.sadd(`relationships:from:${id}`, targetTwinId);
    await redis.sadd(`relationships:to:${targetTwinId}`, id);
    await redis.sadd(`relationships:type:${relationshipType}`, id);

    res.json({
      message: 'Relationship added',
      twinId: id,
      relationship
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
