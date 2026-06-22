// ============================================================================
// HOJAI VOICE PLATFORM - Analytics Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { getAnalyticsService } from '../services/analytics.service';
import { AuthenticatedRequest } from '../types';

const router = Router();
const analyticsService = getAnalyticsService();

/**
 * Get overall analytics
 * GET /api/analytics
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getOverallAnalytics(
      organizationId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get analytics for specific agent
 * GET /api/analytics/agents/:id
 */
router.get('/agents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getAgentAnalytics(
      req.params.id,
      organizationId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get call metrics
 * GET /api/analytics/calls
 */
router.get('/calls', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const { startDate, endDate } = req.query;

    const metrics = await analyticsService.getCallMetrics(
      organizationId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get real-time dashboard data
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const dashboardData = await analyticsService.getDashboardData(organizationId);

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get live analytics
 * GET /api/analytics/live
 */
router.get('/live', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const liveData = await analyticsService.getLiveAnalytics(organizationId);

    res.json({
      success: true,
      data: liveData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get hourly distribution
 * GET /api/analytics/hourly
 */
router.get('/hourly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const { date } = req.query;

    const distribution = await analyticsService.getHourlyDistribution(
      organizationId,
      date ? new Date(date as string) : new Date()
    );

    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
