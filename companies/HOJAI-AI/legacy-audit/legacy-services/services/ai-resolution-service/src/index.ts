import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import resolutionRoutes from './routes/resolutionRoutes';
import { errorHandler, notFoundHandler, requestIdMiddleware } from './middleware/validation';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['PORT', 'MONGODB_URI', 'AI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.warn('Missing environment variables', { missing: missingEnvVars });
}

// Initialize Express app
const app: Application = express();
const PORT = parseInt(process.env.PORT || '4596', 10);

// Redis client for caching
let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true
  });

  redisClient.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
  });
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-User-ID']
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use(requestIdMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.headers['x-api-key'] as string || req.ip || 'unknown';
  }
});

app.use('/api/', limiter);

// Stricter rate limit for AI generation endpoints
const aiLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: parseInt(process.env.AI_RATE_LIMIT_MAX || '20', 10),
  message: {
    success: false,
    error: 'AI generation rate limit exceeded, please try again later'
  },
  keyGenerator: (req: Request) => {
    return req.headers['x-api-key'] as string || req.ip || 'unknown';
  }
});

app.use('/resolution/generate', aiLimiter);
app.use('/resolution/analyze', aiLimiter);

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, `${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      requestId: req.headers['x-request-id'],
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
  });

  next();
});

// Health check endpoint (before routes)
app.get('/health', (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = redisClient?.status === 'ready' ? 'connected' : 'disconnected';

  res.json({
    status: 'healthy',
    service: 'hojai-ai-resolution-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    dependencies: {
      mongodb: mongoStatus,
      redis: redisStatus
    },
    uptime: process.uptime()
  });
});

// Readiness check
app.get('/ready', (req: Request, res: Response) => {
  const isReady = mongoose.connection.readyState === 1;

  if (isReady) {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      reason: 'Database connection not established',
      timestamp: new Date().toISOString()
    });
  }
});

// Mount routes
app.use('/resolution', resolutionRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// MongoDB connection
const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai_resolution';

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    logger.info('Connected to MongoDB', { uri: mongoUri.replace(/\/\/.*@/, '//<credentials>@') });

    // Create indexes
    await createIndexes();
  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    process.exit(1);
  }
};

// Create database indexes
const createIndexes = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    // Issues collection indexes
    await db.collection('issues').createIndex({ issueId: 1 }, { unique: true });
    await db.collection('issues').createIndex({ customerId: 1, createdAt: -1 });
    await db.collection('issues').createIndex({ status: 1, priority: 1 });
    await db.collection('issues').createIndex({ agentId: 1, status: 1 });

    // Resolution plans collection indexes
    await db.collection('resolution_plans').createIndex({ planId: 1 }, { unique: true });
    await db.collection('resolution_plans').createIndex({ issueId: 1, status: 1 });
    await db.collection('resolution_plans').createIndex({ customerId: 1, createdAt: -1 });
    await db.collection('resolution_plans').createIndex({ assignedAgentId: 1, status: 1 });
    await db.collection('resolution_plans').createIndex({ category: 1, status: 1 });

    // Resolution templates collection indexes
    await db.collection('resolution_templates').createIndex({ templateId: 1 }, { unique: true });
    await db.collection('resolution_templates').createIndex({ category: 1, isActive: 1 });
    await db.collection('resolution_templates').createIndex({ applicableCategories: 1, applicablePriorities: 1 });
    await db.collection('resolution_templates').createIndex({ usageCount: -1, successRate: -1 });

    // Resolution history collection indexes
    await db.collection('resolution_history').createIndex({ historyId: 1 }, { unique: true });
    await db.collection('resolution_history').createIndex({ planId: 1 });
    await db.collection('resolution_history').createIndex({ customerId: 1, createdAt: -1 });
    await db.collection('resolution_history').createIndex({ category: 1, priority: 1 });

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes', { error });
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error });
  }

  // Close Redis connection
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }

  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

// Start server
let server: ReturnType<Application['listen']>;

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();

    // Connect to Redis
    if (redisClient) {
      await redisClient.connect();
    }

    // Start listening
    server = app.listen(PORT, () => {
      logger.info(`HOJAI AI Resolution Service started`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid
      });

      logger.info(`API Endpoints available at http://localhost:${PORT}/resolution`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Ready check: http://localhost:${PORT}/ready`);
    });

    // Configure server timeouts
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Start the application
startServer();

export { app, redisClient };
