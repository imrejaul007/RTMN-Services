/**
 * HOJAI SiteOS - Widget Intelligence Service
 * Lead Scoring Engine (Port 5401)
 *
 * Provides real-time lead scoring with weighted signals,
 * velocity bonuses, and recency decay.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { logger } from './logger.js';
import leadRoutes from './routes/leadRoutes.js';

// Signal weights configuration
export const SIGNAL_WEIGHTS = {
  pricing_visit: 15,
  product_view: 5,
  add_to_cart: 20,
  checkout_start: 30,
  repeat_visit: 10,
  email_subscribe: 25,
  whatsapp_click: 15,
  compare_products: 20,
  download_pdf: 20,
  exit_intent: 10,
};

// In-memory store (replace with Redis/DB in production)
const leadsStore = new Map();
const signalsStore = new Map();

/**
 * Calculate velocity bonus based on signal frequency
 * @param {Array} signals - Array of signal objects with timestamp
 * @returns {number} Multiplier (1.0, 1.3, or 1.5)
 */
export function calculateVelocityBonus(signals) {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Signals in last hour
  const recentSignals = signals.filter(s => s.timestamp >= oneHourAgo);
  if (recentSignals.length >= 3) return 1.5;

  // Signals in last day
  const dailySignals = signals.filter(s => s.timestamp >= oneDayAgo);
  if (dailySignals.length >= 5) return 1.3;

  return 1.0;
}

/**
 * Calculate recency decay multiplier
 * @param {number} lastSignalTime - Timestamp of last signal
 * @returns {number} Multiplier (0.5 to 1.2)
 */
export function calculateRecencyDecay(lastSignalTime) {
  const now = Date.now();
  const hoursSince = (now - lastSignalTime) / (1000 * 60 * 60);

  if (hoursSince < 1) return 1.2;
  if (hoursSince < 24) return 1.0;
  if (hoursSince < 168) return 0.8; // 7 days
  return 0.5;
}

/**
 * Calculate lead score for a visitor
 * @param {string} visitorId - Visitor identifier
 * @returns {Object} Lead score breakdown
 */
export function calculateLeadScore(visitorId) {
  const signals = signalsStore.get(visitorId) || [];
  const lead = leadsStore.get(visitorId);

  if (signals.length === 0) {
    return {
      visitorId,
      score: 0,
      tier: 'cold',
      signals: [],
      velocity: 1.0,
      recency: 1.0,
      breakdown: { base: 0, velocity: 0, recency: 0, total: 0 },
    };
  }

  // Base score from signals
  let baseScore = 0;
  const signalBreakdown = [];

  for (const signal of signals) {
    const weight = SIGNAL_WEIGHTS[signal.type] || 0;
    baseScore += weight;
    signalBreakdown.push({
      type: signal.type,
      weight,
      timestamp: signal.timestamp,
    });
  }

  // Velocity bonus
  const velocityBonus = calculateVelocityBonus(signals);
  const velocityMultiplier = velocityBonus - 1;

  // Recency decay
  const lastSignalTime = signals[signals.length - 1].timestamp;
  const recencyMultiplier = calculateRecencyDecay(lastSignalTime);

  // Calculate final score
  const velocityAdded = Math.round(baseScore * velocityMultiplier);
  const recencyAdjusted = Math.round((baseScore + velocityAdded) * recencyMultiplier);
  const totalScore = baseScore + velocityAdded + (recencyAdjusted - baseScore - velocityAdded);

  // Determine tier
  let tier = 'cold';
  if (totalScore >= 100) tier = 'hot';
  else if (totalScore >= 50) tier = 'warm';
  else if (totalScore >= 20) tier = 'qualified';

  return {
    visitorId,
    score: totalScore,
    tier,
    signals: signalBreakdown,
    velocity: velocityBonus,
    recency: recencyMultiplier,
    lastSignal: new Date(lastSignalTime).toISOString(),
    breakdown: {
      base: baseScore,
      velocity: velocityAdded,
      recency: recencyAdjusted - baseScore - velocityAdded,
      total: totalScore,
    },
  };
}

/**
 * Store a new signal
 * @param {string} visitorId - Visitor identifier
 * @param {Object} signalData - Signal data
 */
export function storeSignal(visitorId, signalData) {
  if (!signalsStore.has(visitorId)) {
    signalsStore.set(visitorId, []);
  }

  const signals = signalsStore.get(visitorId);
  const signal = {
    id: uuidv4(),
    type: signalData.type,
    metadata: signalData.metadata || {},
    timestamp: Date.now(),
    sessionId: signalData.sessionId,
  };

  signals.push(signal);

  // Keep only last 100 signals per visitor
  if (signals.length > 100) {
    signals.shift();
  }

  // Initialize or update lead
  if (!leadsStore.has(visitorId)) {
    leadsStore.set(visitorId, {
      visitorId,
      createdAt: Date.now(),
      firstSignal: signal.timestamp,
    });
  }

  const lead = leadsStore.get(visitorId);
  lead.lastSignal = signal.timestamp;
  lead.signalCount = signals.length;

  return signal;
}

// Express app setup
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'widget-intelligence',
    version: '1.0.0',
    port: 5401,
    timestamp: new Date().toISOString(),
    stats: {
      activeVisitors: leadsStore.size,
      totalSignals: Array.from(signalsStore.values()).reduce((acc, arr) => acc + arr.length, 0),
    },
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/intelligence', leadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method });

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
const PORT = process.env.PORT || 5401;

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`Widget Intelligence Service running on port ${port}`);
      resolve(server);
    });
  });
}

// Start if run directly
const isMainModule = process.argv[1]?.includes('index.js');
if (isMainModule) {
  startServer();
}

export { app };