import { Router, Response } from 'express';
import { Twin } from '../models/Twin';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.post('/:twinId', async (req: AuthRequest, res: Response) => {
  try {
    const { sourceData, mergeStrategy = 'update' } = req.body;
    const twin = await Twin.findOne({ twinId: req.params.twinId, orgId: req.orgId, clientId: req.clientId });
    if (!twin) return res.status(404).json({ error: 'Twin not found' });
    twin.properties = mergeStrategy === 'deep' ? deepMerge(twin.properties, sourceData) : { ...twin.properties, ...sourceData };
    twin.lastSyncedAt = new Date();
    await twin.save();
    res.json({ twin, synced: true, syncedAt: twin.lastSyncedAt });
  } catch (error) { logger.error('Error syncing twin:', error); res.status(500).json({ error: 'Failed to sync twin' }); }
});

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else { result[key] = source[key]; }
  }
  return result;
}

export default router;
