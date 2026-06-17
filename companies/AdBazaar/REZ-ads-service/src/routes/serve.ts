/**
 * Ad Serving Routes
 *
 * Handles ad serving, selection, and delivery
 * NOW WITH AUDIENCE INTELLIGENCE INTEGRATION
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { getRedis } from '../config/redis.js';
import {
  getAudienceSegments,
  getUserIntent,
  getTargetingRecommendations,
  checkFraudRisk,
} from '../services/intelligenceService.js';

const router = Router();

/**
 * GET /ads/serve
 * Serve an ad to a user with intelligence
 */
router.get('/serve', asyncHandler(async (req: Request, res: Response) => {
  const { userId, placement, category, city, ip, userAgent } = req.query;

  // Get audience intelligence in parallel
  const [segments, intent, recommendations] = await Promise.allSettled([
    getAudienceSegments({ userId: userId as string, category: category as string, city: city as string }),
    userId ? getUserIntent(userId as string, category as string) : Promise.resolve(null),
    getTargetingRecommendations({
      campaignObjective: 'conversion',
      budget: 10000,
      category: category as string,
    }),
  ]);

  // Get fraud risk
  let fraudCheck = { isFraud: false, riskScore: 0, reasons: [] as string[] };
  if (ip || userId) {
    const fraudResult = await checkFraudRisk(userId as string || 'anonymous', {
      ip: ip as string,
      userAgent: userAgent as string,
    });
    fraudCheck = fraudResult;
  }

  // Build intelligent targeting
  const audienceSegments = segments.status === 'fulfilled' ? segments.value : [];
  const userIntentData = intent.status === 'fulfilled' ? intent.value : null;
  const targetingRecommendations = recommendations.status === 'fulfilled' ? recommendations.value : null;

  // Serve ad with intelligence
  const ad = {
    adId: `ad_${Date.now()}`,
    campaignId: `camp_${Math.random().toString(36).substr(2, 9)}`,
    creative: {
      type: 'image',
      url: 'https://example.com/ad.jpg',
      clickUrl: 'https://example.com/click',
    },
    intelligence: {
      audienceSegments,
      userIntent: userIntentData,
      fraudRisk: fraudCheck,
      recommendations: targetingRecommendations,
    },
    targeting: {
      userId: userId as string,
      placement: placement as string,
      category: category as string,
      city: city as string,
      recommendedCities: targetingRecommendations?.cities || [],
      recommendedScreenTypes: targetingRecommendations?.screenTypes || [],
    },
    timestamp: new Date().toISOString(),
  };

  logger.info('[Serve] Ad served with intelligence', {
    userId,
    placement,
    segments: audienceSegments.length,
    intentScore: userIntentData?.score,
    fraudRisk: fraudCheck.riskScore,
  });

  res.json({
    success: true,
    data: ad,
  });
}));

/**
 * POST /ads/serve
 * Serve ad with full request body and intelligence
 */
router.post('/serve', asyncHandler(async (req: Request, res: Response) => {
  const { userId, placement, category, city, demographics, ip, userAgent } = req.body;

  // Get intelligence
  const [segments, intent] = await Promise.allSettled([
    getAudienceSegments({ userId, category, city }),
    userId ? getUserIntent(userId, category) : Promise.resolve(null),
  ]);

  const audienceSegments = segments.status === 'fulfilled' ? segments.value : [];
  const userIntentData = intent.status === 'fulfilled' ? intent.value : null;

  const ad = {
    adId: `ad_${Date.now()}`,
    campaignId: `camp_${Math.random().toString(36).substr(2, 9)}`,
    creative: {
      type: 'image',
      url: 'https://example.com/ad.jpg',
      clickUrl: 'https://example.com/click',
    },
    intelligence: {
      audienceSegments,
      userIntent: userIntentData,
    },
    targeting: { userId, placement, category, city, demographics },
    timestamp: new Date().toISOString(),
  };

  res.json({ success: true, data: ad });
}));

/**
 * GET /ads/available
 * Check available ads for a placement
 */
router.get('/available', asyncHandler(async (req: Request, res: Response) => {
  const { placement, category, city } = req.query;

  // Simulate available campaigns
  const campaigns = [
    {
      campaignId: 'camp_001',
      name: 'Pizza Hut Summer Sale',
      category: 'DINING',
      budget: { total: 50000, spent: 12500, remaining: 37500 },
      targeting: { cities: ['Mumbai', 'Delhi'], categories: ['DINING'] },
    },
    {
      campaignId: 'camp_002',
      name: 'Uber Eats Promotion',
      category: 'FOOD_DELIVERY',
      budget: { total: 30000, spent: 8000, remaining: 22000 },
      targeting: { cities: ['Mumbai', 'Bangalore'], categories: ['FOOD_DELIVERY'] },
    },
  ];

  res.json({
    success: true,
    data: {
      campaigns,
      count: campaigns.length,
    },
  });
}));

/**
 * GET /ads/:adId
 * Get ad details
 */
router.get('/:adId', asyncHandler(async (req: Request, res: Response) => {
  const { adId } = req.params;

  const ad = {
    adId,
    campaignId: 'camp_001',
    status: 'active',
    creative: {
      type: 'image',
      url: 'https://example.com/ad.jpg',
    },
    stats: {
      impressions: 125000,
      clicks: 2500,
      ctr: 2.0,
      conversions: 125,
    },
  };

  res.json({ success: true, data: ad });
}));

export default router;
