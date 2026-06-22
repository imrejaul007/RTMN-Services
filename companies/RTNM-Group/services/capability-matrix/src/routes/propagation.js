/**
 * Propagation Routes
 * Cross-OS capability propagation
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, SOURCE_TYPES } from '../index.js';

const router = Router();

/**
 * Propagate capabilities from Industry OS to company
 * POST /api/propagation/propagate
 */
router.post('/propagate', async (req, res) => {
  try {
    const {
      sourceIndustryId,
      targetCorpId,
      capabilityIds = [],
      proficiency = 'INTERMEDIATE',
      propagateRelated = true
    } = req.body;

    if (!sourceIndustryId || !targetCorpId) {
      return res.status(400).json({
        error: 'sourceIndustryId and targetCorpId are required'
      });
    }

    // Get source capabilities
    let capabilitiesToPropagate = [];

    if (capabilityIds.length > 0) {
      // Specific capabilities
      capabilitiesToPropagate = await Promise.all(
        capabilityIds.map(async (capId) => {
          const cap = await redis.get(`capability:${capId}`);
          return cap ? JSON.parse(cap) : null;
        })
      );
    } else {
      // All capabilities from source
      const allIds = await redis.smembers('capabilities:all');
      capabilitiesToPropagate = await Promise.all(
        allIds.map(async (capId) => {
          const cap = await redis.get(`capability:${capId}`);
          if (cap) {
            const c = JSON.parse(cap);
            if (c.sourceId === sourceIndustryId) {
              return c;
            }
          }
          return null;
        })
      );
    }

    capabilitiesToPropagate = capabilitiesToPropagate.filter(c => c !== null);

    // Add related capabilities if requested
    if (propagateRelated) {
      const relatedIds = new Set();
      capabilitiesToPropagate.forEach(cap => {
        (cap.relatedCapabilities || []).forEach(relId => relatedIds.add(relId));
      });

      const relatedCaps = await Promise.all(
        Array.from(relatedIds).map(async (relId) => {
          const rel = await redis.get(`capability:${relId}`);
          return rel ? JSON.parse(rel) : null;
        })
      );

      capabilitiesToPropagate.push(...relatedCaps.filter(c => c !== null));
    }

    // Propagate to target
    const propagated = [];
    const failed = [];

    for (const cap of capabilitiesToPropagate) {
      try {
        const acquiredAt = new Date().toISOString();
        const entry = `${cap.id}:${proficiency}:${acquiredAt}`;

        await redis.sadd(`matrix:ORGANIZATION:${targetCorpId}`, entry);
        await redis.sadd(`propagation:log:${targetCorpId}`, JSON.stringify({
          capabilityId: cap.id,
          sourceIndustryId,
          proficiency,
          propagatedAt: acquiredAt
        }));

        propagated.push({
          capabilityId: cap.id,
          name: cap.name,
          category: cap.category
        });
      } catch (err) {
        failed.push({
          capabilityId: cap.id,
          name: cap.name,
          error: err.message
        });
      }
    }

    res.json({
      message: 'Capabilities propagated',
      sourceIndustryId,
      targetCorpId,
      propagated: {
        count: propagated.length,
        capabilities: propagated
      },
      failed: {
        count: failed.length,
        capabilities: failed
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get propagation history for a company
 * GET /api/propagation/history/:corpId
 */
router.get('/history/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;

    const logIds = await redis.smembers(`propagation:log:${corpId}`);

    const history = await Promise.all(
      logIds.map(async (logEntry) => {
        try {
          return JSON.parse(logEntry);
        } catch {
          return null;
        }
      })
    );

    // Sort by propagatedAt descending
    history.sort((a, b) => new Date(b.propagatedAt) - new Date(a.propagatedAt));

    res.json({
      corpId,
      history: history.filter(h => h),
      total: history.filter(h => h).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Bulk propagate from multiple sources
 * POST /api/propagation/bulk
 */
router.post('/bulk', async (req, res) => {
  try {
    const { targets } = req.body;

    if (!targets || !Array.isArray(targets)) {
      return res.status(400).json({
        error: 'targets array is required'
      });
    }

    const results = [];

    for (const target of targets) {
      const {
        sourceIndustryId,
        targetCorpId,
        capabilityIds,
        proficiency = 'INTERMEDIATE'
      } = target;

      if (!sourceIndustryId || !targetCorpId) continue;

      const allIds = capabilityIds?.length > 0
        ? capabilityIds
        : await redis.smembers('capabilities:all');

      let count = 0;
      for (const capId of allIds) {
        const cap = await redis.get(`capability:${capId}`);
        if (cap) {
          const c = JSON.parse(cap);
          if (c.sourceId === sourceIndustryId || !capabilityIds) {
            const entry = `${capId}:${proficiency}:${new Date().toISOString()}`;
            await redis.sadd(`matrix:ORGANIZATION:${targetCorpId}`, entry);
            count++;
          }
        }
      }

      results.push({
        targetCorpId,
        sourceIndustryId,
        propagated: count
      });
    }

    res.json({
      message: 'Bulk propagation complete',
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Revert propagation
 * DELETE /api/propagation/revert
 */
router.delete('/revert', async (req, res) => {
  try {
    const { corpId, sourceIndustryId, capabilityIds } = req.body;

    if (!corpId) {
      return res.status(400).json({ error: 'corpId is required' });
    }

    // Get all entries for this company
    const entries = await redis.smembers(`matrix:ORGANIZATION:${corpId}`);

    let reverted = 0;

    for (const entry of entries) {
      const [capId, proficiency, acquiredAt] = entry.split(':');

      // Check if should revert
      const shouldRevert = (!sourceIndustryId && !capabilityIds) ||
        (capabilityIds && capabilityIds.includes(capId));

      if (shouldRevert) {
        await redis.srem(`matrix:ORGANIZATION:${corpId}`, entry);
        reverted++;
      }
    }

    res.json({
      message: 'Propagation reverted',
      corpId,
      reverted
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get propagation templates
 * GET /api/propagation/templates
 */
router.get('/templates', async (req, res) => {
  try {
    const { industry } = req.query;

    // Pre-defined templates
    const templates = [
      {
        id: 'restaurant-minimal',
        name: 'Restaurant - Minimal',
        industry: 'restaurant',
        description: 'Basic restaurant capabilities',
        capabilities: ['POS', 'Inventory', 'Ordering']
      },
      {
        id: 'restaurant-full',
        name: 'Restaurant - Full',
        industry: 'restaurant',
        description: 'Complete restaurant capabilities',
        capabilities: ['POS', 'Inventory', 'Ordering', 'Staffing', 'Financial', 'Marketing', 'Customer']
      },
      {
        id: 'hotel-minimal',
        name: 'Hotel - Minimal',
        industry: 'hotel',
        description: 'Basic hotel capabilities',
        capabilities: ['Bookings', 'Housekeeping', 'GuestServices']
      },
      {
        id: 'hotel-full',
        name: 'Hotel - Full',
        industry: 'hotel',
        description: 'Complete hotel capabilities',
        capabilities: ['Bookings', 'Housekeeping', 'GuestServices', 'Revenue', 'Staffing', 'Marketing', 'Financial']
      },
      {
        id: 'retail-standard',
        name: 'Retail - Standard',
        industry: 'retail',
        description: 'Standard retail capabilities',
        capabilities: ['POS', 'Inventory', 'Customer', 'Marketing', 'Staffing', 'Financial']
      }
    ];

    let filtered = templates;
    if (industry) {
      filtered = templates.filter(t => t.industry === industry);
    }

    res.json({
      templates: filtered,
      total: filtered.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Apply propagation template
 * POST /api/propagation/apply-template
 */
router.post('/apply-template', async (req, res) => {
  try {
    const { templateId, targetCorpId, proficiency = 'INTERMEDIATE' } = req.body;

    if (!templateId || !targetCorpId) {
      return res.status(400).json({
        error: 'templateId and targetCorpId are required'
      });
    }

    // Get all capabilities
    const allIds = await redis.smembers('capabilities:all');

    const matched = [];
    for (const capId of allIds) {
      const cap = await redis.get(`capability:${capId}`);
      if (cap) {
        const c = JSON.parse(cap);
        const capNameLower = c.name.toLowerCase();

        // Match by capability name patterns
        const patterns = [
          ['POS', 'Point of Sale'],
          ['Inventory', 'Stock'],
          ['Ordering', 'Orders'],
          ['Bookings', 'Reservation'],
          ['Housekeeping', 'Cleaning'],
          ['GuestServices', 'Concierge', 'Guest'],
          ['Staffing', 'Workforce', 'HR'],
          ['Marketing', 'Campaign'],
          ['Customer', 'CRM'],
          ['Financial', 'Finance', 'Accounting'],
          ['Revenue', 'Pricing']
        ];

        for (const pattern of patterns) {
          if (pattern.some(p => capNameLower.includes(p.toLowerCase()))) {
            const entry = `${capId}:${proficiency}:${new Date().toISOString()}`;
            await redis.sadd(`matrix:ORGANIZATION:${targetCorpId}`, entry);
            matched.push({ id: capId, name: c.name, category: c.category });
            break;
          }
        }
      }
    }

    res.json({
      message: 'Template applied',
      templateId,
      targetCorpId,
      matched: {
        count: matched.length,
        capabilities: matched
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
