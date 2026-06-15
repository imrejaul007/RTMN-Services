import { Router, Request, Response, NextFunction } from 'express';
import { metricsAggregator } from '../services/metricsAggregator';

const router = Router();

/**
 * Get strategy metrics
 * GET /api/v1/metrics/strategy/:strategyId
 */
router.get('/strategy/:strategyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await metricsAggregator.getStrategyMetrics(req.params.strategyId);
    res.json({ success: true, data: metrics, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get dashboard
 * GET /api/v1/metrics/dashboard
 */
router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dashboard = await metricsAggregator.getDashboard();
    res.json({ success: true, data: dashboard, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Invalidate cache
 * POST /api/v1/metrics/invalidate
 */
router.post('/invalidate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    metricsAggregator.invalidateCache(req.body.strategyId);
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
