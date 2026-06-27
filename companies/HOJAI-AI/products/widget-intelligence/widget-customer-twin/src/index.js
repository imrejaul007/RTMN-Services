/**
 * HOJAI SiteOS - Widget Customer Twin Service
 * Port 5402
 *
 * Provides a comprehensive Customer Twin with identity, behavior,
 * signals, predictive analytics, and consent management.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { logger } from './logger.js';
import twinRoutes from './routes/twinRoutes.js';

// In-memory store (replace with Redis/DB in production)
const twinsStore = new Map();
const signalHistoryStore = new Map();

/**
 * Intent levels based on behavioral signals
 */
const INTENT_THRESHOLDS = {
  browsing: 0,
  researching: 20,
  comparing: 50,
  ready_to_buy: 80,
  committed: 100,
};

/**
 * Churn risk levels based on recency
 */
const CHURN_THRESHOLDS = {
  active: 7, // days
  at_risk: 14,
  churned: 30,
};

/**
 * Create an empty Customer Twin
 */
export function createEmptyTwin(visitorId) {
  const now = Date.now();
  return {
    visitorId,
    identity: {
      name: null,
      email: null,
      phone: null,
      company: null,
      location: null,
      device: null,
      browser: null,
      language: null,
      identified: false,
      identifiedAt: null,
    },
    behavior: {
      firstVisit: now,
      lastVisit: now,
      visitCount: 0,
      pagesViewed: [],
      pagesViewedCount: 0,
      purchases: [],
      totalSpent: 0,
      avgSessionDuration: 0,
      preferredCategories: [],
    },
    signals: {
      leadScore: 0,
      intentLevel: 'browsing',
      churnRisk: 'active',
      ltv: 0,
      purchaseProbability: 0,
      engagementScore: 0,
    },
    predictive: {
      nextBestAction: null,
      predictedChurnDate: null,
      predictedLtv: 0,
      recommendedProducts: [],
      lastPredicted: null,
    },
    consent: {
      marketing: false,
      whatsapp: false,
      dataRetention: 365, // days
      gdprConsent: false,
      consentHistory: [],
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
  };
}

/**
 * Get or create a Customer Twin
 */
export function getTwin(visitorId) {
  if (!twinsStore.has(visitorId)) {
    twinsStore.set(visitorId, createEmptyTwin(visitorId));
  }
  return twinsStore.get(visitorId);
}

/**
 * Identify a visitor with personal information
 */
export function identifyVisitor(visitorId, identityData) {
  const twin = getTwin(visitorId);
  const now = Date.now();

  // Update identity
  if (identityData.name) twin.identity.name = identityData.name;
  if (identityData.email) twin.identity.email = identityData.email;
  if (identityData.phone) twin.identity.phone = identityData.phone;
  if (identityData.company) twin.identity.company = identityData.company;
  if (identityData.location) twin.identity.location = identityData.location;
  if (identityData.device) twin.identity.device = identityData.device;
  if (identityData.browser) twin.identity.browser = identityData.browser;
  if (identityData.language) twin.identity.language = identityData.language;

  // Mark as identified if we have email or phone
  if (identityData.email || identityData.phone) {
    twin.identity.identified = true;
    twin.identity.identifiedAt = now;
  }

  twin.metadata.updatedAt = now;
  logger.info({
    event: 'visitor_identified',
    visitorId,
    hasEmail: !!identityData.email,
    hasPhone: !!identityData.phone,
  });

  return twin;
}

/**
 * Record a signal and update the twin
 */
export function recordSignal(visitorId, signalData) {
  const twin = getTwin(visitorId);
  const now = Date.now();

  // Store signal in history
  if (!signalHistoryStore.has(visitorId)) {
    signalHistoryStore.set(visitorId, []);
  }
  signalHistoryStore.get(visitorId).push({
    id: uuidv4(),
    ...signalData,
    timestamp: now,
  });

  // Update behavior based on signal type
  updateBehaviorFromSignal(twin, signalData);

  // Recalculate signals
  recalculateSignals(twin);

  // Update predictive analytics
  updatePredictive(twin);

  twin.metadata.updatedAt = now;
  logger.info({
    event: 'signal_recorded',
    visitorId,
    signalType: signalData.type,
    newLeadScore: twin.signals.leadScore,
  });

  return twin;
}

/**
 * Update behavior based on signal type
 */
function updateBehaviorFromSignal(twin, signalData) {
  const now = Date.now();

  switch (signalData.type) {
    case 'page_view':
      if (signalData.pageId && !twin.behavior.pagesViewed.includes(signalData.pageId)) {
        twin.behavior.pagesViewed.push(signalData.pageId);
        twin.behavior.pagesViewedCount = twin.behavior.pagesViewed.length;
      }
      break;

    case 'purchase':
      twin.behavior.purchases.push({
        id: signalData.orderId || uuidv4(),
        amount: signalData.amount || 0,
        items: signalData.items || [],
        timestamp: now,
      });
      twin.behavior.totalSpent += signalData.amount || 0;
      break;

    case 'session_start':
      twin.behavior.visitCount += 1;
      twin.behavior.lastVisit = now;
      break;
  }
}

/**
 * Recalculate all signals based on behavior
 */
function recalculateSignals(twin) {
  const now = Date.now();

  // Calculate lead score from signal history
  const signals = signalHistoryStore.get(twin.visitorId) || [];
  const signalWeights = {
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
    purchase: 50,
  };

  const baseScore = signals.reduce((acc, s) => acc + (signalWeights[s.type] || 0), 0);
  twin.signals.leadScore = Math.min(baseScore, 500); // Cap at 500

  // Determine intent level
  if (twin.signals.leadScore >= INTENT_THRESHOLDS.committed) {
    twin.signals.intentLevel = 'committed';
  } else if (twin.signals.leadScore >= INTENT_THRESHOLDS.ready_to_buy) {
    twin.signals.intentLevel = 'ready_to_buy';
  } else if (twin.signals.leadScore >= INTENT_THRESHOLDS.comparing) {
    twin.signals.intentLevel = 'comparing';
  } else if (twin.signals.leadScore >= INTENT_THRESHOLDS.researching) {
    twin.signals.intentLevel = 'researching';
  } else {
    twin.signals.intentLevel = 'browsing';
  }

  // Calculate churn risk
  const daysSinceLastVisit = (now - twin.behavior.lastVisit) / (1000 * 60 * 60 * 24);
  if (daysSinceLastVisit < CHURN_THRESHOLDS.active) {
    twin.signals.churnRisk = 'active';
  } else if (daysSinceLastVisit < CHURN_THRESHOLDS.at_risk) {
    twin.signals.churnRisk = 'at_risk';
  } else if (daysSinceLastVisit < CHURN_THRESHOLDS.churned) {
    twin.signals.churnRisk = 'likely_churned';
  } else {
    twin.signals.churnRisk = 'churned';
  }

  // Calculate LTV
  twin.signals.ltv = twin.behavior.totalSpent;

  // Calculate purchase probability
  const hasCartSignals = signals.some(s => s.type === 'add_to_cart' || s.type === 'checkout_start');
  const hasPurchase = twin.behavior.purchases.length > 0;
  const visitFrequency = twin.behavior.visitCount;

  if (hasPurchase) {
    twin.signals.purchaseProbability = 0.9;
  } else if (hasCartSignals) {
    twin.signals.purchaseProbability = 0.6;
  } else if (visitFrequency > 3) {
    twin.signals.purchaseProbability = 0.3;
  } else {
    twin.signals.purchaseProbability = 0.1;
  }

  // Engagement score (0-100)
  twin.signals.engagementScore = Math.min(
    Math.round(
      (twin.behavior.visitCount * 5) +
      (twin.behavior.pagesViewedCount * 2) +
      (signals.length * 3)
    ),
    100
  );
}

/**
 * Update predictive analytics
 */
function updatePredictive(twin) {
  const now = Date.now();

  // Predict churn date for at-risk customers
  if (twin.signals.churnRisk === 'at_risk' || twin.signals.churnRisk === 'likely_churned') {
    const avgDaysBetweenVisits = twin.behavior.visitCount > 1
      ? (twin.behavior.lastVisit - twin.behavior.firstVisit) / (twin.behavior.visitCount - 1) / (1000 * 60 * 60 * 24)
      : 7;
    twin.predictive.predictedChurnDate = new Date(
      twin.behavior.lastVisit + (avgDaysBetweenVisits * 2 * 24 * 60 * 60 * 1000)
    ).toISOString();
  } else {
    twin.predictive.predictedChurnDate = null;
  }

  // Next best action
  const intent = twin.signals.intentLevel;
  const purchaseHistory = twin.behavior.purchases.length;

  if (purchaseHistory === 0 && twin.signals.leadScore >= 30) {
    twin.predictive.nextBestAction = 'send_checkout_reminder';
  } else if (purchaseHistory > 0 && twin.signals.churnRisk === 'at_risk') {
    twin.predictive.nextBestAction = 'send_win_back_offer';
  } else if (intent === 'comparing') {
    twin.predictive.nextBestAction = 'send_comparison_guide';
  } else if (twin.signals.leadScore < 20) {
    twin.predictive.nextBestAction = 'send_welcome_content';
  } else {
    twin.predictive.nextBestAction = 'continue_engagement';
  }

  // Predicted LTV (simple projection)
  if (twin.behavior.purchases.length > 0) {
    const avgOrderValue = twin.behavior.totalSpent / twin.behavior.purchases.length;
    twin.predictive.predictedLtv = avgOrderValue * 5; // Assume 5x potential
  }

  twin.predictive.lastPredicted = new Date(now).toISOString();
}

/**
 * Update consent preferences
 */
export function updateConsent(visitorId, consentData) {
  const twin = getTwin(visitorId);
  const now = Date.now();

  // Add to consent history
  twin.consent.consentHistory.push({
    timestamp: now,
    changes: {},
  });

  // Update consent values
  if (typeof consentData.marketing === 'boolean') {
    twin.consent.marketing = consentData.marketing;
    twin.consent.consentHistory[twin.consent.consentHistory.length - 1].changes.marketing = consentData.marketing;
  }
  if (typeof consentData.whatsapp === 'boolean') {
    twin.consent.whatsapp = consentData.whatsapp;
    twin.consent.consentHistory[twin.consent.consentHistory.length - 1].changes.whatsapp = consentData.whatsapp;
  }
  if (typeof consentData.dataRetention === 'number') {
    twin.consent.dataRetention = consentData.dataRetention;
  }
  if (typeof consentData.gdprConsent === 'boolean') {
    twin.consent.gdprConsent = consentData.gdprConsent;
  }

  twin.metadata.updatedAt = now;
  return twin;
}

/**
 * Get all signals for a visitor
 */
export function getSignalHistory(visitorId, options = {}) {
  const signals = signalHistoryStore.get(visitorId) || [];
  const { limit = 50, offset = 0, type } = options;

  let filtered = signals;
  if (type) {
    filtered = signals.filter(s => s.type === type);
  }

  return {
    total: filtered.length,
    signals: filtered.slice(offset, offset + limit),
  };
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
  windowMs: 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
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
    service: 'widget-customer-twin',
    version: '1.0.0',
    port: 5402,
    timestamp: new Date().toISOString(),
    stats: {
      activeTwins: twinsStore.size,
      totalSignals: Array.from(signalHistoryStore.values()).reduce((acc, arr) => acc + arr.length, 0),
    },
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/twin', twinRoutes);

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
const PORT = process.env.PORT || 5402;

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`Widget Customer Twin Service running on port ${port}`);
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