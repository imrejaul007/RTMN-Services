/**
 * Multi-Tenancy Service - Tenant isolation and shared infrastructure
 * Supports multiple tenants on shared infrastructure with data isolation
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
const PORT = process.env.PORT || 5382;

app.use(cors());
app.use(express.json());

// Default quotas per plan
const DEFAULT_QUOTAS = {
  free: { workflows: 10, executions: 1000, storage: 100, apiCalls: 10000 },
  starter: { workflows: 50, executions: 10000, storage: 1000, apiCalls: 100000 },
  professional: { workflows: 200, executions: 100000, storage: 10000, apiCalls: 1000000 },
  enterprise: { workflows: -1, executions: -1, storage: -1, apiCalls: -1 }, // unlimited
};

// In-memory storage
const tenants = new Map();
const tenantData = new Map(); // tenantId -> { workflows, executions, ... }
const sharedResources = new Map(); // Shared templates, connectors, etc.

// Tenant operations
function createTenant(data) {
  const tenantId = crypto.randomUUID();
  const now = Date.now();

  const tenant = {
    id: tenantId,
    name: data.name,
    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
    plan: data.plan || 'free',
    status: 'active',
    settings: {
      timezone: data.settings?.timezone || 'UTC',
      language: data.settings?.language || 'en',
      notifications: data.settings?.notifications ?? true,
      ...data.settings,
    },
    quotas: { ...DEFAULT_QUOTAS[data.plan || 'free'] },
    usage: {
      workflows: 0,
      executions: 0,
      storage: 0,
      apiCalls: 0,
    },
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };

  tenants.set(tenantId, tenant);

  // Initialize tenant data isolation
  tenantData.set(tenantId, {
    workflows: new Map(),
    executions: new Map(),
    connectors: new Map(),
    secrets: new Map(),
    auditLogs: [],
  });

  return tenant;
}

function getTenant(tenantId) {
  return tenants.get(tenantId) || null;
}

function getTenantBySlug(slug) {
  for (const tenant of tenants.values()) {
    if (tenant.slug === slug) return tenant;
  }
  return null;
}

function updateTenant(tenantId, updates) {
  const tenant = tenants.get(tenantId);
  if (!tenant) throw new Error('Tenant not found');

  if (updates.name) tenant.name = updates.name;
  if (updates.plan && updates.plan !== tenant.plan) {
    tenant.plan = updates.plan;
    tenant.quotas = { ...DEFAULT_QUOTAS[updates.plan] };
  }
  if (updates.status) tenant.status = updates.status;
  if (updates.settings) tenant.settings = { ...tenant.settings, ...updates.settings };
  if (updates.metadata) tenant.metadata = { ...tenant.metadata, ...updates.metadata };

  tenant.updatedAt = Date.now();
  tenants.set(tenantId, tenant);

  return tenant;
}

function deleteTenant(tenantId) {
  const tenant = tenants.get(tenantId);
  if (!tenant) throw new Error('Tenant not found');

  tenant.status = 'deleted';
  tenant.deletedAt = Date.now();
  tenants.set(tenantId, tenant);
  tenantData.delete(tenantId);

  return { deleted: true };
}

// Tenant data isolation
function getTenantData(tenantId) {
  return tenantData.get(tenantId) || null;
}

function isolateData(tenantId, dataType) {
  const tenant = tenants.get(tenantId);
  if (!tenant) throw new Error('Tenant not found');

  const tenantDataStore = tenantData.get(tenantId);
  if (!tenantDataStore) throw new Error('Tenant data not initialized');

  // Return namespaced data for isolation
  return {
    tenantId,
    tenantSlug: tenant.slug,
    dataType,
    data: tenantDataStore[dataType] || new Map(),
    isolation: {
      isIsolated: true,
      namespace: `tenant_${tenant.slug}`,
      prefix: `${tenant.slug}_`,
    },
  };
}

// Quota management
function checkQuota(tenantId, resource, requested = 1) {
  const tenant = tenants.get(tenantId);
  if (!tenant) throw new Error('Tenant not found');

  const currentUsage = tenant.usage[resource] || 0;
  const limit = tenant.quotas[resource];

  if (limit === -1) return { allowed: true, remaining: Infinity };

  const remaining = limit - currentUsage;
  return {
    allowed: remaining >= requested,
    current: currentUsage,
    limit,
    remaining: Math.max(0, remaining - requested),
  };
}

function incrementUsage(tenantId, resource, amount = 1) {
  const tenant = tenants.get(tenantId);
  if (!tenant) throw new Error('Tenant not found');

  tenant.usage[resource] = (tenant.usage[resource] || 0) + amount;
  tenant.lastActivityAt = Date.now();
  tenants.set(tenantId, tenant);

  return tenant.usage;
}

function getQuotaStatus(tenantId) {
  const tenant = tenants.get(tenantId);
  if (!tenant) throw new Error('Tenant not found');

  const status = {
    plan: tenant.plan,
    quotas: {},
    usage: { ...tenant.usage },
    warnings: [],
    exceeded: [],
  };

  for (const [resource, limit] of Object.entries(tenant.quotas)) {
    const usage = tenant.usage[resource] || 0;
    const remaining = limit === -1 ? Infinity : limit - usage;
    const percentUsed = limit === -1 ? 0 : (usage / limit) * 100;

    status.quotas[resource] = { limit, remaining, percentUsed };

    if (percentUsed >= 90) {
      status.exceeded.push(resource);
      status.warnings.push(`${resource} at ${percentUsed.toFixed(0)}% capacity`);
    } else if (percentUsed >= 75) {
      status.warnings.push(`${resource} at ${percentUsed.toFixed(0)}% capacity`);
    }
  }

  return status;
}

// Shared resources
function addSharedResource(type, resource) {
  const key = `${type}:${resource.id}`;
  sharedResources.set(key, {
    ...resource,
    type,
    sharedAt: Date.now(),
  });
  return sharedResources.get(key);
}

function getSharedResources(type) {
  const results = [];
  for (const resource of sharedResources.values()) {
    if (resource.type === type) results.push(resource);
  }
  return results;
}

// Tenant metrics
function getTenantMetrics(tenantId) {
  const tenant = tenants.get(tenantId);
  if (!tenant) throw new Error('Tenant not found');

  const data = tenantData.get(tenantId);
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const recentExecutions = Array.from(data?.executions?.values() || [])
    .filter(e => e.startedAt > dayAgo);

  return {
    tenantId,
    plan: tenant.plan,
    status: tenant.status,
    usage: tenant.usage,
    quotas: tenant.quotas,
    metrics: {
      workflowCount: data?.workflows?.size || 0,
      executionCount: data?.executions?.size || 0,
      recentExecutions24h: recentExecutions.length,
      avgExecutionsPerDay: recentExecutions.length,
      storageUsed: tenant.usage.storage,
    },
    activity: {
      lastActivity: tenant.lastActivityAt,
      daysActive: Math.floor((now - tenant.createdAt) / (24 * 60 * 60 * 1000)),
    },
  };
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'multi-tenancy', port: PORT });
});

// Tenant management
app.post('/api/tenants', requireInternal, (req, res) => {
  try {
    const tenant = createTenant(req.body);
    res.status(201).json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tenants', (req, res) => {
  try {
    const all = Array.from(tenants.values()).filter(t => t.status !== 'deleted');
    res.json(all);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tenants/:id', (req, res) => {
  try {
    const tenant = getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tenants/:id', requireInternal, (req, res) => {
  try {
    const tenant = updateTenant(req.params.id, req.body);
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tenants/:id', requireInternal, (req, res) => {
  try {
    const result = deleteTenant(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quota management
app.get('/api/tenants/:id/quota', (req, res) => {
  try {
    const status = getQuotaStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tenants/:id/quota/check', requireInternal, (req, res) => {
  try {
    const { resource, requested } = req.body;
    const result = checkQuota(req.params.id, resource, requested);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tenants/:id/usage', requireInternal, (req, res) => {
  try {
    const { resource, amount } = req.body;
    const usage = incrementUsage(req.params.id, resource, amount);
    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Isolation
app.post('/api/tenants/:id/isolate', requireInternal, (req, res) => {
  try {
    const { dataType } = req.body;
    const isolated = isolateData(req.params.id, dataType);
    res.json(isolated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Metrics
app.get('/api/tenants/:id/metrics', (req, res) => {
  try {
    const metrics = getTenantMetrics(req.params.id);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shared resources
app.post('/api/shared', requireInternal, (req, res) => {
  try {
    const { type, resource } = req.body;
    const added = addSharedResource(type, resource);
    res.status(201).json(added);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/shared/:type', (req, res) => {
  try {
    const resources = getSharedResources(req.params.type);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stats
app.get('/api/stats', (req, res) => {
  const all = Array.from(tenants.values());
  const active = all.filter(t => t.status === 'active');

  const totalUsage = { workflows: 0, executions: 0, storage: 0, apiCalls: 0 };
  for (const tenant of active) {
    for (const [key, val] of Object.entries(tenant.usage)) {
      totalUsage[key] += val;
    }
  }

  res.json({
    totalTenants: all.length,
    activeTenants: active.length,
    totalUsage,
    byPlan: active.reduce((acc, t) => {
      acc[t.plan] = (acc[t.plan] || 0) + 1;
      return acc;
    }, {}),
  });
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
  console.log(`Multi-Tenancy Service running on port ${PORT}`);
});

export { app, createTenant, getTenant, updateTenant, deleteTenant, getQuotaStatus, checkQuota, incrementUsage, isolateData, DEFAULT_QUOTAS };