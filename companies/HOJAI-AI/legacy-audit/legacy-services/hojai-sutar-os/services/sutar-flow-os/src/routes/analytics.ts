/**
 * SUTAR Flow OS - Analytics Routes
 * Handles dashboard and analytics endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * GET /dashboard
 * Get workflow dashboard statistics
 */
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const dashboard = await analyticsService.getDashboard(tenantId);
    res.json(createResponse(dashboard, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics
 * Get workflow analytics
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const analytics = await analyticsService.getWorkflowAnalytics(tenantId);
    res.json(createResponse(analytics, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;
