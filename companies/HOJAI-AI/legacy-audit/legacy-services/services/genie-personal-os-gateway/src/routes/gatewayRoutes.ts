/**
 * GENIE Personal OS Gateway - Routes
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  UnifiedSearchSchema,
  AICompanionSchema,
  ErrorResponse,
} from '../types.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as gatewayService from '../services/gatewayService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('gateway-routes');
const router = Router();

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createResponse<T>(success: boolean, data?: T, error?: ErrorResponse['error'], meta?: Record<string, unknown>) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...meta,
    },
  };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Middleware
router.use(tenantMiddleware());

// ============================================================================
// GET /api/personal/context - Get personal context
// ============================================================================

router.get(
  '/personal/context',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    logger.info('get_personal_context', { userId, tenantId });

    const context = await gatewayService.getPersonalContext(userId, tenantId);

    res.json(createResponse(true, context, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/search - Unified search
// ============================================================================

router.post(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    const parseResult = UnifiedSearchSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const { query, types, limit } = parseResult.data;

    logger.info('unified_search', { userId, tenantId, query, types });

    const results = await gatewayService.unifiedSearch(userId, tenantId, query, types);

    res.json(createResponse(true, results, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/timeline - Personal timeline
// ============================================================================

router.get(
  '/timeline',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const limit = parseInt(req.query.limit as string) || 50;

    logger.info('get_timeline', { userId, tenantId, limit });

    const timeline = await gatewayService.getPersonalTimeline(userId, tenantId, limit);

    res.json(createResponse(true, { timeline, count: timeline.length }, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/briefing - Get daily briefing
// ============================================================================

router.get(
  '/briefing',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    logger.info('get_daily_briefing', { userId, tenantId });

    // Get briefing from briefing service
    const axios = (await import('axios')).default;
    try {
      const response = await axios.get(`${process.env.GENIE_BRIEFING || 'http://localhost:4706'}/api/briefings/daily`, {
        headers: {
          'X-User-Id': userId,
          'X-Tenant-Id': tenantId,
        },
      });
      res.json(createResponse(true, response.data, undefined, { tenantId }));
    } catch (error) {
      logger.error('briefing_fetch_failed', { error });
      res.json(createResponse(true, { briefing: null, message: 'No briefing available' }, undefined, { tenantId }));
    }
  })
);

// ============================================================================
// GET /api/health/services - Check connected services health
// ============================================================================

router.get(
  '/health/services',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.info('check_services_health');

    const health = await gatewayService.checkServicesHealth();

    const allHealthy = Object.values(health).every(Boolean);

    res.json({
      success: true,
      data: health,
      status: allHealthy ? 'healthy' : 'degraded',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    });
  })
);

export default router;
