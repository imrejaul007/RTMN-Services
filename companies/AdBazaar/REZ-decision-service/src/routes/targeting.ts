/**
 * Targeting Routes
 */
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { targetingEngine } from '../services/targeting.js';

const router = Router();

/**
 * GET /api/targeting/segments/:userId
 * Get targeting segments for a user
 */
router.get('/segments/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const segments = await targetingEngine.evaluate(userId);

  res.json({ success: true, data: segments });
}));

/**
 * POST /api/targeting/evaluate
 * Evaluate targeting for user and campaign
 */
router.post('/evaluate', asyncHandler(async (req: Request, res: Response) => {
  const { userId, campaignId } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  const segments = await targetingEngine.evaluate(userId);
  const variant = campaignId ? targetingEngine.assignVariant(userId, campaignId) : null;

  res.json({ success: true, data: { segments, variant } });
}));

/**
 * GET /api/targeting/frequency/:userId/:campaignId/:channel
 * Check frequency cap
 */
router.get('/frequency/:userId/:campaignId/:channel', asyncHandler(async (req: Request, res: Response) => {
  const { userId, campaignId, channel } = req.params;

  const allowed = await targetingEngine.checkFrequencyCap(userId, campaignId, channel);

  res.json({ success: true, data: { allowed } });
}));

/**
 * POST /api/targeting/frequency
 * Set frequency cap
 */
router.post('/frequency', asyncHandler(async (req: Request, res: Response) => {
  const { campaignId, channel, maxImpressions, windowHours } = req.body;

  if (!campaignId || !channel) {
    res.status(400).json({ success: false, error: 'campaignId and channel required' });
    return;
  }

  await targetingEngine.setFrequencyCap(campaignId, channel, {
    maxImpressions: maxImpressions || 10,
    windowHours: windowHours || 24,
  });

  res.json({ success: true, message: 'Frequency cap set' });
}));

export default router;
