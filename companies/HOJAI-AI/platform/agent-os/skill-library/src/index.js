/**
 * skill-library (port 4806) — Phase 32.4
 *
 * Reusable skill compositions for HOJAI AI Agent OS. A skill is a
 * composition of tools and optionally sub-skills (DAG) that an agent
 * can invoke as a single unit. Provides CRUD + versioning + execution
 * plan + input resolution.
 *
 * Storage: file-backed JSON in data/skills.json + data/skill-versions.json
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4806;
const SERVICE_NAME = 'skill-library';
const VERSION = '1.0.0';
const DATA_DIR = process.env.SKILL_LIBRARY_DATA_DIR || path.join(__dirname, '../data');
const SKILLS_FILE = path.join(DATA_DIR, 'skills.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'skill-versions.json');
const DEFAULT_CATEGORY = 'GENERAL';

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function nowIso() { return new Date().toISOString(); }
function rid() { return crypto.randomBytes(8).toString('hex'); }
function skillId() { return `skl_${rid()}`; }
function versionId() { return `ver_${rid()}`; }

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_TYPES = ['string', 'number', 'boolean', 'object', 'array'];
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

function validateIoDefinition(value, name) {
  const errors = [];
  if (value === undefined || value === null) return errors;
  if (typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${name} entries must be objects`);
    return errors;
  }
  if (value.type !== undefined && !VALID_TYPES.includes(value.type)) {
    errors.push(`${name}.type must be one of ${VALID_TYPES.join(',')}`);
  }
  if (value.required !== undefined && typeof value.required !== 'boolean') {
    errors.push(`${name}.required must be boolean when provided`);
  }
  return errors;
}

function validateIoMap(value, name) {
  const errors = [];
  if (value === undefined || value === null) return errors;
  if (typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${name} must be an object map of variable definitions`);
    return errors;
  }
  for (const [k, v] of Object.entries(value)) {
    if (typeof k !== 'string' || k.length === 0) {
      errors.push(`${name} keys must be non-empty strings`);
      continue;
    }
    const sub = validateIoDefinition(v, `${name}.${k}`);
    if (sub.length) errors.push(...sub);
  }
  return errors;
}

function validateSkill(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('name required (non-empty string)');
  }
  if (body.version !== undefined && (typeof body.version !== 'string' || !SEMVER_RE.test(body.version))) {
    errors.push('version must match semver X.Y.Z');
  }
  if (body.tools !== undefined) {
    if (!Array.isArray(body.tools)) {
      errors.push('tools must be an array of strings');
    } else {
      for (const t of body.tools) {
        if (typeof t !== 'string') errors.push('tools entries must be strings (tool IDs)');
      }
    }
  }
  if (body.skills !== undefined) {
    if (!Array.isArray(body.skills)) {
      errors.push('skills must be an array of strings');
    } else {
      for (const s of body.skills) {
        if (typeof s !== 'string') errors.push('skills entries must be strings (skill IDs)');
      }
    }
  }
  if (body.category !== undefined && typeof body.category !== 'string') {
    errors.push('category must be string when provided');
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      errors.push('tags must be array of strings');
    } else {
      for (const t of body.tags) {
        if (typeof t !== 'string') errors.push('tags entries must be strings');
      }
    }
  }
  errors.push(...validateIoMap(body.inputs, 'inputs'));
  errors.push(...validateIoMap(body.outputs, 'outputs'));
  return errors;
}

function normalizeSkill(body, existing, parentIdForCycleCheck) {
  const now = nowIso();
  const base = {
    id: body.id || existing?.id || skillId(),
    name: body.name || existing?.name,
    description: body.description !== undefined ? body.description : (existing?.description ?? ''),
    version: body.version || existing?.version || '1.0.0',
    tools: body.tools || existing?.tools || [],
    skills: body.skills || existing?.skills || [],
    inputs: body.inputs || existing?.inputs || {},
    outputs: body.outputs || existing?.outputs || {},
    category: body.category || existing?.category || DEFAULT_CATEGORY,
    tags: body.tags || existing?.tags || [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  return base;
}

// ---------------------------------------------------------------------------
// Pure functions - graph operations
// ---------------------------------------------------------------------------

function hasCircularDependency(skills, skillId, parentSkillId) {
  if (!skills || !Array.isArray(skills)) return { cycle: false, path: [] };
  // DFS from skillId following its `skills` references. If we ever reach parentSkillId,
  // the chain loops back, which is a cycle. The start node itself doesn't count as a hit.
  const byId = new Map(skills.map((s) => [s.id, s]));
  if (!byId.has(skillId)) return { cycle: false, path: [] };
  const visited = new Set();
  const path = [];
  function visit(id) {
    if (id === parentSkillId) {
      path.push(id);
      return true;
    }
    if (visited.has(id)) return false;
    visited.add(id);
    const skill = byId.get(id);
    if (!skill) return false;
    path.push(id);
    const deps = Array.isArray(skill.skills) ? skill.skills : [];
    for (const dep of deps) {
      if (visit(dep)) return true;
    }
    path.pop();
    return false;
  }
  // Start by visiting the children of skillId, not skillId itself.
  const root = byId.get(skillId);
  const rootDeps = Array.isArray(root.skills) ? root.skills : [];
  for (const dep of rootDeps) {
    if (visit(dep)) return { cycle: true, path };
  }
  return { cycle: false, path: [] };
}

function topoSortDependencies(skills, rootId) {
  if (!skills || !Array.isArray(skills)) return { order: [], missing: [] };
  const byId = new Map(skills.map((s) => [s.id, s]));
  if (!byId.has(rootId)) return { order: [], missing: [] };
  const result = [];
  const visited = new Set();
  const onStack = new Set();
  const missing = [];

  function visit(id) {
    if (visited.has(id)) return;
    if (onStack.has(id)) return; // cycle guard, will report separately
    onStack.add(id);
    const node = byId.get(id);
    if (!node) { missing.push(id); return; }
    const deps = Array.isArray(node.skills) ? node.skills : [];
    for (const dep of deps) visit(dep);
    onStack.delete(id);
    visited.add(id);
    result.push(id);
  }
  visit(rootId);
  return { order: result, missing };
}

function collectToolIds(skill, skills) {
  if (!skill || typeof skill !== 'object') return [];
  const byId = new Map((skills || []).map((s) => [s.id, s]));
  const tools = new Set();
  const visited = new Set();
  const onStack = new Set();

  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (visited.has(node.id)) return;
    if (onStack.has(node.id)) return;
    onStack.add(node.id);
    if (Array.isArray(node.tools)) {
      for (const t of node.tools) tools.add(t);
    }
    if (Array.isArray(node.skills)) {
      for (const sid of node.skills) {
        const child = byId.get(sid);
        if (child) visit(child);
      }
    }
    onStack.delete(node.id);
    visited.add(node.id);
  }
  visit(skill);
  return Array.from(tools);
}

function mergeInputs(skill, providedInputs) {
  if (!skill || typeof skill !== 'object') return { bound: {}, missing: [], extra: [] };
  const declared = (skill.inputs && typeof skill.inputs === 'object') ? skill.inputs : {};
  const provided = (providedInputs && typeof providedInputs === 'object') ? providedInputs : {};
  const bound = {};
  const missing = [];
  for (const [k, def] of Object.entries(declared)) {
    if (Object.prototype.hasOwnProperty.call(provided, k)) {
      bound[k] = provided[k];
    } else if (def && def.required) {
      missing.push(k);
    }
  }
  const declaredKeys = new Set(Object.keys(declared));
  const extra = Object.keys(provided).filter((k) => !declaredKeys.has(k));
  return { bound, missing, extra };
}

// ---------------------------------------------------------------------------
// Pure functions - filters / list helpers
// ---------------------------------------------------------------------------

function findSkill(skills, id) {
  if (!Array.isArray(skills)) return null;
  return skills.find((s) => s.id === id) || null;
}

function byCategory(skills, category) {
  if (!Array.isArray(skills)) return [];
  if (!category) return skills;
  return skills.filter((s) => s.category === category);
}

function byTag(skills, tag) {
  if (!Array.isArray(skills)) return [];
  if (!tag) return skills;
  return skills.filter((s) => Array.isArray(s.tags) && s.tags.includes(tag));
}

function searchByName(skills, q) {
  if (!Array.isArray(skills)) return [];
  if (!q || typeof q !== 'string') return skills;
  const needle = q.toLowerCase();
  return skills.filter((s) => (s.name || '').toLowerCase().includes(needle));
}

function listAll(skills) { return Array.isArray(skills) ? skills : []; }

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

function validateVersionBump(currentVersion, newVersion) {
  if (!currentVersion || !SEMVER_RE.test(currentVersion)) return 'currentVersion must be semver X.Y.Z';
  if (!newVersion || !SEMVER_RE.test(newVersion)) return 'newVersion must be semver X.Y.Z';
  const [cMaj, cMin, cPatch] = currentVersion.split('.').map((n) => parseInt(n, 10));
  const [nMaj, nMin, nPatch] = newVersion.split('.').map((n) => parseInt(n, 10));
  if (nMaj < cMaj) return 'newVersion major must be >= current major';
  if (nMaj === cMaj && nMin < cMin) return 'newVersion minor must be >= current minor';
  if (nMaj === cMaj && nMin === cMin && nPatch <= cPatch) return 'newVersion patch must be > current patch';
  return null;
}

function nextVersion(currentVersion) {
  if (!currentVersion || !SEMVER_RE.test(currentVersion)) return '1.0.0';
  const [maj, min, patch] = currentVersion.split('.').map((n) => parseInt(n, 10));
  return `${maj}.${min}.${patch + 1}`;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadSkills() {
  ensureDir();
  if (!fs.existsSync(SKILLS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(SKILLS_FILE, 'utf8')); } catch { return []; }
}

function saveSkills(skills) {
  ensureDir();
  fs.writeFileSync(SKILLS_FILE, JSON.stringify(skills, null, 2));
}

function loadSkillVersions() {
  ensureDir();
  if (!fs.existsSync(VERSIONS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(VERSIONS_FILE, 'utf8')); } catch { return []; }
}

function saveSkillVersions(versions) {
  ensureDir();
  fs.writeFileSync(VERSIONS_FILE, JSON.stringify(versions, null, 2));
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

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

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// Health
app.get('/health', (_req, res) => res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// Create skill
app.post('/api/skills', requireInternal, (req, res) => {
  const errs = validateSkill(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const skills = loadSkills();

  // Circular dependency check: the new skill's `skills` references must not loop back into itself.
  // Since the new skill doesn't exist yet, we check whether any referenced skill can reach the new skill id
  // (which is impossible) - instead, check whether the existing dependency graph contains a cycle if we add this new edge.
  // For simplicity: validate that referenced skills (by ID) all exist.
  const referenced = Array.isArray(req.body.skills) ? req.body.skills : [];
  for (const sid of referenced) {
    if (!findSkill(skills, sid)) {
      return res.status(400).json({ error: 'validation', details: [`referenced skill not found: ${sid}`] });
    }
  }

  const skill = normalizeSkill({ ...req.body }, null);
  skills.push(skill);
  saveSkills(skills);

  // Snapshot version 1
  const versions = loadSkillVersions();
  versions.push({
    id: versionId(),
    skillId: skill.id,
    version: skill.version,
    snapshot: { ...skill },
    createdAt: nowIso(),
  });
  saveSkillVersions(versions);

  res.status(201).json(skill);
});

// List (with filters via query)
app.get('/api/skills', (req, res) => {
  let skills = loadSkills();
  skills = byCategory(skills, req.query.category);
  skills = byTag(skills, req.query.tag);
  res.json({ count: skills.length, skills });
});

// IMPORTANT: specific routes must come BEFORE /api/skills/:id
app.get('/api/skills/search', (req, res) => {
  let skills = loadSkills();
  skills = byCategory(skills, req.query.category);
  skills = byTag(skills, req.query.tag);
  skills = searchByName(skills, req.query.q);
  res.json({ count: skills.length, skills });
});

// Versions routes - must come before /:id
app.post('/api/skills/:id/versions', requireInternal, (req, res) => {
  const skills = loadSkills();
  const idx = skills.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });

  const requestedVersion = req.body && req.body.version;
  if (requestedVersion !== undefined && (typeof requestedVersion !== 'string' || !SEMVER_RE.test(requestedVersion))) {
    return res.status(400).json({ error: 'validation', details: ['version must match semver X.Y.Z'] });
  }

  const newVersion = requestedVersion || nextVersion(skills[idx].version);
  const bumpErr = validateVersionBump(skills[idx].version, newVersion);
  if (bumpErr) return res.status(400).json({ error: 'validation', details: [bumpErr] });

  // Snapshot the CURRENT skill into the versions list under newVersion
  const versions = loadSkillVersions();
  versions.push({
    id: versionId(),
    skillId: skills[idx].id,
    version: newVersion,
    snapshot: { ...skills[idx] },
    createdAt: nowIso(),
  });
  saveSkillVersions(versions);

  // Bump the skill's current version
  skills[idx].version = newVersion;
  skills[idx].updatedAt = nowIso();
  saveSkills(skills);

  res.status(201).json({
    skillId: skills[idx].id,
    version: newVersion,
    skill: skills[idx],
  });
});

app.get('/api/skills/:id/versions', (req, res) => {
  const skills = loadSkills();
  if (!findSkill(skills, req.params.id)) {
    return res.status(404).json({ error: 'not_found', id: req.params.id });
  }
  const versions = loadSkillVersions().filter((v) => v.skillId === req.params.id);
  // Return summary view (without full snapshot) to keep payload small
  const summaries = versions.map((v) => ({
    id: v.id,
    skillId: v.skillId,
    version: v.version,
    createdAt: v.createdAt,
  }));
  res.json({ skillId: req.params.id, count: summaries.length, versions: summaries });
});

app.get('/api/skills/:id/plan', (req, res) => {
  const skills = loadSkills();
  const skill = findSkill(skills, req.params.id);
  if (!skill) return res.status(404).json({ error: 'not_found', id: req.params.id });

  const topo = topoSortDependencies(skills, skill.id);
  const tools = collectToolIds(skill, skills);
  res.json({
    skillId: skill.id,
    name: skill.name,
    version: skill.version,
    tools,
    skills: topo.order,
    totalTools: tools.length,
    missing: topo.missing,
  });
});

app.post('/api/skills/:id/resolve', requireInternal, (req, res) => {
  const skills = loadSkills();
  const skill = findSkill(skills, req.params.id);
  if (!skill) return res.status(404).json({ error: 'not_found', id: req.params.id });

  const providedInputs = (req.body && req.body.inputs) || {};
  if (typeof providedInputs !== 'object' || Array.isArray(providedInputs)) {
    return res.status(400).json({ error: 'validation', details: ['inputs must be an object'] });
  }

  const result = mergeInputs(skill, providedInputs);
  res.json({ skillId: skill.id, ...result });
});

// Get one skill (must come AFTER all /:id/<sub> routes)
app.get('/api/skills/:id', (req, res) => {
  const skills = loadSkills();
  const s = findSkill(skills, req.params.id);
  if (!s) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(s);
});

// Update
app.patch('/api/skills/:id', requireInternal, (req, res) => {
  const skills = loadSkills();
  const idx = skills.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });

  const errs = validateSkill({ ...skills[idx], ...req.body });
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  // Circular dependency check on update: if updating `skills` references, ensure none of them can reach this skill.
  if (Array.isArray(req.body.skills)) {
    const updated = { ...skills[idx], ...req.body };
    const cycleCheck = hasCircularDependency([...skills, updated], req.params.id, req.params.id);
    if (cycleCheck.cycle) {
      return res.status(400).json({ error: 'circular_dependency', path: cycleCheck.path });
    }
    // Also check that referenced skills exist
    for (const sid of req.body.skills) {
      if (!findSkill(skills, sid)) {
        return res.status(400).json({ error: 'validation', details: [`referenced skill not found: ${sid}`] });
      }
    }
  }

  skills[idx] = normalizeSkill({ ...skills[idx], ...req.body }, skills[idx]);
  saveSkills(skills);
  res.json(skills[idx]);
});

// Delete
app.delete('/api/skills/:id', requireInternal, (req, res) => {
  const skills = loadSkills();
  const idx = skills.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const [removed] = skills.splice(idx, 1);
  saveSkills(skills);
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
  SKILLS_FILE, VERSIONS_FILE, DEFAULT_CATEGORY,
  VALID_TYPES, SEMVER_RE,
  validateSkill, normalizeSkill,
  hasCircularDependency, topoSortDependencies, collectToolIds, mergeInputs,
  findSkill, byCategory, byTag, searchByName, listAll,
  validateVersionBump, nextVersion,
  loadSkills, saveSkills, loadSkillVersions, saveSkillVersions,
};