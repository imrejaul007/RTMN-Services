/**
 * GENIE Memory Review Service - Routes
 */
import { Router, Request, Response } from 'express';
import { getMemoryReviewService } from '../services/memoryReviewService.js';
import { tenantMiddleware } from '../middleware/tenant.js';

const router = Router();
const service = getMemoryReviewService();

function resp(success: boolean, data?: any, error?: { code: string; message: string }) {
  return { success, ...(data && { data }), ...(error && { error }), meta: { timestamp: new Date().toISOString() } };
}
const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: any) => Promise.resolve(fn(req, res)).catch(next);

router.use(tenantMiddleware());

// Generate reviews
router.post('/generate/daily', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const review = await service.generateDailyReview(tenant_id!, user_id!);
  res.status(201).json(resp(true, review));
}));

router.post('/generate/weekly', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const review = await service.generateWeeklyReview(tenant_id!, user_id!);
  res.status(201).json(resp(true, review));
}));

router.post('/generate/monthly', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const review = await service.generateMonthlyReview(tenant_id!, user_id!);
  res.status(201).json(resp(true, review));
}));

// Schedule reviews
router.post('/schedule', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const { review_type, time, days } = req.body;
  const schedule = await service.scheduleReview(tenant_id!, user_id!, review_type, time, days);
  res.status(201).json(resp(true, schedule));
}));

// Get reviews
router.get('/reviews', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const type = req.query.type as string;
  const limit = parseInt(req.query.limit as string) || 30;
  const reviews = await service.getReviews(tenant_id!, user_id!, type, limit);
  res.json(resp(true, reviews));
}));

// Get patterns
router.get('/patterns', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const patterns = await service.getPatterns(tenant_id!, user_id!);
  res.json(resp(true, patterns));
}));

// Get insights
router.get('/insights', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const type = req.query.type as string;
  const insights = await service.getInsights(tenant_id!, user_id!, type);
  res.json(resp(true, insights));
}));

export default router;
