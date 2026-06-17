import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Plan, defaultPlans } from '../models/Plan';
import { logger } from '../services/logger';

const router = Router();

// Validation schemas
const createPlanSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['free', 'basic', 'standard', 'premium', 'enterprise', 'custom']),
  price: z.number().min(0),
  interval: z.enum(['day', 'week', 'month', 'year']),
  features: z.array(z.string()),
  limits: z.object({
    users: z.number().optional(),
    storage: z.number().optional(),
    apiCalls: z.number().optional(),
    custom: z.record(z.unknown()).optional()
  }).optional(),
  usage: z.object({
    included: z.number().optional(),
    unit: z.string().optional()
  }).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  trialDays: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional()
});

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  interval: z.enum(['day', 'week', 'month', 'year']).optional(),
  features: z.array(z.string()).optional(),
  limits: z.object({
    users: z.number().optional(),
    storage: z.number().optional(),
    apiCalls: z.number().optional(),
    custom: z.record(z.unknown()).optional()
  }).optional(),
  usage: z.object({
    included: z.number().optional(),
    unit: z.string().optional()
  }).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  trialDays: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional()
});

// Create plan
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createPlanSchema.parse(req.body);

    const plan = new Plan({
      planId: `PLAN-${uuidv4().substring(0, 8).toUpperCase()}`,
      ...data,
      isActive: data.isActive ?? true,
      isDefault: data.isDefault ?? false,
      trialDays: data.trialDays ?? 0
    });

    await plan.save();
    logger.info('Plan created', { planId: plan.planId, name: plan.name });
    res.status(201).json(plan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Failed to create plan', { error });
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Get all plans with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, type, isActive, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = {};
    if (tenantId) filter.tenantId = tenantId;
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const plans = await Plan.find(filter)
      .sort({ price: 1, name: 1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await Plan.countDocuments(filter);

    res.json({
      data: plans,
      pagination: { total, limit: Number(limit), offset: Number(offset) }
    });
  } catch (error) {
    logger.error('Failed to fetch plans', { error });
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Get plan by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const plan = await Plan.findOne({
      $or: [
        { planId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(plan);
  } catch (error) {
    logger.error('Failed to fetch plan', { error });
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// Update plan
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = updatePlanSchema.parse(req.body);
    const plan = await Plan.findOne({
      $or: [
        { planId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Handle default plan logic
    if (data.isDefault && !plan.isDefault) {
      await Plan.updateMany(
        { tenantId: plan.tenantId, type: plan.type, _id: { $ne: plan._id } },
        { isDefault: false }
      );
    }

    Object.assign(plan, data);
    await plan.save();
    logger.info('Plan updated', { planId: plan.planId });
    res.json(plan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Failed to update plan', { error });
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Delete plan (soft delete - just mark inactive)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const plan = await Plan.findOne({
      $or: [
        { planId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Check if plan is being used by subscriptions
    // For now, just soft delete
    plan.isActive = false;
    await plan.save();

    logger.info('Plan deactivated', { planId: plan.planId });
    res.json({ message: 'Plan deactivated', planId: plan.planId });
  } catch (error) {
    logger.error('Failed to delete plan', { error });
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// Seed default plans for a tenant
router.post('/seed/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // Check if plans already exist
    const existingPlans = await Plan.find({ tenantId });
    if (existingPlans.length > 0) {
      return res.status(400).json({ error: 'Plans already exist for this tenant' });
    }

    // Create default plans
    const plans = await Promise.all(
      defaultPlans.map(async (planData, index) => {
        const plan = new Plan({
          planId: `PLAN-${uuidv4().substring(0, 8).toUpperCase()}`,
          tenantId,
          ...planData,
          isDefault: index === 0 // First plan is default
        });
        await plan.save();
        return plan;
      })
    );

    logger.info('Default plans seeded', { tenantId, count: plans.length });
    res.status(201).json({ message: 'Default plans created', plans });
  } catch (error) {
    logger.error('Failed to seed default plans', { error });
    res.status(500).json({ error: 'Failed to seed default plans' });
  }
});

// Get plans by type
router.get('/type/:type', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { type } = req.params;

    const filter: Record<string, unknown> = { type, isActive: true };
    if (tenantId) filter.tenantId = tenantId;

    const plans = await Plan.find(filter).sort({ price: 1 });
    res.json({ data: plans });
  } catch (error) {
    logger.error('Failed to fetch plans by type', { error });
    res.status(500).json({ error: 'Failed to fetch plans by type' });
  }
});

// Compare plans
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const { planIds, tenantId } = req.query;

    if (!planIds) {
      return res.status(400).json({ error: 'planIds query parameter required' });
    }

    const ids = (planIds as string).split(',');
    const filter: Record<string, unknown> = {
      _id: { $in: ids },
      isActive: true
    };
    if (tenantId) filter.tenantId = tenantId;

    const plans = await Plan.find(filter).sort({ price: 1 });
    res.json({ data: plans });
  } catch (error) {
    logger.error('Failed to compare plans', { error });
    res.status(500).json({ error: 'Failed to compare plans' });
  }
});

export default router;
