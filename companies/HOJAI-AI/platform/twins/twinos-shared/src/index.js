/**
 * @rtmn/twinos-shared v2.0.0
 *
 * Shared utilities for RTMN TwinOS services. Provides a single import
 * surface for authentication, security, validation, rate limiting,
 * error handling, structured logging, and baseline Express hardening.
 *
 * Exports:
 *   - requireAuth              JWT authentication middleware
 *   - preventPrototypePollution Security middleware against __proto__ attacks
 *   - errorHandler             Consistent JSON error responses
 *   - defaultLimiter           100 req/min per IP
 *   - strictLimiter            20 req/min per IP
 *   - logger                   Structured JSON logger (no external deps)
 *   - validateInput            Express middleware factory for body/params/query checks
 *   - corsOptions              Default CORS configuration
 *   - helmetConfig             Default Helmet configuration
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import express from 'express';

import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const VERSION = '2.0.0';
export const SERVICE_NAME = '@rtmn/twinos-shared';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { throw new Error('FATAL: JWT_SECRET must be set in production (NODE_ENV=production). Refusing to start with default secret.'); })()
  : 'rtmn-twin-dev-secret-only-not-for-production');
const JWT_ISSUER = process.env.JWT_ISSUER || 'rtmn-twinos';
const DEFAULT_JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// ---------------------------------------------------------------------------
// logger  - structured JSON logger (no winston dependency)
// ---------------------------------------------------------------------------

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function shouldLog(level) {
  return (LEVELS[level] ?? LEVELS.info) <= (LEVELS[LOG_LEVEL] ?? LEVELS.info);
}

function emit(level, message, meta) {
  if (!shouldLog(level)) return;
  const record = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    message,
    ...(meta && typeof meta === 'object' ? meta : {})
  };
  // Errors go to stderr; everything else to stdout. Tests capture both.
  const line = JSON.stringify(record);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export const logger = {
  error: (msg, meta) => emit('error', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  info: (msg, meta) => emit('info', msg, meta),
  debug: (msg, meta) => emit('debug', msg, meta),
  child: (bindings) => ({
    error: (msg, meta) => emit('error', msg, { ...bindings, ...meta }),
    warn: (msg, meta) => emit('warn', msg, { ...bindings, ...meta }),
    info: (msg, meta) => emit('info', msg, { ...bindings, ...meta }),
    debug: (msg, meta) => emit('debug', msg, { ...bindings, ...meta })
  })
};

// ---------------------------------------------------------------------------
// requireAuth  - JWT authentication middleware
// ---------------------------------------------------------------------------

export function requireAuth(...args) {
  // Polymorphic: supports `requireAuth({...})` factory form AND
  // direct middleware form `requireAuth(req, res, next)`.
  const isDirectCall = args.length === 3 &&
    typeof args[0] === 'object' &&
    args[0] !== null &&
    typeof args[1] === 'object' &&
    typeof args[2] === 'function';
  if (isDirectCall) {
    return _runRequireAuth({}, args[0], args[1], args[2]);
  }
  const options = (args[0] && typeof args[0] === 'object') ? args[0] : {};
  return function requireAuthMiddleware(req, res, next) {
    return _runRequireAuth(options, req, res, next);
  };
}

function _runRequireAuth(options, req, res, next) {
  const { secret = JWT_SECRET, issuer = JWT_ISSUER } = options;
  const header = req.headers && req.headers.authorization;

  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Empty token' }
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret, { issuer });
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    const message = err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
    return res.status(401).json({
      success: false,
      error: { code, message }
    });
  }

  if (decoded.type && decoded.type !== 'access') {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN_TYPE', message: 'Invalid token type' }
    });
  }

  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    businessId: decoded.businessId
  };
  next();
}

// ---------------------------------------------------------------------------
// generateTokens  - issue access + refresh JWTs compatible with requireAuth
// ---------------------------------------------------------------------------

/** Sign a JWT with the standard claims (`sub`, `email`, `role`, `businessId`, `type`). */
export function signToken(payload, options = {}) {
  const { secret = JWT_SECRET, issuer = JWT_ISSUER, expiresIn = DEFAULT_JWT_EXPIRES_IN, type = 'access' } = options;
  return jwt.sign(
    { ...payload, type },
    secret,
    { issuer, expiresIn }
  );
}

/** Verify a JWT and return the decoded payload, or throw. */
export function verifyJwt(token, options = {}) {
  const { secret = JWT_SECRET, issuer = JWT_ISSUER } = options;
  return jwt.verify(token, secret, { issuer });
}

/** Issue an access/refresh token pair. */
export function generateTokens(user, options = {}) {
  const { expiresIn = DEFAULT_JWT_EXPIRES_IN } = options;
  const baseClaims = {
    sub: user.id || user.sub,
    email: user.email,
    role: user.role,
    businessId: user.businessId
  };
  return {
    accessToken: signToken(baseClaims, { ...options, expiresIn, type: 'access' }),
    refreshToken: signToken({ ...baseClaims, sub: baseClaims.sub }, { ...options, expiresIn: '7d', type: 'refresh' }),
    expiresIn
  };
}

// ---------------------------------------------------------------------------
// preventPrototypePollution  - strips __proto__, constructor, prototype keys
// ---------------------------------------------------------------------------

const POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      if (POLLUTION_KEYS.has(key)) continue;
      out[key] = clean(value[key]);
    }
    return out;
  }
  return value;
}

export function preventPrototypePollution(...args) {
  // Polymorphic:
  //   - preventPrototypePollution(req, res, next) -> middleware form
  //   - preventPrototypePollution(obj) -> returns sanitized copy (legacy v1)
  //   - preventPrototypePollution(obj, ...rest) -> ditto
  if (args.length === 3 &&
      typeof args[0] === 'object' && args[0] !== null &&
      typeof args[1] === 'object' && args[1] !== null &&
      typeof args[2] === 'function' &&
      // Distinguish from legacy "single object" form: in legacy form, only 1 arg
      // We treat the 3-arg call as middleware if args[1] looks like a response
      // (has res.status / res.json / res.send). Otherwise fall through to legacy.
      (typeof args[1].status === 'function' || typeof args[1].json === 'function')) {
    const [req, res, next] = args;
    if (req.body && typeof req.body === 'object') req.body = clean(req.body);
    if (req.params && typeof req.params === 'object') req.params = clean(req.params);
    if (req.query && typeof req.query === 'object') req.query = clean(req.query);
    return next();
  }
  // Legacy form: sanitize and return the cleaned object
  return clean(args[0]);
}

// ---------------------------------------------------------------------------
// errorHandler  - consistent JSON error responses
// ---------------------------------------------------------------------------

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let statusCode = err && err.statusCode ? err.statusCode : 500;
  let code = err && err.code ? err.code : 'INTERNAL_ERROR';
  let message = err && err.message ? err.message : 'An unexpected error occurred';
  let details = err && err.details ? err.details : undefined;

  if (err && err.name === 'JsonWebTokenError') {
    statusCode = 401; code = 'INVALID_TOKEN'; message = 'Invalid token';
  } else if (err && err.name === 'TokenExpiredError') {
    statusCode = 401; code = 'TOKEN_EXPIRED'; message = 'Token has expired';
  } else if (err && err.name === 'ValidationError') {
    statusCode = 400; code = 'VALIDATION_ERROR';
  }

  const errorId = uuidv4();
  const logMeta = {
    errorId,
    method: req && req.method,
    path: req && req.path,
    statusCode,
    code,
    message
  };

  if (statusCode >= 500) logger.error('Server error', logMeta);
  else logger.warn('Client error', logMeta);

  const body = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV !== 'production' ? { errorId } : {})
    }
  };
  res.status(statusCode).json(body);
}

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

const rateLimitHandler = (req, res, next, options) => {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: typeof options.message === 'string' ? options.message : 'Too many requests'
    }
  });
};

export const defaultLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Too many requests, please try again later'
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Too many requests, please try again later'
});

// ---------------------------------------------------------------------------
// validateInput  - tiny, dependency-free input validator
// ---------------------------------------------------------------------------

const PATTERNS = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/[^\s]+$/i
};

function runRule(value, rule) {
  if (rule === undefined) return null;
  if (typeof rule === 'function') {
    return rule(value) ? null : 'invalid';
  }
  if (typeof rule === 'object' && rule !== null) {
    if (rule.required && (value === undefined || value === null || value === '')) {
      return 'required';
    }
    if (value === undefined || value === null || value === '') return null; // optional
    if (rule.type === 'string') {
      if (typeof value !== 'string') return 'must be a string';
      if (rule.min !== undefined && value.length < rule.min) return `must be at least ${rule.min} chars`;
      if (rule.max !== undefined && value.length > rule.max) return `must be at most ${rule.max} chars`;
      if (rule.pattern && !rule.pattern.test(value)) return 'invalid format';
      if (rule.format === 'uuid' && !PATTERNS.uuid.test(value)) return 'must be a valid UUID';
      if (rule.format === 'email' && !PATTERNS.email.test(value)) return 'must be a valid email';
      if (rule.format === 'url' && !PATTERNS.url.test(value)) return 'must be a valid URL';
    } else if (rule.type === 'number') {
      const n = Number(value);
      if (!Number.isFinite(n)) return 'must be a number';
      if (rule.min !== undefined && n < rule.min) return `must be >= ${rule.min}`;
      if (rule.max !== undefined && n > rule.max) return `must be <= ${rule.max}`;
    } else if (rule.type === 'integer') {
      const n = Number(value);
      if (!Number.isInteger(n)) return 'must be an integer';
      if (rule.min !== undefined && n < rule.min) return `must be >= ${rule.min}`;
      if (rule.max !== undefined && n > rule.max) return `must be <= ${rule.max}`;
    } else if (rule.type === 'boolean') {
      if (typeof value !== 'boolean') return 'must be a boolean';
    } else if (rule.type === 'enum') {
      if (!Array.isArray(rule.values) || !rule.values.includes(value)) {
        return `must be one of: ${rule.values.join(', ')}`;
      }
    }
    return null;
  }
  return null;
}

/**
 * Build a middleware that validates req[location] against a schema.
 *   validateInput({ body: { email: { type: 'string', format: 'email', required: true } } })
 */
export function validateInput(schema) {
  return function validateInputMiddleware(req, res, next) {
    const errors = [];
    for (const location of ['body', 'params', 'query']) {
      const rules = schema[location];
      if (!rules) continue;
      const target = req[location] || {};
      for (const field of Object.keys(rules)) {
        const rule = rules[field];
        const err = runRule(target[field], rule);
        if (err) errors.push({ field: `${location}.${field}`, message: err });
      }
    }
    if (errors.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors }
      });
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// corsOptions  /  helmetConfig
// ---------------------------------------------------------------------------

export const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key']
};

export const helmetConfig = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

// ---------------------------------------------------------------------------
// Authentication variants
// ---------------------------------------------------------------------------

/** Like requireAuth but does not reject on missing/invalid token.
 *  Sets req.user when a valid token is present, otherwise leaves it unset. */
export function optionalAuth(...args) {
  const isDirectCall = args.length === 3 &&
    typeof args[0] === 'object' &&
    args[0] !== null &&
    typeof args[1] === 'object' &&
    typeof args[2] === 'function';
  if (isDirectCall) {
    return _runOptionalAuth({}, args[0], args[1], args[2]);
  }
  const options = (args[0] && typeof args[0] === 'object') ? args[0] : {};
  return function optionalAuthMiddleware(req, res, next) {
    return _runOptionalAuth(options, req, res, next);
  };
}

function _runOptionalAuth(options, req, res, next) {
  const { secret = JWT_SECRET, issuer = JWT_ISSUER } = options;
  const header = req.headers && req.headers.authorization;
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return next();
  }
  const token = header.slice(7).trim();
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, secret, { issuer });
    if (!decoded.type || decoded.type === 'access') {
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        businessId: decoded.businessId
      };
    }
  } catch { /* swallow */ }
  next();
}

/** Requires req.user.businessId to be set; otherwise 403. */
export function requireBusiness(...args) {
  // Polymorphic: `requireBusiness(req,res,next)` or as a no-op factory
  if (args.length === 3 && typeof args[1] === 'object' && typeof args[2] === 'function') {
    return _runRequireBusiness(args[0], args[1], args[2]);
  }
  return function requireBusinessMiddleware(req, res, next) {
    return _runRequireBusiness(req, res, next);
  };
}

function _runRequireBusiness(req, res, next) {
  if (!req.user || !req.user.businessId) {
    return res.status(403).json({
      success: false,
      error: { code: 'BUSINESS_REQUIRED', message: 'Business context required' }
    });
  }
  next();
}

/** Requires req.user.role to be in the allowed list. */
export function requireRole(...args) {
  // Polymorphic: `requireRole(...roles)` factory or `requireRole(req,res,next)` direct
  if (args.length === 3 && typeof args[1] === 'object' && typeof args[2] === 'function') {
    // Direct middleware call without roles: just require authentication
    return _runRequireRole([], args[0], args[1], args[2]);
  }
  const allowed = args.filter(a => typeof a === 'string');
  return function requireRoleMiddleware(req, res, next) {
    return _runRequireRole(allowed, req, res, next);
  };
}

function _runRequireRole(allowed, req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }
  if (allowed.length && !allowed.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient role' }
    });
  }
  next();
}

// ---------------------------------------------------------------------------
// Sanitization helpers
// ---------------------------------------------------------------------------

/** Strip dangerous keys from an object recursively. */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj !== 'object') return obj;
  const out = {};
  for (const k of Object.keys(obj)) {
    if (POLLUTION_KEYS.has(k)) continue;
    out[k] = sanitizeObject(obj[k]);
  }
  return out;
}

/** Trim + collapse whitespace + cap length on user-supplied search strings. */
export function sanitizeSearchInput(input, maxLen = 200) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

// ---------------------------------------------------------------------------
// asyncHandler / notFoundHandler / requestId / requestLogger
// ---------------------------------------------------------------------------

/** Wraps an async route handler so thrown errors flow into Express error middleware. */
export function asyncHandler(fn) {
  return function asyncHandlerMiddleware(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Returns 404 JSON for unmatched routes. */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }
  });
}

/** Assigns a unique request id to req.id and echoes it via X-Request-ID. */
export function requestId(req, res, next) {
  const incoming = req.headers && req.headers['x-request-id'];
  req.id = (typeof incoming === 'string' && incoming) ? incoming.slice(0, 64) : uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

/** Lightweight per-request log line. */
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info('http_request', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: ms
    });
  });
  next();
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  DEFAULT_PAGE: 1,
  MAX_LIMIT: 100,
  /** Parse pagination from req.query with safe defaults. */
  parse(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    let limit = parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT;
    if (limit < 1) limit = PAGINATION.DEFAULT_LIMIT;
    if (limit > PAGINATION.MAX_LIMIT) limit = PAGINATION.MAX_LIMIT;
    return { page, limit, offset: (page - 1) * limit };
  },
  /** Build a standard pagination envelope. */
  envelope(items, total, page, limit) {
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }
};

// ---------------------------------------------------------------------------
// authLimiter  - stricter limits for login/refresh endpoints
// ---------------------------------------------------------------------------

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Too many auth attempts, please try again later'
});

// ---------------------------------------------------------------------------
// Errors  - typed error classes for consistent error handling
// ---------------------------------------------------------------------------

export class TwinOSError extends Error {
  constructor(code, message, statusCode = 500, details = null) {
    super(message);
    this.name = 'TwinOSError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends TwinOSError {
  constructor(message, details = null) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends TwinOSError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends TwinOSError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends TwinOSError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends TwinOSError {
  constructor(message = 'Conflict') {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

export const Errors = {
  // Class constructors
  TwinOSError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  // Factory methods (throw shorthand)
  VALIDATION: (message, details = null) => new ValidationError(message, details),
  NOT_FOUND: (resource = 'Resource') => new NotFoundError(resource),
  UNAUTHORIZED: (message = 'Unauthorized') => new UnauthorizedError(message),
  FORBIDDEN: (message = 'Forbidden') => new ForbiddenError(message),
  CONFLICT: (message = 'Conflict') => new ConflictError(message)
};

// ---------------------------------------------------------------------------
// createBaseTwinApp  - scaffold a standard twin Express app
// ---------------------------------------------------------------------------

/**
 * Returns an Express app preconfigured with the standard TwinOS middleware
 * stack: helmet, cors, json body parser, requestId, requestLogger,
 * preventPrototypePollution, and the default limiter. Caller mounts
 * routes and starts the server.
 */
export function createBaseTwinApp(options = {}) {
  const {
    serviceName = 'twin-service',
    jsonLimit = '1mb'
  } = options;

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
  app.disable('x-powered-by');
  app.use(helmetConfig);
  app.use(cors(corsOptions));
  app.use(express.json({ limit: jsonLimit }));
  app.use(express.urlencoded({ extended: true, limit: jsonLimit }));
  app.use(requestId);
  app.use(requestLogger);
  app.use(preventPrototypePollution);

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: serviceName, version: VERSION });
  });

  // Default error handler
  app.use(errorHandler);

  logger.info('twin_service_initialized', { service: serviceName });
  return app;
}

// ---------------------------------------------------------------------------
// createBaseTwinService  - returns a twin service object with .create/.update/etc
// ---------------------------------------------------------------------------

/**
 * Re-export the service object factory from services/baseTwinService.js.
 * Use this when you want to build a CRUD layer over a PersistentMap / PersistentStore
 * with twin semantics (status, health, version, indexes, hooks).
 */
// Import the service version so it can be re-exported in the bottom block
import { createBaseTwinService } from './services/baseTwinService.js';
export { createBaseTwinService };

// ---------------------------------------------------------------------------
// Event publisher re-exports (named exports — see event-publisher.js for impl)
// ---------------------------------------------------------------------------

export { publish, publishAsync } from './event-publisher.js';

// ---------------------------------------------------------------------------
// Platform client re-exports (named exports — see platform-client.js for impl)
// ---------------------------------------------------------------------------

export { platform, corpid, memory, bridge, goals, skills, policy, intel } from './platform-client.js';

// ---------------------------------------------------------------------------
// Phase 5 re-exports — lifecycle, merge, SSE, and health helpers
// ---------------------------------------------------------------------------

import { lifecycleRouter, LIFECYCLE_STATUSES } from './lifecycle.js';
export { lifecycleRouter, LIFECYCLE_STATUSES };

import { mergeRouter } from './merge.js';
export { mergeRouter };

import { sseRouter, SSEHub } from './sse.js';
export { sseRouter, SSEHub };

import { installHealthRoutes, runChecks } from './health.js';
export { installHealthRoutes, runChecks };

import { installPhase5 } from './phase5.js';
export { installPhase5 };

// ---------------------------------------------------------------------------
// Default export (named exports are canonical; this is for `import x from`)
// ---------------------------------------------------------------------------

export default {
  VERSION,
  SERVICE_NAME,
  requireAuth,
  optionalAuth,
  requireBusiness,
  requireRole,
  preventPrototypePollution,
  sanitizeObject,
  sanitizeSearchInput,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  requestId,
  requestLogger,
  defaultLimiter,
  strictLimiter,
  authLimiter,
  logger,
  validateInput,
  corsOptions,
  helmetConfig,
  Errors,
  PAGINATION,
  createBaseTwinService,
  createBaseTwinApp,
  // Phase 5
  lifecycleRouter,
  LIFECYCLE_STATUSES,
  mergeRouter,
  sseRouter,
  SSEHub,
  installHealthRoutes,
  runChecks,
  installPhase5
};