/**
 * capability-store (port 4804) — Phase 32.2
 *
 * Capability graph for HOJAI AI Agent OS. Defines abstract skills (capabilities)
 * that are independent of any specific agent. Capabilities form a DAG via
 * prerequisite edges. Pure-function logic for topo-sort, cycle detection,
 * search, and "resolve chain" (given a goal description, find a capability
 * chain via prereq graph + name match).
 *
 * Real LLM integration is OUT OF SCOPE (Phase 30 territory). Capability
 * matching against a goal is done via case-insensitive substring match on
 * the capability name and description.
 *
 * Storage: file-backed JSON in data/capabilities.json + data/prerequisites.json
 *           (prerequisites.json holds an edge list: {capabilityId, prerequisiteId}[])
 *
 * Cross-service read: GET /api/capabilities/:id/agents reads
 *   agent-registry/data/agents.json (if it exists) to find agents that
 *   reference the capability via `agent.capabilityIds[]` (or legacy
 *   `agent.capabilities[]`).
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4804;
const SERVICE_NAME = 'capability-store';
const VERSION = '1.0.0';
const DATA_DIR = process.env.CAPABILITY_STORE_DATA_DIR || path.join(__dirname, '../data');
const CAPABILITIES_FILE = path.join(DATA_DIR, 'capabilities.json');
const PREREQUISITES_FILE = path.join(DATA_DIR, 'prerequisites.json');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function nowIso() { return new Date().toISOString(); }
function rid() { return crypto.randomBytes(8).toString('hex'); }
function capId() { return `cap_${rid()}${rid()}`; }

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = ['TECHNICAL', 'BUSINESS', 'OPERATIONS', 'CREATIVE', 'ANALYTICS', 'SUPPORT', 'HR', 'LEADERSHIP', 'DOMAIN'];

function validateCapability(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('name required (non-empty string)');
  }
  if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
    errors.push(`category must be one of ${VALID_CATEGORIES.join(',')}`);
  }
  if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
    errors.push('description required (non-empty string)');
  }
  if (body.inputSchema !== undefined && (typeof body.inputSchema !== 'object' || body.inputSchema === null || Array.isArray(body.inputSchema))) {
    errors.push('inputSchema must be an object with a `type` field');
  } else if (body.inputSchema !== undefined && !body.inputSchema.type) {
    errors.push('inputSchema must have a `type` field (string)');
  }
  if (body.outputSchema !== undefined && (typeof body.outputSchema !== 'object' || body.outputSchema === null || Array.isArray(body.outputSchema))) {
    errors.push('outputSchema must be an object with a `type` field');
  } else if (body.outputSchema !== undefined && !body.outputSchema.type) {
    errors.push('outputSchema must have a `type` field (string)');
  }
  if (body.examples !== undefined && !Array.isArray(body.examples)) {
    errors.push('examples must be an array when provided');
  }
  if (body.prerequisites !== undefined && !Array.isArray(body.prerequisites)) {
    errors.push('prerequisites must be an array of capability ids when provided');
  }
  return errors;
}

function normalizeCapability(body, existing) {
  const now = nowIso();
  return {
    id: body.id || existing?.id || capId(),
    name: body.name || existing?.name,
    category: body.category || existing?.category,
    description: body.description || existing?.description,
    inputSchema: body.inputSchema !== undefined ? body.inputSchema : (existing?.inputSchema || { type: 'object' }),
    outputSchema: body.outputSchema !== undefined ? body.outputSchema : (existing?.outputSchema || { type: 'object' }),
    examples: body.examples !== undefined ? body.examples : (existing?.examples || []),
    prerequisites: body.prerequisites !== undefined ? body.prerequisites : (existing?.prerequisites || []),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function isValidSchema(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (typeof obj.type !== 'string' || obj.type.length === 0) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Pure functions - capability graph logic
// ---------------------------------------------------------------------------

function hasPrerequisites(capability) {
  if (!capability || typeof capability !== 'object') return false;
  return Array.isArray(capability.prerequisites) && capability.prerequisites.length > 0;
}

function findCapability(capabilities, id) {
  if (!Array.isArray(capabilities) || !id) return null;
  return capabilities.find((c) => c.id === id) || null;
}

function byCategory(capabilities, category) {
  if (!Array.isArray(capabilities)) return [];
  if (!category) return capabilities;
  return capabilities.filter((c) => c.category === category);
}

function searchByName(capabilities, query) {
  if (!Array.isArray(capabilities)) return [];
  if (!query) return capabilities;
  const q = String(query).toLowerCase();
  return capabilities.filter((c) => {
    if (!c) return false;
    const name = (c.name || '').toLowerCase();
    const desc = (c.description || '').toLowerCase();
    return name.includes(q) || desc.includes(q);
  });
}

function listAll(capabilities) {
  return Array.isArray(capabilities) ? capabilities : [];
}

function preventSelfRef(capabilityId, prerequisiteId) {
  if (!capabilityId || !prerequisiteId) return false;
  return capabilityId === prerequisiteId;
}

// Determine whether adding the edge (capabilityId depends on prerequisiteId)
// would create a cycle in the prereq DAG.
//
// Edges are stored as {capabilityId, prerequisiteId} meaning
//   "capabilityId depends on prerequisiteId".
//
// The new edge gives `capabilityId` a direct path to `prerequisiteId`.
// A cycle forms iff `prerequisiteId` can ALREADY reach `capabilityId` via
// existing "depends on" edges — i.e. `prerequisiteId` (transitively) depends
// on `capabilityId` in the current graph. After the addition we'd have
// `capabilityId -> prerequisiteId -> ... -> capabilityId` = a cycle.
function wouldCreateCycle(capabilities, prerequisites, capabilityId, prerequisiteId) {
  if (!Array.isArray(capabilities) || !Array.isArray(prerequisites)) return false;
  if (preventSelfRef(capabilityId, prerequisiteId)) return true;

  // Build adjacency: node -> list of capabilities that the node depends on
  // (its direct prereqs).
  const prereqsOf = new Map(); // capabilityId -> Set<prereqIds it depends on>
  for (const c of capabilities) {
    if (c.id && !prereqsOf.has(c.id)) prereqsOf.set(c.id, new Set());
  }
  for (const e of prerequisites) {
    if (!e || !e.capabilityId || !e.prerequisiteId) continue;
    if (!prereqsOf.has(e.capabilityId)) prereqsOf.set(e.capabilityId, new Set());
    prereqsOf.get(e.capabilityId).add(e.prerequisiteId);
  }

  // BFS forward from `prerequisiteId` following "depends on" edges
  // (i.e. along its prereq chain). If we reach `capabilityId`, then
  // `prerequisiteId` already (transitively) depends on `capabilityId`, and
  // adding `capabilityId depends on prerequisiteId` closes a cycle.
  const visited = new Set();
  const queue = [prerequisiteId];
  while (queue.length) {
    const cur = queue.shift();
    if (visited.has(cur)) continue;
    visited.add(cur);
    if (cur === capabilityId) return true;
    const neighbors = prereqsOf.get(cur);
    if (neighbors) {
      for (const n of neighbors) {
        if (!visited.has(n)) queue.push(n);
      }
    }
  }
  return false;
}

// Standard Kahn's algorithm. Edges are (capabilityId depends on prerequisiteId).
// Returns the capabilities in topological order (prereqs first).
function topoSort(capabilities, prerequisites) {
  if (!Array.isArray(capabilities)) return { order: [], error: 'cycle_detected' };
  const caps = capabilities.slice();

  // Build in-degree map (count of prereqs for each cap)
  const inDegree = new Map();
  const adj = new Map(); // prereqId -> Set<capabilityId that depend on prereq>
  for (const c of caps) {
    inDegree.set(c.id, 0);
    adj.set(c.id, new Set());
  }
  for (const e of (prerequisites || [])) {
    if (!e || !e.capabilityId || !e.prerequisiteId) continue;
    if (!inDegree.has(e.capabilityId) || !inDegree.has(e.prerequisiteId)) continue;
    adj.get(e.prerequisiteId).add(e.capabilityId);
    inDegree.set(e.capabilityId, inDegree.get(e.capabilityId) + 1);
  }

  // Start with caps that have no prereqs
  const queue = [];
  for (const c of caps) {
    if (inDegree.get(c.id) === 0) queue.push(c.id);
  }

  const order = [];
  while (queue.length) {
    const cur = queue.shift();
    order.push(cur);
    const dependents = adj.get(cur) || new Set();
    for (const dep of dependents) {
      inDegree.set(dep, inDegree.get(dep) - 1);
      if (inDegree.get(dep) === 0) queue.push(dep);
    }
  }

  if (order.length !== caps.length) {
    return { order: [], error: 'cycle_detected' };
  }
  return { order, error: null };
}

// Given a goal string, find the "best" matching capability then return a
// chain consisting of that cap + all of its transitive prereqs in topo order.
// Returns null if no capability matches.
function resolveChain(capabilities, prerequisites, goal) {
  if (!Array.isArray(capabilities) || !Array.isArray(prerequisites) || !goal || typeof goal !== 'string') {
    return null;
  }
  const goalLower = goal.toLowerCase();

  // Score each capability: exact name match > name contained in goal >
  // goal contained in name > name word overlap > description match
  let best = null;
  let bestScore = 0;
  for (const c of capabilities) {
    if (!c) continue;
    const name = (c.name || '').toLowerCase();
    const desc = (c.description || '').toLowerCase();
    let score = 0;
    if (name === goalLower) score = 100;
    else if (name && goalLower.includes(name)) score = 60 + (name.length / Math.max(goalLower.length, 1)) * 20;
    else if (name.includes(goalLower)) score = 50 + (goalLower.length / Math.max(name.length, 1)) * 10;
    else if (desc.includes(goalLower)) score = 20 + (goalLower.length / Math.max(desc.length, 1)) * 10;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  if (!best) return null;

  // BFS down prereqs to collect the closure (the cap + all transitively required caps)
  const visited = new Set();
  const queue = [best.id];
  while (queue.length) {
    const cur = queue.shift();
    if (visited.has(cur)) continue;
    visited.add(cur);
    const prereqs = (prerequisites || []).filter((e) => e.capabilityId === cur);
    for (const e of prereqs) {
      if (!visited.has(e.prerequisiteId)) queue.push(e.prerequisiteId);
    }
  }

  const subset = capabilities.filter((c) => visited.has(c.id));
  const subEdges = (prerequisites || []).filter((e) => visited.has(e.capabilityId) && visited.has(e.prerequisiteId));
  const sorted = topoSort(subset, subEdges);

  if (sorted.error) {
    return { goal, match: best, order: [], error: sorted.error };
  }
  const orderedCaps = sorted.order.map((id) => capabilities.find((c) => c.id === id)).filter(Boolean);
  return { goal, match: best, order: sorted.order, capabilities: orderedCaps, error: null };
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadCapabilities() {
  ensureDir();
  if (!fs.existsSync(CAPABILITIES_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(CAPABILITIES_FILE, 'utf8')); } catch { return []; }
}

function saveCapabilities(capabilities) {
  ensureDir();
  fs.writeFileSync(CAPABILITIES_FILE, JSON.stringify(capabilities, null, 2));
}

function loadPrerequisites() {
  ensureDir();
  if (!fs.existsSync(PREREQUISITES_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(PREREQUISITES_FILE, 'utf8')); } catch { return []; }
}

function savePrerequisites(prerequisites) {
  ensureDir();
  fs.writeFileSync(PREREQUISITES_FILE, JSON.stringify(prerequisites, null, 2));
}

function summarizeCapability(c) {
  if (!c || typeof c !== 'object') return null;
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
    inputSchema: c.inputSchema,
    outputSchema: c.outputSchema,
    examples: c.examples,
    prerequisites: c.prerequisites,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// Cross-service read: try to read agent-registry's agents.json (sibling dir).
// Falls back to [] if the file or sibling dir doesn't exist.
function loadAgentsFromRegistry() {
  const candidates = [
    path.join(__dirname, '../../agent-registry/data/agents.json'),
    path.join(__dirname, '../agent-registry/data/agents.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        return Array.isArray(data) ? data : (data.agents || []);
      }
    } catch (_) { /* fall through */ }
  }
  return [];
}

function findAgentsForCapability(capabilityId) {
  if (!capabilityId) return [];
  const agents = loadAgentsFromRegistry();
  return agents
    .filter((a) => {
      if (!a || typeof a !== 'object') return false;
      const capIds = a.capabilityIds || a.capabilities || [];
      return Array.isArray(capIds) && capIds.includes(capabilityId);
    })
    .map((a) => ({ id: a.id, name: a.name || null }));
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
app.post('/api/capabilities', (req, res) => {
  const errs = validateCapability(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const capabilities = loadCapabilities();
  const prereqs = loadPrerequisites();
  const cap = normalizeCapability(req.body, null);

  // Validate any inline prerequisites (when prereqs are declared in the body)
  if (Array.isArray(cap.prerequisites) && cap.prerequisites.length > 0) {
    for (const prereqId of cap.prerequisites) {
      if (preventSelfRef(cap.id, prereqId)) {
        return res.status(400).json({ error: 'self_reference', capabilityId: cap.id, prerequisiteId: prereqId });
      }
      // Prereq must either already exist OR be queued in this same request.
      // For simplicity we only validate against existing capabilities.
      if (!findCapability(capabilities, prereqId)) {
        return res.status(400).json({ error: 'prerequisite_not_found', prerequisiteId: prereqId });
      }
      if (wouldCreateCycle(capabilities, prereqs, cap.id, prereqId)) {
        return res.status(400).json({ error: 'cycle_detected', capabilityId: cap.id, prerequisiteId: prereqId });
      }
    }
    // Persist the prereq edges
    for (const prereqId of cap.prerequisites) {
      prereqs.push({ capabilityId: cap.id, prerequisiteId: prereqId });
    }
    savePrerequisites(prereqs);
  }

  capabilities.push(cap);
  saveCapabilities(capabilities);
  res.status(201).json(summarizeCapability(cap));
});

// List (with category filter)
app.get('/api/capabilities', (req, res) => {
  let capabilities = loadCapabilities();
  capabilities = byCategory(capabilities, req.query.category);
  res.json({ count: capabilities.length, capabilities: capabilities.map(summarizeCapability) });
});

// IMPORTANT: specific routes must come BEFORE /:id
app.get('/api/capabilities/search', (req, res) => {
  let capabilities = loadCapabilities();
  capabilities = byCategory(capabilities, req.query.category);
  capabilities = searchByName(capabilities, req.query.name);
  res.json({ count: capabilities.length, capabilities: capabilities.map(summarizeCapability) });
});

app.post('/api/capabilities/resolve', (req, res) => {
  if (!req.body || !req.body.goal || typeof req.body.goal !== 'string') {
    return res.status(400).json({ error: 'validation', details: ['goal required (non-empty string)'] });
  }
  const capabilities = loadCapabilities();
  const prereqs = loadPrerequisites();
  const chain = resolveChain(capabilities, prereqs, req.body.goal);
  if (!chain) {
    return res.status(404).json({ error: 'no_match', goal: req.body.goal });
  }
  if (chain.error === 'cycle_detected') {
    return res.status(409).json({ error: 'cycle_detected', goal: req.body.goal, match: { id: chain.match.id, name: chain.match.name } });
  }
  res.json({
    goal: chain.goal,
    match: { id: chain.match.id, name: chain.match.name, category: chain.match.category },
    count: chain.order.length,
    order: chain.order,
    capabilities: chain.capabilities.map(summarizeCapability),
  });
});

app.get('/api/capabilities/:id/agents', (req, res) => {
  const capabilities = loadCapabilities();
  if (!findCapability(capabilities, req.params.id)) {
    return res.status(404).json({ error: 'not_found', id: req.params.id });
  }
  const agents = findAgentsForCapability(req.params.id);
  res.json({ capabilityId: req.params.id, count: agents.length, agents });
});

app.post('/api/capabilities/:id/prerequisites', (req, res) => {
  const capabilities = loadCapabilities();
  const prereqs = loadPrerequisites();
  const cap = findCapability(capabilities, req.params.id);
  if (!cap) return res.status(404).json({ error: 'not_found', id: req.params.id });

  if (!req.body || !req.body.prerequisiteId || typeof req.body.prerequisiteId !== 'string') {
    return res.status(400).json({ error: 'validation', details: ['prerequisiteId required (string)'] });
  }
  const prereqId = req.body.prerequisiteId;

  if (preventSelfRef(req.params.id, prereqId)) {
    return res.status(400).json({ error: 'self_reference', capabilityId: req.params.id, prerequisiteId: prereqId });
  }
  const prereqCap = findCapability(capabilities, prereqId);
  if (!prereqCap) {
    return res.status(400).json({ error: 'prerequisite_not_found', prerequisiteId: prereqId });
  }
  // Idempotent: if edge already exists, return current state
  if (prereqs.some((e) => e.capabilityId === req.params.id && e.prerequisiteId === prereqId)) {
    return res.status(200).json(summarizeCapability(cap));
  }
  if (wouldCreateCycle(capabilities, prereqs, req.params.id, prereqId)) {
    return res.status(400).json({ error: 'cycle_detected', capabilityId: req.params.id, prerequisiteId: prereqId });
  }
  prereqs.push({ capabilityId: req.params.id, prerequisiteId: prereqId });
  savePrerequisites(prereqs);

  // Also update the denormalized field on the capability itself
  const idx = capabilities.findIndex((c) => c.id === req.params.id);
  if (idx !== -1) {
    if (!Array.isArray(capabilities[idx].prerequisites)) capabilities[idx].prerequisites = [];
    if (!capabilities[idx].prerequisites.includes(prereqId)) {
      capabilities[idx].prerequisites.push(prereqId);
      capabilities[idx].updatedAt = nowIso();
    }
    saveCapabilities(capabilities);
  }
  res.status(201).json(summarizeCapability(capabilities.find((c) => c.id === req.params.id) || cap));
});

app.delete('/api/capabilities/:id/prerequisites/:prereqId', (req, res) => {
  const capabilities = loadCapabilities();
  const prereqs = loadPrerequisites();
  const cap = findCapability(capabilities, req.params.id);
  if (!cap) return res.status(404).json({ error: 'not_found', id: req.params.id });

  const before = prereqs.length;
  const filtered = prereqs.filter((e) => !(e.capabilityId === req.params.id && e.prerequisiteId === req.params.prereqId));
  if (filtered.length === before) {
    return res.status(404).json({ error: 'edge_not_found', capabilityId: req.params.id, prerequisiteId: req.params.prereqId });
  }
  savePrerequisites(filtered);

  // Update the denormalized field too
  const idx = capabilities.findIndex((c) => c.id === req.params.id);
  if (idx !== -1) {
    if (Array.isArray(capabilities[idx].prerequisites)) {
      capabilities[idx].prerequisites = capabilities[idx].prerequisites.filter((p) => p !== req.params.prereqId);
      capabilities[idx].updatedAt = nowIso();
    }
    saveCapabilities(capabilities);
  }
  res.json({ deleted: true, capabilityId: req.params.id, prerequisiteId: req.params.prereqId });
});

// Get one
app.get('/api/capabilities/:id', (req, res) => {
  const capabilities = loadCapabilities();
  const c = findCapability(capabilities, req.params.id);
  if (!c) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(summarizeCapability(c));
});

// Update
app.patch('/api/capabilities/:id', (req, res) => {
  const capabilities = loadCapabilities();
  const idx = capabilities.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });

  // Validate the merged shape (existing + patch) to keep required fields satisfied
  const merged = { ...capabilities[idx], ...req.body, id: req.params.id };
  const errs = validateCapability(merged);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const updated = normalizeCapability(merged, capabilities[idx]);
  // Don't allow changing prerequisites via PATCH — use the dedicated routes
  updated.prerequisites = capabilities[idx].prerequisites || [];
  capabilities[idx] = updated;
  saveCapabilities(capabilities);
  res.json(summarizeCapability(updated));
});

// Delete (cascade-delete prereq edges)
app.delete('/api/capabilities/:id', (req, res) => {
  const capabilities = loadCapabilities();
  const idx = capabilities.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const removed = capabilities.splice(idx, 1)[0];
  saveCapabilities(capabilities);

  // Cascade-delete any prereq edges involving this cap (in either direction)
  const prereqs = loadPrerequisites();
  const filtered = prereqs.filter((e) => e.capabilityId !== req.params.id && e.prerequisiteId !== req.params.id);
  if (filtered.length !== prereqs.length) savePrerequisites(filtered);

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
  CAPABILITIES_FILE, PREREQUISITES_FILE,
  VALID_CATEGORIES,
  validateCapability, normalizeCapability, isValidSchema,
  hasPrerequisites, findCapability, byCategory, searchByName, listAll,
  preventSelfRef, wouldCreateCycle, topoSort, resolveChain,
  loadCapabilities, saveCapabilities, loadPrerequisites, savePrerequisites,
  summarizeCapability, loadAgentsFromRegistry, findAgentsForCapability,
};
