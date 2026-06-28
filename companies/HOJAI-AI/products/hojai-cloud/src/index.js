/**
 * HOJAI Cloud v1.2 — the deploy target for `npx hojai deploy`.
 *
 * Port: 4380
 *
 * New in v1.2:
 * - Auto-respawn on boot
 * - SSL certificate management
 * - Custom domain support
 * - Preview environments
 * - Rollback support
 *
 * Endpoints:
 *   POST /api/v1/deploy             — push a project
 *   GET  /api/v1/deployments        — list deployments
 *   GET  /api/v1/deployments/:id    — fetch one deployment
 *   DELETE /api/v1/deployments/:id  — tear down
 *   POST /api/v1/deployments/:id/rollback — rollback to previous version
 *   GET  /api/v1/previews           — list preview environments
 *   POST /api/v1/previews           — create preview
 *   GET  /api/v1/domains           — list custom domains
 *   POST /api/v1/domains           — add custom domain
 *   POST /api/v1/domains/:domain/verify — verify domain
 *   GET  /api/v1/certificates       — list SSL certificates
 *   POST /api/v1/certificates       — provision SSL
 *   GET  /api/v1/health             — health check
 *   GET  /api/v1/ready              — readiness
 *   GET  /                           — service info
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

// Load v1.2 modules
const respawn = require('./respawn');
const sslManager = require('./ssl-manager');
const domainManager = require('./domain-manager');
const previewManager = require('./preview-environments');
const rollbackManager = require('./rollback-manager');

// Configuration
const PORT = parseInt(process.env.HOJAI_CLOUD_PORT || '4380');
const PUBLIC_HOST = process.env.HOJAI_PUBLIC_HOST || 'hojai.app';
const PUBLIC_SCHEME = process.env.HOJAI_PUBLIC_SCHEME || 'https';
const STORAGE_DIR = process.env.HOJAI_CLOUD_STORAGE || path.join(__dirname, '..', '.storage');
const PORT_RANGE_START = parseInt(process.env.HOJAI_CLOUD_PORT_RANGE_START || '8800');
const PORT_RANGE_END = parseInt(process.env.HOJAI_CLOUD_PORT_RANGE_END || '8899');
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';
const REQUIRE_AUTH = process.env.HOJAI_CLOUD_REQUIRE_AUTH !== 'false';
const AUTO_RESPAWN = process.env.HOJAI_CLOUD_AUTO_RESPAWN !== 'false';
const MAX_SNAPSHOTS = parseInt(process.env.HOJAI_CLOUD_MAX_SNAPSHOTS || '10');
const PREVIEW_EXPIRY_DAYS = parseInt(process.env.HOJAI_CLOUD_PREVIEW_EXPIRY_DAYS || '7');

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


// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '5mb' }));

// ── In-memory deployment registry ───────────────────────────────────────────

const deployments = new Map();     // deploymentId -> Deployment
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
    version: '1.2.0',
    port: PORT,
    publicHost: PUBLIC_HOST,
    deployments: deployments.size,
    portsInUse: portAssignments.size,
    features: {
      autoRespawn: AUTO_RESPAWN,
      ssl: true,
      customDomains: true,
      previews: true,
      rollbacks: true
    }
  });
});

app.get('/api/v1/ready', (_req, res) => res.json({ status: 'ready' }));

app.get('/', (_req, res) => {
  res.json({
    service: 'hojai-cloud',
    version: '1.2.0',
    port: PORT,
    publicHost: PUBLIC_HOST,
    scheme: PUBLIC_SCHEME,
    endpoints: [
      'POST /api/v1/deploy',
      'GET  /api/v1/deployments',
      'GET  /api/v1/deployments/:id',
      'POST /api/v1/deployments/:id/rollback',
      'DELETE /api/v1/deployments/:id',
      'GET  /api/v1/previews',
      'POST /api/v1/previews',
      'GET  /api/v1/domains',
      'POST /api/v1/domains',
      'POST /api/v1/domains/:domain/verify',
      'GET  /api/v1/certificates',
      'POST /api/v1/certificates',
      'GET  /api/v1/snapshots/:projectId',
      'GET  /api/v1/health',
      'GET  /api/v1/ready'
    ]
  });
});

// ── Deploy ──────────────────────────────────────────────────────────────────

app.post('/api/v1/deploy', requireAuth, async (req, res) => {
  const { name, type, manifest, runtime, files, isPreview, previewBranch, previewPR } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!manifest || typeof manifest !== 'object') {
    return res.status(400).json({ error: 'manifest is required' });
  }

  const subdomain = safeSubdomain(name);

  // Check for existing deployment with this name
  let existing = null;
  for (const d of deployments.values()) {
    if (d.projectName === name) { existing = d; break; }
  }

  // Create snapshot before deployment (for rollback)
  if (existing) {
    rollbackManager.createSnapshot({
      deploymentId: existing.id,
      projectId: existing.projectId,
      projectName: existing.projectName,
      manifest: existing.manifest
    });
    // Prune old snapshots
    rollbackManager.pruneOldSnapshots(existing.projectId, MAX_SNAPSHOTS);
  }

  const projectId = existing ? existing.projectId : uuidv4();
  const deploymentId = uuidv4();
  const port = existing ? existing.port : await findFreePort();
  if (!port) {
    return res.status(503).json({ error: 'no free ports in range', range: [PORT_RANGE_START, PORT_RANGE_END] });
  }

  // Kill previous if re-deploying
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
    updatedAt: new Date().toISOString(),
    isPreview: isPreview || false,
    previewBranch: previewBranch || null,
    previewPR: previewPR || null
  };

  try {
    if (files && Object.keys(files).length > 0) {
      record.status = 'storing';
      saveDeploymentToDisk({ ...record, files });
      record.status = 'starting';
    } else if (!fs.existsSync(recordPath(projectId))) {
      return res.status(400).json({ error: 'no files provided and no prior deployment for this name' });
    } else {
      saveDeploymentToDisk(record);
    }

    record.pid = spawnBackend(record);
    portAssignments.set(port, deploymentId);
    deployments.set(deploymentId, record);
    saveDeploymentToDisk(record);

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

// Deployments CRUD
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
      updatedAt: d.updatedAt,
      isPreview: d.isPreview
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
  res.json({ ok: true, id: d.id });
});

// ── Rollback ──────────────────────────────────────────────────────────────────

app.post('/api/v1/deployments/:id/rollback', requireAuth, async (req, res) => {
  const { snapshotId } = req.body || {};
  const deployment = deployments.get(req.params.id);
  if (!deployment) return res.status(404).json({ error: 'not found' });

  // Get the snapshot to rollback to
  const snapshot = snapshotId
    ? await rollbackManager.rollbackTo(snapshotId)
    : await rollbackManager.rollbackTo(
        rollbackManager.getSnapshotsByProject(deployment.projectId, 2)[1]?.id
      );

  if (!snapshot) {
    return res.status(404).json({ error: 'no snapshot found to rollback to' });
  }

  // Redeploy with the snapshot's files
  const port = await findFreePort();
  if (!port) {
    return res.status(503).json({ error: 'no free ports available' });
  }

  const deploymentId = uuidv4();
  const url = `${PUBLIC_SCHEME}://${deployment.subdomain}.${PUBLIC_HOST}`;

  const record = {
    id: deploymentId,
    projectId: deployment.projectId,
    projectName: deployment.projectName,
    subdomain: deployment.subdomain,
    status: 'provisioning',
    url,
    manifest: snapshot.snapshot.manifest,
    runtime: deployment.runtime,
    type: deployment.type,
    port,
    pid: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    // Kill old deployment
    try { process.kill(deployment.pid, 'SIGTERM'); } catch {}
    portAssignments.delete(deployment.port);

    // Save new files
    if (snapshot.files) {
      record.status = 'storing';
      saveDeploymentToDisk({ ...record, files: snapshot.files });
      record.status = 'starting';
    }

    record.pid = spawnBackend(record);
    portAssignments.set(port, deploymentId);
    deployments.set(deploymentId, record);
    saveDeploymentToDisk(record);

    const up = await waitForBackend(port);
    if (!up) {
      record.status = 'unhealthy';
      saveDeploymentToDisk(record);
      return res.status(502).json({ error: 'rollback backend failed to start', ...record });
    }

    record.status = 'live';
    saveDeploymentToDisk(record);

    // Mark old deployment as rolled-back
    deployment.status = 'rolled-back';
    deployment.updatedAt = new Date().toISOString();
    saveDeploymentToDisk(deployment);

    res.status(201).json({
      deploymentId,
      url: record.url,
      status: record.status,
      port: record.port,
      rolledBackFrom: deployment.id
    });
  } catch (err) {
    record.status = 'failed';
    record.error = err.message;
    deployments.set(deploymentId, record);
    saveDeploymentToDisk(record);
    res.status(500).json({ error: err.message });
  }
});

// Get snapshots for a project
app.get('/api/v1/snapshots/:projectId', requireAuth, (req, res) => {
  const snapshots = rollbackManager.getSnapshotsByProject(req.params.projectId);
  res.json({ count: snapshots.length, snapshots });
});

// ── Preview Environments ─────────────────────────────────────────────────────────

app.get('/api/v1/previews', requireAuth, (req, res) => {
  const { projectId } = req.query;
  const previews = projectId
    ? previewManager.listPreviewsByProject(projectId)
    : previewManager.listPreviews();
  res.json({ count: previews.length, previews });
});

app.post('/api/v1/previews', requireAuth, async (req, res) => {
  const { name, branch, prNumber, projectId, files, manifest } = req.body || {};
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const port = await findFreePort();
  if (!port) {
    return res.status(503).json({ error: 'no free ports available' });
  }

  // Create preview record
  const preview = previewManager.createPreview({
    name,
    branch,
    prNumber,
    deploymentId: null,
    projectId,
    port
  });

  // Create a minimal deployment for the preview
  const deploymentId = uuidv4();
  const subdomain = safeSubdomain(name || branch || `preview-${prNumber}`);
  const url = previewManager.generatePreviewUrl(subdomain, PUBLIC_HOST);

  const record = {
    id: deploymentId,
    projectId,
    projectName: name || branch || `Preview ${prNumber}`,
    subdomain,
    status: 'provisioning',
    url,
    manifest: manifest || {},
    runtime: 'node-express',
    type: 'preview',
    port,
    pid: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPreview: true,
    previewId: preview.id,
    previewBranch: branch,
    previewPR: prNumber
  };

  try {
    if (files && Object.keys(files).length > 0) {
      saveDeploymentToDisk({ ...record, files });
      record.status = 'starting';
    }

    record.pid = spawnBackend(record);
    portAssignments.set(port, deploymentId);
    deployments.set(deploymentId, record);
    saveDeploymentToDisk(record);

    const up = await waitForBackend(port);
    if (!up) {
      record.status = 'unhealthy';
      saveDeploymentToDisk(record);
      return res.status(502).json({ error: 'preview failed to start' });
    }

    record.status = 'live';
    saveDeploymentToDisk(record);

    // Update preview with deployment info
    previewManager.createPreview({
      name,
      branch,
      prNumber,
      deploymentId,
      projectId,
      port
    });

    res.status(201).json({
      previewId: preview.id,
      url: record.url,
      status: record.status,
      port: record.port
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/previews/:id', requireAuth, (req, res) => {
  const preview = previewManager.getPreview(req.params.id);
  if (!preview) return res.status(404).json({ error: 'preview not found' });

  // Find and delete the associated deployment
  for (const [id, d] of deployments) {
    if (d.previewId === req.params.id) {
      try { process.kill(d.pid, 'SIGTERM'); } catch {}
      portAssignments.delete(d.port);
      deployments.delete(id);
      break;
    }
  }

  previewManager.deletePreview(req.params.id);
  res.json({ ok: true, id: req.params.id });
});

// ── Custom Domains ──────────────────────────────────────────────────────────────

app.get('/api/v1/domains', requireAuth, (req, res) => {
  const { deploymentId } = req.query;
  if (deploymentId) {
    res.json({ domains: domainManager.getDomainsByDeployment(deploymentId) });
  } else {
    res.json({ domains: domainManager.listDomains() });
  }
});

app.post('/api/v1/domains', requireAuth, (req, res) => {
  const { domain, deploymentId, projectId } = req.body || {};
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  if (!deploymentId && !projectId) {
    return res.status(400).json({ error: 'deploymentId or projectId is required' });
  }

  try {
    // Get deploymentId from projectId if needed
    const depId = deploymentId || Array.from(deployments.values()).find(d => d.projectId === projectId)?.id;
    if (!depId) return res.status(404).json({ error: 'deployment not found' });

    const record = domainManager.addDomain(domain, depId, projectId || depId);
    res.status(201).json(record.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/domains/:domain/verify', requireAuth, async (req, res) => {
  try {
    const record = domainManager.verifyDomain(req.params.domain);
    res.json(record.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/domains/:domain/activate', requireAuth, async (req, res) => {
  try {
    // Provision SSL first
    const cert = await sslManager.provisionCertificate(req.params.domain);
    const record = domainManager.activateDomain(req.params.domain, cert.id);
    res.json(record.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/v1/domains/:domain', requireAuth, (req, res) => {
  const deleted = domainManager.removeDomain(req.params.domain);
  if (!deleted) return res.status(404).json({ error: 'domain not found' });
  res.json({ ok: true, domain: req.params.domain });
});

// ── SSL Certificates ─────────────────────────────────────────────────────────────

app.get('/api/v1/certificates', requireAuth, (_req, res) => {
  res.json({ certificates: sslManager.listCertificates() });
});

app.post('/api/v1/certificates', requireAuth, async (req, res) => {
  const { domain } = req.body || {};
  if (!domain) return res.status(400).json({ error: 'domain is required' });

  try {
    const cert = await sslManager.provisionCertificate(domain);
    res.status(201).json(cert.toJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/certificates/:domain', requireAuth, (req, res) => {
  const deleted = sslManager.revokeCertificate(req.params.domain);
  if (!deleted) return res.status(404).json({ error: 'certificate not found' });
  res.json({ ok: true, domain: req.params.domain });
});

// ── Reverse-proxy route ───────────────────────────────────────────────────────

const { request } = require('node:http');

function proxyToTenant(req, res) {
  const sub = req.params.subdomain;

  // Check custom domains first
  const customDeployment = domainManager.getDeploymentForDomain(req.headers.host);
  if (customDeployment) {
    const target = deployments.get(customDeployment);
    if (!target) return res.status(404).json({ error: 'deployment not found' });
    return proxyToPort(req, res, target.port);
  }

  // Fall back to subdomain routing
  const target = Array.from(deployments.values()).find((d) => d.subdomain === sub);
  if (!target) return res.status(404).json({ error: 'unknown subdomain', subdomain: sub });

  proxyToPort(req, res, target.port);
}

function proxyToPort(req, res, port) {
  const rest = req.params[0] || '';
  const opts = {
    host: '127.0.0.1',
    port,
    method: req.method,
    path: '/' + rest,
    headers: { ...req.headers, host: `127.0.0.1:${port}` }
  };
  const upstream = require('node:http').request(opts, (uRes) => {
    res.writeHead(uRes.statusCode, uRes.headers);
    uRes.pipe(res);
  });
  upstream.on('error', (e) => res.status(502).json({ error: 'upstream_error', detail: e.message }));
  req.pipe(upstream);
}

app.all(/^\/api\/v1\/route\/([^/]+)\/(.*)$/, proxyToTenant);

// ── Boot ───────────────────────────────────────────────────────────────────────

async function boot() {
  // Ensure storage directories exist
  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  // Initialize v1.2 modules
  sslManager.init();
  domainManager.init();
  previewManager.init();
  rollbackManager.init();

  // Load existing deployments from disk
  loadFromDisk();

  // Auto-respawn all previously deployed backends (v1.2 feature)
  if (AUTO_RESPAWN && deployments.size > 0) {
    console.log(`[hojai-cloud] v1.2: auto-respawning ${deployments.size} deployment(s)...`);
    const { spawned, failed } = await respawn.respawnAll(deployments, portAssignments, STORAGE_DIR);
    console.log(`[hojai-cloud] respawned ${spawned.length} deployment(s), ${failed.length} failed`);

    // Wait for backends to come up
    await respawn.updateRespawnStatus(deployments, portAssignments);
  }

  // Clean up expired preview environments
  const cleaned = previewManager.cleanupExpired();
  if (cleaned > 0) {
    console.log(`[hojai-cloud] cleaned up ${cleaned} expired preview(s)`);
  }

  // Check for expiring SSL certificates
  const expiringCerts = sslManager.checkExpiringCertificates(30);
  if (expiringCerts.length > 0) {
    console.warn(`[hojai-cloud] ${expiringCerts.length} certificate(s) expiring soon: ${expiringCerts.map(c => c.domain).join(', ')}`);
  }
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



  app.listen(PORT, () => {
    console.log(`[hojai-cloud] v1.2 listening on http://localhost:${PORT}`);
    console.log(`[hojai-cloud] public host: ${PUBLIC_SCHEME}://*.${PUBLIC_HOST}`);
    console.log(`[hojai-cloud] storage: ${STORAGE_DIR}`);
    console.log(`[hojai-cloud] port range: ${PORT_RANGE_START}-${PORT_RANGE_END}`);
    console.log(`[hojai-cloud] auto-respawn: ${AUTO_RESPAWN ? 'enabled' : 'disabled'}`);
    console.log(`[hojai-cloud] auth: ${REQUIRE_AUTH ? 'required' : 'disabled (dev mode)'}`);
  });
}

if (require.main === module) {
  boot();
}

module.exports = {
  app,
  deployments,
  portAssignments,
  findFreePort,
  safeSubdomain,
  requireAuth,
  // v1.2 modules
  respawn,
  sslManager,
  domainManager,
  previewManager,
  rollbackManager
};
