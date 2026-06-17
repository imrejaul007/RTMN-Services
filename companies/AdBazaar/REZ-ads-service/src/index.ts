/**
 * REZ Ads Service
 *
 * Core ad serving and campaign management service for AdBazaar.
 *
 * Port: 4007
 *
 * Features:
 * - Ad serving and delivery
 * - Campaign management
 * - Click tracking and attribution
 * - Billing and payments
 * - Click fraud detection
 * - Re-engagement automation
 * - Intent capture
 *
 * NOTE: This is a TypeScript rewrite of the original JavaScript service.
 *       Key services have been converted with proper typing.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Sentry from '@sentry/node';
import 'express-async-errors';
import promClient from 'prom-client';
import rateLimit from 'express-rate-limit';
import winston from 'winston';

import { logger } from './utils/logger.js';
import { connectDB, getRedis, validateEnv } from './config/database.js';
import { setupExpressErrorHandler } from './middleware/errorHandler.js';
import { verifyInternal, verifyAdmin } from './middleware/auth.js';

// Routes
import merchantRoutes from './routes/merchant.js';
import adminRoutes from './routes/admin.js';
import interactionRoutes from './routes/interaction.js';
import serveRoutes from './routes/serve.js';
import adbazaarRoutes from './routes/adbazaar.js';
import conversionRoutes from './routes/conversion.js';

// Services
import { startReengagementScheduler, stopReengagementScheduler } from './services/reEngagementService.js';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [],
  environment: process.env.NODE_ENV,
});

// Prometheus
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Load environment
dotenv.config();

// Validate environment
validateEnv();

// Create Express app
const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security
app.use(helmet());
app.use(mongoSanitize());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT || '1000'),
  message: { error: 'Too many requests' },
});
app.use(limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ============================================================================
// HEALTH CHECKS
// ============================================================================

app.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
  let isHealthy = true;

  // MongoDB check
  const mongoStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
  checks.mongodb = { status: mongoStatus };
  if (mongoStatus !== 'up') isHealthy = false;

  // Redis check
  try {
    const redis = getRedis();
    if (redis.status !== 'ready') throw new Error('Redis not ready');
    await redis.ping();
    checks.redis = { status: 'up', latencyMs: 0 };
  } catch (err) {
    checks.redis = {
      status: 'down',
      error: err instanceof Error ? err.message : String(err)
    };
    isHealthy = false;
  }

  const overallStatus = isHealthy ? 'healthy' : 'unhealthy';
  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '1.0.0',
    uptime: process.uptime(),
    checks,
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisReady = getRedis().status === 'ready';

  if (mongoReady && redisReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({
      status: 'not ready',
      mongodb: mongoReady,
      redis: redisReady
    });
  }
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ============================================================================
// API ROUTES
// ============================================================================

// Merchant routes
app.use('/merchant/ads', merchantRoutes);

// Admin routes
app.use('/admin/ads', verifyAdmin, adminRoutes);

// Interaction routes (click tracking, etc.)
app.use('/ads', interactionRoutes);

// Ad serving routes
app.use('/ads', serveRoutes);

// AdBazaar routes
app.use('/', adbazaarRoutes);

// Conversion routes
app.use('/', conversionRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

setupExpressErrorHandler(app);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('[API] Unhandled error', { err: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// BOOT & SHUTDOWN
// ============================================================================

async function boot() {
  try {
    // Validate environment
    validateEnv();

    // Connect to MongoDB
    await connectDB();

    // Connect to Redis
    const redis = getRedis();
    if (redis.status !== 'ready') {
      throw new Error('Redis not ready');
    }
    await redis.ping();

    // Start re-engagement scheduler
    await startReengagementScheduler();

    // Start server
    const PORT = parseInt(process.env.PORT || '4007', 10);
    const server = app.listen(PORT, () => {
      logger.info(`[Boot] REZ Ads Service listening on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`[Shutdown] ${signal} received — shutting down gracefully`);

      await stopReengagementScheduler();

      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });

      await mongoose.disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason)
      });
    });

  } catch (err) {
    logger.error('[Boot] Fatal startup error', err);
    process.exit(1);
  }
}

boot();

export default app;
