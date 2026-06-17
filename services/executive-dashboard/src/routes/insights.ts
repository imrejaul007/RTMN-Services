import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { InsightsService } from '../services/insights';

const router = Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Initialize insights service
const insightsService = new InsightsService();

// ============================================================================
// Helper Functions
// ============================================================================

const getTenantId = (req: Request): string => {
  return (req as any).tenantId || 'default';
};

// ============================================================================
// Insights Endpoints
// ============================================================================

/**
 * GET /api/insights
 * List all insights for the tenant
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const {
      page = '1',
      limit = '20',
      type,
      severity,
      category,
      viewed,
    } = req.query;

    const result = await insightsService.getInsights(tenantId, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      type: type as string,
      severity: severity as string,
      category: category as string,
      viewed: viewed === 'true',
    });

    res.json({
      success: true,
      data: result.data,
      summary: result.summary,
      pagination: {
        total: result.total,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        totalPages: Math.ceil(result.total / parseInt(limit as string, 10)),
      },
    });
  } catch (error) {
    logger.error('Error listing insights', { error });
    next(error);
  }
});

/**
 * GET /api/insights/summary
 * Get insights summary
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const summary = await insightsService.getSummary(tenantId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Error getting insights summary', { error });
    next(error);
  }
});

/**
 * GET /api/insights/recent
 * Get recent insights
 */
router.get('/recent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { limit = '10' } = req.query;

    const insights = await insightsService.getRecentInsights(tenantId, parseInt(limit as string, 10));

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    logger.error('Error getting recent insights', { error });
    next(error);
  }
});

/**
 * GET /api/insights/unread
 * Get unread insights
 */
router.get('/unread', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const insights = await insightsService.getUnreadInsights(tenantId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    logger.error('Error getting unread insights', { error });
    next(error);
  }
});

/**
 * GET /api/insights/:id
 * Get a specific insight
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const insight = await insightsService.getInsight(tenantId, id);

    if (!insight) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found',
      });
    }

    res.json({
      success: true,
      data: insight,
    });
  } catch (error) {
    logger.error('Error getting insight', { error });
    next(error);
  }
});

/**
 * POST /api/insights
 * Create a new insight
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const insight = await insightsService.createInsight(tenantId, req.body);

    logger.info('Insight created', { tenantId, insightId: insight.id });

    res.status(201).json({
      success: true,
      data: insight,
    });
  } catch (error) {
    logger.error('Error creating insight', { error });
    next(error);
  }
});

/**
 * POST /api/insights/generate
 * Generate insights from metrics
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { categories } = req.body;

    const insights = await insightsService.generateInsights(tenantId, categories);

    logger.info('Insights generated', { tenantId, count: insights.length });

    res.status(201).json({
      success: true,
      data: insights,
    });
  } catch (error) {
    logger.error('Error generating insights', { error });
    next(error);
  }
});

/**
 * PATCH /api/insights/:id/view
 * Mark insight as viewed
 */
router.patch('/:id/view', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const insight = await insightsService.markAsViewed(tenantId, id);

    if (!insight) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found',
      });
    }

    res.json({
      success: true,
      data: insight,
    });
  } catch (error) {
    logger.error('Error marking insight as viewed', { error });
    next(error);
  }
});

/**
 * PATCH /api/insights/:id/action
 * Record action taken on insight
 */
router.patch('/:id/action', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { actionTaken } = req.body;

    const insight = await insightsService.recordAction(tenantId, id, actionTaken);

    if (!insight) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found',
      });
    }

    res.json({
      success: true,
      data: insight,
    });
  } catch (error) {
    logger.error('Error recording insight action', { error });
    next(error);
  }
});

/**
 * DELETE /api/insights/:id
 * Delete an insight
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const deleted = await insightsService.deleteInsight(tenantId, id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found',
      });
    }

    logger.info('Insight deleted', { tenantId, insightId: id });

    res.json({
      success: true,
      message: 'Insight deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting insight', { error });
    next(error);
  }
});

/**
 * DELETE /api/insights/expired
 * Delete expired insights
 */
router.delete('/expired/cleanup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const deleted = await insightsService.cleanupExpiredInsights(tenantId);

    logger.info('Expired insights cleaned up', { tenantId, count: deleted });

    res.json({
      success: true,
      data: { deleted },
    });
  } catch (error) {
    logger.error('Error cleaning up expired insights', { error });
    next(error);
  }
});

/**
 * GET /api/insights/by-type/:type
 * Get insights by type
 */
router.get('/by-type/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { type } = req.params;
    const { limit = '20' } = req.query;

    const insights = await insightsService.getInsightsByType(
      tenantId,
      type,
      parseInt(limit as string, 10)
    );

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    logger.error('Error getting insights by type', { error });
    next(error);
  }
});

/**
 * GET /api/insights/by-category/:category
 * Get insights by category
 */
router.get('/by-category/:category', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { category } = req.params;
    const { limit = '20' } = req.query;

    const insights = await insightsService.getInsightsByCategory(
      tenantId,
      category,
      parseInt(limit as string, 10)
    );

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    logger.error('Error getting insights by category', { error });
    next(error);
  }
});

export default router;
