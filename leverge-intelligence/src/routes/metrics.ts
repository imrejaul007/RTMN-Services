import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.get('/business', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      revenue: { value: 284567, previous: 253214, change: 12.4, trend: 'up' },
      orders: { value: 4521, previous: 4628, change: -2.3, trend: 'down' },
      customers: { value: 3421, previous: 3156, change: 8.4, trend: 'up' },
      avgOrderValue: { value: 63.0, previous: 54.7, change: 15.2, trend: 'up' }
    });
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

router.get('/performance', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      api: { requests: 125000, avgResponseTime: 145, errorRate: 0.5 },
      database: { queries: 850000, avgQueryTime: 12, connections: 85 },
      cache: { hits: 520000, misses: 23000, hitRate: 95.8 }
    });
  } catch (error) {
    logger.error('Error fetching performance:', error);
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

export default router;
