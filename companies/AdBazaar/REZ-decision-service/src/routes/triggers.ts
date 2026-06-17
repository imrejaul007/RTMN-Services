/**
 * Triggers Routes
 */
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * POST /api/triggers/check
 * Check if any triggers should fire
 */
router.post('/check', asyncHandler(async (req: Request, res: Response) => {
  const { userId, event, context } = req.body;

  if (!userId || !event) {
    res.status(400).json({ success: false, error: 'userId and event required' });
    return;
  }

  // Simulate trigger check
  const triggers = [];

  res.json({ success: true, data: { triggers } });
}));

/**
 * POST /api/triggers/fire
 * Manually fire a trigger
 */
router.post('/fire', asyncHandler(async (req: Request, res: Response) => {
  const { triggerId, userId, payload } = req.body;

  if (!triggerId || !userId) {
    res.status(400).json({ success: false, error: 'triggerId and userId required' });
    return;
  }

  res.json({
    success: true,
    data: {
      triggerId,
      fired: true,
      timestamp: new Date().toISOString(),
    },
  });
}));

export default router;
