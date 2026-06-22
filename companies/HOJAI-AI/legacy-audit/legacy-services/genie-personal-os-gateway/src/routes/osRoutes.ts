/**
 * GENIE Personal OS Gateway - API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getOrchestratorService } from '../services/orchestratorService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createLogger } from '../utils/logger.js';
import { UnifiedQuerySchema, AICompanionRequestSchema, CreateMemorySchema, TimelineQuerySchema } from '../types.js';

const logger = createLogger('os-routes');
const router = Router();
const orchestrator = getOrchestratorService();

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createResponse<T>(success: boolean, data?: T, error?: { code: string; message: string; details?: Record<string, unknown> }) {
  return { success, ...(data !== undefined && { data }), ...(error && { error }), meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() } };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => { Promise.resolve(fn(req, res, next)).catch(next); };
}

router.use(tenantMiddleware());

// ============================================================================
// Context & Context
// ============================================================================

router.get('/context', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext!;

  if (!user_id) {
    res.status(400).json(createResponse(false, undefined, { code: 'MISSING_USER', message: 'X-User-Id header is required' }));
    return;
  }

  const context = await orchestrator.getPersonalContext(tenant_id, user_id);
  res.json(createResponse(true, context));
}));

// ============================================================================
// AI Companion
// ============================================================================

router.post('/companion/message', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext!;

  if (!user_id) {
    res.status(400).json(createResponse(false, undefined, { code: 'MISSING_USER', message: 'X-User-Id header is required' }));
    return;
  }

  const parseResult = AICompanionRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parseResult.error.flatten() }));
    return;
  }

  const response = await orchestrator.processAICompanionMessage(tenant_id, user_id, parseResult.data);
  res.json(createResponse(true, response));
}));

// ============================================================================
// Memory
// ============================================================================

router.post('/memory', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext!;

  if (!user_id) {
    res.status(400).json(createResponse(false, undefined, { code: 'MISSING_USER', message: 'X-User-Id header is required' }));
    return;
  }

  const parseResult = CreateMemorySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parseResult.error.flatten() }));
    return;
  }

  const memory = await orchestrator.createMemory(tenant_id, user_id, parseResult.data);
  res.status(201).json(createResponse(true, memory));
}));

// ============================================================================
// Unified Search
// ============================================================================

router.post('/search', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext!;

  if (!user_id) {
    res.status(400).json(createResponse(false, undefined, { code: 'MISSING_USER', message: 'X-User-Id header is required' }));
    return;
  }

  const parseResult = UnifiedQuerySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parseResult.error.flatten() }));
    return;
  }

  const results = await orchestrator.unifiedSearch(tenant_id, user_id, parseResult.data);
  res.json(createResponse(true, results));
}));

// ============================================================================
// Daily Briefing
// ============================================================================

router.get('/briefing', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext!;

  if (!user_id) {
    res.status(400).json(createResponse(false, undefined, { code: 'MISSING_USER', message: 'X-User-Id header is required' }));
    return;
  }

  const briefing = await orchestrator.getDailyBriefing(tenant_id, user_id);
  res.json(createResponse(true, briefing));
}));

// ============================================================================
// Personal Timeline
// ============================================================================

router.get('/timeline', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext!;

  if (!user_id) {
    res.status(400).json(createResponse(false, undefined, { code: 'MISSING_USER', message: 'X-User-Id header is required' }));
    return;
  }

  const parseResult = TimelineQuerySchema.safeParse(req.query);
  const timeline = await orchestrator.getPersonalTimeline(
    tenant_id,
    user_id,
    parseResult.success ? parseResult.data.start_date : undefined,
    parseResult.success ? parseResult.data.end_date : undefined
  );

  res.json(createResponse(true, timeline));
}));

// ============================================================================
// Health
// ============================================================================

router.get('/health/services', asyncHandler(async (_req: Request, res: Response) => {
  res.json(createResponse(true, {
    status: 'healthy',
    services: {
      memory: 'available',
      relationship: 'available',
      household: 'available',
      pattern: 'available',
      orchestrator: 'available',
    }
  }));
}));

export default router;
