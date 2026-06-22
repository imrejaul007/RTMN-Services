import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import Redis from 'ioredis';

import incidentRoutes from './routes/incidentRoutes';
import { logger, logSecurityEvent, logPerformanceMetric } from './utils/logger';

// Load environment variables
dotenv.config();

// ==================== CONFIGURATION ====================

const PORT = process.env.PORT || 4602;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/incident_management';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ==================== EXPRESS APP SETUP ====================

const app: Express = express();

// ==================== SECURITY MIDDLEWARE ====================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Service', 'X-Request-ID'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute for sensitive endpoints
  message: {
    success: false,
    error: 'Too many requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);
app.use('/api/incidents', strictLimiter);
app.use('/api/safeguarding', strictLimiter);

// ==================== BODY PARSING ====================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== REQUEST LOGGING ====================

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request
  logger.http(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    };

    if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.path} - ${res.statusCode}`, logData);
    } else {
      logger.http(`${req.method} ${req.path} - ${res.statusCode}`, logData);
    }

    // Track performance
    if (duration > 2000) {
      logPerformanceMetric(`${req.method} ${req.path}`, duration, {
        statusCode: res.statusCode
      });
    }
  });

  next();
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'incident-management-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/health/ready', async (req: Request, res: Response) => {
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

    const isReady = mongoStatus === 'connected' && redisStatus === 'connected';

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      checks: {
        mongodb: mongoStatus,
        redis: redisStatus
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== API ROUTES ====================

app.use('/api', incidentRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Log security events for specific errors
  if (err.name === 'UnauthorizedError' || err.message.includes('JWT')) {
    logSecurityEvent('unauthorized_access', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ==================== REDIS CLIENT ====================

let redisClient: Redis;

try {
  redisClient = new Redis(REDIS_URL, {
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

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redisClient.on('error', (err: Error) => {
    logger.error('Redis connection error:', { error: err.message });
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });
} catch (error) {
  logger.warn('Redis initialization failed, continuing without cache:', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  redisClient = {} as Redis; // Placeholder for type compatibility
}

// ==================== DATABASE CONNECTION ====================

const connectDB = async (): Promise<void> => {
  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    await mongoose.connect(MONGODB_URI, options);

    logger.info('Connected to MongoDB', {
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });

    // Handle connection events
    mongoose.connection.on('error', (err: Error) => {
      logger.error('MongoDB connection error:', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Don't exit - allow retry
    setTimeout(connectDB, 5000);
  }
};

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close Redis connection
  try {
    if (redisClient && redisClient.quit) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==================== SERVER START ====================

let server: ReturnType<Express['listen']>;

const startServer = async (): Promise<void> => {
  // Connect to database
  await connectDB();

  // Start HTTP server
  server = app.listen(PORT, () => {
    logger.info(`Incident Management Service started`, {
      port: PORT,
      nodeEnv: process.env.NODE_ENV || 'development',
      pid: process.pid
    });
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║         INCIDENT MANAGEMENT SERVICE                      ║
║         HOJAI AI - RisaCare Healthcare                  ║
╠═══════════════════════════════════════════════════════════╣
║  Port:     ${PORT.padEnd(47)}║
║  Status:   RUNNING                                     ║
║  Health:   http://localhost:${PORT}/health               ║
║  API:      http://localhost:${PORT}/api                  ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server:', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export { app, redisClient };
