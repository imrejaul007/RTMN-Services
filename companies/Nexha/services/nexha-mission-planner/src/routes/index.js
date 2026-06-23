/**
 * HTTP routes for nexha-mission-planner service.
 *
 * All routes are tenant-scoped (req.user.tenantId or X-Tenant-Id header)
 * and respect per-tenant data isolation. Cross-tenant reads are supported
 * for participants of a mission.
 *
 * Endpoints:
 *   GET    /health                                       - service health
 *   GET    /                                             - redirects to /health
 *   GET    /ready                                        - readiness probe
 *   POST   /api/validate                                 - lint a mission payload (no persist)
 *
 *   POST   /api/missions                                 - create a new mission (auth)
 *   GET    /api/missions                                 - list missions with filters
 *   GET    /api/missions/:missionId                      - get one (visibility-checked)
 *   PATCH  /api/missions/:missionId                      - update (owner only, DRAFT/PLANNED/PAUSED)
 *   POST   /api/missions/:missionId/plan                 - resolve agents + PLANNED
 *   POST   /api/missions/:missionId/start                - PLANNED/PAUSED → EXECUTING
 *   POST   /api/missions/:missionId/pause                - EXECUTING → PAUSED
 *   POST   /api/missions/:missionId/cancel               - any non-terminal → CANCELLED
 *   POST   /api/missions/:missionId/retry                - FAILED → EXECUTING
 *
 *   POST   /api/missions/:missionId/subtasks/:subtaskId/start    - subtask → IN_PROGRESS
 *   POST   /api/missions/:missionId/subtasks/:subtaskId/complete - subtask → COMPLETED
 *   POST   /api/missions/:missionId/subtasks/:subtaskId/fail     - subtask → FAILED
 *   POST   /api/missions/:missionId/subtasks/:subtaskId/skip     - subtask → SKIPPED
 *
 *   GET    /api/templates                                - list public + tenant's own templates
 *   GET    /api/templates/:templateId                    - get one
 *   POST   /api/templates                                - create tenant template (auth)
 *
 *   GET    /api/stats                                    - per-tenant stats (auth)
 */

import express from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { requireAuth, optionalAuth, tenantFrom } from '../middleware/auth.js';
import * as missions from '../services/missionService.js';
import { MissionTemplate, TEMPLATE_VISIBILITY, TEMPLATE_CATEGORIES } from '../models/MissionTemplate.js';

const router = express.Router();

// -----------------------------------------------------------------------------
// Zod schemas
// -----------------------------------------------------------------------------

const MISSION_STATUS = ['DRAFT', 'PLANNED', 'EXECUTING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'];
const SUBTASK_TYPES = ['find-supplier', 'negotiate-price', 'execute-acp-message', 'install-listing', 'custom'];

const subtaskSchema = z.object({
  subtaskId: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(200),
  type: z.enum(SUBTASK_TYPES).default('custom'),
  capability: z.string().min(1).max(200),
  inputs: z.record(z.any()).default({}),
  dependsOn: z.array(z.string().min(1).max(200)).default([]),
  metadata: z.record(z.any()).default({}),
});

const createMissionSchema = z.object({
  missionId: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).default(''),
  templateId: z.string().min(1).max(200).optional(),
  templateVersion: z.string().max(50).optional(),
  subtasks: z.array(subtaskSchema).optional(),
  priority: z.number().int().min(1).max(10).default(5),
  context: z.record(z.any()).default({}),
  participants: z.array(z.string().min(1).max(200)).default([]),
  deadline: z.union([z.string(), z.date()]).optional().nullable(),
  metadata: z.record(z.any()).default({}),
}).refine(
  (data) => Boolean(data.templateId) || (Array.isArray(data.subtasks) && data.subtasks.length > 0),
  { message: 'either templateId or non-empty subtasks is required', path: ['subtasks'] },
);

const updateMissionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  context: z.record(z.any()).optional(),
  participants: z.array(z.string().min(1).max(200)).optional(),
  deadline: z.union([z.string(), z.date()]).optional().nullable(),
  metadata: z.record(z.any()).optional(),
});

const listMissionsSchema = z.object({
  status: z.enum(MISSION_STATUS).optional(),
  templateId: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const planMissionSchema = z.object({
  assignments: z.record(z.object({
    agentId: z.string().min(1).max(200),
    tenantId: z.string().min(1).max(200).optional(),
  })).optional(),
});

const subtaskResultSchema = z.object({
  result: z.any().optional(),
  assignedTenant: z.string().min(1).max(200).optional(),
});

const failSubtaskSchema = z.object({
  error: z.string().min(1).max(2000),
  assignedTenant: z.string().min(1).max(200).optional(),
});

const templateSubtaskSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(SUBTASK_TYPES),
  capability: z.string().min(1).max(200),
  inputs: z.record(z.any()).default({}),
  dependsOn: z.array(z.string().min(1).max(200)).default([]),
});

const createTemplateSchema = z.object({
  templateId: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).default(''),
  category: z.enum(TEMPLATE_CATEGORIES).default('general'),
  visibility: z.enum(TEMPLATE_VISIBILITY).default('PRIVATE'),
  version: z.string().max(50).default('1.0.0'),
  subtasks: z.array(templateSubtaskSchema).min(1),
  requiredInputs: z.array(z.string().min(1).max(200)).default([]),
  defaultContext: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({}),
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function badRequest(res, payload) {
  return res.status(400).json({
    error: payload.message || 'validation error',
    code: payload.code || 'MISSION_VALIDATION_ERROR',
    issues: payload.issues || undefined,
  });
}

function handleServiceError(res, err) {
  if (err.code === 'MISSION_VALIDATION_ERROR' || err.name === 'ValidationError') {
    return res.status(err.status || 400).json({ error: err.message, code: err.code, issues: err.issues });
  }
  if (err.code === 'MISSION_NOT_FOUND' || err.name === 'NotFoundError') {
    return res.status(err.status || 404).json({ error: err.message, code: err.code });
  }
  if (err.code === 'MISSION_INVALID_TRANSITION' || err.name === 'StateTransitionError') {
    return res.status(err.status || 422).json({ error: err.message, code: err.code, from: err.from, to: err.to });
  }
  // eslint-disable-next-line no-console
  console.error('[mission-planner] unhandled error:', err);
  return res.status(500).json({ error: err.message || 'internal error' });
}

// -----------------------------------------------------------------------------
// Health + meta
// -----------------------------------------------------------------------------

router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'nexha-mission-planner',
    version: '1.0.0',
    capabilities: [
      'missions-create',
      'missions-plan',
      'missions-execute',
      'missions-cancel',
      'subtasks-start',
      'subtasks-complete',
      'subtasks-fail',
      'subtasks-skip',
      'templates-list',
      'templates-create',
      'stats',
    ],
  });
});

router.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

router.get('/', (_req, res) => res.redirect('/health'));

// -----------------------------------------------------------------------------
// Validation (no persist)
// -----------------------------------------------------------------------------

router.post('/api/validate', optionalAuth, (req, res) => {
  const parsed = createMissionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, {
      message: 'invalid mission payload',
      code: 'MISSION_VALIDATION_ERROR',
      issues: parsed.error.issues,
    });
  }
  return res.json({ valid: true, mission: parsed.data });
});

// -----------------------------------------------------------------------------
// Missions — CRUD
// -----------------------------------------------------------------------------

router.post('/api/missions', requireAuth, async (req, res) => {
  const parsed = createMissionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid mission payload', code: 'MISSION_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  if (!tenantId) {
    return res.status(401).json({ error: 'tenantId required', code: 'MISSION_TENANT_REQUIRED' });
  }
  try {
    const mission = await missions.createMission(tenantId, parsed.data);
    return res.status(201).json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.get('/api/missions', requireAuth, async (req, res) => {
  const parsed = listMissionsSchema.safeParse(req.query || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid list query', code: 'MISSION_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  try {
    const result = await missions.listMissions(tenantId, parsed.data);
    return res.json(result);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.get('/api/missions/:missionId', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  const isInternal = !!(req.user && req.user.internal);
  try {
    const mission = await missions.getMission(tenantId, req.params.missionId, { crossTenant: isInternal });
    return res.json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.patch('/api/missions/:missionId', requireAuth, async (req, res) => {
  const parsed = updateMissionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid update payload', code: 'MISSION_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  try {
    const mission = await missions.updateMission(tenantId, req.params.missionId, parsed.data);
    return res.json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/missions/:missionId/plan', requireAuth, async (req, res) => {
  const parsed = planMissionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid plan payload', code: 'MISSION_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  // Build a resolver from the supplied assignments (subtaskId → {agentId,tenantId})
  // or from a capability-keyed map. If neither, default resolver (no-op) is used.
  const assignmentMap = parsed.data.assignments || {};
  const resolveAgent = async ({ subtaskId, capability }) => {
    if (subtaskId && assignmentMap[subtaskId]) {
      return {
        agentId: assignmentMap[subtaskId].agentId,
        tenantId: assignmentMap[subtaskId].tenantId || null,
      };
    }
    if (assignmentMap[capability]) {
      return {
        agentId: assignmentMap[capability].agentId,
        tenantId: assignmentMap[capability].tenantId || null,
      };
    }
    return null;
  };
  try {
    const mission = await missions.planMission(tenantId, req.params.missionId, { resolveAgent });
    return res.json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/missions/:missionId/start', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const mission = await missions.transitionMission(tenantId, req.params.missionId, 'EXECUTING');
    return res.json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/missions/:missionId/pause', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const mission = await missions.transitionMission(tenantId, req.params.missionId, 'PAUSED');
    return res.json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/missions/:missionId/cancel', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const mission = await missions.cancelMission(tenantId, req.params.missionId);
    return res.json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/missions/:missionId/retry', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const mission = await missions.transitionMission(tenantId, req.params.missionId, 'EXECUTING');
    return res.json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

// -----------------------------------------------------------------------------
// Subtasks
// -----------------------------------------------------------------------------

router.post('/api/missions/:missionId/subtasks/:subtaskId/start', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const mission = await missions.startSubtask(tenantId, req.params.missionId, req.params.subtaskId, req.body || {});
    return res.json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/missions/:missionId/subtasks/:subtaskId/complete', requireAuth, async (req, res) => {
  const parsed = subtaskResultSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid complete payload', code: 'MISSION_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  try {
    const mission = await missions.completeSubtask(tenantId, req.params.missionId, req.params.subtaskId, parsed.data);
    return res.json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/missions/:missionId/subtasks/:subtaskId/fail', requireAuth, async (req, res) => {
  const parsed = failSubtaskSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid fail payload', code: 'MISSION_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  try {
    const mission = await missions.failSubtask(tenantId, req.params.missionId, req.params.subtaskId, parsed.data);
    return res.json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/missions/:missionId/subtasks/:subtaskId/skip', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const mission = await missions.skipSubtask(tenantId, req.params.missionId, req.params.subtaskId);
    return res.json(mission);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

// -----------------------------------------------------------------------------
// Templates
// -----------------------------------------------------------------------------

router.get('/api/templates', optionalAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  const isInternal = !!(req.user && req.user.internal);
  const filter = {
    $or: [
      { visibility: 'PUBLIC', tenantId: null },
    ],
  };
  if (tenantId) filter.$or.push({ tenantId, visibility: 'PRIVATE' });
  if (isInternal) filter.$or.push({ tenantId: null });
  try {
    const items = await MissionTemplate.find(filter).sort({ name: 1 }).limit(200);
    return res.json({
      items: items.map((t) => t.toObject()),
      total: items.length,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.get('/api/templates/:templateId', optionalAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  const filter = {
    $or: [
      { templateId: req.params.templateId, tenantId: null },
    ],
  };
  if (tenantId) filter.$or.push({ templateId: req.params.templateId, tenantId, visibility: 'PRIVATE' });
  try {
    const tpl = await MissionTemplate.findOne(filter);
    if (!tpl) return res.status(404).json({ error: `Template not found: ${req.params.templateId}`, code: 'MISSION_NOT_FOUND' });
    return res.json(tpl.toObject());
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/templates', requireAuth, async (req, res) => {
  const parsed = createTemplateSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid template payload', code: 'MISSION_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  if (!tenantId) {
    return res.status(401).json({ error: 'tenantId required', code: 'MISSION_TENANT_REQUIRED' });
  }
  try {
    const tpl = await MissionTemplate.create({
      tenantId,
      templateId: parsed.data.templateId || randomUUID(),
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      visibility: parsed.data.visibility,
      version: parsed.data.version,
      subtasks: parsed.data.subtasks,
      requiredInputs: parsed.data.requiredInputs,
      defaultContext: parsed.data.defaultContext,
      metadata: parsed.data.metadata,
    });
    return res.status(201).json(tpl.toObject());
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'templateId already exists for this tenant', code: 'MISSION_CONFLICT' });
    }
    return handleServiceError(res, err);
  }
});

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

router.get('/api/stats', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const stats = await missions.getStats(tenantId);
    return res.json(stats);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

export default router;