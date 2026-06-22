/**
 * Capability Routes
 * CRUD operations for capability registry
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, CAPABILITY_CATEGORIES, PROFICIENCY_LEVELS, ENTITY_TYPES, SOURCE_TYPES } from '../index.js';

const router = Router();

/**
 * Get all capabilities
 * GET /api/capabilities
 */
router.get('/', async (req, res) => {
  try {
    const { category, industry, source, search } = req.query;

    let capabilityIds = await redis.smembers('capabilities:all');

    if (!capabilityIds || capabilityIds.length === 0) {
      return res.json({ capabilities: [], total: 0 });
    }

    let capabilities = await Promise.all(
      capabilityIds.map(id => redis.get(`capability:${id}`))
    );

    capabilities = capabilities
      .map(c => c ? JSON.parse(c) : null)
      .filter(c => c !== null);

    // Filter by category
    if (category) {
      capabilities = capabilities.filter(c => c.category === category);
    }

    // Filter by industry
    if (industry) {
      capabilities = capabilities.filter(c =>
        c.industries && c.industries.includes(industry)
      );
    }

    // Filter by source
    if (source) {
      capabilities = capabilities.filter(c => c.source === source);
    }

    // Search by name or description
    if (search) {
      const searchLower = search.toLowerCase();
      capabilities = capabilities.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        (c.description && c.description.toLowerCase().includes(searchLower))
      );
    }

    res.json({
      capabilities,
      total: capabilities.length,
      filters: { category, industry, source, search }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get capability by ID
 * GET /api/capabilities/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const capability = await redis.get(`capability:${id}`);

    if (!capability) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    res.json(JSON.parse(capability));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create new capability
 * POST /api/capabilities
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      difficulty,
      prerequisites = [],
      relatedCapabilities = [],
      industries = [],
      source,
      sourceId,
      metadata = {}
    } = req.body;

    // Validation
    if (!name || !category) {
      return res.status(400).json({
        error: 'name and category are required'
      });
    }

    if (!Object.values(CAPABILITY_CATEGORIES).includes(category)) {
      return res.status(400).json({
        error: `Invalid category. Valid: ${Object.values(CAPABILITY_CATEGORIES).join(', ')}`
      });
    }

    if (difficulty && !PROFICIENCY_LEVELS[difficulty]) {
      return res.status(400).json({
        error: `Invalid difficulty. Valid: ${Object.keys(PROFICIENCY_LEVELS).join(', ')}`
      });
    }

    const capabilityId = `cap_${uuidv4()}`;

    const capability = {
      id: capabilityId,
      name,
      category,
      description: description || '',
      difficulty: difficulty || 'INTERMEDIATE',
      prerequisites,
      relatedCapabilities,
      industries,
      source: source || SOURCE_TYPES.SERVICE,
      sourceId: sourceId || null,
      metadata,
      proficiencyLevels: Object.keys(PROFICIENCY_LEVELS),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store capability
    await redis.set(`capability:${capabilityId}`, JSON.stringify(capability));
    await redis.sadd('capabilities:all', capabilityId);

    // Index by category
    await redis.sadd(`capabilities:category:${category}`, capabilityId);

    // Index by industries
    for (const industry of industries) {
      await redis.sadd(`capabilities:industry:${industry}`, capabilityId);
    }

    // Index by source
    if (source) {
      await redis.sadd(`capabilities:source:${source}`, capabilityId);
    }

    res.status(201).json(capability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update capability
 * PUT /api/capabilities/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await redis.get(`capability:${id}`);

    if (!existing) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    const capability = JSON.parse(existing);
    const {
      name,
      category,
      description,
      difficulty,
      prerequisites,
      relatedCapabilities,
      industries,
      metadata
    } = req.body;

    // Update fields
    if (name) capability.name = name;
    if (category) {
      if (!Object.values(CAPABILITY_CATEGORIES).includes(category)) {
        return res.status(400).json({
          error: `Invalid category`
        });
      }
      capability.category = category;
    }
    if (description !== undefined) capability.description = description;
    if (difficulty) capability.difficulty = difficulty;
    if (prerequisites) capability.prerequisites = prerequisites;
    if (relatedCapabilities) capability.relatedCapabilities = relatedCapabilities;
    if (industries) capability.industries = industries;
    if (metadata) capability.metadata = { ...capability.metadata, ...metadata };

    capability.updatedAt = new Date().toISOString();

    // Update storage
    await redis.set(`capability:${id}`, JSON.stringify(capability));

    res.json(capability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete capability
 * DELETE /api/capabilities/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await redis.get(`capability:${id}`);

    if (!existing) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    const capability = JSON.parse(existing);

    // Remove from all indexes
    await redis.srem('capabilities:all', id);
    await redis.srem(`capabilities:category:${capability.category}`, id);
    await redis.del(`capability:${id}`);

    // Remove industry indexes
    for (const industry of capability.industries || []) {
      await redis.srem(`capabilities:industry:${industry}`, id);
    }

    // Remove source index
    if (capability.source) {
      await redis.srem(`capabilities:source:${capability.source}`, id);
    }

    res.json({ message: 'Capability deleted', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get capabilities by category
 * GET /api/capabilities/category/:category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;

    if (!Object.values(CAPABILITY_CATEGORIES).includes(category)) {
      return res.status(400).json({
        error: `Invalid category`
      });
    }

    const capabilityIds = await redis.smembers(`capabilities:category:${category}`);

    const capabilities = await Promise.all(
      capabilityIds.map(id => redis.get(`capability:${id}`))
    );

    res.json({
      category,
      capabilities: capabilities.map(c => c ? JSON.parse(c) : null).filter(c => c),
      total: capabilityIds.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get capabilities by industry
 * GET /api/capabilities/industry/:industry
 */
router.get('/industry/:industry', async (req, res) => {
  try {
    const { industry } = req.params;
    const capabilityIds = await redis.smembers(`capabilities:industry:${industry}`);

    const capabilities = await Promise.all(
      capabilityIds.map(id => redis.get(`capability:${id}`))
    );

    res.json({
      industry,
      capabilities: capabilities.map(c => c ? JSON.parse(c) : null).filter(c => c),
      total: capabilityIds.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get proficiency levels
 * GET /api/capabilities/proficiency-levels
 */
router.get('/meta/proficiency-levels', (req, res) => {
  res.json({
    proficiencyLevels: PROFICIENCY_LEVELS
  });
});

/**
 * Get categories
 * GET /api/capabilities/categories
 */
router.get('/meta/categories', (req, res) => {
  res.json({
    categories: Object.values(CAPABILITY_CATEGORIES)
  });
});

export default router;
