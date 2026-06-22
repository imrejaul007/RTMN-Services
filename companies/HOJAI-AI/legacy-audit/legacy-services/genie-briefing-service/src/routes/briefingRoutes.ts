/**
 * GENIE Briefing Service - Briefing Routes
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: API routes for briefing operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateBriefingSchema,
  UpdateBriefingSchema,
  GenerateBriefingSchema,
  GetBriefingQuerySchema,
  ListBriefingsQuerySchema,
  SectionType,
  ErrorResponse,
} from '../types.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as briefingService from '../services/briefingService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('briefing-routes');
const router = Router();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate request ID for response
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create API response object
 */
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

/**
 * Async route handler wrapper
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Middleware
// ============================================================================

// Apply tenant middleware to all routes
router.use(tenantMiddleware());

// ============================================================================
// GET /api/briefings/today - Get today's briefing
// ============================================================================

router.get(
  '/today',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    logger.info('get_today_briefing', { userId, tenantId });

    const briefing = await briefingService.getTodayBriefing(userId);

    if (!briefing) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'BRIEFING_NOT_FOUND',
          message: 'No briefing found for today',
        })
      );
      return;
    }

    res.json(createResponse(true, briefing, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/briefings/morning - Get morning briefing
// ============================================================================

router.get(
  '/morning',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    // Parse optional date query param
    const queryResult = GetBriefingQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'INVALID_QUERY',
          message: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        })
      );
      return;
    }

    const { date } = queryResult.data;

    logger.info('get_morning_briefing', { userId, tenantId, date });

    const briefing = await briefingService.getMorningBriefing(userId, date);

    if (!briefing) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'BRIEFING_NOT_FOUND',
          message: 'No morning briefing found',
        })
      );
      return;
    }

    res.json(createResponse(true, briefing, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/briefings/evening - Get evening briefing
// ============================================================================

router.get(
  '/evening',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    // Parse optional date query param
    const queryResult = GetBriefingQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'INVALID_QUERY',
          message: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        })
      );
      return;
    }

    const { date } = queryResult.data;

    logger.info('get_evening_briefing', { userId, tenantId, date });

    const briefing = await briefingService.getEveningBriefing(userId, date);

    if (!briefing) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'BRIEFING_NOT_FOUND',
          message: 'No evening briefing found',
        })
      );
      return;
    }

    res.json(createResponse(true, briefing, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/briefings/generate - Generate a new briefing
// ============================================================================

router.post(
  '/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;

    // Validate request body
    const parseResult = GenerateBriefingSchema.safeParse(req.body);
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

    const input = parseResult.data;

    logger.info('generate_briefing', { userId: input.user_id, tenantId, type: input.type });

    const briefing = await briefingService.generateBriefing(input);

    res.status(201).json(createResponse(true, briefing, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/briefings/history - Get briefing history
// ============================================================================

router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    // Parse query parameters
    const queryResult = ListBriefingsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'INVALID_QUERY',
          message: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        })
      );
      return;
    }

    const query = queryResult.data;

    logger.info('get_briefing_history', { userId, tenantId, query });

    const result = await briefingService.listBriefings(userId, query);

    res.json({
      success: true,
      data: result.briefings,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        hasMore: result.page * result.pageSize < result.total,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
        tenantId,
      },
    });
  })
);

// ============================================================================
// POST /api/briefings - Create a manual briefing
// ============================================================================

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    // Validate request body
    const parseResult = CreateBriefingSchema.safeParse(req.body);
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

    const input = parseResult.data;

    logger.info('create_briefing', { userId, tenantId, type: input.type });

    try {
      const briefing = await briefingService.createBriefing(userId, input);
      res.status(201).json(createResponse(true, briefing, undefined, { tenantId }));
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json(
          createResponse(false, undefined, {
            code: 'BRIEFING_EXISTS',
            message: error.message,
          })
        );
        return;
      }
      throw error;
    }
  })
);

// ============================================================================
// PATCH /api/briefings/:id - Update a briefing
// ============================================================================

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const briefingId = req.params.id;

    // Validate request body
    const parseResult = UpdateBriefingSchema.safeParse(req.body);
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

    const input = parseResult.data;

    logger.info('update_briefing', { userId, tenantId, briefingId });

    const briefing = await briefingService.updateBriefing(briefingId, userId, input);

    if (!briefing) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'BRIEFING_NOT_FOUND',
          message: 'Briefing not found',
        })
      );
      return;
    }

    res.json(createResponse(true, briefing, undefined, { tenantId }));
  })
);

// ============================================================================
// DELETE /api/briefings/:id - Delete a briefing
// ============================================================================

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const briefingId = req.params.id;

    logger.info('delete_briefing', { userId, tenantId, briefingId });

    const deleted = await briefingService.deleteBriefing(briefingId, userId);

    if (!deleted) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'BRIEFING_NOT_FOUND',
          message: 'Briefing not found',
        })
      );
      return;
    }

    res.json(
      createResponse(true, {
        deleted: true,
        id: briefingId,
      }, undefined, { tenantId })
    );
  })
);

// ============================================================================
// PATCH /api/briefings/:id/items/:sectionType/:itemId - Update a briefing item
// ============================================================================

router.patch(
  '/:id/items/:sectionType/:itemId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const briefingId = req.params.id;
    const sectionType = req.params.sectionType as SectionType;
    const itemId = req.params.itemId;

    // Validate section type
    const validSectionTypes: SectionType[] = ['calendar', 'tasks', 'followups', 'weather', 'insights', 'reminders'];
    if (!validSectionTypes.includes(sectionType)) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'INVALID_SECTION_TYPE',
          message: `Section type must be one of: ${validSectionTypes.join(', ')}`,
        })
      );
      return;
    }

    const updates = req.body;

    logger.info('update_briefing_item', { userId, tenantId, briefingId, sectionType, itemId });

    try {
      const briefing = await briefingService.updateBriefingItem(
        briefingId,
        userId,
        sectionType,
        itemId,
        updates
      );

      if (!briefing) {
        res.status(404).json(
          createResponse(false, undefined, {
            code: 'BRIEFING_NOT_FOUND',
            message: 'Briefing not found',
          })
        );
        return;
      }

      res.json(createResponse(true, briefing, undefined, { tenantId }));
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json(
          createResponse(false, undefined, {
            code: 'ITEM_NOT_FOUND',
            message: error.message,
          })
        );
        return;
      }
      throw error;
    }
  })
);

export default router;
