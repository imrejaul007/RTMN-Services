/**
 * Unit tests for instanceService.
 *
 * ADR-0010 Phase 9 (2026-06-22).
 */

import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest';
import { connect, disconnect, clear, syncAllIndexes } from '../helpers/db.js';
import * as svc from '../../src/services/instanceService.js';
import {
  ValidationError,
  NotFoundError,
  StateTransitionError,
  ConflictError,
} from '../../src/services/instanceService.js';

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clear();
});

beforeEach(async () => {
  await syncAllIndexes();
});

describe('provisionInstance', () => {
  it('creates an ACTIVE SHARED instance by default', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_001' });
    expect(inst.status).toBe('ACTIVE');
    expect(inst.isolationLevel).toBe('SHARED');
    expect(inst.instanceId).toMatch(/^sti_/);
    expect(inst.tenantId).toBe('t_001');
    expect(inst._apiKey).toMatch(/^sk_/);
  });

  it('creates a DEDICATED instance with autoActivate=true', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_002',
      isolationLevel: 'DEDICATED',
      autoActivate: true,
    });
    expect(inst.status).toBe('ACTIVE');
    expect(inst.isolationLevel).toBe('DEDICATED');
    expect(inst.databaseUri).toMatch(/^mongodb:\/\//);
  });

  it('creates an ISOLATED instance but stays in PROVISIONING without autoActivate', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_003',
      isolationLevel: 'ISOLATED',
    });
    expect(inst.status).toBe('PROVISIONING');
    expect(inst.isolationLevel).toBe('ISOLATED');
  });

  it('applies custom limits', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_004',
      limits: { maxAgents: 50, maxMissionsPerDay: 200, maxApiCallsPerMinute: 120, storageMbLimit: 256 },
    });
    expect(inst.limits.maxAgents).toBe(50);
    expect(inst.limits.maxMissionsPerDay).toBe(200);
  });

  it('throws ValidationError on missing tenantId', async () => {
    await expect(svc.provisionInstance({})).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError on invalid isolationLevel', async () => {
    await expect(svc.provisionInstance({ tenantId: 't_005', isolationLevel: 'BOGUS' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('throws ConflictError on duplicate active tenant', async () => {
    await svc.provisionInstance({ tenantId: 't_006' });
    await expect(svc.provisionInstance({ tenantId: 't_006' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('strips apiKeyHash from the returned object', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_007' });
    expect(inst.apiKeyHash).toBeUndefined();
  });

  it('hashes the api key for storage (not stored plaintext)', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_008' });
    const { TenantInstance } = await import('../../src/models/TenantInstance.js');
    const fresh = await TenantInstance.findOne({ instanceId: inst.instanceId });
    expect(fresh.apiKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(fresh.apiKeyHash).not.toBe(inst._apiKey);
  });

  it('routes are normalized with defaults', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_009',
      routes: [{ pathPrefix: '/api/sale', upstreamUrl: 'https://example.com/sale' }],
    });
    expect(inst.routes[0].enabled).toBe(true);
    expect(inst.routes[0].pathPrefix).toBe('/api/sale');
  });
});

describe('getInstance / listInstances', () => {
  it('getInstance returns the instance', async () => {
    const created = await svc.provisionInstance({ tenantId: 't_010' });
    const got = await svc.getInstance(created.instanceId);
    expect(got.tenantId).toBe('t_010');
    expect(got.apiKeyHash).toBeUndefined();
  });

  it('getInstance throws NotFoundError on missing', async () => {
    await expect(svc.getInstance('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('getInstanceByTenant returns the active instance', async () => {
    const created = await svc.provisionInstance({ tenantId: 't_011' });
    const got = await svc.getInstanceByTenant('t_011');
    expect(got.instanceId).toBe(created.instanceId);
  });

  it('getInstanceByTenant throws when tenant has no active instance', async () => {
    await expect(svc.getInstanceByTenant('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('listInstances supports status filter', async () => {
    await svc.provisionInstance({ tenantId: 't_a' });
    const iso = await svc.provisionInstance({ tenantId: 't_b', isolationLevel: 'ISOLATED' });
    await svc.suspendInstance(iso.instanceId);
    const result = await svc.listInstances({ status: 'ACTIVE' });
    expect(result.instances.every((i) => i.status === 'ACTIVE')).toBe(true);
  });

  it('listInstances supports tenantId filter', async () => {
    await svc.provisionInstance({ tenantId: 't_c1' });
    await svc.provisionInstance({ tenantId: 't_c2' });
    const result = await svc.listInstances({ tenantId: 't_c1' });
    expect(result.instances.length).toBe(1);
    expect(result.instances[0].tenantId).toBe('t_c1');
  });

  it('listInstances returns total + pagination', async () => {
    for (let i = 0; i < 5; i++) await svc.provisionInstance({ tenantId: `t_pg_${i}` });
    const result = await svc.listInstances({ limit: 2, offset: 1 });
    expect(result.total).toBe(5);
    expect(result.instances.length).toBe(2);
    expect(result.limit).toBe(2);
    expect(result.offset).toBe(1);
  });
});

describe('lifecycle — suspend / resume / destroy / fail', () => {
  it('suspends an ACTIVE instance', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_020' });
    const suspended = await svc.suspendInstance(inst.instanceId, 'maintenance');
    expect(suspended.status).toBe('SUSPENDED');
    expect(suspended.metadata.suspensionReason).toBe('maintenance');
    expect(suspended.suspendedAt).toBeDefined();
  });

  it('resume restores an ACTIVE status', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_021' });
    await svc.suspendInstance(inst.instanceId);
    const resumed = await svc.resumeInstance(inst.instanceId);
    expect(resumed.status).toBe('ACTIVE');
    expect(resumed.suspendedAt).toBeNull();
  });

  it('suspend on already-SUSPENDED throws (terminal-guard)', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_022' });
    await svc.suspendInstance(inst.instanceId);
    // SUSPENDED → SUSPENDED is not in transitions list.
    await expect(svc.suspendInstance(inst.instanceId)).rejects.toBeInstanceOf(StateTransitionError);
  });

  it('destroy promotes to DESTROYED in one call', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_023' });
    const destroyed = await svc.destroyInstance(inst.instanceId, 'contract ended');
    expect(destroyed.status).toBe('DESTROYED');
    expect(destroyed.destroyedAt).toBeDefined();
    expect(destroyed.metadata.destructionReason).toBe('contract ended');
  });

  it('destroy on DESTROYED throws (terminal-guard)', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_024' });
    await svc.destroyInstance(inst.instanceId);
    await expect(svc.destroyInstance(inst.instanceId)).rejects.toBeInstanceOf(StateTransitionError);
  });

  it('markInstanceFailed works from ACTIVE or PROVISIONING', async () => {
    const active = await svc.provisionInstance({ tenantId: 't_025' });
    const failed = await svc.markInstanceFailed(active.instanceId, 'crash');
    expect(failed.status).toBe('FAILED');

    const provisioning = await svc.provisionInstance({ tenantId: 't_026', isolationLevel: 'ISOLATED' });
    const failed2 = await svc.markInstanceFailed(provisioning.instanceId, 'infra error');
    expect(failed2.status).toBe('FAILED');
  });

  it('failed instance can still be destroyed (FAILED → DESTROYING → DESTROYED)', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_027' });
    await svc.markInstanceFailed(inst.instanceId);
    const destroyed = await svc.destroyInstance(inst.instanceId);
    expect(destroyed.status).toBe('DESTROYED');
  });
});

describe('updateInstance', () => {
  it('updates region and tags', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_030' });
    const updated = await svc.updateInstance(inst.instanceId, {
      region: 'us-east-1',
      tags: ['prod', 'tier1'],
    });
    expect(updated.region).toBe('us-east-1');
    expect(updated.tags).toEqual(['prod', 'tier1']);
  });

  it('updates limits (partial)', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_031' });
    const updated = await svc.updateInstance(inst.instanceId, {
      limits: { maxAgents: 25 },
    });
    expect(updated.limits.maxAgents).toBe(25);
    // others preserved
    expect(updated.limits.maxMissionsPerDay).toBe(1000);
  });

  it('throws ValidationError on empty patch', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_032' });
    await expect(svc.updateInstance(inst.instanceId, {})).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError on invalid isolationLevel', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_033' });
    await expect(svc.updateInstance(inst.instanceId, { isolationLevel: 'BOGUS' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('throws StateTransitionError when updating a DESTROYED instance', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_034' });
    await svc.destroyInstance(inst.instanceId);
    await expect(svc.updateInstance(inst.instanceId, { region: 'eu' })).rejects.toBeInstanceOf(StateTransitionError);
  });
});

describe('rotateApiKey', () => {
  it('rotates the api key with a new SHA256 hash', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_040' });
    const { TenantInstance } = await import('../../src/models/TenantInstance.js');
    const before = await TenantInstance.findOne({ instanceId: inst.instanceId });
    const result = await svc.rotateApiKey(inst.instanceId);
    expect(result._apiKey).toMatch(/^sk_/);
    expect(result._apiKey).not.toBe(inst._apiKey);
    const after = await TenantInstance.findOne({ instanceId: inst.instanceId });
    expect(after.apiKeyHash).not.toBe(before.apiKeyHash);
  });

  it('throws StateTransitionError on DESTROYED instance', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_041' });
    await svc.destroyInstance(inst.instanceId);
    await expect(svc.rotateApiKey(inst.instanceId)).rejects.toBeInstanceOf(StateTransitionError);
  });
});

describe('recordHealthCheck', () => {
  it('records a healthy check', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_050' });
    const updated = await svc.recordHealthCheck(inst.instanceId, 'healthy');
    expect(updated.healthCheckStatus).toBe('healthy');
    expect(updated.lastHealthCheckAt).toBeDefined();
  });

  it('throws ValidationError on invalid status', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_051' });
    await expect(svc.recordHealthCheck(inst.instanceId, 'BOGUS')).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('recordUsage / getUsage', () => {
  it('records and reads usage', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_060' });
    await svc.recordUsage(inst.instanceId, {
      apiCalls: 100,
      missionsCreated: 5,
      missionsCompleted: 4,
      errorCount: 1,
    });
    const usage = await svc.getUsage(inst.instanceId);
    const today = usage.metrics.find((m) => m.date === new Date().toISOString().slice(0, 10));
    expect(today).toBeDefined();
    expect(today.apiCalls).toBe(100);
    expect(today.missionsCreated).toBe(5);
  });

  it('recordUsage is additive (multiple events accumulate)', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_061' });
    await svc.recordUsage(inst.instanceId, { apiCalls: 50 });
    await svc.recordUsage(inst.instanceId, { apiCalls: 75 });
    const usage = await svc.getUsage(inst.instanceId);
    const today = usage.metrics.find((m) => m.date === new Date().toISOString().slice(0, 10));
    expect(today.apiCalls).toBe(125);
  });

  it('recordUsage is idempotent on high-water-mark fields', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_062' });
    await svc.recordUsage(inst.instanceId, { agentsActive: 5 });
    await svc.recordUsage(inst.instanceId, { agentsActive: 8 });
    const usage = await svc.getUsage(inst.instanceId);
    const today = usage.metrics.find((m) => m.date === new Date().toISOString().slice(0, 10));
    expect(today.agentsActive).toBe(8);
  });

  it('throws NotFoundError on unknown instance', async () => {
    await expect(svc.recordUsage('missing', { apiCalls: 1 })).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.getUsage('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('checkLimits', () => {
  it('returns no violations when within limits', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_070' });
    const result = await svc.checkLimits(inst.instanceId);
    expect(result.violations.length).toBe(0);
  });

  it('returns apiCalls violation when over limit', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_071',
      limits: { maxApiCallsPerMinute: 1 }, // daily limit = 1 * 1440 = 1440
    });
    await svc.recordUsage(inst.instanceId, { apiCalls: 2000 });
    const result = await svc.checkLimits(inst.instanceId);
    expect(result.violations.some((v) => v.metric === 'apiCalls')).toBe(true);
  });

  it('returns missionsCreated violation when over limit', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_072',
      limits: { maxMissionsPerDay: 5 },
    });
    await svc.recordUsage(inst.instanceId, { missionsCreated: 10 });
    const result = await svc.checkLimits(inst.instanceId);
    expect(result.violations.some((v) => v.metric === 'missionsCreated')).toBe(true);
  });

  it('returns SUSPENDED status violation', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_073' });
    await svc.suspendInstance(inst.instanceId);
    const result = await svc.checkLimits(inst.instanceId);
    expect(result.violations.some((v) => v.metric === 'status')).toBe(true);
  });
});

describe('getStats', () => {
  it('aggregates by status and isolation', async () => {
    await svc.provisionInstance({ tenantId: 't_a1' });
    await svc.provisionInstance({ tenantId: 't_a2' });
    const iso = await svc.provisionInstance({ tenantId: 't_a3', isolationLevel: 'ISOLATED' });
    await svc.suspendInstance(iso.instanceId);
    const stats = await svc.getStats();
    expect(stats.instances.byStatus.ACTIVE).toBe(2);
    expect(stats.instances.byStatus.SUSPENDED).toBe(1);
    expect(stats.instances.byIsolation.SHARED).toBe(2);
    expect(stats.instances.byIsolation.ISOLATED).toBe(1);
  });

  it('aggregates usage totals', async () => {
    const inst1 = await svc.provisionInstance({ tenantId: 't_b1' });
    const inst2 = await svc.provisionInstance({ tenantId: 't_b2' });
    await svc.recordUsage(inst1.instanceId, { apiCalls: 100, missionsCompleted: 5 });
    await svc.recordUsage(inst2.instanceId, { apiCalls: 50, missionsCompleted: 3 });
    const stats = await svc.getStats();
    expect(stats.usage.totalApiCalls).toBe(150);
    expect(stats.usage.totalMissionsCompleted).toBe(8);
  });
});