/**
 * agent-versioning — Semver + Immutable Snapshots
 * Port: 4911
 *
 * Tracks agent versions. Each version is an immutable snapshot of
 * agent config + code + metadata. Supports semver comparison, listing,
 * diffing, rollback points, and tags (e.g. "stable", "canary", "deprecated").
 *
 * Storage: JSON file at $DATA_DIR/versions.json
 * Auth:    X-Internal-Token header (shared with other lifecycle services)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4911', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'lifecycle-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'versions.json');

// ---------- helpers ----------

function nowIso() { return new Date().toISOString(); }

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

/** Compare two semver strings. Returns -1, 0, 1. */
function compareSemver(a, b) {
  const parse = (v) => v.split('.').map((n) => parseInt(n, 10) || 0);
  const [a1, a2, a3] = parse(a);
  const [b1, b2, b3] = parse(b);
  if (a1 !== b1) return a1 < b1 ? -1 : 1;
  if (a2 !== b2) return a2 < b2 ? -1 : 1;
  if (a3 !== b3) return a3 < b3 ? -1 : 1;
  return 0;
}

/** Bump semver: kind = major | minor | patch */
function bumpSemver(current, kind) {
  const [maj, min, pat] = current.split('.').map((n) => parseInt(n, 10) || 0);
  if (kind === 'major') return `${maj + 1}.0.0`;
  if (kind === 'minor') return `${maj}.${min + 1}.0`;
  if (kind === 'patch') return `${maj}.${min}.${pat + 1}`;
  throw new Error(`Unknown bump kind: ${kind}`);
}

/** Compute a stable hash of the version contents (excluding id+created_at). */
function contentHash(snapshot) {
  const canonical = JSON.stringify({
    agent_id: snapshot.agent_id,
    version: snapshot.version,
    config: snapshot.config || {},
    code: snapshot.code || '',
    metadata: snapshot.metadata || {},
  });
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

// ---------- storage ----------

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}

function loadAll() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveAll(data) {
  ensureDataDir();
  // Atomic write
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function getAgentVersions(agentId) {
  const all = loadAll();
  return all[agentId] || { agent_id: agentId, versions: [], tags: {} };
}

function setAgentVersions(agentId, rec) {
  const all = loadAll();
  all[agentId] = rec;
  saveAll(all);
}

// ---------- auth ----------

function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  if (token !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'unauthorized', message: 'invalid or missing X-Internal-Token' });
  }
  next();
}

// ---------- routes ----------

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health
  app.get('/health', (_req, res) => res.json({ ok: true, service: 'agent-versioning', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Create a new version snapshot for an agent
  // POST /agents/:agentId/versions
  app.post('/agents/:agentId/versions', requireInternal, (req, res) => {
    const { agentId } = req.params;
    const { version, config, code, metadata, tags } = req.body || {};
    if (!version || typeof version !== 'string') {
      return res.status(400).json({ error: 'validation', message: 'version (semver string) is required' });
    }
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
      return res.status(400).json({ error: 'validation', message: 'version must be valid semver (e.g. 1.2.3)' });
    }
    const rec = getAgentVersions(agentId);
    const existing = rec.versions.find((v) => v.version === version);
    if (existing) {
      return res.status(409).json({ error: 'conflict', message: `version ${version} already exists for ${agentId}` });
    }
    const snapshot = {
      id: newId('ver'),
      agent_id: agentId,
      version,
      config: config || {},
      code: code || '',
      metadata: metadata || {},
      tags: Array.isArray(tags) ? tags : [],
      created_at: nowIso(),
    };
    snapshot.content_hash = contentHash(snapshot);
    rec.versions.push(snapshot);
    rec.versions.sort((a, b) => compareSemver(a.version, b.version));
    setAgentVersions(agentId, rec);
    res.status(201).json(snapshot);
  });

  // List all versions for an agent (sorted by semver asc)
  app.get('/agents/:agentId/versions', requireInternal, (req, res) => {
    const rec = getAgentVersions(req.params.agentId);
    res.json({ agent_id: rec.agent_id, count: rec.versions.length, versions: rec.versions });
  });

  // Get a specific version
  app.get('/agents/:agentId/versions/:version', requireInternal, (req, res) => {
    const rec = getAgentVersions(req.params.agentId);
    const v = rec.versions.find((x) => x.version === req.params.version);
    if (!v) return res.status(404).json({ error: 'not_found', message: `version ${req.params.version} not found` });
    res.json(v);
  });

  // Bump a new version from a base version
  // POST /agents/:agentId/versions/:baseVersion/bump
  app.post('/agents/:agentId/versions/:baseVersion/bump', requireInternal, (req, res) => {
    const { agentId, baseVersion } = req.params;
    const { kind = 'patch', config, code, metadata } = req.body || {};
    const rec = getAgentVersions(agentId);
    const base = rec.versions.find((v) => v.version === baseVersion);
    if (!base) return res.status(404).json({ error: 'not_found', message: `base version ${baseVersion} not found` });
    const newVer = bumpSemver(base.version, kind);
    if (rec.versions.find((v) => v.version === newVer)) {
      return res.status(409).json({ error: 'conflict', message: `target version ${newVer} already exists` });
    }
    const snapshot = {
      id: newId('ver'),
      agent_id: agentId,
      version: newVer,
      config: config || base.config,
      code: code !== undefined ? code : base.code,
      metadata: metadata || base.metadata,
      tags: [],
      created_at: nowIso(),
      parent_version: base.version,
    };
    snapshot.content_hash = contentHash(snapshot);
    rec.versions.push(snapshot);
    rec.versions.sort((a, b) => compareSemver(a.version, b.version));
    setAgentVersions(agentId, rec);
    res.status(201).json(snapshot);
  });

  // Tag a version (e.g. "stable", "canary")
  // POST /agents/:agentId/versions/:version/tags
  app.post('/agents/:agentId/versions/:version/tags', requireInternal, (req, res) => {
    const { agentId, version } = req.params;
    const { tag } = req.body || {};
    if (!tag || typeof tag !== 'string') {
      return res.status(400).json({ error: 'validation', message: 'tag (string) is required' });
    }
    const rec = getAgentVersions(agentId);
    const v = rec.versions.find((x) => x.version === version);
    if (!v) return res.status(404).json({ error: 'not_found', message: `version ${version} not found` });
    if (!v.tags.includes(tag)) v.tags.push(tag);
    rec.tags[tag] = version;
    setAgentVersions(agentId, rec);
    res.json(v);
  });

  // List all agents tracked
  app.get('/agents', requireInternal, (_req, res) => {
    const all = loadAll();
    const agents = Object.values(all).map((r) => ({
      agent_id: r.agent_id,
      version_count: r.versions.length,
      tags: r.tags,
      latest: r.versions.length ? r.versions[r.versions.length - 1].version : null,
    }));
    res.json({ count: agents.length, agents });
  });

  // Diff two versions
  app.get('/agents/:agentId/versions/:from/diff/:to', requireInternal, (req, res) => {
    const { agentId, from, to } = req.params;
    const rec = getAgentVersions(agentId);
    const a = rec.versions.find((v) => v.version === from);
    const b = rec.versions.find((v) => v.version === to);
    if (!a || !b) return res.status(404).json({ error: 'not_found', message: 'one or both versions not found' });
    const diff = {
      from: a.version,
      to: b.version,
      config_changed: JSON.stringify(a.config) !== JSON.stringify(b.config),
      code_changed: a.code !== b.code,
      metadata_changed: JSON.stringify(a.metadata) !== JSON.stringify(b.metadata),
      hash_from: a.content_hash,
      hash_to: b.content_hash,
      from_created: a.created_at,
      to_created: b.created_at,
    };
    res.json(diff);
  });

  // Delete an agent's entire version history (admin)
  app.delete('/agents/:agentId/versions', requireInternal, (req, res) => {
    const all = loadAll();
    if (!all[req.params.agentId]) return res.status(404).json({ error: 'not_found' });
    delete all[req.params.agentId];
    saveAll(all);
    res.json({ deleted: true, agent_id: req.params.agentId });
  });

  return app;
}

// ---------- boot ----------

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[agent-versioning] listening on :${PORT} data=${DATA_FILE}`);
  });
}

module.exports = { createApp, compareSemver, bumpSemver, contentHash };