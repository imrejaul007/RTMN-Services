import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Insight } from '../models/Insight';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, severity, category, limit = 50, offset = 0 } = req.query;
    const filter: any = { orgId: req.orgId, clientId: req.clientId };
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (category) filter.category = category;

    const insights = await Insight.find(filter).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit));
    const total = await Insight.countDocuments(filter);
    res.json({ insights, total, offset, limit });
  } catch (error) {
    logger.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const insight = await Insight.findOne({ _id: req.params.id, orgId: req.orgId, clientId: req.clientId });
    if (!insight) return res.status(404).json({ error: 'Insight not found' });
    res.json(insight);
  } catch (error) {
    logger.error('Error fetching insight:', error);
    res.status(500).json({ error: 'Failed to fetch insight' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const insight = new Insight({ ...req.body, orgId: req.orgId, clientId: req.clientId });
    await insight.save();
    res.status(201).json(insight);
  } catch (error) {
    logger.error('Error creating insight:', error);
    res.status(500).json({ error: 'Failed to create insight' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const insight = await Insight.findOneAndUpdate({ _id: req.params.id, orgId: req.orgId, clientId: req.clientId }, { $set: req.body }, { new: true });
    if (!insight) return res.status(404).json({ error: 'Insight not found' });
    res.json(insight);
  } catch (error) {
    logger.error('Error updating insight:', error);
    res.status(500).json({ error: 'Failed to update insight' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const insight = await Insight.findOneAndDelete({ _id: req.params.id, orgId: req.orgId, clientId: req.clientId });
    if (!insight) return res.status(404).json({ error: 'Insight not found' });
    res.json({ message: 'Insight deleted' });
  } catch (error) {
    logger.error('Error deleting insight:', error);
    res.status(500).json({ error: 'Failed to delete insight' });
  }
});

export default router;
