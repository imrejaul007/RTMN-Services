import { Router, Request, Response, NextFunction } from 'express';
import { syncService } from '../services/syncService';
import { goalMapper } from '../services/goalMapper';
import { conflictResolver, ResolutionStrategy } from '../services/conflictResolver';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

/**
 * Sync a BOA objective to SUTAR
 * POST /api/v1/sync/objective
 */
router.post('/objective', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.boaObjectiveId) throw new ValidationError('boaObjectiveId is required');
    const sync = await syncService.syncObjectiveToSutar(req.body.boaObjectiveId, { force: req.body.force });
    res.json({ success: sync.status !== 'failed', data: sync, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Push progress update
 * POST /api/v1/sync/progress
 */
router.post('/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boaObjectiveId, progress, status } = req.body;
    if (!boaObjectiveId) throw new ValidationError('boaObjectiveId is required');
    if (typeof progress !== 'number') throw new ValidationError('progress must be a number');
    if (!status) throw new ValidationError('status is required');
    const success = await syncService.pushProgressUpdate(boaObjectiveId, progress, status);
    res.json({ success, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Pull updates from SUTAR
 * POST /api/v1/sync/pull/:sutarGoalId
 */
router.post('/pull/:sutarGoalId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sutarData = await syncService.pullFromSutar(req.params.sutarGoalId);
    if (!sutarData) throw new NotFoundError(`SUTAR goal ${req.params.sutarGoalId}`);
    res.json({ success: true, data: sutarData, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get sync by ID
 * GET /api/v1/sync/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sync = Array.from(syncService.getAllSyncs()).find(s => s.id === req.params.id);
    if (!sync) throw new NotFoundError(`Sync ${req.params.id}`);
    res.json({ success: true, data: sync, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * List all syncs
 * GET /api/v1/sync
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const syncs = syncService.getAllSyncs({ status: status as any });
    res.json({ success: true, data: syncs, count: syncs.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Sync stats
 * GET /api/v1/sync/stats/summary
 */
router.get('/stats/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = syncService.getStats();
    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Apply mapping rule - 1:N split
 * POST /api/v1/sync/map/one-to-many
 */
router.post('/map/one-to-many', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.objective) throw new ValidationError('objective is required');
    if (!req.body.splitBy) throw new ValidationError('splitBy is required');
    const goals = goalMapper.mapOneToMany(req.body.objective, req.body.splitBy);
    res.json({ success: true, data: goals, count: goals.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Apply mapping rule - N:1 aggregate
 * POST /api/v1/sync/map/many-to-one
 */
router.post('/map/many-to-one', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!Array.isArray(req.body.objectives)) throw new ValidationError('objectives must be an array');
    if (!req.body.aggregatedTitle) throw new ValidationError('aggregatedTitle is required');
    const goal = goalMapper.mapManyToOne(req.body.objectives, req.body.aggregatedTitle);
    res.json({ success: true, data: goal, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Resolve conflict
 * POST /api/v1/sync/resolve-conflict
 */
router.post('/resolve-conflict', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.conflict) throw new ValidationError('conflict is required');
    if (!req.body.strategy) throw new ValidationError('strategy is required');
    const resolved = conflictResolver.resolve(req.body.conflict, req.body.strategy as ResolutionStrategy, req.body.mergedValue);
    res.json({ success: true, data: resolved, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
