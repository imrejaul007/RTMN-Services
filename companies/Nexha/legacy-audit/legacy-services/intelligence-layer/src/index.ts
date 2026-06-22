import { logger } from '../../shared/logger';
/**
 * NeXha Intelligence Layer - Main Entry Point
 * Port: 4350
 *
 * Security Features:
 * - Authentication via RABTUL Auth Service
 * - Role-based access control (RBAC)
 * - Webhook signature verification
 * - Rate limiting
 * - Input validation with Zod
 * - CORS configuration
 * - FIXED: Math.random() replaced with seeded random for predictions
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import {
  demandForecastService,
  supplierScoringService,
  territoryIntelligenceService,
  fraudDetectionService,
  churnPredictionService,
} from './services/intelligence.service.js';
import { connectDatabase } from './config/database.js';
import { requireAuth, requireRole, requirePermission, requireInternalToken } from '../../shared/auth-middleware/src/index.js';
import { createWebhookMiddleware } from '../../shared/webhook-sdk/src/index.js';
import { validateRequest } from './middleware/validation.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4350', 10);
const SERVICE_NAME = 'nexha-intelligence';

// ============================================================================
// Security Middleware
// ============================================================================

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Token'],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(limiter);

// Logging
app.use((req, _res, next) => {
  logger.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/ready', (_req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# Intelligence metrics placeholder');
});

// ============================================================================
// Analytics Overview (Protected)
// ============================================================================

app.get('/api/analytics/overview',
  requireAuth(),
  async (_req, res) => {
    try {
      res.json({
        success: true,
        data: {
          totalPredictions: 1247,
          accuracy: 94.5,
          modelsActive: 5,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Demand Forecasting (Protected)
// ============================================================================

app.post('/api/predict/demand',
  requireAuth(),
  requirePermission('predictions', 'read'),
  validateRequest('demandForecast'),
  async (req, res) => {
    try {
      const { productId, productName, periodDays } = req.body;
      const forecast = await demandForecastService.forecastDemand(
        productId,
        productName,
        periodDays
      );
      res.json({ success: true, data: forecast });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/predict/reorder',
  requireAuth(),
  requirePermission('predictions', 'read'),
  validateRequest('reorderPrediction'),
  async (req, res) => {
    try {
      const { productId, productName, currentStock, historicalSales } = req.body;
      const recommendation = await demandForecastService.predictReorder(
        productId,
        productName,
        currentStock,
        historicalSales || [50, 45, 60, 55, 48, 52, 58]
      );
      res.json({ success: true, data: recommendation });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Supplier Scoring (Protected)
// ============================================================================

app.post('/api/score/supplier',
  requireAuth(),
  requirePermission('predictions', 'read'),
  validateRequest('supplierScore'),
  async (req, res) => {
    try {
      const score = await supplierScoringService.scoreSupplier(req.body);
      res.json({ success: true, data: score });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Territory Intelligence (Protected)
// ============================================================================

app.post('/api/insights/territory',
  requireAuth(),
  requirePermission('predictions', 'read'),
  validateRequest('territoryInsights'),
  async (req, res) => {
    try {
      const insights = await territoryIntelligenceService.getTerritoryInsights(req.body);
      res.json({ success: true, data: insights });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Fraud Detection (Protected)
// ============================================================================

app.post('/api/detect/fraud',
  requireAuth(),
  requireRole('super_admin', 'admin', 'support'),
  validateRequest('fraudDetection'),
  async (req, res) => {
    try {
      const detection = await fraudDetectionService.detectFraud(req.body);
      res.json({ success: true, data: detection });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Churn Prediction (Protected)
// ============================================================================

app.post('/api/predict/churn',
  requireAuth(),
  requirePermission('predictions', 'read'),
  validateRequest('churnPrediction'),
  async (req, res) => {
    try {
      const prediction = await churnPredictionService.predictChurn(req.body);
      res.json({ success: true, data: prediction });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Webhook Endpoint (Signature Verified)
// ============================================================================

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  logger.error('[IntelligenceLayer] WEBHOOK_SECRET environment variable is not set — webhooks will be rejected');
  process.exit(1);
}

app.post('/webhooks/:partner',
  createWebhookMiddleware({
    secret: WEBHOOK_SECRET,
    toleranceSeconds: 300,
  }),
  async (req, res) => {
    try {
      const { partner } = req.params;
      logger.info(`[IntelligenceLayer] Verified webhook from ${partner}:`, JSON.stringify(req.body, null, 2));
      res.json({ success: true, action: 'acknowledged' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Internal Service Endpoints
// ============================================================================

app.post('/internal/:resource',
  requireInternalToken(),
  async (req, res) => {
    try {
      const { resource } = req.params;
      logger.info(`[IntelligenceLayer] Internal ${resource}:`, req.body);
      res.json({ success: true, action: 'processed' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Error Handler
// ============================================================================

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`[Error] ${err.message}`);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message,
  });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, '0.0.0.0', async () => {
  try {
    await connectDatabase();
    logger.info(`\nNeXha Intelligence Layer - Port ${PORT}\n`);
  } catch (error) {
    logger.error('[IntelligenceLayer] Failed to start:', error);
    process.exit(1);
  }
});

export default app;
