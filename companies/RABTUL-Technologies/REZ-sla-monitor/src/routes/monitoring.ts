import { Router, Request, Response, NextFunction } from 'express';
import { metricsCollector } from '../services/metricsCollector';
import { thresholdChecker } from '../services/thresholdChecker';
import { alertManager } from '../services/alertManager';
import { slaService } from '../services/slaService';
import { ValidationError } from '../utils/errors';

const router = Router();

/**
 * Record a measurement
 * POST /api/v1/monitoring/measurement
 */
router.post('/measurement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slaId, metric, value, unit, source, notes } = req.body;
    if (!slaId) throw new ValidationError('slaId is required');
    if (!metric) throw new ValidationError('metric is required');
    if (typeof value !== 'number') throw new ValidationError('value must be a number');
    if (!unit) throw new ValidationError('unit is required');
    const measurement = metricsCollector.record(slaId, metric, value, unit, source, notes);
    res.status(201).json({ success: true, data: measurement, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Check SLA compliance
 * POST /api/v1/monitoring/check/:slaId
 */
router.post('/check/:slaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = thresholdChecker.checkSLA(req.params.slaId);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Check all SLAs and trigger alerts
 * POST /api/v1/monitoring/check-all
 */
router.post('/check-all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const slas = slaService.getAll();
    const results: any[] = [];
    for (const sla of slas) {
      const result = thresholdChecker.checkSLA(sla.id);
      const alerts = alertManager.checkAndAlert(sla.id);
      results.push({ slaId: sla.id, name: sla.name, ...result, alertsTriggered: alerts.length });
    }
    res.json({ success: true, data: results, count: results.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get measurements for an SLA
 * GET /api/v1/monitoring/measurements/:slaId
 */
router.get('/measurements/:slaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const measurements = metricsCollector.getForSLA(req.params.slaId, limit);
    res.json({ success: true, data: measurements, count: measurements.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get active alerts
 * GET /api/v1/monitoring/alerts
 */
router.get('/alerts', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = alertManager.getActive();
    res.json({ success: true, data: alerts, count: alerts.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Resolve alert
 * POST /api/v1/monitoring/alerts/:id/resolve
 */
router.post('/alerts/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const success = alertManager.resolve(req.params.id);
    if (!success) throw new ValidationError('Alert not found');
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Register alert handler
 * POST /api/v1/monitoring/alerts/handler
 */
router.post('/alerts/handler', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { severity, callbackUrl } = req.body;
    if (!severity || !callbackUrl) throw new ValidationError('severity and callbackUrl required');
    alertManager.registerHandler(severity, (alert) => {
      // In real impl, HTTP POST to callbackUrl
      console.log(`[Alert Handler] ${severity}: ${alert.description}`);
    });
    res.status(201).json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get alert stats
 * GET /api/v1/monitoring/alerts/stats
 */
router.get('/alerts/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: alertManager.getStats(), timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
