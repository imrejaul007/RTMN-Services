/**
 * GENIE Sync Service - Routes
 * Version: 1.0.0 | Date: June 13, 2026
 */
import { Router, Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as syncService from '../services/syncService.js';

const router = Router();
router.use(tenantMiddleware());

const resp = (s: boolean, d?: any, e?: any) => ({ success: s, ...(d && { data: d }), ...(e && { error: e }), meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` } });
const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/jobs', asyncHandler(async (req, res) => {
  try {
    const job = await syncService.createSyncJob(req.userId!, req.body);
    res.status(201).json(resp(true, job));
  } catch (err: any) {
    res.status(400).json(resp(false, undefined, { code: 'VALIDATION_ERROR', message: err.message }));
  }
}));

router.get('/jobs', asyncHandler(async (req, res) => {
  const result = await syncService.listSyncJobs(req.userId!, {
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 20,
    status: req.query.status as string,
    source: req.query.source as string,
  });
  res.json(resp(true, result));
}));

router.get('/jobs/:id', asyncHandler(async (req, res) => {
  const job = await syncService.getSyncJob(req.params.id, req.userId!);
  if (!job) return res.status(404).json(resp(false, undefined, { code: 'NOT_FOUND', message: 'Job not found' }));
  res.json(resp(true, job));
}));

router.get('/config', asyncHandler(async (req, res) => {
  const config = await syncService.getSyncConfig(req.userId!);
  res.json(resp(true, config));
}));

router.put('/config', asyncHandler(async (req, res) => {
  const config = await syncService.updateSyncConfig(req.userId!, req.body);
  res.json(resp(true, config));
}));

export default router;
