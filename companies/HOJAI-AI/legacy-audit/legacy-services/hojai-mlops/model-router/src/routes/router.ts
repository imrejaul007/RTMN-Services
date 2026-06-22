/**
 * Hojai Model Router - Route Endpoints
 */

import { Router, Response, NextFunction } from 'express';
import { modelRouterService } from '../services/router';
import {
  routeRequestSchema,
  fallbackRequestSchema,
} from '../validators';
import { ZodError } from 'zod';
import { ApiError, TaskType } from '../types';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/route - Route request to appropriate model
 */
router.post('/route', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = routeRequestSchema.parse(req.body);

    const result = await modelRouterService.route({
      task: validatedData.task,
      input: validatedData.input,
      options: validatedData.options,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({
        error: 'Validation Error',
        message: messages,
        statusCode: 400,
        timestamp: new Date().toISOString(),
      } as ApiError);
      return;
    }
    next(error);
  }
});

/**
 * POST /api/fallback - Handle fallback when primary fails
 */
router.post('/fallback', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = fallbackRequestSchema.parse(req.body);

    const result = await modelRouterService.handleFallback({
      originalRequest: validatedData.originalRequest,
      failedProvider: validatedData.failedProvider,
      error: validatedData.error,
      attempt: validatedData.attempt,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({
        error: 'Validation Error',
        message: messages,
        statusCode: 400,
        timestamp: new Date().toISOString(),
      } as ApiError);
      return;
    }
    next(error);
  }
});

/**
 * GET /api/providers - List available providers
 */
router.get('/providers', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const providers = modelRouterService.getProviders();

    res.status(200).json({
      success: true,
      providers,
      total: providers.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/costs - Get cost estimates
 */
router.get('/costs', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const task = req.query['task'] as TaskType | undefined;
    const inputLength = parseInt((req.query['inputLength'] as string) || '1000', 10);

    if (!task) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Query parameter "task" is required',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      } as ApiError);
      return;
    }

    const estimates = modelRouterService.getCostEstimates(task, inputLength);

    res.status(200).json({
      success: true,
      estimates,
      currency: 'USD',
      inputLength,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stats - Get router statistics
 */
router.get('/stats', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stats = modelRouterService.getStats();

    res.status(200).json({
      success: true,
      ...stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/stats - Reset statistics
 */
router.delete('/stats', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    modelRouterService.resetStats();

    res.status(200).json({
      success: true,
      message: 'Statistics reset successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
