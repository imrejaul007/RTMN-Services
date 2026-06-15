/**
 * Policy Routes - Policy management
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../index.js';

const router = Router();

/**
 * Create policy
 * POST /api/policies
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, action, resource, conditions = {}, entityIds = [] } = req.body;

    if (!name || !action) {
      return res.status(400).json({ error: 'name and action are required' });
    }

    const policyId = `policy_${uuidv4()}`;
    const now = new Date().toISOString();

    const policy = {
      id: policyId,
      name,
      description: description || '',
      action,
      resource: resource || '*',
      conditions,
      status: 'active',
      entityIds,
      createdAt: now,
      updatedAt: now
    };

    await redis.set(`policy:${policyId}`, JSON.stringify(policy));

    // Index by action
    await redis.sadd(`policies:action:${action}`, policyId);

    // Index by entity
    for (const entityId of entityIds) {
      await redis.sadd(`policies:entity:${entityId}`, policyId);
    }

    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get policy
 * GET /api/policies/:policyId
 */
router.get('/:policyId', async (req, res) => {
  try {
    const { policyId } = req.params;
    const policy = await redis.get(`policy:${policyId}`);

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(JSON.parse(policy));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all policies
 * GET /api/policies
 */
router.get('/', async (req, res) => {
  try {
    const { action, status } = req.query;

    let policyIds;
    if (action) {
      policyIds = await redis.smembers(`policies:action:${action}`);
    } else {
      // Get all policies
      const keys = await redis.keys('policy:*');
      policyIds = keys.map(k => k.replace('policy:', '')).filter(k => !k.includes(':'));
    }

    const policies = [];
    for (const policyId of policyIds) {
      const policy = await redis.get(`policy:${policyId}`);
      if (policy) {
        const parsed = JSON.parse(policy);
        if (!status || parsed.status === status) {
          policies.push(parsed);
        }
      }
    }

    res.json({ policies, total: policies.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update policy
 * PATCH /api/policies/:policyId
 */
router.patch('/:policyId', async (req, res) => {
  try {
    const { policyId } = req.params;
    const updates = req.body;

    const policy = await redis.get(`policy:${policyId}`);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    const parsed = JSON.parse(policy);
    const updated = {
      ...parsed,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await redis.set(`policy:${policyId}`, JSON.stringify(updated));

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create hold
 * POST /api/policies/holds
 */
router.post('/holds', async (req, res) => {
  try {
    const { corpId, type, reason, expiresAt } = req.body;

    if (!corpId || !type || !reason) {
      return res.status(400).json({ error: 'corpId, type, and reason are required' });
    }

    const holdId = `hold_${uuidv4()}`;
    const now = new Date().toISOString();

    const hold = {
      id: holdId,
      corpId,
      type,
      reason,
      status: 'active',
      expiresAt: expiresAt || null,
      createdAt: now
    };

    await redis.set(`hold:${holdId}`, JSON.stringify(hold));
    await redis.sadd(`holds:entity:${corpId}`, holdId);

    res.status(201).json(hold);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Release hold
 * DELETE /api/policies/holds/:holdId
 */
router.delete('/holds/:holdId', async (req, res) => {
  try {
    const { holdId } = req.params;

    const hold = await redis.get(`hold:${holdId}`);
    if (!hold) {
      return res.status(404).json({ error: 'Hold not found' });
    }

    const parsed = JSON.parse(hold);
    parsed.status = 'released';
    parsed.releasedAt = new Date().toISOString();

    await redis.set(`hold:${holdId}`, JSON.stringify(parsed));

    res.json({ success: true, hold: parsed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
