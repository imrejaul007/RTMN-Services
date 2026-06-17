/**
 * Merchant Routes
 *
 * Handles merchant-specific ad operations
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /merchant/ads/campaigns
 * Get merchant's campaigns
 */
router.get('/campaigns', asyncHandler(async (req: Request, res: Response) => {
  const { merchantId } = req.headers;

  const campaigns = [
    {
      campaignId: 'camp_001',
      name: 'Pizza Hut Summer Sale',
      status: 'active',
      budget: { total: 50000, spent: 12500, remaining: 37500 },
      stats: {
        impressions: 125000,
        clicks: 2500,
        ctr: 2.0,
        conversions: 125,
        spend: 12500,
      },
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
 * POST /merchant/ads/campaigns
 * Create a new campaign
 */
router.post('/campaigns', asyncHandler(async (req: Request, res: Response) => {
  const { name, budget, targeting, schedule } = req.body;

  if (!name || !budget) {
    res.status(400).json({ success: false, error: 'name and budget required' });
    return;
  }

  const campaign = {
    campaignId: `camp_${Date.now()}`,
    name,
    status: 'draft',
    budget: {
      total: budget,
      spent: 0,
      remaining: budget,
    },
    targeting: targeting || {},
    schedule: schedule || {},
    createdAt: new Date().toISOString(),
  };

  logger.info('[Merchant] Campaign created', { campaignId: campaign.campaignId, name });

  res.status(201).json({ success: true, data: campaign });
}));

/**
 * GET /merchant/ads/campaigns/:campaignId
 * Get campaign details
 */
router.get('/campaigns/:campaignId', asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;

  const campaign = {
    campaignId,
    name: 'Sample Campaign',
    status: 'active',
    budget: { total: 50000, spent: 12500, remaining: 37500 },
    targeting: {
      cities: ['Mumbai', 'Delhi'],
      categories: ['DINING'],
      ageGroups: ['25-34', '35-44'],
    },
    stats: {
      impressions: 125000,
      clicks: 2500,
      ctr: 2.0,
      conversions: 125,
      spend: 12500,
      cpm: 100,
      cpc: 5,
    },
  };

  res.json({ success: true, data: campaign });
}));

/**
 * PUT /merchant/ads/campaigns/:campaignId
 * Update campaign
 */
router.put('/campaigns/:campaignId', asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const updates = req.body;

  const campaign = {
    campaignId,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  logger.info('[Merchant] Campaign updated', { campaignId });

  res.json({ success: true, data: campaign });
}));

/**
 * POST /merchant/ads/campaigns/:campaignId/launch
 * Launch campaign
 */
router.post('/campaigns/:campaignId/launch', asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;

  res.json({
    success: true,
    data: {
      campaignId,
      status: 'active',
      launchedAt: new Date().toISOString(),
    },
  });
}));

/**
 * POST /merchant/ads/campaigns/:campaignId/pause
 * Pause campaign
 */
router.post('/campaigns/:campaignId/pause', asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;

  res.json({
    success: true,
    data: {
      campaignId,
      status: 'paused',
      pausedAt: new Date().toISOString(),
    },
  });
}));

export default router;
