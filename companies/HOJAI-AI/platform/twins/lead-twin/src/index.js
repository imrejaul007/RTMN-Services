/**
 * RTMN Lead Twin Service v2.0
 * Lead management and tracking with digital twin capabilities
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { PersistentStore } from '@rtmn/shared/lib/persistent-store';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

// TwinOS Shared imports
import {
  requireAuth,
  optionalAuth,
  preventPrototypePollution,
  sanitizeSearchInput,
  sanitizeObject,
  defaultLimiter,
  strictLimiter,
  notFoundHandler,
  errorHandler,
  requestId,
  requestLogger,
  logger,
  installPhase5
} from '@rtmn/twinos-shared';

// Import store to initialize it before routes load
import './services/store.js';
import { leads as leadsStore, activities as activitiesStore } from './services/store.js';
import leadsRouter from './routes/leads.js';
import activitiesRouter from './routes/activities.js';

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
const PORT = process.env.PORT || 4894;
const SERVICE_NAME = 'lead-twin';

// ============ SECURITY MIDDLEWARE ============

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true
}));

// Compression
app.use(compression());

// Request ID
app.use(requestId);

// Request logging
app.use(requestLogger);

// Morgan logging with custom format
app.use(morgan((tokens, req, res) => {
  const logData = [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'),
    '-',
    tokens['response-time'](req, res),
    'ms'
  ].join(' ');

  logger.info('HTTP Request', {
    requestId: req.id,
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    responseTime: tokens['response-time'](req, res),
    userId: req.user?.id,
    ip: req.ip
  });

  return logData;
}));

// JSON body parser with size limit
app.use(express.json({ limit: '10kb' }));

// ============ RATE LIMITING ============

// Default rate limiter for general endpoints
app.use(defaultLimiter);

// Strict rate limiter for write operations
app.use('/leads', strictLimiter);
app.use('/activities', strictLimiter);

// ============ INPUT VALIDATION MIDDLEWARE ============

// Prevent prototype pollution on all JSON bodies
app.use(preventPrototypePollution);

// Sanitize search inputs
app.use((req, res, next) => {
  if (req.query.q) {
    req.query.q = sanitizeSearchInput(req.query.q);
  }
  next();
});

// ============ HEALTH ENDPOINTS ============

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: SERVICE_NAME,
    version: '2.0.0',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({
    success: true,
    ready: true,
    service: SERVICE_NAME,
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============ AUTH ROUTES ============

// Public health endpoints - no auth required
app.use('/health', (req, res, next) => next('route'));
app.use('/ready', (req, res, next) => next('route'));

// Protected routes - require authentication
app.use('/leads', requireAuth, leadsRouter);
app.use('/activities', requireAuth, activitiesRouter);

// ============ ERROR HANDLING ============

// 404 handler
// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'lead',
  store: typeof leadsStore !== 'undefined' ? leadsStore : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: leadsStore.size }),
})

app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============ SERVER STARTUP ============


;
const server = app.listen(PORT, () => {
  logger.info(`${SERVICE_NAME} v2.0.0 started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  console.log(`Lead Twin Service v2.0.0 running on port ${PORT}`);
});
installGracefulShutdown(server, phase5Cleanup);

export default app;
