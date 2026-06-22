import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { ProfileService } from '../services/profile.service';
import { err } from '../utils/response';

const router = Router();

// GET /api/profile/summary - Get unified profile
router.get('/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const summary = await ProfileService.getProfileSummary(req.userId!, req.userPhone!);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json(err('SRV_INTERNAL_ERROR', { message: err.message }));
  }
});

// POST /api/profile/transaction - Record cross-vertical transaction
router.post('/transaction', requireAuth, async (req: Request, res: Response) => {
  try {
    const { vertical, amount, merchantId, category } = req.body;
    await ProfileService.recordTransaction({
      userId: req.userId!,
      phone: req.userPhone!,
      vertical,
      amount,
      merchantId,
      category,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json(err('SRV_INTERNAL_ERROR', { message: err.message }));
  }
});

// POST /api/profile/engagement - Record app engagement
router.post('/engagement', requireAuth, async (req: Request, res: Response) => {
  try {
    await ProfileService.recordEngagement(req.userId!, req.userPhone!);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json(err('SRV_INTERNAL_ERROR', { message: err.message }));
  }
});

// GET /api/profile/tier - Get user tier
router.get('/tier', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await ProfileService.getProfileSummary(req.userId!, req.userPhone!);
    const currentLTV = profile.lifetimeValue;
    let nextTierAt: number | null = 1000;
    if (currentLTV < 1000) nextTierAt = 1000;
    else if (currentLTV < 10000) nextTierAt = 10000;
    else if (currentLTV < 50000) nextTierAt = 50000;
    else nextTierAt = null;

    res.json({
      success: true,
      data: {
        tier: profile.tier,
        lifetimeValue: currentLTV,
        nextTierAt,
      }
    });
  } catch (err) {
    res.status(500).json(err('SRV_INTERNAL_ERROR', { message: err.message }));
  }
});

export default router;
