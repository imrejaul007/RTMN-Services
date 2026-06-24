// aiops-api (5331) — Gateway for AIOps / Incident Management Platform
// - Service catalog (5 sub-services)
// - Dashboard summary endpoint
// - Health probes across all backend services
// - HTTP proxy to /incidents, /runbooks, /oncall, /escalations, /postmortems

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

// ---------- Service registry ----------
const SUB_SERVICES = {
  incidents:   { name: 'incident-detector',   port: 5332, prefix: '/incidents' },
  runbooks:    { name: 'runbook-engine',      port: 5333, prefix: '/runbooks' },
  oncall:      { name: 'oncall-rotation',     port: 5334, prefix: '/oncall' },
  escalations: { name: 'escalation-engine',   port: 5335, prefix: '/escalations' },
  postmortems: { name: 'postmortem-service',  port: 5336, prefix: '/postmortems' },
};

// ---------- Storage (dashboard cache) ----------
function readData(dataDir) {
  const file = path.join(dataDir, 'dashboard.json');
  if (!fs.existsSync(file)) {
    const seed = { pinned: {}, preferences: {} };
    fs.writeFileSync(file, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeData(dataDir, data) {
  const file = path.join(dataDir, 'dashboard.json');
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
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
        res.status(upRes.statusCode || 502);
        res.setHeader('Content-Type', upRes.headers['content-type'] || 'application/json');
        res.end(chunks || '');
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

function proxyHandler(port) {
  return async (req, res) => {
    const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
      ? (req.rawBody || JSON.stringify(req.body || {}))
      : null;
    await proxyRequest(port, req, res, body);
  };
}

// ---------- App factory ----------
function createApp(options = {}) {
  const dataDir = options.dataDir || process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const internalToken = options.internalToken || process.env.INTERNAL_TOKEN || 'aiops-internal-token';

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const app = express();
  app.use(express.json({ limit: '1mb' }));
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

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'aiops-api', port: 5331 }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Service catalog
  app.get('/services', requireInternal, (_req, res) => {
    res.json({ gateway: 'aiops-api', services: SUB_SERVICES });
  });

  // Health aggregation
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
    res.json({ gateway: 'aiops-api', results });
  });

  // ---- Dashboard summary ----
  app.get('/dashboard', requireInternal, (_req, res) => {
    res.json({
      gateway: 'aiops-api',
      sections: ['active_incidents', 'recent_runbooks', 'oncall_now', 'open_postmortems'],
      note: 'Sub-services aggregate data; this endpoint provides shape & pinned items',
    });
  });

  // ---- Pin/unpin items to dashboard ----
  app.post('/pinned', requireInternal, (req, res) => {
    if (!req.body || !req.body.item_type || !req.body.item_id) {
      return res.status(400).json({ error: 'validation', message: 'item_type and item_id required' });
    }
    const data = readData(dataDir);
    const { item_type, item_id, label = '' } = req.body;
    const id = `${item_type}:${item_id}`;
    data.pinned[id] = { item_type, item_id, label, pinned_at: new Date().toISOString() };
    writeData(dataDir, data);
    res.status(201).json(data.pinned[id]);
  });

  app.get('/pinned', requireInternal, (_req, res) => {
    const data = readData(dataDir);
    res.json({ count: Object.keys(data.pinned).length, pinned: Object.values(data.pinned) });
  });

  app.delete('/pinned/:item_type/:item_id', requireInternal, (req, res) => {
    const data = readData(dataDir);
    const id = `${req.params.item_type}:${req.params.item_id}`;
    if (!data.pinned[id]) return res.status(404).json({ error: 'not_found' });
    delete data.pinned[id];
    writeData(dataDir, data);
    res.json({ deleted: true, id });
  });

  // ---- Proxy routes ----
  for (const [key, cfg] of Object.entries(SUB_SERVICES)) {
    app.use(cfg.prefix, requireInternal, proxyHandler(cfg.port));
  }

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(5331, () => console.log('aiops-api listening on 5331'));
}

module.exports = { createApp, SUB_SERVICES };