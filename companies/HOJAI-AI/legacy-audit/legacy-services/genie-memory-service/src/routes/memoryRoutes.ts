/**
 * GENIE Memory Service - Memory Routes
 * Version: 1.0.0 | Date: May 31, 2026
 * Purpose: API routes for memory operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateMemorySchema,
  UpdateMemorySchema,
  SearchMemoriesSchema,
  ListMemoriesQuerySchema,
  RecallMemorySchema,
  AddTagsSchema,
  ErrorResponse,
} from '../types.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as memoryService from '../services/memoryService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('memory-routes');
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
// GET /api/memories/stats - Get memory statistics
// ============================================================================

router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    logger.info('get_memory_stats', { userId, tenantId });

    const stats = await memoryService.getMemoryStats(userId);

    res.json(createResponse(true, stats, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/memories/timeline - Get memory timeline
// ============================================================================

router.get(
  '/timeline',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    const limit = parseInt(req.query.limit as string) || 50;

    logger.info('get_memory_timeline', { userId, tenantId, limit });

    const timeline = await memoryService.getMemoryTimeline(userId, limit);

    res.json(createResponse(true, timeline, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/memories/search - Search memories
// ============================================================================

router.post(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    // Validate request body
    const parseResult = SearchMemoriesSchema.safeParse(req.body);
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

    logger.info('search_memories', { userId, tenantId, query: input.query });

    const memories = await memoryService.searchMemories(userId, input);

    res.json(createResponse(true, memories, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/memories - List memories
// ============================================================================

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    // Parse query parameters
    const queryResult = ListMemoriesQuerySchema.safeParse(req.query);
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

    logger.info('list_memories', { userId, tenantId, query });

    const result = await memoryService.listMemories(userId, query);

    res.json({
      success: true,
      data: result.memories,
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
// POST /api/memories - Create a new memory
// ============================================================================

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    // Validate request body
    const parseResult = CreateMemorySchema.safeParse(req.body);
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

    logger.info('create_memory', { userId, tenantId, category: input.category });

    const memory = await memoryService.createMemory(userId, input);

    res.status(201).json(createResponse(true, memory, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/memories/:id - Get a specific memory
// ============================================================================

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const memoryId = req.params.id;

    logger.info('get_memory', { userId, tenantId, memoryId });

    const memory = await memoryService.getMemoryById(memoryId, userId);

    if (!memory) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEMORY_NOT_FOUND',
          message: 'Memory not found',
        })
      );
      return;
    }

    res.json(createResponse(true, memory, undefined, { tenantId }));
  })
);

// ============================================================================
// PATCH /api/memories/:id - Update a memory
// ============================================================================

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const memoryId = req.params.id;

    // Validate request body
    const parseResult = UpdateMemorySchema.safeParse(req.body);
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

    logger.info('update_memory', { userId, tenantId, memoryId });

    const memory = await memoryService.updateMemory(memoryId, userId, input);

    if (!memory) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEMORY_NOT_FOUND',
          message: 'Memory not found',
        })
      );
      return;
    }

    res.json(createResponse(true, memory, undefined, { tenantId }));
  })
);

// ============================================================================
// DELETE /api/memories/:id - Delete a memory
// ============================================================================

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const memoryId = req.params.id;

    logger.info('delete_memory', { userId, tenantId, memoryId });

    const deleted = await memoryService.deleteMemory(memoryId, userId);

    if (!deleted) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEMORY_NOT_FOUND',
          message: 'Memory not found',
        })
      );
      return;
    }

    res.json(
      createResponse(true, {
        deleted: true,
        id: memoryId,
      }, undefined, { tenantId })
    );
  })
);

// ============================================================================
// POST /api/memories/recall - Recall memories
// ============================================================================

router.post(
  '/recall',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    // Validate request body
    const parseResult = RecallMemorySchema.safeParse(req.body);
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

    const { memory_ids } = parseResult.data;

    logger.info('recall_memories', { userId, tenantId, count: memory_ids.length });

    const memories = await memoryService.recallMemories(memory_ids, userId);

    res.json(createResponse(true, {
      recalled: memories.length,
      memories
    }, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/memories/:id/tags - Add tags to a memory
// ============================================================================

router.post(
  '/:id/tags',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const memoryId = req.params.id;

    // Validate request body
    const parseResult = AddTagsSchema.safeParse(req.body);
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

    const { tags } = parseResult.data;

    logger.info('add_tags', { userId, tenantId, memoryId, tags });

    const memory = await memoryService.addTags(memoryId, userId, tags);

    if (!memory) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEMORY_NOT_FOUND',
          message: 'Memory not found',
        })
      );
      return;
    }

    res.json(createResponse(true, memory, undefined, { tenantId }));
  })
);

// ============================================================================
// DELETE /api/memories/:id/tags - Remove tags from a memory
// ============================================================================

router.delete(
  '/:id/tags',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const memoryId = req.params.id;

    // Get tags from body
    const tags = req.body.tags as string[];
    if (!tags || !Array.isArray(tags)) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Tags array is required',
        })
      );
      return;
    }

    logger.info('remove_tags', { userId, tenantId, memoryId, tags });

    const memory = await memoryService.removeTags(memoryId, userId, tags);

    if (!memory) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEMORY_NOT_FOUND',
          message: 'Memory not found',
        })
      );
      return;
    }

    res.json(createResponse(true, memory, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/memories/:id/link - Link memories
// ============================================================================

router.post(
  '/:id/link',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const memoryId = req.params.id;

    const related_memory_ids = req.body.related_memory_ids as string[];
    if (!related_memory_ids || !Array.isArray(related_memory_ids)) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'related_memory_ids array is required',
        })
      );
      return;
    }

    logger.info('link_memories', { userId, tenantId, memoryId, relatedCount: related_memory_ids.length });

    const memory = await memoryService.linkMemories(memoryId, userId, related_memory_ids);

    if (!memory) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEMORY_NOT_FOUND',
          message: 'Memory not found',
        })
      );
      return;
    }

    res.json(createResponse(true, memory, undefined, { tenantId }));
  })
);

export default router;
