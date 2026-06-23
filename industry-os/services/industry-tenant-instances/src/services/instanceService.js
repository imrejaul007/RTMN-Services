/**
 * Industry OS Instance service layer.
 *
 * Manages the lifecycle of per-tenant Industry OS shards:
 *   PROVISIONING → ACTIVE → SUSPENDED → ACTIVE → DESTROYING → DESTROYED
 *                                                          → FAILED
 *
 * Errors:
 *   - ValidationError (400) — bad input
 *   - NotFoundError (404) — missing instance
 *   - StateTransitionError (422) — illegal state change
 *   - ConflictError (409) — duplicate tenant/industry pair
 *
 * ADR-0010 Phase 10 (2026-06-22).
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  IndustryInstance,
  INDUSTRY_STATUSES,
  ISOLATION_LEVELS,
  SUPPORTED_INDUSTRIES,
} from '../models/IndustryInstance.js';
import { UsageMetric } from '../models/UsageMetric.js';

// =====================================================
// Errors
// =====================================================

export class ValidationError extends Error {
  constructor(message, issues = {}) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class StateTransitionError extends Error {
  constructor(message, from, to) {
    super(message);
    this.name = 'StateTransitionError';
    this.from = from;
    this.to = to;
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

// =====================================================
// State machine
// =====================================================

const INSTANCE_TRANSITIONS = {
  PROVISIONING: ['ACTIVE', 'SUSPENDED', 'DESTROYING', 'FAILED'],
  ACTIVE:       ['SUSPENDED', 'DESTROYING', 'FAILED'],
  SUSPENDED:    ['ACTIVE', 'DESTROYING', 'FAILED'],
  DESTROYING:   ['DESTROYED', 'FAILED'],
  DESTROYED:    [],
  FAILED:       ['DESTROYING'],
};

function assertTransition(from, to) {
  if (!INSTANCE_TRANSITIONS[from]) {
    throw new StateTransitionError(`Unknown instance status: ${from}`, from, to);
  }
  if (from === to) {
    // Same-state transitions are always errors (no-ops).
    throw new StateTransitionError(
      `Instance already in status ${from}; cannot transition to ${to}`,
      from,
      to,
    );
  }
  if (!INSTANCE_TRANSITIONS[from].includes(to)) {
    throw new StateTransitionError(
      `Illegal instance transition: ${from} → ${to}. Allowed: [${INSTANCE_TRANSITIONS[from].join(', ')}]`,
      from,
      to,
    );
  }
}

// =====================================================
// Helpers
// =====================================================

function newId(prefix) {
  return `${prefix}_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function stripApiKeyHash(o) {
  if (!o) return o;
  const { apiKeyHash, ...rest } = o;
  return rest;
}

// =====================================================
// Provisioning
// =====================================================

export async function provisionInstance(body) {
  if (!body || !body.tenantId) {
    throw new ValidationError('Invalid input', { tenantId: 'required' });
  }
  if (!body.industry) {
    throw new ValidationError('Invalid input', { industry: 'required' });
  }
  if (!SUPPORTED_INDUSTRIES.includes(body.industry)) {
    throw new ValidationError(
      `Invalid industry: ${body.industry}. Allowed: ${SUPPORTED_INDUSTRIES.join(', ')}`,
      { industry: 'invalid' },
    );
  }
  if (body.isolationLevel && !ISOLATION_LEVELS.includes(body.isolationLevel)) {
    throw new ValidationError(
      `Invalid isolationLevel: ${body.isolationLevel}. Allowed: ${ISOLATION_LEVELS.join(', ')}`,
      { isolationLevel: 'invalid' },
    );
  }

  // One active instance per tenant+industry pair.
  const existing = await IndustryInstance.findOne({
    tenantId: body.tenantId,
    industry: body.industry,
    status: { $in: ['PROVISIONING', 'ACTIVE', 'SUSPENDED'] },
  });
  if (existing) {
    throw new ConflictError(
      `Tenant ${body.tenantId} already has ${body.industry} instance ${existing.instanceId} (status ${existing.status})`,
    );
  }

  const instanceId = body.instanceId || newId('iti');
  const namespace = body.namespace || `industry_${slugify(body.industry)}_${slugify(body.tenantId)}`;
  const isolationLevel = body.isolationLevel || 'SHARED';
  const apiKey = body.apiKey || `ik_${crypto.randomBytes(24).toString('hex')}`;

  const limits = {
    maxApiCallsPerMinute: body.limits?.maxApiCallsPerMinute ?? 600,
    maxRecordsPerTenant: body.limits?.maxRecordsPerTenant ?? 100000,
    storageMbLimit: body.limits?.storageMbLimit ?? 1024,
    maxConcurrentWorkflows: body.limits?.maxConcurrentWorkflows ?? 50,
  };

  const databaseUri = isolationLevel === 'SHARED'
    ? null
    : (body.databaseUri || `mongodb://localhost:27017/${namespace}`);

  const compliance = body.compliance || {};
  if (compliance.framework) {
    compliance.auditLogEnabled = compliance.auditLogEnabled !== false;
    compliance.encryptionAtRest = compliance.encryptionAtRest !== false;
    compliance.encryptionInTransit = compliance.encryptionInTransit !== false;
  }

  const now = new Date();
  const doc = {
    instanceId,
    tenantId: body.tenantId,
    industry: body.industry,
    status: 'PROVISIONING',
    isolationLevel,
    region: body.region || 'global',
    namespace,
    databaseUri,
    apiKeyHash: hashToken(apiKey),
    limits,
    compliance,
    routes: Array.isArray(body.routes)
      ? body.routes.map((r) => ({
          pathPrefix: String(r.pathPrefix || ''),
          upstreamUrl: String(r.upstreamUrl || ''),
          enabled: r.enabled !== false,
        }))
      : [],
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    metadata: body.metadata || {},
    provisionedAt: now,
  };

  try {
    const created = await IndustryInstance.create(doc);
    // Auto-activate SHARED instances (no infra to provision) or when caller opts in.
    const wantsAutoActivate = body.autoActivate === true;
    if (wantsAutoActivate || isolationLevel === 'SHARED') {
      created.status = 'ACTIVE';
      await created.save();
    }
    const obj = created.toObject();
    delete obj.apiKeyHash;
    return { ...obj, _apiKey: apiKey };
  } catch (err) {
    if (err && err.code === 11000) {
      throw new ConflictError(`Duplicate instanceId: ${instanceId}`);
    }
    throw err;
  }
}

// =====================================================
// Read / List
// =====================================================

export async function getInstance(instanceId) {
  const inst = await IndustryInstance.findOne({ instanceId });
  if (!inst) throw new NotFoundError(`Instance not found: ${instanceId}`);
  return stripApiKeyHash(inst.toObject());
}

export async function getInstanceByTenant(tenantId, industry) {
  const filter = {
    tenantId,
    status: { $in: ['PROVISIONING', 'ACTIVE', 'SUSPENDED'] },
  };
  if (industry) filter.industry = industry;
  const inst = await IndustryInstance.findOne(filter);
  if (!inst) throw new NotFoundError(`No active instance for tenant ${tenantId}${industry ? ` (${industry})` : ''}`);
  return stripApiKeyHash(inst.toObject());
}

export async function listInstances(query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.tenantId) filter.tenantId = query.tenantId;
  if (query.industry) filter.industry = query.industry;
  if (query.isolationLevel) filter.isolationLevel = query.isolationLevel;
  if (query.region) filter.region = query.region;
  if (query.complianceFramework) filter['compliance.framework'] = query.complianceFramework;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  const [rows, total] = await Promise.all([
    IndustryInstance.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    IndustryInstance.countDocuments(filter),
  ]);
  return { instances: rows.map(stripApiKeyHash), total, limit, offset };
}

// =====================================================
// Lifecycle actions
// =====================================================

export async function suspendInstance(instanceId, reason = null) {
  const inst = await IndustryInstance.findOne({ instanceId });
  if (!inst) throw new NotFoundError(`Instance not found: ${instanceId}`);
  assertTransition(inst.status, 'SUSPENDED');
  inst.status = 'SUSPENDED';
  inst.suspendedAt = new Date();
  if (reason) inst.metadata = { ...(inst.metadata || {}), suspensionReason: reason };
  await inst.save();
  return stripApiKeyHash(inst.toObject());
}

export async function resumeInstance(instanceId) {
  const inst = await IndustryInstance.findOne({ instanceId });
  if (!inst) throw new NotFoundError(`Instance not found: ${instanceId}`);
  assertTransition(inst.status, 'ACTIVE');
  inst.status = 'ACTIVE';
  inst.suspendedAt = null;
  await inst.save();
  return stripApiKeyHash(inst.toObject());
}

export async function destroyInstance(instanceId, reason = null) {
  const inst = await IndustryInstance.findOne({ instanceId });
  if (!inst) throw new NotFoundError(`Instance not found: ${instanceId}`);
  assertTransition(inst.status, 'DESTROYING');
  inst.status = 'DESTROYING';
  if (reason) inst.metadata = { ...(inst.metadata || {}), destructionReason: reason };
  await inst.save();
  // Mark DESTROYED in the same call (real impl would do infra cleanup async).
  inst.status = 'DESTROYED';
  inst.destroyedAt = new Date();
  await inst.save();
  return stripApiKeyHash(inst.toObject());
}

export async function markInstanceFailed(instanceId, reason = null) {
  const inst = await IndustryInstance.findOne({ instanceId });
  if (!inst) throw new NotFoundError(`Instance not found: ${instanceId}`);
  assertTransition(inst.status, 'FAILED');
  inst.status = 'FAILED';
  if (reason) inst.metadata = { ...(inst.metadata || {}), failureReason: reason };
  await inst.save();
  return stripApiKeyHash(inst.toObject());
}

// =====================================================
// Configuration
// =====================================================

export async function updateInstance(instanceId, patch) {
  const inst = await IndustryInstance.findOne({ instanceId });
  if (!inst) throw new NotFoundError(`Instance not found: ${instanceId}`);
  if (!patch || Object.keys(patch).length === 0) {
    throw new ValidationError('No fields to update');
  }
  if (inst.status === 'DESTROYED' || inst.status === 'DESTROYING') {
    throw new StateTransitionError(
      `Cannot update instance in status ${inst.status}`,
      inst.status,
      'update',
    );
  }
  if (patch.isolationLevel && !ISOLATION_LEVELS.includes(patch.isolationLevel)) {
    throw new ValidationError(
      `Invalid isolationLevel: ${patch.isolationLevel}. Allowed: ${ISOLATION_LEVELS.join(', ')}`,
      { isolationLevel: 'invalid' },
    );
  }
  if (patch.industry && !SUPPORTED_INDUSTRIES.includes(patch.industry)) {
    throw new ValidationError(
      `Invalid industry: ${patch.industry}`,
      { industry: 'invalid' },
    );
  }
  if (patch.limits) {
    inst.limits = {
      maxApiCallsPerMinute: patch.limits.maxApiCallsPerMinute ?? inst.limits.maxApiCallsPerMinute,
      maxRecordsPerTenant: patch.limits.maxRecordsPerTenant ?? inst.limits.maxRecordsPerTenant,
      storageMbLimit: patch.limits.storageMbLimit ?? inst.limits.storageMbLimit,
      maxConcurrentWorkflows: patch.limits.maxConcurrentWorkflows ?? inst.limits.maxConcurrentWorkflows,
    };
  }
  if (patch.compliance) {
    inst.compliance = { ...(inst.compliance || {}), ...patch.compliance };
  }
  if (patch.region !== undefined) inst.region = patch.region;
  if (patch.tags !== undefined) inst.tags = Array.isArray(patch.tags) ? patch.tags.map(String) : [];
  if (patch.metadata !== undefined) inst.metadata = patch.metadata;
  if (patch.routes !== undefined) {
    inst.routes = patch.routes.map((r) => ({
      pathPrefix: String(r.pathPrefix || ''),
      upstreamUrl: String(r.upstreamUrl || ''),
      enabled: r.enabled !== false,
    }));
  }
  await inst.save();
  return stripApiKeyHash(inst.toObject());
}

export async function rotateApiKey(instanceId) {
  const inst = await IndustryInstance.findOne({ instanceId });
  if (!inst) throw new NotFoundError(`Instance not found: ${instanceId}`);
  if (['DESTROYING', 'DESTROYED'].includes(inst.status)) {
    throw new StateTransitionError(
      `Cannot rotate API key on instance in status ${inst.status}`,
      inst.status,
      'rotate',
    );
  }
  const newKey = `ik_${crypto.randomBytes(24).toString('hex')}`;
  inst.apiKeyHash = hashToken(newKey);
  await inst.save();
  return { instanceId, _apiKey: newKey };
}

// =====================================================
// Health
// =====================================================

export async function recordHealthCheck(instanceId, status = 'healthy') {
  if (!['healthy', 'degraded', 'unhealthy', 'unknown'].includes(status)) {
    throw new ValidationError(`Invalid health status: ${status}`);
  }
  const inst = await IndustryInstance.findOne({ instanceId });
  if (!inst) throw new NotFoundError(`Instance not found: ${instanceId}`);
  inst.lastHealthCheckAt = new Date();
  inst.healthCheckStatus = status;
  await inst.save();
  return stripApiKeyHash(inst.toObject());
}

// =====================================================
// Usage metrics
// =====================================================

export async function recordUsage(instanceId, event) {
  const inst = await IndustryInstance.findOne({ instanceId });
  if (!inst) throw new NotFoundError(`Instance not found: ${instanceId}`);
  const date = todayIso();
  const inc = {};
  if (event.apiCalls != null) inc.apiCalls = Number(event.apiCalls);
  if (event.recordsCreated != null) inc.recordsCreated = Number(event.recordsCreated);
  if (event.recordsUpdated != null) inc.recordsUpdated = Number(event.recordsUpdated);
  if (event.workflowsExecuted != null) inc.workflowsExecuted = Number(event.workflowsExecuted);
  if (event.errorCount != null) inc.errorCount = Number(event.errorCount);
  const set = {};
  if (event.recordsActive != null) set.recordsActive = Number(event.recordsActive);
  if (event.storageMbUsed != null) set.storageMbUsed = Number(event.storageMbUsed);

  await UsageMetric.findOneAndUpdate(
    { instanceId, date },
    {
      $inc: inc,
      $set: { ...set, tenantId: inst.tenantId, industry: inst.industry },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, new: true },
  );
  return getUsage(instanceId, { date });
}

export async function getUsage(instanceId, query = {}) {
  const inst = await IndustryInstance.findOne({ instanceId });
  if (!inst) throw new NotFoundError(`Instance not found: ${instanceId}`);
  const end = query.date || todayIso();
  const start = query.startDate || (() => {
    const d = new Date(end);
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  })();
  const rows = await UsageMetric.find({
    instanceId,
    date: { $gte: start, $lte: end },
  }).sort({ date: 1 }).lean();
  return { instanceId, tenantId: inst.tenantId, industry: inst.industry, start, end, metrics: rows };
}

// =====================================================
// Limit enforcement
// =====================================================

export async function checkLimits(instanceId) {
  const inst = await IndustryInstance.findOne({ instanceId });
  if (!inst) throw new NotFoundError(`Instance not found: ${instanceId}`);
  const date = todayIso();
  const today = await UsageMetric.findOne({ instanceId, date });
  const violations = [];
  if (today) {
    if (today.apiCalls > inst.limits.maxApiCallsPerMinute * 1440) {
      violations.push({ metric: 'apiCalls', limit: inst.limits.maxApiCallsPerMinute * 1440, actual: today.apiCalls });
    }
    if (today.recordsActive > inst.limits.maxRecordsPerTenant) {
      violations.push({ metric: 'recordsActive', limit: inst.limits.maxRecordsPerTenant, actual: today.recordsActive });
    }
    if (today.storageMbUsed > inst.limits.storageMbLimit) {
      violations.push({ metric: 'storageMbUsed', limit: inst.limits.storageMbLimit, actual: today.storageMbUsed });
    }
  }
  if (inst.status === 'SUSPENDED') {
    violations.push({ metric: 'status', limit: 'ACTIVE', actual: 'SUSPENDED' });
  }
  return { instanceId, status: inst.status, limits: inst.limits, violations };
}

// =====================================================
// Aggregated stats
// =====================================================

export async function getStats(query = {}) {
  const filter = {};
  if (query.industry) filter.industry = query.industry;

  const [byStatus, byIndustry, byIsolation, recent] = await Promise.all([
    IndustryInstance.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    IndustryInstance.aggregate([
      { $match: filter },
      { $group: { _id: '$industry', count: { $sum: 1 } } },
    ]),
    IndustryInstance.aggregate([
      { $match: filter },
      { $group: { _id: '$isolationLevel', count: { $sum: 1 } } },
    ]),
    UsageMetric.aggregate([
      { $group: {
          _id: null,
          totalApiCalls: { $sum: '$apiCalls' },
          totalRecordsCreated: { $sum: '$recordsCreated' },
          totalWorkflowsExecuted: { $sum: '$workflowsExecuted' },
          totalErrors: { $sum: '$errorCount' },
      } },
    ]),
  ]);

  const statusMap = {};
  for (const r of byStatus) statusMap[r._id] = r.count;
  const industryMap = {};
  for (const r of byIndustry) industryMap[r._id] = r.count;
  const isolationMap = {};
  for (const r of byIsolation) isolationMap[r._id] = r.count;
  const totals = recent[0] || {};

  return {
    instances: {
      total: byStatus.reduce((s, r) => s + r.count, 0),
      byStatus: statusMap,
      byIndustry: industryMap,
      byIsolation: isolationMap,
    },
    usage: {
      totalApiCalls: totals.totalApiCalls || 0,
      totalRecordsCreated: totals.totalRecordsCreated || 0,
      totalWorkflowsExecuted: totals.totalWorkflowsExecuted || 0,
      totalErrors: totals.totalErrors || 0,
    },
  };
}

export { INDUSTRY_STATUSES, ISOLATION_LEVELS, SUPPORTED_INDUSTRIES };