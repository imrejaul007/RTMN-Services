// ============================================
// HOJAI AI - SDR Agent Prospect Routes
// ============================================

import { Router, Request, Response } from 'express';
import { prospectFinder } from '../services/prospectFinder';
import { requireInternalAuth, extractTenant } from '../middleware/auth';
import {
  validateBody,
  ProspectSearchSchema,
  successResponse,
  errorResponse,
  paginatedResponse
} from '../utils/validation';
import { logger } from '../utils/logger';

const router = Router();

// Apply middleware
router.use(extractTenant);
router.use(requireInternalAuth);

/**
 * POST /api/prospects/find
 * Find prospects based on search criteria
 */
router.post('/find',
  validateBody(ProspectSearchSchema),
  async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = req;
      const search = req.body;
      const limit = Math.min(req.body.limit || 50, 100);
      const offset = req.body.offset || 0;

      logger.info('Prospect find request', { tenantId, search });

      const result = await prospectFinder.findProspects(
        tenantId!,
        search,
        limit,
        offset
      );

      res.json(paginatedResponse(result.prospects, result.total, limit, offset));
    } catch (error) {
      logger.error('Failed to find prospects', { error, tenantId: req.tenantId });
      res.status(500).json(errorResponse(
        'PROSPECT_FIND_FAILED',
        'Failed to find prospects',
        error instanceof Error ? error.message : undefined
      ));
    }
  }
);

/**
 * POST /api/prospects/generate
 * Generate new prospects using configured sources
 */
router.post('/generate',
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req;
      const { industry, companySize, location, title, limit = 10 } = req.body;

      logger.info('Generating new prospects', { tenantId, criteria: req.body });

      const prospects = await prospectFinder.generateProspects(
        tenantId!,
        { industry, companySize, location, title },
        limit
      );

      res.json(successResponse({
        prospects,
        count: prospects.length
      }, `Generated ${prospects.length} prospects`));
    } catch (error) {
      logger.error('Failed to generate prospects', { error, tenantId: req.tenantId });
      res.status(500).json(errorResponse(
        'PROSPECT_GENERATION_FAILED',
        'Failed to generate prospects',
        error instanceof Error ? error.message : undefined
      ));
    }
  }
);

/**
 * GET /api/prospects/:id
 * Get a specific prospect by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    // In a real implementation, this would fetch from database
    // For now, return not found as prospects are ephemeral until converted to leads
    res.status(404).json(errorResponse(
      'NOT_FOUND',
      'Prospect not found. Prospects must be converted to leads first.'
    ));
  } catch (error) {
    logger.error('Failed to get prospect', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'PROSPECT_GET_FAILED',
      'Failed to get prospect'
    ));
  }
});

export { router as prospectRoutes };
