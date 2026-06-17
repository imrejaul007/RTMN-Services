/**
 * Intent Signal Aggregator Service
 *
 * Collects, normalizes, and enriches intent signals from the REZ ecosystem.
 * Powers the Intent Exchange for AdBazaar.
 *
 * Features:
 * - Signal ingestion from multiple sources
 * - Real-time signal enrichment
 * - Audience signal intelligence
 * - Redis caching for performance
 * - MongoDB for persistence
 *
 * Port: 4800
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import config and services
import { config, validateConfig } from './config/index.js';
import { connectDatabase, disconnectDatabase, getConnectionStatus } from './config/database.js';
import { connectRedis, disconnectRedis, getRedisClient } from './config/redis.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler, ValidationError, asyncHandler } from './middleware/errorHandler.js';
import signalRoutes from './routes/signalRoutes.js';
import { metrics } from './services/metrics.js';

// Validate configuration
validateConfig();

// Create Express app
const app: Express = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Service-Key', 'X-Request-ID'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// REQUEST LOGGING & METRICS
// ============================================================================

app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();

  _res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: _res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Record HTTP metrics
    metrics.httpRequestsTotal.inc({
      method: req.method,
      route: req.path,
      status_code: _res.statusCode.toString(),
    });
  });

  next();
});

// ============================================================================
// HEALTH CHECKS
// ============================================================================

/**
 * GET /health
 * Basic health check
 */
app.get('/health', async (_req: Request, res: Response) => {
  const dbStatus = getConnectionStatus();
  const redis = getRedisClient();
  const redisStatus = redis?.status === 'ready' ? 'connected' : 'disconnected';
  const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
    uptime: process.uptime(),
  });
});

/**
 * GET /health/live
 * Liveness probe - is the process alive?
 */
app.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness probe - is the service ready to accept traffic?
 */
app.get('/health/ready', async (_req: Request, res: Response) => {
  const dbStatus = getConnectionStatus();

  if (dbStatus === 'connected') {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'Database not connected' });
  }
});

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', metrics.register.contentType);
    res.end(await metrics.register.metrics());
  } catch (error) {
    logger.error('Failed to get metrics', { error });
    res.status(500).end();
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

// Signal routes
app.use('/api/signals', signalRoutes);

// API info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'Intent Signal Aggregator',
    version: '1.2.0',
    description: 'Collects, normalizes, and enriches intent signals from REZ ecosystem',
    endpoints: {
      ingest: 'POST /api/signals/ingest',
      batch: 'POST /api/signals/batch',
      stats: 'GET /api/signals/stats',
      userSignals: 'GET /api/signals/user/:userId',
      signalById: 'GET /api/signals/:signalId',
      signalsBySource: 'GET /api/signals/source/:source',
    },
    sources: [
      'buzzlocal',
      'airzy',
      'rez-menu-qr',
      'rez-now',
      'risacare',
      'corpperks',
    ],
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

let server: ReturnType<Express['listen']> | null = null;

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Close HTTP server
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
      logger.info('HTTP server closed');
    }

    // Close database connection
    await disconnectDatabase();
    await disconnectRedis();

    logger.info('All connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

// ============================================================================
// START SERVER
// ============================================================================

async function start() {
  try {
    // Validate config
    validateConfig();

    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await connectDatabase();
    logger.info('MongoDB connected');

    // Initialize Redis
    logger.info('Connecting to Redis...');
    connectRedis();
    logger.info('Redis initialized');

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`Intent Signal Aggregator started`, {
        port: config.port,
        env: config.nodeEnv,
        nodeVersion: process.version,
      });
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`Metrics: http://localhost:${config.port}/metrics`);
      logger.info(`API docs: http://localhost:${config.port}/api`);
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

start();

export default app;
