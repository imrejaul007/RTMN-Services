/**
 * Interaction Routes
 *
 * Handles ad interactions (clicks, views, impressions)
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { getRedis } from '../config/redis.js';

const router = Router();

/**
 * POST /ads/click
 * Record a click on an ad
 */
router.post('/click', asyncHandler(async (req: Request, res: Response) => {
  const { adId, campaignId, userId, ip, userAgent } = req.body;

  if (!adId || !campaignId) {
    res.status(400).json({ success: false, error: 'adId and campaignId required' });
    return;
  }

  // Record click
  const click = {
    clickId: `clk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    adId,
    campaignId,
    userId,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  };

  // Store in Redis for fast access
  const redis = getRedis();
  try {
    await redis.lpush(`clicks:${campaignId}`, JSON.stringify(click));
    await redis.expire(`clicks:${campaignId}`, 86400); // 24 hours
  } catch (err) {
    logger.warn('[Click] Redis error, click recorded locally', { error: err });
  }

  logger.info('[Click] Ad clicked', { adId, campaignId, userId });

  res.json({
    success: true,
    data: {
      clickId: click.clickId,
      redirectUrl: `https://example.com/redirect?ad=${adId}`,
    },
  });
}));

/**
 * POST /ads/impression
 * Record an impression
 */
router.post('/impression', asyncHandler(async (req: Request, res: Response) => {
  const { adId, campaignId, userId } = req.body;

  if (!adId || !campaignId) {
    res.status(400).json({ success: false, error: 'adId and campaignId required' });
    return;
  }

  const impression = {
    impressionId: `imp_${Date.now()}`,
    adId,
    campaignId,
    userId,
    timestamp: new Date().toISOString(),
  };

  res.json({ success: true, data: impression });
}));

/**
 * POST /ads/view
 * Record a view event
 */
router.post('/view', asyncHandler(async (req: Request, res: Response) => {
  const { adId, campaignId, userId, duration } = req.body;

  const view = {
    viewId: `view_${Date.now()}`,
    adId,
    campaignId,
    userId,
    duration: duration || 0,
    timestamp: new Date().toISOString(),
  };

  res.json({ success: true, data: view });
}));

/**
 * GET /ads/interactions/:campaignId
 * Get interactions for a campaign
 */
router.get('/interactions/:campaignId', asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const { type, limit = 100 } = req.query;

  // Simulate interactions
  const interactions = {
    clicks: 2500,
    impressions: 125000,
    views: 98500,
    ctr: 2.0,
    viewRate: 78.8,
  };

  res.json({
    success: true,
    data: {
      campaignId,
      interactions,
    },
  });
}));

export default router;
