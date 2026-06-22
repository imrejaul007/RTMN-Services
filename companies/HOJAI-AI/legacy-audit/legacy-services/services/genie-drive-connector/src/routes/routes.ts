/**
 * GENIE genie-drive-connector - Routes
 */
import { Router, Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as service from '../services/service.js';

const router = Router();
router.use(tenantMiddleware());

function createResponse(success: boolean, data?: unknown) {
  return { success, data, meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` } };
}

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => 
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/status', asyncHandler(async (req, res) => {
  const data = await service.getStatus(req.userId!);
  res.json(createResponse(true, data));
}));

export default router;
