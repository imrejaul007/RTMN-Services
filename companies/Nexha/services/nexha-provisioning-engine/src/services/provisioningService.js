/**
 * provisioningService — business logic for declarative provisioning.
 *
 * Generates ProvisioningPlans from tenant instance descriptors. Does NOT
 * call K8s/AWS — that's the orchestrator's job. The engine emits plans;
 * orchestrators consume them via the /api/plans/:id/apply callback or
 * the GET /api/plans/:id/plan.json download.
 *
 * State machine (assertTransition enforces this):
 *   PENDING    → APPLYING | CANCELLED
 *   APPLYING   → READY | FAILED | CANCELLED
 *   READY      → RECONCILING | DESTROYING | CANCELLED
 *   RECONCILING→ READY | FAILED
 *   DESTROYING → DESTROYED | FAILED
 *   FAILED     → DESTROYING | CANCELLED
 *   DESTROYED  → (terminal)
 *   CANCELLED  → (terminal)
 */

import crypto from 'node:crypto';
import yaml from 'js-yaml';
import { ProvisioningPlan, RESOURCE_KIND_LIST } from '../models/ProvisioningPlan.js';
import { PlanEvent } from '../models/PlanEvent.js';

export class StateTransitionError extends Error {
  constructor({ from, to, reason = 'invalid transition' }) {
    super(`cannot transition ${from} → ${to}: ${reason}`);
    this.name = 'StateTransitionError';
    this.from = from;
    this.to = to;
    this.statusCode = 422;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

const ALLOWED = {
  PENDING: new Set(['APPLYING', 'CANCELLED']),
  APPLYING: new Set(['READY', 'FAILED', 'CANCELLED']),
  READY: new Set(['RECONCILING', 'DESTROYING', 'CANCELLED']),
  RECONCILING: new Set(['READY', 'FAILED']),
  DESTROYING: new Set(['DESTROYED', 'FAILED']),
  FAILED: new Set(['DESTROYING', 'CANCELLED']),
  DESTROYED: new Set(),
  CANCELLED: new Set(),
};

const TERMINAL = new Set(['DESTROYED', 'CANCELLED']);

export function assertTransition(from, to) {
  if (from === to) {
    throw new StateTransitionError({ from, to, reason: 'same-state transition is a no-op' });
  }
  const allowed = ALLOWED[from] || new Set();
  if (!allowed.has(to)) {
    throw new StateTransitionError({ from, to });
  }
}

function genPlanId() {
  return 'pln_' + crypto.randomBytes(8).toString('hex');
}

function genResourceName(prefix, kind) {
  const suffix = crypto.randomBytes(3).toString('hex');
  const short = kind.split('.').pop();
  return `${prefix}-${short}-${suffix}`;
}

/**
 * Build a default resource set for an instance descriptor.
 * Mirrors the isolation level into resource kinds.
 */
export function buildResources({ instanceId, isolationLevel, region, metadata = {} }) {
  const resources = [];

  if (isolationLevel === 'SHARED') {
    // SHARED: just a logical namespace + tenant config
    resources.push({
      name: genResourceName(instanceId, 'secret.kubernetes.secret'),
      kind: 'secret.kubernetes.secret',
      spec: {
        namespace: `rtmn-shared-${instanceId}`,
        type: 'Opaque',
        data: { tenantId: instanceId, isolation: 'SHARED' },
      },
      dependsOn: [],
    });
    return resources;
  }

  // DEDICATED or ISOLATED: real compute + DB
  resources.push({
    name: genResourceName(instanceId, 'deployment'),
    kind: 'compute.k8s.deployment',
    spec: {
      namespace: `rtmn-${instanceId}`,
      image: 'rtmn/industry-os:latest',
      replicas: isolationLevel === 'ISOLATED' ? 3 : 1,
      env: {
        TENANT_ID: instanceId,
        ISOLATION: isolationLevel,
        REGION: region,
      },
    },
    dependsOn: [],
  });

  resources.push({
    name: genResourceName(instanceId, 'service'),
    kind: 'compute.k8s.service',
    spec: {
      selector: { app: instanceId },
      ports: [{ port: 80, targetPort: 8080 }],
    },
    dependsOn: [resources[resources.length - 1].name],
  });

  resources.push({
    name: genResourceName(instanceId, 'ingress'),
    kind: 'compute.k8s.ingress',
    spec: {
      host: `${instanceId}.rtmn.local`,
      tls: true,
    },
    dependsOn: [resources[resources.length - 1].name],
  });

  if (isolationLevel === 'ISOLATED') {
    resources.push({
      name: genResourceName(instanceId, 'mongodb'),
      kind: 'database.mongodb.sharded',
      spec: {
        region,
        shards: 3,
        storageGb: 100,
        backupEnabled: true,
      },
      dependsOn: [resources[resources.length - 1].name],
    });
  } else {
    // DEDICATED: dedicated schema on shared cluster
    resources.push({
      name: genResourceName(instanceId, 'mongodb-schema'),
      kind: 'database.mongodb.sharded',
      spec: {
        region,
        database: `rtmn_${instanceId.replace(/[^a-zA-Z0-9_]/g, '_')}`,
        shards: 1,
      },
      dependsOn: [resources[resources.length - 1].name],
    });
  }

  if (metadata.tls) {
    resources.push({
      name: genResourceName(instanceId, 'cert'),
      kind: 'tls.cert_manager.certificate',
      spec: {
        host: `${instanceId}.rtmn.local`,
        issuer: 'letsencrypt-prod',
      },
      dependsOn: [resources[1].name],
    });
  }

  return resources;
}

async function recordEvent({ planId, tenantId, type, payload = {}, actor = 'system', fromStatus, toStatus, resourceName }) {
  await PlanEvent.create({ planId, tenantId, type, payload, actor, fromStatus, toStatus, resourceName });
}

export async function createPlan({
  tenantId,
  targetInstanceKind,
  targetInstanceId,
  isolationLevel,
  region,
  metadata = {},
  actor = 'system',
}) {
  if (!tenantId) throw new ValidationError('tenantId required');
  if (!targetInstanceKind) throw new ValidationError('targetInstanceKind required');
  if (!targetInstanceId) throw new ValidationError('targetInstanceId required');
  if (!['SHARED', 'DEDICATED', 'ISOLATED'].includes(isolationLevel)) {
    throw new ValidationError('isolationLevel must be SHARED|DEDICATED|ISOLATED');
  }
  if (!region) throw new ValidationError('region required');

  const planId = genPlanId();
  const resources = buildResources({ instanceId: targetInstanceId, isolationLevel, region, metadata });

  const plan = await ProvisioningPlan.create({
    planId,
    tenantId,
    targetInstanceKind,
    targetInstanceId,
    isolationLevel,
    region,
    status: 'PENDING',
    resources,
    metadata,
  });

  await recordEvent({
    planId,
    tenantId,
    type: 'plan.created',
    actor,
    toStatus: 'PENDING',
    payload: { resources: resources.length, isolationLevel, region },
  });

  return plan.toObject();
}

export async function getPlan(planId, { tenantId, allowInternal = false } = {}) {
  const plan = await ProvisioningPlan.findOne({ planId }).lean();
  if (!plan) throw new NotFoundError(`plan ${planId} not found`);
  if (!allowInternal && plan.tenantId !== tenantId) {
    throw new NotFoundError(`plan ${planId} not found`); // don't leak existence
  }
  return plan;
}

export async function listPlans({
  tenantId,
  status,
  targetInstanceKind,
  targetInstanceId,
  region,
  limit = 50,
  skip = 0,
}) {
  const q = {};
  if (tenantId) q.tenantId = tenantId;
  if (status) q.status = status;
  if (targetInstanceKind) q.targetInstanceKind = targetInstanceKind;
  if (targetInstanceId) q.targetInstanceId = targetInstanceId;
  if (region) q.region = region;

  const items = await ProvisioningPlan.find(q)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Math.min(limit, 200))
    .lean();
  const total = await ProvisioningPlan.countDocuments(q);
  return { items, total, limit, skip };
}

export async function transitionPlan(planId, toStatus, { actor = 'system', payload = {}, reason = null } = {}) {
  const plan = await ProvisioningPlan.findOne({ planId });
  if (!plan) throw new NotFoundError(`plan ${planId} not found`);

  const from = plan.status;
  if (TERMINAL.has(from)) {
    throw new StateTransitionError({ from, to: toStatus, reason: 'plan is in terminal state' });
  }
  assertTransition(from, toStatus);

  plan.status = toStatus;
  const now = new Date();
  if (toStatus === 'APPLYING') {
    plan.appliedBy = actor;
    plan.appliedAt = now;
  }
  if (toStatus === 'READY') plan.readyAt = now;
  if (toStatus === 'DESTROYED') plan.destroyedAt = now;
  if (toStatus === 'FAILED') plan.failureReason = reason || 'unspecified';
  await plan.save();

  await recordEvent({
    planId,
    tenantId: plan.tenantId,
    type: 'plan.transition',
    fromStatus: from,
    toStatus,
    actor,
    payload,
  });

  return plan.toObject();
}

/**
 * Orchestrator callback: mark a single resource as applied.
 */
export async function recordResourceApplied(planId, resourceName, { outputs = {}, actor = 'orchestrator' } = {}) {
  const plan = await ProvisioningPlan.findOne({ planId });
  if (!plan) throw new NotFoundError(`plan ${planId} not found`);
  if (!['APPLYING', 'RECONCILING'].includes(plan.status)) {
    throw new ValidationError(`cannot record resource applied in status ${plan.status}`);
  }
  plan.outputs = { ...(plan.outputs || {}), [resourceName]: outputs };
  await plan.save();
  await recordEvent({
    planId,
    tenantId: plan.tenantId,
    type: 'plan.resource.applied',
    resourceName,
    actor,
    payload: { outputs },
  });
  return plan.toObject();
}

export async function recordResourceFailed(planId, resourceName, { reason, actor = 'orchestrator' } = {}) {
  const plan = await ProvisioningPlan.findOne({ planId });
  if (!plan) throw new NotFoundError(`plan ${planId} not found`);
  if (!['APPLYING', 'RECONCILING'].includes(plan.status)) {
    throw new ValidationError(`cannot record resource failure in status ${plan.status}`);
  }
  plan.failureReason = `${resourceName}: ${reason}`;
  await plan.save();
  await recordEvent({
    planId,
    tenantId: plan.tenantId,
    type: 'plan.resource.failed',
    resourceName,
    actor,
    payload: { reason },
  });
  return plan.toObject();
}

export async function recordOutputs(planId, outputs, { actor = 'orchestrator' } = {}) {
  const plan = await ProvisioningPlan.findOne({ planId });
  if (!plan) throw new NotFoundError(`plan ${planId} not found`);
  plan.outputs = { ...(plan.outputs || {}), ...outputs };
  await plan.save();
  await recordEvent({
    planId,
    tenantId: plan.tenantId,
    type: 'plan.output.recorded',
    actor,
    payload: { keys: Object.keys(outputs) },
  });
  return plan.toObject();
}

export async function cancelPlan(planId, { reason, actor = 'system' } = {}) {
  return transitionPlan(planId, 'CANCELLED', { actor, payload: { reason } });
}

export async function destroyPlan(planId, { reason, actor = 'system' } = {}) {
  return transitionPlan(planId, 'DESTROYING', { actor, payload: { reason } });
}

export async function markDestroyed(planId, { actor = 'orchestrator' } = {}) {
  return transitionPlan(planId, 'DESTROYED', { actor });
}

export async function listEvents(planId, { limit = 100 } = {}) {
  return PlanEvent.find({ planId }).sort({ createdAt: 1 }).limit(Math.min(limit, 500)).lean();
}

export function planToJson(plan) {
  return {
    apiVersion: 'rtmn.io/v1',
    kind: 'ProvisioningPlan',
    planId: plan.planId,
    tenantId: plan.tenantId,
    targetInstance: {
      kind: plan.targetInstanceKind,
      id: plan.targetInstanceId,
    },
    isolationLevel: plan.isolationLevel,
    region: plan.region,
    resources: plan.resources,
  };
}

export function planToYaml(plan) {
  return yaml.dump(planToJson(plan), { lineWidth: 120 });
}

export function getStats(planDocs) {
  const stats = {
    total: planDocs.length,
    byStatus: {},
    byIsolation: {},
    byRegion: {},
  };
  for (const p of planDocs) {
    stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;
    stats.byIsolation[p.isolationLevel] = (stats.byIsolation[p.isolationLevel] || 0) + 1;
    stats.byRegion[p.region] = (stats.byRegion[p.region] || 0) + 1;
  }
  return stats;
}
