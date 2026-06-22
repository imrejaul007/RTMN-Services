/**
 * HOJAI FounderOS - Fundraising Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fundraisingService } from '../services/fundraisingService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse, FundraisingStage } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const InvestorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().optional(),
  contact: z.string().optional(),
  status: z.enum(['contacted', 'meeting_scheduled', 'interested', 'passed', 'committed']).optional()
});

const MilestoneSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed']).optional()
});

const CreateFundraisingPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  stage: z.nativeEnum(FundraisingStage),
  targetAmount: z.number().positive().optional(),
  currency: z.string().default('USD'),
  targetDate: z.string().datetime().optional(),
  valuation: z.number().positive().optional(),
  pitchDeck: z.string().optional(),
  investors: z.array(InvestorSchema).optional(),
  milestones: z.array(MilestoneSchema).optional()
});

const UpdateFundraisingPlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  stage: z.nativeEnum(FundraisingStage).optional(),
  targetAmount: z.number().positive().optional(),
  currency: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  valuation: z.number().positive().optional(),
  pitchDeck: z.string().optional(),
  raisedAmount: z.number().min(0).optional(),
  investors: z.array(InvestorSchema).optional(),
  milestones: z.array(MilestoneSchema).optional()
});

const AddInvestorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().optional(),
  contact: z.string().optional(),
  status: z.enum(['contacted', 'meeting_scheduled', 'interested', 'passed', 'committed']).optional()
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/fundraising
 * List all fundraising plans
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const plans = await fundraisingService.list(tenantId, limit, offset);
    res.json(createResponse({ plans }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/fundraising
 * Create a new fundraising plan
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = CreateFundraisingPlanSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const data = { ...validation.data };
    if (data.targetDate) {
      data.targetDate = new Date(data.targetDate) as any;
    }
    if (data.milestones) {
      data.milestones = data.milestones.map(m => ({
        ...m,
        targetDate: m.targetDate ? new Date(m.targetDate) : undefined
      })) as any;
    }

    const plan = await fundraisingService.create(tenantId, {
      ...data,
      createdBy: req.tenantContext?.userId
    } as any);

    res.status(201).json(createResponse({ plan }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/fundraising/:id
 * Get fundraising plan by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const plan = await fundraisingService.getById(tenantId, id);

    if (!plan) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Fundraising plan not found')
      );
    }

    res.json(createResponse({ plan }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/fundraising/:id
 * Update fundraising plan
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;
    const validation = UpdateFundraisingPlanSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const data = { ...validation.data };
    if (data.targetDate) {
      data.targetDate = new Date(data.targetDate) as any;
    }
    if (data.milestones) {
      data.milestones = data.milestones.map(m => ({
        ...m,
        targetDate: m.targetDate ? new Date(m.targetDate) : undefined
      })) as any;
    }

    const plan = await fundraisingService.update(tenantId, id, data as any);

    if (!plan) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Fundraising plan not found')
      );
    }

    res.json(createResponse({ plan }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/fundraising/:id
 * Delete fundraising plan
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const deleted = await fundraisingService.delete(tenantId, id);

    if (!deleted) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Fundraising plan not found')
      );
    }

    res.json(createResponse({ success: true }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/fundraising/:id/investors
 * Add investor to plan
 */
router.post('/:id/investors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;
    const validation = AddInvestorSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const plan = await fundraisingService.addInvestor(tenantId, id, validation.data);

    if (!plan) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Fundraising plan not found')
      );
    }

    res.status(201).json(createResponse({ plan }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/fundraising/:id/investors/:investorName/status
 * Update investor status
 */
router.patch('/:id/investors/:investorName/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id, investorName } = req.params;
    const { status } = req.body;

    if (!status || !['contacted', 'meeting_scheduled', 'interested', 'passed', 'committed'].includes(status)) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid status')
      );
    }

    const plan = await fundraisingService.updateInvestorStatus(tenantId, id, investorName, status);

    if (!plan) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Fundraising plan or investor not found')
      );
    }

    res.json(createResponse({ plan }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/fundraising/analytics
 * Get fundraising analytics
 */
router.get('/analytics/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const analytics = await fundraisingService.getAnalytics(tenantId);
    res.json(createResponse({ analytics }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/fundraising/milestones/template/:stage
 * Get standard milestones for a funding stage
 */
router.get('/milestones/template/:stage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stage } = req.params;

    if (!Object.values(FundraisingStage).includes(stage as FundraisingStage)) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid fundraising stage')
      );
    }

    const milestones = fundraisingService.generateStandardMilestones(stage as FundraisingStage);
    res.json(createResponse({ milestones }));
  } catch (error) {
    next(error);
  }
});

export default router;