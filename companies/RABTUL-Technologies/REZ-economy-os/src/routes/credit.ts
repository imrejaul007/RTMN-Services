import { Router, Request, Response, NextFunction } from 'express';
import { creditService } from '../services/creditService';
import { validators } from '../validators/schemas';

const router = Router();

/**
 * GET /api/v1/credit/:agentId - Get credit record for an agent
 */
router.get('/:agentId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const record = creditService.get(agentId);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/credit/:agentId/initialize - Initialize credit for an agent
 */
router.post('/:agentId/initialize', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const record = creditService.initialize(agentId);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/credit/:agentId/recalculate - Recalculate credit score
 */
router.post('/:agentId/recalculate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const record = await creditService.recalculate(agentId);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/credit/:agentId/payment - Record a payment event
 */
router.post('/:agentId/payment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const body = validators.isRecord(req.body, 'body');
    const onTime = validators.isNumber(body.onTime, 'onTime'); // boolean expected
    const record = await creditService.recordPayment(agentId, Boolean(onTime));
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/credit/:agentId/dispute - Record a dispute
 */
router.post('/:agentId/dispute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const body = validators.isRecord(req.body, 'body');
    const resolved = body.resolved === true;
    const record = await creditService.recordDispute(agentId, resolved);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/credit/:agentId/delivery - Record a delivery event
 */
router.post('/:agentId/delivery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const body = validators.isRecord(req.body, 'body');
    const successful = body.successful === true;
    const record = await creditService.recordDelivery(agentId, successful);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/credit - List all credit records
 */
router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: creditService.list() });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/credit/top/list - Top N by credit score
 */
router.get('/top/list', (req: Request, res: Response, next: NextFunction) => {
  try {
    const n = req.query.n ? parseInt(req.query.n as string, 10) : 10;
    res.json({ success: true, data: creditService.top(n) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/credit/stats/summary - Credit statistics
 */
router.get('/stats/summary', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: creditService.stats() });
  } catch (error) {
    next(error);
  }
});

export default router;
