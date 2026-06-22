/**
 * HOJAI FounderOS - Hiring Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { hiringService } from '../services/hiringService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse, SeniorityLevel, HiringPriority, HiringStatus } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const RoleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  department: z.string().min(1, 'Department is required'),
  seniority: z.nativeEnum(SeniorityLevel).optional(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  salary: z.number().positive().optional(),
  priority: z.nativeEnum(HiringPriority).optional(),
  status: z.nativeEnum(HiringStatus).optional(),
  targetStartDate: z.string().datetime().optional(),
  description: z.string().optional()
});

const TimelineSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  quarters: z.array(z.string()).optional()
});

const CreateHiringPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  timeline: TimelineSchema.optional(),
  roles: z.array(RoleSchema).optional(),
  totalBudget: z.number().min(0).optional()
});

const UpdateHiringPlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  timeline: TimelineSchema.optional(),
  totalBudget: z.number().min(0).optional()
});

const AddRoleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  department: z.string().min(1, 'Department is required'),
  seniority: z.nativeEnum(SeniorityLevel).optional(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  salary: z.number().positive().optional(),
  priority: z.nativeEnum(HiringPriority).optional(),
  targetStartDate: z.string().datetime().optional(),
  description: z.string().optional()
});

const UpdateRoleSchema = z.object({
  title: z.string().min(1).optional(),
  department: z.string().optional(),
  seniority: z.nativeEnum(SeniorityLevel).optional(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  salary: z.number().positive().optional(),
  priority: z.nativeEnum(HiringPriority).optional(),
  status: z.nativeEnum(HiringStatus).optional(),
  targetStartDate: z.string().datetime().optional(),
  description: z.string().optional()
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/hiring
 * List all hiring plans
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const plans = await hiringService.list(tenantId, limit, offset);
    res.json(createResponse({ plans }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/hiring
 * Create a new hiring plan
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = CreateHiringPlanSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const data = { ...validation.data };
    if (data.timeline) {
      if (data.timeline.startDate) data.timeline.startDate = new Date(data.timeline.startDate) as any;
      if (data.timeline.endDate) data.timeline.endDate = new Date(data.timeline.endDate) as any;
    }
    if (data.roles) {
      data.roles = data.roles.map(r => ({
        ...r,
        targetStartDate: r.targetStartDate ? new Date(r.targetStartDate) : undefined
      })) as any;
    }

    const plan = await hiringService.create(tenantId, {
      ...data,
      createdBy: req.tenantContext?.userId
    } as any);

    res.status(201).json(createResponse({ plan }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/hiring/:id
 * Get hiring plan by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const plan = await hiringService.getById(tenantId, id);

    if (!plan) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Hiring plan not found')
      );
    }

    res.json(createResponse({ plan }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/hiring/:id
 * Update hiring plan
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;
    const validation = UpdateHiringPlanSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const data = { ...validation.data };
    if (data.timeline) {
      if (data.timeline.startDate) data.timeline.startDate = new Date(data.timeline.startDate) as any;
      if (data.timeline.endDate) data.timeline.endDate = new Date(data.timeline.endDate) as any;
    }

    const plan = await hiringService.update(tenantId, id, data as any);

    if (!plan) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Hiring plan not found')
      );
    }

    res.json(createResponse({ plan }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/hiring/:id
 * Delete hiring plan
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const deleted = await hiringService.delete(tenantId, id);

    if (!deleted) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Hiring plan not found')
      );
    }

    res.json(createResponse({ success: true }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/hiring/:id/roles
 * Add role to hiring plan
 */
router.post('/:id/roles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;
    const validation = AddRoleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const data = { ...validation.data };
    if (data.targetStartDate) {
      data.targetStartDate = new Date(data.targetStartDate) as any;
    }

    const plan = await hiringService.addRole(tenantId, id, data as any);

    if (!plan) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Hiring plan not found')
      );
    }

    res.status(201).json(createResponse({ plan }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/hiring/:id/roles/:roleId
 * Update role in hiring plan
 */
router.patch('/:id/roles/:roleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id, roleId } = req.params;
    const validation = UpdateRoleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const data = { ...validation.data };
    if (data.targetStartDate) {
      data.targetStartDate = new Date(data.targetStartDate) as any;
    }

    const plan = await hiringService.updateRole(tenantId, id, roleId, data as any);

    if (!plan) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Hiring plan or role not found')
      );
    }

    res.json(createResponse({ plan }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/hiring/:id/roles/:roleId
 * Remove role from hiring plan
 */
router.delete('/:id/roles/:roleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id, roleId } = req.params;

    const plan = await hiringService.removeRole(tenantId, id, roleId);

    if (!plan) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Hiring plan or role not found')
      );
    }

    res.json(createResponse({ plan }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/hiring/analytics/summary
 * Get hiring analytics
 */
router.get('/analytics/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const analytics = await hiringService.getAnalytics(tenantId);
    res.json(createResponse({ analytics }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/hiring/suggest/roles/:stage
 * Suggest roles based on company stage
 */
router.get('/suggest/roles/:stage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stage } = req.params;
    const validStages = ['startup', 'growth', 'scale'];

    if (!validStages.includes(stage)) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid stage. Must be one of: startup, growth, scale')
      );
    }

    const roles = hiringService.suggestRoles(stage as 'startup' | 'growth' | 'scale');
    res.json(createResponse({ roles }));
  } catch (error) {
    next(error);
  }
});

export default router;