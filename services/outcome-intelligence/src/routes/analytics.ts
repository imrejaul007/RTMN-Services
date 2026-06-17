import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics';

const router = Router();

/**
 * GET /api/outcomes/analytics
 * Get comprehensive analytics for a tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { startDate, endDate } = req.query;

    const analytics = await AnalyticsService.getAnalytics(
      tenantId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

/**
 * GET /api/outcomes/analytics/trends
 * Get trend analysis over time
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { period = 'daily', periods = 6 } = req.query;

    const trends = await AnalyticsService.getTrendAnalysis(
      tenantId,
      period as 'daily' | 'weekly' | 'monthly',
      Number(periods)
    );

    res.json({
      success: true,
      data: trends,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trends'
    });
  }
});

/**
 * GET /api/outcomes/analytics/metrics
 * Get key metrics summary
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { startDate, endDate } = req.query;

    const analytics = await AnalyticsService.getAnalytics(
      tenantId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    // Extract key metrics for quick summary
    const metrics = {
      revenueSavedPerTicket: analytics.revenueSavedPerTicket,
      customerRetentionRate: analytics.customerRetentionRate,
      churnPreventionRate: analytics.churnPreventionRate,
      upsellConversionRate: analytics.upsellConversionRate,
      referralRate: analytics.referralRate,
      riskDetectionRate: analytics.riskDetectionRate,
      roiPercentage: analytics.roiPercentage,
      averageResolutionTime: analytics.averageResolutionTime,
      csatImprovement: analytics.csatImprovement
    };

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

/**
 * GET /api/outcomes/analytics/compare
 * Compare current period with previous period
 */
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { period = 'weekly' } = req.query;

    const trends = await AnalyticsService.getTrendAnalysis(
      tenantId,
      period as 'daily' | 'weekly' | 'monthly',
      2
    );

    if (trends.length < 2) {
      return res.json({
        success: true,
        data: {
          current: trends[0] || null,
          previous: null,
          comparison: null,
          message: 'Not enough data for comparison'
        }
      });
    }

    const current = trends[1];
    const previous = trends[0];

    // Calculate changes
    const comparison = {
      revenueSavedChange: current.totals.totalRevenueSaved - previous.totals.totalRevenueSaved,
      revenueSavedChangePercent: previous.totals.totalRevenueSaved > 0
        ? ((current.totals.totalRevenueSaved - previous.totals.totalRevenueSaved) / previous.totals.totalRevenueSaved) * 100
        : 0,
      retentionRateChange: current.trends.retentionRate - previous.trends.retentionRate,
      upsellConversionChange: current.trends.upsellConversionRate - previous.trends.upsellConversionRate,
      avgResolutionTimeChange: current.averages.avgResolutionTime - previous.averages.avgResolutionTime
    };

    res.json({
      success: true,
      data: {
        current,
        previous,
        comparison
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error comparing periods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare periods'
    });
  }
});

export default router;
