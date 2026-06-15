import { Router, Request, Response, NextFunction } from 'express';
import { karmaService } from '../services/karmaService';
import { validators } from '../validators/schemas';
import { ValidationError, NotFoundError } from '../utils/errors';

const router = Router();

/**
 * GET /api/v1/karma/:agentId - Get karma record for an agent
 */
router.get('/:agentId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const record = karmaService.get(agentId);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/karma/:agentId/initialize - Initialize karma for an agent
 */
router.post('/:agentId/initialize', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const record = karmaService.initialize(agentId);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/karma/:agentId/award - Award or penalize karma
 */
router.post('/:agentId/award', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const body = validators.isRecord(req.body, 'body');
    const source = validators.isString(body.source, 'source');
    const points = body.points !== undefined ? validators.isNumber(body.points, 'points') : undefined;
    const customPoints = body.customPoints !== undefined ? validators.isNumber(body.customPoints, 'customPoints') : undefined;
    const reason = validators.isOptionalString(body.reason, 'reason');
    const referenceId = validators.isOptionalString(body.referenceId, 'referenceId');

    const result = await karmaService.award(agentId, source, points, { reason, referenceId, customPoints });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/karma/:agentId/history - Get karma history
 */
router.get('/:agentId/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const events = karmaService.getHistory(agentId, limit);
    res.json({ success: true, data: events, count: events.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/karma - List all karma records
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tier = req.query.tier as string | undefined;
    if (tier) {
      validators.isKarmaTier(tier);
      res.json({ success: true, data: karmaService.listByTier(tier) });
    } else {
      res.json({ success: true, data: karmaService.list() });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/karma/top - Top N agents by karma
 */
router.get('/top/list', (req: Request, res: Response, next: NextFunction) => {
  try {
    const n = req.query.n ? parseInt(req.query.n as string, 10) : 10;
    res.json({ success: true, data: karmaService.top(n) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/karma/stats - Karma statistics
 */
router.get('/stats/summary', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: karmaService.stats() });
  } catch (error) {
    next(error);
  }
});

export default router;
