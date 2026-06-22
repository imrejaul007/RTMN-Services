/**
 * HOJAI FounderOS - GTM Strategy Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { gtmService } from '../services/gtmService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const MilestoneSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed']).optional()
});

const CreateGTMStrategySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  targetMarket: z.string().optional(),
  strategy: z.object({
    targetSegments: z.array(z.string()).optional(),
    positioning: z.string().optional(),
    channels: z.array(z.string()).optional(),
    pricingModel: z.string().optional(),
    goLiveDate: z.string().datetime().optional(),
    milestones: z.array(MilestoneSchema).optional()
  }).optional()
});

const UpdateGTMStrategySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  targetMarket: z.string().optional(),
  strategy: z.object({
    targetSegments: z.array(z.string()).optional(),
    positioning: z.string().optional(),
    channels: z.array(z.string()).optional(),
    pricingModel: z.string().optional(),
    goLiveDate: z.string().datetime().optional(),
    milestones: z.array(MilestoneSchema).optional()
  }).optional()
});

const GenerateFromBusinessModelSchema = z.object({
  businessModelId: z.string().min(1, 'Business model ID is required')
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/gtm
 * List all GTM strategies
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const strategies = await gtmService.list(tenantId, limit, offset);
    res.json(createResponse({ strategies }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/gtm
 * Create a new GTM strategy
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = CreateGTMStrategySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const data = { ...validation.data };
    if (data.strategy?.goLiveDate) {
      data.strategy.goLiveDate = new Date(data.strategy.goLiveDate) as any;
    }
    if (data.strategy?.milestones) {
      data.strategy.milestones = data.strategy.milestones.map(m => ({
        ...m,
        targetDate: m.targetDate ? new Date(m.targetDate) : undefined
      })) as any;
    }

    const strategy = await gtmService.create(tenantId, {
      ...data,
      createdBy: req.tenantContext?.userId
    } as any);

    res.status(201).json(createResponse({ strategy }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/gtm/generate
 * Generate GTM from business model
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = GenerateFromBusinessModelSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    // Import business model service to get the business model
    const { businessModelService } = await import('../services/businessModelService.js');
    const businessModel = await businessModelService.getById(tenantId, validation.data.businessModelId);

    if (!businessModel) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Business model not found')
      );
    }

    const strategy = await gtmService.generateFromBusinessModel(
      tenantId,
      businessModel,
      req.tenantContext?.userId
    );

    res.status(201).json(createResponse({ strategy }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gtm/:id
 * Get GTM strategy by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const strategy = await gtmService.getById(tenantId, id);

    if (!strategy) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'GTM strategy not found')
      );
    }

    res.json(createResponse({ strategy }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/gtm/:id
 * Update GTM strategy
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;
    const validation = UpdateGTMStrategySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const data = { ...validation.data };
    if (data.strategy?.goLiveDate) {
      data.strategy.goLiveDate = new Date(data.strategy.goLiveDate) as any;
    }
    if (data.strategy?.milestones) {
      data.strategy.milestones = data.strategy.milestones.map(m => ({
        ...m,
        targetDate: m.targetDate ? new Date(m.targetDate) : undefined
      })) as any;
    }

    const strategy = await gtmService.update(tenantId, id, data as any);

    if (!strategy) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'GTM strategy not found')
      );
    }

    res.json(createResponse({ strategy }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/gtm/:id
 * Delete GTM strategy
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const deleted = await gtmService.delete(tenantId, id);

    if (!deleted) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'GTM strategy not found')
      );
    }

    res.json(createResponse({ success: true }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gtm/suggest/from-market/:marketAnalysisId
 * Get GTM suggestions from market analysis
 */
router.get('/suggest/from-market/:marketAnalysisId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { marketAnalysisId } = req.params;

    const suggestions = await gtmService.suggestFromMarketAnalysis(tenantId, marketAnalysisId);

    if (!suggestions) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Market analysis not found')
      );
    }

    res.json(createResponse({ suggestions }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;