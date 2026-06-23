/**
 * HTTP routes for nexha-partner-graph service.
 *
 * All routes are tenant-scoped (req.user.tenantId or X-Tenant-Id header).
 *
 * Endpoints:
 *   GET    /health                                       - service health
 *   GET    /ready                                        - readiness probe
 *   GET    /                                             - redirects to /health
 *
 *   POST   /api/interactions                             - record a single interaction (auth)
 *   GET    /api/interactions                             - list my interactions (auth)
 *
 *   GET    /api/partners                                 - list my partnerships (auth)
 *   GET    /api/partners/:partnerRef                     - get one partnership (auth)
 *   GET    /api/partners/by-type/:relationshipType       - list by type (auth)
 *
 *   POST   /api/recommend                                - recommend partners (auth)
 *   GET    /api/stats                                    - per-tenant stats (auth)
 */

import express from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth, tenantFrom } from '../middleware/auth.js';
import * as partners from '../services/partnerService.js';

const router = express.Router();

// -----------------------------------------------------------------------------
// Zod schemas
// -----------------------------------------------------------------------------

const INTERACTION_TYPES = ['transaction', 'negotiation', 'mission', 'contract', 'review', 'inquiry'];
const RELATIONSHIP_TYPES = ['supplier', 'customer', 'partner', 'competitor', 'unknown'];
const PARTNER_TYPES = ['tenant', 'company', 'agent'];

const recordInteractionSchema = z.object({
  partnerRef: z.string().min(1).max(200),
  partnerType: z.enum(PARTNER_TYPES),
  type: z.enum(INTERACTION_TYPES),
  direction: z.enum(['outgoing', 'incoming']),
  value: z.number().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
  rating: z.number().min(0).max(5).nullable().optional(),
  source: z.string().max(100).optional().nullable(),
  sourceRef: z.string().max(200).optional().nullable(),
  relationshipType: z.enum(RELATIONSHIP_TYPES).optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  metadata: z.record(z.any()).default({}),
  occurredAt: z.union([z.string(), z.date()]).optional().nullable(),
});

const listInteractionsSchema = z.object({
  partnerRef: z.string().max(200).optional(),
  type: z.enum(INTERACTION_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const listPartnersSchema = z.object({
  relationshipType: z.enum(RELATIONSHIP_TYPES).optional(),
  minStrength: z.coerce.number().min(0).max(1).optional(),
  sort: z.enum(['strength', 'recent', 'count', 'gmv']).default('strength'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const recommendSchema = z.object({
  candidates: z.array(z.object({
    partnerRef: z.string().min(1).max(200),
    partnerType: z.enum(PARTNER_TYPES).optional(),
    partnerName: z.string().max(200).optional(),
    tags: z.array(z.string()).optional(),
    trustScore: z.number().min(0).max(100).optional(),
  })).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  minStrength: z.coerce.number().min(0).max(1).default(0),
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function badRequest(res, payload) {
  return res.status(400).json({
    error: payload.message || 'validation error',
    code: payload.code || 'PARTNER_VALIDATION_ERROR',
    issues: payload.issues || undefined,
  });
}

function handleServiceError(res, err) {
  if (err.code === 'PARTNER_VALIDATION_ERROR' || err.name === 'ValidationError') {
    return res.status(err.status || 400).json({ error: err.message, code: err.code, issues: err.issues });
  }
  if (err.code === 'PARTNER_NOT_FOUND' || err.name === 'NotFoundError') {
    return res.status(err.status || 404).json({ error: err.message, code: err.code });
  }
  // eslint-disable-next-line no-console
  console.error('[partner-graph] unhandled error:', err);
  return res.status(500).json({ error: err.message || 'internal error' });
}

// -----------------------------------------------------------------------------
// Health + meta
// -----------------------------------------------------------------------------

router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'nexha-partner-graph',
    version: '1.0.0',
    capabilities: [
      'interactions-record',
      'interactions-list',
      'partners-list',
      'partners-get',
      'partners-by-type',
      'recommend',
      'stats',
    ],
  });
});

router.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

router.get('/', (_req, res) => res.redirect('/health'));

// -----------------------------------------------------------------------------
// Interactions
// -----------------------------------------------------------------------------

router.post('/api/interactions', requireAuth, async (req, res) => {
  const parsed = recordInteractionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid interaction payload', code: 'PARTNER_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  if (!tenantId) {
    return res.status(401).json({ error: 'tenantId required', code: 'PARTNER_TENANT_REQUIRED' });
  }
  try {
    const interaction = await partners.recordInteraction(tenantId, parsed.data);
    return res.status(201).json(interaction);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.get('/api/interactions', requireAuth, async (req, res) => {
  const parsed = listInteractionsSchema.safeParse(req.query || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid list query', code: 'PARTNER_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  try {
    const result = await partners.listInteractions(tenantId, parsed.data);
    return res.json(result);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

// -----------------------------------------------------------------------------
// Partners
// -----------------------------------------------------------------------------

router.get('/api/partners', requireAuth, async (req, res) => {
  const parsed = listPartnersSchema.safeParse(req.query || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid list query', code: 'PARTNER_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  try {
    const result = await partners.listPartnerships(tenantId, parsed.data);
    return res.json(result);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.get('/api/partners/by-type/:relationshipType', requireAuth, async (req, res) => {
  if (!RELATIONSHIP_TYPES.includes(req.params.relationshipType)) {
    return res.status(400).json({ error: 'invalid relationshipType', code: 'PARTNER_VALIDATION_ERROR' });
  }
  const parsed = listPartnersSchema.omit({ relationshipType: true }).safeParse(req.query || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid list query', code: 'PARTNER_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  try {
    const result = await partners.listByType(tenantId, req.params.relationshipType, parsed.data);
    return res.json(result);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.get('/api/partners/:partnerRef', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const partnership = await partners.getPartnership(tenantId, req.params.partnerRef);
    return res.json(partnership);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

// -----------------------------------------------------------------------------
// Recommendations
// -----------------------------------------------------------------------------

router.post('/api/recommend', requireAuth, async (req, res) => {
  const parsed = recommendSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid recommend payload', code: 'PARTNER_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  try {
    const result = await partners.recommendPartners(tenantId, parsed.data);
    return res.json(result);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

router.get('/api/stats', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const stats = await partners.getStats(tenantId);
    return res.json(stats);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

export default router;