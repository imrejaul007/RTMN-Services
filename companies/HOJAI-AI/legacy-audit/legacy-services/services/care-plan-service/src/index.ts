import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import cron from 'node-cron';
import path from 'path';
import dotenv from 'dotenv';

import planRoutes from './routes/planRoutes';
import { logger } from './utils/logger';
import { notificationService } from './services/notificationService';
import { goalTrackingService } from './services/goalTrackingService';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 4601;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/careplan';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Service-Name'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Stricter rate limit for write operations
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: {
    success: false,
    error: 'Too many write requests, please slow down.',
  },
});

app.use('/api/plans', writeLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check (no prefix)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'care-plan-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Readiness check
app.get('/ready', async (req: Request, res: Response) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const isMongoReady = mongoState === 1;

    if (isMongoReady) {
      res.json({
        status: 'ready',
        mongodb: 'connected',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        mongodb: mongoState === 0 ? 'disconnected' : 'connecting',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes
app.use('/api', planRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
  });

  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

async function connectDatabase(): Promise<void> {
  try {
    logger.info('Connecting to MongoDB...', { uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });

    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: (error as Error).message });
    process.exit(1);
  }
}

// ============================================================================
// CRON JOBS
// ============================================================================

function setupCronJobs(): void {
  // Process review reminders every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Running review reminder cron job');
    try {
      const result = await notificationService.processReviewReminders();
      logger.info('Review reminder cron completed', {
        processed: result.processed,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (error) {
      logger.error('Review reminder cron failed', { error: (error as Error).message });
    }
  });

  // Update overdue goal statuses every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running overdue goal status update');
    try {
      const result = await goalTrackingService.updateOverdueGoalStatuses();
      logger.info('Overdue goal status update completed', { updated: result.updated });
    } catch (error) {
      logger.error('Overdue goal status update failed', { error: (error as Error).message });
    }
  });

  // Bulk goal status check every day at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily bulk goal status check');
    try {
      const updated = await goalTrackingService.updateOverdueGoalStatuses();
      if (updated.updated > 0) {
        logger.info('Daily bulk check found overdue goals', { count: updated.updated });
      }
    } catch (error) {
      logger.error('Daily bulk check failed', { error: (error as Error).message });
    }
  });

  logger.info('Cron jobs scheduled');
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Setup cron jobs
    setupCronJobs();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Care Plan Service started`, {
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
      });

      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   CARE PLAN SERVICE                          ║
╠══════════════════════════════════════════════════════════════╣
║  Status:    RUNNING                                          ║
║  Port:      ${PORT}                                             ║
║  Env:       ${NODE_ENV.padEnd(46)}║
║  MongoDB:   ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@').padEnd(46)}║
╚══════════════════════════════════════════════════════════════╝

Available endpoints:
  GET  /health                    - Health check
  GET  /ready                     - Readiness check
  POST /api/plans                 - Create care plan
  GET  /api/plans                 - List care plans
  GET  /api/plans/:planId         - Get care plan
  PUT  /api/plans/:planId         - Update care plan
  POST /api/plans/:planId/goals   - Add goal
  PUT  /api/plans/:planId/goals/:goalId - Update goal
  GET  /api/plans/:planId/insights - AI insights
  ...
`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await mongoose.connection.close();
          logger.info('MongoDB connection closed');
        } catch (error) {
          logger.error('Error closing MongoDB connection', { error: (error as Error).message });
        }

        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
