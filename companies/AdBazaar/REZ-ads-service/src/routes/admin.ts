/**
 * Admin Routes
 *
 * Handles admin operations
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /admin/ads/stats
 * Get platform statistics
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = {
    totalCampaigns: 150,
    activeCampaigns: 85,
    totalImpressions: 15000000,
    totalClicks: 300000,
    totalConversions: 15000,
    platformRevenue: 750000,
    avgCtr: 2.0,
    avgCpm: 50,
  };

  res.json({ success: true, data: stats });
}));

/**
 * GET /admin/ads/campaigns
 * Get all campaigns
 */
router.get('/campaigns', asyncHandler(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 50 } = req.query;

  const campaigns = [];
  const total = 150;

  res.json({
    success: true,
    data: {
      campaigns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
}));

/**
 * DELETE /admin/ads/campaigns/:campaignId
 * Delete campaign
 */
router.delete('/campaigns/:campaignId', asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;

  logger.info('[Admin] Campaign deleted', { campaignId });

  res.json({
    success: true,
    message: 'Campaign deleted',
  });
}));

export default router;
