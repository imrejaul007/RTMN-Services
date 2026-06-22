/**
 * HOJAI Commerce Intelligence - Analytics Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();

// Apply tenant middleware to all routes
router.use(tenantMiddleware());

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/analytics/metrics
 * Get metrics for a time period
 */
router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const period = (req.query.period as string) || 'day';
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const validPeriods = ['day', 'week', 'month', 'quarter', 'year'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json(createErrorResponse(
        'INVALID_PERIOD',
        `Period must be one of: ${validPeriods.join(', ')}`
      ));
    }

    const metrics = await analyticsService.getMetrics({
      tenantId,
      period: period as any,
      startDate,
      endDate
    });

    res.json(createResponse({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      metrics
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/dashboard
 * Get dashboard summary
 */
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const dashboard = await analyticsService.getDashboardSummary(tenantId);

    res.json(createResponse({
      dashboard
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/cohorts
 * Get cohort analysis
 */
router.get('/cohorts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const cohortPeriod = (req.query.period as string) || 'month';
    const cohorts = parseInt(req.query.cohorts as string) || 6;

    const validPeriods = ['week', 'month'];
    if (!validPeriods.includes(cohortPeriod)) {
      return res.status(400).json(createErrorResponse(
        'INVALID_PERIOD',
        `Cohort period must be one of: ${validPeriods.join(', ')}`
      ));
    }

    const cohortAnalysis = await analyticsService.getCohortAnalysis(tenantId, cohortPeriod as any, cohorts);

    res.json(createResponse({
      cohortPeriod,
      cohorts: cohortAnalysis
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/funnel
 * Get funnel analytics
 */
router.get('/funnel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) :
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const funnel = await analyticsService.getFunnelAnalytics(tenantId, startDate, endDate);

    res.json(createResponse({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      funnel
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/revenue
 * Get revenue analytics
 */
router.get('/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const period = (req.query.period as string) || 'month';

    // Get metrics for current period
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
    }

    const metrics = await analyticsService.getMetrics({
      tenantId,
      period: period as any,
      startDate,
      endDate
    });

    res.json(createResponse({
      period,
      revenue: {
        gross: metrics.grossRevenue,
        net: metrics.netRevenue,
        averageOrderValue: metrics.averageOrderValue,
        totalOrders: metrics.totalOrders
      },
      comparison: {
        momGrowth: metrics.momGrowth,
        yoyGrowth: metrics.yoyGrowth
      }
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/users
 * Get user analytics
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const period = (req.query.period as string) || 'month';

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const metrics = await analyticsService.getMetrics({
      tenantId,
      period: period as any,
      startDate,
      endDate: now
    });

    res.json(createResponse({
      period,
      users: {
        new: metrics.newCustomers,
        returning: metrics.returningCustomers,
        active: metrics.activeUsers,
        conversionRate: metrics.conversionRate
      }
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/products/top
 * Get top performing products
 */
router.get('/products/top', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const period = (req.query.period as string) || 'month';
    const limit = parseInt(req.query.limit as string) || 10;

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const metrics = await analyticsService.getMetrics({
      tenantId,
      period: period as any,
      startDate,
      endDate: now
    });

    res.json(createResponse({
      period,
      topProducts: metrics.topProducts.slice(0, limit)
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;
