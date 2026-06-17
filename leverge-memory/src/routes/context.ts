import { Router, Response } from 'express';
import { MemoryEntry } from '../models/MemoryEntry';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.post('/build', async (req: AuthRequest, res: Response) => {
  try {
    const { query, limit = 10, types } = req.query;
    const filter: any = { orgId: req.orgId, clientId: req.clientId, userId: req.userId };
    if (types) filter.type = { $in: (types as string).split(',') };
    const memories = await MemoryEntry.find(filter).sort({ importance: -1, createdAt: -1 }).limit(Number(limit));
    res.json({ query, memories: memories.map(m => ({ type: m.type, content: m.content, importance: m.importance })), summary: `Found ${memories.length} relevant memories` });
  } catch (error) { logger.error('Error building context:', error); res.status(500).json({ error: 'Failed to build context' }); }
});

export default router;
