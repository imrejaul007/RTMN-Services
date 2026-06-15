import { Router, Request, Response, NextFunction } from 'express';
import { detectionEngine, MonitoringData } from '../services/detectionEngine';
import { breachService } from '../services/breachService';
import { eventBus } from '../utils/eventBus';
import { ValidationError } from '../utils/errors';

const router = Router();

/**
 * Analyze monitoring data and detect breaches
 * POST /api/v1/detection/analyze
 */
router.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: MonitoringData = req.body;
    if (!data.slaId) throw new ValidationError('slaId required');
    if (!data.metric) throw new ValidationError('metric required');
    if (typeof data.value !== 'number') throw new ValidationError('value must be number');
    if (typeof data.threshold !== 'number') throw new ValidationError('threshold must be number');
    if (!data.comparator) throw new ValidationError('comparator required');
    if (!data.serviceId) throw new ValidationError('serviceId required');

    const breaches = detectionEngine.analyze(data);
    res.json({ success: true, data: breaches, count: breaches.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Detect and remediate in one call
 * POST /api/v1/detection/analyze-and-remediate
 */
router.post('/analyze-and-remediate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: MonitoringData = req.body;
    if (!data.slaId) throw new ValidationError('slaId required');
    const breaches = detectionEngine.analyze(data);
    const { remediationEngine } = await import('../services/remediationEngine');
    const remediations = await Promise.all(breaches.map(b => remediationEngine.remediate(b.id, 'auto')));
    res.json({ success: true, data: { breaches, remediations }, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Stream detection events
 * GET /api/v1/detection/stream
 */
router.get('/stream', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ event: 'connected', timestamp: new Date().toISOString() })}\n\n`);
    const interval = setInterval(() => { res.write(`data: ${JSON.stringify({ event: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`); }, 30000);
    req.on('close', () => { clearInterval(interval); });
  } catch (error) { next(error); }
});

export default router;
