/**
 * SUTAR Flow OS - Optimization Routes
 * Handles AI-powered workflow optimization
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { optimizationService } from '../services/optimizationService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse, AISuggestSchema, AIOptimizeSchema } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// OPTIMIZATION ROUTES
// ============================================================================

/**
 * POST /suggest
 * Get AI suggestions for workflow improvement
 */
router.post('/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const validation = AISuggestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid request data', { errors: validation.error.issues }));
    }

    const suggestions = await optimizationService.getSuggestions(tenantId, validation.data);
    res.json(createResponse(suggestions, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /optimize/:flowId
 * Optimize a flow
 */
router.post('/optimize/:flowId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { flowId } = req.params;

    const validation = AIOptimizeSchema.safeParse({
      flowId,
      ...req.body
    });

    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid optimization options', { errors: validation.error.issues }));
    }

    const optimization = await optimizationService.optimizeFlow(tenantId, validation.data);
    res.json(createResponse(optimization, { tenantId }));
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', (error as Error).message));
    }
    next(error);
  }
});

export default router;
