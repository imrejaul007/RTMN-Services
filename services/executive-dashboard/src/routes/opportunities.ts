import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { OpportunitiesService } from '../services/opportunities';

const router = Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Initialize opportunities service
const opportunitiesService = new OpportunitiesService();

// ============================================================================
// Helper Functions
// ============================================================================

const getTenantId = (req: Request): string => {
  return (req as any).tenantId || 'default';
};

// ============================================================================
// Opportunities Endpoints
// ============================================================================

/**
 * GET /api/opportunities
 * List all opportunities for the tenant
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const {
      page = '1',
      limit = '20',
      status,
      priority,
      category,
      sortBy = 'probability',
      sortOrder = 'desc',
    } = req.query;

    const result = await opportunitiesService.getOpportunities(tenantId, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      status: status as string,
      priority: priority as string,
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
    logger.error('Error listing opportunities', { error });
    next(error);
  }
});

/**
 * GET /api/opportunities/assessment
 * Get opportunity assessment summary
 */
router.get('/assessment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const assessment = await opportunitiesService.getAssessment(tenantId);

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    logger.error('Error getting opportunity assessment', { error });
    next(error);
  }
});

/**
 * GET /api/opportunities/top
 * Get top opportunities by value/probability
 */
router.get('/top', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { limit = '10', sortBy = 'value' } = req.query;

    const opportunities = await opportunitiesService.getTopOpportunities(
      tenantId,
      parseInt(limit as string, 10),
      sortBy as string
    );

    res.json({
      success: true,
      data: opportunities,
    });
  } catch (error) {
    logger.error('Error getting top opportunities', { error });
    next(error);
  }
});

/**
 * GET /api/opportunities/by-status
 * Get opportunities grouped by status
 */
router.get('/by-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const opportunities = await opportunitiesService.getOpportunitiesByStatus(tenantId);

    res.json({
      success: true,
      data: opportunities,
    });
  } catch (error) {
    logger.error('Error getting opportunities by status', { error });
    next(error);
  }
});

/**
 * GET /api/opportunities/by-category
 * Get opportunities grouped by category
 */
router.get('/by-category', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const opportunities = await opportunitiesService.getOpportunitiesByCategory(tenantId);

    res.json({
      success: true,
      data: opportunities,
    });
  } catch (error) {
    logger.error('Error getting opportunities by category', { error });
    next(error);
  }
});

/**
 * GET /api/opportunities/pipeline
 * Get opportunity pipeline summary
 */
router.get('/pipeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const pipeline = await opportunitiesService.getPipeline(tenantId);

    res.json({
      success: true,
      data: pipeline,
    });
  } catch (error) {
    logger.error('Error getting opportunity pipeline', { error });
    next(error);
  }
});

/**
 * GET /api/opportunities/:id
 * Get a specific opportunity
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const opportunity = await opportunitiesService.getOpportunity(tenantId, id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    res.json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    logger.error('Error getting opportunity', { error });
    next(error);
  }
});

/**
 * POST /api/opportunities
 * Create a new opportunity
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const opportunity = await opportunitiesService.createOpportunity(tenantId, req.body);

    logger.info('Opportunity created', { tenantId, opportunityId: opportunity.id });

    res.status(201).json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    logger.error('Error creating opportunity', { error });
    next(error);
  }
});

/**
 * PUT /api/opportunities/:id
 * Update an opportunity
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const opportunity = await opportunitiesService.updateOpportunity(tenantId, id, req.body);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    logger.info('Opportunity updated', { tenantId, opportunityId: id });

    res.json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    logger.error('Error updating opportunity', { error });
    next(error);
  }
});

/**
 * PATCH /api/opportunities/:id/status
 * Update opportunity status
 */
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { status } = req.body;

    const opportunity = await opportunitiesService.updateStatus(tenantId, id, status);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    logger.info('Opportunity status updated', { tenantId, opportunityId: id, status });

    res.json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    logger.error('Error updating opportunity status', { error });
    next(error);
  }
});

/**
 * PATCH /api/opportunities/:id/evaluate
 * Update opportunity evaluation
 */
router.patch('/:id/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { estimatedValue, probability, effort, timeline } = req.body;

    const opportunity = await opportunitiesService.evaluateOpportunity(
      tenantId,
      id,
      { estimatedValue, probability, effort, timeline }
    );

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    logger.info('Opportunity evaluated', { tenantId, opportunityId: id });

    res.json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    logger.error('Error evaluating opportunity', { error });
    next(error);
  }
});

/**
 * DELETE /api/opportunities/:id
 * Delete an opportunity
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const deleted = await opportunitiesService.deleteOpportunity(tenantId, id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    logger.info('Opportunity deleted', { tenantId, opportunityId: id });

    res.json({
      success: true,
      message: 'Opportunity deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting opportunity', { error });
    next(error);
  }
});

/**
 * POST /api/opportunities/:id/approve
 * Approve an opportunity
 */
router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const opportunity = await opportunitiesService.approveOpportunity(tenantId, id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    logger.info('Opportunity approved', { tenantId, opportunityId: id });

    res.json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    logger.error('Error approving opportunity', { error });
    next(error);
  }
});

/**
 * POST /api/opportunities/:id/reject
 * Reject an opportunity
 */
router.post('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { reason } = req.body;

    const opportunity = await opportunitiesService.rejectOpportunity(tenantId, id, reason);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    logger.info('Opportunity rejected', { tenantId, opportunityId: id });

    res.json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    logger.error('Error rejecting opportunity', { error });
    next(error);
  }
});

/**
 * POST /api/opportunities/:id/implement
 * Mark opportunity as implementing
 */
router.post('/:id/implement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const opportunity = await opportunitiesService.startImplementation(tenantId, id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    logger.info('Opportunity implementation started', { tenantId, opportunityId: id });

    res.json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    logger.error('Error starting opportunity implementation', { error });
    next(error);
  }
});

/**
 * POST /api/opportunities/:id/complete
 * Mark opportunity as completed
 */
router.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { actualOutcome } = req.body;

    const opportunity = await opportunitiesService.completeOpportunity(
      tenantId,
      id,
      actualOutcome
    );

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    logger.info('Opportunity completed', { tenantId, opportunityId: id });

    res.json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    logger.error('Error completing opportunity', { error });
    next(error);
  }
});

/**
 * GET /api/opportunities/categories
 * Get available opportunity categories
 */
router.get('/meta/categories', (req: Request, res: Response) => {
  const categories = [
    'market_expansion',
    'product_development',
    'partnership',
    'cost_reduction',
    'efficiency',
    'digital_transformation',
    'sustainability',
    'merger_acquisition',
    'talent',
    'infrastructure',
  ];

  res.json({
    success: true,
    data: categories,
  });
});

/**
 * GET /api/opportunities/types
 * Get available opportunity types
 */
router.get('/meta/types', (req: Request, res: Response) => {
  const types = [
    'strategic',
    'operational',
    'financial',
    'marketing',
    'technology',
    'partnership',
    'expansion',
    'optimization',
  ];

  res.json({
    success: true,
    data: types,
  });
});

/**
 * GET /api/opportunities/roi-analysis
 * Get ROI analysis for opportunities
 */
router.get('/roi-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const analysis = await opportunitiesService.getROIAnalysis(tenantId);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('Error getting ROI analysis', { error });
    next(error);
  }
});

export default router;
