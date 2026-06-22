/**
 * HOJAI Assessment Service
 *
 * Formal Health Assessment Service providing standardized clinical assessments:
 * - MUST (Malnutrition Universal Screening Tool)
 * - Braden Scale (Pressure Ulcer Risk)
 * - Morse Fall Scale
 * - PHQ-9 (Depression Screening)
 * - GAD-7 (Anxiety Screening)
 * - Barthel Index, MMSE, WATERLOW, and general assessments
 *
 * Port: 4605
 * Parent: HOJAI AI - RisaCare Division
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes and services
import assessmentRoutes from './routes/assessmentRoutes';
import { templateService } from './services/templateService';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/validation';

// Environment configuration
const CONFIG = {
  PORT: parseInt(process.env.PORT || '4605', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  SERVICE_NAME: process.env.SERVICE_NAME || 'hojai-assessment-service',

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-assessment',

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  // Rate limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
};

// Global instances
let redisClient: Redis | null = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
async function initializeRedis(): Promise<void> {
  try {
    redisClient = new Redis({
      host: CONFIG.REDIS_HOST,
      port: CONFIG.REDIS_PORT,
      password: CONFIG.REDIS_PASSWORD,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis connection failed, proceeding without cache');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true
    });

    redisClient.on('error', (err) => {
      logger.warn('Redis connection error', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    await redisClient.connect();
  } catch (error) {
    logger.warn('Redis initialization failed, proceeding without cache', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    redisClient = null;
  }
}

/**
 * Initialize MongoDB connection
 */
async function initializeMongoDB(): Promise<void> {
  const mongoOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  };

  try {
    await mongoose.connect(CONFIG.MONGODB_URI, mongoOptions);
    logger.info('MongoDB connected', { uri: CONFIG.MONGODB_URI.replace(/\/\/.*@/, '//[credentials]@') });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

    isConnected = true;
  } catch (error) {
    logger.error('MongoDB connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Create Express application
 */
function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    maxAge: 86400
  }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: CONFIG.RATE_LIMIT_WINDOW,
    max: CONFIG.RATE_LIMIT_MAX,
    message: {
      success: false,
      error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    next();
  });

  // Health check (before other routes)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: CONFIG.SERVICE_NAME,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      connections: {
        mongodb: isConnected,
        redis: redisClient?.status === 'ready'
      }
    });
  });

  // Readiness check
  app.get('/ready', (_req: Request, res: Response) => {
    if (!isConnected) {
      return res.status(503).json({
        status: 'not ready',
        reason: 'Database connection not established'
      });
    }
    res.json({ status: 'ready' });
  });

  // API routes
  app.use('/assessments', assessmentRoutes);

  // API documentation endpoint
  app.get('/api', (_req: Request, res: Response) => {
    res.json({
      name: CONFIG.SERVICE_NAME,
      version: '1.0.0',
      description: 'Formal Health Assessment Service',
      endpoints: {
        assessments: {
          'POST /assessments': 'Create a new assessment',
          'GET /assessments/:assessmentId': 'Get assessment by ID',
          'GET /assessments/patient/:patientId': 'Get patient assessments',
          'GET /assessments/patient/:patientId/:type': 'Get assessments by type',
          'GET /assessments/:assessmentId/trend': 'Get assessment trend'
        },
        templates: {
          'POST /assessments/templates': 'Create template',
          'GET /assessments/templates/:type': 'Get template by type',
          'GET /assessments/templates': 'List templates',
          'PUT /assessments/templates/:templateId': 'Update template'
        },
        analysis: {
          'GET /assessments/analysis/trends/:patientId/:type': 'Trend analysis',
          'GET /assessments/analysis/predict/:patientId/:type': 'Decline prediction',
          'GET /assessments/analysis/reassess/:patientId/:type': 'Reassessment recommendation',
          'GET /assessments/analysis/overview/:patientId': 'Patient overview'
        }
      },
      assessmentTypes: [
        'MUST',
        'Braden',
        'WATERLOW',
        'Morse_Fall',
        'Barthel_Index',
        'MMSE',
        'PHQ9',
        'GAD7',
        'General'
      ]
    });
  });

  // Error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Close MongoDB
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB', { error: error instanceof Error ? error.message : 'Unknown' });
  }

  // Close Redis
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis', { error: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  process.exit(0);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  logger.info('Starting HOJAI Assessment Service', {
    environment: CONFIG.NODE_ENV,
    port: CONFIG.PORT
  });

  try {
    // Initialize MongoDB
    await initializeMongoDB();

    // Initialize Redis (optional, service can work without it)
    await initializeRedis();

    // Initialize default templates
    try {
      await templateService.initializeDefaultTemplates();
      logger.info('Default templates initialized');
    } catch (error) {
      logger.warn('Could not initialize templates', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }

    // Create and start Express app
    const app = createApp();

    const server = app.listen(CONFIG.PORT, () => {
      logger.info(`Server running on port ${CONFIG.PORT}`, {
        environment: CONFIG.NODE_ENV,
        pid: process.pid
      });
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined
      });
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.fatal('Uncaught Exception', { error: error.message, stack: error.stack });
      gracefulShutdown('uncaughtException');
    });

  } catch (error) {
    logger.fatal('Failed to start service', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { createApp, CONFIG };
