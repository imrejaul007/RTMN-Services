import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requireTenantMatch, AuthError, TenantMismatchError } from '../middleware/auth.js';
import {
  createPlan,
  getPlan,
  listPlans,
  transitionPlan,
  recordResourceApplied,
  recordResourceFailed,
  recordOutputs,
  cancelPlan,
  destroyPlan,
  markDestroyed,
  listEvents,
  planToJson,
  planToYaml,
  getStats,
  NotFoundError,
  ValidationError,
  StateTransitionError,
} from '../services/provisioningService.js';
import { ProvisioningPlan } from '../models/ProvisioningPlan.js';

const router = Router();

router.use(authMiddleware);

const createSchema = z.object({
  targetInstanceKind: z.enum(['sutar-tenant-instance', 'industry-tenant-instance']),
  targetInstanceId: z.string().min(1).max(100),
  isolationLevel: z.enum(['SHARED', 'DEDICATED', 'ISOLATED']),
  region: z.string().min(1).max(50),
  metadata: z.record(z.unknown()).optional(),
});

const transitionSchema = z.object({
  toStatus: z.enum(['APPLYING', 'READY', 'FAILED', 'RECONCILING', 'DESTROYING', 'DESTROYED', 'CANCELLED']),
  reason: z.string().max(1000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const resourceAppliedSchema = z.object({
  resourceName: z.string().min(1).max(200),
  outputs: z.record(z.unknown()).optional(),
});

const resourceFailedSchema = z.object({
  resourceName: z.string().min(1).max(200),
  reason: z.string().min(1).max(1000),
});

const outputsSchema = z.record(z.unknown());

const listQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPLYING', 'READY', 'RECONCILING', 'DESTROYING', 'DESTROYED', 'FAILED', 'CANCELLED']).optional(),
  targetInstanceKind: z.enum(['sutar-tenant-instance', 'industry-tenant-instance']).optional(),
  targetInstanceId: z.string().max(100).optional(),
  region: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

// POST /api/plans
router.post('/plans', async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_failed', details: parsed.error.format() });
    }
    const plan = await createPlan({
      tenantId: req.user.tenantId,
      ...parsed.data,
      actor: req.user.subject || req.user.kind,
    });
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
});

// GET /api/plans
router.get('/plans', async (req, res, next) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_failed', details: parsed.error.format() });
    }
    const { limit, skip, ...filters } = parsed.data;
    // Non-internal callers can only see their own tenant
    const tenantFilter = req.user.kind === 'internal' ? filters.tenantId : req.user.tenantId;
    const result = await listPlans({ ...filters, tenantId: tenantFilter, limit, skip });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/plans/:planId
router.get('/plans/:planId', async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.planId, {
      tenantId: req.user.tenantId,
      allowInternal: req.user.kind === 'internal',
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// GET /api/plans/:planId/plan.json
router.get('/plans/:planId/plan.json', async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.planId, {
      tenantId: req.user.tenantId,
      allowInternal: req.user.kind === 'internal',
    });
    res.type('application/json').send(JSON.stringify(planToJson(plan), null, 2));
  } catch (err) {
    next(err);
  }
});

// GET /api/plans/:planId/plan.yaml
router.get('/plans/:planId/plan.yaml', async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.planId, {
      tenantId: req.user.tenantId,
      allowInternal: req.user.kind === 'internal',
    });
    res.type('application/yaml').send(planToYaml(plan));
  } catch (err) {
    next(err);
  }
});

// POST /api/plans/:planId/transition
router.post('/plans/:planId/transition', async (req, res, next) => {
  try {
    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_failed', details: parsed.error.format() });
    }
    const plan = await transitionPlan(req.params.planId, parsed.data.toStatus, {
      actor: req.user.subject || req.user.kind,
      reason: parsed.data.reason,
      payload: parsed.data.metadata || {},
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST /api/plans/:planId/apply (orchestrator callback: resource applied)
router.post('/plans/:planId/apply', async (req, res, next) => {
  try {
    const parsed = resourceAppliedSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_failed', details: parsed.error.format() });
    }
    const plan = await recordResourceApplied(req.params.planId, parsed.data.resourceName, {
      outputs: parsed.data.outputs || {},
      actor: req.user.subject || req.user.kind,
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST /api/plans/:planId/fail-resource (orchestrator callback: resource failed)
router.post('/plans/:planId/fail-resource', async (req, res, next) => {
  try {
    const parsed = resourceFailedSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_failed', details: parsed.error.format() });
    }
    const plan = await recordResourceFailed(req.params.planId, parsed.data.resourceName, {
      reason: parsed.data.reason,
      actor: req.user.subject || req.user.kind,
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST /api/plans/:planId/outputs
router.post('/plans/:planId/outputs', async (req, res, next) => {
  try {
    const parsed = outputsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_failed', details: parsed.error.format() });
    }
    const plan = await recordOutputs(req.params.planId, parsed.data, {
      actor: req.user.subject || req.user.kind,
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST /api/plans/:planId/cancel
router.post('/plans/:planId/cancel', async (req, res, next) => {
  try {
    const plan = await cancelPlan(req.params.planId, {
      reason: req.body?.reason,
      actor: req.user.subject || req.user.kind,
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST /api/plans/:planId/destroy
router.post('/plans/:planId/destroy', async (req, res, next) => {
  try {
    const plan = await destroyPlan(req.params.planId, {
      reason: req.body?.reason,
      actor: req.user.subject || req.user.kind,
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST /api/plans/:planId/mark-destroyed
router.post('/plans/:planId/mark-destroyed', async (req, res, next) => {
  try {
    const plan = await markDestroyed(req.params.planId, {
      actor: req.user.subject || req.user.kind,
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// GET /api/plans/:planId/events
router.get('/plans/:planId/events', async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.planId, {
      tenantId: req.user.tenantId,
      allowInternal: req.user.kind === 'internal',
    });
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const events = await listEvents(req.params.planId, { limit });
    res.json({ planId: plan.planId, events });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats
router.get('/stats', async (req, res, next) => {
  try {
    const q = {};
    if (req.user.kind !== 'internal') {
      q.tenantId = req.user.tenantId;
    } else if (req.query.tenantId) {
      q.tenantId = req.query.tenantId;
    }
    const plans = await ProvisioningPlan.find(q).lean();
    res.json(getStats(plans));
  } catch (err) {
    next(err);
  }
});

// Error handler for this router
router.use((err, req, res, next) => {
  if (err instanceof AuthError || err instanceof TenantMismatchError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof StateTransitionError) {
    return res.status(422).json({ error: err.message, from: err.from, to: err.to });
  }
  next(err);
});

export default router;
