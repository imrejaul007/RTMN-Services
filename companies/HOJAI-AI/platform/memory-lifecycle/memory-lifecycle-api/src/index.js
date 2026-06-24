// memory-lifecycle-api (5325) — Gateway for Memory Lifecycle Platform
// - Service catalog (5 sub-services + 1 gateway = 6)
// - Lifecycle policy CRUD (top-level)
// - Health probes across all backend services
// - HTTP proxy to /governance, /retention, /gdpr, /purge, /audit

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');

// ---------- Service registry ----------
const SUB_SERVICES = {
  governance: { name: 'memory-governance', port: 5326, prefix: '/governance' },
  retention:  { name: 'memory-retention',  port: 5327, prefix: '/retention'  },
  gdpr:       { name: 'memory-gdpr',       port: 5328, prefix: '/gdpr'       },
  purge:      { name: 'memory-purge',      port: 5329, prefix: '/purge'      },
  audit:      { name: 'memory-audit-log',  port: 5330, prefix: '/audit'      },
};

// ---------- Storage (lifecycle policies) ----------
function readData(dataDir) {
  const file = path.join(dataDir, 'lifecycle.json');
  if (!fs.existsSync(file)) {
    const seed = {
      policies: {},   // id -> lifecycle policy
      bindings: {},   // id -> policy-to-memory-type binding
    };
    fs.writeFileSync(file, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeData(dataDir, data) {
  const file = path.join(dataDir, 'lifecycle.json');
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

const VALID_ACTIONS = ['retain', 'archive', 'purge', 'review', 'flag'];
const VALID_STATUSES = ['active', 'paused', 'archived'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function validatePolicy(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name || typeof body.name !== 'string') return 'name required';
  if (!body.action || !VALID_ACTIONS.includes(body.action)) {
    return `action must be one of ${VALID_ACTIONS.join(',')}`;
  }
  if (body.retention_days !== undefined) {
    if (typeof body.retention_days !== 'number' || body.retention_days < 0) {
      return 'retention_days must be a non-negative number';
    }
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of ${VALID_STATUSES.join(',')}`;
  }
  return null;
}

function proxyRequest(targetPort, req, res, body) {
  return new Promise((resolve) => {
    const opts = {
      hostname: '127.0.0.1',
      port: targetPort,
      method: req.method,
      path: req.originalUrl,
      headers: {
        'X-Internal-Token': req.headers['x-internal-token'] || '',
        'Content-Type': 'application/json',
        ...(body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
          ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
    };
    const upstream = http.request(opts, (upRes) => {
      let chunks = '';
      upRes.on('data', (c) => chunks += c);
      upRes.on('end', () => {
        const out = chunks ? chunks : '';
        res.status(upRes.statusCode || 502);
        res.setHeader('Content-Type', upRes.headers['content-type'] || 'application/json');
        res.end(out);
        resolve();
      });
    });
    upstream.on('error', (e) => {
      res.status(502).json({ error: 'upstream_error', message: e.message, port: targetPort });
      resolve();
    });
    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) upstream.write(body);
    upstream.end();
  });
}

// ---------- HTTP proxy helper ----------
function proxyHandler(port, prefix) {
  return async (req, res) => {
    const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
      ? (req.rawBody || JSON.stringify(req.body || {}))
      : null;
    await proxyRequest(port, req, res, body);
  };
}

// ---------- App factory (for tests) ----------
function createApp(options = {}) {
  const dataDir = options.dataDir || process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const internalToken = options.internalToken || process.env.INTERNAL_TOKEN || 'memory-lifecycle-internal-token';

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Capture raw body for proxying
  app.use((req, _res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      req.rawBody = JSON.stringify(req.body || {});
    }
    next();
  });

  function requireInternal(req, res, next) {
    if (req.headers['x-internal-token'] !== internalToken) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    next();
  }

  // Health & ready
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'memory-lifecycle-api', port: 5325 });
  });
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Service catalog
  app.get('/services', requireInternal, (_req, res) => {
    res.json({ gateway: 'memory-lifecycle-api', services: SUB_SERVICES });
  });

  // Health aggregation across all sub-services
  app.get('/services/health', requireInternal, async (_req, res) => {
    const results = {};
    for (const [key, cfg] of Object.entries(SUB_SERVICES)) {
      results[key] = await new Promise((resolve) => {
        const req2 = http.request({
          hostname: '127.0.0.1',
          port: cfg.port,
          path: '/health',
          method: 'GET',
          timeout: 1500,
        }, (r) => {
          let body = '';
          r.on('data', (c) => body += c);
          r.on('end', () => resolve({ ok: r.statusCode === 200, port: cfg.port, response: body }));
        });
        req2.on('error', (e) => resolve({ ok: false, port: cfg.port, error: e.message }));
        req2.on('timeout', () => { req2.destroy(); resolve({ ok: false, port: cfg.port, error: 'timeout' }); });
        req2.end();
      });
    }
    res.json({ gateway: 'memory-lifecycle-api', results });
  });

  // ---- Lifecycle Policy CRUD ----
  // Create policy
  app.post('/policies', requireInternal, (req, res) => {
    const err = validatePolicy(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { name, description = '', action, retention_days = null, memory_types = [], status = 'active' } = req.body;
    const data = readData(dataDir);
    const policy = {
      id: newId('pol'),
      name,
      description,
      action,
      retention_days,
      memory_types: Array.isArray(memory_types) ? memory_types : [],
      status,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    data.policies[policy.id] = policy;
    writeData(dataDir, data);
    res.status(201).json(policy);
  });

  // List policies
  app.get('/policies', requireInternal, (req, res) => {
    const data = readData(dataDir);
    let items = Object.values(data.policies);
    if (req.query.status) items = items.filter((p) => p.status === req.query.status);
    if (req.query.action) items = items.filter((p) => p.action === req.query.action);
    res.json({ count: items.length, policies: items });
  });

  // Get policy
  app.get('/policies/:id', requireInternal, (req, res) => {
    const data = readData(dataDir);
    const p = data.policies[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    res.json(p);
  });

  // Update policy
  app.put('/policies/:id', requireInternal, (req, res) => {
    const data = readData(dataDir);
    const p = data.policies[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    const err = validatePolicy({ ...p, ...req.body });
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { name, description, action, retention_days, memory_types, status } = req.body;
    if (name !== undefined) p.name = name;
    if (description !== undefined) p.description = description;
    if (action !== undefined) p.action = action;
    if (retention_days !== undefined) p.retention_days = retention_days;
    if (memory_types !== undefined) p.memory_types = memory_types;
    if (status !== undefined) p.status = status;
    p.updated_at = nowIso();
    data.policies[p.id] = p;
    writeData(dataDir, data);
    res.json(p);
  });

  // Delete policy
  app.delete('/policies/:id', requireInternal, (req, res) => {
    const data = readData(dataDir);
    const p = data.policies[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    delete data.policies[req.params.id];
    // Remove any bindings referencing it
    for (const b of Object.values(data.bindings)) {
      if (b.policy_id === req.params.id) b.policy_id = null;
    }
    writeData(dataDir, data);
    res.json({ deleted: true, id: req.params.id });
  });

  // Bind policy to a memory type
  app.post('/bindings', requireInternal, (req, res) => {
    if (!req.body || !req.body.memory_type) return res.status(400).json({ error: 'validation', message: 'memory_type required' });
    const data = readData(dataDir);
    const { memory_type, policy_id } = req.body;
    if (policy_id && !data.policies[policy_id]) return res.status(404).json({ error: 'policy_not_found' });
    const binding = {
      id: newId('bnd'),
      memory_type,
      policy_id: policy_id || null,
      created_at: nowIso(),
    };
    data.bindings[binding.id] = binding;
    writeData(dataDir, data);
    res.status(201).json(binding);
  });

  app.get('/bindings', requireInternal, (_req, res) => {
    const data = readData(dataDir);
    res.json({ count: Object.keys(data.bindings).length, bindings: Object.values(data.bindings) });
  });

  app.delete('/bindings/:id', requireInternal, (req, res) => {
    const data = readData(dataDir);
    if (!data.bindings[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.bindings[req.params.id];
    writeData(dataDir, data);
    res.json({ deleted: true, id: req.params.id });
  });

  // ---- Proxy routes to sub-services ----
  for (const [key, cfg] of Object.entries(SUB_SERVICES)) {
    app.use(cfg.prefix, requireInternal, proxyHandler(cfg.port, cfg.prefix));
  }

  // 404 fallback
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  return app;
}

// ---------- Bootstrap ----------
if (require.main === module) {
  const app = createApp();
  app.listen(5325, () => {
    console.log('memory-lifecycle-api listening on 5325');
  });
}

module.exports = { createApp, SUB_SERVICES };