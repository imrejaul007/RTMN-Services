import express, { Request, Response, NextFunction } from 'express';
import { decisionService } from '../services/decisionService.js';

const router = express.Router();

/**
 * POST /api/decide/cashback
 * Decide cashback for a transaction
 */
router.post('/cashback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId, amount, sessionId, channel } = req.body;
    if (!userId || !amount) {
      res.status(400).json({ success: false, error: 'userId and amount required' });
      return;
    }

    const decision = await decisionService.decideCashback({
      tenantId,
      userId,
      amount,
      context: { sessionId, channel }
    });

    res.json({ success: true, data: decision });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/decide/offer
 * Decide offer eligibility
 */
router.post('/offer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId, offerId } = req.body;
    if (!userId || !offerId) {
      res.status(400).json({ success: false, error: 'userId and offerId required' });
      return;
    }

    const decision = await decisionService.decideOffer({ tenantId, userId, offerId });
    res.json({ success: true, data: decision });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/decide/fraud
 * Decide fraud risk
 */
router.post('/fraud', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId, amount, velocity, riskSignals } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }

    const decision = await decisionService.decideFraud({
      tenantId,
      userId,
      transactionData: { amount, velocity: velocity || 1, riskSignals: riskSignals || [] }
    });

    res.json({ success: true, data: decision });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/decide/:userId
 * Get decisions for a user
 */
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const result = await decisionService.getUserDecisions({
      tenantId,
      userId: req.params.userId
    });

    res.json({ success: true, data: result.decisions, pagination: { total: result.total } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/decide/reviews/pending
 * Get pending manual reviews
 */
router.get('/reviews/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const decisions = await decisionService.getPendingReviews(tenantId, limit);

    res.json({ success: true, data: decisions });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/decide/:id/review
 * Review a decision
 */
router.post('/:id/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { action, reviewerId } = req.body;
    if (!action || !reviewerId) {
      res.status(400).json({ success: false, error: 'action and reviewerId required' });
      return;
    }

    const decision = await decisionService.reviewDecision({
      tenantId,
      decisionId: req.params.id,
      action,
      reviewerId
    });

    if (!decision) {
      res.status(404).json({ success: false, error: 'Decision not found or not pending review' });
      return;
    }

    res.json({ success: true, data: decision });
  } catch (error) {
    next(error);
  }
});

export default router;
