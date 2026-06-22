import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import path from 'path';

// Import routes
import preVisitRoutes from './routes/preVisitRoutes';

// Import middleware
import { errorHandler, ValidationError } from './middleware/validation';

// Import utils
import { logger, setRequestContext, clearRequestContext, enhancedLogger } from './utils/logger';

// Import services
import { preparationService } from './services/preparationService';

// ============================================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================================

dotenv.config();

const env = process.env.NODE_ENV || 'development';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  PORT: parseInt(process.env.PORT || '4600', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/pre-visit-service',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || throw new Error('JWT_SECRET environment variable is required'),
  API_VERSION: 'v1',
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100,
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SENTRY_DSN: process.env.SENTRY_DSN,
  ENABLE_METRICS: process.env.ENABLE_METRICS === 'true',
  ENABLE_TRACING: process.env.ENABLE_TRACING === 'true'
};

// ============================================================================
// REDIS CLIENT
// ============================================================================

let redisClient: Redis | null = null;

function createRedisClient(): Redis {
  const client = new Redis(CONFIG.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err: Error) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    }
  });

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('error', (err: Error) => {
    logger.error('Redis client error', { error: err.message });
  });

  client.on('reconnecting', () => {
    logger.warn('Redis client reconnecting');
  });

  return client;
}

// ============================================================================
// MONGODB CONNECTION
// ============================================================================

async function connectToMongoDB(): Promise<void> {
  try {
    const options: mongoose.ConnectionOptions = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    await mongoose.connect(CONFIG.MONGODB_URI, options);

    logger.info('Connected to MongoDB', { uri: CONFIG.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });

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
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

function createApp(): Express {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || CONFIG.CORS_ORIGINS.includes(origin) || CONFIG.CORS_ORIGINS.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy violation: ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key']
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: CONFIG.RATE_LIMIT_WINDOW,
    max: CONFIG.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'TooManyRequests',
      message: 'Too many requests, please try again later.'
    },
    keyGenerator: (req: Request) => {
      return req.headers['x-api-key'] as string ||
             req.headers['authorization']?.replace('Bearer ', '') ||
             req.ip ||
             'unknown';
    }
  });
  app.use('/api', limiter);

  // Request ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    res.setHeader('X-Request-ID', requestId);
    setRequestContext({
      requestId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      method: req.method,
      url: req.url
    });
    next();
  });

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        requestId: res.getHeader('X-Request-ID')
      };

      if (res.statusCode >= 400) {
        logger.warn('Request completed with error', logData);
      } else {
        logger.http('Request completed', logData);
      }

      clearRequestContext();
    });

    next();
  });

  // Health check endpoint
  app.get('/health', async (req: Request, res: Response) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const redisStatus = redisClient?.status === 'ready' ? 'connected' : 'disconnected';

    const health = {
      status: mongoStatus === 'connected' && redisStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'hojai-pre-visit-service',
      version: '1.0.0',
      checks: {
        mongodb: mongoStatus,
        redis: redisStatus
      }
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // Readiness check endpoint
  app.get('/ready', async (req: Request, res: Response) => {
    try {
      // Check MongoDB
      await mongoose.connection.db?.admin().ping();

      // Check Redis
      if (redisClient) {
        await redisClient.ping();
      }

      res.json({ status: 'ready' });
    } catch (error) {
      res.status(503).json({ status: 'not ready', error: String(error) });
    }
  });

  // API routes
  app.use('/api/previsit', preVisitRoutes);

  // API info endpoint
  app.get('/api', (req: Request, res: Response) => {
    res.json({
      service: 'HOJAI Pre-Visit Intelligence Service',
      version: '1.0.0',
      description: 'Dynamic questions and preparation for doctor visits',
      endpoints: {
        preparation: '/api/previsit/preparation',
        questions: '/api/previsit/questions/:visitId',
        symptoms: '/api/previsit/symptoms/:patientId',
        vitals: '/api/previsit/vitals/:patientId',
        history: '/api/previsit/history/:patientId',
        checklist: '/api/previsit/checklist/:prepId',
        summary: '/api/previsit/summary/:visitId',
        reminders: '/api/previsit/reminders/:patientId'
      }
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'NotFound',
      message: `Route ${req.method} ${req.path} not found`
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}

// ============================================================================
// SCHEDULED TASKS
// ============================================================================

function setupScheduledTasks(): void {
  // Send task reminders every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const sentCount = await preparationService.sendTaskReminders();
      if (sentCount > 0) {
        logger.info('Sent task reminders', { count: sentCount });
      }
    } catch (error) {
      logger.error('Error sending task reminders', { error });
    }
  });

  // Log system stats every hour
  cron.schedule('0 * * * *', () => {
    const memUsage = process.memoryUsage();
    logger.info('System stats', {
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      }
    });
  });

  // Clear old vitals daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      // This would clear old vitals for all patients
      // Implementation would iterate through patients
      logger.info('Running daily maintenance task');
    } catch (error) {
      logger.error('Error in daily maintenance', { error });
    }
  });

  logger.info('Scheduled tasks configured');
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB', { error });
  }

  // Close Redis connection
  if (redisClient) {
    redisClient.disconnect();
    logger.info('Redis connection closed');
  }

  // Exit
  process.exit(0);
}

// ============================================================================
// SERVER INSTANCE
// ============================================================================

let server: ReturnType<Express['listen']>;

// ============================================================================
// START SERVER
// ============================================================================

async function startServer(): Promise<void> {
  try {
    // Log startup info
    logger.info('Starting HOJAI Pre-Visit Intelligence Service', {
      nodeEnv: env,
      port: CONFIG.PORT,
      nodeVersion: process.version
    });

    // Connect to MongoDB
    await connectToMongoDB();

    // Initialize Redis
    try {
      redisClient = createRedisClient();
    } catch (error) {
      logger.warn('Redis not available, continuing without cache', { error });
    }

    // Create Express app
    const app = createApp();

    // Setup scheduled tasks
    setupScheduledTasks();

    // Start HTTP server
    server = app.listen(CONFIG.PORT, () => {
      logger.info(`Server running on port ${CONFIG.PORT}`, {
        environment: env,
        port: CONFIG.PORT,
        pid: process.pid
      });
    });

    // Handle server errors
    server.on('error', (error: Error) => {
      if (error.message.includes('EADDRINUSE')) {
        logger.error(`Port ${CONFIG.PORT} is already in use`);
      } else {
        logger.error('Server error', { error });
      }
      process.exit(1);
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled rejection', { reason, promise });
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export { createApp, connectToMongoDB, CONFIG };
export default startServer;

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

if (require.main === module) {
  startServer();
}
