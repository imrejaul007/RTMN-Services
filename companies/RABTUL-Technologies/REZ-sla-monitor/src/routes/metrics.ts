import { Router, Request, Response, NextFunction } from 'express';
import { uptimeCalculator } from '../services/uptimeCalculator';
import { latencyAnalyzer } from '../services/latencyAnalyzer';

const router = Router();

/**
 * Get uptime for an SLA
 * GET /api/v1/metrics/uptime/:slaId
 */
router.get('/uptime/:slaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = uptimeCalculator.calculateSLA(req.params.slaId);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get latency stats for an SLA
 * GET /api/v1/metrics/latency/:slaId
 */
router.get('/latency/:slaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 60 * 60 * 1000); // Last hour
    const stats = latencyAnalyzer.analyze(req.params.slaId, startDate, endDate);
    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
