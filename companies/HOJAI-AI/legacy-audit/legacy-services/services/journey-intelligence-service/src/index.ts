/**
 * HOJAI Journey Intelligence Service
 * Main entry point - Port 4594
 *
 * Cross-business customer journey tracking and analytics service
 * Part of RTNM Group's HOJAI AI Infrastructure
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

import logger from './utils/logger';
import journeyRoutes from './routes/journeyRoutes';
import { CustomerProfile } from './models';

// Environment variables
const PORT = parseInt(process.env.PORT || '4594', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/journey_intelligence';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Service metadata
const SERVICE_NAME = 'hojai-journey-intelligence-service';
const SERVICE_VERSION = '1.0.0';

// Create Express app
const app: Express = express();

// ==================== Middleware ====================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
  });
  next();
});

// ==================== Routes ====================

// Mount journey routes
app.use('/journey', journeyRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    description: 'Cross-business customer journey intelligence service',
    documentation: '/journey/health',
    endpoints: {
      health: 'GET /journey/health',
      domains: 'GET /journey/domains',
      eventTypes: 'GET /journey/event-types',
      trackEvent: 'POST /journey/event',
      batchTrack: 'POST /journey/events/batch',
      getJourney: 'GET /journey/:customerId',
      getTimeline: 'GET /journey/:customerId/timeline',
      getAnalytics: 'GET /journey/:customerId/analytics',
      analyze: 'POST /journey/:customerId/analyze',
      churnPrediction: 'GET /journey/:customerId/churn',
      ltvCalculation: 'GET /journey/:customerId/ltv',
      crossBusiness: 'GET /journey/:customerId/cross-business',
      recommendations: 'GET /journey/:customerId/recommendations',
      summary: 'GET /journey/:customerId/summary',
    },
  });
});

// Service info endpoint
app.get('/service-info', (_req: Request, res: Response) => {
  res.json({
    name: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    environment: NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ==================== Error Handling ====================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// ==================== Database Connection ====================

async function connectDatabase(): Promise<void> {
  try {
    logger.info('Connecting to MongoDB...', { uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });

    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('MongoDB connected successfully');

    // Create indexes
    await createIndexes();
  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    throw error;
  }
}

async function createIndexes(): Promise<void> {
  try {
    // Ensure indexes exist
    await CustomerProfile.ensureIndexes();
    logger.info('Database indexes ensured');
  } catch (error) {
    logger.warn('Error creating indexes (may already exist)', { error });
  }
}

// ==================== Graceful Shutdown ====================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connection
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error });
  }

  // Exit process
  setTimeout(() => {
    logger.info('Forcing exit');
    process.exit(1);
  }, 10000);

  process.exit(0);
}

// ==================== Server Startup ====================

let server: ReturnType<Express['listen']>;

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    server = 

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'journey-intelligence-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
app.listen(PORT, () => {
      logger.info(`${SERVICE_NAME} started successfully`, {
        port: PORT,
        environment: NODE_ENV,
        version: SERVICE_VERSION,
        nodeVersion: process.version,
        pid: process.pid,
      });

      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 HOJAI Journey Intelligence Service                   ║
║                                                           ║
║   Status: Running                                         ║
║   Port: ${PORT}                                              ║
║   Environment: ${NODE_ENV.padEnd(40)}║
║   Version: ${SERVICE_VERSION.padEnd(43)}║
║                                                           ║
║   Endpoints:                                              ║
║   • GET  /journey/health                                  ║
║   • POST /journey/event                                   ║
║   • GET  /journey/:customerId                             ║
║   • GET  /journey/:customerId/analytics                  ║
║   • GET  /journey/:customerId/churn                       ║
║   • GET  /journey/:customerId/ltv                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    // Handle server errors
    server.on('error', (error: Error) => {
      logger.error('Server error', { error: error.message });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { reason });
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

export { app };
