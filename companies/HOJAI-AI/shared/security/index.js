/**
 * RTMN Shared Security Middleware (ESM)
 *
 * Canonical security setup for all SUTAR / HOJAI-AI services. Importing
 * `setupSecurity(app, options)` applies:
 *
 *   - helmet() with strict defaults
 *   - cors() with explicit origin allowlist (no wildcard)
 *   - express.json with hard 1 MB cap
 *   - rate limiting: global defaultLimiter (100/min/IP) + strictLimiter (20/min/IP)
 *     (both can be applied per-route via the exported handlers)
 *   - prototype-pollution guard
 *   - structured request logger
 *
 * ESM. Mirror lives in ./index.cjs for CJS services.
 *
 * Usage:
 *
 *   import express from 'express';
 *   import { setupSecurity, strictLimiter, requireAuth } from '@rtmn/shared/security';
 *   import { requireAuth } from '@rtmn/shared/auth';
 *
 *   const app = express();

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

 *   setupSecurity(app, {
 *     serviceName: 'acn-hub',
 *     corsOrigins: ['http://localhost:4399', 'http://localhost:3000'],
 *   });
 *
 *   app.post('/api/expensive', requireAuth, strictLimiter, handler);
 */

import helmet from 'helmet';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

// ---------------------------------------------------------------------------
// Defaults — override per-service via setupSecurity() options
// ---------------------------------------------------------------------------

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:4399', // RTMN Unified Hub
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173', // Vite / React dev
  'http://localhost:8080',
];

const DEFAULT_JSON_LIMIT = '1mb';

// 100 requests/min/IP for general traffic
export const defaultLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' },
  },
});

// 20 requests/min/IP for write / expensive routes
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Slow down — rate limit hit.' },
  },
});

// ---------------------------------------------------------------------------
// Prototype-pollution guard for req.body (basic, dependency-free)
// ---------------------------------------------------------------------------

export function preventPrototypePollution(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  // Drop __proto__, constructor, prototype keys
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      delete obj[key];
      continue;
    }
    obj[key] = preventPrototypePollution(obj[key]);
  }
  return obj;
}

export function sanitiseBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    preventPrototypePollution(req.body);
  }
  next();
}

// ---------------------------------------------------------------------------
// Setup helper
// ---------------------------------------------------------------------------

/**
 * Apply the standard RTMN security stack to an Express app.
 *
 * @param {import('express').Express} app
 * @param {object}  options
 * @param {string}  options.serviceName    Used in logs / metrics
 * @param {string[]} [options.corsOrigins] Allowed CORS origins
 * @param {string}  [options.jsonLimit]    JSON body cap (default '1mb')
 * @param {boolean} [options.applyRateLimit] If true, applies defaultLimiter to all routes
 */
export function setupSecurity(app, options = {}) {
  const {
    serviceName = 'sutar-service',
    corsOrigins = DEFAULT_CORS_ORIGINS,
    jsonLimit = DEFAULT_JSON_LIMIT,
    applyRateLimit = true,
  } = options;

  // 1. Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // services don't serve HTML
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS — explicit allowlist (never wildcard for credentialed routes)
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow same-origin / curl (no Origin header)
        if (!origin) return cb(null, true);
        if (corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-Id'],
      maxAge: 600,
    })
  );

  // 3. Body parsers with strict limits
  app.use(express.json({ limit: jsonLimit }));
  app.use(express.urlencoded({ extended: false, limit: jsonLimit }));

  // 4. Prototype-pollution guard
  app.use(sanitiseBody);

  // 5. Structured request logger
  app.use(
    morgan('combined', {
      stream: { write: (msg) => console.log(`[${serviceName}] ${msg.trim()}`) },
    })
  );

  // 6. Rate limit (skip in test)
  if (applyRateLimit && process.env.NODE_ENV !== 'test') {
    app.use(defaultLimiter);
  }
}

export const __testing__ = { DEFAULT_CORS_ORIGINS, DEFAULT_JSON_LIMIT };