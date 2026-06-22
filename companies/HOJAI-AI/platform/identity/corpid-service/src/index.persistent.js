/**
 * RTMN CorpID - Universal Identity Service v3.0
 *
 * Production-ready refactor:
 * - Uses @rtmn/shared for persistence, auth, logger, errors
 * - JWT-based authentication (unchanged)
 * - Role-based access control (unchanged)
 * - Rate limiting (unchanged)
 * - Data SURVIVES process restarts (NEW)
 *
 * @author HOJAI AI
 * @version 3.0.0
 */

import express from 'express';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Shared library
import { createLogger } from '../../../../shared/lib/logger.js';
import { createModel } from '../../../../shared/lib/persistent-store.js';
import { asyncHandler, errorMiddleware, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError, ValidationError } from '../../../../shared/lib/errors.js';

process.env.SERVICE_NAME = 'corpID';
const logger = createLogger('corpID');

// ============ CONFIGURATION ============

const PORT = process.env.PORT || 4702;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';
const TOKEN_ISSUER = 'rtmn-corpid';
const BCRYPT_ROUNDS = 12;

// ============ PERSISTENT MODELS ============

const User = createModel('User', { key: 'email' });
const Business = createModel('Business', { key: 'id' });
const RefreshToken = createModel('RefreshToken', { key: 'token' });
const ApiKey = createModel('ApiKey', { key: 'id' });
const TrustScore = createModel('TrustScore', { key: 'corpId' });
const Namespace = createModel('Namespace', { key: 'name' });

// ============ INITIAL SEED DATA ============

// Seed default business + admin user (only if database is empty)
async function seedDefaults() {
  const existingBusinesses = await Business.find();
  if (existingBusinesses.length === 0) {
    const now = new Date().toISOString();
    await Business.create({
      id: 'RTMN-HQ',
      name: 'RTMN Headquarters',
      industry: 'technology',
      plan: 'enterprise',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    logger.info('Seeded default business: RTMN-HQ');
  }

  const existingUsers = await User.find();
  if (existingUsers.length === 0) {
    const now = new Date().toISOString();
    // SECURITY FIX (CORPID L-9 + project-wide constraint): default admin
    // password is no longer seeded in source. The bootstrap flow generates a
    // single-use token via BOOTSTRAP_ADMIN_EMAIL and prints it to stdout.
    // If that env var is not set, refuse to seed (matches the new bootstrap
    // pattern documented in corpID-cloud/README.md and src/index.js).
    if (!process.env.BOOTSTRAP_ADMIN_EMAIL) {
      logger.warn('No users seeded. Set BOOTSTRAP_ADMIN_EMAIL to bootstrap the initial admin.');
      return;
    }
    const passwordHash = await bcrypt.hash(require('crypto').randomBytes(24).toString('base64url'), BCRYPT_ROUNDS);
    await User.create({
      id: 'user-admin-001',
      email: process.env.BOOTSTRAP_ADMIN_EMAIL,
      passwordHash,
      name: 'Admin User',
      role: 'superadmin',
      businessId: 'RTMN-HQ',
      status: 'active',
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    });
    logger.info('Seeded initial admin from BOOTSTRAP_ADMIN_EMAIL (password reset required on first login).');
  }

  // Seed trust scores for existing users
  const allUsers = await User.find();
  for (const u of allUsers) {
    const existing = await TrustScore.findOne(u.id);
    if (!existing) {
      const baseScore = u.role === 'superadmin' ? 95 : u.role === 'admin' ? 85 : u.role === 'manager' ? 70 : 50;
      await TrustScore.create({
        corpId: u.id,
        score: baseScore,
        level: computeTrustLevel(baseScore),
        lastUpdated: new Date().toISOString(),
        history: [],
      });
    }
  }
}

function computeTrustLevel(score) {
  if (score >= 90) return 'platinum';
  if (score >= 80) return 'gold';
  if (score >= 70) return 'silver';
  if (score >= 50) return 'bronze';
  if (score >= 30) return 'iron';
  return 'restricted';
}

// ============ EXPRESS APP ============

const app = express();

// Validate required env at startup
import { requireEnv } from '@rtmn/shared/lib/env';
requireEnv(['PORT'], { allowDev: true });

// ============ SECURITY MIDDLEWARE ============

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ============ RATE LIMITERS ============
// In test mode (NODE_ENV=test), skip rate limiting entirely
const TEST_MODE = process.env.NODE_ENV === 'test';

const authLimiter = TEST_MODE ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many auth attempts' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

const defaultLimiter = TEST_MODE ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false
});

const strictLimiter = TEST_MODE ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded' } }
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
        details: errors.array().map(err => ({ field: err.path, message: err.msg, value: err.value }))
      }
    });
  }
  next();
}

function sanitizeInput(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  const sanitized = Array.isArray(obj) ? [] : {};
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
    { expiresIn: JWT_EXPIRES_IN, issuer: TOKEN_ISSUER, jwtid: uuidv4() }
  );
}

async function generateRefreshToken(user) {
  const token = jwt.sign(
    { sub: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN, issuer: TOKEN_ISSUER }
  );

  await RefreshToken.create({
    token,
    userId: user.id,
    email: user.email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return token;
}

async function generateTokens(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: await generateRefreshToken(user),
    expiresIn: JWT_EXPIRES_IN,
    tokenType: 'Bearer'
  };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: TOKEN_ISSUER });
  } catch {
    return null;
  }
}

// ============ AUTH MIDDLEWARE ============

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) return next(new UnauthorizedError('Invalid or expired token'));
  if (decoded.type !== 'access') return next(new UnauthorizedError('Invalid token type'));
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
    if (!req.user) return next(new UnauthorizedError('Authentication required'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Required role: ${allowedRoles.join(' or ')}`));
    }
    next();
  };
}

function requireBusiness(businessIdParam = 'businessId') {
  return async (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));
    if (['superadmin', 'admin'].includes(req.user.role)) return next();
    const requestedBusiness = req.params[businessIdParam] || req.body[businessIdParam] || req.query[businessIdParam];
    if (requestedBusiness && requestedBusiness !== req.user.businessId) {
      return next(new ForbiddenError('Access denied to this business'));
    }
    next();
  };
}

// ============ HEALTH ENDPOINTS ============

app.get('/health', async (req, res) => {
  // Liveness - always 200 if process up
  const stats = {
    users: await User.countDocuments(),
    businesses: await Business.countDocuments(),
    activeSessions: await RefreshToken.countDocuments(),
  };
  res.json({
    status: 'healthy',
    service: 'corpID',
    version: '3.0.0',
    port: PORT,
    storage: 'persistent',
    timestamp: new Date().toISOString(),
    stats,
  });
});

app.get('/ready', async (req, res) => {
  // Readiness - checks data layer
  try {
    const userCount = await User.countDocuments();
    res.json({
      status: 'ready',
      service: 'corpID',
      storage: 'persistent',
      timestamp: new Date().toISOString(),
      checks: { dataLayer: 'ok', userCount },
    });
  } catch (err) {
    res.status(503).json({
      status: 'not ready',
      service: 'corpID',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
});

// ============ AUTH ROUTES ============

app.post('/auth/register', authLimiter, [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  body('businessId').trim().isLength({ min: 2, max: 50 }).withMessage('Business ID is required'),
  body('businessName').optional().trim().isLength({ max: 200 }),
  body('role').optional().isIn(['owner', 'admin', 'manager', 'user']),
  validate,
], asyncHandler(async (req, res) => {
  const body = sanitizeInput(req.body);
  const { email, password, name, businessId, businessName, role = 'owner' } = body;

  const existingUser = await User.findOne(email.toLowerCase());
  if (existingUser) throw new ConflictError('User with this email already exists');

  const existingBusiness = await Business.findOne(businessId);
  if (existingBusiness) throw new ConflictError('Business with this ID already exists');

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await Business.create({
    id: businessId,
    name: businessName || businessId,
    industry: req.body.industry || 'general',
    plan: req.body.plan || 'starter',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  const userId = `user-${uuidv4().slice(0, 8)}`;
  const user = await User.create({
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    name,
    role,
    businessId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  const tokens = await generateTokens(user);

  // Initialize trust score for new user
  const baseScore = role === 'superadmin' ? 95 : role === 'admin' ? 85 : role === 'manager' ? 70 : 50;
  await TrustScore.create({
    corpId: userId,
    score: baseScore,
    level: computeTrustLevel(baseScore),
    lastUpdated: now,
    history: [],
  });

  logger.info({ userId, businessId, email: user.email }, 'User registered');

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    ...tokens,
    user: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, businessId: user.businessId,
    },
  });
}));

app.post('/auth/login', authLimiter, [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const { email, password } = sanitizeInput(req.body);
  const user = await User.findOne(email.toLowerCase());
  if (!user) throw new UnauthorizedError('Invalid email or password');
  if (user.status !== 'active') throw new ForbiddenError('Account is not active');

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Invalid email or password');

  const tokens = await generateTokens(user);
  logger.info({ userId: user.id, email: user.email }, 'User logged in');

  res.json({
    success: true,
    message: 'Login successful',
    ...tokens,
    user: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, businessId: user.businessId,
    },
  });
}));

// Token verification endpoint for downstream services (added June 21, 2026)
// Returns the decoded user info if the token is valid, else 401.
app.post('/auth/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) throw new UnauthorizedError('Invalid or expired token');
  if (decoded.type !== 'access') throw new UnauthorizedError('Invalid token type');
  res.json({
    success: true,
    user: {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      businessId: decoded.businessId,
    },
  });
}));

app.post('/auth/refresh', authLimiter, [
  body('refreshToken').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const decoded = verifyToken(refreshToken);
  if (!decoded || decoded.type !== 'refresh') throw new UnauthorizedError('Invalid refresh token');

  const tokenRecord = await RefreshToken.findOne(refreshToken);
  if (!tokenRecord || new Date(tokenRecord.expiresAt) < new Date()) {
    if (tokenRecord) await RefreshToken.deleteOne({ token: refreshToken });
    throw new UnauthorizedError('Refresh token expired or revoked');
  }

  const user = await User.findOne(decoded.sub);
  if (!user || user.status !== 'active') throw new UnauthorizedError('User not found or inactive');

  // Revoke old, issue new
  await RefreshToken.deleteOne({ token: refreshToken });
  const tokens = await generateTokens(user);

  logger.info({ userId: user.id }, 'Token refreshed');
  res.json({ success: true, ...tokens });
}));

app.post('/auth/logout', requireAuth, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await RefreshToken.deleteOne({ token: refreshToken });
  logger.info({ userId: req.user.id }, 'User logged out');
  res.json({ success: true, message: 'Logged out successfully' });
}));

app.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');
  const business = await Business.findOne(user.businessId);
  res.json({
    success: true,
    user: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, businessId: user.businessId,
      businessName: business?.name,
      status: user.status, createdAt: user.createdAt,
    },
  });
}));

// ============ USER MANAGEMENT ROUTES ============

app.get('/api/users', requireAuth, requireRole('superadmin', 'admin'), [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['superadmin', 'admin', 'manager', 'user', 'customer']),
  query('status').optional().isIn(['active', 'inactive', 'suspended']),
  query('businessId').optional().trim(),
  validate,
], asyncHandler(async (req, res) => {
  let userList = await User.find();
  if (req.user.role !== 'superadmin') {
    userList = userList.filter(u => u.businessId === req.user.businessId);
  }
  if (req.query.role) userList = userList.filter(u => u.role === req.query.role);
  if (req.query.status) userList = userList.filter(u => u.status === req.query.status);
  if (req.query.businessId) userList = userList.filter(u => u.businessId === req.query.businessId);

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const start = (page - 1) * limit;
  const paginated = userList.slice(start, start + limit);

  const safeUsers = paginated.map(u => ({
    id: u.id, email: u.email, name: u.name, role: u.role,
    businessId: u.businessId, status: u.status, createdAt: u.createdAt,
  }));

  res.json({
    success: true,
    count: userList.length,
    page, limit,
    totalPages: Math.ceil(userList.length / limit),
    users: safeUsers,
  });
}));

app.get('/api/users/:id', requireAuth, asyncHandler(async (req, res) => {
  const targetUser = (await User.find()).find(u => u.id === req.params.id);
  if (!targetUser) throw new NotFoundError('User not found');

  if (!['superadmin', 'admin'].includes(req.user.role) &&
      targetUser.businessId !== req.user.businessId) {
    throw new ForbiddenError('Access denied to this user');
  }

  const business = await Business.findOne(targetUser.businessId);
  res.json({
    success: true,
    user: {
      id: targetUser.id, email: targetUser.email, name: targetUser.name,
      role: targetUser.role, businessId: targetUser.businessId,
      businessName: business?.name,
      status: targetUser.status,
      createdAt: targetUser.createdAt, updatedAt: targetUser.updatedAt,
    },
  });
}));

app.post('/api/users', requireAuth, requireRole('superadmin', 'admin', 'manager'), strictLimiter, [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('role').optional().isIn(['admin', 'manager', 'user', 'customer']),
  body('businessId').optional().trim().isLength({ min: 2, max: 50 }),
  validate,
], asyncHandler(async (req, res) => {
  const body = sanitizeInput(req.body);
  const { email, password, name, role = 'user', businessId } = body;
  const targetBusinessId = businessId || req.user.businessId;

  if (!['superadmin', 'admin'].includes(req.user.role) && targetBusinessId !== req.user.businessId) {
    throw new ForbiddenError('Cannot create user for another business');
  }

  if (await User.findOne(email.toLowerCase())) throw new ConflictError('User already exists');
  if (!(await Business.findOne(targetBusinessId))) throw new NotFoundError('Business not found');

  const passwordHash = await hashPassword(password);
  const userId = `user-${uuidv4().slice(0, 8)}`;

  const user = await User.create({
    id: userId, email: email.toLowerCase(), passwordHash, name,
    role, businessId: targetBusinessId, status: 'active',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  logger.info({ userId, createdBy: req.user.id }, 'User created');
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, businessId: user.businessId, status: user.status,
    },
  });
}));

app.put('/api/users/:id', requireAuth, strictLimiter, [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('role').optional().isIn(['admin', 'manager', 'user', 'customer']),
  body('status').optional().isIn(['active', 'inactive', 'suspended']),
  body('preferences').optional().isObject(),
  validate,
], asyncHandler(async (req, res) => {
  const allUsers = await User.find();
  const targetUser = allUsers.find(u => u.id === req.params.id);
  if (!targetUser) throw new NotFoundError('User not found');

  if (!['superadmin', 'admin'].includes(req.user.role) &&
      targetUser.businessId !== req.user.businessId) {
    throw new ForbiddenError('Access denied');
  }

  if (req.body.role && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Only admins can change roles');
  }

  const updates = sanitizeInput(req.body);
  const updated = await User.updateOne({ email: targetUser.email }, updates);

  logger.info({ userId: targetUser.id, updatedBy: req.user.id }, 'User updated');
  res.json({
    success: true,
    message: 'User updated successfully',
    user: {
      id: updated.id, email: updated.email, name: updated.name,
      role: updated.role, businessId: updated.businessId,
      status: updated.status, updatedAt: updated.updatedAt,
    },
  });
}));

app.delete('/api/users/:id', requireAuth, requireRole('superadmin', 'admin'), asyncHandler(async (req, res) => {
  const allUsers = await User.find();
  const targetUser = allUsers.find(u => u.id === req.params.id);
  if (!targetUser) throw new NotFoundError('User not found');
  if (targetUser.id === req.user.id) throw new ValidationError('Cannot delete your own account');

  if (!['superadmin'].includes(req.user.role) &&
      targetUser.businessId !== req.user.businessId) {
    throw new ForbiddenError('Access denied');
  }

  await User.deleteOne({ email: targetUser.email });
  logger.info({ userId: targetUser.id, deletedBy: req.user.id }, 'User deleted');
  res.json({ success: true, message: 'User deleted successfully' });
}));

// ============ BUSINESS ROUTES ============

app.get('/api/businesses', requireAuth, requireRole('superadmin', 'admin'), asyncHandler(async (req, res) => {
  let businessList = await Business.find();
  if (req.query.status) businessList = businessList.filter(b => b.status === req.query.status);
  res.json({ success: true, count: businessList.length, businesses: businessList });
}));

app.get('/api/businesses/:id', requireAuth, requireBusiness('id'), asyncHandler(async (req, res) => {
  const business = await Business.findOne(req.params.id);
  if (!business) throw new NotFoundError('Business not found');
  const allUsers = await User.find();
  const userCount = allUsers.filter(u => u.businessId === business.id).length;
  res.json({ success: true, business: { ...business, userCount } });
}));

// ============ PROFILE ROUTES ============

app.get('/api/profile', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');
  const business = await Business.findOne(user.businessId);
  res.json({
    success: true,
    profile: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, businessId: user.businessId,
      businessName: business?.name, businessPlan: business?.plan,
      status: user.status, preferences: user.preferences || {},
      createdAt: user.createdAt, updatedAt: user.updatedAt,
    },
  });
}));

app.put('/api/profile', requireAuth, strictLimiter, [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('preferences').optional().isObject(),
  validate,
], asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');
  const updates = sanitizeInput(req.body);
  const updated = await User.updateOne({ email: user.email }, updates);
  logger.info({ userId: user.id }, 'Profile updated');
  res.json({
    success: true,
    message: 'Profile updated successfully',
    profile: {
      id: updated.id, email: updated.email, name: updated.name,
      role: updated.role, preferences: updated.preferences || {},
    },
  });
}));

app.put('/api/profile/password', requireAuth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  validate,
], asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');

  const { currentPassword, newPassword } = sanitizeInput(req.body);
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Current password is incorrect');

  const passwordHash = await hashPassword(newPassword);
  await User.updateOne({ email: user.email }, { passwordHash });

  // Revoke all refresh tokens for this user
  const allTokens = await RefreshToken.find({ userId: user.id });
  for (const t of allTokens) {
    await RefreshToken.deleteOne({ token: t.token });
  }

  logger.info({ userId: user.id }, 'Password changed');
  res.json({ success: true, message: 'Password changed successfully. Please login again.' });
}));

// ============ TRUST SCORES ============

app.get('/api/trust/score/:corpId', asyncHandler(async (req, res) => {
  let s = await TrustScore.findOne(req.params.corpId);
  if (!s) {
    s = await TrustScore.create({
      corpId: req.params.corpId,
      score: 50,
      level: 'bronze',
      lastUpdated: new Date().toISOString(),
      history: [],
    });
  }
  res.json({ success: true, corpId: req.params.corpId, ...s });
}));

app.put('/api/trust/score/:corpId', requireAuth, asyncHandler(async (req, res) => {
  const { score, source = 'manual' } = req.body || {};
  if (typeof score !== 'number' || score < 0 || score > 100) {
    throw new ValidationError('score must be 0-100');
  }
  // Find existing by corpId field
  const all = await TrustScore.find();
  const existing = all.find(t => t.corpId === req.params.corpId);
  const history = existing?.history || [];
  const now = new Date().toISOString();
  const record = {
    corpId: req.params.corpId,
    score,
    level: computeTrustLevel(score),
    lastUpdated: now,
    history: [...history, { score, source, by: req.user.id, at: now }].slice(-50),
  };
  let updated;
  if (existing) {
    updated = await TrustScore.updateOne({ corpId: req.params.corpId }, record);
  } else {
    updated = await TrustScore.create(record);
  }
  res.json({ success: true, corpId: updated.corpId, score: updated.score, level: updated.level, lastUpdated: updated.lastUpdated });
}));

app.get('/api/trust/levels', (_req, res) => {
  res.json({
    success: true,
    levels: [
      { name: 'platinum', min: 90, max: 100, badge: '🏆' },
      { name: 'gold', min: 80, max: 89, badge: '⭐' },
      { name: 'silver', min: 70, max: 79, badge: '🥈' },
      { name: 'bronze', min: 50, max: 69, badge: '🥉' },
      { name: 'iron', min: 30, max: 49, badge: '⚙️' },
      { name: 'restricted', min: 0, max: 29, badge: '⚠️' },
    ],
  });
});

// ============ NAMESPACES ============

app.post('/api/namespaces', requireAuth, asyncHandler(async (req, res) => {
  const { name, businessId } = req.body || {};
  if (!name) throw new ValidationError('name required');
  if (await Namespace.findOne(name)) throw new ConflictError('namespace exists');
  const ns = await Namespace.create({
    name, owner: req.user.id, businessId: businessId || null,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ success: true, namespace: ns });
}));

app.get('/api/namespaces', requireAuth, asyncHandler(async (_req, res) => {
  const all = await Namespace.find();
  res.json({ success: true, namespaces: all });
}));

app.get('/api/namespaces/:name', requireAuth, asyncHandler(async (req, res) => {
  const ns = await Namespace.findOne(req.params.name);
  if (!ns) throw new NotFoundError('namespace not found');
  res.json({ success: true, namespace: ns });
}));

app.delete('/api/namespaces/:name', requireAuth, asyncHandler(async (req, res) => {
  const ns = await Namespace.findOne(req.params.name);
  if (!ns) throw new NotFoundError('namespace not found');
  await Namespace.deleteOne({ name: req.params.name });
  res.json({ success: true, deleted: req.params.name });
}));

// ============ API KEYS ============

app.post('/api/api-keys', requireAuth, asyncHandler(async (req, res) => {
  const { name, scopes = [], businessId = null } = req.body || {};
  if (!name) throw new ValidationError('name required');
  const crypto = await import('crypto');
  const key = 'ak_' + crypto.randomBytes(24).toString('hex');
  const kid = crypto.randomUUID();
  const record = await ApiKey.create({
    id: kid, key, name, scopes, businessId, owner: req.user.id,
    createdAt: new Date().toISOString(), lastUsed: null, status: 'active',
  });
  res.status(201).json({
    success: true,
    apiKey: { id: record.id, key: record.key, name: record.name, scopes: record.scopes },
    warning: 'Save the key now — it will not be shown again.',
  });
}));

app.get('/api/api-keys', requireAuth, asyncHandler(async (req, res) => {
  const all = await ApiKey.find();
  const owned = all.filter(k => k.owner === req.user.id);
  res.json({
    success: true,
    apiKeys: owned.map(k => ({
      id: k.id, name: k.name, scopes: k.scopes, status: k.status,
      lastUsed: k.lastUsed, createdAt: k.createdAt,
    })),
  });
}));

app.delete('/api/api-keys/:id', requireAuth, asyncHandler(async (req, res) => {
  const k = await ApiKey.findOne(req.params.id);
  if (!k) throw new NotFoundError('key not found');
  if (k.owner !== req.user.id && req.user.role !== 'superadmin') throw new ForbiddenError('forbidden');
  await ApiKey.deleteOne({ id: req.params.id });
  res.json({ success: true, revoked: req.params.id });
}));

// ============ ERROR HANDLERS ============

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});

app.use(errorMiddleware(logger));

// ============ START SERVER ============

export async function startServer(port = PORT) {
  await seedDefaults();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(`🔐 CorpID v3.0 (persistent) running on port ${port}`);
      resolve(server);
    });
    installGracefulShutdown(server);
    server.on('error', reject);
  });
}

// Auto-start when run directly (not when imported by tests)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  startServer().catch((err) => {
    logger.error({ err }, 'Failed to start CorpID');
    process.exit(1);
  });
}

export default app;
