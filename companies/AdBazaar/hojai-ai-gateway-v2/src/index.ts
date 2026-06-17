/**
 * Hojai AI Gateway - Production Ready
 *
 * Central AI intelligence hub for AdBazaar.
 * Connects to REZ Intelligence services with circuit breakers and caching.
 *
 * Features:
 * - REZ Intelligence integration
 * - Circuit breakers for fault tolerance
 * - Redis caching layer
 * - Rate limiting
 * - API authentication
 * - Prometheus metrics
 * - Sentry error tracking
 *
 * Port: 4560
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { HojaiAIService, REZServices } from './services/aiService.js';
import { CacheService } from './services/cache.js';
import { createRateLimiter, RateLimitConfig } from './middleware/rateLimit.js';
import { createAuthMiddleware, AuthConfig } from './middleware/auth.js';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.js';
import { logger } from './utils/logger.js';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

interface Config {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  adminToken: string;
  apiKeys: string[];
}

const config: Config = {
  port: parseInt(process.env.PORT || '4560', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGIN?.split(',').filter(Boolean) || ['*'],
  adminToken: process.env.ADMIN_TOKEN || process.env.HOJAI_ADMIN_TOKEN || 'change-me-in-production',
  apiKeys: (process.env.API_KEYS || process.env.HOJAI_API_KEYS || '').split(',').filter(Boolean),
};

// REZ Intelligence Service URLs
const REZ_SERVICES: REZServices = {
  intent: process.env.REZ_INTENT_SERVICE_URL || 'http://localhost:4018',
  predictive: process.env.REZ_PREDICTIVE_SERVICE_URL || 'http://localhost:4141',
  identity: process.env.REZ_IDENTITY_SERVICE_URL || 'http://localhost:4050',
  signals: process.env.REZ_SIGNAL_SERVICE_URL || 'http://localhost:4142',
  segments: process.env.REZ_SEGMENT_SERVICE_URL || 'http://localhost:4126',
  commerce: process.env.REZ_COMMERCE_SERVICE_URL || 'http://localhost:4129',
  decision: process.env.REZ_DECISION_SERVICE_URL || 'http://localhost:4027',
  attribution: process.env.REZ_ATTRIBUTION_SERVICE_URL || 'http://localhost:4100',
};

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || process.env.HOJAI_REDIS_URL || 'redis://localhost:6379';

// ============================================================================
// EXPRESS APP
// ============================================================================

const app: Express = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Admin-Token',
    'x-adbazaar-tenant-id',
    'x-adbazaar-company-id',
    'x-request-id',
  ],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Metrics middleware
app.use(metricsMiddleware);

// ============================================================================
// SERVICES
// ============================================================================

const aiService = new HojaiAIService(REZ_SERVICES);
const cacheService = new CacheService(REDIS_URL);

// Connect cache on startup
cacheService.connect().catch((err) => {
  logger.warn('Cache connection failed, running without cache', { error: err.message });
});

// Auth middleware
const authConfig: AuthConfig = {
  adminToken: config.adminToken,
  apiKeys: config.apiKeys,
};
const authMiddleware = createAuthMiddleware(authConfig);

// Rate limiter
const rateLimitConfig: RateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
};
const rateLimiter = createRateLimiter(rateLimitConfig);

// ============================================================================
// HEALTH & METRICS
// ============================================================================

// Basic health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'hojai-ai-gateway',
    version: '1.2.0',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// Readiness check - checks cache and circuit status
app.get('/ready', async (_req: Request, res: Response) => {
  try {
    const [cacheStats, circuits] = await Promise.all([
      cacheService.getStats().catch(() => ({ connected: false })),
      Promise.resolve(aiService.getCircuitStatus()),
    ]);

    const allCircuitsClosed = !Object.values(circuits).some(c => c.isOpen);

    res.json({
      ready: true,
      cache: cacheStats,
      circuits,
      allCircuitsOperational: allCircuitsClosed,
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: 'Service check failed',
    });
  }
});

// Liveness probe
app.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check
app.get('/health/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const [cacheStats, circuits] = await Promise.all([
      cacheService.getStats().catch(() => ({ connected: false })),
      Promise.resolve(aiService.getCircuitStatus()),
    ]);

    const checks = {
      cache: cacheStats.connected !== false ? 'healthy' : 'degraded',
      circuits: Object.values(circuits).every(c => !c.isOpen) ? 'healthy' : 'degraded',
    };

    res.json({
      status: checks.cache === 'healthy' && checks.circuits === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      circuits,
      responseTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Prometheus metrics
app.get('/metrics', metricsEndpoint);

// ============================================================================
// ADMIN & MANAGEMENT ROUTES
// ============================================================================

// Circuit breaker status
app.get('/api/circuit-breakers', authMiddleware, (_req: Request, res: Response) => {
  const circuits = aiService.getCircuitStatus();
  res.json({
    success: true,
    data: circuits,
    summary: {
      total: Object.keys(circuits).length,
      open: Object.values(circuits).filter(c => c.isOpen).length,
      closed: Object.values(circuits).filter(c => !c.isOpen).length,
    }
  });
});

// Cache management
app.get('/api/cache/stats', authMiddleware, async (_req: Request, res: Response) => {
  const stats = await cacheService.getStats();
  res.json({ success: true, data: stats });
});

app.post('/api/cache/clear', authMiddleware, async (_req: Request, res: Response) => {
  await cacheService.clear();
  logger.info('Cache cleared by admin');
  res.json({ success: true, message: 'Cache cleared' });
});

// Service configuration
app.get('/api/config', authMiddleware, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      port: config.port,
      environment: config.nodeEnv,
      services: {
        intent: REZ_SERVICES.intent,
        predictive: REZ_SERVICES.predictive,
        identity: REZ_SERVICES.identity,
        signals: REZ_SERVICES.signals,
        segments: REZ_SERVICES.segments,
        commerce: REZ_SERVICES.commerce,
        decision: REZ_SERVICES.decision,
        attribution: REZ_SERVICES.attribution,
      },
    },
  });
});

// ============================================================================
// AI ENDPOINTS
// ============================================================================

/**
 * POST /api/intent/predict
 * Predict user purchase intent
 */
app.post('/api/intent/predict', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, context } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Check cache first
    const cached = await cacheService.getIntent(userId);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    // Get prediction from AI service
    const result = await aiService.predictIntent(userId, context);

    // Cache result
    await cacheService.setIntent(userId, result);

    res.json({
      success: true,
      data: result,
      cached: false
    });
  } catch (error) {
    logger.error('Intent prediction failed', {
      error: error instanceof Error ? error.message : 'Unknown',
      userId: req.body.userId
    });
    res.status(500).json({
      success: false,
      error: 'INTENT_PREDICTION_FAILED',
      message: config.nodeEnv === 'development' ? error : undefined
    });
  }
});

/**
 * POST /api/behavior/predict
 * Predict user behavior (churn, LTV)
 */
app.post('/api/behavior/predict', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Check cache
    const cached = await cacheService.getBehavior(userId);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // Get prediction
    const result = await aiService.predictBehavior(userId);

    // Cache result
    await cacheService.setBehavior(userId, result);

    res.json({ success: true, data: result, cached: false });
  } catch (error) {
    logger.error('Behavior prediction failed', {
      error: error instanceof Error ? error.message : 'Unknown',
      userId: req.body.userId
    });
    res.status(500).json({
      success: false,
      error: 'BEHAVIOR_PREDICTION_FAILED'
    });
  }
});

/**
 * POST /api/audience/segments
 * Generate audience segments
 */
app.post('/api/audience/segments', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { criteria } = req.body;
    const cacheKey = `segments:${JSON.stringify(criteria || {})}`;

    // Check cache
    const cached = await cacheService.getSegments(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // Generate segments
    const result = await aiService.generateAudience(criteria);

    // Cache result
    await cacheService.setSegments(cacheKey, result);

    res.json({ success: true, data: result, cached: false });
  } catch (error) {
    logger.error('Audience generation failed', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    res.status(500).json({
      success: false,
      error: 'AUDIENCE_GENERATION_FAILED'
    });
  }
});

/**
 * POST /api/targeting/optimize
 * Optimize campaign targeting
 */
app.post('/api/targeting/optimize', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { campaignObjective, budget, audience } = req.body;

    const result = await aiService.optimizeTargeting(campaignObjective, budget, audience);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Targeting optimization failed', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    res.status(500).json({
      success: false,
      error: 'TARGETING_OPTIMIZATION_FAILED'
    });
  }
});

/**
 * POST /api/campaign/predict
 * Predict campaign performance
 */
app.post('/api/campaign/predict', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { budget, targeting, creative } = req.body;

    const result = await aiService.predictCampaign(budget, targeting, creative);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Campaign prediction failed', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    res.status(500).json({
      success: false,
      error: 'CAMPAIGN_PREDICTION_FAILED'
    });
  }
});

/**
 * POST /api/creative/generate
 * Generate ad creative copy
 */
app.post('/api/creative/generate', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { product, objective, audience } = req.body;

    if (!product) {
      return res.status(400).json({
        success: false,
        error: 'product is required'
      });
    }

    const result = await aiService.generateCreative(product, objective, audience);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Creative generation failed', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    res.status(500).json({
      success: false,
      error: 'CREATIVE_GENERATION_FAILED'
    });
  }
});

/**
 * POST /api/leads/score
 * Score marketing leads
 */
app.post('/api/leads/score', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({
        success: false,
        error: 'leads array is required'
      });
    }

    const result = await aiService.scoreLeads(leads);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Lead scoring failed', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    res.status(500).json({
      success: false,
      error: 'LEAD_SCORING_FAILED'
    });
  }
});

/**
 * POST /api/fraud/detect
 * Detect click fraud
 */
app.post('/api/fraud/detect', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, events } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const result = await aiService.detectFraud(userId, events);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Fraud detection failed', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    res.status(500).json({
      success: false,
      error: 'FRAUD_DETECTION_FAILED'
    });
  }
});

/**
 * POST /api/content/personalize
 * Personalize ad content
 */
app.post('/api/content/personalize', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, items } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const result = await aiService.personalizeContent(userId, items);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Content personalization failed', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    res.status(500).json({
      success: false,
      error: 'CONTENT_PERSONALIZATION_FAILED'
    });
  }
});

/**
 * POST /api/action/next-best
 * Get next best action for user
 */
app.post('/api/action/next-best', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, context } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const result = await aiService.nextBestAction(userId, context);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Next best action failed', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    res.status(500).json({
      success: false,
      error: 'NEXT_BEST_ACTION_FAILED'
    });
  }
});

/**
 * POST /api/recommendations
 * Get product recommendations
 */
app.post('/api/recommendations', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, context } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Check cache
    const cached = await cacheService.getRecommendations(userId);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // Get recommendations
    const result = await aiService.getRecommendations(userId, context);

    // Cache result
    await cacheService.setRecommendations(userId, result);

    res.json({ success: true, data: result, cached: false });
  } catch (error) {
    logger.error('Recommendations failed', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    res.status(500).json({
      success: false,
      error: 'RECOMMENDATIONS_FAILED'
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: config.nodeEnv === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown(signal: string) {
  logger.info(`[Shutdown] Received ${signal}, starting graceful shutdown...`);

  try {
    // Disconnect cache
    await cacheService.disconnect();

    logger.info('[Shutdown] Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('[Shutdown] Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============================================================================
// START SERVER
// ============================================================================

app.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                    HOJAI AI GATEWAY v1.2.0                         ║
╠══════════════════════════════════════════════════════════════════════╣
║  Port:        ${String(config.port).padEnd(47)}║
║  Environment: ${config.nodeEnv.padEnd(47)}║
╠══════════════════════════════════════════════════════════════════════╣
║  REZ INTELLIGENCE CONNECTIONS:                                     ║
║  ├─ Intent:        ${REZ_SERVICES.intent.padEnd(37)}║
║  ├─ Predictive:    ${REZ_SERVICES.predictive.padEnd(37)}║
║  ├─ Identity:      ${REZ_SERVICES.identity.padEnd(37)}║
║  ├─ Signals:       ${REZ_SERVICES.signals.padEnd(37)}║
║  ├─ Segments:      ${REZ_SERVICES.segments.padEnd(37)}║
║  ├─ Commerce:      ${REZ_SERVICES.commerce.padEnd(37)}║
║  ├─ Decision:      ${REZ_SERVICES.decision.padEnd(37)}║
║  └─ Attribution:   ${REZ_SERVICES.attribution.padEnd(37)}║
╠══════════════════════════════════════════════════════════════════════╣
║  FEATURES:                                                          ║
║  ✓ Circuit Breakers  ✓ Redis Cache     ✓ Rate Limiting              ║
║  ✓ API Auth          ✓ Prometheus      ✓ Sentry Ready                ║
╠══════════════════════════════════════════════════════════════════════╣
║  ENDPOINTS:                                                         ║
║  POST /api/intent/predict      - Intent prediction                   ║
║  POST /api/behavior/predict   - Churn & LTV prediction             ║
║  POST /api/audience/segments   - Audience segmentation              ║
║  POST /api/campaign/predict    - Campaign performance               ║
║  POST /api/leads/score         - Lead scoring                      ║
║  POST /api/fraud/detect        - Fraud detection                   ║
║  POST /api/recommendations     - Product recommendations            ║
╚══════════════════════════════════════════════════════════════════════╝
  `);

  logger.info('Hojai AI Gateway started', {
    port: config.port,
    environment: config.nodeEnv
  });
});

export default app;
