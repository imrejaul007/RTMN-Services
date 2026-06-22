/**
 * SUTAR Flow OS - Flow Routes
 * Handles flow definition CRUD and execution
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { flowService } from '../services/flowService.js';
import { executionService } from '../services/executionService.js';
import { analyticsService } from '../services/analyticsService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse, CreateFlowSchema, UpdateFlowSchema, RunFlowSchema } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// FLOW ROUTES
// ============================================================================

/**
 * GET /flows
 * List flow definitions
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = await flowService.list(tenantId, { page, limit, search, sortBy, sortOrder });
    res.json(createResponse(result, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /flows
 * Create a new flow definition
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const userId = req.authContext?.userId || 'system';

    const validation = CreateFlowSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid flow data', { errors: validation.error.issues }));
    }

    const flow = await flowService.create(tenantId, userId, validation.data);
    res.status(201).json(createResponse({ flow }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /flows/:id
 * Get flow definition by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const flow = await flowService.getById(tenantId, id);
    if (!flow) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', 'Flow not found'));
    }

    res.json(createResponse({ flow }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /flows/:id
 * Update a flow definition
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const validation = UpdateFlowSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid flow data', { errors: validation.error.issues }));
    }

    const flow = await flowService.update(tenantId, id, validation.data);
    if (!flow) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', 'Flow not found'));
    }

    res.json(createResponse({ flow }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /flows/:id
 * Delete a flow definition
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const deleted = await flowService.delete(tenantId, id);
    if (!deleted) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', 'Flow not found'));
    }

    res.json(createResponse({ deleted: true }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /flows/:id/run
 * Execute a flow
 */
router.post('/:id/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const validation = RunFlowSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid run data', { errors: validation.error.issues }));
    }

    const run = await executionService.startRun(
      tenantId,
      id,
      validation.data.context || {},
      validation.data.triggeredBy,
      validation.data.triggeredById
    );

    res.status(201).json(createResponse({ run }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /flows/:id/runs
 * Get flow run history
 */
router.get('/:id/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const result = await executionService.listRuns(tenantId, id, { page, limit, status });
    res.json(createResponse(result, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /flows/:id/runs/:runId
 * Get run detail
 */
router.get('/:id/runs/:runId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id, runId } = req.params;

    const run = await executionService.getRun(tenantId, runId);
    if (!run || run.flowId !== id) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', 'Run not found'));
    }

    const steps = await executionService.getStepExecutions(tenantId, runId);
    res.json(createResponse({ run, steps }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /flows/:id/runs/:runId/cancel
 * Cancel a run
 */
router.post('/:id/runs/:runId/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id, runId } = req.params;

    const run = await executionService.cancelRun(tenantId, runId);
    if (!run || run.flowId !== id) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', 'Run not found'));
    }

    res.json(createResponse({ run }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /flows/:id/analytics
 * Get flow analytics
 */
router.get('/:id/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const period = {
      start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: req.query.end ? new Date(req.query.end as string) : new Date()
    };

    const analytics = await analyticsService.getFlowAnalytics(tenantId, id, period);
    if (!analytics) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', 'No analytics data available'));
    }

    res.json(createResponse({ analytics }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /flows/:id/bottlenecks
 * Get flow bottlenecks
 */
router.get('/:id/bottlenecks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    // Check if we should detect new bottlenecks
    if (req.query.detect === 'true') {
      await analyticsService.detectBottlenecks(tenantId, id);
    }

    const bottlenecks = await analyticsService.getBottlenecks(tenantId, id);
    res.json(createResponse({ bottlenecks }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;
