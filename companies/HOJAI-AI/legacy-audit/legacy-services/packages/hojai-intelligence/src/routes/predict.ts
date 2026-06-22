import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { predictService } from '../services/predictService.js';

const router = express.Router();

// ============================================================================
// PREDICTION ROUTES
// ============================================================================

/**
 * GET /api/predict/:userId/churn
 * Get churn prediction for a user
 */
router.get('/:userId/churn', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const prediction = await predictService.predictChurn({
      tenantId,
      userId: req.params.userId,
      features: req.query.features as Record<string, number>
    });

    res.json({ success: true, data: prediction });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/predict/:userId/ltv
 * Get LTV prediction for a user
 */
router.get('/:userId/ltv', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const prediction = await predictService.predictLTV({
      tenantId,
      userId: req.params.userId,
      features: req.query.features as Record<string, number>,
      timeframe: req.query.timeframe ? parseInt(req.query.timeframe as string) : undefined
    });

    res.json({ success: true, data: prediction });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/predict/:userId/revisit
 * Get revisit prediction for a user
 */
router.get('/:userId/revisit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const prediction = await predictService.predictRevisit({
      tenantId,
      userId: req.params.userId,
      features: req.query.features as Record<string, number>
    });

    res.json({ success: true, data: prediction });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/predict/:userId/all
 * Get all predictions for a user
 */
router.get('/:userId/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const predictions = await predictService.getAllPredictions({
      tenantId,
      userId: req.params.userId,
      features: req.query.features as Record<string, number>
    });

    res.json({ success: true, data: predictions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/predict/at-risk
 * Get at-risk users
 */
router.get('/segments/at-risk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const predictions = await predictService.getAtRiskUsers(tenantId, limit);

    res.json({ success: true, data: predictions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/predict/high-value
 * Get high-value users
 */
router.get('/segments/high-value', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const predictions = await predictService.getHighValueUsers(tenantId, limit);

    res.json({ success: true, data: predictions });
  } catch (error) {
    next(error);
  }
});

export default router;
