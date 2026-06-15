import { Router, Request, Response, NextFunction } from 'express';
import { transactionService } from '../services/transactionService';
import { validators } from '../validators/schemas';

const router = Router();

/**
 * POST /api/v1/transactions - Create and execute a transaction
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = validators.isRecord(req.body, 'body');
    const transaction = await transactionService.create({
      fromAccountId: validators.isString(body.fromAccountId, 'fromAccountId'),
      toAccountId: validators.isString(body.toAccountId, 'toAccountId'),
      amount: validators.isPositiveNumber(body.amount, 'amount'),
      type: validators.isTransactionType(body.type),
      currency: validators.isOptionalString(body.currency, 'currency'),
      description: validators.isOptionalString(body.description, 'description'),
      metadata: body.metadata ? validators.isRecord(body.metadata, 'metadata') : undefined,
      idempotencyKey: validators.isOptionalString(body.idempotencyKey, 'idempotencyKey'),
      fee: body.fee !== undefined ? validators.isNumber(body.fee, 'fee') : undefined,
      initiatedBy: validators.isString(body.initiatedBy, 'initiatedBy'),
      approvedBy: validators.isOptionalString(body.approvedBy, 'approvedBy'),
      trustScoreAtTime: body.trustScoreAtTime,
      karmaAtTime: body.karmaAtTime,
      creditScoreAtTime: body.creditScoreAtTime,
    });
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/transactions/:transactionId - Get a transaction
 */
router.get('/:transactionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactionId = validators.isString(req.params.transactionId, 'transactionId');
    const transaction = transactionService.get(transactionId);
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/transactions/reference/:reference - Get by reference
 */
router.get('/reference/:reference', (req: Request, res: Response, next: NextFunction) => {
  try {
    const reference = validators.isString(req.params.reference, 'reference');
    const transaction = transactionService.getByReference(reference);
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/transactions/:transactionId/reverse - Reverse a transaction
 */
router.post('/:transactionId/reverse', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactionId = validators.isString(req.params.transactionId, 'transactionId');
    const body = validators.isRecord(req.body || {}, 'body');
    const reason = validators.isString(body.reason, 'reason');
    const initiatedBy = validators.isString(body.initiatedBy, 'initiatedBy');

    const reversal = await transactionService.reverse(transactionId, reason, initiatedBy);
    res.status(201).json({ success: true, data: reversal });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/transactions - List transactions with filters
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: any = {};
    if (req.query.fromAccountId) filter.fromAccountId = req.query.fromAccountId;
    if (req.query.toAccountId) filter.toAccountId = req.query.toAccountId;
    if (req.query.type) filter.type = validators.isTransactionType(req.query.type);
    if (req.query.status) filter.status = req.query.status;
    if (req.query.limit) filter.limit = parseInt(req.query.limit as string, 10);
    res.json({ success: true, data: transactionService.list(filter) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/transactions/ledger/:accountId - Get ledger entries for an account
 */
router.get('/ledger/:accountId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = validators.isString(req.params.accountId, 'accountId');
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const entries = transactionService.getLedger(accountId, limit);
    res.json({ success: true, data: entries, count: entries.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/transactions/:transactionId/verify - Verify ledger integrity
 */
router.get('/:transactionId/verify', (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactionId = validators.isString(req.params.transactionId, 'transactionId');
    const verification = transactionService.verifyTransaction(transactionId);
    res.json({ success: true, data: verification });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/transactions/stats/summary - Statistics
 */
router.get('/stats/summary', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: transactionService.stats() });
  } catch (error) {
    next(error);
  }
});

export default router;
