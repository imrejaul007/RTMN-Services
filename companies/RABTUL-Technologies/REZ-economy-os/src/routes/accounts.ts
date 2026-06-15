import { Router, Request, Response, NextFunction } from 'express';
import { accountService } from '../services/accountService';
import { validators } from '../validators/schemas';

const router = Router();

/**
 * POST /api/v1/accounts - Create a new account
 */
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = validators.isRecord(req.body, 'body');
    const ownerId = validators.isString(body.ownerId, 'ownerId');
    const ownerType = body.ownerType ? validators.isAccountType(body.ownerType) : undefined;
    const type = body.type ? validators.isAccountType(body.type) : undefined;
    const currency = validators.isOptionalString(body.currency, 'currency') || 'USD';
    const metadata = body.metadata ? validators.isRecord(body.metadata, 'metadata') : {};

    const account = accountService.create({ ownerId, ownerType, type, currency, metadata });
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/accounts/:accountId - Get account by ID
 */
router.get('/:accountId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = validators.isString(req.params.accountId, 'accountId');
    const account = accountService.get(accountId);
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/accounts - List accounts (filterable by ownerId)
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.query.ownerId as string | undefined;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;

    if (ownerId) {
      res.json({ success: true, data: accountService.getByOwner(ownerId) });
    } else {
      res.json({
        success: true,
        data: accountService.list({ type: type as any, status }),
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/accounts/owner/:ownerId/primary - Get or create primary account
 */
router.get('/owner/:ownerId/primary', (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = validators.isString(req.params.ownerId, 'ownerId');
    const type = (req.query.type as string) || 'agent';
    const currency = (req.query.currency as string) || 'USD';
    const account = accountService.getOrCreatePrimary(ownerId, validators.isAccountType(type), currency);
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/accounts/:accountId/freeze - Freeze an account
 */
router.post('/:accountId/freeze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = validators.isString(req.params.accountId, 'accountId');
    const reason = validators.isOptionalString(req.body?.reason, 'reason');
    const account = await accountService.freeze(accountId, reason);
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/accounts/:accountId/activate - Activate a frozen account
 */
router.post('/:accountId/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = validators.isString(req.params.accountId, 'accountId');
    const account = await accountService.activate(accountId);
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/accounts/stats/summary - Account statistics
 */
router.get('/stats/summary', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: accountService.stats() });
  } catch (error) {
    next(error);
  }
});

export default router;
