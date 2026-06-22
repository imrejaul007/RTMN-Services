/**
 * HOJAI Merchant Intelligence - Merchant Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { dashboardService } from '../services/dashboardService.js';
import { MerchantProfileModel, MerchantAlertModel, MerchantPerformanceScoreModel } from '../models/index.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();

router.use(tenantMiddleware());

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const MerchantProfileSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['retail', 'restaurant', 'salon', 'hotel', 'healthcare', 'ecommerce', 'services', 'other']),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z.string().optional()
  }).optional(),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional()
  }).optional()
});

// ============================================================================
// MERCHANT PROFILE ROUTES
// ============================================================================

/**
 * GET /api/merchants/profile/:merchantId
 */
router.get('/profile/:merchantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { merchantId } = req.params;

    const merchant = await MerchantProfileModel.findOne({ tenantId, merchantId });

    if (!merchant) {
      return res.status(404).json(createErrorResponse('MERCHANT_NOT_FOUND', 'Merchant not found'));
    }

    res.json(createResponse({ merchant }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/merchants/profile/:merchantId
 */
router.put('/profile/:merchantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { merchantId } = req.params;

    const validation = MerchantProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues }));
    }

    const merchant = await MerchantProfileModel.findOneAndUpdate(
      { tenantId, merchantId },
      { $set: validation.data },
      { new: true, upsert: true }
    );

    res.json(createResponse({ merchant }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * GET /api/merchants/:merchantId/dashboard
 */
router.get('/:merchantId/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { merchantId } = req.params;

    const dashboard = await dashboardService.getDashboard(tenantId, merchantId);

    res.json(createResponse({ dashboard }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/merchants/:merchantId/kpi-trends
 */
router.get('/:merchantId/kpi-trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { merchantId } = req.params;
    const kpis = (req.query.kpis as string || 'revenue,orders,customers').split(',');
    const days = parseInt(req.query.days as string) || 30;

    const trends = await dashboardService.getKPITrends(tenantId, merchantId, kpis, days);

    res.json(createResponse({ trends }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ALERTS ROUTES
// ============================================================================

/**
 * GET /api/merchants/:merchantId/alerts
 */
router.get('/:merchantId/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { merchantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const severity = req.query.severity as string | undefined;

    const query: Record<string, unknown> = { tenantId, merchantId };
    if (severity) query.severity = severity;

    const alerts = await MerchantAlertModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(createResponse({ alerts }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/merchants/:merchantId/alerts/:alertId/read
 */
router.patch('/:merchantId/alerts/:alertId/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { merchantId, alertId } = req.params;

    const alert = await MerchantAlertModel.findOneAndUpdate(
      { tenantId, merchantId, id: alertId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json(createErrorResponse('ALERT_NOT_FOUND', 'Alert not found'));
    }

    res.json(createResponse({ alert }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/merchants/:merchantId/alerts/:alertId/action
 */
router.patch('/:merchantId/alerts/:alertId/action', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { merchantId, alertId } = req.params;

    const alert = await MerchantAlertModel.findOneAndUpdate(
      { tenantId, merchantId, id: alertId },
      { $set: { isActioned: true, actionedAt: new Date() } },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json(createErrorResponse('ALERT_NOT_FOUND', 'Alert not found'));
    }

    res.json(createResponse({ alert }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PERFORMANCE ROUTES
// ============================================================================

/**
 * GET /api/merchants/:merchantId/performance
 */
router.get('/:merchantId/performance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { merchantId } = req.params;

    const performance = await MerchantPerformanceScoreModel.findOne({
      tenantId,
      merchantId
    }).sort({ computedAt: -1 });

    res.json(createResponse({ performance }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// COMPARISON ROUTES
// ============================================================================

/**
 * GET /api/merchants/:merchantId/compare
 */
router.get('/:merchantId/compare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { merchantId } = req.params;
    const competitors = (req.query.competitors as string || '').split(',').filter(Boolean);

    const comparison = await dashboardService.compareMerchants(tenantId, merchantId, competitors);

    res.json(createResponse({ comparison }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;
