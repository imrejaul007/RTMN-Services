import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { RisksService } from '../services/risks';

const router = Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Initialize risks service
const risksService = new RisksService();

// ============================================================================
// Helper Functions
// ============================================================================

const getTenantId = (req: Request): string => {
  return (req as any).tenantId || 'default';
};

// ============================================================================
// Risks Endpoints
// ============================================================================

/**
 * GET /api/risks
 * List all risks for the tenant
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const {
      page = '1',
      limit = '20',
      level,
      status,
      category,
      sortBy = 'score',
      sortOrder = 'desc',
    } = req.query;

    const result = await risksService.getRisks(tenantId, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      level: level as string,
      status: status as string,
      category: category as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({
      success: true,
      data: result.data,
      assessment: result.assessment,
      pagination: {
        total: result.total,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        totalPages: Math.ceil(result.total / parseInt(limit as string, 10)),
      },
    });
  } catch (error) {
    logger.error('Error listing risks', { error });
    next(error);
  }
});

/**
 * GET /api/risks/assessment
 * Get risk assessment summary
 */
router.get('/assessment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const assessment = await risksService.getAssessment(tenantId);

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    logger.error('Error getting risk assessment', { error });
    next(error);
  }
});

/**
 * GET /api/risks/top
 * Get top risks by score
 */
router.get('/top', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { limit = '10' } = req.query;

    const risks = await risksService.getTopRisks(tenantId, parseInt(limit as string, 10));

    res.json({
      success: true,
      data: risks,
    });
  } catch (error) {
    logger.error('Error getting top risks', { error });
    next(error);
  }
});

/**
 * GET /api/risks/by-level
 * Get risks grouped by level
 */
router.get('/by-level', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const risks = await risksService.getRisksByLevel(tenantId);

    res.json({
      success: true,
      data: risks,
    });
  } catch (error) {
    logger.error('Error getting risks by level', { error });
    next(error);
  }
});

/**
 * GET /api/risks/by-status
 * Get risks grouped by status
 */
router.get('/by-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const risks = await risksService.getRisksByStatus(tenantId);

    res.json({
      success: true,
      data: risks,
    });
  } catch (error) {
    logger.error('Error getting risks by status', { error });
    next(error);
  }
});

/**
 * GET /api/risks/:id
 * Get a specific risk
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const risk = await risksService.getRisk(tenantId, id);

    if (!risk) {
      return res.status(404).json({
        success: false,
        error: 'Risk not found',
      });
    }

    res.json({
      success: true,
      data: risk,
    });
  } catch (error) {
    logger.error('Error getting risk', { error });
    next(error);
  }
});

/**
 * POST /api/risks
 * Create a new risk
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const risk = await risksService.createRisk(tenantId, req.body);

    logger.info('Risk created', { tenantId, riskId: risk.id });

    res.status(201).json({
      success: true,
      data: risk,
    });
  } catch (error) {
    logger.error('Error creating risk', { error });
    next(error);
  }
});

/**
 * PUT /api/risks/:id
 * Update a risk
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const risk = await risksService.updateRisk(tenantId, id, req.body);

    if (!risk) {
      return res.status(404).json({
        success: false,
        error: 'Risk not found',
      });
    }

    logger.info('Risk updated', { tenantId, riskId: id });

    res.json({
      success: true,
      data: risk,
    });
  } catch (error) {
    logger.error('Error updating risk', { error });
    next(error);
  }
});

/**
 * PATCH /api/risks/:id/status
 * Update risk status
 */
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { status } = req.body;

    const risk = await risksService.updateRiskStatus(tenantId, id, status);

    if (!risk) {
      return res.status(404).json({
        success: false,
        error: 'Risk not found',
      });
    }

    logger.info('Risk status updated', { tenantId, riskId: id, status });

    res.json({
      success: true,
      data: risk,
    });
  } catch (error) {
    logger.error('Error updating risk status', { error });
    next(error);
  }
});

/**
 * PATCH /api/risks/:id/mitigation
 * Update risk mitigation plan
 */
router.patch('/:id/mitigation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { mitigationPlan, contingencies } = req.body;

    const risk = await risksService.updateMitigationPlan(
      tenantId,
      id,
      mitigationPlan,
      contingencies
    );

    if (!risk) {
      return res.status(404).json({
        success: false,
        error: 'Risk not found',
      });
    }

    logger.info('Risk mitigation updated', { tenantId, riskId: id });

    res.json({
      success: true,
      data: risk,
    });
  } catch (error) {
    logger.error('Error updating risk mitigation', { error });
    next(error);
  }
});

/**
 * DELETE /api/risks/:id
 * Delete a risk
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const deleted = await risksService.deleteRisk(tenantId, id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Risk not found',
      });
    }

    logger.info('Risk deleted', { tenantId, riskId: id });

    res.json({
      success: true,
      message: 'Risk deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting risk', { error });
    next(error);
  }
});

/**
 * POST /api/risks/:id/mitigate
 * Mark risk as mitigated
 */
router.post('/:id/mitigate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const risk = await risksService.mitigateRisk(tenantId, id);

    if (!risk) {
      return res.status(404).json({
        success: false,
        error: 'Risk not found',
      });
    }

    logger.info('Risk mitigated', { tenantId, riskId: id });

    res.json({
      success: true,
      data: risk,
    });
  } catch (error) {
    logger.error('Error mitigating risk', { error });
    next(error);
  }
});

/**
 * POST /api/risks/:id/close
 * Close a risk
 */
router.post('/:id/close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const risk = await risksService.closeRisk(tenantId, id);

    if (!risk) {
      return res.status(404).json({
        success: false,
        error: 'Risk not found',
      });
    }

    logger.info('Risk closed', { tenantId, riskId: id });

    res.json({
      success: true,
      data: risk,
    });
  } catch (error) {
    logger.error('Error closing risk', { error });
    next(error);
  }
});

/**
 * GET /api/risks/categories
 * Get available risk categories
 */
router.get('/meta/categories', (req: Request, res: Response) => {
  const categories = [
    'financial',
    'operational',
    'strategic',
    'compliance',
    'technical',
    'market',
    'reputational',
    'environmental',
    'political',
    'regulatory',
  ];

  res.json({
    success: true,
    data: categories,
  });
});

/**
 * GET /api/risks/trends
 * Get risk trends over time
 */
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { period = '30d' } = req.query;

    const trends = await risksService.getRiskTrends(tenantId, period as string);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('Error getting risk trends', { error });
    next(error);
  }
});

export default router;
