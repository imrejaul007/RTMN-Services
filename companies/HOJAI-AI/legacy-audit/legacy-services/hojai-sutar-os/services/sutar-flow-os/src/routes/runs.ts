/**
 * SUTAR Flow OS - Run Routes
 * Handles flow run listing and management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { executionService } from '../services/executionService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// RUN ROUTES
// ============================================================================

/**
 * GET /runs
 * List all runs across flows
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const flowId = req.query.flowId as string;
    const status = req.query.status as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await executionService.listAllRuns(tenantId, {
      page,
      limit,
      flowId,
      status,
      startDate,
      endDate
    });

    res.json(createResponse(result, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /runs/:id
 * Get run detail
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const run = await executionService.getRun(tenantId, id);
    if (!run) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', 'Run not found'));
    }

    const steps = await executionService.getStepExecutions(tenantId, id);
    res.json(createResponse({ run, steps }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;
