import { Router, Response } from 'express';
import { MemoryEntry } from '../models/MemoryEntry';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const memory = new MemoryEntry({ ...req.body, userId: req.userId, orgId: req.orgId, clientId: req.clientId });
    await memory.save();
    res.status(201).json(memory);
  } catch (error) { logger.error('Error storing memory:', error); res.status(500).json({ error: 'Failed to store memory' }); }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, tags, search, limit = 50, offset = 0 } = req.query;
    const filter: any = { orgId: req.orgId, clientId: req.clientId, userId: req.userId };
    if (type) filter.type = type;
    if (tags) filter.tags = { $in: (tags as string).split(',') };
    if (search) filter.content = { $regex: search, $options: 'i' };
    const memories = await MemoryEntry.find(filter).sort({ importance: -1, createdAt: -1 }).skip(Number(offset)).limit(Number(limit));
    const total = await MemoryEntry.countDocuments(filter);
    res.json({ memories, total, offset, limit });
  } catch (error) { logger.error('Error fetching memories:', error); res.status(500).json({ error: 'Failed to fetch memories' }); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const memory = await MemoryEntry.findOne({ _id: req.params.id, orgId: req.orgId, clientId: req.clientId, userId: req.userId });
    if (!memory) return res.status(404).json({ error: 'Memory not found' });
    res.json(memory);
  } catch (error) { logger.error('Error fetching memory:', error); res.status(500).json({ error: 'Failed to fetch memory' }); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const memory = await MemoryEntry.findOneAndUpdate({ _id: req.params.id, orgId: req.orgId, clientId: req.clientId, userId: req.userId }, { $set: req.body }, { new: true });
    if (!memory) return res.status(404).json({ error: 'Memory not found' });
    res.json(memory);
  } catch (error) { logger.error('Error updating memory:', error); res.status(500).json({ error: 'Failed to update memory' }); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const memory = await MemoryEntry.findOneAndDelete({ _id: req.params.id, orgId: req.orgId, clientId: req.clientId, userId: req.userId });
    if (!memory) return res.status(404).json({ error: 'Memory not found' });
    res.json({ message: 'Memory deleted' });
  } catch (error) { logger.error('Error deleting memory:', error); res.status(500).json({ error: 'Failed to delete memory' }); }
});

export default router;
