/**
 * Matrix Routes
 * Company capability matrix management
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, CAPABILITY_CATEGORIES, PROFICIENCY_LEVELS, ENTITY_TYPES } from '../index.js';

const router = Router();

/**
 * Get capability matrix for a company/entity
 * GET /api/matrix/:corpId
 */
router.get('/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { entityType, category, industry } = req.query;

    // Get entity type from query or default to ORGANIZATION
    const type = entityType || 'ORGANIZATION';

    // Get all capabilities for this entity
    let capabilityIds = await redis.smembers(`matrix:${type}:${corpId}`);

    if (!capabilityIds || capabilityIds.length === 0) {
      return res.json({
        corpId,
        entityType: type,
        capabilities: [],
        total: 0
      });
    }

    let capabilities = await Promise.all(
      capabilityIds.map(async (entry) => {
        const [capId, proficiency, acquiredAt] = entry.split(':');
        const capData = await redis.get(`capability:${capId}`);
        if (capData) {
          const cap = JSON.parse(capData);
          return {
            ...cap,
            proficiency: proficiency || 'INTERMEDIATE',
            acquiredAt: acquiredAt || null,
            matrixEntry: `${corpId}:${capId}`
          };
        }
        return null;
      })
    );

    capabilities = capabilities.filter(c => c !== null);

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

    // Group by category
    const byCategory = capabilities.reduce((acc, cap) => {
      if (!acc[cap.category]) acc[cap.category] = [];
      acc[cap.category].push(cap);
      return acc;
    }, {});

    res.json({
      corpId,
      entityType: type,
      capabilities,
      byCategory,
      total: capabilities.length,
      filters: { category, industry }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add capability to company matrix
 * POST /api/matrix/:corpId
 */
router.post('/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const {
      capabilityId,
      proficiency = 'INTERMEDIATE',
      entityType = 'ORGANIZATION'
    } = req.body;

    // Validate proficiency
    if (!PROFICIENCY_LEVELS[proficiency]) {
      return res.status(400).json({
        error: `Invalid proficiency. Valid: ${Object.keys(PROFICIENCY_LEVELS).join(', ')}`
      });
    }

    // Check if capability exists
    const capability = await redis.get(`capability:${capabilityId}`);
    if (!capability) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    const acquiredAt = new Date().toISOString();

    // Store matrix entry with proficiency and timestamp
    const entry = `${capabilityId}:${proficiency}:${acquiredAt}`;
    await redis.sadd(`matrix:${entityType}:${corpId}`, entry);

    // Index by entity type
    await redis.sadd(`matrix:entities:${entityType}`, corpId);

    res.status(201).json({
      message: 'Capability added to matrix',
      corpId,
      capabilityId,
      proficiency,
      acquiredAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update capability proficiency in matrix
 * PUT /api/matrix/:corpId/:capabilityId
 */
router.put('/:corpId/:capabilityId', async (req, res) => {
  try {
    const { corpId, capabilityId } = req.params;
    const { proficiency, entityType = 'ORGANIZATION' } = req.body;

    if (!PROFICIENCY_LEVELS[proficiency]) {
      return res.status(400).json({
        error: `Invalid proficiency`
      });
    }

    // Find and update entry
    const entries = await redis.smembers(`matrix:${entityType}:${corpId}`);
    const entryIndex = entries.findIndex(e => e.startsWith(`${capabilityId}:`));

    if (entryIndex === -1) {
      return res.status(404).json({ error: 'Capability not in matrix' });
    }

    const oldEntry = entries[entryIndex];
    const [, oldProficiency, acquiredAt] = oldEntry.split(':');
    const newEntry = `${capabilityId}:${proficiency}:${acquiredAt}`;

    // Remove old, add new
    await redis.srem(`matrix:${entityType}:${corpId}`, oldEntry);
    await redis.sadd(`matrix:${entityType}:${corpId}`, newEntry);

    res.json({
      message: 'Proficiency updated',
      corpId,
      capabilityId,
      oldProficiency,
      newProficiency: proficiency
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Remove capability from matrix
 * DELETE /api/matrix/:corpId/:capabilityId
 */
router.delete('/:corpId/:capabilityId', async (req, res) => {
  try {
    const { corpId, capabilityId } = req.params;
    const { entityType = 'ORGANIZATION' } = req.query;

    // Find and remove entry
    const entries = await redis.smembers(`matrix:${entityType}:${corpId}`);
    const entryToRemove = entries.find(e => e.startsWith(`${capabilityId}:`));

    if (!entryToRemove) {
      return res.status(404).json({ error: 'Capability not in matrix' });
    }

    await redis.srem(`matrix:${entityType}:${corpId}`, entryToRemove);

    res.json({
      message: 'Capability removed from matrix',
      corpId,
      capabilityId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get matrix summary for entity
 * GET /api/matrix/:corpId/summary
 */
router.get('/:corpId/summary', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { entityType = 'ORGANIZATION' } = req.query;

    const capabilityIds = await redis.smembers(`matrix:${entityType}:${corpId}`);

    const capabilities = await Promise.all(
      capabilityIds.map(async (entry) => {
        const [capId, proficiency] = entry.split(':');
        const capData = await redis.get(`capability:${capId}`);
        if (capData) {
          return { ...JSON.parse(capData), proficiency };
        }
        return null;
      })
    );

    const validCapabilities = capabilities.filter(c => c !== null);

    // Calculate category distribution
    const byCategory = validCapabilities.reduce((acc, cap) => {
      acc[cap.category] = (acc[cap.category] || 0) + 1;
      return acc;
    }, {});

    // Calculate proficiency distribution
    const byProficiency = validCapabilities.reduce((acc, cap) => {
      acc[cap.proficiency] = (acc[cap.proficiency] || 0) + 1;
      return acc;
    }, {});

    res.json({
      corpId,
      entityType,
      totalCapabilities: validCapabilities.length,
      byCategory,
      byProficiency,
      proficiencyLevels: PROFICIENCY_LEVELS
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Compare two entity matrices
 * POST /api/matrix/compare
 */
router.post('/compare', async (req, res) => {
  try {
    const { corpIdA, corpIdB, entityType = 'ORGANIZATION' } = req.body;

    if (!corpIdA || !corpIdB) {
      return res.status(400).json({
        error: 'corpIdA and corpIdB are required'
      });
    }

    const [entriesA, entriesB] = await Promise.all([
      redis.smembers(`matrix:${entityType}:${corpIdA}`),
      redis.smembers(`matrix:${entityType}:${corpIdB}`)
    ]);

    const capsA = entriesA.map(e => e.split(':')[0]);
    const capsB = entriesB.map(e => e.split(':')[0]);

    const onlyA = capsA.filter(c => !capsB.includes(c));
    const onlyB = capsB.filter(c => !capsA.includes(c));
    const common = capsA.filter(c => capsB.includes(c));

    // Get full capability data
    const getCapData = async (id) => {
      const data = await redis.get(`capability:${id}`);
      return data ? JSON.parse(data) : null;
    };

    const [onlyAData, onlyBData, commonData] = await Promise.all([
      Promise.all(onlyA.map(getCapData)),
      Promise.all(onlyB.map(getCapData)),
      Promise.all(common.map(getCapData))
    ]);

    res.json({
      entityA: corpIdA,
      entityB: corpIdB,
      comparison: {
        onlyInA: onlyAData.filter(c => c),
        onlyInB: onlyBData.filter(c => c),
        common: commonData.filter(c => c)
      },
      summary: {
        totalA: capsA.length,
        totalB: capsB.length,
        commonCount: common.length,
        similarity: capsA.length > 0 ? (common.length / Math.max(capsA.length, capsB.length) * 100).toFixed(2) + '%' : '0%'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
