/**
 * Agent Lifecycle Management API (port 4910)
 *
 * Full dev → deploy → monitor → deprecate → retire lifecycle for AI agents.
 * Self-contained CommonJS — no external shared lib dependencies.
 *
 * Architecture:
 *   - agents: registry of all agent definitions
 *   - versions: per-agent version history (semantic versioning)
 *   - deployments: per-agent deployment records
 *   - metrics: per-agent runtime metrics
 *   - policies: deployment/deprecation/retirement policies
 *
 * @phase Phase 40
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.env.PORT, 10) || 4910;
const SERVICE_NAME = 'agent-lifecycle-api';
const VERSION = '1.0.0';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-dev-token';
const REQUIRE_AUTH = (process.env.SERVICE_REQUIRE_AUTH || 'true').toLowerCase() !== 'false';
const NO_LISTEN = (process.env.SERVICE_NO_LISTEN ?? '').toLowerCase() === 'true' || process.env.NODE_ENV === 'test';

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function authOrBypass(req, res, next) {
  if (REQUIRE_AUTH && req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} agentId → agent */
const agents = new Map();

/** @type {Map<string, Map<string, object>>} agentId → versionId → version */
const versions = new Map();

/** @type {Map<string, Map<string, object>>} agentId → deploymentId → deployment */
const deployments = new Map();

/** @type {Map<string, Map<string, object>>} agentId → timestamp → metrics */
const metrics = new Map();

/** @type {Map<string, object>} policyId → policy */
const policies = new Map();

// Seed default policies
(function seedPolicies() {
  const defaultPolicies = [
    {
      id: 'policy-deploy-default',
      name: 'Default Deployment',
      type: 'deployment',
      createdAt: new Date().toISOString(),
      config: {
        strategy: 'canary',
        canarySteps: [1, 10, 50, 100],
        autoRollback: true,
        rollbackThreshold: 0.05,
        approvalRequired: false
      }
    },
    {
      id: 'policy-deprecate-default',
      name: 'Default Deprecation',
      type: 'deprecation',
      createdAt: new Date().toISOString(),
      config: {
        noticeDays: 90,
        autoMigrate: true,
        userNotifications: true
      }
    },
    {
      id: 'policy-retire-default',
      name: 'Default Retirement',
      type: 'retirement',
      createdAt: new Date().toISOString(),
      config: {
        gracePeriodDays: 30,
        backupBeforeRetire: true,
        softDeleteFirst: true
      }
    }
  ];
  for (const p of defaultPolicies) {
    policies.set(p.id, p);
  }
})();

const AUDIT_CAP = 5000;
const auditLog = [];

const stats = {
  agentsCreated: 0,
  agentsDeleted: 0,
  versionsCreated: 0,
  deploymentsAttempted: 0,
  deploymentsSucceeded: 0,
  deploymentsFailed: 0,
  rollbacks: 0,
  deprecations: 0,
  retirements: 0,
  errors: 0
};

const startedAt = new Date().toISOString();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function principalOf(req) {
  return req.headers['x-actor'] || req.headers['x-principal'] || 'anonymous';
}

function audit(entry) {
  const record = { ...entry, ts: new Date().toISOString(), actor: principalOf(entry._req || {}) };
  delete record._req;
  auditLog.push(record);
  if (auditLog.length > AUDIT_CAP) auditLog.splice(0, auditLog.length - AUDIT_CAP);
}

function nextVersion(semver) {
  const parts = String(semver).split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

function compareSemver(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
  }
  return 0;
}

function getLatestVersion(agentId) {
  const vs = versions.get(agentId);
  if (!vs || vs.size === 0) return null;
  const sorted = Array.from(vs.values()).sort((a, b) => compareSemver(b.semver, a.semver));
  return sorted[0];
}

function agentHealthStatus(agent) {
  if (agent.status === 'retired') return 'retired';
  const deps = deployments.get(agent.id);
  if (!deps || deps.size === 0) return 'undeployed';
  const active = Array.from(deps.values()).filter(d => d.status === 'active');
  if (active.length === 0) return 'stopped';
  return 'healthy';
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();
app.use(helmet());
app.use(cors('*'));
app.use(express.json({ limit: '10mb' }));

// Readiness probe FIRST
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/health', (_req, res) => res.redirect(301, '/api/health'));

/** GET /api/health */
app.get('/api/health', (_req, res) => {
  const healthy = Array.from(agents.values()).filter(a => agentHealthStatus(a) === 'healthy').length;
  const total = agents.size;
  res.json({
    status: total > 0 ? 'healthy' : 'empty',
    service: SERVICE_NAME,
    port: String(PORT),
    version: VERSION,
    counts: {
      agents: agents.size,
      policies: policies.size,
      healthy,
      undeployed: Array.from(agents.values()).filter(a => agentHealthStatus(a) === 'undeployed').length
    },
    stats,
    uptime: process.uptime(),
    startedAt,
    timestamp: new Date().toISOString()
  });
});

// ===============================
// AGENTS CRUD
// ===============================

/** POST /api/agents — Create a new agent */
app.post('/api/agents', authOrBypass, (req, res) => {
  const { name, description, model, prompt, tools, skills, metadata } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name (non-empty string) is required' });
  }

  for (const a of agents.values()) {
    if (a.name === name.trim()) {
      return res.status(409).json({ error: `Agent with name '${name}' already exists` });
    }
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  const agent = {
    id,
    name: name.trim(),
    description: typeof description === 'string' ? description : '',
    model: model || 'gpt-4o-mini',
    prompt: prompt || '',
    tools: Array.isArray(tools) ? tools : [],
    skills: Array.isArray(skills) ? skills : [],
    metadata: (metadata && typeof metadata === 'object') ? metadata : {},
    status: 'draft',
    versionCount: 0,
    deployedVersion: null,
    environments: { dev: null, staging: null, production: null },
    createdAt: now,
    updatedAt: now,
    createdBy: principalOf(req)
  };

  agents.set(id, agent);
  versions.set(id, new Map());
  deployments.set(id, new Map());
  metrics.set(id, new Map());
  stats.agentsCreated++;

  audit({ _req: req, op: 'agent.create', agentId: id, name: agent.name });

  res.status(201).json({ message: 'Agent created', agent });
});

/** GET /api/agents — List all agents */
app.get('/api/agents', (req, res) => {
  const { status, limit, offset } = req.query;
  let list = Array.from(agents.values()).map(a => ({
    ...a,
    healthStatus: agentHealthStatus(a),
    versionCount: (versions.get(a.id) || new Map()).size,
    latestVersion: getLatestVersion(a.id)
  }));

  if (status) list = list.filter(a => a.status === status);

  const off = parseInt(offset) || 0;
  const lim = Math.min(parseInt(limit) || 50, 500);
  const page = list.slice(off, off + lim);

  res.json({ count: list.length, limit: lim, offset: off, agents: page });
});

/** GET /api/agents/:id — Get one agent */
app.get('/api/agents/:id', (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  const agentVersions = versions.get(a.id) || new Map();
  const agentDeployments = deployments.get(a.id) || new Map();
  const activeDeployments = Array.from(agentDeployments.values()).filter(d => d.status === 'active');

  res.json({
    agent: {
      ...a,
      healthStatus: agentHealthStatus(a),
      versionCount: agentVersions.size,
      latestVersion: getLatestVersion(a.id),
      activeDeployments
    }
  });
});

/** PUT /api/agents/:id — Update agent */
app.put('/api/agents/:id', authOrBypass, (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  const { name, description, model, prompt, tools, skills, metadata, status } = req.body || {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name must be a non-empty string' });
    }
    for (const other of agents.values()) {
      if (other.id !== a.id && other.name === name.trim()) {
        return res.status(409).json({ error: `Agent with name '${name}' already exists` });
      }
    }
    a.name = name.trim();
  }

  if (description !== undefined) a.description = description;
  if (model !== undefined) a.model = model;
  if (prompt !== undefined) a.prompt = prompt;
  if (Array.isArray(tools)) a.tools = tools;
  if (Array.isArray(skills)) a.skills = skills;
  if (metadata && typeof metadata === 'object') a.metadata = { ...a.metadata, ...metadata };
  if (status !== undefined) {
    const validStatuses = ['draft', 'active', 'deprecated', 'retired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }
    a.status = status;
  }
  a.updatedAt = new Date().toISOString();

  audit({ _req: req, op: 'agent.update', agentId: a.id, changes: Object.keys(req.body || {}) });

  res.json({ message: 'Agent updated', agent: a });
});

/** DELETE /api/agents/:id — Delete agent */
app.delete('/api/agents/:id', authOrBypass, (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  if (a.status === 'active') {
    return res.status(400).json({ error: 'Cannot delete an active agent. Retire it first.' });
  }

  const deploymentsRemoved = (deployments.get(a.id) || new Map()).size;
  const versionsRemoved = (versions.get(a.id) || new Map()).size;

  agents.delete(a.id);
  versions.delete(a.id);
  deployments.delete(a.id);
  metrics.delete(a.id);
  stats.agentsDeleted++;

  audit({ _req: req, op: 'agent.delete', agentId: a.id, name: a.name });

  res.json({
    message: 'Agent deleted',
    id: a.id,
    name: a.name,
    removedVersions: versionsRemoved,
    removedDeployments: deploymentsRemoved
  });
});

// ===============================
// VERSIONING
// ===============================

/** POST /api/agents/:id/versions — Create new version */
app.post('/api/agents/:id/versions', authOrBypass, (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  const { prompt, model, tools, skills, changelog, tags } = req.body || {};

  const existingVersions = versions.get(a.id) || new Map();
  let semver;
  if (existingVersions.size === 0) {
    semver = '1.0.0';
  } else {
    const latest = getLatestVersion(a.id);
    semver = nextVersion(latest ? latest.semver : '1.0.0');
  }

  const versionId = uuidv4();
  const now = new Date().toISOString();

  const version = {
    id: versionId,
    agentId: a.id,
    semver,
    prompt: prompt !== undefined ? prompt : a.prompt,
    model: model !== undefined ? model : a.model,
    tools: tools !== undefined ? tools : a.tools,
    skills: skills !== undefined ? skills : a.skills,
    changelog: changelog || '',
    tags: Array.isArray(tags) ? tags : [],
    status: 'draft',
    testResults: null,
    createdAt: now,
    createdBy: principalOf(req)
  };

  existingVersions.set(versionId, version);
  versions.set(a.id, existingVersions);

  a.versionCount = existingVersions.size;
  a.updatedAt = now;
  stats.versionsCreated++;

  audit({ _req: req, op: 'version.create', agentId: a.id, versionId, semver });

  res.status(201).json({ message: 'Version created', version });
});

/** GET /api/agents/:id/versions — List versions */
app.get('/api/agents/:id/versions', (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  const vs = Array.from((versions.get(a.id) || new Map()).values());
  vs.sort((a, b) => compareSemver(b.semver, a.semver));

  res.json({ count: vs.length, versions: vs });
});

/** GET /api/agents/:id/versions/:semver — Get specific version */
app.get('/api/agents/:id/versions/:semver', (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  const vs = versions.get(a.id) || new Map();
  const version = Array.from(vs.values()).find(v => v.semver === req.params.semver);
  if (!version) return res.status(404).json({ error: `Version ${req.params.semver} not found` });

  res.json({ version });
});

/** POST /api/agents/:id/versions/:semver/rollback — Rollback to previous version */
app.post('/api/agents/:id/versions/:semver/rollback', authOrBypass, (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  const vs = versions.get(a.id) || new Map();
  const current = Array.from(vs.values()).find(v => v.semver === req.params.semver);
  if (!current) return res.status(404).json({ error: `Version ${req.params.semver} not found` });

  const all = Array.from(vs.values()).sort((x, y) => compareSemver(y.semver, x.semver));
  const idx = all.findIndex(v => v.semver === req.params.semver);
  const previous = idx < all.length - 1 ? all[idx + 1] : null;

  if (!previous) {
    return res.status(400).json({ error: 'No previous version to rollback to' });
  }

  stats.rollbacks++;

  audit({
    _req: req,
    op: 'version.rollback',
    agentId: a.id,
    fromVersion: req.params.semver,
    toVersion: previous.semver
  });

  res.json({
    message: 'Rollback scheduled',
    fromVersion: req.params.semver,
    toVersion: previous.semver,
    version: previous
  });
});

// ===============================
// DEPLOYMENT
// ===============================

/** POST /api/agents/:id/deploy — Deploy to an environment */
app.post('/api/agents/:id/deploy', authOrBypass, (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  const { version, environment, strategy } = req.body || {};
  if (!environment || !['dev', 'staging', 'production'].includes(environment)) {
    return res.status(400).json({ error: 'environment (dev|staging|production) is required' });
  }

  const vs = versions.get(a.id) || new Map();
  let targetVersion;

  if (version) {
    targetVersion = Array.from(vs.values()).find(v => v.semver === version);
    if (!targetVersion) return res.status(404).json({ error: `Version ${version} not found` });
  } else {
    targetVersion = getLatestVersion(a.id);
    if (!targetVersion) return res.status(400).json({ error: 'No versions found. Create a version first.' });
  }

  const deploymentId = uuidv4();
  const now = new Date().toISOString();

  const deployment = {
    id: deploymentId,
    agentId: a.id,
    versionId: targetVersion.id,
    semver: targetVersion.semver,
    environment,
    strategy: strategy || 'rolling',
    status: 'active',
    trafficPercent: environment === 'production' ? 0 : 100,
    rolloutHistory: [{ at: now, percent: environment === 'production' ? 0 : 100, note: 'Initial deploy' }],
    deployedAt: now,
    deployedBy: principalOf(req),
    metrics: { requests: 0, errors: 0, avgLatencyMs: 0, costUsd: 0 }
  };

  const deps = deployments.get(a.id) || new Map();
  deps.set(deploymentId, deployment);
  deployments.set(a.id, deps);

  a.environments[environment] = deploymentId;
  if (a.status === 'draft') a.status = 'active';
  a.deployedVersion = targetVersion.semver;
  a.updatedAt = now;

  targetVersion.status = 'production';
  stats.deploymentsAttempted++;
  stats.deploymentsSucceeded++;

  audit({
    _req: req,
    op: 'deployment.create',
    agentId: a.id,
    deploymentId,
    environment,
    version: targetVersion.semver
  });

  res.status(201).json({ message: 'Deployed', deployment });
});

/** POST /api/agents/:id/canary — Canary deployment */
app.post('/api/agents/:id/canary', authOrBypass, (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  const { version, environment, trafficPercent } = req.body || {};
  if (!environment || !['dev', 'staging', 'production'].includes(environment)) {
    return res.status(400).json({ error: 'environment is required' });
  }
  if (typeof trafficPercent !== 'number' || trafficPercent < 0 || trafficPercent > 100) {
    return res.status(400).json({ error: 'trafficPercent must be 0-100' });
  }

  const vs = versions.get(a.id) || new Map();
  let targetVersion;

  if (version) {
    targetVersion = Array.from(vs.values()).find(v => v.semver === version);
    if (!targetVersion) return res.status(404).json({ error: `Version ${version} not found` });
  } else {
    targetVersion = getLatestVersion(a.id);
    if (!targetVersion) return res.status(400).json({ error: 'No versions found' });
  }

  const deploymentId = uuidv4();
  const now = new Date().toISOString();

  const deployment = {
    id: deploymentId,
    agentId: a.id,
    versionId: targetVersion.id,
    semver: targetVersion.semver,
    environment,
    strategy: 'canary',
    status: 'active',
    trafficPercent,
    rolloutHistory: [{ at: now, percent: trafficPercent, note: 'Canary initiated' }],
    deployedAt: now,
    deployedBy: principalOf(req),
    metrics: { requests: 0, errors: 0, avgLatencyMs: 0, costUsd: 0 }
  };

  const deps = deployments.get(a.id) || new Map();
  deps.set(deploymentId, deployment);
  deployments.set(a.id, deps);
  a.environments[environment] = deploymentId;
  stats.deploymentsAttempted++;
  stats.deploymentsSucceeded++;

  audit({
    _req: req,
    op: 'deployment.canary',
    agentId: a.id,
    deploymentId,
    environment,
    trafficPercent,
    version: targetVersion.semver
  });

  res.status(201).json({ message: 'Canary deployment started', deployment });
});

/** GET /api/agents/:id/deployments — List deployments */
app.get('/api/agents/:id/deployments', (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  const { environment, status, limit } = req.query;
  let list = Array.from((deployments.get(a.id) || new Map()).values());

  if (environment) list = list.filter(d => d.environment === environment);
  if (status) list = list.filter(d => d.status === status);
  list.sort((a, b) => b.deployedAt.localeCompare(a.deployedAt));

  const lim = Math.min(parseInt(limit) || 50, 500);
  res.json({ count: list.length, deployments: list.slice(0, lim) });
});

// ===============================
// MONITORING
// ===============================

/** GET /api/agents/:id/metrics — Get agent metrics */
app.get('/api/agents/:id/metrics', (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  const deps = deployments.get(a.id) || new Map();
  const activeDeps = Array.from(deps.values()).filter(d => d.status === 'active');

  let totalRequests = 0, totalErrors = 0, totalCost = 0, totalLatency = 0;
  for (const d of activeDeps) {
    totalRequests += d.metrics.requests || 0;
    totalErrors += d.metrics.errors || 0;
    totalCost += d.metrics.costUsd || 0;
    totalLatency += d.metrics.avgLatencyMs || 0;
  }

  const count = activeDeps.length;
  res.json({
    agentId: a.id,
    agentName: a.name,
    status: agentHealthStatus(a),
    deployedVersion: a.deployedVersion,
    activeEnvironments: activeDeps.map(d => d.environment),
    metrics: {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? +(totalErrors / totalRequests).toFixed(4) : 0,
      totalCostUsd: +totalCost.toFixed(6),
      avgLatencyMs: count > 0 ? Math.round(totalLatency / count) : 0
    },
    byEnvironment: activeDeps.map(d => ({
      environment: d.environment,
      version: d.semver,
      trafficPercent: d.trafficPercent,
      ...d.metrics
    }))
  });
});

/** GET /api/agents/:id/quality — Get quality metrics */
app.get('/api/agents/:id/quality', (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  // Stub quality metrics — replace with real evaluation integration
  res.json({
    agentId: a.id,
    agentName: a.name,
    version: a.deployedVersion,
    qualityScore: 0.87 + Math.random() * 0.13,
    accuracyScore: 0.82 + Math.random() * 0.15,
    latencyScore: 0.78 + Math.random() * 0.20,
    costScore: 0.73 + Math.random() * 0.25,
    lastEvaluatedAt: new Date().toISOString()
  });
});

// ===============================
// DEPRECATION & RETIREMENT
// ===============================

/** POST /api/agents/:id/deprecate — Mark agent as deprecated */
app.post('/api/agents/:id/deprecate', authOrBypass, (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  const { replacementAgentId, noticeDays, migrationDeadline } = req.body || {};
  const now = new Date().toISOString();

  a.status = 'deprecated';
  a.deprecatedAt = now;
  a.deprecatedBy = principalOf(req);
  a.deprecation = {
    replacementAgentId: replacementAgentId || null,
    noticeDays: noticeDays || 90,
    migrationDeadline: migrationDeadline || null,
    notifiedUsers: 0
  };
  a.updatedAt = now;
  stats.deprecations++;

  audit({ _req: req, op: 'agent.deprecate', agentId: a.id, replacementAgentId });

  res.json({ message: 'Agent deprecated', agent: a });
});

/** POST /api/agents/:id/retire — Retire agent */
app.post('/api/agents/:id/retire', authOrBypass, (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  if (a.status !== 'deprecated' && a.status !== 'active') {
    return res.status(400).json({ error: 'Can only retire active or deprecated agents' });
  }

  const { gracePeriodDays } = req.body || {};
  const now = new Date().toISOString();

  a.status = 'retired';
  a.retiredAt = now;
  a.retiredBy = principalOf(req);
  a.gracePeriodDays = gracePeriodDays || 30;
  a.updatedAt = now;
  stats.retirements++;

  // Stop all active deployments
  const deps = deployments.get(a.id) || new Map();
  for (const d of deps.values()) {
    if (d.status === 'active') d.status = 'stopped';
  }

  audit({ _req: req, op: 'agent.retire', agentId: a.id, gracePeriodDays: gracePeriodDays || 30 });

  res.json({ message: 'Agent retired', agent: a });
});

/** POST /api/agents/:id/restore — Restore retired agent */
app.post('/api/agents/:id/restore', authOrBypass, (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });

  if (a.status !== 'retired') {
    return res.status(400).json({ error: 'Can only restore retired agents' });
  }

  a.status = 'deprecated';
  delete a.retiredAt;
  delete a.retiredBy;
  delete a.gracePeriodDays;
  a.updatedAt = new Date().toISOString();

  audit({ _req: req, op: 'agent.restore', agentId: a.id });

  res.json({ message: 'Agent restored', agent: a });
});

/** GET /api/agents/deprecated — List deprecated agents */
app.get('/api/agents/deprecated', (req, res) => {
  const list = Array.from(agents.values())
    .filter(a => a.status === 'deprecated')
    .map(a => ({ id: a.id, name: a.name, deprecatedAt: a.deprecatedAt, deprecation: a.deprecation }));
  res.json({ count: list.length, agents: list });
});

/** GET /api/agents/retired — List retired agents */
app.get('/api/agents/retired', (req, res) => {
  const list = Array.from(agents.values())
    .filter(a => a.status === 'retired')
    .map(a => ({ id: a.id, name: a.name, retiredAt: a.retiredAt, gracePeriodDays: a.gracePeriodDays }));
  res.json({ count: list.length, agents: list });
});

// ===============================
// POLICIES
// ===============================

/** GET /api/policies — List policies */
app.get('/api/policies', (req, res) => {
  const { type } = req.query;
  let list = Array.from(policies.values());
  if (type) list = list.filter(p => p.type === type);
  res.json({ count: list.length, policies: list });
});

/** POST /api/policies — Create policy */
app.post('/api/policies', authOrBypass, (req, res) => {
  const { name, type, config } = req.body || {};
  if (!name || !type || !config) {
    return res.status(400).json({ error: 'name, type, and config are required' });
  }

  const id = uuidv4();
  const policy = { id, name, type, config, createdAt: new Date().toISOString() };
  policies.set(id, policy);
  res.status(201).json({ message: 'Policy created', policy });
});

/** PUT /api/policies/:id — Update policy */
app.put('/api/policies/:id', authOrBypass, (req, res) => {
  const p = policies.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Policy not found' });
  const { name, config } = req.body || {};
  if (name) p.name = name;
  if (config) p.config = { ...p.config, ...config };
  res.json({ message: 'Policy updated', policy: p });
});

/** DELETE /api/policies/:id — Delete policy */
app.delete('/api/policies/:id', authOrBypass, (req, res) => {
  const p = policies.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Policy not found' });
  policies.delete(req.params.id);
  res.json({ message: 'Policy deleted', id: req.params.id });
});

// ===============================
// STATS & AUDIT
// ===============================

/** GET /api/stats */
app.get('/api/stats', (_req, res) => {
  res.json({
    ...stats,
    totalAgents: agents.size,
    totalVersions: Array.from(versions.values()).reduce((s, m) => s + m.size, 0),
    totalDeployments: Array.from(deployments.values()).reduce((s, m) => s + m.size, 0),
    auditEntries: auditLog.length,
    uptime: process.uptime(),
    startedAt
  });
});

/** POST /api/stats/reset */
app.post('/api/stats/reset', authOrBypass, (req, res) => {
  for (const k of Object.keys(stats)) stats[k] = 0;
  res.json({ message: 'Stats reset', stats });
});

/** GET /api/audit */
app.get('/api/audit', (req, res) => {
  const { op, agentId, limit } = req.query;
  let list = auditLog.slice();
  if (op) list = list.filter(e => e.op === op);
  if (agentId) list = list.filter(e => e.agentId === agentId);
  const lim = Math.min(parseInt(limit) || 200, 1000);
  res.json({ count: list.length, entries: list.slice(-lim) });
});

// ===============================
// ERROR HANDLERS
// ===============================

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }));
app.use((err, _req, res, _next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  stats.errors++;
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = app;
module.exports.app = app;
module.exports.PORT = PORT;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.VERSION = VERSION;
module.exports.REQUIRE_AUTH = REQUIRE_AUTH;
module.exports.agents = agents;
module.exports.versions = versions;
module.exports.deployments = deployments;
module.exports.metrics = metrics;
module.exports.policies = policies;
module.exports.stats = stats;
module.exports.auditLog = auditLog;
module.exports.authOrBypass = authOrBypass;
module.exports.requireInternal = requireInternal;

if (require.main === module && !NO_LISTEN) {
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on port ${PORT}`);
    console.log(`[${SERVICE_NAME}] health: http://localhost:${PORT}/api/health`);
  });
  process.on('SIGTERM', () => { console.log(`[${SERVICE_NAME}] SIGTERM`); server.close(() => process.exit(0)); });
  process.on('SIGINT', () => { console.log(`[${SERVICE_NAME}] SIGINT`); server.close(() => process.exit(0)); });
}
