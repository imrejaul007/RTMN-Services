import { Router, Request, Response, NextFunction } from 'express';
import { trustService } from '../services/trustService';
import { validators } from '../validators/schemas';

const router = Router();

/**
 * GET /api/v1/trust/:entityId - Get trust record
 */
router.get('/:entityId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = validators.isString(req.params.entityId, 'entityId');
    const record = trustService.get(entityId);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/trust/:entityId/initialize - Initialize trust record
 */
router.post('/:entityId/initialize', (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = validators.isString(req.params.entityId, 'entityId');
    const entityType = req.body?.entityType || 'agent';
    const record = trustService.initialize(entityId, entityType);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/trust/:entityId/recalculate - Recalculate trust score
 */
router.post('/:entityId/recalculate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = validators.isString(req.params.entityId, 'entityId');
    const result = trustService.recalculate(entityId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/trust/:entityId/events - Record a trust event
 */
router.post('/:entityId/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = validators.isString(req.params.entityId, 'entityId');
    const body = validators.isRecord(req.body, 'body');
    const type = validators.isEventType(body.type);

    const record = await trustService.recordEvent({
      entityId,
      type,
      details: body.details,
      weight: body.weight,
      timestamp: body.timestamp,
    });
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust/:entityId/history - Get trust history
 */
router.get('/:entityId/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = validators.isString(req.params.entityId, 'entityId');
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    res.json({ success: true, data: trustService.getHistory(entityId, limit) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust/:entityId/events - Get trust events
 */
router.get('/:entityId/events', (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = validators.isString(req.params.entityId, 'entityId');
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    res.json({ success: true, data: trustService.getEvents(entityId, limit) });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/trust/compare - Compare multiple entities
 */
router.post('/compare', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = validators.isRecord(req.body, 'body');
    const entityIds = validators.isArray(body.entityIds || [], 'entityIds');
    if (entityIds.length === 0) throw new Error('entityIds array is required');
    res.json({ success: true, data: trustService.compare(entityIds) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust - List all trust records
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tier = req.query.tier as string | undefined;
    if (tier) {
      validators.isTrustTier(tier);
      res.json({ success: true, data: trustService.listByTier(tier) });
    } else {
      res.json({ success: true, data: trustService.list() });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust/top/list - Top N by trust score
 */
router.get('/top/list', (req: Request, res: Response, next: NextFunction) => {
  try {
    const n = req.query.n ? parseInt(req.query.n as string, 10) : 10;
    res.json({ success: true, data: trustService.top(n) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust/stats/summary - Statistics
 */
router.get('/stats/summary', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: trustService.stats() });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust/audit - Audit log
 */
router.get('/audit/log', (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = req.query.entityId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    res.json({ success: true, data: trustService.getAuditLog(entityId, limit) });
  } catch (error) {
    next(error);
  }
});

export default router;
