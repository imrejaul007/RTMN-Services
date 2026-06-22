/**
 * Memory Tier Routes - Hojai Flow Architecture
 * Implements L1-L5 memory tiering with local-first priority
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
import { MemoryTier, MEMORY_TIER_CONFIG } from '../types/index.js';

const router = express.Router();

// ============================================================================
// MODELS (local to avoid import issues)
// ============================================================================

const MemoryTierSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  entityType: { type: String, enum: ['user', 'merchant', 'product', 'session'], required: true },
  entityId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  tier: { type: String, enum: Object.values(MemoryTier), default: MemoryTier.L4_SEMANTIC },
  content: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  importance: { type: Number, default: 5 },
  confidence: { type: Number, default: 0.7 },
  source: String,
  eventId: String,
  context: {
    channel: String,
    location: String,
    time: String,
    tags: [String]
  },
  validFrom: Date,
  validUntil: Date,
  isPrivate: Boolean,
  sharedWith: [String],
  lastAccessedAt: Date,
  accessCount: { type: Number, default: 0 }
}, { timestamps: true });

MemoryTierSchema.index({ tenantId: 1, userId: 1, tier: 1 });

const MemoryTierModel = mongoose.models.MemoryTier || mongoose.model('MemoryTier', MemoryTierSchema);

// ============================================================================
// SCHEMAS
// ============================================================================

const StoreMemoryWithTierSchema = z.object({
  userId: z.string(),
  entityId: z.string(),
  entityType: z.enum(['user', 'merchant', 'product', 'session']),
  type: z.string(),
  content: z.string(),
  data: z.record(z.any()).optional(),
  tier: z.nativeEnum(MemoryTier).optional(),
  importance: z.number().min(0).max(10).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().optional()
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Classify content to appropriate tier
 */
function classifyToTier(params: {
  type: string;
  content: string;
  data?: Record<string, unknown>;
  source?: string;
}): MemoryTier {
  const { type, content, data } = params;

  // L1: Working memory - current conversation, session context
  if (type === 'conversation' || data?.sessionId) {
    return MemoryTier.L1_WORKING;
  }

  // L2: Episodic memory - recent events, interactions
  if (type === 'interaction' || type === 'context') {
    return MemoryTier.L2_EPISODIC;
  }

  // L3: Procedural memory - instructions, how-tos, behaviors
  if (type === 'behavior' || content.toLowerCase().includes('how to') || content.toLowerCase().includes('instruction')) {
    return MemoryTier.L3_PROCEDURAL;
  }

  // L5: World knowledge - facts, external information
  if (content.startsWith('Fact:') || data?.source === 'external') {
    return MemoryTier.L5_WORLD;
  }

  // L4: Semantic memory - preferences, facts (default)
  return MemoryTier.L4_SEMANTIC;
}

/**
 * Build context string from memories
 */
function buildContextString(memories: Array<{ tier: string; content: string }>): string {
  const byTier: Record<string, string[]> = {};

  for (const m of memories) {
    if (!byTier[m.tier]) byTier[m.tier] = [];
    byTier[m.tier].push(m.content);
  }

  const parts: string[] = [];
  for (const tier of Object.values(MemoryTier)) {
    const config = MEMORY_TIER_CONFIG[tier];
    const contents = byTier[tier];
    if (!contents || contents.length === 0) continue;

    parts.push(`\n=== ${config.name} (${tier}) ===`);
    parts.push(`Relevance: ${config.description}`);

    for (const content of contents.slice(0, 10)) {
      parts.push(`- ${content}`);
    }
  }

  return parts.join('\n');
}

// ============================================================================
// ROUTES
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

    const filter: Record<string, unknown> = {
      tenantId,
      userId: userId as string,
      tier
    };

    if (entityId) {
      filter.entityId = entityId;
    }

    const memories = await MemoryTierModel.find(filter)
      .sort({ importance: -1, createdAt: -1 })
      .limit(limit ? parseInt(limit as string) : MEMORY_TIER_CONFIG[tier as MemoryTier].maxItems);

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
      : Object.values(MemoryTier);

    const byTier: Partial<Record<MemoryTier, unknown[]>> = {};
    const allMemories: unknown[] = [];

    // Fetch from each tier in priority order (L1 first)
    for (const tier of includeTiers.sort((a, b) =>
      MEMORY_TIER_CONFIG[a].priority - MEMORY_TIER_CONFIG[b].priority
    )) {
      const filter: Record<string, unknown> = { tenantId, userId: userId as string, tier };
      if (entityId) filter.entityId = entityId;

      const memories = await MemoryTierModel.find(filter)
        .sort({ importance: -1, createdAt: -1 })
        .limit(maxItemsPerTier ? parseInt(maxItemsPerTier as string) : MEMORY_TIER_CONFIG[tier].maxItems);

      byTier[tier] = memories;
      allMemories.push(...memories);
    }

    const context = buildContextString(allMemories as Array<{ tier: string; content: string }>);

    res.json({
      success: true,
      data: {
        memories: allMemories,
        byTier,
        context
      },
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

    const validated = StoreMemoryWithTierSchema.parse(req.body);

    // Auto-assign tier if not provided
    const assignedTier = validated.tier || classifyToTier({
      type: validated.type,
      content: validated.content,
      data: validated.data,
      source: validated.source
    });

    const memory = await MemoryTierModel.create({
      id: uuid(),
      tenantId,
      userId: validated.userId,
      entityId: validated.entityId,
      entityType: validated.entityType,
      type: validated.type,
      tier: assignedTier,
      content: validated.content,
      data: validated.data,
      importance: validated.importance ?? 5,
      confidence: validated.confidence ?? 0.7,
      source: validated.source,
      isPrivate: false
    });

    res.status(201).json({
      success: true,
      data: memory,
      assignedTier
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
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

  const tier = classifyToTier({ type, content, data, source });

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

    let evicted = 0;

    for (const tier of Object.values(MemoryTier)) {
      const config = MEMORY_TIER_CONFIG[tier];
      if (config.ttl <= 0) continue; // Never expire

      const cutoff = new Date(Date.now() - config.ttl);

      const result = await MemoryTierModel.deleteMany({
        tenantId,
        userId,
        tier,
        createdAt: { $lt: cutoff }
      });

      evicted += result.deletedCount;
    }

    res.json({ success: true, evicted });
  } catch (error) {
    next(error);
  }
});

export default router;
