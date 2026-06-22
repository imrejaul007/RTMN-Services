/**
 * HOJAI Commerce Intelligence - Main Server
 * Commercial E-commerce AI for Businesses
 */

import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuid } from 'uuid';

// Routes
import behaviorRoutes from './routes/behavior.js';
import predictionRoutes from './routes/predictions.js';
import recommendationRoutes from './routes/recommendations.js';
import analyticsRoutes from './routes/analytics.js';

import { createLogger } from './utils/logger.js';

const logger = createLogger('server');
const PORT = process.env.PORT || 4750;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-commerce-intelligence';

// Environment check
const isProduction = process.env.NODE_ENV === 'production';

// Create Express app
const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Request-Id']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || uuid();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('request_completed', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration
    });
  });

  res.setHeader('X-Request-ID', requestId);
  next();
});

// ============================================================================
// HEALTH CHECKS
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-commerce-intelligence',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const isReady = mongoStatus === 'connected';

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    checks: {
      mongodb: mongoStatus
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Behavior routes
app.use('/api/behavior', behaviorRoutes);

// Prediction routes
app.use('/api/predictions', predictionRoutes);

// Recommendation routes
app.use('/api/recommendations', recommendationRoutes);

// Analytics routes
app.use('/api/analytics', analyticsRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    }
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('unhandled_error', {
    error: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.path
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Internal server error' : err.message
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    }
  });
});

// ============================================================================
// DATABASE & SERVER
// ============================================================================

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    logger.info('mongodb_connected', { uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });

    mongoose.connection.on('error', (err) => {
      logger.error('mongodb_error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('mongodb_disconnected');
    });
  } catch (error) {
    logger.error('mongodb_connection_failed', { error: (error as Error).message });
    throw error;
  }
}

async function startServer(): Promise<void> {
  logger.info('server_starting', { port: PORT });

  try {
    await connectDatabase();

    app.listen(PORT, () => {
      logger.info('server_started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      });
      console.log(`\n🏪 HOJAI Commerce Intelligence`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   Ready: http://localhost:${PORT}/ready`);
    });
  } catch (error) {
    logger.error('server_start_failed', { error: (error as Error).message });
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info('server_shutting_down', { signal });

  try {
    await mongoose.disconnect();
    logger.info('mongodb_disconnected');
  } catch (error) {
    logger.error('shutdown_error', { error: (error as Error).message });
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { reason });
  process.exit(1);
});

// Start the server
startServer();

export default app;
