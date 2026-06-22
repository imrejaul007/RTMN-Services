/**
 * RTMN CorpID - Universal Identity Service v2.0
 *
 * A comprehensive identity service with:
 * - JWT-based authentication
 * - Role-based access control
 * - Business/organization scoping
 * - Rate limiting
 * - Input validation & sanitization
 * - Security headers
 *
 * @author HOJAI AI
 * @version 2.0.0
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ============ CONFIGURATION ============

const PORT = process.env.PORT || 4702;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';
const TOKEN_ISSUER = 'rtmn-corpid';
const BCRYPT_ROUNDS = 12;

// ============ LOGGER ============

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  defaultMeta: { service: 'corpID' },
  transports: [new winston.transports.Console()]
});

// ============ IN-MEMORY STORAGE ============

const users = new PersistentMap('users', { serviceName: 'corpid-service' });
const businesses = new PersistentMap('businesses', { serviceName: 'corpid-service' });
const sessions = new PersistentMap('sessions', { serviceName: 'corpid-service' });
const refreshTokens = new PersistentMap('refresh-tokens', { serviceName: 'corpid-service' });
const apiKeys = new PersistentMap('api-keys', { serviceName: 'corpid-service' });
const trustScores = new PersistentMap('trust-scores', { serviceName: 'corpid-service' });    // corpId -> { score, level, lastUpdated, history[] }
const namespaces = new PersistentMap('namespaces', { serviceName: 'corpid-service' });     // namespace -> { owner, businessId, createdAt }

// ============ SECURITY POLICY ============
// SECURITY FIX (HOJAI L-5): exponential backoff account lockout. After
// MAX_FAILED_LOGINS consecutive failures, the account is locked for
// LOCKOUT_DURATION_MS. Each subsequent failure during a lockout doubles the
// remaining lockout time (capped at MAX_LOCKOUT_MS). A successful login resets
// the counter.
const MAX_FAILED_LOGINS = parseInt(process.env.MAX_FAILED_LOGINS || '5', 10);
const LOCKOUT_DURATION_MS = parseInt(process.env.LOCKOUT_DURATION_MS || String(15 * 60 * 1000), 10); // 15min
const MAX_LOCKOUT_MS = parseInt(process.env.MAX_LOCKOUT_MS || String(24 * 60 * 60 * 1000), 10);     // 24h

// ============ DEFAULT DATA ============

// Initialize with default business and user
const now = new Date().toISOString();
businesses.set('RTMN-HQ', {
  id: 'RTMN-HQ',
  name: 'RTMN Headquarters',
  industry: 'technology',
  plan: 'enterprise',
  status: 'active',
  createdAt: now,
  updatedAt: now
});

users.set('admin@rtmn.com', {
  id: 'user-admin-001',
  email: 'admin@rtmn.com',
  // SECURITY FIX (CORPID project-wide): the prior seed included a literal
  // hardcoded admin password. Replaced with a randomly generated bcrypt hash
  // computed at module load; operators must use the BOOTSTRAP_ADMIN_EMAIL
  // flow documented in README to set the initial password.
  passwordHash: require('bcrypt').hashSync(require('crypto').randomBytes(24).toString('base64url'), 12),
  name: 'Admin User',
  role: 'superadmin',
  businessId: 'RTMN-HQ',
  status: 'active',
  createdAt: now,
  updatedAt: now
});

// ============ EXPRESS APP ============

const app = express();


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
// ============ SECURITY MIDDLEWARE ============

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      // SECURITY FIX (HOJAI L-3): previously allowed any HTTPS host as an image
      // source, which enables tracking pixels from arbitrary domains. Restrict
      // to a known allowlist that can be extended via IMG_SRC env var.
      imgSrc: (() => {
        const envExtra = process.env.IMG_SRC;
        const base = ["'self'", 'data:'];
        if (!envExtra) return [...base, 'https://*.rtmn.com', 'https://*.rez.money'];
        return [...base, ...envExtra.split(',').map(s => s.trim()).filter(Boolean)];
      })(),
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS - Configurable origin
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Compression
app.use(compression());

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));

// Request ID
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ============ RATE LIMITERS ============

// Auth rate limiter - strict for login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many auth attempts, please try again later' }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

// Default rate limiter - general API
const defaultLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many requests, please slow down' }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter - sensitive operations
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded' }
  }
});

app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/ready') return next();
  return defaultLimiter(req, res, next);
});

// ============ VALIDATION HELPERS ============

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      }
    });
  }
  next();
}

// Prototype pollution prevention
function sanitizeInput(obj) {
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!dangerous.includes(key)) {
      sanitized[key] = typeof value === 'object' && value !== null
        ? sanitizeInput(value)
        : value;
    }
  }
  return sanitized;
}

// ============ AUTH HELPERS ============

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      type: 'access'
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: TOKEN_ISSUER,
      jwtid: uuidv4()
    }
  );
}

function generateRefreshToken(user) {
  const token = jwt.sign(
    { sub: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN, issuer: TOKEN_ISSUER }
  );

  refreshTokens.set(token, {
    userId: user.id,
    email: user.email,
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
  });

  return token;
}

function generateTokens(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
    expiresIn: JWT_EXPIRES_IN,
    tokenType: 'Bearer'
  };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: TOKEN_ISSUER });
  } catch (error) {
    return null;
  }
}

// ============ AUTH MIDDLEWARE ============

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    });
  }

  if (decoded.type !== 'access') {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN_TYPE', message: 'Invalid token type' }
    });
  }

  // Attach user info to request
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    businessId: decoded.businessId
  };

  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Required role: ${allowedRoles.join(' or ')}` }
      });
    }

    next();
  };
}

function requireBusiness(businessIdParam = 'businessId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    // Admins can access any business
    if (['superadmin', 'admin'].includes(req.user.role)) {
      return next();
    }

    const requestedBusiness = req.params[businessIdParam] ||
                              req.body[businessIdParam] ||
                              req.query[businessIdParam];

    if (requestedBusiness && requestedBusiness !== req.user.businessId) {
      return res.status(403).json({
        success: false,
        error: { code: 'BUSINESS_SCOPE', message: 'Access denied to this business' }
      });
    }

    next();
  };
}

// ============ ERROR HANDLING ============

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }
  });
}

function errorHandler(err, req, res, next) {
  const errorId = uuidv4();

  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  }

  if (statusCode >= 500) {
    logger.error('Server error', { errorId, method: req.method, path: req.path, error: err });
  } else if (statusCode >= 400) {
    logger.warn('Client error', { errorId, method: req.method, path: req.path, statusCode });
  }

  res.status(statusCode).json({
    success: false,
    // SECURITY FIX (HOJAI L-1): only include errorId in true local dev so it
    // never leaks in non-production deployments (staging, preview, demo).
    // Set ALLOW_ERROR_ID=1 explicitly to opt back in for debugging.
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && process.env.ALLOW_ERROR_ID !== '0' && { errorId })
    }
  });
}

// ============ VALIDATION SCHEMAS ============

const authValidation = {
  register: [
    body('email').trim().isEmail().normalizeEmail()
      .withMessage('Valid email is required'),
    body('password').isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('name').trim().isLength({ min: 1, max: 100 })
      .withMessage('Name is required (1-100 characters)'),
    body('businessId').trim().isLength({ min: 2, max: 50 })
      .withMessage('Business ID is required (2-50 characters)')
      .matches(/^[a-zA-Z0-9-_]+$/)
      .withMessage('Business ID must be alphanumeric with hyphens/underscores'),
    body('businessName').optional().trim().isLength({ max: 200 }),
    body('role').optional().isIn(['owner', 'admin', 'manager', 'user'])
      .withMessage('Invalid role'),
    validate
  ],

  login: [
    body('email').trim().isEmail().normalizeEmail()
      .withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],

  refresh: [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    validate
  ],

  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    validate
  ]
};

const userValidation = {
  create: [
    body('email').trim().isEmail().normalizeEmail()
      .withMessage('Valid email is required'),
    body('password').isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('name').trim().isLength({ min: 1, max: 100 })
      .withMessage('Name is required'),
    body('role').optional().isIn(['admin', 'manager', 'user', 'customer'])
      .withMessage('Invalid role'),
    body('businessId').optional().trim().isLength({ min: 2, max: 50 }),
    validate
  ],

  update: [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('role').optional().isIn(['admin', 'manager', 'user', 'customer']),
    body('status').optional().isIn(['active', 'inactive', 'suspended']),
    body('preferences').optional().isObject(),
    validate
  ],

  list: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('role').optional().isIn(['superadmin', 'admin', 'manager', 'user', 'customer']),
    query('status').optional().isIn(['active', 'inactive', 'suspended']),
    query('businessId').optional().trim(),
    validate
  ]
};

// ============ HEALTH ENDPOINTS ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'corpID',
    version: '2.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      users: users.size,
      businesses: businesses.size,
      activeSessions: refreshTokens.size
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    service: 'corpID',
    timestamp: new Date().toISOString()
  });
});

// ============ AUTH ROUTES ============

/**
 * POST /auth/register
 * Register new user and business
 */
app.post('/auth/register', authLimiter, authValidation.register, async (req, res, next) => {
  try {
    const { email, password, name, businessId, businessName, role = 'owner' } = sanitizeInput(req.body);

    // Check if user exists
    // SECURITY FIX (HOJAI L-4): unify USER_EXISTS and BUSINESS_EXISTS responses
    // so an attacker cannot enumerate which emails or business IDs are
    // already registered. Both error paths now return the same generic
    // REGISTRATION_FAILED with the same status code. The actual reason is
    // logged server-side for operators.
    if (users.has(email.toLowerCase()) || businesses.has(businessId)) {
      const reason = users.has(email.toLowerCase()) ? 'user_exists' : 'business_exists';
      logger.warn('Registration rejected', { reason, email: email.toLowerCase(), businessId });
      return res.status(409).json({
        success: false,
        error: { code: 'REGISTRATION_FAILED', message: 'Registration failed. Please verify your details and try again.' }
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create business
    const now = new Date().toISOString();
    businesses.set(businessId, {
      id: businessId,
      name: businessName || businessId,
      industry: req.body.industry || 'general',
      plan: req.body.plan || 'starter',
      status: 'active',
      createdAt: now,
      updatedAt: now
    });

    // Create user
    const userId = `user-${uuidv4().slice(0, 8)}`;
    const user = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
      businessId,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    users.set(email.toLowerCase(), user);

    // Generate tokens
    const tokens = generateTokens(user);

    logger.info('User registered', { userId, businessId, email: user.email });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
app.post('/auth/login', authLimiter, authValidation.login, async (req, res, next) => {
  try {
    const { email, password } = sanitizeInput(req.body);

    const user = users.get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    // SECURITY FIX (HOJAI L-5): check account lockout before password verify.
    // If the account is currently locked, return 423 Locked with the remaining
    // time so legitimate users can wait it out. We do NOT reveal whether the
    // account exists to the caller (uniform INVALID_CREDENTIALS).
    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      const retryAfterSec = Math.ceil((new Date(user.lockoutUntil) - new Date()) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(423).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: 'Account temporarily locked due to repeated failed attempts. Try again later.',
          retryAfter: retryAfterSec
        }
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'Account is not active' }
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      // SECURITY FIX (HOJAI L-5): increment failed-login counter. Once the
      // counter reaches MAX_FAILED_LOGINS, lock the account for
      // LOCKOUT_DURATION_MS. Each subsequent failure during a lockout
      // doubles the remaining time (capped at MAX_LOCKOUT_MS).
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
        const prev = user.lockoutUntil ? Math.max(0, new Date(user.lockoutUntil) - Date.now()) : 0;
        const next = Math.min(MAX_LOCKOUT_MS, prev > 0 ? prev * 2 : LOCKOUT_DURATION_MS);
        user.lockoutUntil = new Date(Date.now() + next).toISOString();
        logger.warn('Account locked due to repeated failed logins', {
          userId: user.id,
          email: user.email,
          failedCount: user.failedLoginCount,
          lockoutMs: next,
          lockoutUntil: user.lockoutUntil
        });
      }
      users.set(user.email, user);
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    // SECURITY FIX (HOJAI L-5): reset counter on successful login.
    if (user.failedLoginCount || user.lockoutUntil) {
      user.failedLoginCount = 0;
      delete user.lockoutUntil;
      users.set(user.email, user);
    }

    const tokens = generateTokens(user);

    logger.info('User logged in', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'Login successful',
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
app.post('/auth/refresh', authLimiter, authValidation.refresh, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyToken(refreshToken);

    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' }
      });
    }

    // Check if token is in store
    const tokenData = refreshTokens.get(refreshToken);

    if (!tokenData || tokenData.expiresAt < Date.now()) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({
        success: false,
        error: { code: 'EXPIRED_REFRESH_TOKEN', message: 'Refresh token expired or revoked' }
      });
    }

    // Get user
    const user = Array.from(users.values()).find(u => u.id === decoded.sub);

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found or inactive' }
      });
    }

    // Revoke old refresh token
    refreshTokens.delete(refreshToken);

    // Generate new tokens
    const tokens = generateTokens(user);

    logger.info('Token refreshed', { userId: user.id });

    res.json({
      success: true,
      ...tokens
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/logout
 * Logout and revoke session
 */
app.post('/auth/logout', requireAuth, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }

    logger.info('User logged out', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
app.get('/auth/me', requireAuth, (req, res) => {
  const user = users.get(req.user.email);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  const business = businesses.get(user.businessId);

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId,
      businessName: business?.name,
      status: user.status,
      createdAt: user.createdAt
    }
  });
});

// ============ USER MANAGEMENT ROUTES ============

/**
 * GET /api/users
 * List all users (admin only or business-scoped)
 */
app.get('/api/users', requireAuth, requireRole('superadmin', 'admin'), userValidation.list, (req, res) => {
  let userList = Array.from(users.values());

  // Filter by business scope
  if (!['superadmin'].includes(req.user.role)) {
    userList = userList.filter(u => u.businessId === req.user.businessId);
  }

  // Apply filters
  if (req.query.role) {
    userList = userList.filter(u => u.role === req.query.role);
  }
  if (req.query.status) {
    userList = userList.filter(u => u.status === req.query.status);
  }
  if (req.query.businessId) {
    userList = userList.filter(u => u.businessId === req.query.businessId);
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const start = (page - 1) * limit;
  const paginatedUsers = userList.slice(start, start + limit);

  // Remove password hashes
  const safeUsers = paginatedUsers.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    businessId: u.businessId,
    status: u.status,
    createdAt: u.createdAt
  }));

  res.json({
    success: true,
    count: userList.length,
    page,
    limit,
    totalPages: Math.ceil(userList.length / limit),
    users: safeUsers
  });
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
app.get('/api/users/:id', requireAuth, (req, res) => {
  const targetUser = Array.from(users.values()).find(u => u.id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  // Business scope check
  if (!['superadmin', 'admin'].includes(req.user.role) &&
      targetUser.businessId !== req.user.businessId) {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied to this user' }
    });
  }

  const business = businesses.get(targetUser.businessId);

  res.json({
    success: true,
    user: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      businessId: targetUser.businessId,
      businessName: business?.name,
      status: targetUser.status,
      createdAt: targetUser.createdAt,
      updatedAt: targetUser.updatedAt
    }
  });
});

/**
 * POST /api/users
 * Create new user (admin only)
 */
app.post('/api/users', requireAuth, requireRole('superadmin', 'admin', 'manager'), strictLimiter, userValidation.create, async (req, res, next) => {
  try {
    const { email, password, name, role = 'user', businessId } = sanitizeInput(req.body);

    // Determine business ID
    const targetBusinessId = businessId || req.user.businessId;

    // Business scope check
    if (!['superadmin', 'admin'].includes(req.user.role) && targetBusinessId !== req.user.businessId) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Cannot create user for another business' }
      });
    }

    // Check if user exists
    // SECURITY FIX (HOJAI L-4): use generic REGISTRATION_FAILED here too, even
    // though this endpoint is admin-gated — keeps the response shape uniform
    // across all user-creation paths so any logging/SIEM rules are consistent.
    if (users.has(email.toLowerCase())) {
      return res.status(409).json({
        success: false,
        error: { code: 'REGISTRATION_FAILED', message: 'User could not be created. Verify the email is not already in use.' }
      });
    }

    // Check if business exists
    if (!businesses.has(targetBusinessId)) {
      return res.status(404).json({
        success: false,
        error: { code: 'BUSINESS_NOT_FOUND', message: 'Business not found' }
      });
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const userId = `user-${uuidv4().slice(0, 8)}`;

    const user = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
      businessId: targetBusinessId,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    users.set(email.toLowerCase(), user);

    logger.info('User created', { userId, createdBy: req.user.id });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/:id
 * Update user details
 *
 * SECURITY NOTE (HOJAI L-2): This endpoint intentionally does NOT accept
 * a `password` field. Password changes MUST go through:
 *   PUT /api/profile/password
 * which requires the current password, applies bcrypt-12 hash, and logs
 * the change. Any `password` field in the request body is silently dropped
 * (and the attempt is logged).
 */
app.put('/api/users/:id', requireAuth, strictLimiter, userValidation.update, async (req, res, next) => {
  try {
    const targetUser = Array.from(users.values()).find(u => u.id === req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    // Business scope check
    if (!['superadmin', 'admin'].includes(req.user.role) &&
        targetUser.businessId !== req.user.businessId) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied to this user' }
      });
    }

    // Role change restrictions
    if (req.body.role && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Only admins can change roles' }
      });
    }

    // Update allowed fields
    // SECURITY FIX (HOJAI L-2): explicitly destructure-and-drop any `password`
    // field. This documents the invariant and logs attempts in case a future
    // refactor accidentally re-exposes the field.
    const rawBody = sanitizeInput(req.body);
    if (rawBody.password !== undefined) {
      logger.warn('Ignored password field on user update', {
        targetUserId: targetUser.id,
        attemptedBy: req.user.id
      });
    }
    const { name, role, status, preferences, password: _dropped } = rawBody;
    void _dropped;

    if (name) targetUser.name = name;
    if (role && ['superadmin', 'admin'].includes(req.user.role)) targetUser.role = role;
    if (status && ['superadmin', 'admin'].includes(req.user.role)) targetUser.status = status;
    if (preferences) targetUser.preferences = { ...targetUser.preferences, ...preferences };
    targetUser.updatedAt = new Date().toISOString();

    // Update in map
    users.set(targetUser.email, targetUser);

    logger.info('User updated', { userId: targetUser.id, updatedBy: req.user.id });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        businessId: targetUser.businessId,
        status: targetUser.status,
        updatedAt: targetUser.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
app.delete('/api/users/:id', requireAuth, requireRole('superadmin', 'admin'), (req, res, next) => {
  try {
    const targetUser = Array.from(users.values()).find(u => u.id === req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    // Prevent self-deletion
    if (targetUser.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_DELETE_SELF', message: 'Cannot delete your own account' }
      });
    }

    // Business scope check
    if (!['superadmin'].includes(req.user.role) &&
        targetUser.businessId !== req.user.businessId) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied to this user' }
      });
    }

    users.delete(targetUser.email);

    logger.info('User deleted', { userId: targetUser.id, deletedBy: req.user.id });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ============ BUSINESS ROUTES ============

/**
 * GET /api/businesses
 * List all businesses (admin only)
 */
app.get('/api/businesses', requireAuth, requireRole('superadmin', 'admin'), (req, res) => {
  let businessList = Array.from(businesses.values());

  // Filter by status
  if (req.query.status) {
    businessList = businessList.filter(b => b.status === req.query.status);
  }

  res.json({
    success: true,
    count: businessList.length,
    businesses: businessList
  });
});

/**
 * GET /api/businesses/:id
 * Get business details
 */
app.get('/api/businesses/:id', requireAuth, requireBusiness('id'), (req, res) => {
  const business = businesses.get(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      error: { code: 'BUSINESS_NOT_FOUND', message: 'Business not found' }
    });
  }

  // Count users in business
  const userCount = Array.from(users.values()).filter(u => u.businessId === business.id).length;

  res.json({
    success: true,
    business: {
      ...business,
      userCount
    }
  });
});

// ============ PROFILE ROUTES ============

/**
 * GET /api/profile
 * Get own profile
 */
app.get('/api/profile', requireAuth, (req, res) => {
  const user = users.get(req.user.email);
  const business = businesses.get(req.user.businessId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  res.json({
    success: true,
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId,
      businessName: business?.name,
      businessPlan: business?.plan,
      status: user.status,
      preferences: user.preferences || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
});

/**
 * PUT /api/profile
 * Update own profile
 */
app.put('/api/profile', requireAuth, strictLimiter, [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('preferences').optional().isObject(),
  validate
], async (req, res, next) => {
  try {
    const user = users.get(req.user.email);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    const { name, preferences } = sanitizeInput(req.body);

    if (name) user.name = name;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    user.updatedAt = new Date().toISOString();

    users.set(user.email, user);

    logger.info('Profile updated', { userId: user.id });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferences: user.preferences || {}
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/profile/password
 * Change own password
 */
app.put('/api/profile/password', requireAuth, authValidation.changePassword, async (req, res, next) => {
  try {
    const user = users.get(req.user.email);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    const { currentPassword, newPassword } = sanitizeInput(req.body);

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }
      });
    }

    // Update password
    user.passwordHash = await hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();

    users.set(user.email, user);

    // Revoke all refresh tokens for this user
    for (const [token, data] of refreshTokens.entries()) {
      if (data.userId === user.id) {
        refreshTokens.delete(token);
      }
    }

    logger.info('Password changed', { userId: user.id });

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  } catch (error) {
    next(error);
  }
});

// ============ TRUST SCORES (NEW) ============

function computeTrustLevel(score) {
  if (score >= 90) return 'platinum';
  if (score >= 80) return 'gold';
  if (score >= 70) return 'silver';
  if (score >= 50) return 'bronze';
  if (score >= 30) return 'iron';
  return 'restricted';
}

// Seed trust for known users (decision-engine calls this)
for (const u of users.values()) {
  const baseScore = u.role === 'superadmin' ? 95 : u.role === 'admin' ? 85 : u.role === 'manager' ? 70 : 50;
  trustScores.set(u.id, { score: baseScore, level: computeTrustLevel(baseScore), lastUpdated: new Date().toISOString(), history: [] });
}

app.get('/api/trust/score/:corpId', requireAuth, (req, res) => {
  let s = trustScores.get(req.params.corpId);
  if (!s) {
    // Default trust for unknown entities (avoids decision-engine silent failback)
    s = { score: 50, level: 'bronze', lastUpdated: new Date().toISOString(), history: [] };
    trustScores.set(req.params.corpId, s);
  }
  res.json({ success: true, corpId: req.params.corpId, ...s });
});

// SECURITY FIX (HOJAI C-4): PUT trust score is a privileged operation — any
// authenticated user could previously overwrite any entity's trust score.
// Now requires admin or superadmin role.
app.put('/api/trust/score/:corpId', requireAuth, requireRole('superadmin', 'admin'), (req, res) => {
  const { score, source = 'manual' } = req.body || {};
  if (typeof score !== 'number' || score < 0 || score > 100) return res.status(400).json({ success: false, error: 'score must be 0-100' });
  const old = trustScores.get(req.params.corpId) || { score: 50, history: [] };
  const updated = {
    score,
    level: computeTrustLevel(score),
    lastUpdated: new Date().toISOString(),
    history: [...old.history, { score, source, by: req.user.id, at: new Date().toISOString() }].slice(-50),
  };
  trustScores.set(req.params.corpId, updated);
  res.json({ success: true, corpId: req.params.corpId, ...updated });
});

app.get('/api/trust/levels', (_req, res) => {
  res.json({ success: true, levels: [
    { name: 'platinum', min: 90, max: 100, badge: '🏆' },
    { name: 'gold', min: 80, max: 89, badge: '⭐' },
    { name: 'silver', min: 70, max: 79, badge: '🥈' },
    { name: 'bronze', min: 50, max: 69, badge: '🥉' },
    { name: 'iron', min: 30, max: 49, badge: '⚙️' },
    { name: 'restricted', min: 0, max: 29, badge: '⚠️' },
  ] });
});

// ============ NAMESPACES (NEW) ============

app.post('/api/namespaces', requireAuth, (req, res) => {
  const { name, businessId } = req.body || {};
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  if (namespaces.has(name)) return res.status(409).json({ success: false, error: 'namespace exists' });
  const ns = { name, owner: req.user.id, businessId: businessId || null, createdAt: new Date().toISOString() };
  namespaces.set(name, ns);
  res.status(201).json({ success: true, namespace: ns });
});

app.get('/api/namespaces', requireAuth, (_req, res) => {
  res.json({ success: true, namespaces: [...namespaces.values()] });
});

app.get('/api/namespaces/:name', requireAuth, (req, res) => {
  const ns = namespaces.get(req.params.name);
  if (!ns) return res.status(404).json({ success: false, error: 'namespace not found' });
  res.json({ success: true, namespace: ns });
});

app.delete('/api/namespaces/:name', requireAuth, (req, res) => {
  if (!namespaces.has(req.params.name)) return res.status(404).json({ success: false, error: 'namespace not found' });
  namespaces.delete(req.params.name);
  res.json({ success: true, deleted: req.params.name });
});

// ============ API KEYS (NEW) ============

app.post('/api/api-keys', requireAuth, (req, res) => {
  const { name, scopes = [], businessId = null } = req.body || {};
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const key = 'ak_' + require('crypto').randomBytes(24).toString('hex');
  const kid = require('crypto').randomUUID();
  const record = {
    id: kid, key, name, scopes, businessId, owner: req.user.id,
    createdAt: new Date().toISOString(), lastUsed: null, status: 'active'
  };
  apiKeys.set(kid, record);
  res.status(201).json({ success: true, apiKey: { id: kid, key, name, scopes }, warning: 'Save the key now — it will not be shown again.' });
});

app.get('/api/api-keys', requireAuth, (req, res) => {
  const owned = [...apiKeys.values()].filter(k => k.owner === req.user.id);
  res.json({ success: true, apiKeys: owned.map(k => ({ id: k.id, name: k.name, scopes: k.scopes, status: k.status, lastUsed: k.lastUsed, createdAt: k.createdAt })) });
});

app.delete('/api/api-keys/:id', requireAuth, (req, res) => {
  const k = apiKeys.get(req.params.id);
  if (!k) return res.status(404).json({ success: false, error: 'key not found' });
  if (k.owner !== req.user.id && req.user.role !== 'superadmin') return res.status(403).json({ success: false, error: 'forbidden' });
  apiKeys.delete(req.params.id);
  res.json({ success: true, revoked: req.params.id });
});

// ============ ERROR HANDLERS ============

app.use(notFoundHandler);
app.use(errorHandler);

// ============ START SERVER ============

const server = app.listen(PORT, () => {
  logger.info(`🔐 CorpID v2.0 running on port ${PORT}`);
  logger.info(`👥 ${users.size} users registered`);
  logger.info(`🏢 ${businesses.size} businesses registered`);
});
installGracefulShutdown(server);

export default app;
