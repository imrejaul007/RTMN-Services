import { describe, it, expect, beforeEach } from 'vitest';

const DEFAULT_QUOTAS = {
  free: { workflows: 10, executions: 1000, storage: 100, apiCalls: 10000 },
  starter: { workflows: 50, executions: 10000, storage: 1000, apiCalls: 100000 },
  professional: { workflows: 200, executions: 100000, storage: 10000, apiCalls: 1000000 },
  enterprise: { workflows: -1, executions: -1, storage: -1, apiCalls: -1 },
};

const createService = () => {
  const tenants = new Map();
  const tenantData = new Map();
  const sharedResources = new Map();

  const createTenant = (data) => {
    const tenantId = crypto.randomUUID();
    const tenant = {
      id: tenantId,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      plan: data.plan || 'free',
      status: 'active',
      settings: { timezone: 'UTC', language: 'en', notifications: true, ...data.settings },
      quotas: { ...DEFAULT_QUOTAS[data.plan || 'free'] },
      usage: { workflows: 0, executions: 0, storage: 0, apiCalls: 0 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    tenants.set(tenantId, tenant);
    tenantData.set(tenantId, { workflows: new Map(), executions: new Map(), connectors: new Map(), secrets: new Map() });
    return tenant;
  };

  const getTenant = (id) => tenants.get(id) || null;

  const updateTenant = (id, updates) => {
    const tenant = tenants.get(id);
    if (!tenant) throw new Error('Tenant not found');
    if (updates.plan && updates.plan !== tenant.plan) {
      tenant.plan = updates.plan;
      tenant.quotas = { ...DEFAULT_QUOTAS[updates.plan] };
    }
    if (updates.name) tenant.name = updates.name;
    if (updates.status) tenant.status = updates.status;
    tenant.updatedAt = Date.now();
    return tenant;
  };

  const deleteTenant = (id) => {
    const tenant = tenants.get(id);
    if (!tenant) throw new Error('Tenant not found');
    tenant.status = 'deleted';
    tenantData.delete(id);
    return { deleted: true };
  };

  const checkQuota = (tenantId, resource, requested = 1) => {
    const tenant = tenants.get(tenantId);
    if (!tenant) throw new Error('Tenant not found');
    const currentUsage = tenant.usage[resource] || 0;
    const limit = tenant.quotas[resource];
    if (limit === -1) return { allowed: true, remaining: Infinity };
    const remaining = limit - currentUsage;
    return { allowed: remaining >= requested, current: currentUsage, limit, remaining: Math.max(0, remaining - requested) };
  };

  const incrementUsage = (tenantId, resource, amount = 1) => {
    const tenant = tenants.get(tenantId);
    if (!tenant) throw new Error('Tenant not found');
    tenant.usage[resource] = (tenant.usage[resource] || 0) + amount;
    return tenant.usage;
  };

  const getQuotaStatus = (tenantId) => {
    const tenant = tenants.get(tenantId);
    if (!tenant) throw new Error('Tenant not found');
    const status = { plan: tenant.plan, quotas: {}, usage: { ...tenant.usage }, warnings: [], exceeded: [] };
    for (const [resource, limit] of Object.entries(tenant.quotas)) {
      const usage = tenant.usage[resource] || 0;
      const percentUsed = limit === -1 ? 0 : (usage / limit) * 100;
      status.quotas[resource] = { limit, percentUsed };
      if (percentUsed >= 90) status.exceeded.push(resource);
      else if (percentUsed >= 75) status.warnings.push(`${resource} at ${percentUsed.toFixed(0)}%`);
    }
    return status;
  };

  const isolateData = (tenantId, dataType) => {
    const tenant = tenants.get(tenantId);
    if (!tenant) throw new Error('Tenant not found');
    const data = tenantData.get(tenantId);
    return { tenantId, tenantSlug: tenant.slug, dataType, data: data?.[dataType] || new Map(), isolation: { isIsolated: true, namespace: `tenant_${tenant.slug}` } };
  };

  const getTenantMetrics = (tenantId) => {
    const tenant = tenants.get(tenantId);
    if (!tenant) throw new Error('Tenant not found');
    const data = tenantData.get(tenantId);
    return { tenantId, plan: tenant.plan, usage: tenant.usage, metrics: { workflowCount: data?.workflows?.size || 0, executionCount: data?.executions?.size || 0 } };
  };

  return { tenants, createTenant, getTenant, updateTenant, deleteTenant, checkQuota, incrementUsage, getQuotaStatus, isolateData, getTenantMetrics };
};

import crypto from 'crypto';

describe('MultiTenancy', () => {
  let service;

  beforeEach(() => { service = createService(); });

  describe('createTenant', () => {
    it('should create tenant with default free plan', () => {
      const tenant = service.createTenant({ name: 'Acme Corp' });
      expect(tenant).toBeDefined();
      expect(tenant.name).toBe('Acme Corp');
      expect(tenant.plan).toBe('free');
      expect(tenant.quotas.workflows).toBe(10);
    });

    it('should create tenant with specified plan', () => {
      const tenant = service.createTenant({ name: 'Enterprise', plan: 'enterprise' });
      expect(tenant.plan).toBe('enterprise');
      expect(tenant.quotas.workflows).toBe(-1); // unlimited
    });

    it('should generate slug from name', () => {
      const tenant = service.createTenant({ name: 'My Company Inc' });
      expect(tenant.slug).toBe('my-company-inc');
    });

    it('should initialize usage to zero', () => {
      const tenant = service.createTenant({ name: 'Test' });
      expect(tenant.usage.workflows).toBe(0);
      expect(tenant.usage.executions).toBe(0);
    });
  });

  describe('getTenant', () => {
    it('should retrieve existing tenant', () => {
      const created = service.createTenant({ name: 'Test' });
      const retrieved = service.getTenant(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent tenant', () => {
      expect(service.getTenant('non-existent')).toBeNull();
    });
  });

  describe('updateTenant', () => {
    it('should update tenant name', () => {
      const tenant = service.createTenant({ name: 'Old Name' });
      const updated = service.updateTenant(tenant.id, { name: 'New Name' });
      expect(updated.name).toBe('New Name');
    });

    it('should upgrade plan and quotas', () => {
      const tenant = service.createTenant({ name: 'Test', plan: 'free' });
      const updated = service.updateTenant(tenant.id, { plan: 'professional' });
      expect(updated.plan).toBe('professional');
      expect(updated.quotas.workflows).toBe(200);
    });

    it('should throw for non-existent tenant', () => {
      expect(() => service.updateTenant('non-existent', { name: 'Test' })).toThrow('Tenant not found');
    });
  });

  describe('deleteTenant', () => {
    it('should soft delete tenant', () => {
      const tenant = service.createTenant({ name: 'Test' });
      service.deleteTenant(tenant.id);
      const retrieved = service.getTenant(tenant.id);
      expect(retrieved.status).toBe('deleted');
    });
  });

  describe('quota management', () => {
    it('should allow action within quota', () => {
      const tenant = service.createTenant({ name: 'Test' });
      const result = service.checkQuota(tenant.id, 'workflows', 5);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('should deny action exceeding quota', () => {
      const tenant = service.createTenant({ name: 'Test' });
      service.incrementUsage(tenant.id, 'workflows', 9);
      const result = service.checkQuota(tenant.id, 'workflows', 5);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should allow unlimited for enterprise', () => {
      const tenant = service.createTenant({ name: 'Test', plan: 'enterprise' });
      const result = service.checkQuota(tenant.id, 'workflows', 1000000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it('should track usage accurately', () => {
      const tenant = service.createTenant({ name: 'Test' });
      service.incrementUsage(tenant.id, 'executions', 100);
      service.incrementUsage(tenant.id, 'executions', 50);
      expect(service.getQuotaStatus(tenant.id).usage.executions).toBe(150);
    });

    it('should warn at 75% capacity', () => {
      const tenant = service.createTenant({ name: 'Test' });
      service.incrementUsage(tenant.id, 'workflows', 8);
      const status = service.getQuotaStatus(tenant.id);
      expect(status.warnings.length).toBeGreaterThan(0);
    });

    it('should mark as exceeded at 90% capacity', () => {
      const tenant = service.createTenant({ name: 'Test' });
      service.incrementUsage(tenant.id, 'workflows', 9);
      const status = service.getQuotaStatus(tenant.id);
      expect(status.exceeded).toContain('workflows');
    });
  });

  describe('data isolation', () => {
    it('should isolate tenant data', () => {
      const tenant = service.createTenant({ name: 'Test Tenant' });
      const isolated = service.isolateData(tenant.id, 'workflows');
      expect(isolated.isolation.isIsolated).toBe(true);
      expect(isolated.isolation.namespace).toBe('tenant_test-tenant');
    });

    it('should have tenant-specific prefix', () => {
      const tenant = service.createTenant({ name: 'MyApp' });
      const isolated = service.isolateData(tenant.id, 'workflows');
      expect(isolated.tenantSlug).toBe('myapp');
    });
  });

  describe('metrics', () => {
    it('should return tenant metrics', () => {
      const tenant = service.createTenant({ name: 'Test' });
      service.incrementUsage(tenant.id, 'executions', 100);
      const metrics = service.getTenantMetrics(tenant.id);
      expect(metrics.usage.executions).toBe(100);
      expect(metrics.plan).toBe('free');
    });
  });

  describe('tenant lifecycle', () => {
    it('should handle complete tenant lifecycle', () => {
      // Create
      const tenant = service.createTenant({ name: 'Lifecycle Corp', plan: 'starter' });
      expect(tenant.status).toBe('active');

      // Use
      service.incrementUsage(tenant.id, 'workflows', 5);
      service.incrementUsage(tenant.id, 'executions', 1000);

      // Check quota
      const quota = service.getQuotaStatus(tenant.id);
      expect(quota.usage.workflows).toBe(5);

      // Upgrade
      const upgraded = service.updateTenant(tenant.id, { plan: 'professional' });
      expect(upgraded.quotas.workflows).toBe(200);

      // Delete
      service.deleteTenant(tenant.id);
      const deleted = service.getTenant(tenant.id);
      expect(deleted.status).toBe('deleted');
    });
  });
});