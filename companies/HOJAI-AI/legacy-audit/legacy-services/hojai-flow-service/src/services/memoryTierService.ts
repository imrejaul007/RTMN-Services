/**
 * Memory Tier Service - L1-L5 Memory Implementation
 *
 * Philosophy: Never start with the LLM
 * Question → Memory → Knowledge → LLM (if needed)
 *
 * Memory is faster than intelligence.
 */

import mongoose from 'mongoose';

// ============================================================================
// MEMORY TIER SCHEMA
// ============================================================================

const MemorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },

  // Memory tier
  tier: {
    type: String,
    enum: ['L1', 'L2', 'L3', 'L4', 'L5'],
    required: true,
  },

  // Content
  content: { type: String, required: true },
  summary: String,

  // Type
  type: {
    type: String,
    enum: [
      'conversation',    // Current chat
      'contact',         // Person
      'project',        // Work item
      'decision',       // Choice made
      'preference',      // User preference
      'style',          // Writing style
      'policy',         // Business rule
      'product',         // Product info
      'script',          // Sales/support script
      'knowledge',       // General knowledge
    ],
    required: true,
  },

  // Importance (1-10)
  importance: { type: Number, default: 5 },

  // Access tracking
  accessCount: { type: Number, default: 0 },
  lastAccessedAt: Date,

  // Source
  source: {
    type: String,
    enum: ['conversation', 'document', 'action', 'inferred'],
  },

  // Connections (graph)
  connections: [{
    memoryId: String,
    strength: Number, // 1-10
    type: String, // related, caused, mentioned
  }],

  // TTL (auto-delete)
  expiresAt: Date,

  // Metadata
  metadata: mongoose.Schema.Types.Mixed,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexes
MemorySchema.index({ userId: 1, tier: 1 });
MemorySchema.index({ userId: 1, type: 1 });
MemorySchema.index({ userId: 1, expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Memory = mongoose.model('Memory', MemorySchema);

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

const TIER_CONFIG = {
  L1: {
    name: 'Hot Memory',
    ttl: 5 * 60 * 1000, // 5 minutes
    maxItems: 20,
    latency: '1-10ms',
    purpose: 'Current conversation, instant responses',
  },
  L2: {
    name: 'Warm Memory',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxItems: 100,
    latency: '10-50ms',
    purpose: 'Recent meetings, chats, work',
  },
  L3: {
    name: 'Personal Memory',
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxItems: 500,
    latency: '50-200ms',
    purpose: 'Preferences, history, style',
  },
  L4: {
    name: 'Business Memory',
    ttl: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxItems: 1000,
    latency: '200-500ms',
    purpose: 'CRM, policies, products, merchants',
  },
  L5: {
    name: 'Intelligence',
    ttl: -1, // Never expires
    maxItems: -1, // Unlimited
    latency: '500ms+',
    purpose: 'Complex reasoning, planning, orchestration',
  },
};

// ============================================================================
// TIER SERVICE
// ============================================================================

export class MemoryTierService {

  /**
   * Store memory in appropriate tier
   */
  async store(userId: string, tier: string, data: {
    content: string;
    type: string;
    importance?: number;
    connections?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<Memory> {
    const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];

    const memory = await Memory.create({
      userId,
      tier,
      content: data.content,
      type: data.type,
      importance: data.importance || 5,
      connections: data.connections || [],
      metadata: data.metadata,
      expiresAt: config.ttl > 0 ? new Date(Date.now() + config.ttl) : null,
    });

    // Prune if over limit
    await this.prune(userId, tier, config.maxItems);

    return memory;
  }

  /**
   * Retrieve from tier
   */
  async retrieve(
    userId: string,
    tiers: string[],
    query?: string
  ): Promise<Memory[]> {
    const filter: Record<string, unknown> = { userId, tier: { $in: tiers } };

    let results = await Memory.find(filter)
      .sort({ importance: -1, lastAccessedAt: -1 })
      .limit(50);

    // Text search if query provided
    if (query) {
      results = results.filter(m =>
        m.content.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Update access
    await Memory.updateMany(
      { _id: { $in: results.map(r => r._id) } },
      {
        $inc: { accessCount: 1 },
        $set: { lastAccessedAt: new Date() },
      }
    );

    return results;
  }

  /**
   * Search all tiers
   */
  async search(userId: string, query: string): Promise<{
    L1?: Memory[];
    L2?: Memory[];
    L3?: Memory[];
    L4?: Memory[];
    L5?: Memory[];
  }> {
    const results: Record<string, Memory[]> = {};

    for (const tier of ['L1', 'L2', 'L3', 'L4', 'L5']) {
      const tierResults = await this.retrieve(userId, [tier], query);
      if (tierResults.length > 0) {
        results[tier] = tierResults;
      }
    }

    return results as any;
  }

  /**
   * Get context (all tiers)
   */
  async getContext(userId: string): Promise<string> {
    const recent = await this.retrieve(userId, ['L1', 'L2'], '', '', 10);
    const personal = await this.retrieve(userId, ['L3'], '', '', 5);

    const contextParts: string[] = [];

    if (recent.length > 0) {
      contextParts.push('=== Recent ===');
      recent.forEach(m => contextParts.push(`- ${m.content}`));
    }

    if (personal.length > 0) {
      contextParts.push('\n=== Preferences ===');
      personal.forEach(m => contextParts.push(`- ${m.content}`));
    }

    return contextParts.join('\n');
  }

  /**
   * Prune tier to max items
   */
  private async prune(userId: string, tier: string, maxItems: number): Promise<void> {
    if (maxItems < 0) return; // No limit

    const count = await Memory.countDocuments({ userId, tier });

    if (count > maxItems) {
      // Delete oldest, lowest importance items
      const toDelete = await Memory.find({ userId, tier })
        .sort({ importance: 1, lastAccessedAt: 1 })
        .limit(count - maxItems);

      await Memory.deleteMany({
        _id: { $in: toDelete.map(d => d._id) }
      });
    }
  }

  /**
   * Clear tier
   */
  async clear(userId: string, tier?: string): Promise<void> {
    const filter: Record<string, unknown> = { userId };
    if (tier) filter.tier = tier;

    await Memory.deleteMany(filter);
  }

  /**
   * Get tier stats
   */
  async stats(userId: string): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    for (const tier of ['L1', 'L2', 'L3', 'L4', 'L5']) {
      stats[tier] = await Memory.countDocuments({ userId, tier });
    }

    return stats;
  }
}

export const memoryTierService = new MemoryTierService();

// ============================================================================
// ROUTES
// ============================================================================

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * POST /api/memory/tier
 * Store in tier
 */
router.post('/tier', async (req: Request, res: Response) => {
  try {
    const { userId, tier, content, type, importance } = req.body;

    const memory = await memoryTierService.store(userId, tier, { content, type, importance });

    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('[MemoryTier] Store error:', error);
    res.status(500).json({ success: false, error: 'Failed to store memory' });
  }
});

/**
 * GET /api/memory/retrieve
 * Retrieve from tiers
 */
router.get('/retrieve', async (req: Request, res: Response) => {
  try {
    const { userId, tiers, query } = req.query;

    const memories = await memoryTierService.retrieve(
      userId as string,
      (tiers as string).split(','),
      query as string
    );

    res.json({ success: true, data: memories });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve' });
  }
});

/**
 * GET /api/memory/search
 * Search all tiers
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { userId, q } = req.query;

    const results = await memoryTierService.search(userId as string, q as string);

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

/**
 * GET /api/memory/context
 * Get full context
 */
router.get('/context', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    const context = await memoryTierService.getContext(userId as string);

    res.json({ success: true, data: { context } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get context' });
  }
});

/**
 * GET /api/memory/stats
 * Get tier stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    const stats = await memoryTierService.stats(userId as string);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

/**
 * DELETE /api/memory/clear
 * Clear tier(s)
 */
router.delete('/clear', async (req: Request, res: Response) => {
  try {
    const { userId, tier } = req.body;

    await memoryTierService.clear(userId, tier);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to clear' });
  }
});

export default router;
