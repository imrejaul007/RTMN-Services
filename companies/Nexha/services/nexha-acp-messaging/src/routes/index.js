/**
 * HTTP routes — Zod-validated, tenant-isolated.
 *
 * Surfaces:
 *   POST   /api/negotiations                    Create a new negotiation (first message must be QUERY)
 *   GET    /api/negotiations                    List negotiations (filters: status, agent, limit)
 *   GET    /api/negotiations/:id                Get one negotiation (with message count)
 *   GET    /api/negotiations/:id/messages       List messages in conversation order
 *   POST   /api/negotiations/:id/messages       Append a message (validates state transition)
 *   GET    /api/stats                           Per-tenant stats
 *   POST   /api/validate                        Validate a message body without persisting
 *   GET    /health                              Liveness
 */

import express from 'express';
import { z } from 'zod';
import {
  appendMessage,
  listNegotiations,
  getNegotiation,
  listMessages,
  getStats,
  validateMessageBody,
  ValidationError,
  StateTransitionError,
  MESSAGE_TYPES,
  NEGOTIATION_STATUS,
} from '../services/stateMachine.js';
import { requireAuth, tenantFrom } from '../middleware/auth.js';

const router = express.Router();

const MessageBodySchema = z.object({
  messageId: z.string().optional(),
  type: z.enum(MESSAGE_TYPES),
  sender: z.string().min(1),
  receiver: z.string().min(1),
  intent: z.string().optional(),
  context: z.record(z.unknown()).optional(),
  constraints: z.record(z.unknown()).optional(),
  timeline: z.record(z.unknown()).optional(),
  attachments: z.unknown().optional(),
  payload: z.record(z.unknown()).optional(),
  parentMessageId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).passthrough();

const ValidateBodySchema = MessageBodySchema;

const ListNegotiationsQuery = z.object({
  status: z.enum(NEGOTIATION_STATUS).optional(),
  agent: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function handleErr(res, err) {
  if (err instanceof ValidationError) {
    return res.status(err.status).json({ error: err.message, code: err.code, issues: err.issues });
  }
  if (err instanceof StateTransitionError) {
    return res.status(err.status).json({ error: err.message, code: err.code, from: err.from, to: err.to });
  }
  return res.status(500).json({ error: err.message || 'Internal error' });
}

// All write endpoints require auth.
router.use('/api/negotiations', requireAuth);
router.use('/api/stats', requireAuth);

router.post('/api/negotiations', asyncRoute(async (req, res) => {
  const tenantId = tenantFrom(req, req.body);
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required (via JWT, x-tenant-id header, or body)' });
  const parsed = MessageBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    const out = await appendMessage(tenantId, null, parsed.data);
    return res.status(out.created ? 201 : 200).json(out);
  } catch (err) {
    return handleErr(res, err);
  }
}));

router.get('/api/negotiations', asyncRoute(async (req, res) => {
  const tenantId = tenantFrom(req);
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  const parsed = ListNegotiationsQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const items = await listNegotiations(tenantId, parsed.data);
  return res.json({ items, total: items.length });
}));

router.get('/api/negotiations/:id', asyncRoute(async (req, res) => {
  const tenantId = tenantFrom(req);
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  const negotiation = await getNegotiation(tenantId, req.params.id);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });
  return res.json(negotiation);
}));

router.get('/api/negotiations/:id/messages', asyncRoute(async (req, res) => {
  const tenantId = tenantFrom(req);
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  const exists = await getNegotiation(tenantId, req.params.id);
  if (!exists) return res.status(404).json({ error: 'Negotiation not found' });
  const messages = await listMessages(tenantId, req.params.id);
  return res.json({ items: messages, total: messages.length });
}));

router.post('/api/negotiations/:id/messages', asyncRoute(async (req, res) => {
  const tenantId = tenantFrom(req, req.body);
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  const parsed = MessageBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    const out = await appendMessage(tenantId, req.params.id, parsed.data);
    return res.status(201).json(out);
  } catch (err) {
    return handleErr(res, err);
  }
}));

router.get('/api/stats', asyncRoute(async (req, res) => {
  const tenantId = tenantFrom(req);
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  const stats = await getStats(tenantId);
  return res.json(stats);
}));

// Public-ish: validate without auth (so external integrators can lint their
// messages before sending). Optional auth still populates req.user.
router.post('/api/validate', asyncRoute(async (req, res) => {
  const parsed = ValidateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ valid: false, error: parsed.error.message, issues: parsed.error.issues });
  }
  try {
    const cleaned = validateMessageBody(parsed.data.type, parsed.data);
    return res.json({ valid: true, cleaned });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ valid: false, error: err.message, issues: err.issues });
    }
    return handleErr(res, err);
  }
}));

router.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'nexha-acp-messaging' });
});

export default router;