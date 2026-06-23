/**
 * Mission service — create / plan / execute / track missions.
 *
 * Missions are composed of subtasks. Subtasks reference capabilities in
 * nexha-business-directory; the planner resolves them to specific agents
 * (assignedAgent + assignedTenant) when planning.
 *
 * Per ADR-0010 Phase 6 (2026-06-22): every mission carries a tenantId
 * for isolation, but subtasks may be assigned to agents of OTHER tenants
 * (cross-tenant composition is the whole point).
 *
 * Errors:
 *   - ValidationError (400)
 *   - NotFoundError (404)
 *   - StateTransitionError (422) — illegal mission/subtask status change
 */

import { randomUUID } from 'node:crypto';
import { Mission, MISSION_STATUS, SUBTASK_STATUS } from '../models/Mission.js';
import { MissionTemplate } from '../models/MissionTemplate.js';

export class ValidationError extends Error {
  constructor(message, issues) {
    let fullMessage = message;
    if (issues && typeof issues === 'object') {
      const details = Object.entries(issues)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
      if (details) fullMessage = `${message}: ${details}`;
    }
    super(fullMessage);
    this.name = 'ValidationError';
    this.status = 400;
    this.code = 'MISSION_VALIDATION_ERROR';
    this.issues = issues;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
    this.code = 'MISSION_NOT_FOUND';
  }
}

export class StateTransitionError extends Error {
  constructor(message, from, to) {
    super(message);
    this.name = 'StateTransitionError';
    this.status = 422;
    this.code = 'MISSION_INVALID_TRANSITION';
    this.from = from;
    this.to = to;
  }
}

function validateCreate(body) {
  if (!body || typeof body !== 'object') throw new ValidationError('Body required');
  const issues = {};
  if (typeof body.name !== 'string' || !body.name.trim()) issues.name = 'name is required';
  if (body.templateId !== undefined && typeof body.templateId !== 'string') {
    issues.templateId = 'templateId must be a string';
  }
  if (body.subtasks !== undefined && !Array.isArray(body.subtasks)) {
    issues.subtasks = 'subtasks must be an array';
  }
  if (body.priority !== undefined) {
    if (typeof body.priority !== 'number' || body.priority < 1 || body.priority > 10) {
      issues.priority = 'priority must be a number 1-10';
    }
  }
  // Either templateId or non-empty subtasks is required
  if (!body.templateId && (!Array.isArray(body.subtasks) || body.subtasks.length === 0)) {
    issues.subtasks = 'either templateId or a non-empty subtasks array is required';
  }
  if (Object.keys(issues).length) throw new ValidationError('Invalid mission body', issues);
}

function validateSubtaskInputs(subtask) {
  const issues = {};
  if (typeof subtask.name !== 'string' || !subtask.name.trim()) issues.name = 'subtask.name is required';
  if (typeof subtask.capability !== 'string' || !subtask.capability.trim()) {
    issues.capability = 'subtask.capability is required';
  }
  if (subtask.type !== undefined && typeof subtask.type !== 'string') {
    issues.type = 'subtask.type must be a string';
  }
  if (subtask.dependsOn !== undefined && !Array.isArray(subtask.dependsOn)) {
    issues.dependsOn = 'subtask.dependsOn must be an array';
  }
  if (Object.keys(issues).length) throw new ValidationError('Invalid subtask', issues);
}

// Valid mission status transitions
const MISSION_TRANSITIONS = {
  DRAFT: ['PLANNED', 'CANCELLED'],
  PLANNED: ['EXECUTING', 'DRAFT', 'CANCELLED'],
  EXECUTING: ['PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'],
  PAUSED: ['EXECUTING', 'CANCELLED'],
  COMPLETED: [],   // terminal
  FAILED: ['EXECUTING', 'CANCELLED'],   // can retry
  CANCELLED: [],   // terminal
};

function assertMissionTransition(from, to) {
  if (!MISSION_TRANSITIONS[from]) {
    throw new StateTransitionError(`Unknown mission status: ${from}`, from, to);
  }
  if (!MISSION_TRANSITIONS[from].includes(to)) {
    throw new StateTransitionError(
      `Cannot transition mission from ${from} to ${to}`,
      from, to,
    );
  }
}

// Valid subtask status transitions
const SUBTASK_TRANSITIONS = {
  PENDING: ['ASSIGNED', 'SKIPPED', 'FAILED'],
  ASSIGNED: ['IN_PROGRESS', 'BLOCKED', 'FAILED', 'SKIPPED'],
  IN_PROGRESS: ['COMPLETED', 'FAILED', 'BLOCKED'],
  BLOCKED: ['IN_PROGRESS', 'FAILED'],
  COMPLETED: [],     // terminal
  FAILED: ['PENDING', 'SKIPPED'],   // can retry
  SKIPPED: [],       // terminal
};

function assertSubtaskTransition(from, to) {
  if (!SUBTASK_TRANSITIONS[from]) {
    throw new StateTransitionError(`Unknown subtask status: ${from}`, from, to);
  }
  if (!SUBTASK_TRANSITIONS[from].includes(to)) {
    throw new StateTransitionError(
      `Cannot transition subtask from ${from} to ${to}`,
      from, to,
    );
  }
}

/**
 * Create a new mission. If a templateId is supplied, the subtasks are
 * copied from the template (after input substitution); otherwise the
 * caller must supply subtasks directly.
 */
export async function createMission(tenantId, body) {
  validateCreate(body);

  let subtasks = [];
  let templateVersion = body.templateVersion || '1.0.0';

  if (body.templateId) {
    const tpl = await MissionTemplate.findOne({
      $or: [
        { templateId: body.templateId, tenantId: null },
        { tenantId, templateId: body.templateId },
      ],
    });
    if (!tpl) throw new NotFoundError(`Template not found: ${body.templateId}`);
    if (tpl.visibility === 'PRIVATE' && tpl.tenantId && tpl.tenantId !== tenantId) {
      throw new NotFoundError(`Template not found: ${body.templateId}`);
    }
    subtasks = (tpl.subtasks || []).map((s) => ({
      subtaskId: randomUUID(),
      name: s.name,
      type: s.type,
      capability: s.capability,
      inputs: substituteInputs(s.inputs, body.context || {}),
      dependsOn: [...(s.dependsOn || [])],
      status: 'PENDING',
      retryCount: 0,
    }));
    templateVersion = tpl.version;
  } else if (Array.isArray(body.subtasks)) {
    subtasks = body.subtasks.map((s) => {
      validateSubtaskInputs(s);
      return {
        subtaskId: randomUUID(),
        name: s.name,
        type: s.type || 'custom',
        capability: s.capability,
        inputs: s.inputs || {},
        dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn : [],
        status: 'PENDING',
        retryCount: 0,
      };
    });
  }

  const mission = await Mission.create({
    tenantId,
    missionId: body.missionId || randomUUID(),
    name: body.name.trim(),
    description: body.description || '',
    templateId: body.templateId || null,
    templateVersion,
    status: 'DRAFT',
    priority: typeof body.priority === 'number' ? body.priority : 5,
    subtasks,
    context: body.context || {},
    participants: Array.isArray(body.participants) ? body.participants : [],
    deadline: body.deadline || null,
    metadata: body.metadata || {},
  });
  return mission.toObject();
}

/**
 * Substitute {{placeholder}} tokens in a template input object with
 * values from the caller's context.
 */
function substituteInputs(inputs, context) {
  if (!inputs || typeof inputs !== 'object') return inputs;
  if (Array.isArray(inputs)) return inputs.map((v) => substituteInputs(v, context));
  const out = {};
  for (const [k, v] of Object.entries(inputs)) {
    if (typeof v === 'string') {
      out[k] = v.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, key) => {
        return context[key] !== undefined ? String(context[key]) : `{{${key}}}`;
      });
    } else if (v && typeof v === 'object') {
      out[k] = substituteInputs(v, context);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Update a mission (only allowed in DRAFT / PLANNED / PAUSED).
 */
export async function updateMission(tenantId, missionId, body) {
  const mission = await Mission.findOne({ tenantId, missionId });
  if (!mission) throw new NotFoundError(`Mission not found: ${missionId}`);
  if (['EXECUTING', 'COMPLETED', 'CANCELLED'].includes(mission.status)) {
    throw new StateTransitionError(`Cannot update mission in status ${mission.status}`, mission.status, 'update');
  }
  const fields = ['name', 'description', 'priority', 'context', 'participants', 'deadline', 'metadata'];
  for (const f of fields) if (body[f] !== undefined) mission[f] = body[f];
  await mission.save();
  return mission.toObject();
}

/**
 * Get a mission. Cross-tenant reads are allowed for any participant, or
 * unconditionally when options.crossTenant is true (used by internal callers).
 */
export async function getMission(tenantId, missionId, options = {}) {
  const mission = await Mission.findOne({ missionId });
  if (!mission) throw new NotFoundError(`Mission not found: ${missionId}`);
  if (options.crossTenant) return mission.toObject();
  // Same tenant: always allowed
  if (mission.tenantId === tenantId) return mission.toObject();
  // Different tenant: only if caller is a participant
  if (Array.isArray(mission.participants) && mission.participants.includes(tenantId)) {
    return mission.toObject();
  }
  throw new NotFoundError(`Mission not found: ${missionId}`);
}

/**
 * List missions owned by a tenant (with filters).
 */
export async function listMissions(tenantId, query = {}) {
  const { status, templateId, limit = 50, offset = 0 } = query;
  const filter = { tenantId };
  if (status) filter.status = status;
  if (templateId) filter.templateId = templateId;
  const cap = Math.min(Math.max(limit, 1), 200);
  const [items, total] = await Promise.all([
    Mission.find(filter).sort({ createdAt: -1 }).skip(Math.max(offset, 0)).limit(cap),
    Mission.countDocuments(filter),
  ]);
  return {
    items: items.map((d) => d.toObject()),
    total,
    limit: cap,
    offset: Math.max(offset, 0),
  };
}

/**
 * Transition a mission to a new status. Validates the transition is legal.
 */
export async function transitionMission(tenantId, missionId, toStatus, options = {}) {
  const mission = await Mission.findOne({ tenantId, missionId });
  if (!mission) throw new NotFoundError(`Mission not found: ${missionId}`);
  if (mission.status === toStatus) return mission.toObject();   // no-op
  assertMissionTransition(mission.status, toStatus);
  mission.status = toStatus;
  if (toStatus === 'EXECUTING' && !mission.startedAt) mission.startedAt = new Date();
  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(toStatus)) mission.completedAt = new Date();
  await mission.save();
  return mission.toObject();
}

/**
 * Plan a mission: resolves each subtask's `assignedAgent` + `assignedTenant`
 * from a `resolveAgent` function. The default resolver uses a round-robin
 * across known agents — the caller can pass a custom resolver (e.g., to
 * query nexha-business-directory).
 */
export async function planMission(tenantId, missionId, options = {}) {
  const mission = await Mission.findOne({ tenantId, missionId });
  if (!mission) throw new NotFoundError(`Mission not found: ${missionId}`);
  if (mission.status !== 'DRAFT') {
    throw new StateTransitionError(`Can only plan a DRAFT mission (current: ${mission.status})`, mission.status, 'PLANNED');
  }
  const resolver = options.resolveAgent || defaultAgentResolver;
  const participants = new Set(mission.participants || []);
  // The mission owner is always a participant
  participants.add(tenantId);
  for (const st of mission.subtasks) {
    if (st.status !== 'PENDING') continue;
    const resolved = await resolver({
      missionId,
      capability: st.capability,
      subtaskType: st.type,
      tenantId,
    });
    if (resolved && resolved.agentId) {
      st.assignedAgent = resolved.agentId;
      st.assignedTenant = resolved.tenantId || null;
      if (resolved.tenantId) participants.add(resolved.tenantId);
    }
    st.status = 'ASSIGNED';
  }
  mission.participants = Array.from(participants);
  mission.status = 'PLANNED';
  await mission.save();
  return mission.toObject();
}

/**
 * Default resolver — returns null (no agent matched). Tests pass a custom
 * resolver. In production, callers should pass a resolver that queries
 * nexha-business-directory.
 */
async function defaultAgentResolver(_query) {
  return null;
}

/**
 * Mark a subtask as started (PENDING|ASSIGNED|BLOCKED → IN_PROGRESS).
 * Optionally takes the tenantId of the agent performing the work.
 */
export async function startSubtask(tenantId, missionId, subtaskId, body = {}) {
  const mission = await Mission.findOne({ tenantId, missionId });
  if (!mission) throw new NotFoundError(`Mission not found: ${missionId}`);
  if (mission.status === 'COMPLETED' || mission.status === 'CANCELLED') {
    throw new StateTransitionError(`Mission is ${mission.status}, cannot start subtask`, mission.status, 'EXECUTING');
  }
  const subtask = mission.subtasks.find((s) => s.subtaskId === subtaskId);
  if (!subtask) throw new NotFoundError(`Subtask not found: ${subtaskId}`);
  assertSubtaskTransition(subtask.status, 'IN_PROGRESS');
  // Check dependencies
  for (const depId of subtask.dependsOn || []) {
    const dep = mission.subtasks.find((s) => s.subtaskId === depId);
    if (!dep) throw new ValidationError(`Unknown dependency: ${depId}`);
    if (dep.status !== 'COMPLETED' && dep.status !== 'SKIPPED') {
      throw new StateTransitionError(`Subtask ${subtaskId} blocked by ${depId} (status ${dep.status})`, dep.status, 'COMPLETED');
    }
  }
  subtask.status = 'IN_PROGRESS';
  subtask.startedAt = new Date();
  if (body.assignedTenant) subtask.assignedTenant = body.assignedTenant;
  // Auto-promote mission to EXECUTING on first subtask start
  if (mission.status === 'DRAFT' || mission.status === 'PLANNED') {
    mission.status = 'EXECUTING';
    if (!mission.startedAt) mission.startedAt = new Date();
  }
  await mission.save();
  return mission.toObject();
}

/**
 * Mark a subtask as completed with a result.
 */
export async function completeSubtask(tenantId, missionId, subtaskId, body = {}) {
  const mission = await Mission.findOne({ tenantId, missionId });
  if (!mission) throw new NotFoundError(`Mission not found: ${missionId}`);
  const subtask = mission.subtasks.find((s) => s.subtaskId === subtaskId);
  if (!subtask) throw new NotFoundError(`Subtask not found: ${subtaskId}`);
  assertSubtaskTransition(subtask.status, 'COMPLETED');
  subtask.status = 'COMPLETED';
  subtask.completedAt = new Date();
  if (body.result !== undefined) subtask.result = body.result;
  if (body.assignedTenant) subtask.assignedTenant = body.assignedTenant;
  // Auto-complete mission if all subtasks are terminal
  const allTerminal = mission.subtasks.every((s) => ['COMPLETED', 'SKIPPED'].includes(s.status));
  if (allTerminal) {
    mission.status = 'COMPLETED';
    mission.completedAt = new Date();
  }
  await mission.save();
  return mission.toObject();
}

/**
 * Mark a subtask as failed.
 */
export async function failSubtask(tenantId, missionId, subtaskId, body = {}) {
  const mission = await Mission.findOne({ tenantId, missionId });
  if (!mission) throw new NotFoundError(`Mission not found: ${missionId}`);
  const subtask = mission.subtasks.find((s) => s.subtaskId === subtaskId);
  if (!subtask) throw new NotFoundError(`Subtask not found: ${subtaskId}`);
  assertSubtaskTransition(subtask.status, 'FAILED');
  subtask.status = 'FAILED';
  subtask.completedAt = new Date();
  subtask.error = body.error || 'Unknown error';
  subtask.retryCount = (subtask.retryCount || 0) + 1;
  // Mission goes to FAILED only if no other IN_PROGRESS subtasks remain
  const stillActive = mission.subtasks.some((s) => s.status === 'IN_PROGRESS' || s.status === 'ASSIGNED');
  if (!stillActive) {
    mission.status = 'FAILED';
    mission.completedAt = new Date();
  }
  await mission.save();
  return mission.toObject();
}

/**
 * Skip a subtask (admin action; marks as SKIPPED, doesn't fail the mission).
 */
export async function skipSubtask(tenantId, missionId, subtaskId) {
  const mission = await Mission.findOne({ tenantId, missionId });
  if (!mission) throw new NotFoundError(`Mission not found: ${missionId}`);
  const subtask = mission.subtasks.find((s) => s.subtaskId === subtaskId);
  if (!subtask) throw new NotFoundError(`Subtask not found: ${subtaskId}`);
  assertSubtaskTransition(subtask.status, 'SKIPPED');
  subtask.status = 'SKIPPED';
  subtask.completedAt = new Date();
  const allTerminal = mission.subtasks.every((s) => ['COMPLETED', 'SKIPPED'].includes(s.status));
  if (allTerminal) {
    mission.status = 'COMPLETED';
    mission.completedAt = new Date();
  }
  await mission.save();
  return mission.toObject();
}

/**
 * Cancel a mission (terminal). Works from DRAFT/PLANNED/EXECUTING/PAUSED.
 */
export async function cancelMission(tenantId, missionId) {
  return transitionMission(tenantId, missionId, 'CANCELLED');
}

/**
 * Per-tenant mission stats.
 */
export async function getStats(tenantId) {
  const [byStatus, byTemplate, total] = await Promise.all([
    Mission.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    Mission.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$templateId', n: { $sum: 1 } } },
    ]),
    Mission.countDocuments({ tenantId }),
  ]);
  return {
    total,
    byStatus: Object.fromEntries(byStatus.map((r) => [r._id, r.n])),
    byTemplate: Object.fromEntries(byTemplate.map((r) => [r._id, r.n])),
  };
}

export { MISSION_STATUS, SUBTASK_STATUS };