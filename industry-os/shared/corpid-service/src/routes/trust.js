/**
 * Trust Routes - Trust scores and reputation
 */

import { Router } from 'express';
import { redis } from '../index.js';

const router = Router();

/**
 * Get trust score
 * GET /api/trust/score/:corpId
 */
router.get('/score/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const entity = await redis.get(`corpId:entity:${corpId}`);

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const parsed = JSON.parse(entity);

    // Get trust history
    const history = await redis.lrange(`trust:history:${corpId}`, 0, 9);

    res.json({
      corpId,
      trustScore: parsed.trustScore || 50,
      verified: parsed.verified || false,
      status: parsed.status || 'active',
      history: history.map(h => JSON.parse(h))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update trust score
 * POST /api/trust/score/:corpId
 */
router.post('/score/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { delta, reason, category = 'general' } = req.body;

    if (delta === undefined) {
      return res.status(400).json({ error: 'delta is required' });
    }

    const entity = await redis.get(`corpId:entity:${corpId}`);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const parsed = JSON.parse(entity);
    const oldScore = parsed.trustScore || 50;

    // Calculate new score (clamped 0-100)
    const newScore = Math.max(0, Math.min(100, oldScore + delta));

    parsed.trustScore = newScore;
    parsed.updatedAt = new Date().toISOString();

    await redis.set(`corpId:entity:${corpId}`, JSON.stringify(parsed));

    // Log to history
    const historyEntry = {
      oldScore,
      newScore,
      delta,
      reason,
      category,
      timestamp: new Date().toISOString()
    };
    await redis.lpush(`trust:history:${corpId}`, JSON.stringify(historyEntry));
    await redis.ltrim(`trust:history:${corpId}`, 0, 99);

    res.json({
      corpId,
      oldScore,
      newScore,
      delta,
      reason
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get trust breakdown by category
 * GET /api/trust/breakdown/:corpId
 */
router.get('/breakdown/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;

    const history = await redis.lrange(`trust:history:${corpId}`, 0, -1);

    const breakdown = {
      general: { delta: 0, count: 0 },
      transaction: { delta: 0, count: 0 },
      communication: { delta: 0, count: 0 },
      compliance: { delta: 0, count: 0 },
      performance: { delta: 0, count: 0 }
    };

    for (const entry of history) {
      const parsed = JSON.parse(entry);
      const cat = parsed.category || 'general';
      if (breakdown[cat]) {
        breakdown[cat].delta += parsed.delta;
        breakdown[cat].count++;
      }
    }

    res.json({ corpId, breakdown });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
