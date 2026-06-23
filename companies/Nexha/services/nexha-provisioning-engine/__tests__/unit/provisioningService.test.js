/**
 * Tests for provisioningService — service layer.
 * Covers: create, transition state machine, resource apply/fail/outputs,
 * cancel/destroy, list, get, events, JSON/YAML serialization, stats.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, clearTestDb, teardownTestDb, syncIndexes } from '../helpers/db.js';

let svc;
let svcErr;

beforeAll(async () => {
  await setupTestDb();
  await syncIndexes();
  try {
    svc = await import('../../src/services/provisioningService.js');
  } catch (e) {
    svcErr = e;
  }
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('createPlan', () => {
  it('creates a SHARED plan with 1 resource (namespace secret)', async () => {
    const plan = await svc.createPlan({
      tenantId: 'tenant-a',
      targetInstanceKind: 'industry-tenant-instance',
      targetInstanceId: 'iti_abc123def4567890',
      isolationLevel: 'SHARED',
      region: 'us-east-1',
    });
    expect(plan.planId).toMatch(/^pln_[a-f0-9]{16}$/);
    expect(plan.status).toBe('PENDING');
    expect(plan.resources).toHaveLength(1);
    expect(plan.resources[0].kind).toBe('secret.kubernetes.secret');
  });

  it('creates a DEDICATED plan with deployment+service+ingress+db', async () => {
    const plan = await svc.createPlan({
      tenantId: 'tenant-b',
      targetInstanceKind: 'industry-tenant-instance',
      targetInstanceId: 'iti_xyz123',
      isolationLevel: 'DEDICATED',
      region: 'us-west-2',
    });
    expect(plan.resources).toHaveLength(4);
    const kinds = plan.resources.map(r => r.kind);
    expect(kinds).toContain('compute.k8s.deployment');
    expect(kinds).toContain('compute.k8s.service');
    expect(kinds).toContain('compute.k8s.ingress');
    expect(kinds).toContain('database.mongodb.sharded');
  });

  it('creates an ISOLATED plan with sharded DB (3 shards)', async () => {
    const plan = await svc.createPlan({
      tenantId: 'tenant-c',
      targetInstanceKind: 'sutar-tenant-instance',
      targetInstanceId: 'sti_xyz',
      isolationLevel: 'ISOLATED',
      region: 'eu-west-1',
    });
    const db = plan.resources.find(r => r.kind === 'database.mongodb.sharded');
    expect(db.spec.shards).toBe(3);
    expect(db.spec.backupEnabled).toBe(true);
  });

  it('adds a TLS certificate resource when metadata.tls is true', async () => {
    const plan = await svc.createPlan({
      tenantId: 'tenant-d',
      targetInstanceKind: 'industry-tenant-instance',
      targetInstanceId: 'iti_tls',
      isolationLevel: 'DEDICATED',
      region: 'us-east-1',
      metadata: { tls: true },
    });
    const cert = plan.resources.find(r => r.kind === 'tls.cert_manager.certificate');
    expect(cert).toBeDefined();
    expect(cert.spec.issuer).toBe('letsencrypt-prod');
  });

  it('throws ValidationError on missing tenantId', async () => {
    await expect(svc.createPlan({
      targetInstanceKind: 'sutar-tenant-instance',
      targetInstanceId: 'sti_xyz',
      isolationLevel: 'SHARED',
      region: 'us-east-1',
    })).rejects.toThrow(svc.ValidationError);
  });

  it('throws ValidationError on bad isolationLevel', async () => {
    await expect(svc.createPlan({
      tenantId: 't',
      targetInstanceKind: 'sutar-tenant-instance',
      targetInstanceId: 'sti_xyz',
      isolationLevel: 'BOGUS',
      region: 'us-east-1',
    })).rejects.toThrow(svc.ValidationError);
  });

  it('throws ValidationError on missing region', async () => {
    await expect(svc.createPlan({
      tenantId: 't',
      targetInstanceKind: 'sutar-tenant-instance',
      targetInstanceId: 'sti_xyz',
      isolationLevel: 'SHARED',
    })).rejects.toThrow(svc.ValidationError);
  });

  it('writes a plan.created event', async () => {
    const plan = await svc.createPlan({
      tenantId: 'tenant-e',
      targetInstanceKind: 'industry-tenant-instance',
      targetInstanceId: 'iti_event',
      isolationLevel: 'SHARED',
      region: 'us-east-1',
    });
    const events = await svc.listEvents(plan.planId);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('plan.created');
    expect(events[0].toStatus).toBe('PENDING');
  });
});

describe('state machine', () => {
  let plan;
  beforeEach(async () => {
    plan = await svc.createPlan({
      tenantId: 't',
      targetInstanceKind: 'industry-tenant-instance',
      targetInstanceId: 'iti_x',
      isolationLevel: 'DEDICATED',
      region: 'us-east-1',
    });
  });

  it('PENDING → APPLYING is allowed', async () => {
    const updated = await svc.transitionPlan(plan.planId, 'APPLYING');
    expect(updated.status).toBe('APPLYING');
    expect(updated.appliedAt).toBeDefined();
  });

  it('PENDING → READY is forbidden', async () => {
    await expect(svc.transitionPlan(plan.planId, 'READY')).rejects.toThrow(svc.StateTransitionError);
  });

  it('PENDING → CANCELLED is allowed', async () => {
    const updated = await svc.transitionPlan(plan.planId, 'CANCELLED');
    expect(updated.status).toBe('CANCELLED');
  });

  it('APPLYING → READY is allowed', async () => {
    await svc.transitionPlan(plan.planId, 'APPLYING');
    const updated = await svc.transitionPlan(plan.planId, 'READY');
    expect(updated.status).toBe('READY');
    expect(updated.readyAt).toBeDefined();
  });

  it('APPLYING → FAILED is allowed', async () => {
    await svc.transitionPlan(plan.planId, 'APPLYING');
    const updated = await svc.transitionPlan(plan.planId, 'FAILED', { reason: 'k8s unreachable' });
    expect(updated.status).toBe('FAILED');
    expect(updated.failureReason).toBe('k8s unreachable');
  });

  it('READY → RECONCILING → READY is allowed', async () => {
    await svc.transitionPlan(plan.planId, 'APPLYING');
    await svc.transitionPlan(plan.planId, 'READY');
    const r = await svc.transitionPlan(plan.planId, 'RECONCILING');
    expect(r.status).toBe('RECONCILING');
    const r2 = await svc.transitionPlan(plan.planId, 'READY');
    expect(r2.status).toBe('READY');
  });

  it('READY → DESTROYING → DESTROYED is allowed (terminal)', async () => {
    await svc.transitionPlan(plan.planId, 'APPLYING');
    await svc.transitionPlan(plan.planId, 'READY');
    await svc.transitionPlan(plan.planId, 'DESTROYING');
    const final = await svc.transitionPlan(plan.planId, 'DESTROYED');
    expect(final.status).toBe('DESTROYED');
    expect(final.destroyedAt).toBeDefined();
  });

  it('DESTROYED → anything is forbidden (terminal)', async () => {
    await svc.transitionPlan(plan.planId, 'APPLYING');
    await svc.transitionPlan(plan.planId, 'READY');
    await svc.transitionPlan(plan.planId, 'DESTROYING');
    await svc.transitionPlan(plan.planId, 'DESTROYED');
    await expect(svc.transitionPlan(plan.planId, 'APPLYING')).rejects.toThrow(svc.StateTransitionError);
  });

  it('CANCELLED → anything is forbidden (terminal)', async () => {
    await svc.transitionPlan(plan.planId, 'CANCELLED');
    await expect(svc.transitionPlan(plan.planId, 'APPLYING')).rejects.toThrow(svc.StateTransitionError);
  });

  it('same-state transition is rejected (422)', async () => {
    await expect(svc.transitionPlan(plan.planId, 'PENDING')).rejects.toThrow(/same-state/);
  });

  it('FAILED → DESTROYING is allowed', async () => {
    await svc.transitionPlan(plan.planId, 'APPLYING');
    await svc.transitionPlan(plan.planId, 'FAILED', { reason: 'oops' });
    const updated = await svc.transitionPlan(plan.planId, 'DESTROYING');
    expect(updated.status).toBe('DESTROYING');
  });
});

describe('resource apply/fail/outputs', () => {
  let plan;
  beforeEach(async () => {
    plan = await svc.createPlan({
      tenantId: 't',
      targetInstanceKind: 'industry-tenant-instance',
      targetInstanceId: 'iti_x',
      isolationLevel: 'DEDICATED',
      region: 'us-east-1',
    });
    await svc.transitionPlan(plan.planId, 'APPLYING');
  });

  it('records a resource applied with outputs', async () => {
    const updated = await svc.recordResourceApplied(plan.planId, 'iti-x-deployment-abcd', {
      outputs: { host: 'iti-x.rtmn.local', port: 8080 },
    });
    expect(updated.outputs['iti-x-deployment-abcd']).toEqual({ host: 'iti-x.rtmn.local', port: 8080 });
  });

  it('rejects recordResourceApplied in PENDING', async () => {
    const p = await svc.createPlan({
      tenantId: 't', targetInstanceKind: 'industry-tenant-instance',
      targetInstanceId: 'iti_y', isolationLevel: 'SHARED', region: 'us-east-1',
    });
    await expect(svc.recordResourceApplied(p.planId, 'r1')).rejects.toThrow(svc.ValidationError);
  });

  it('records a resource failure', async () => {
    const updated = await svc.recordResourceFailed(plan.planId, 'iti-x-deployment-abcd', {
      reason: 'image pull backoff',
    });
    expect(updated.failureReason).toContain('image pull backoff');
  });

  it('records outputs (merge)', async () => {
    await svc.recordOutputs(plan.planId, { a: 1, b: 2 });
    const updated = await svc.recordOutputs(plan.planId, { c: 3 });
    expect(updated.outputs).toEqual({ a: 1, b: 2, c: 3 });
  });
});

describe('cancel / destroy helpers', () => {
  it('cancelPlan transitions to CANCELLED', async () => {
    const plan = await svc.createPlan({
      tenantId: 't', targetInstanceKind: 'sutar-tenant-instance',
      targetInstanceId: 'sti_x', isolationLevel: 'SHARED', region: 'us-east-1',
    });
    const updated = await svc.cancelPlan(plan.planId, { reason: 'duplicate' });
    expect(updated.status).toBe('CANCELLED');
  });

  it('destroyPlan transitions to DESTROYING (not directly to DESTROYED)', async () => {
    const plan = await svc.createPlan({
      tenantId: 't', targetInstanceKind: 'sutar-tenant-instance',
      targetInstanceId: 'sti_x', isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    await svc.transitionPlan(plan.planId, 'APPLYING');
    await svc.transitionPlan(plan.planId, 'READY');
    const updated = await svc.destroyPlan(plan.planId, { reason: 'cleanup' });
    expect(updated.status).toBe('DESTROYING');
  });

  it('markDestroyed transitions DESTROYING → DESTROYED', async () => {
    const plan = await svc.createPlan({
      tenantId: 't', targetInstanceKind: 'sutar-tenant-instance',
      targetInstanceId: 'sti_x', isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    await svc.transitionPlan(plan.planId, 'APPLYING');
    await svc.transitionPlan(plan.planId, 'READY');
    await svc.transitionPlan(plan.planId, 'DESTROYING');
    const updated = await svc.markDestroyed(plan.planId);
    expect(updated.status).toBe('DESTROYED');
  });
});

describe('getPlan / listPlans', () => {
  it('getPlan returns the plan', async () => {
    const plan = await svc.createPlan({
      tenantId: 't', targetInstanceKind: 'sutar-tenant-instance',
      targetInstanceId: 'sti_x', isolationLevel: 'SHARED', region: 'us-east-1',
    });
    const fetched = await svc.getPlan(plan.planId, { tenantId: 't' });
    expect(fetched.planId).toBe(plan.planId);
  });

  it('getPlan with wrong tenantId returns NotFoundError (no info leak)', async () => {
    const plan = await svc.createPlan({
      tenantId: 't', targetInstanceKind: 'sutar-tenant-instance',
      targetInstanceId: 'sti_x', isolationLevel: 'SHARED', region: 'us-east-1',
    });
    await expect(svc.getPlan(plan.planId, { tenantId: 'other' })).rejects.toThrow(svc.NotFoundError);
  });

  it('getPlan with allowInternal skips tenant check', async () => {
    const plan = await svc.createPlan({
      tenantId: 't', targetInstanceKind: 'sutar-tenant-instance',
      targetInstanceId: 'sti_x', isolationLevel: 'SHARED', region: 'us-east-1',
    });
    const fetched = await svc.getPlan(plan.planId, { tenantId: 't', allowInternal: true });
    expect(fetched.planId).toBe(plan.planId);
  });

  it('listPlans filters by tenantId and status', async () => {
    await svc.createPlan({ tenantId: 'a', targetInstanceKind: 'sutar-tenant-instance', targetInstanceId: 'sti_a', isolationLevel: 'SHARED', region: 'us-east-1' });
    await svc.createPlan({ tenantId: 'a', targetInstanceKind: 'sutar-tenant-instance', targetInstanceId: 'sti_b', isolationLevel: 'DEDICATED', region: 'us-east-1' });
    await svc.createPlan({ tenantId: 'b', targetInstanceKind: 'sutar-tenant-instance', targetInstanceId: 'sti_c', isolationLevel: 'SHARED', region: 'us-east-1' });
    const a = await svc.listPlans({ tenantId: 'a' });
    expect(a.items).toHaveLength(2);
    expect(a.total).toBe(2);
    const aD = await svc.listPlans({ tenantId: 'a', status: 'PENDING' });
    expect(aD.items).toHaveLength(2);
  });

  it('listPlans respects limit and skip', async () => {
    for (let i = 0; i < 5; i++) {
      await svc.createPlan({ tenantId: 'a', targetInstanceKind: 'sutar-tenant-instance', targetInstanceId: `sti_${i}`, isolationLevel: 'SHARED', region: 'us-east-1' });
    }
    const page1 = await svc.listPlans({ tenantId: 'a', limit: 2, skip: 0 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(5);
    const page3 = await svc.listPlans({ tenantId: 'a', limit: 2, skip: 4 });
    expect(page3.items).toHaveLength(1);
  });

  it('listPlans filters by region', async () => {
    await svc.createPlan({ tenantId: 'a', targetInstanceKind: 'sutar-tenant-instance', targetInstanceId: 'sti_a', isolationLevel: 'SHARED', region: 'us-east-1' });
    await svc.createPlan({ tenantId: 'a', targetInstanceKind: 'sutar-tenant-instance', targetInstanceId: 'sti_b', isolationLevel: 'SHARED', region: 'eu-west-1' });
    const eu = await svc.listPlans({ tenantId: 'a', region: 'eu-west-1' });
    expect(eu.items).toHaveLength(1);
  });
});

describe('serialization', () => {
  it('planToJson emits canonical structure with apiVersion + kind', async () => {
    const plan = await svc.createPlan({
      tenantId: 't', targetInstanceKind: 'industry-tenant-instance',
      targetInstanceId: 'iti_x', isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    const json = svc.planToJson(plan);
    expect(json.apiVersion).toBe('rtmn.io/v1');
    expect(json.kind).toBe('ProvisioningPlan');
    expect(json.planId).toBe(plan.planId);
    expect(json.targetInstance.kind).toBe('industry-tenant-instance');
    expect(json.targetInstance.id).toBe('iti_x');
    expect(json.resources.length).toBeGreaterThan(0);
  });

  it('planToYaml emits valid YAML', async () => {
    const plan = await svc.createPlan({
      tenantId: 't', targetInstanceKind: 'industry-tenant-instance',
      targetInstanceId: 'iti_x', isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    const yaml = svc.planToYaml(plan);
    expect(yaml).toContain('apiVersion: rtmn.io/v1');
    expect(yaml).toContain('kind: ProvisioningPlan');
    expect(yaml).toContain('planId: ' + plan.planId);
  });
});

describe('getStats', () => {
  it('aggregates by status, isolation, region', async () => {
    await svc.createPlan({ tenantId: 'a', targetInstanceKind: 'sutar-tenant-instance', targetInstanceId: 'sti_a', isolationLevel: 'SHARED', region: 'us-east-1' });
    await svc.createPlan({ tenantId: 'a', targetInstanceKind: 'sutar-tenant-instance', targetInstanceId: 'sti_b', isolationLevel: 'DEDICATED', region: 'us-east-1' });
    const plan = await svc.createPlan({ tenantId: 'a', targetInstanceKind: 'sutar-tenant-instance', targetInstanceId: 'sti_c', isolationLevel: 'DEDICATED', region: 'eu-west-1' });
    await svc.transitionPlan(plan.planId, 'APPLYING');
    const plans = await svc.listPlans({ tenantId: 'a' });
    const stats = svc.getStats(plans.items);
    expect(stats.total).toBe(3);
    expect(stats.byStatus.PENDING).toBe(2);
    expect(stats.byStatus.APPLYING).toBe(1);
    expect(stats.byIsolation.SHARED).toBe(1);
    expect(stats.byIsolation.DEDICATED).toBe(2);
    expect(stats.byRegion['us-east-1']).toBe(2);
    expect(stats.byRegion['eu-west-1']).toBe(1);
  });
});

describe('event log', () => {
  it('records every transition with from→to', async () => {
    const plan = await svc.createPlan({
      tenantId: 't', targetInstanceKind: 'industry-tenant-instance',
      targetInstanceId: 'iti_x', isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    await svc.transitionPlan(plan.planId, 'APPLYING');
    await svc.transitionPlan(plan.planId, 'READY');
    await svc.transitionPlan(plan.planId, 'DESTROYING');
    await svc.transitionPlan(plan.planId, 'DESTROYED');
    const events = await svc.listEvents(plan.planId);
    const transitions = events.filter(e => e.type === 'plan.transition');
    expect(transitions).toHaveLength(4);
    expect(transitions[0].fromStatus).toBe('PENDING');
    expect(transitions[0].toStatus).toBe('APPLYING');
    expect(transitions[3].fromStatus).toBe('DESTROYING');
    expect(transitions[3].toStatus).toBe('DESTROYED');
  });

  it('listEvents respects limit', async () => {
    const plan = await svc.createPlan({
      tenantId: 't', targetInstanceKind: 'industry-tenant-instance',
      targetInstanceId: 'iti_x', isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    const events = await svc.listEvents(plan.planId, { limit: 1 });
    expect(events).toHaveLength(1);
  });
});
