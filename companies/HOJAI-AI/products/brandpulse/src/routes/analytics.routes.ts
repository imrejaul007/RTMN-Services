import { Router, Response } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { internalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Apply internal auth to all routes
router.use(internalAuth);

/**
 * Get brand overview
 */
router.get('/brand/:brandId/overview', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const overview = await analyticsService.getBrandOverview(brandId);

    if (!overview) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('[Analytics Routes] Error getting overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get overview'
    });
  }
});

/**
 * Get sentiment trend
 */
router.get('/brand/:brandId/sentiment', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const { period = 'day', days = 30 } = req.query;

    const trend = await analyticsService.getSentimentTrend(
      brandId,
      period as 'day' | 'week' | 'month',
      Number(days)
    );

    res.json({
      success: true,
      data: trend
    });
  } catch (error) {
    console.error('[Analytics Routes] Error getting sentiment trend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sentiment trend'
    });
  }
});

/**
 * Get volume trend
 */
router.get('/brand/:brandId/volume', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const { period = 'day', days = 30 } = req.query;

    const trend = await analyticsService.getVolumeTrend(
      brandId,
      period as 'day' | 'week' | 'month',
      Number(days)
    );

    res.json({
      success: true,
      data: trend
    });
  } catch (error) {
    console.error('[Analytics Routes] Error getting volume trend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get volume trend'
    });
  }
});

/**
 * Get rating distribution
 */
router.get('/brand/:brandId/ratings', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const distribution = await analyticsService.getRatingDistribution(brandId);

    res.json({
      success: true,
      data: distribution
    });
  } catch (error) {
    console.error('[Analytics Routes] Error getting rating distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rating distribution'
    });
  }
});

/**
 * Get source breakdown
 */
router.get('/brand/:brandId/sources', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const breakdown = await analyticsService.getSourceBreakdown(brandId);

    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('[Analytics Routes] Error getting source breakdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get source breakdown'
    });
  }
});

/**
 * Get aspect analysis
 */
router.get('/brand/:brandId/aspects', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const analysis = await analyticsService.getAspectAnalysis(brandId);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('[Analytics Routes] Error getting aspect analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get aspect analysis'
    });
  }
});

/**
 * Get active alerts
 */
router.get('/brand/:brandId/alerts', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const { severity } = req.query;

    const alerts = await analyticsService.getActiveAlerts(
      brandId,
      severity as any
    );

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('[Analytics Routes] Error getting alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts'
    });
  }
});

/**
 * Acknowledge alert
 */
router.patch('/alerts/:alertId/acknowledge', async (req: AuthRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const { userId = 'system' } = req.body;

    const alert = await analyticsService.acknowledgeAlert(alertId, userId);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('[Analytics Routes] Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

/**
 * Resolve alert
 */
router.patch('/alerts/:alertId/resolve', async (req: AuthRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const { userId = 'system' } = req.body;

    const alert = await analyticsService.resolveAlert(alertId, userId);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('[Analytics Routes] Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert'
    });
  }
});

/**
 * Trigger sentiment aggregation
 */
router.post('/brand/:brandId/aggregate', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const { tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    await analyticsService.aggregateSentiment(brandId, tenantId);

    res.json({
      success: true,
      message: 'Aggregation completed'
    });
  } catch (error) {
    console.error('[Analytics Routes] Error aggregating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to aggregate'
    });
  }
});

/**
 * Get comparison with competitors
 */
router.get('/brand/:brandId/compare', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;

    // Get brand overview
    const overview = await analyticsService.getBrandOverview(brandId);
    if (!overview) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    // This would typically fetch competitor data
    // For now, return the brand's own data
    res.json({
      success: true,
      data: {
        brand: overview,
        competitors: []
      }
    });
  } catch (error) {
    console.error('[Analytics Routes] Error getting comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comparison'
    });
  }
});

export default router;