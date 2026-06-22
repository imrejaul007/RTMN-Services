/**
 * GENIE Browser History Service - Routes
 */
import { Router, Request, Response } from 'express';
import { getBrowserHistoryService } from '../services/browserHistoryService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { AddVisitsSchema } from '../types.js';

const router = Router();
const service = getBrowserHistoryService();

function resp(success: boolean, data?: any, error?: { code: string; message: string }) {
  return { success, ...(data && { data }), ...(error && { error }), meta: { timestamp: new Date().toISOString() } };
}
const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: any) => Promise.resolve(fn(req, res)).catch(next);

router.use(tenantMiddleware());

router.post('/visits', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const { visits, browser, device_type } = req.body;
  const result = await service.addVisits(tenant_id!, user_id!, visits, browser, device_type);
  res.status(201).json(resp(true, result));
}));

router.get('/patterns', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const start = new Date(req.query.start as string || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const end = new Date(req.query.end as string || new Date());
  const patterns = await service.getPatterns(tenant_id!, user_id!, start, end);
  res.json(resp(true, patterns));
}));

router.post('/patterns/generate', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const date = new Date(req.body.date || Date.now());
  const pattern = await service.generateDailyPattern(tenant_id!, user_id!, date);
  res.json(resp(true, pattern));
}));

router.get('/insights', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const types = req.query.types ? (req.query.types as string).split(',') : undefined;
  const insights = await service.getInsights(tenant_id!, user_id!, types);
  res.json(resp(true, insights));
}));

router.post('/insights/generate', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const insights = await service.generateInsights(tenant_id!, user_id!);
  res.json(resp(true, insights));
}));

router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const visits = await service.searchVisits(tenant_id!, user_id!, req.query.q as string, parseInt(req.query.limit as string) || 50);
  res.json(resp(true, visits));
}));

export default router;
