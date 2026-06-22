/**
 * GENIE Dashboard Service - Routes
 * Version: 1.0.0 | Date: June 14, 2026
 *
 * Simple API like Vellum's dashboard
 */

import { Router, Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as dashboardService from '../services/dashboardService.js';

const router = Router();
router.use(tenantMiddleware());

function createResponse(success: boolean, data?: unknown, error?: { code: string; message: string }) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  };
}

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

// =============================================================================
// DASHBOARD
// =============================================================================

/**
 * GET /api/dashboard
 * Get complete dashboard data (like Vellum's main view)
 */
router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const focus = (req.query.focus as 'today' | 'week' | 'month') || 'today';
  const dashboard = await dashboardService.getDashboard(req.userId!, focus);
  res.json(createResponse(true, dashboard));
}));

// =============================================================================
// QUICK ACTIONS
// =============================================================================

/**
 * GET /api/quick-actions
 * Get available quick actions
 */
router.get('/quick-actions', asyncHandler(async (req: Request, res: Response) => {
  const actions = await dashboardService.getDashboard(req.userId!).then(d => d.quickActions);
  res.json(createResponse(true, { quickActions: actions }));
}));

/**
 * POST /api/quick-actions/execute
 * Execute a quick action
 */
router.post('/quick-actions/execute', asyncHandler(async (req: Request, res: Response) => {
  const { action, params } = req.body;
  if (!action) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Action is required' }));
    return;
  }
  const result = await dashboardService.executeQuickAction(req.userId!, action, params);
  res.json(createResponse(true, result));
}));

// =============================================================================
// UNIFIED SEARCH (Like Vellum Search)
// =============================================================================

/**
 * GET /api/search
 * Search across all Genie services
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Search query (q) is required' }));
    return;
  }
  const results = await dashboardService.unifiedSearch(req.userId!, q as string);
  res.json(createResponse(true, results));
}));

// =============================================================================
// SECTIONS (Individual dashboard sections)
// =============================================================================

/**
 * GET /api/sections/memory
 * Get memory section of dashboard
 */
router.get('/sections/memory', asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getDashboard(req.userId!);
  res.json(createResponse(true, dashboard.memory));
}));

/**
 * GET /api/sections/calendar
 * Get calendar section of dashboard
 */
router.get('/sections/calendar', asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getDashboard(req.userId!);
  res.json(createResponse(true, dashboard.calendar));
}));

/**
 * GET /api/sections/email
 * Get email section of dashboard
 */
router.get('/sections/email', asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getDashboard(req.userId!);
  res.json(createResponse(true, dashboard.email));
}));

/**
 * GET /api/sections/tasks
 * Get tasks section of dashboard
 */
router.get('/sections/tasks', asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getDashboard(req.userId!);
  res.json(createResponse(true, dashboard.tasks));
}));

/**
 * GET /api/sections/briefing
 * Get briefing section of dashboard
 */
router.get('/sections/briefing', asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getDashboard(req.userId!);
  res.json(createResponse(true, dashboard.briefings));
}));

/**
 * GET /api/sections/relationships
 * Get relationships section of dashboard
 */
router.get('/sections/relationships', asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getDashboard(req.userId!);
  res.json(createResponse(true, dashboard.relationships));
}));

/**
 * GET /api/sections/insights
 * Get AI insights section
 */
router.get('/sections/insights', asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getDashboard(req.userId!);
  res.json(createResponse(true, { insights: dashboard.insights }));
}));

// =============================================================================
// SUMMARY
// =============================================================================

/**
 * GET /api/summary
 * Get just the summary numbers
 */
router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getDashboard(req.userId!);
  res.json(createResponse(true, dashboard.summary));
}));

export default router;
