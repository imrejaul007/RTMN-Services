/**
 * Sampling Routes
 */
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * POST /api/sampling/bid
 * Get bid for DOOH placement
 */
router.post('/bid', asyncHandler(async (req: Request, res: Response) => {
  const { screenId, userId, categories, context } = req.body;

  if (!screenId) {
    res.status(400).json({ success: false, error: 'screenId required' });
    return;
  }

  // Simulate bidding
  const bid = {
    bidId: `bid_${Date.now()}`,
    screenId,
    bidAmount: Math.random() * 10 + 1,
    campaignId: `camp_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  res.json({ success: true, data: bid });
}));

/**
 * POST /api/sampling/sponsored
 * Get sponsored ranking
 */
router.post('/sponsored', asyncHandler(async (req: Request, res: Response) => {
  const { userId, location, categories } = req.body;

  const rankings = [
    { rank: 1, merchantId: 'merchant_001', score: 0.95 },
    { rank: 2, merchantId: 'merchant_002', score: 0.85 },
    { rank: 3, merchantId: 'merchant_003', score: 0.75 },
  ];

  res.json({ success: true, data: { rankings } });
}));

export default router;
