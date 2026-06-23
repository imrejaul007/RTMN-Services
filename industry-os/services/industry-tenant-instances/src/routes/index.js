/**
 * Industry OS Tenant Instance Manager — HTTP routes.
 *
 * All routes are protected by `requireAuth` which accepts either:
 *   - Internal token (x-internal-token + X-Tenant-Id) for Hub calls.
 *   - JWT (HS256) with `roles` claim containing `industry:admin`.
 *
 * ADR-0010 Phase 10 (2026-06-22).
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import * as svc from '../services/instanceService.js';
import { SUPPORTED_INDUSTRIES } from '../models/IndustryInstance.js';

const router = Router();

// =====================================================
// Zod schemas
// =====================================================

const limitsSchema = z
  .object({
    maxApiCallsPerMinute: z.number().int().nonnegative().optional(),
    maxRecordsPerTenant: z.number().int().nonnegative().optional(),
    storageMbLimit: z.number().nonnegative().optional(),
    maxConcurrentWorkflows: z.number().int().nonnegative().optional(),
  })
  .optional();

const routeSchema = z.object({
  pathPrefix: z.string().min(1),
  upstreamUrl: z.string().url(),
  enabled: z.boolean().optional(),
});

const complianceSchema = z
  .object({
    framework: z.string().optional(),
    auditLogEnabled: z.boolean().optional(),
    dataResidencyRegion: z.string().optional(),
    encryptionAtRest: z.boolean().optional(),
    encryptionInTransit: z.boolean().optional(),
    notes: z.string().optional(),
  })
  .optional();

const provisionSchema = z.object({
  tenantId: z.string().min(1),
  industry: z.enum(SUPPORTED_INDUSTRIES),
  instanceId: z.string().optional(),
  isolationLevel: z.enum(['SHARED', 'DEDICATED', 'ISOLATED']).optional(),
  region: z.string().optional(),
  namespace: z.string().optional(),
  databaseUri: z.string().optional(),
  apiKey: z.string().optional(),
  limits: limitsSchema,
  compliance: complianceSchema,
  routes: z.array(routeSchema).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  autoActivate: z.boolean().optional(),
});

const updateSchema = z
  .object({
    isolationLevel: z.enum(['SHARED', 'DEDICATED', 'ISOLATED']).optional(),
    industry: z.enum(SUPPORTED_INDUSTRIES).optional(),
    region: z.string().optional(),
    limits: limitsSchema,
    compliance: complianceSchema,
    routes: z.array(routeSchema).optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
  })
  .refine((v) => v && Object.keys(v).length > 0, { message: 'no fields to update' });

const listSchema = z.object({
  status: z.string().optional(),
  tenantId: z.string().optional(),
  industry: z.string().optional(),
  isolationLevel: z.string().optional(),
  region: z.string().optional(),
  complianceFramework: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const usageSchema = z.object({
  apiCalls: z.number().int().nonnegative().optional(),
  recordsCreated: z.number().int().nonnegative().optional(),
  recordsUpdated: z.number().int().nonnegative().optional(),
  workflowsExecuted: z.number().int().nonnegative().optional(),
  errorCount: z.number().int().nonnegative().optional(),
  recordsActive: z.number().int().nonnegative().optional(),
  storageMbUsed: z.number().nonnegative().optional(),
});

const usageQuerySchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
});

const healthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']).optional(),
});

const reasonSchema = z.object({ reason: z.string().optional() }).optional();

// =====================================================
// Helpers
// =====================================================

function badRequest(res, issues) {
  return res.status(400).json({ error: 'validation_failed', issues });
}

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      issues[path || '_'] = issue.message;
    }
    return { ok: false, issues };
  }
  return { ok: true, data: result.data };
}

function handleServiceError(res, err) {
  if (err instanceof svc.ValidationError) {
    return res.status(400).json({ error: err.message, issues: err.issues || {} });
  }
  if (err instanceof svc.NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof svc.StateTransitionError) {
    return res.status(422).json({ error: err.message, from: err.from, to: err.to });
  }
  if (err instanceof svc.ConflictError) {
    return res.status(409).json({ error: err.message });
  }
  // eslint-disable-next-line no-console
  console.error('[industry-tenant-instances] unhandled error:', err);
  return res.status(500).json({ error: err.message || 'internal error' });
}

// =====================================================
// Operational
// =====================================================

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'industry-tenant-instances', uptime: process.uptime() });
});

router.get('/ready', (_req, res) => {
  res.json({ status: 'ready' });
});

router.get('/', (_req, res) => {
  res.json({
    service: 'industry-tenant-instances',
    description:
      'Per-tenant Industry OS instance manager — provisions, suspends, resumes, destroys isolated industry OS shards per large/regulated tenant. ADR-0010 Phase 10.',
    port: parseInt(process.env.INDUSTRY_TENANT_INSTANCES_PORT || '4365', 10),
    statuses: svc.INDUSTRY_STATUSES,
    isolationLevels: svc.ISOLATION_LEVELS,
    industries: svc.SUPPORTED_INDUSTRIES,
    endpoints: [
      'POST   /api/instances',
      'GET    /api/instances',
      'GET    /api/instances/:id',
      'GET    /api/instances/by-tenant/:tenantId',
      'PATCH  /api/instances/:id',
      'POST   /api/instances/:id/suspend',
      'POST   /api/instances/:id/resume',
      'POST   /api/instances/:id/destroy',
      'POST   /api/instances/:id/fail',
      'POST   /api/instances/:id/rotate-key',
      'POST   /api/instances/:id/health',
      'POST   /api/instances/:id/usage',
      'GET    /api/instances/:id/usage',
      'GET    /api/instances/:id/limits',
      'GET    /api/stats',
    ],
  });
});

router.get('/api/validate', (_req, res) => {
  res.json({ ok: true });
});

// =====================================================
// Instances
// =====================================================

router.post('/api/instances', requireAuth, async (req, res) => {
  const parsed = parse(provisionSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const inst = await svc.provisionInstance(parsed.data);
    res.status(201).json(inst);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.get('/api/instances', requireAuth, async (req, res) => {
  const parsed = parse(listSchema, req.query);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const result = await svc.listInstances(parsed.data);
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.get('/api/instances/by-tenant/:tenantId', requireAuth, async (req, res) => {
  try {
    const industry = req.query.industry || null;
    const inst = await svc.getInstanceByTenant(req.params.tenantId, industry);
    res.json(inst);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.get('/api/instances/:id', requireAuth, async (req, res) => {
  try {
    const inst = await svc.getInstance(req.params.id);
    res.json(inst);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.patch('/api/instances/:id', requireAuth, async (req, res) => {
  const parsed = parse(updateSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const inst = await svc.updateInstance(req.params.id, parsed.data);
    res.json(inst);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// =====================================================
// Lifecycle actions
// =====================================================

router.post('/api/instances/:id/suspend', requireAuth, async (req, res) => {
  const parsed = parse(reasonSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const inst = await svc.suspendInstance(req.params.id, (parsed.data && parsed.data.reason) || null);
    res.json(inst);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/instances/:id/resume', requireAuth, async (req, res) => {
  try {
    const inst = await svc.resumeInstance(req.params.id);
    res.json(inst);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/instances/:id/destroy', requireAuth, async (req, res) => {
  const parsed = parse(reasonSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const inst = await svc.destroyInstance(req.params.id, (parsed.data && parsed.data.reason) || null);
    res.json(inst);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/instances/:id/fail', requireAuth, async (req, res) => {
  const parsed = parse(reasonSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const inst = await svc.markInstanceFailed(req.params.id, (parsed.data && parsed.data.reason) || null);
    res.json(inst);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/instances/:id/rotate-key', requireAuth, async (req, res) => {
  try {
    const result = await svc.rotateApiKey(req.params.id);
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// =====================================================
// Health + usage
// =====================================================

router.post('/api/instances/:id/health', requireAuth, async (req, res) => {
  const parsed = parse(healthSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const inst = await svc.recordHealthCheck(req.params.id, (parsed.data && parsed.data.status) || 'healthy');
    res.json(inst);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/instances/:id/usage', requireAuth, async (req, res) => {
  const parsed = parse(usageSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const usage = await svc.recordUsage(req.params.id, parsed.data);
    res.json(usage);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.get('/api/instances/:id/usage', requireAuth, async (req, res) => {
  const parsed = parse(usageQuerySchema, req.query);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const usage = await svc.getUsage(req.params.id, parsed.data);
    res.json(usage);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.get('/api/instances/:id/limits', requireAuth, async (req, res) => {
  try {
    const result = await svc.checkLimits(req.params.id);
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// =====================================================
// Stats
// =====================================================

router.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const stats = await svc.getStats({ industry: req.query.industry });
    res.json(stats);
  } catch (err) {
    handleServiceError(res, err);
  }
});

export default router;