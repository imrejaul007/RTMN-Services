/**
 * HOJAI AI Unified API Gateway
 *
 * Single entry point for HOJAI AI services. Routes requests to backend services,
 * handles auth, rate limiting, and service registry.
 *
 * Architecture:
 *   Client → :4500 (this) → :4702 corpid-service, :4705 twinos-hub, etc.
 *
 * Routes:
 *   /api/identity/*      → corpid-service (4702)
 *   /api/twins/*         → twinos-hub (4705)
 *   /api/memory/*        → memory-os (4703)
 *   /api/agents/*        → ai-intelligence (4881)
 *   /api/intelligence/*  → ai-intelligence (4881)
 *   /api/skills/*        → skill-marketplace (4120)
 *   /api/skill-os/*      → skill-os (4743) — the registry + runtime
 *   /api/skillos/*       → skill-os (4743) — alternate spelling
 *   /api/marketplace/*   → blr-ai-marketplace
 *   /health              → this service's health
 *   /api/services        → registry of all known HOJAI services
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';

import { createLogger } from '../../../../shared/lib/logger.js';
import { createModel } from '../../../../shared/lib/persistent-store.js';
import { errorMiddleware, asyncHandler, NotFoundError, ValidationError } from '../../../../shared/lib/errors.js';

process.env.SERVICE_NAME = 'api-gateway';
const logger = createLogger('api-gateway');

const PORT = process.env.PORT || 4500;
const TEST_MODE = process.env.NODE_ENV === 'test';

// ============ SERVICE REGISTRY ============
// Each entry: path prefix → upstream service URL
const SERVICES = {
  '/api/identity':     { url: process.env.IDENTITY_URL   || 'http://localhost:4702', name: 'corpid-service' },
  '/api/twins':        { url: process.env.TWINS_URL      || 'http://localhost:4705', name: 'twinos-hub' },
  '/api/memory':       { url: process.env.MEMORY_URL     || 'http://localhost:4703', name: 'memory-os' },
  '/api/agents':       { url: process.env.AGENTS_URL     || 'http://localhost:4881', name: 'ai-intelligence' },
  '/api/intelligence': { url: process.env.INTEL_URL      || 'http://localhost:4881', name: 'ai-intelligence' },
  '/api/skills':       { url: process.env.SKILLS_URL     || 'http://localhost:4120', name: 'skill-marketplace' },
  '/api/skill-os':     { url: process.env.SKILLOS_URL    || 'http://localhost:4743', name: 'skill-os' },
  '/api/skillos':      { url: process.env.SKILLOS_URL    || 'http://localhost:4743', name: 'skill-os' },
  '/api/prompts':      { url: process.env.PROMPTS_URL    || 'http://localhost:4130', name: 'prompt-marketplace' },
  '/api/genie':        { url: process.env.GENIE_URL      || 'http://localhost:4701', name: 'genie-gateway' },
  '/api/sutar':        { url: process.env.SUTAR_URL      || 'http://localhost:4140', name: 'sutar-gateway' },
  '/api/marketplace':  { url: process.env.MKT_URL        || 'http://localhost:4256', name: 'blr-discovery-engine' },
  '/api/acn':          { url: process.env.ACN_URL        || 'http://localhost:4800', name: 'acn-hub' },
  '/api/flow':         { url: process.env.FLOW_URL       || 'http://localhost:4244', name: 'flow-orchestrator' },
  '/api/connectors':   { url: process.env.CONNECTORS_URL || 'http://localhost:4785', name: 'connector-hub' },
};

// ============ PERSISTENT STATS ============
// Track gateway traffic for observability
const GatewayStats = createModel('GatewayStats', { key: 'id' });

// ============ APP SETUP ============

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



// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Request ID
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || `gw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-ID', req.id);
  res.setHeader('X-Gateway', 'hojai-api-gateway');
  next();
});

// Rate limiting
const defaultLimiter = TEST_MODE ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(defaultLimiter);

// ============ GATEWAY ENDPOINTS ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/ready', async (req, res) => {
  // Check upstream services
  const checks = {};
  for (const [prefix, svc] of Object.entries(SERVICES)) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 1000);
      const resp = await fetch(`${svc.url}/health`, { signal: ctrl.signal });
      clearTimeout(timeout);
      checks[svc.name] = resp.ok ? 'up' : 'down';
    } catch {
      checks[svc.name] = 'down';
    }
  }

  const allUp = Object.values(checks).every(s => s === 'up');
  res.status(allUp ? 200 : 503).json({
    status: allUp ? 'ready' : 'degraded',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    upstreamChecks: checks,
  });
});

app.get('/api/services', (req, res) => {
  const registry = Object.entries(SERVICES).map(([prefix, svc]) => ({
    pathPrefix: prefix,
    upstream: svc.url,
    serviceName: svc.name,
  }));
  res.json({
    success: true,
    service: 'api-gateway',
    count: registry.length,
    services: registry,
  });
});

app.get('/api/stats', asyncHandler(async (req, res) => {
  const all = await GatewayStats.find();
  res.json({
    success: true,
    totalRequests: all.length,
    recent: all.slice(-50),
  });
}));

// ============ PROXY ROUTES ============

// Helper: log each proxied request
function makeProxy(prefix, upstream, serviceName) {
  return createProxyMiddleware({
    target: upstream,
    changeOrigin: true,
    pathRewrite: (path) => path.replace(new RegExp(`^${prefix}`), ''),
    onProxyReq: (proxyReq, req) => {
      // Propagate request ID
      if (req.id) proxyReq.setHeader('X-Request-ID', req.id);
      logger.info({
        requestId: req.id,
        method: req.method,
        path: req.path,
        target: serviceName,
      }, 'Proxying request');

      // Record stats (fire and forget)
      GatewayStats.create({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        requestId: req.id,
        method: req.method,
        path: req.path,
        service: serviceName,
        timestamp: new Date().toISOString(),
      }).catch((err) => logger.error({ err }, 'Failed to record stats'));
    },
    onProxyRes: (proxyRes, req) => {
      logger.info({
        requestId: req.id,
        status: proxyRes.statusCode,
        path: req.path,
      }, 'Upstream response');
    },
    onError: (err, req, res) => {
      logger.error({ err: err.message, requestId: req.id, path: req.path }, 'Proxy error');
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: {
            code: 'UPSTREAM_ERROR',
            message: `Failed to reach ${serviceName}`,
            details: err.message,
          },
        });
      }
    },
  });
}

// Register proxies for each service
for (const [prefix, svc] of Object.entries(SERVICES)) {
  app.use(prefix, makeProxy(prefix, svc.url, svc.name));
}

// ============ 404 + ERROR HANDLERS ============

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `No service routes '${req.method} ${req.path}'`,
      hint: 'GET /api/services for the registry',
    },
  });
});

app.use(errorMiddleware(logger));

// ============ START SERVER ============

export async function startServer(port = PORT) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(`🚪 HOJAI AI API Gateway v1.0.0 running on port ${port}`);
      logger.info(`📋 ${Object.keys(SERVICES).length} services registered`);
      resolve(server);
    });
    installGracefulShutdown(server);
    server.on('error', reject);
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  startServer().catch((err) => {
    logger.error({ err }, 'Failed to start api-gateway');
    process.exit(1);
  });
}

export default app;
