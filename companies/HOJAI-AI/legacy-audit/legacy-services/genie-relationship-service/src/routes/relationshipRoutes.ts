/**
 * GENIE Relationship Service - Relationship Routes
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: API routes for relationship management
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  relationshipService,
  interactionService,
} from '../services/relationshipService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import {
  CreateRelationshipSchema,
  UpdateRelationshipSchema,
  ListRelationshipsQuerySchema,
  APIResponse,
} from '../types.js';

const router = Router();

// Apply tenant middleware to all routes
router.use(tenantMiddleware());

// ============================================================================
// Response Helpers
// ============================================================================

function successResponse<T>(
  res: Response,
  data: T,
  tenantId?: string
): void {
  const response: APIResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      tenantId,
    },
  };
  res.json(response);
}

function errorResponse(
  res: Response,
  code: string,
  message: string,
  statusCode = 400
): void {
  res.status(statusCode).json({
    success: false,
    error: { code, message },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  });
}

// ============================================================================
// Relationship Routes
// ============================================================================

/**
 * POST /api/relationships - Create a new relationship
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = req.tenantContext!;
    const userId = req.userId!;

    // Validate input
    const parseResult = CreateRelationshipSchema.safeParse(req.body);
    if (!parseResult.success) {
      return errorResponse(
        res,
        'VALIDATION_ERROR',
        parseResult.error.errors.map((e) => e.message).join(', ')
      );
    }

    const relationship = await relationshipService.create(
      tenant_id,
      userId,
      parseResult.data
    );

    successResponse(res, relationship, tenant_id);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/relationships - List relationships
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = req.tenantContext!;
    const userId = req.userId!;

    // Validate query
    const parseResult = ListRelationshipsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return errorResponse(
        res,
        'VALIDATION_ERROR',
        parseResult.error.errors.map((e) => e.message).join(', ')
      );
    }

    const result = await relationshipService.list(
      tenant_id,
      userId,
      parseResult.data
    );

    res.json({
      success: true,
      data: result.relationships,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        hasMore: result.page * result.pageSize < result.total,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        tenantId: tenant_id,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/relationships/stats - Get relationship statistics
 */
router.get(
  '/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenant_id } = req.tenantContext!;
      const userId = req.userId!;

      const stats = await relationshipService.getStats(tenant_id, userId);
      successResponse(res, stats, tenant_id);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/relationships/:id - Get a single relationship
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenant_id } = req.tenantContext!;
      const userId = req.userId!;
      const { id } = req.params;

      const relationship = await relationshipService.get(
        tenant_id,
        userId,
        id
      );

      if (!relationship) {
        return errorResponse(
          res,
          'NOT_FOUND',
          'Relationship not found',
          404
        );
      }

      successResponse(res, relationship, tenant_id);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/relationships/:id - Update a relationship
 */
router.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenant_id } = req.tenantContext!;
      const userId = req.userId!;
      const { id } = req.params;

      // Validate input
      const parseResult = UpdateRelationshipSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          'VALIDATION_ERROR',
          parseResult.error.errors.map((e) => e.message).join(', ')
        );
      }

      const relationship = await relationshipService.update(
        tenant_id,
        userId,
        id,
        parseResult.data
      );

      if (!relationship) {
        return errorResponse(
          res,
          'NOT_FOUND',
          'Relationship not found',
          404
        );
      }

      successResponse(res, relationship, tenant_id);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/relationships/:id - Delete a relationship
 */
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenant_id } = req.tenantContext!;
      const userId = req.userId!;
      const { id } = req.params;

      const deleted = await relationshipService.delete(tenant_id, userId, id);

      if (!deleted) {
        return errorResponse(
          res,
          'NOT_FOUND',
          'Relationship not found',
          404
        );
      }

      successResponse(res, { deleted: true }, tenant_id);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Interaction Routes (nested under relationships)
// ============================================================================

/**
 * POST /api/relationships/:id/interactions - Log a new interaction
 */
router.post(
  '/:id/interactions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenant_id } = req.tenantContext!;
      const userId = req.userId!;
      const { id } = req.params;

      const { CreateInteractionSchema } = await import('../types.js');
      const parseResult = CreateInteractionSchema.safeParse(req.body);

      if (!parseResult.success) {
        return errorResponse(
          res,
          'VALIDATION_ERROR',
          parseResult.error.errors.map((e) => e.message).join(', ')
        );
      }

      const interaction = await interactionService.create(
        tenant_id,
        userId,
        id,
        parseResult.data
      );

      if (!interaction) {
        return errorResponse(
          res,
          'NOT_FOUND',
          'Relationship not found',
          404
        );
      }

      successResponse(res, interaction, tenant_id);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/relationships/:id/interactions - Get interactions for a relationship
 */
router.get(
  '/:id/interactions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenant_id } = req.tenantContext!;
      const userId = req.userId!;
      const { id } = req.params;

      const { ListInteractionsQuerySchema } = await import('../types.js');
      const parseResult = ListInteractionsQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return errorResponse(
          res,
          'VALIDATION_ERROR',
          parseResult.error.errors.map((e) => e.message).join(', ')
        );
      }

      // First verify relationship exists
      const relationship = await relationshipService.get(tenant_id, userId, id);
      if (!relationship) {
        return errorResponse(
          res,
          'NOT_FOUND',
          'Relationship not found',
          404
        );
      }

      const result = await interactionService.list(
        tenant_id,
        userId,
        id,
        parseResult.data
      );

      res.json({
        success: true,
        data: result.interactions,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          hasMore: result.page * result.pageSize < result.total,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
          tenantId: tenant_id,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/relationships/:id/interactions/stats - Get interaction statistics
 */
router.get(
  '/:id/interactions/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenant_id } = req.tenantContext!;
      const userId = req.userId!;
      const { id } = req.params;

      // First verify relationship exists
      const relationship = await relationshipService.get(tenant_id, userId, id);
      if (!relationship) {
        return errorResponse(
          res,
          'NOT_FOUND',
          'Relationship not found',
          404
        );
      }

      const stats = await interactionService.getStats(
        tenant_id,
        userId,
        id
      );
      successResponse(res, stats, tenant_id);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
