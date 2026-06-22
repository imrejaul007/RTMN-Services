import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import Redis from 'ioredis';

// Load environment variables
dotenv.config();

// Import routes and services
import handoverRoutes from './routes/handoverRoutes';
import { logger } from './utils/logger';
import { ShiftHandover, HandoverTemplate, ArchivedHandover } from './models/handover';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 4603;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shift-handover';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    // Check Redis connection
    let redisStatus = 'disconnected';
    try {
      if (redisClient.status === 'ready') {
        redisStatus = 'connected';
      }
    } catch {
      redisStatus = 'error';
    }

    // Get collection stats
    let handoverCount = 0;
    let templateCount = 0;
    let archivedCount = 0;

    try {
      handoverCount = await ShiftHandover.countDocuments();
      templateCount = await HandoverTemplate.countDocuments();
      archivedCount = await ArchivedHandover.countDocuments();
    } catch {
      // Ignore errors during health check
    }

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'hojai-shift-handover-service',
      port: PORT,
      connections: {
        mongodb: mongoStatus,
        redis: redisStatus
      },
      stats: {
        handovers: handoverCount,
        templates: templateCount,
        archived: archivedCount
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Service unavailable'
    });
  }
});

// Readiness check endpoint
app.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if MongoDB is ready
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        ready: false,
        error: 'MongoDB not connected'
      });
    }

    // Check if Redis is ready
    if (redisClient.status !== 'ready') {
      return res.status(503).json({
        success: false,
        ready: false,
        error: 'Redis not connected'
      });
    }

    res.json({
      success: true,
      ready: true
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      ready: false,
      error: 'Service not ready'
    });
  }
});

// API routes
app.use('/api/v1', handoverRoutes);

// API documentation endpoint
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'HOJAI Shift Handover Service',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      handovers: {
        'POST /api/v1/handovers': 'Create a new handover',
        'GET /api/v1/handovers/:handoverId': 'Get handover by ID',
        'GET /api/v1/handovers/date/:date': 'Get handovers by date',
        'GET /api/v1/handovers/pending/:userId': 'Get pending handovers for user',
        'PUT /api/v1/handovers/:handoverId/patient': 'Add patient update',
        'PUT /api/v1/handovers/:handoverId/task': 'Add task',
        'PUT /api/v1/handovers/:handoverId/alert': 'Add alert',
        'PUT /api/v1/handovers/:handoverId/acknowledge': 'Acknowledge handover',
        'PUT /api/v1/handovers/:handoverId/complete': 'Complete handover',
        'GET /api/v1/handovers/search': 'Search handovers',
        'GET /api/v1/handovers/stats': 'Get handover statistics'
      },
      templates: {
        'POST /api/v1/templates': 'Create template',
        'GET /api/v1/templates/:templateId': 'Get template',
        'GET /api/v1/templates/facility/:facilityId': 'Get facility templates',
        'PUT /api/v1/templates/:templateId': 'Update template',
        'POST /api/v1/templates/:templateId/apply/:handoverId': 'Apply template',
        'POST /api/v1/templates/:templateId/duplicate': 'Duplicate template',
        'DELETE /api/v1/templates/:templateId': 'Delete template'
      },
      archive: {
        'POST /api/v1/archive/:handoverId': 'Archive handover',
        'GET /api/v1/archive/:archiveId': 'Get archived handover',
        'POST /api/v1/archive/:archiveId/restore': 'Restore archived handover',
        'GET /api/v1/reports/shift': 'Generate shift report',
        'POST /api/v1/archive/auto-cleanup': 'Auto-archive old handovers'
      },
      health: {
        'GET /health': 'Health check',
        'GET /ready': 'Readiness check'
      }
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================================================
// REDIS CLIENT
// ============================================================================

const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});

// ============================================================================
// MONGODB CONNECTION
// ============================================================================

const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

// Mongoose event handlers
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, starting graceful shutdown`);

  try {
    // Close Redis
    await redisClient.quit();
    logger.info('Redis connection closed');

    // Close MongoDB
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Connect to Redis
    await redisClient.connect();

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`HOJAI Shift Handover Service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API docs: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// ============================================================================
// EXPORTS (for testing)
// ============================================================================

export { app, redisClient };
export default app;
