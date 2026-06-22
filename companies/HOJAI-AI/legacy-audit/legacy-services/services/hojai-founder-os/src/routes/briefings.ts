/**
 * HOJAI FounderOS - Briefing Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { briefingService } from '../services/briefingService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse, BriefingType } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const BriefingSectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  order: z.number().optional(),
  required: z.boolean().optional(),
  prompts: z.array(z.string()).optional()
});

const CreateTemplateSchema = z.object({
  type: z.nativeEnum(BriefingType),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sections: z.array(BriefingSectionSchema)
});

// ============================================================================
// DAILY BRIEFING ROUTES
// ============================================================================

/**
 * GET /api/briefing/daily
 * Get latest daily briefing
 */
router.get('/daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const briefing = await briefingService.getLatest(tenantId, BriefingType.DAILY);

    if (!briefing) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'No daily briefing found. Generate one first.')
      );
    }

    res.json(createResponse({ briefing }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/briefing/daily
 * Generate daily CEO briefing
 */
router.post('/daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const briefing = await briefingService.generateDailyBriefing(
      tenantId,
      req.tenantContext?.userId
    );

    res.status(201).json(createResponse({ briefing }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// WEEKLY BRIEFING ROUTES
// ============================================================================

/**
 * GET /api/briefing/weekly
 * Get latest weekly briefing
 */
router.get('/weekly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const briefing = await briefingService.getLatest(tenantId, BriefingType.WEEKLY);

    if (!briefing) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'No weekly briefing found. Generate one first.')
      );
    }

    res.json(createResponse({ briefing }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/briefing/weekly
 * Generate weekly executive briefing
 */
router.post('/weekly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const briefing = await briefingService.generateWeeklyBriefing(
      tenantId,
      req.tenantContext?.userId
    );

    res.status(201).json(createResponse({ briefing }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BOARD BRIEFING ROUTES
// ============================================================================

/**
 * GET /api/briefing/board
 * Get latest board briefing
 */
router.get('/board', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const briefing = await briefingService.getLatest(tenantId, BriefingType.BOARD);

    if (!briefing) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'No board briefing found. Generate one first.')
      );
    }

    res.json(createResponse({ briefing }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/briefing/board
 * Generate board briefing
 */
router.post('/board', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const briefing = await briefingService.generateBoardBriefing(
      tenantId,
      req.tenantContext?.userId
    );

    res.status(201).json(createResponse({ briefing }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INVESTOR BRIEFING ROUTES
// ============================================================================

/**
 * GET /api/briefing/investor
 * Get latest investor briefing
 */
router.get('/investor', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const briefing = await briefingService.getLatest(tenantId, BriefingType.INVESTOR);

    if (!briefing) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'No investor briefing found. Generate one first.')
      );
    }

    res.json(createResponse({ briefing }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/briefing/investor
 * Generate investor briefing
 */
router.post('/investor', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const briefing = await briefingService.generateInvestorBriefing(
      tenantId,
      req.tenantContext?.userId
    );

    res.status(201).json(createResponse({ briefing }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BRIEFING TEMPLATE ROUTES
// ============================================================================

/**
 * GET /api/briefing/templates
 * List all briefing templates
 */
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const type = req.query.type as BriefingType | undefined;

    const templates = await briefingService.listTemplates(tenantId, type);
    res.json(createResponse({ templates }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/briefing/templates
 * Create a new briefing template
 */
router.post('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = CreateTemplateSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const template = await briefingService.createTemplate(tenantId, validation.data);

    res.status(201).json(createResponse({ template }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// HISTORY ROUTES
// ============================================================================

/**
 * GET /api/briefing/history/:type
 * Get briefing history by type
 */
router.get('/history/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { type } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;

    if (!Object.values(BriefingType).includes(type as BriefingType)) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid briefing type')
      );
    }

    const briefings = await briefingService.list(tenantId, type as BriefingType, limit);
    res.json(createResponse({ briefings }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;