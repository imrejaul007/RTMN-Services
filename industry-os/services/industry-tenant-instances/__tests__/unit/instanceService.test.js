/**
 * Unit tests for industry-tenant-instances service layer.
 *
 * ADR-0010 Phase 10 (2026-06-22).
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
  it('creates an ACTIVE SHARED healthcare instance by default', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_001', industry: 'healthcare' });
    expect(inst.status).toBe('ACTIVE');
    expect(inst.isolationLevel).toBe('SHARED');
    expect(inst.industry).toBe('healthcare');
    expect(inst.instanceId).toMatch(/^iti_/);
    expect(inst._apiKey).toMatch(/^ik_/);
  });

  it('creates a DEDICATED finance instance with autoActivate=true', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_002',
      industry: 'finance',
      isolationLevel: 'DEDICATED',
      autoActivate: true,
    });
    expect(inst.status).toBe('ACTIVE');
    expect(inst.isolationLevel).toBe('DEDICATED');
    expect(inst.industry).toBe('finance');
    expect(inst.databaseUri).toMatch(/^mongodb:\/\//);
  });

  it('creates an ISOLATED instance but stays in PROVISIONING without autoActivate', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_003',
      industry: 'healthcare',
      isolationLevel: 'ISOLATED',
    });
    expect(inst.status).toBe('PROVISIONING');
  });

  it('applies compliance metadata', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_004',
      industry: 'healthcare',
      compliance: { framework: 'HIPAA', dataResidencyRegion: 'us-east-1' },
    });
    expect(inst.compliance.framework).toBe('HIPAA');
    expect(inst.compliance.dataResidencyRegion).toBe('us-east-1');
    expect(inst.compliance.auditLogEnabled).toBe(true);
    expect(inst.compliance.encryptionAtRest).toBe(true);
  });

  it('applies custom limits', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_005',
      industry: 'finance',
      limits: { maxApiCallsPerMinute: 120, maxRecordsPerTenant: 50000, storageMbLimit: 512, maxConcurrentWorkflows: 10 },
    });
    expect(inst.limits.maxApiCallsPerMinute).toBe(120);
    expect(inst.limits.maxRecordsPerTenant).toBe(50000);
    expect(inst.limits.maxConcurrentWorkflows).toBe(10);
  });

  it('throws ValidationError on missing tenantId', async () => {
    await expect(svc.provisionInstance({ industry: 'healthcare' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError on missing industry', async () => {
    await expect(svc.provisionInstance({ tenantId: 't_x' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError on invalid industry', async () => {
    await expect(svc.provisionInstance({ tenantId: 't_x', industry: 'BOGUS' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError on invalid isolationLevel', async () => {
    await expect(
      svc.provisionInstance({ tenantId: 't_x', industry: 'healthcare', isolationLevel: 'NOPE' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ConflictError on duplicate tenant+industry pair', async () => {
    await svc.provisionInstance({ tenantId: 't_006', industry: 'healthcare' });
    await expect(
      svc.provisionInstance({ tenantId: 't_006', industry: 'healthcare' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('allows different industries for the same tenant', async () => {
    await svc.provisionInstance({ tenantId: 't_007', industry: 'healthcare' });
    const fin = await svc.provisionInstance({ tenantId: 't_007', industry: 'finance' });
    expect(fin.industry).toBe('finance');
    expect(fin.status).toBe('ACTIVE');
  });

  it('strips apiKeyHash from returned object', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_008', industry: 'hotel' });
    expect(inst.apiKeyHash).toBeUndefined();
  });

  it('hashes the api key for storage', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_009', industry: 'retail' });
    const { IndustryInstance } = await import('../../src/models/IndustryInstance.js');
    const fresh = await IndustryInstance.findOne({ instanceId: inst.instanceId });
    expect(fresh.apiKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(fresh.apiKeyHash).not.toBe(inst._apiKey);
  });
});

describe('getInstance / listInstances', () => {
  it('getInstance returns the instance', async () => {
    const created = await svc.provisionInstance({ tenantId: 't_010', industry: 'healthcare' });
    const got = await svc.getInstance(created.instanceId);
    expect(got.tenantId).toBe('t_010');
    expect(got.apiKeyHash).toBeUndefined();
  });

  it('getInstance throws NotFoundError on missing', async () => {
    await expect(svc.getInstance('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('getInstanceByTenant returns the active instance for an industry', async () => {
    const created = await svc.provisionInstance({ tenantId: 't_011', industry: 'healthcare' });
    const got = await svc.getInstanceByTenant('t_011', 'healthcare');
    expect(got.instanceId).toBe(created.instanceId);
  });

  it('getInstanceByTenant throws when tenant has no active instance for industry', async () => {
    await expect(svc.getInstanceByTenant('nope', 'healthcare')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('listInstances supports industry filter', async () => {
    await svc.provisionInstance({ tenantId: 't_h1', industry: 'healthcare' });
    await svc.provisionInstance({ tenantId: 't_f1', industry: 'finance' });
    const result = await svc.listInstances({ industry: 'healthcare' });
    expect(result.instances.every((i) => i.industry === 'healthcare')).toBe(true);
    expect(result.total).toBe(1);
  });

  it('listInstances supports status filter', async () => {
    await svc.provisionInstance({ tenantId: 't_a', industry: 'hotel' });
    const iso = await svc.provisionInstance({ tenantId: 't_b', industry: 'hotel', isolationLevel: 'ISOLATED' });
    await svc.suspendInstance(iso.instanceId);
    const result = await svc.listInstances({ status: 'ACTIVE' });
    expect(result.instances.every((i) => i.status === 'ACTIVE')).toBe(true);
  });

  it('listInstances supports complianceFramework filter', async () => {
    await svc.provisionInstance({ tenantId: 't_h', industry: 'healthcare', compliance: { framework: 'HIPAA' } });
    await svc.provisionInstance({ tenantId: 't_f', industry: 'finance', compliance: { framework: 'PCI-DSS' } });
    const result = await svc.listInstances({ complianceFramework: 'HIPAA' });
    expect(result.total).toBe(1);
    expect(result.instances[0].compliance.framework).toBe('HIPAA');
  });

  it('listInstances returns total + pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await svc.provisionInstance({ tenantId: `t_pg_${i}`, industry: 'retail' });
    }
    const result = await svc.listInstances({ limit: 2, offset: 1 });
    expect(result.total).toBe(5);
    expect(result.instances.length).toBe(2);
  });
});

describe('lifecycle — suspend / resume / destroy / fail', () => {
  it('suspends an ACTIVE instance', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_020', industry: 'healthcare' });
    const suspended = await svc.suspendInstance(inst.instanceId, 'maintenance');
    expect(suspended.status).toBe('SUSPENDED');
    expect(suspended.metadata.suspensionReason).toBe('maintenance');
  });

  it('resume restores ACTIVE status', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_021', industry: 'healthcare' });
    await svc.suspendInstance(inst.instanceId);
    const resumed = await svc.resumeInstance(inst.instanceId);
    expect(resumed.status).toBe('ACTIVE');
    expect(resumed.suspendedAt).toBeNull();
  });

  it('suspend on already-SUSPENDED throws (terminal-guard)', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_022', industry: 'healthcare' });
    await svc.suspendInstance(inst.instanceId);
    await expect(svc.suspendInstance(inst.instanceId)).rejects.toBeInstanceOf(StateTransitionError);
  });

  it('destroy promotes to DESTROYED', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_023', industry: 'healthcare' });
    const destroyed = await svc.destroyInstance(inst.instanceId, 'contract ended');
    expect(destroyed.status).toBe('DESTROYED');
    expect(destroyed.metadata.destructionReason).toBe('contract ended');
  });

  it('destroy on DESTROYED throws', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_024', industry: 'healthcare' });
    await svc.destroyInstance(inst.instanceId);
    await expect(svc.destroyInstance(inst.instanceId)).rejects.toBeInstanceOf(StateTransitionError);
  });

  it('markInstanceFailed works from ACTIVE or PROVISIONING', async () => {
    const active = await svc.provisionInstance({ tenantId: 't_025', industry: 'healthcare' });
    const failed = await svc.markInstanceFailed(active.instanceId, 'crash');
    expect(failed.status).toBe('FAILED');

    const provisioning = await svc.provisionInstance({
      tenantId: 't_026',
      industry: 'healthcare',
      isolationLevel: 'ISOLATED',
    });
    const failed2 = await svc.markInstanceFailed(provisioning.instanceId, 'infra error');
    expect(failed2.status).toBe('FAILED');
  });
});

describe('updateInstance', () => {
  it('updates region and tags', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_030', industry: 'healthcare' });
    const updated = await svc.updateInstance(inst.instanceId, { region: 'us-east-1', tags: ['prod'] });
    expect(updated.region).toBe('us-east-1');
    expect(updated.tags).toEqual(['prod']);
  });

  it('updates compliance metadata', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_031', industry: 'healthcare' });
    const updated = await svc.updateInstance(inst.instanceId, {
      compliance: { framework: 'HIPAA', dataResidencyRegion: 'eu-west-1' },
    });
    expect(updated.compliance.framework).toBe('HIPAA');
    expect(updated.compliance.dataResidencyRegion).toBe('eu-west-1');
  });

  it('updates limits (partial)', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_032', industry: 'healthcare' });
    const updated = await svc.updateInstance(inst.instanceId, { limits: { maxRecordsPerTenant: 50000 } });
    expect(updated.limits.maxRecordsPerTenant).toBe(50000);
    expect(updated.limits.maxApiCallsPerMinute).toBe(600);
  });

  it('throws ValidationError on empty patch', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_033', industry: 'healthcare' });
    await expect(svc.updateInstance(inst.instanceId, {})).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws StateTransitionError when updating a DESTROYED instance', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_034', industry: 'healthcare' });
    await svc.destroyInstance(inst.instanceId);
    await expect(svc.updateInstance(inst.instanceId, { region: 'eu' })).rejects.toBeInstanceOf(StateTransitionError);
  });
});

describe('rotateApiKey', () => {
  it('rotates the api key', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_040', industry: 'healthcare' });
    const result = await svc.rotateApiKey(inst.instanceId);
    expect(result._apiKey).toMatch(/^ik_/);
    expect(result._apiKey).not.toBe(inst._apiKey);
  });

  it('throws StateTransitionError on DESTROYED', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_041', industry: 'healthcare' });
    await svc.destroyInstance(inst.instanceId);
    await expect(svc.rotateApiKey(inst.instanceId)).rejects.toBeInstanceOf(StateTransitionError);
  });
});

describe('recordHealthCheck', () => {
  it('records a healthy check', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_050', industry: 'healthcare' });
    const updated = await svc.recordHealthCheck(inst.instanceId, 'healthy');
    expect(updated.healthCheckStatus).toBe('healthy');
  });

  it('throws ValidationError on invalid status', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_051', industry: 'healthcare' });
    await expect(svc.recordHealthCheck(inst.instanceId, 'BOGUS')).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('recordUsage / getUsage', () => {
  it('records and reads usage', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_060', industry: 'healthcare' });
    await svc.recordUsage(inst.instanceId, {
      apiCalls: 100,
      recordsCreated: 5,
      workflowsExecuted: 2,
      errorCount: 1,
    });
    const usage = await svc.getUsage(inst.instanceId);
    const today = usage.metrics.find((m) => m.date === new Date().toISOString().slice(0, 10));
    expect(today.apiCalls).toBe(100);
    expect(today.recordsCreated).toBe(5);
    expect(today.workflowsExecuted).toBe(2);
  });

  it('recordUsage is additive', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_061', industry: 'healthcare' });
    await svc.recordUsage(inst.instanceId, { apiCalls: 50 });
    await svc.recordUsage(inst.instanceId, { apiCalls: 75 });
    const usage = await svc.getUsage(inst.instanceId);
    const today = usage.metrics.find((m) => m.date === new Date().toISOString().slice(0, 10));
    expect(today.apiCalls).toBe(125);
  });

  it('recordUsage is idempotent on high-water-mark fields', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_062', industry: 'healthcare' });
    await svc.recordUsage(inst.instanceId, { recordsActive: 100 });
    await svc.recordUsage(inst.instanceId, { recordsActive: 150 });
    const usage = await svc.getUsage(inst.instanceId);
    const today = usage.metrics.find((m) => m.date === new Date().toISOString().slice(0, 10));
    expect(today.recordsActive).toBe(150);
  });

  it('throws NotFoundError on unknown instance', async () => {
    await expect(svc.recordUsage('missing', { apiCalls: 1 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('checkLimits', () => {
  it('returns no violations when within limits', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_070', industry: 'healthcare' });
    const result = await svc.checkLimits(inst.instanceId);
    expect(result.violations.length).toBe(0);
  });

  it('returns apiCalls violation', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_071',
      industry: 'healthcare',
      limits: { maxApiCallsPerMinute: 1 },
    });
    await svc.recordUsage(inst.instanceId, { apiCalls: 2000 });
    const result = await svc.checkLimits(inst.instanceId);
    expect(result.violations.some((v) => v.metric === 'apiCalls')).toBe(true);
  });

  it('returns recordsActive violation', async () => {
    const inst = await svc.provisionInstance({
      tenantId: 't_072',
      industry: 'healthcare',
      limits: { maxRecordsPerTenant: 100 },
    });
    await svc.recordUsage(inst.instanceId, { recordsActive: 500 });
    const result = await svc.checkLimits(inst.instanceId);
    expect(result.violations.some((v) => v.metric === 'recordsActive')).toBe(true);
  });

  it('returns SUSPENDED status violation', async () => {
    const inst = await svc.provisionInstance({ tenantId: 't_073', industry: 'healthcare' });
    await svc.suspendInstance(inst.instanceId);
    const result = await svc.checkLimits(inst.instanceId);
    expect(result.violations.some((v) => v.metric === 'status')).toBe(true);
  });
});

describe('getStats', () => {
  it('aggregates by status, industry, and isolation', async () => {
    await svc.provisionInstance({ tenantId: 't_a1', industry: 'healthcare' });
    await svc.provisionInstance({ tenantId: 't_a2', industry: 'finance' });
    const iso = await svc.provisionInstance({
      tenantId: 't_a3',
      industry: 'hotel',
      isolationLevel: 'ISOLATED',
    });
    await svc.suspendInstance(iso.instanceId);
    const stats = await svc.getStats();
    expect(stats.instances.byStatus.ACTIVE).toBe(2);
    expect(stats.instances.byStatus.SUSPENDED).toBe(1);
    expect(stats.instances.byIndustry.healthcare).toBe(1);
    expect(stats.instances.byIndustry.finance).toBe(1);
    expect(stats.instances.byIndustry.hotel).toBe(1);
  });

  it('filters by industry', async () => {
    await svc.provisionInstance({ tenantId: 't_h1', industry: 'healthcare' });
    await svc.provisionInstance({ tenantId: 't_f1', industry: 'finance' });
    const stats = await svc.getStats({ industry: 'healthcare' });
    expect(stats.instances.byIndustry.healthcare).toBe(1);
    expect(stats.instances.byIndustry.finance).toBeUndefined();
  });

  it('aggregates usage totals', async () => {
    const inst1 = await svc.provisionInstance({ tenantId: 't_b1', industry: 'healthcare' });
    const inst2 = await svc.provisionInstance({ tenantId: 't_b2', industry: 'finance' });
    await svc.recordUsage(inst1.instanceId, { apiCalls: 100, workflowsExecuted: 5 });
    await svc.recordUsage(inst2.instanceId, { apiCalls: 50, workflowsExecuted: 3 });
    const stats = await svc.getStats();
    expect(stats.usage.totalApiCalls).toBe(150);
    expect(stats.usage.totalWorkflowsExecuted).toBe(8);
  });
});