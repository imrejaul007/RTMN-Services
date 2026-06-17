/**
 * Analytics Routes
 */
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/analytics/dooh
 * Get DOOH analytics
 */
router.get('/dooh', asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, screenId } = req.query;

  const analytics = {
    totalImpressions: 1250000,
    totalScans: 28750,
    scanRate: 2.3,
    totalClicks: 6250,
    ctr: 0.5,
    revenue: 62500,
    avgCPM: 50,
    byScreenType: [
      { type: 'bus_shelter', impressions: 450000, ctr: 0.6 },
      { type: 'mall_kiosk', impressions: 350000, ctr: 0.4 },
      { type: 'metro_screen', impressions: 450000, ctr: 0.5 },
    ],
  };

  res.json({ success: true, data: analytics });
}));

/**
 * GET /api/analytics/sampling
 * Get sampling analytics
 */
router.get('/sampling', asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.query;

  const analytics = {
    totalSampled: 125000,
    conversionRate: 3.2,
    revenue: 12500,
    avgOrderValue: 850,
  };

  res.json({ success: true, data: analytics });
}));

export default router;
