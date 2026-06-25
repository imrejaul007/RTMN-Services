/**
 * HOJAI Cloud — the deploy target for `npx hojai deploy`.
 *
 * Port: 4380
 * Purpose: Accept a HOJAI Foundry project, persist it, spawn its
 * backend on a per-tenant port, return the public URL.
 *
 * Endpoints:
 *   POST /api/v1/deploy             — push a project; get back URL + IDs
 *   GET  /api/v1/deployments        — list all deployments (admin)
 *   GET  /api/v1/deployments/:id    — fetch one deployment
 *   DELETE /api/v1/deployments/:id  — tear down a deployment
 *   GET  /api/v1/health             — service health
 *   GET  /api/v1/ready              — readiness
 *   GET  /                          — service info + routing summary
 *
 * The wildcard routing story:
 *   - In production, a reverse proxy (nginx / Caddy / Cloudflare) listens on
 *     `*.hojai.app` and forwards `Host: <sub>.hojai.app` to this service on
 *     `/api/v1/route/:sub/*`. This service then proxies to the right tenant.
 *   - For local dev, the service returns the per-tenant `localhost` URL —
 *     callers can hit the backend directly on its assigned port.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const net = require('net');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.env.HOJAI_CLOUD_PORT || '4380');
const PUBLIC_HOST = process.env.HOJAI_PUBLIC_HOST || 'hojai.app';
const PUBLIC_SCHEME = process.env.HOJAI_PUBLIC_SCHEME || 'https';
const STORAGE_DIR = process.env.HOJAI_CLOUD_STORAGE || path.join(__dirname, '..', '.storage');
const PORT_RANGE_START = parseInt(process.env.HOJAI_CLOUD_PORT_RANGE_START || '8800');
const PORT_RANGE_END = parseInt(process.env.HOJAI_CLOUD_PORT_RANGE_END || '8899');
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';
const REQUIRE_AUTH = process.env.HOJAI_CLOUD_REQUIRE_AUTH !== 'false';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '5mb' }));

// ── In-memory deployment registry ───────────────────────────────────────────
//
//   Map<deploymentId, Deployment>
//   Deployment = {
//     id, projectId, projectName, subdomain, status, url,
//     manifest, runtime, port, pid, createdAt, updatedAt
//   }
//
// We also persist each project to disk under STORAGE_DIR/<projectId>/ so a
// restart doesn't lose the deployed code.

const deployments = new Map();
const portAssignments = new Map();   // port -> deploymentId

function recordPath(projectId) {
  return path.join(STORAGE_DIR, projectId);
}

function loadFromDisk() {
  if (!fs.existsSync(STORAGE_DIR)) return;
  for (const dir of fs.readdirSync(STORAGE_DIR)) {
    const metaPath = path.join(STORAGE_DIR, dir, 'deploy.json');
    if (!fs.existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      deployments.set(meta.id, meta);
      if (meta.port) portAssignments.set(meta.port, meta.id);
    } catch {}
  }
  console.log(`[hojai-cloud] loaded ${deployments.size} deployment(s) from disk`);
}

async function findFreePort(start = PORT_RANGE_START, end = PORT_RANGE_END) {
  const tryPort = (port) => new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(null));
    srv.once('listening', () => srv.close(() => resolve(port)));
    srv.listen(port, '127.0.0.1');
  });
  for (let p = start; p <= end; p++) {
    if (portAssignments.has(p)) continue;
    const got = await tryPort(p);
    if (got) return got;
  }
  return null;
}

function saveDeploymentToDisk(d) {
  const dir = recordPath(d.projectId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'deploy.json'), JSON.stringify(d, null, 2));
  // Persist project files if they were provided
  if (d.files && typeof d.files === 'object') {
    for (const [rel, content] of Object.entries(d.files)) {
      const full = path.join(dir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
  }
}

function loadDeploymentFromDisk(projectId) {
  const dir = recordPath(projectId);
  const metaPath = path.join(dir, 'deploy.json');
  if (!fs.existsSync(metaPath)) return null;
  return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
}

function spawnBackend(d) {
  // Each tenant's backend is the project's apps/backend/src/index.js, run with
  // its own PORT env var. We persist the project to disk first so the
  // backend can read its files.
  const projectDir = recordPath(d.projectId);
  const backendEntry = path.join(projectDir, 'apps', 'backend', 'src', 'index.js');
  if (!fs.existsSync(backendEntry)) {
    throw new Error(`project has no backend entry at ${backendEntry}`);
  }
  const child = spawn('node', [backendEntry], {
    cwd: projectDir,
    env: { ...process.env, PORT: String(d.port) },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', (b) => process.stdout.write(`[${d.subdomain}] ${b}`));
  child.stderr.on('data', (b) => process.stderr.write(`[${d.subdomain}] ${b}`));
  child.unref();
  return child.pid;
}

async function waitForBackend(port, maxMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const ok = await new Promise((resolve) => {
      const s = net.createConnection({ host: '127.0.0.1', port });
      s.once('connect', () => { s.end(); resolve(true); });
      s.once('error', () => resolve(false));
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

function requireAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const auth = req.header('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'missing bearer token' });
  if (m[1] !== HOJAI_API_KEY) return res.status(403).json({ error: 'invalid api key' });
  next();
}

function safeSubdomain(name) {
  // *.hojai.app subdomains must be lowercase, alphanumeric + hyphens, 2-40 chars
  return String(name || '').toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'project';
}

// ── Routes ──────────────────────────────────────────────────────────────────

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'hojai-cloud',
    port: PORT,
    publicHost: PUBLIC_HOST,
    deployments: deployments.size,
    portsInUse: portAssignments.size
  });
});

app.get('/api/v1/ready', (_req, res) => res.json({ status: 'ready' }));

app.get('/', (_req, res) => {
  res.json({
    service: 'hojai-cloud',
    port: PORT,
    publicHost: PUBLIC_HOST,
    scheme: PUBLIC_SCHEME,
    endpoints: [
      'POST /api/v1/deploy',
      'GET  /api/v1/deployments',
      'GET  /api/v1/deployments/:id',
      'DELETE /api/v1/deployments/:id',
      'GET  /api/v1/health',
      'GET  /api/v1/ready'
    ]
  });
});

// ── Deploy ──────────────────────────────────────────────────────────────────
//
// Body shape:
//   {
//     name: 'my-app',
//     type: 'marketplace' | 'hotel' | ...,
//     manifest: { ... },                     // from .hojai/manifest.json
//     runtime: 'node-express' | 'static',
//     files?: { 'apps/backend/src/index.js': '...', ... }   // optional —
//       if absent, we look for a previous deployment of this name and reuse.
//   }
//
// Returns:
//   { projectId, deploymentId, url, status, port }

app.post('/api/v1/deploy', requireAuth, async (req, res) => {
  const { name, type, manifest, runtime, files } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!manifest || typeof manifest !== 'object') {
    return res.status(400).json({ error: 'manifest is required' });
  }

  const subdomain = safeSubdomain(name);

  // Check for existing deployment with this name → re-deploy (overwrite)
  let existing = null;
  for (const d of deployments.values()) {
    if (d.projectName === name) { existing = d; break; }
  }

  const projectId = existing ? existing.projectId : uuidv4();
  const deploymentId = uuidv4();
  const port = existing ? existing.port : await findFreePort();
  if (!port) {
    return res.status(503).json({ error: 'no free ports in range', range: [PORT_RANGE_START, PORT_RANGE_END] });
  }

  // If a previous deployment was running, kill it.
  if (existing) {
    try { process.kill(existing.pid, 'SIGTERM'); } catch {}
    portAssignments.delete(existing.port);
  }

  const url = `${PUBLIC_SCHEME}://${subdomain}.${PUBLIC_HOST}`;
  const record = {
    id: deploymentId,
    projectId,
    projectName: name,
    subdomain,
    status: 'provisioning',
    url,
    manifest,
    runtime: runtime || 'node-express',
    type: type || manifest.type || 'unknown',
    port,
    pid: null,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    if (files && Object.keys(files).length > 0) {
      record.status = 'storing';
      saveDeploymentToDisk({ ...record, files });
      record.status = 'starting';
    } else if (!fs.existsSync(recordPath(projectId))) {
      return res.status(400).json({ error: 'no files provided and no prior deployment for this name' });
    } else {
      // Just rewrite the meta
      saveDeploymentToDisk(record);
    }

    record.pid = spawnBackend(record);
    portAssignments.set(port, deploymentId);
    deployments.set(deploymentId, record);
    saveDeploymentToDisk(record);

    // Wait for the backend to actually come up before reporting success.
    const up = await waitForBackend(port);
    if (!up) {
      record.status = 'unhealthy';
      saveDeploymentToDisk(record);
      return res.status(502).json({
        error: 'backend failed to bind within 10s',
        ...record
      });
    }

    record.status = 'live';
    saveDeploymentToDisk(record);

    res.status(201).json({
      projectId,
      deploymentId,
      url: record.url,
      status: record.status,
      port: record.port
    });
  } catch (err) {
    record.status = 'failed';
    record.error = err.message;
    deployments.set(deploymentId, record);
    saveDeploymentToDisk(record);
    res.status(500).json({ error: err.message, ...record });
  }
});

app.get('/api/v1/deployments', requireAuth, (_req, res) => {
  res.json({
    count: deployments.size,
    deployments: Array.from(deployments.values()).map((d) => ({
      id: d.id,
      projectId: d.projectId,
      projectName: d.projectName,
      subdomain: d.subdomain,
      url: d.url,
      status: d.status,
      port: d.port,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }))
  });
});

app.get('/api/v1/deployments/:id', requireAuth, (req, res) => {
  const d = deployments.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'not found' });
  res.json(d);
});

app.delete('/api/v1/deployments/:id', requireAuth, (req, res) => {
  const d = deployments.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'not found' });
  try { process.kill(d.pid, 'SIGTERM'); } catch {}
  portAssignments.delete(d.port);
  deployments.delete(d.id);
  // Note: we leave the project files on disk so re-deploys are fast.
  res.json({ ok: true, id: d.id });
});

// ── Reverse-proxy route (for nginx/Caddy → hojai-cloud) ─────────────────────
//
//   GET/POST/PUT/PATCH/DELETE /api/v1/route/:subdomain/* → forwards to
//   http://127.0.0.1:<port>/<rest>  where <port> is the per-tenant port.

const { request } = require('node:http');
function proxyToTenant(req, res) {
  const sub = req.params.subdomain;
  const target = Array.from(deployments.values()).find((d) => d.subdomain === sub);
  if (!target) return res.status(404).json({ error: 'unknown subdomain', subdomain: sub });

  const rest = req.params[0] || '';
  const opts = {
    host: '127.0.0.1',
    port: target.port,
    method: req.method,
    path: '/' + rest,
    headers: { ...req.headers, host: `127.0.0.1:${target.port}` }
  };
  const upstream = require('node:http').request(opts, (uRes) => {
    res.writeHead(uRes.statusCode, uRes.headers);
    uRes.pipe(res);
  });
  upstream.on('error', (e) => res.status(502).json({ error: 'upstream_error', detail: e.message, subdomain: sub }));
  req.pipe(upstream);
}
app.all(/^\/api\/v1\/route\/([^/]+)\/(.*)$/, proxyToTenant);

// ── Boot ────────────────────────────────────────────────────────────────────

if (require.main === module) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  loadFromDisk();
  app.listen(PORT, () => {
    console.log(`[hojai-cloud] listening on http://localhost:${PORT}`);
    console.log(`[hojai-cloud] public host: ${PUBLIC_SCHEME}://*.${PUBLIC_HOST}`);
    console.log(`[hojai-cloud] storage: ${STORAGE_DIR}`);
    console.log(`[hojai-cloud] port range: ${PORT_RANGE_START}-${PORT_RANGE_END}`);
    console.log(`[hojai-cloud] auth: ${REQUIRE_AUTH ? 'required' : 'disabled (dev mode)'}`);
  });
}

module.exports = { app, deployments, portAssignments, findFreePort, safeSubdomain, requireAuth };