/**
 * agent-registry (port 4803) - Phase 32.1
 *
 * Foundation service for HOJAI AI Agent OS. Agent identity, versioning, and
 * capability-based search. Each agent has a stable id, mutable current state,
 * and an append-only history of version snapshots.
 *
 * - CRUD for agents
 * - Versioning: each PATCH creates an immutable snapshot and bumps the version
 * - Search by capability, type, status
 * - Heartbeat marks the agent alive; auto-expire based on TTL
 *
 * Storage: file-backed JSON in data/agents.json + data/agent-versions.json
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4803;
const SERVICE_NAME = 'agent-registry';
const VERSION = '1.0.0';
const DATA_DIR = process.env.AGENT_REGISTRY_DATA_DIR || path.join(__dirname, '../data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'agent-versions.json');
const DEFAULT_HEARTBEAT_TTL_MS = 5 * 60 * 1000;

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function nowIso() { return new Date().toISOString(); }
function rid() { return crypto.randomBytes(8).toString('hex'); }
function agentId() { return `agt_${rid()}`; }
function versionId() { return `ver_${rid()}`; }

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_TYPES = ['genie', 'merchant', 'system', 'partner', 'custom'];
const VALID_STATUSES = ['draft', 'active', 'paused', 'retired'];

function isNonEmptyString(v) { return typeof v === 'string' && v.trim().length > 0; }
function isStringArray(v) { return Array.isArray(v) && v.every((x) => typeof x === 'string'); }

function validateAgent(body, { partial = false } = {}) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }

  if (!partial || body.name !== undefined) {
    if (!isNonEmptyString(body.name)) errors.push('name required (non-empty string)');
  }
  if (!partial || body.type !== undefined) {
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      errors.push(`type must be one of ${VALID_TYPES.join(',')}`);
    }
  }
  if (!partial || body.owner !== undefined) {
    if (!isNonEmptyString(body.owner)) errors.push('owner required (non-empty string)');
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of ${VALID_STATUSES.join(',')}`);
  }
  if (body.capabilities !== undefined && !isStringArray(body.capabilities)) {
    errors.push('capabilities must be string[] when provided');
  }
  if (body.tools !== undefined && !isStringArray(body.tools)) {
    errors.push('tools must be string[] when provided');
  }
  if (body.skills !== undefined && !isStringArray(body.skills)) {
    errors.push('skills must be string[] when provided');
  }
  if (body.metadata !== undefined && (body.metadata === null || typeof body.metadata !== 'object' || Array.isArray(body.metadata))) {
    errors.push('metadata must be plain object when provided');
  }
  return errors;
}

function normalizeAgent(body, existing) {
  const now = nowIso();
  return {
    id: body.id || existing?.id || agentId(),
    name: body.name || existing?.name,
    version: body.version || existing?.version || '1.0.0',
    type: body.type || existing?.type,
    status: body.status || existing?.status || 'draft',
    owner: body.owner || existing?.owner,
    capabilities: body.capabilities || existing?.capabilities || [],
    tools: body.tools || existing?.tools || [],
    skills: body.skills || existing?.skills || [],
    metadata: body.metadata !== undefined ? body.metadata : (existing?.metadata || {}),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastHeartbeat: body.lastHeartbeat !== undefined ? body.lastHeartbeat : (existing?.lastHeartbeat || null),
  };
}

function normalizeVersion(agent, snapshot) {
  const now = nowIso();
  if (!agent || typeof agent !== 'object') {
    return { id: versionId(), agentId: null, version: null, snapshot: snapshot || null, createdAt: now };
  }
  return {
    id: versionId(),
    agentId: agent.id,
    version: agent.version,
    snapshot,
    createdAt: now,
  };
}

// ---------------------------------------------------------------------------
// Pure functions - versioning, expiry, search
// ---------------------------------------------------------------------------

function nextVersion(current) {
  if (!current || typeof current !== 'string') return '1.0.0';
  const parts = current.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return '1.0.0';
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

function isExpired(agent, ttlMs = DEFAULT_HEARTBEAT_TTL_MS) {
  if (!agent || typeof agent !== 'object') return true;
  if (!agent.lastHeartbeat) return false; // never heartbeated -> not expired, just dormant
  const last = Date.parse(agent.lastHeartbeat);
  if (Number.isNaN(last)) return true;
  return (Date.now() - last) > ttlMs;
}

function searchByCapability(agents, capability) {
  if (!capability || typeof capability !== 'string') return agents;
  return agents.filter((a) => Array.isArray(a.capabilities) && a.capabilities.includes(capability));
}

function searchByType(agents, type) {
  if (!type || typeof type !== 'string') return agents;
  return agents.filter((a) => a.type === type);
}

function searchByStatus(agents, status) {
  if (!status || typeof status !== 'string') return agents;
  return agents.filter((a) => a.status === status);
}

function toSummary(agent) {
  if (!agent || typeof agent !== 'object') return null;
  return {
    id: agent.id,
    name: agent.name,
    version: agent.version,
    type: agent.type,
    status: agent.status,
    owner: agent.owner,
    capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : [],
    tools: Array.isArray(agent.tools) ? agent.tools : [],
    skills: Array.isArray(agent.skills) ? agent.skills : [],
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    lastHeartbeat: agent.lastHeartbeat || null,
    expired: isExpired(agent),
  };
}

function buildVersionSummary(version) {
  if (!version || typeof version !== 'object') return null;
  return {
    id: version.id,
    agentId: version.agentId,
    version: version.version,
    createdAt: version.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadAgents() {
  ensureDir();
  if (!fs.existsSync(AGENTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8')); } catch { return []; }
}

function saveAgents(agents) {
  ensureDir();
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

function loadVersions() {
  ensureDir();
  if (!fs.existsSync(VERSIONS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(VERSIONS_FILE, 'utf8')); } catch { return []; }
}

function saveVersions(versions) {
  ensureDir();
  fs.writeFileSync(VERSIONS_FILE, JSON.stringify(versions, null, 2));
}

function appendVersion(version) {
  const versions = loadVersions();
  versions.push(version);
  saveVersions(versions);
  return version;
}

function findAgent(agents, id) { return agents.find((a) => a.id === id) || null; }
function findIndex(agents, id) { return agents.findIndex((a) => a.id === id); }
function listAll(agents) { return agents; }

function snapshotAgent(agent) {
  if (!agent || typeof agent !== 'object') {
    return {
      id: undefined,
      name: undefined,
      version: undefined,
      type: undefined,
      status: undefined,
      owner: undefined,
      capabilities: [],
      tools: [],
      skills: [],
      metadata: {},
      createdAt: undefined,
      updatedAt: undefined,
      lastHeartbeat: null,
    };
  }
  return {
    id: agent.id,
    name: agent.name,
    version: agent.version,
    type: agent.type,
    status: agent.status,
    owner: agent.owner,
    capabilities: Array.isArray(agent.capabilities) ? [...agent.capabilities] : [],
    tools: Array.isArray(agent.tools) ? [...agent.tools] : [],
    skills: Array.isArray(agent.skills) ? [...agent.skills] : [],
    metadata: agent.metadata && typeof agent.metadata === 'object' && !Array.isArray(agent.metadata) ? { ...agent.metadata } : {},
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    lastHeartbeat: agent.lastHeartbeat || null,
  };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// Health
app.get('/health', (_req, res) => res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// Create
app.post('/api/agents', (req, res) => {
  const errs = validateAgent(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const agents = loadAgents();
  const agent = normalizeAgent({ ...req.body, version: req.body.version || '1.0.0' }, null);
  agents.push(agent);
  saveAgents(agents);

  // Record the initial version snapshot
  appendVersion(normalizeVersion(agent, snapshotAgent(agent)));

  res.status(201).json(toSummary(agent));
});

// List (with filters)
app.get('/api/agents', (req, res) => {
  let agents = loadAgents();
  agents = searchByType(agents, req.query.type);
  agents = searchByStatus(agents, req.query.status);
  agents = searchByCapability(agents, req.query.capability);
  res.json({ count: agents.length, agents: agents.map(toSummary) });
});

// IMPORTANT: specific routes must come BEFORE /:id
app.get('/api/agents/search', (req, res) => {
  let agents = loadAgents();
  agents = searchByType(agents, req.query.type);
  agents = searchByStatus(agents, req.query.status);
  agents = searchByCapability(agents, req.query.capability);
  res.json({ count: agents.length, agents: agents.map(toSummary) });
});

// Heartbeat
app.post('/api/agents/:id/heartbeat', (req, res) => {
  const agents = loadAgents();
  const idx = findIndex(agents, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  agents[idx].lastHeartbeat = nowIso();
  agents[idx].updatedAt = agents[idx].lastHeartbeat;
  saveAgents(agents);
  res.json(toSummary(agents[idx]));
});

// Versions
app.get('/api/agents/:id/versions', (req, res) => {
  const agents = loadAgents();
  if (!findAgent(agents, req.params.id)) {
    return res.status(404).json({ error: 'not_found', id: req.params.id });
  }
  const versions = loadVersions().filter((v) => v.agentId === req.params.id);
  res.json({ agentId: req.params.id, count: versions.length, versions: versions.map(buildVersionSummary) });
});

// Explicit snapshot
app.post('/api/agents/:id/versions', (req, res) => {
  const agents = loadAgents();
  const idx = findIndex(agents, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });

  // Snapshot the current state
  const v = normalizeVersion(agents[idx], snapshotAgent(agents[idx]));
  appendVersion(v);
  res.status(201).json(buildVersionSummary(v));
});

// Get one
app.get('/api/agents/:id', (req, res) => {
  const agents = loadAgents();
  const a = findAgent(agents, req.params.id);
  if (!a) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(toSummary(a));
});

// Update - bumps version and creates snapshot
app.patch('/api/agents/:id', (req, res) => {
  const errs = validateAgent(req.body, { partial: true });
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const agents = loadAgents();
  const idx = findIndex(agents, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });

  // Snapshot BEFORE the change
  appendVersion(normalizeVersion(agents[idx], snapshotAgent(agents[idx])));

  // Bump version
  const newVersion = nextVersion(agents[idx].version);
  agents[idx] = normalizeAgent({ ...agents[idx], ...req.body, version: newVersion, id: agents[idx].id, createdAt: agents[idx].createdAt }, agents[idx]);
  saveAgents(agents);

  res.json(toSummary(agents[idx]));
});

// Delete
app.delete('/api/agents/:id', (req, res) => {
  const agents = loadAgents();
  const idx = findIndex(agents, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const removed = agents.splice(idx, 1)[0];
  saveAgents(agents);
  res.json({ deleted: true, id: removed.id });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

if (require.main === module) {
  app.listen(PORT, () => {
    ensureDir();
    console.log(`${SERVICE_NAME} listening on :${PORT}`);
  });
}

module.exports = {
  app,
  PORT, SERVICE_NAME, VERSION,
  AGENTS_FILE, VERSIONS_FILE, DEFAULT_HEARTBEAT_TTL_MS,
  VALID_TYPES, VALID_STATUSES,
  validateAgent, normalizeAgent, normalizeVersion,
  nextVersion, isExpired, searchByCapability, searchByType, searchByStatus,
  toSummary, snapshotAgent, buildVersionSummary,
  loadAgents, saveAgents, loadVersions, saveVersions, appendVersion,
  findAgent, findIndex, listAll,
};
