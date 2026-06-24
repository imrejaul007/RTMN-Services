/**
 * knowledge-version-graph — DAG of knowledge versions, lineage, supersedes links
 * Port: 5341
 *
 * Each knowledge artifact can have multiple versions. Versions form a DAG via
 * "supersedes" links: v3 supersedes v1 and v2 (fork-merge), or just v1 (linear).
 *
 * Endpoints:
 *   POST   /artifacts                                 create artifact (root version auto-created)
 *   GET    /artifacts                                 list
 *   GET    /artifacts/:id                             get
 *   POST   /artifacts/:id/versions                    add new version (optionally supersedes predecessors)
 *   GET    /artifacts/:id/versions                    list versions
 *   GET    /versions/:id                              get version
 *   POST   /versions/:id/supersedes                   link this version supersedes another
 *   DELETE /versions/:id/supersedes/:predecessorId    drop link
 *   GET    /versions/:id/ancestors                    full ancestor set (transitive predecessors)
 *   GET    /versions/:id/descendants                  full descendant set (transitive successors)
 *   GET    /versions/:id/lineage                      short lineage summary (depth + breadth + root + leaf)
 *   GET    /versions/:id/cycle                        cycle detection from this version
 *   GET    /graph/topo                                topological order of all versions
 *   GET    /graph/stats                               graph stats (artifacts, versions, edges, roots, leaves)
 *
 * Storage: $DATA_DIR/graph.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5341', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'knowledge-version-graph-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'graph.json');

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ artifacts: {}, versions: {}, supersedes: {} }, null, 2));
  }
}
function loadAll() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (_) {
    return { artifacts: {}, versions: {}, supersedes: {} };
  }
}
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// Walk all reachable predecessors via supersedes links.
function collectAncestors(versionId, supersedes, visited = new Set()) {
  if (visited.has(versionId)) return [];
  visited.add(versionId);
  const preds = supersedes[versionId] || [];
  const out = [];
  for (const p of preds) {
    out.push(p);
    for (const a of collectAncestors(p, supersedes, visited)) out.push(a);
  }
  return Array.from(new Set(out));
}
// Walk all reachable successors (versions that supersede this one) via reverse map.
function collectDescendants(versionId, revSupersedes, visited = new Set()) {
  if (visited.has(versionId)) return [];
  visited.add(versionId);
  const succs = revSupersedes[versionId] || [];
  const out = [];
  for (const s of succs) {
    out.push(s);
    for (const d of collectDescendants(s, revSupersedes, visited)) out.push(d);
  }
  return Array.from(new Set(out));
}
function buildReverseMap(supersedes) {
  const rev = {};
  for (const [v, preds] of Object.entries(supersedes)) {
    for (const p of preds) {
      if (!rev[p]) rev[p] = [];
      if (!rev[p].includes(v)) rev[p].push(v);
    }
  }
  return rev;
}

// Cycle detection: BFS from versionId following supersedes; if we revisit a node on the current path → cycle.
function detectCycleFrom(versionId, supersedes) {
  const path = new Set();
  const stack = [[versionId, []]];
  while (stack.length) {
    const [node, trail] = stack.pop();
    if (path.has(node)) return { hasCycle: true, path: trail.concat(node) };
    path.add(node);
    for (const p of supersedes[node] || []) stack.push([p, trail.concat(node)]);
  }
  return { hasCycle: false };
}

function validateArtifactBody(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name) return 'name required';
  if (!body.kind) return 'kind required (e.g. document, fact, schema, model)';
  return null;
}
function validateVersionBody(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.content_hash) return 'content_hash required (sha256 of content)';
  if (!Array.isArray(body.supersedes)) body.supersedes = [];
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'knowledge-version-graph', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Artifacts ----
  app.post('/artifacts', requireInternal, (req, res) => {
    const err = validateArtifactBody(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { name, description = '', kind, tags = [], metadata = {} } = req.body;
    const artifact = {
      id: newId('art'),
      name, description, kind, tags,
      metadata,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    data.artifacts[artifact.id] = artifact;

    // Root version auto-created.
    const rootVersion = {
      id: newId('ver'),
      artifact_id: artifact.id,
      version_number: 1,
      content_hash: req.body.initial_content_hash || 'sha256:genesis',
      supersedes: [],
      author: req.body.author || 'system',
      summary: 'root version',
      created_at: nowIso(),
    };
    data.versions[rootVersion.id] = rootVersion;
    data.supersedes[rootVersion.id] = [];

    artifact.latest_version_id = rootVersion.id;
    saveAll(data);
    res.status(201).json({ artifact, root_version: rootVersion });
  });

  app.get('/artifacts', requireInternal, (_req, res) => {
    const data = loadAll();
    res.json({ count: Object.keys(data.artifacts).length, artifacts: Object.values(data.artifacts) });
  });

  app.get('/artifacts/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.artifacts[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    const versions = Object.values(data.versions).filter((v) => v.artifact_id === a.id);
    res.json({ artifact: a, version_count: versions.length, latest_version_id: a.latest_version_id });
  });

  // ---- Versions ----
  app.post('/artifacts/:id/versions', requireInternal, (req, res) => {
    const data = loadAll();
    const artifact = data.artifacts[req.params.id];
    if (!artifact) return res.status(404).json({ error: 'artifact_not_found' });
    const err = validateVersionBody(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { content_hash, supersedes = [], author = 'system', summary = '' } = req.body;
    // Validate supersedes refer to versions of same artifact.
    for (const s of supersedes) {
      const sv = data.versions[s];
      if (!sv) return res.status(400).json({ error: 'predecessor_not_found', predecessor_id: s });
      if (sv.artifact_id !== artifact.id) return res.status(400).json({ error: 'predecessor_artifact_mismatch', predecessor_id: s });
    }
    const existing = Object.values(data.versions).filter((v) => v.artifact_id === artifact.id);
    const version_number = existing.length + 1;
    const version = {
      id: newId('ver'),
      artifact_id: artifact.id,
      version_number,
      content_hash,
      supersedes: [...supersedes],
      author, summary,
      created_at: nowIso(),
    };
    data.versions[version.id] = version;
    data.supersedes[version.id] = [...supersedes];
    artifact.latest_version_id = version.id;
    artifact.updated_at = nowIso();
    saveAll(data);
    res.status(201).json(version);
  });

  app.get('/artifacts/:id/versions', requireInternal, (req, res) => {
    const data = loadAll();
    const artifact = data.artifacts[req.params.id];
    if (!artifact) return res.status(404).json({ error: 'not_found' });
    let items = Object.values(data.versions).filter((v) => v.artifact_id === artifact.id);
    items = items.sort((a, b) => a.version_number - b.version_number);
    res.json({ count: items.length, versions: items });
  });

  app.get('/versions/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const v = data.versions[req.params.id];
    if (!v) return res.status(404).json({ error: 'not_found' });
    res.json(v);
  });

  // ---- Supersedes edges ----
  app.post('/versions/:id/supersedes', requireInternal, (req, res) => {
    const data = loadAll();
    const v = data.versions[req.params.id];
    if (!v) return res.status(404).json({ error: 'not_found' });
    const { predecessor_id } = req.body || {};
    if (!predecessor_id) return res.status(400).json({ error: 'predecessor_id required' });
    const pred = data.versions[predecessor_id];
    if (!pred) return res.status(400).json({ error: 'predecessor_not_found' });
    if (pred.artifact_id !== v.artifact_id) return res.status(400).json({ error: 'predecessor_artifact_mismatch' });
    if (predecessor_id === v.id) return res.status(400).json({ error: 'self_link' });
    if (!data.supersedes[v.id]) data.supersedes[v.id] = [];
    if (data.supersedes[v.id].includes(predecessor_id)) {
      return res.json({ version_id: v.id, supersedes: data.supersedes[v.id], already_linked: true });
    }
    data.supersedes[v.id].push(predecessor_id);
    v.supersedes = [...data.supersedes[v.id]];
    saveAll(data);
    res.status(201).json({ version_id: v.id, supersedes: data.supersedes[v.id] });
  });

  app.delete('/versions/:id/supersedes/:predecessorId', requireInternal, (req, res) => {
    const data = loadAll();
    const v = data.versions[req.params.id];
    if (!v) return res.status(404).json({ error: 'not_found' });
    if (!data.supersedes[v.id]) data.supersedes[v.id] = [];
    const before = data.supersedes[v.id].length;
    data.supersedes[v.id] = data.supersedes[v.id].filter((p) => p !== req.params.predecessorId);
    v.supersedes = [...data.supersedes[v.id]];
    saveAll(data);
    res.json({ version_id: v.id, supersedes: data.supersedes[v.id], removed: before - data.supersedes[v.id].length });
  });

  // ---- DAG traversal ----
  app.get('/versions/:id/ancestors', requireInternal, (req, res) => {
    const data = loadAll();
    const v = data.versions[req.params.id];
    if (!v) return res.status(404).json({ error: 'not_found' });
    const ancestors = collectAncestors(req.params.id, data.supersedes);
    res.json({ version_id: v.id, count: ancestors.length, ancestors });
  });

  app.get('/versions/:id/descendants', requireInternal, (req, res) => {
    const data = loadAll();
    const v = data.versions[req.params.id];
    if (!v) return res.status(404).json({ error: 'not_found' });
    const rev = buildReverseMap(data.supersedes);
    const descendants = collectDescendants(req.params.id, rev);
    res.json({ version_id: v.id, count: descendants.length, descendants });
  });

  app.get('/versions/:id/lineage', requireInternal, (req, res) => {
    const data = loadAll();
    const v = data.versions[req.params.id];
    if (!v) return res.status(404).json({ error: 'not_found' });
    const ancestors = collectAncestors(req.params.id, data.supersedes);
    const rev = buildReverseMap(data.supersedes);
    const descendants = collectDescendants(req.params.id, rev);
    // depth = longest ancestor chain (BFS by distance from v)
    const depthMap = new Map([[req.params.id, 0]]);
    const q = [req.params.id];
    while (q.length) {
      const node = q.shift();
      const d = depthMap.get(node);
      for (const p of data.supersedes[node] || []) {
        if (!depthMap.has(p)) { depthMap.set(p, d + 1); q.push(p); }
      }
    }
    let maxDepth = 0;
    for (const d of depthMap.values()) if (d > maxDepth) maxDepth = d;
    const roots = ancestors.filter((a) => (data.supersedes[a] || []).length === 0);
    // Leaves: descendants that have no successors, plus the queried version itself if it has no descendants
    const leavesFromDesc = descendants.filter((d) => (buildReverseMap(data.supersedes)[d] || []).length === 0);
    const leaves = descendants.length === 0
      ? [req.params.id]
      : leavesFromDesc;
    res.json({
      version_id: v.id,
      depth: maxDepth,
      breadth: ancestors.length + descendants.length + 1,
      ancestor_count: ancestors.length,
      descendant_count: descendants.length,
      roots,
      leaves,
    });
  });

  app.get('/versions/:id/cycle', requireInternal, (req, res) => {
    const data = loadAll();
    const v = data.versions[req.params.id];
    if (!v) return res.status(404).json({ error: 'not_found' });
    res.json(detectCycleFrom(req.params.id, data.supersedes));
  });

  // ---- Graph-wide ----
  app.get('/graph/topo', requireInternal, (_req, res) => {
    const data = loadAll();
    const versions = Object.values(data.versions);
    const indeg = {};
    const adj = {};
    for (const v of versions) { indeg[v.id] = 0; adj[v.id] = []; }
    for (const [v, preds] of Object.entries(data.supersedes)) {
      // Edge predecessor → v means v depends on predecessor; topo puts predecessor first.
      for (const p of preds) {
        if (adj[p]) { adj[p].push(v); indeg[v] = (indeg[v] || 0) + 1; }
      }
    }
    const queue = versions.filter((v) => indeg[v.id] === 0).map((v) => v.id);
    const order = [];
    while (queue.length) {
      const n = queue.shift();
      order.push(n);
      for (const m of adj[n] || []) {
        indeg[m] -= 1;
        if (indeg[m] === 0) queue.push(m);
      }
    }
    res.json({ count: order.length, order, has_cycle: order.length !== versions.length });
  });

  app.get('/graph/stats', requireInternal, (_req, res) => {
    const data = loadAll();
    const rev = buildReverseMap(data.supersedes);
    let edgeCount = 0;
    let roots = 0;
    let leaves = 0;
    for (const v of Object.values(data.versions)) {
      const preds = data.supersedes[v.id] || [];
      const succs = rev[v.id] || [];
      edgeCount += preds.length;
      if (preds.length === 0) roots += 1;
      if (succs.length === 0) leaves += 1;
    }
    res.json({
      artifact_count: Object.keys(data.artifacts).length,
      version_count: Object.values(data.versions).length,
      edge_count: edgeCount,
      roots,
      leaves,
    });
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`knowledge-version-graph listening on ${PORT}`));
}

module.exports = { createApp };