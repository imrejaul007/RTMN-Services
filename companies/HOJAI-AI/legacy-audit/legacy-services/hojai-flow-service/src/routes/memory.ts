/**
 * Memory Routes - Wired to MemoryTierService
 *
 * Provides:
 * - L1-L5 memory tiers
 * - Context assembly
 * - Predictive prefetching
 */

import { Router, Request, Response } from 'express';
import { MemoryTierService, Memory } from '../services/memoryTierService.js';

const router = Router();
const memoryService = new MemoryTierService();

/**
 * POST /api/memory/tier
 * Store in tier
 */
router.post('/tier', async (req: Request, res: Response) => {
  try {
    const { userId, tier, content, type, importance } = req.body;

    if (!userId || !tier || !content) {
      return res.status(400).json({ success: false, error: 'userId, tier, content required' });
    }

    const memory = await memoryService.store(userId, tier, { content, type, importance });

    res.status(201).json({ success: true, data: memory });
  } catch (error) {
    console.error('[Memory] Store error:', error);
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

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const tierList = tiers
      ? (tiers as string).split(',')
      : ['L1', 'L2', 'L3', 'L4', 'L5'];

    const memories = await memoryService.retrieve(
      userId as string,
      tierList,
      query as string
    );

    res.json({ success: true, data: memories });
  } catch (error) {
    console.error('[Memory] Retrieve error:', error);
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

    if (!userId || !q) {
      return res.status(400).json({ success: false, error: 'userId and q required' });
    }

    const results = await memoryService.search(userId as string, q as string);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[Memory] Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

/**
 * GET /api/memory/context
 * Get full context for AI
 */
router.get('/context', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const context = await memoryService.getContext(userId as string);

    res.json({ success: true, data: { context } });
  } catch (error) {
    console.error('[Memory] Context error:', error);
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

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const stats = await memoryService.stats(userId as string);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Memory] Stats error:', error);
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

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    await memoryService.clear(userId, tier);

    res.json({ success: true, message: 'Memory cleared' });
  } catch (error) {
    console.error('[Memory] Clear error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear' });
  }
});

/**
 * POST /api/memory/learn
 * Learn from interaction
 */
router.post('/learn', async (req: Request, res: Response) => {
  try {
    const { userId, content, type } = req.body;

    // Auto-determine tier based on type
    let tier = 'L2'; // Default to L2 (recent)
    if (type === 'conversation') tier = 'L1';
    if (type === 'preference' || type === 'style') tier = 'L3';
    if (type === 'policy' || type === 'product') tier = 'L4';

    const memory = await memoryService.store(userId, tier, { content, type });

    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('[Memory] Learn error:', error);
    res.status(500).json({ success: false, error: 'Failed to learn' });
  }
});

export default router;
