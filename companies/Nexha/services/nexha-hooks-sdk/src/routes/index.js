import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthError, TenantMismatchError } from '../middleware/auth.js';
import {
  createSubscription,
  getSubscription,
  listSubscriptions,
  updateSubscription,
  transitionSubscription,
  disableSubscription,
  enableSubscription,
  deleteSubscription,
  rotateSecret,
  emitEvent,
  processDeliveries,
  getDelivery,
  listDeliveries,
  getStats,
  signPayload,
  verifySignature,
  NotFoundError,
  ValidationError,
  StateTransitionError,
} from '../services/hooksService.js';
import { HOOK_EVENT_TYPES } from '../models/HookSubscription.js';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  url: z.string().url(),
  eventTypes: z.array(z.string()).min(1),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateSchema = z.object({
  url: z.string().url().optional(),
  eventTypes: z.array(z.string()).min(1).optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const emitSchema = z.object({
  eventType: z.string().min(1),
  payload: z.record(z.unknown()),
  sourceService: z.string().max(100).optional(),
});

const verifySchema = z.object({
  body: z.string(),
  signature: z.string(),
});

// POST /api/subscriptions
router.post('/subscriptions', async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_failed', details: parsed.error.format() });
    }
    const sub = await createSubscription({
      tenantId: req.user.tenantId,
      ...parsed.data,
    });
    res.status(201).json(sub);
  } catch (err) {
    next(err);
  }
});

// GET /api/subscriptions
router.get('/subscriptions', async (req, res, next) => {
  try {
    const tenantId = req.user.kind === 'internal' ? req.query.tenantId : req.user.tenantId;
    const eventType = req.query.eventType;
    const status = req.query.status;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = parseInt(req.query.skip, 10) || 0;
    const result = await listSubscriptions({ tenantId, status, eventType, limit, skip });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/subscriptions/:id
router.get('/subscriptions/:id', async (req, res, next) => {
  try {
    const sub = await getSubscription(req.params.id, {
      tenantId: req.user.tenantId,
      allowInternal: req.user.kind === 'internal',
    });
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/subscriptions/:id
router.patch('/subscriptions/:id', async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_failed', details: parsed.error.format() });
    }
    const sub = await updateSubscription(req.params.id, parsed.data, {
      tenantId: req.user.tenantId,
      allowInternal: req.user.kind === 'internal',
    });
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/:id/disable
router.post('/subscriptions/:id/disable', async (req, res, next) => {
  try {
    const sub = await disableSubscription(req.params.id, {
      tenantId: req.user.tenantId,
      allowInternal: req.user.kind === 'internal',
    });
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/:id/enable
router.post('/subscriptions/:id/enable', async (req, res, next) => {
  try {
    const sub = await enableSubscription(req.params.id, {
      tenantId: req.user.tenantId,
      allowInternal: req.user.kind === 'internal',
    });
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/subscriptions/:id (soft delete)
router.delete('/subscriptions/:id', async (req, res, next) => {
  try {
    const sub = await deleteSubscription(req.params.id, {
      tenantId: req.user.tenantId,
      allowInternal: req.user.kind === 'internal',
    });
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/:id/rotate-secret
router.post('/subscriptions/:id/rotate-secret', async (req, res, next) => {
  try {
    const sub = await rotateSecret(req.params.id, {
      tenantId: req.user.tenantId,
      allowInternal: req.user.kind === 'internal',
    });
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

// POST /api/events
router.post('/events', async (req, res, next) => {
  try {
    const parsed = emitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_failed', details: parsed.error.format() });
    }
    const result = await emitEvent({
      tenantId: req.user.tenantId,
      ...parsed.data,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/deliveries/process (worker callback)
router.post('/deliveries/process', async (req, res, next) => {
  try {
    if (req.user.kind !== 'internal') {
      return res.status(403).json({ error: 'internal only' });
    }
    const batchSize = Math.min(parseInt(req.query.batchSize, 10) || 50, 500);
    const result = await processDeliveries({ batchSize });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/deliveries
router.get('/deliveries', async (req, res, next) => {
  try {
    const tenantId = req.user.kind === 'internal' ? req.query.tenantId : req.user.tenantId;
    const subscriptionId = req.query.subscriptionId;
    const eventId = req.query.eventId;
    const eventType = req.query.eventType;
    const status = req.query.status;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = parseInt(req.query.skip, 10) || 0;
    const result = await listDeliveries({ tenantId, subscriptionId, eventId, eventType, status, limit, skip });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/deliveries/:id
router.get('/deliveries/:id', async (req, res, next) => {
  try {
    const d = await getDelivery(req.params.id, {
      tenantId: req.user.tenantId,
      allowInternal: req.user.kind === 'internal',
    });
    res.json(d);
  } catch (err) {
    next(err);
  }
});

// POST /api/verify (helpers: verify a payload signature)
router.post('/verify', async (req, res, next) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_failed' });
    }
    const { body, signature } = parsed.data;
    // We need the secret — caller supplies it via header
    const secret = req.headers['x-hook-secret'];
    if (!secret) return res.status(400).json({ error: 'x-hook-secret header required' });
    const ok = verifySignature(secret, body, signature);
    res.json({ valid: ok });
  } catch (err) {
    next(err);
  }
});

// GET /api/sign (helpers: sign a payload for testing)
router.post('/sign', async (req, res, next) => {
  try {
    const { body, secret } = req.body || {};
    if (!body || !secret) return res.status(400).json({ error: 'body and secret required' });
    const sig = signPayload(secret, body);
    res.json({ signature: sig });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats
router.get('/stats', async (req, res, next) => {
  try {
    const tenantId = req.user.kind === 'internal' ? req.query.tenantId : req.user.tenantId;
    const stats = await getStats(tenantId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/event-types
router.get('/event-types', (req, res) => {
  res.json({ eventTypes: HOOK_EVENT_TYPES });
});

// Error handler
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
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  next(err);
});

export default router;
