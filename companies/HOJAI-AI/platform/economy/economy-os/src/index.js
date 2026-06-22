/**
 * SUTAR Agent Economy - Karma Points and Agent Commerce
 * Port: 4251
 *
 * Provides economic infrastructure for agent-to-agent commerce:
 * - Karma points (reputation currency)
 * - SLBs (Service Level Bonds)
 * - Agent payments
 * - Escrow management
 *
 * SECURITY FIX (HOJAI C-7): Password hashing now uses bcrypt-12 instead
 * of unsalted SHA-256. SHA-256 is trivially brute-forceable.
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { setupSecurity, strictLimiter } from '@rtmn/shared/security';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Redis from 'ioredis';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

import economyRoutes from './routes/economy.js';
import paymentRoutes from './routes/payments.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4251;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Currency types
const CURRENCY = {
  KARMA: 'karma',     // Reputation points
  SLB: 'slb',        // Service Level Bonds
  REZ: 'rez'         // Platform currency
};

// Transaction types
const TX_TYPE = {
  PAYMENT: 'payment',
  ESCROW_DEPOSIT: 'escrow_deposit',
  ESCROW_RELEASE: 'escrow_release',
  ESCROW_REFUND: 'escrow_refund',
  KARMA_EARN: 'karma_earn',
  KARMA_BURN: 'karma_burn',
  SLB_STAKE: 'slb_stake',
  SLB_SLASH: 'slb_slash'
};

// Middleware
setupSecurity(app, { serviceName: 'agent-economy' });

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      duration: Date.now() - start,
      status: res.statusCode
    });
  });
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({
      status: 'healthy',
      service: 'agent-economy',
      version: '1.0.0',
      port: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Routes
app.use('/api/economy', economyRoutes);
app.use('/api/payments', paymentRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server

// ============= AUTH + DATABASE =============
const authBusinesses = new PersistentMap('auth-businesses', { serviceName: 'agent-economy' });
const authUsers = new PersistentMap('auth-users', { serviceName: 'agent-economy' });
const authSessions = new PersistentMap('auth-sessions', { serviceName: 'agent-economy' });
import crypto from 'crypto';

let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const SERVICE_NAME = process.env.SERVICE_NAME || 'service';

async function initDatabase() {
  if (!MONGODB_URI) {
    console.log('⚠️  MONGODB_URI not set. Running in demo mode (in-memory).');
    return;
  }
  try {
    mongoose = (await import('mongoose')).default;
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ MongoDB connected for', SERVICE_NAME);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
}

function hashPassword(password) {
  // bcrypt is slow by design (~250ms on modern hardware) so we don't
  // await it from a sync function. Callers must use the async helpers.
  throw new Error('hashPassword is sync-only for back-compat; use hashPasswordAsync');
}

async function hashPasswordAsync(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPasswordAsync(password, hash) {
  if (typeof hash !== 'string') return false;
  // Legacy SHA-256 hashes are 64 hex chars and don't start with $2
  if (/^\$2[aby]\$\d{2}\$/.test(hash)) {
    return bcrypt.compare(password, hash);
  }
  // Legacy migration path: only valid if the input is the same.
  const sha = crypto.createHash('sha256').update(password).digest('hex');
  return sha === hash;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', async (req, res) => {
  const { businessId, email, password, role, businessName } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  if (authUsers.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const passwordHash = await hashPasswordAsync(password);
  const user = {
    id: 'user_' + Date.now(),
    businessId,
    email,
    passwordHash,
    role: role || 'owner',
    name: businessName || email.split('@')[0],
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = await verifyPasswordAsync(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // SECURITY: upgrade legacy SHA-256 hashes to bcrypt on successful login.
  if (!/^\$2[aby]\$\d{2}\$/.test(user.passwordHash)) {
    user.passwordHash = await hashPasswordAsync(password);
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, businessId: user.businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ valid: true, ...session });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.session = session;
  next();
}

// ============= END AUTH + DATABASE =============

// Initialize database connection
initDatabase().then(() => {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


  const server = app.listen(PORT, () => {
    logger.info(`Agent Economy running on port ${PORT}`);
    logger.info('Currencies:', Object.values(CURRENCY).join(', '));
  });
  installGracefulShutdown(server);
});

export { app, redis, CURRENCY, TX_TYPE };
