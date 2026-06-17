import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Twin } from '../models/Twin';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const twin = new Twin({ twinId: uuidv4(), ...req.body, orgId: req.orgId, clientId: req.clientId, ownerId: req.userId });
    await twin.save();
    res.status(201).json(twin);
  } catch (error) { logger.error('Error creating twin:', error); res.status(500).json({ error: 'Failed to create twin' }); }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, ownerId, limit = 50, offset = 0 } = req.query;
    const filter: any = { orgId: req.orgId, clientId: req.clientId };
    if (type) filter.type = type;
    if (ownerId) filter.ownerId = ownerId;
    const twins = await Twin.find(filter).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit));
    const total = await Twin.countDocuments(filter);
    res.json({ twins, total, offset, limit });
  } catch (error) { logger.error('Error listing twins:', error); res.status(500).json({ error: 'Failed to list twins' }); }
});

router.get('/:twinId', async (req: AuthRequest, res: Response) => {
  try {
    const twin = await Twin.findOne({ twinId: req.params.twinId, orgId: req.orgId, clientId: req.clientId });
    if (!twin) return res.status(404).json({ error: 'Twin not found' });
    res.json(twin);
  } catch (error) { logger.error('Error fetching twin:', error); res.status(500).json({ error: 'Failed to fetch twin' }); }
});

router.put('/:twinId', async (req: AuthRequest, res: Response) => {
  try {
    const twin = await Twin.findOneAndUpdate({ twinId: req.params.twinId, orgId: req.orgId, clientId: req.clientId }, { $set: { ...req.body, lastSyncedAt: new Date() } }, { new: true });
    if (!twin) return res.status(404).json({ error: 'Twin not found' });
    res.json(twin);
  } catch (error) { logger.error('Error updating twin:', error); res.status(500).json({ error: 'Failed to update twin' }); }
});

router.patch('/:twinId/state', async (req: AuthRequest, res: Response) => {
  try {
    const twin = await Twin.findOneAndUpdate({ twinId: req.params.twinId, orgId: req.orgId, clientId: req.clientId }, { $set: { state: req.body, lastSyncedAt: new Date() } }, { new: true });
    if (!twin) return res.status(404).json({ error: 'Twin not found' });
    res.json(twin);
  } catch (error) { logger.error('Error updating state:', error); res.status(500).json({ error: 'Failed to update state' }); }
});

router.delete('/:twinId', async (req: AuthRequest, res: Response) => {
  try {
    const twin = await Twin.findOneAndDelete({ twinId: req.params.twinId, orgId: req.orgId, clientId: req.clientId });
    if (!twin) return res.status(404).json({ error: 'Twin not found' });
    res.json({ message: 'Twin deleted' });
  } catch (error) { logger.error('Error deleting twin:', error); res.status(500).json({ error: 'Failed to delete twin' }); }
});

export default router;
