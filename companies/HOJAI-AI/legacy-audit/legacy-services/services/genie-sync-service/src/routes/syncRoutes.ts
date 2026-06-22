/**
 * GENIE Sync Service - Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as syncService from '../services/syncService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('sync-routes');
const router = Router();

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createResponse<T>(success: boolean, data?: T, error?: { code: string; message: string }) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
  };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.use(tenantMiddleware());

// POST /api/sync/jobs - Create sync job
router.post('/jobs', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const job = await syncService.createSyncJob(userId, req.body);
  res.status(201).json(createResponse(true, job));
}));

// GET /api/sync/jobs - List sync jobs
router.get('/jobs', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const query = {
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 20,
    status: req.query.status as string,
    source: req.query.source as string,
  };
  const result = await syncService.listSyncJobs(userId, query);
  res.json(createResponse(true, result));
}));

// GET /api/sync/jobs/:id - Get sync job
router.get('/jobs/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const job = await syncService.getSyncJob(req.params.id, userId);
  if (!job) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Sync job not found' }));
    return;
  }
  res.json(createResponse(true, job));
}));

// GET /api/sync/config - Get sync config
router.get('/config', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const config = await syncService.getSyncConfig(userId);
  res.json(createResponse(true, config));
}));

// PUT /api/sync/config - Update sync config
router.put('/config', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const config = await syncService.updateSyncConfig(userId, req.body);
  res.json(createResponse(true, config));
}));

// GET /api/sync/history/:service/:entityType - Get sync history
router.get('/history/:service/:entityType', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const limit = parseInt(req.query.limit as string) || 10;
  const history = await syncService.getSyncHistory(userId, req.params.service, req.params.entityType, limit);
  res.json(createResponse(true, { history }));
}));

export default router;
