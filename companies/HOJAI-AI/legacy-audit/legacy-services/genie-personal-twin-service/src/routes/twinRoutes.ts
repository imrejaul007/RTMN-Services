/**
 * GENIE Personal Twin Service - Routes
 * Version: 1.0.0 | Date: June 15, 2026
 */

import { Router, Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as twinService from '../services/personalTwinService.js';

const router = Router();
router.use(tenantMiddleware());

const resp = (success: boolean, data?: unknown, error?: { code: string; message: string }) => ({
  success,
  ...(data !== undefined && { data }),
  ...(error && { error }),
  meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` },
});

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

// ============================================================================
// Twin Management
// ============================================================================

// POST /api/twin - Create twin
router.post('/twin', asyncHandler(async (req: Request, res: Response) => {
  try {
    const twin = await twinService.createTwin(req.userId!, req.body);
    res.status(201).json(resp(true, twin));
  } catch (err: any) {
    res.status(400).json(resp(false, undefined, { code: 'CREATE_ERROR', message: err.message }));
  }
}));

// GET /api/twin - Get twin
router.get('/twin', asyncHandler(async (req: Request, res: Response) => {
  const twin = await twinService.getTwin(req.userId!);
  if (!twin) {
    // Auto-create if not exists
    const newTwin = await twinService.createTwin(req.userId!, {});
    res.json(resp(true, newTwin));
    return;
  }
  res.json(resp(true, twin));
}));

// PATCH /api/twin - Update twin
router.patch('/twin', asyncHandler(async (req: Request, res: Response) => {
  const twin = await twinService.updateTwin(req.userId!, req.body);
  if (!twin) {
    res.status(404).json(resp(false, undefined, { code: 'NOT_FOUND', message: 'Twin not found' }));
    return;
  }
  res.json(resp(true, twin));
}));

// GET /api/twin/summary - Get twin summary
router.get('/twin/summary', asyncHandler(async (req: Request, res: Response) => {
  const summary = await twinService.getTwinSummary(req.userId!);
  if (!summary) {
    res.status(404).json(resp(false, undefined, { code: 'NOT_FOUND', message: 'Twin not found' }));
    return;
  }
  res.json(resp(true, summary));
}));

// ============================================================================
// Goals
// ============================================================================

// POST /api/twin/goals - Add goal
router.post('/twin/goals', asyncHandler(async (req: Request, res: Response) => {
  const goal = await twinService.addGoal(req.userId!, req.body);
  if (!goal) {
    res.status(404).json(resp(false, undefined, { code: 'NOT_FOUND', message: 'Twin not found' }));
    return;
  }
  res.status(201).json(resp(true, goal));
}));

// PATCH /api/twin/goals/:id - Update goal progress
router.patch('/twin/goals/:id', asyncHandler(async (req: Request, res: Response) => {
  const goal = await twinService.updateGoalProgress(req.userId!, req.params.id, parseInt(req.body.progress));
  if (!goal) {
    res.status(404).json(resp(false, undefined, { code: 'NOT_FOUND', message: 'Goal not found' }));
    return;
  }
  res.json(resp(true, goal));
}));

// ============================================================================
// Timeline
// ============================================================================

// POST /api/twin/timeline - Add timeline event
router.post('/api/twin/timeline', asyncHandler(async (req: Request, res: Response) => {
  const event = await twinService.addTimelineEvent(req.userId!, req.body);
  if (!event) {
    res.status(404).json(resp(false, undefined, { code: 'NOT_FOUND', message: 'Twin not found' }));
    return;
  }
  res.status(201).json(resp(true, event));
}));

// ============================================================================
// Preferences
// ============================================================================

// POST /api/twin/learn - Learn preference
router.post('/twin/learn', asyncHandler(async (req: Request, res: Response) => {
  const { category, key, value } = req.body;
  const twin = await twinService.learnPreference(req.userId!, category, key, value);
  if (!twin) {
    res.status(404).json(resp(false, undefined, { code: 'NOT_FOUND', message: 'Twin not found' }));
    return;
  }
  res.json(resp(true, { learned: true, twin }));
}));

// ============================================================================
// Predictive
// ============================================================================

// GET /api/twin/recommendations - Get recommendations
router.get('/twin/recommendations', asyncHandler(async (req: Request, res: Response) => {
  const recommendations = await twinService.getRecommendations(req.userId!);
  res.json(resp(true, { recommendations }));
}));

// PATCH /api/twin/predictive - Update predictive data
router.patch('/twin/predictive', asyncHandler(async (req: Request, res: Response) => {
  const twin = await twinService.updatePredictiveData(req.userId!, req.body);
  if (!twin) {
    res.status(404).json(resp(false, undefined, { code: 'NOT_FOUND', message: 'Twin not found' }));
    return;
  }
  res.json(resp(true, twin.predictive));
}));

export default router;
