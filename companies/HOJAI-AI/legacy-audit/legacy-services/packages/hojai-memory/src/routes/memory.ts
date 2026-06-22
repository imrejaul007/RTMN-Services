import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { memoryService } from '../services/memoryService.js';
import { MemoryType, MemoryTier, MEMORY_TIER_CONFIG } from '../types/index.js';

const router = express.Router();

// ============================================================================
// MEMORY SCHEMAS
// ============================================================================

const StoreMemorySchema = z.object({
  userId: z.string(),
  entityType: z.enum(['user', 'merchant', 'product', 'session']),
  entityId: z.string(),
  type: z.nativeEnum(MemoryType),
  content: z.string(),
  data: z.record(z.any()).optional(),
  importance: z.number().min(0).max(10).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
  context: z.object({
    channel: z.string().optional(),
    location: z.string().optional(),
    time: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional(),
  validUntil: z.string().datetime().optional()
});

// ============================================================================
// MEMORY ROUTES
// ============================================================================

/**
 * POST /api/memories
 * Store a new memory
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const validated = StoreMemorySchema.parse(req.body);
    const memory = await memoryService.storeMemory(tenantId, validated);

    res.status(201).json({ success: true, data: memory });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    next(error);
  }
});

/**
 * GET /api/memories
 * Get memories for a user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId, type, limit, offset, since } = req.query;

    if (!userId) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }

    const result = await memoryService.getMemories({
      tenantId,
      userId: userId as string,
      type: type as MemoryType,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      since: since ? new Date(since as string) : undefined
    });

    res.json({
      success: true,
      data: result.memories,
      pagination: { total: result.total }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/memories/search
 * Search memories by content
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId, q, limit } = req.query;

    if (!userId || !q) {
      res.status(400).json({ success: false, error: 'userId and q required' });
      return;
    }

    const memories = await memoryService.searchMemories({
      tenantId,
      userId: userId as string,
      query: q as string,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({ success: true, data: memories });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/memories/:id
 * Delete a memory
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    await memoryService.deleteMemory(tenantId, req.params.id);
    res.json({ success: true, message: 'Memory deleted' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// TIMELINE ROUTES
// ============================================================================

const TimelineEventSchema = z.object({
  userId: z.string(),
  type: z.string(),
  category: z.string(),
  timestamp: z.string().datetime().optional(),
  title: z.string(),
  description: z.string().optional(),
  data: z.record(z.any()).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  impact: z.enum(['positive', 'negative', 'neutral']).optional(),
  value: z.number().optional()
});

router.post('/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const validated = TimelineEventSchema.parse(req.body);
    const event = await memoryService.addToTimeline(tenantId, {
      ...validated,
      timestamp: validated.timestamp ? new Date(validated.timestamp) : new Date()
    });

    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    next(error);
  }
});

router.get('/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId, types, startDate, endDate, limit, offset } = req.query;

    const result = await memoryService.getTimeline({
      tenantId,
      userId: userId as string,
      types: types ? (types as string).split(',') : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({
      success: true,
      data: result.events,
      pagination: { total: result.total }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// MEMORY TIER ROUTES (Hojai Flow Architecture)
// ============================================================================

/**
 * GET /api/memories/tiers
 * Get all available memory tiers
 */
router.get('/tiers', async (req: Request, res: Response) => {
  const tiers = Object.entries(MEMORY_TIER_CONFIG).map(([key, config]) => ({
    tier: key,
    name: config.name,
    description: config.description,
    priority: config.priority,
    storage: config.storage,
    ttl: config.ttl,
    maxItems: config.maxItems
  }));

  res.json({ success: true, data: tiers });
});

/**
 * GET /api/memories/by-tier/:tier
 * Get memories from a specific tier
 */
router.get('/by-tier/:tier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { tier } = req.params;
    if (!Object.values(MemoryTier).includes(tier as MemoryTier)) {
      res.status(400).json({
        success: false,
        error: 'Invalid tier',
        validTiers: Object.values(MemoryTier)
      });
      return;
    }

    const { userId, entityId, limit } = req.query;

    if (!userId) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }

    const memories = await memoryService.getMemoriesByTier({
      tenantId,
      userId: userId as string,
      entityId: entityId as string,
      tier: tier as MemoryTier,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({ success: true, data: memories, tier });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/memories/context
 * Get full context from all tiers (L1 → L5 priority)
 * This implements Hojai Flow's "Memory Before Models" principle
 */
router.get('/context', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId, entityId, tiers, maxItemsPerTier } = req.query;

    if (!userId) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }

    const includeTiers = tiers
      ? (tiers as string).split(',').filter(t => Object.values(MemoryTier).includes(t as MemoryTier)) as MemoryTier[]
      : undefined;

    const result = await memoryService.getFullContext({
      tenantId,
      userId: userId as string,
      entityId: entityId as string,
      includeTiers,
      maxItemsPerTier: maxItemsPerTier ? parseInt(maxItemsPerTier as string) : undefined
    });

    res.json({
      success: true,
      data: result,
      priority: 'L1 → L2 → L3 → L4 → L5 (local-first)'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/memories/by-tier
 * Store memory with automatic tier classification
 */
router.post('/by-tier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId, entityId, entityType, type, content, data, tier, importance, confidence, source } = req.body;

    if (!userId || !entityId || !entityType || !type || !content) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, entityId, entityType, type, content'
      });
      return;
    }

    // Auto-assign tier if not provided
    const assignedTier = tier || memoryService.classifyToTier({ type, content, data, source });

    const memory = await memoryService.storeMemoryWithTier({
      tenantId,
      userId,
      entityId,
      entityType,
      type,
      content,
      data,
      tier: assignedTier,
      importance,
      confidence
    });

    res.status(201).json({
      success: true,
      data: memory,
      assignedTier
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/memories/classify-tier
 * Classify content to appropriate tier without storing
 */
router.post('/classify-tier', async (req: Request, res: Response) => {
  const { type, content, data, source } = req.body;

  if (!type || !content) {
    res.status(400).json({ success: false, error: 'type and content required' });
    return;
  }

  const tier = memoryService.classifyToTier({ type, content, data, source });

  res.json({
    success: true,
    data: {
      tier,
      name: MEMORY_TIER_CONFIG[tier].name,
      description: MEMORY_TIER_CONFIG[tier].description,
      priority: MEMORY_TIER_CONFIG[tier].priority
    }
  });
});

/**
 * POST /api/memories/evict
 * Evict expired memories
 */
router.post('/evict', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }

    const evicted = await memoryService.evictExpiredMemories(tenantId, userId);

    res.json({ success: true, evicted });
  } catch (error) {
    next(error);
  }
});

export default router;
