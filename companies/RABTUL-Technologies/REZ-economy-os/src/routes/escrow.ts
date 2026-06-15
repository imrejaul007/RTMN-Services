import { Router, Request, Response, NextFunction } from 'express';
import { escrowService } from '../services/escrowService';
import { validators } from '../validators/schemas';

const router = Router();

/**
 * POST /api/v1/escrow - Hold funds in escrow
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = validators.isRecord(req.body, 'body');
    const escrow = await escrowService.hold({
      payerAccountId: validators.isString(body.payerAccountId, 'payerAccountId'),
      payeeAccountId: validators.isString(body.payeeAccountId, 'payeeAccountId'),
      amount: validators.isPositiveNumber(body.amount, 'amount'),
      currency: validators.isOptionalString(body.currency, 'currency'),
      conditions: validators.isStringArray(body.conditions, 'conditions'),
      description: validators.isOptionalString(body.description, 'description'),
      initiatedBy: validators.isString(body.initiatedBy, 'initiatedBy'),
    });
    res.status(201).json({ success: true, data: escrow });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/escrow/:escrowId - Get escrow
 */
router.get('/:escrowId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const escrowId = validators.isString(req.params.escrowId, 'escrowId');
    const escrow = escrowService.get(escrowId);
    res.json({ success: true, data: escrow });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/escrow/:escrowId/release - Release escrow
 */
router.post('/:escrowId/release', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const escrowId = validators.isString(req.params.escrowId, 'escrowId');
    const body = validators.isRecord(req.body || {}, 'body');
    const initiatedBy = validators.isString(body.initiatedBy, 'initiatedBy');
    const notes = validators.isOptionalString(body.notes, 'notes');
    const escrow = await escrowService.release(escrowId, initiatedBy, notes);
    res.json({ success: true, data: escrow });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/escrow/:escrowId/refund - Refund escrow
 */
router.post('/:escrowId/refund', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const escrowId = validators.isString(req.params.escrowId, 'escrowId');
    const body = validators.isRecord(req.body || {}, 'body');
    const initiatedBy = validators.isString(body.initiatedBy, 'initiatedBy');
    const reason = validators.isString(body.reason, 'reason');
    const escrow = await escrowService.refund(escrowId, initiatedBy, reason);
    res.json({ success: true, data: escrow });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/escrow/:escrowId/dispute - Mark escrow as disputed
 */
router.post('/:escrowId/dispute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const escrowId = validators.isString(req.params.escrowId, 'escrowId');
    const body = validators.isRecord(req.body || {}, 'body');
    const disputeId = validators.isString(body.disputeId, 'disputeId');
    const escrow = await escrowService.dispute(escrowId, disputeId);
    res.json({ success: true, data: escrow });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/escrow - List escrows
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.payerAccountId) filter.payerAccountId = req.query.payerAccountId;
    if (req.query.payeeAccountId) filter.payeeAccountId = req.query.payeeAccountId;
    res.json({ success: true, data: escrowService.list(filter) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/escrow/stats/summary - Escrow statistics
 */
router.get('/stats/summary', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: escrowService.stats() });
  } catch (error) {
    next(error);
  }
});

export default router;
