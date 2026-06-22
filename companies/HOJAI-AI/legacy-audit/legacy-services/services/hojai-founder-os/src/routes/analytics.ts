/**
 * HOJAI FounderOS - Analytics Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/analytics
 * Get comprehensive founder analytics
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const analytics = await analyticsService.getFounderAnalytics(tenantId);
    res.json(createResponse({ analytics }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/business-model
 * Get business model analytics
 */
router.get('/business-model', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const analytics = await analyticsService.getBusinessModelAnalytics(tenantId);
    res.json(createResponse({ analytics }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/gtm
 * Get GTM analytics
 */
router.get('/gtm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const analytics = await analyticsService.getGTMAnalytics(tenantId);
    res.json(createResponse({ analytics }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/timeline
 * Get timeline/milestone analytics
 */
router.get('/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const analytics = await analyticsService.getTimelineAnalytics(tenantId);
    res.json(createResponse({ analytics }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;