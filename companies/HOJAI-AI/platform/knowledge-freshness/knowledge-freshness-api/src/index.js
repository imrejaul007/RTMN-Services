// knowledge-freshness-api (5337) — Gateway for Knowledge Freshness Layer
// - Service catalog (4 sub-services)
// - Freshness dashboard summary
// - HTTP proxy to /freshness, /staleness, /refresh, /versions

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

// ---------- Service registry ----------
const SUB_SERVICES = {
  freshness:  { name: 'freshness-tracker',      port: 5338, prefix: '/freshness' },
  staleness:  { name: 'staleness-detector',     port: 5339, prefix: '/staleness' },
  refresh:    { name: 'refresh-scheduler',      port: 5340, prefix: '/refresh' },
  versions:   { name: 'knowledge-version-graph', port: 5341, prefix: '/versions' },
};

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

function createApp(options = {}) {
  const internalToken = options.internalToken || process.env.INTERNAL_TOKEN || 'knowledge-freshness-internal-token';

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use((req, _res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      req.rawBody = JSON.stringify(req.body || {});
    }
    next();
  });

  function requireInternal(req, res, next) {
    if (req.headers['x-internal-token'] !== internalToken) return res.status(401).json({ error: 'unauthorized' });
    next();
  }

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'knowledge-freshness-api', port: 5337 }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.get('/services', requireInternal, (_req, res) => {
    res.json({ gateway: 'knowledge-freshness-api', services: SUB_SERVICES });
  });

  app.get('/services/health', requireInternal, async (_req, res) => {
    const results = {};
    for (const [key, cfg] of Object.entries(SUB_SERVICES)) {
      results[key] = await new Promise((resolve) => {
        const req2 = http.request({
          hostname: '127.0.0.1', port: cfg.port, path: '/health', method: 'GET', timeout: 1500,
        }, (r) => {
          let body = '';
          r.on('data', (c) => body += c);
          r.on('end', () => resolve({ ok: r.statusCode === 200, port: cfg.port }));
        });
        req2.on('error', (e) => resolve({ ok: false, port: cfg.port, error: e.message }));
        req2.on('timeout', () => { req2.destroy(); resolve({ ok: false, port: cfg.port, error: 'timeout' }); });
        req2.end();
      });
    }
    res.json({ gateway: 'knowledge-freshness-api', results });
  });

  // Dashboard shape (sub-services aggregate actual data)
  app.get('/dashboard', requireInternal, (_req, res) => {
    res.json({
      gateway: 'knowledge-freshness-api',
      sections: ['freshness_overview', 'stale_knowledge', 'scheduled_refreshes', 'recent_versions'],
    });
  });

  for (const [key, cfg] of Object.entries(SUB_SERVICES)) {
    app.use(cfg.prefix, requireInternal, proxyHandler(cfg.port));
  }

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(5337, () => console.log('knowledge-freshness-api listening on 5337'));
}

module.exports = { createApp, SUB_SERVICES };