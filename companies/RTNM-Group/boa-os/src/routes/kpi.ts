// ============================================================================
// KPI Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { kpiTrackerService, KPI } from '../services/kpiTracker';
import { ValidationError } from '../utils/errors';
import { eventBus } from '../utils/eventBus';

const router = Router();

/**
 * Create KPI
 * POST /api/v1/kpi
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.name) throw new ValidationError('name is required');
    if (!req.body.owner) throw new ValidationError('owner is required');
    if (typeof req.body.targetValue !== 'number') throw new ValidationError('targetValue must be a number');
    if (typeof req.body.baseline !== 'number') throw new ValidationError('baseline must be a number');
    const kpi = kpiTrackerService.createKPI(req.body);
    await eventBus.publish('boa.kpi.created', { kpiId: kpi.id, name: kpi.name });
    res.status(201).json({ success: true, data: kpi, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get KPI
 * GET /api/v1/kpi/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const kpi = kpiTrackerService.getKPI(req.params.id);
    res.json({ success: true, data: kpi, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * List KPIs
 * GET /api/v1/kpi
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, status, objectiveId } = req.query;
    const kpis = kpiTrackerService.getAllKPIs({ owner, status, objectiveId } as any);
    res.json({ success: true, data: kpis, count: kpis.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Record measurement
 * POST /api/v1/kpi/:id/measurement
 */
router.post('/:id/measurement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, source, notes } = req.body;
    if (typeof value !== 'number') throw new ValidationError('value must be a number');
    const measurement = kpiTrackerService.recordMeasurement(req.params.id, value, source, notes);
    await eventBus.publish('boa.kpi.measured', { kpiId: req.params.id, value, status: kpiTrackerService.getKPI(req.params.id).status });
    res.status(201).json({ success: true, data: measurement, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get KPI progress
 * GET /api/v1/kpi/:id/progress
 */
router.get('/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const progress = kpiTrackerService.getProgress(req.params.id);
    res.json({ success: true, data: progress, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get KPI measurements history
 * GET /api/v1/kpi/:id/measurements
 */
router.get('/:id/measurements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const measurements = kpiTrackerService.getMeasurements(req.params.id, limit);
    res.json({ success: true, data: measurements, count: measurements.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
