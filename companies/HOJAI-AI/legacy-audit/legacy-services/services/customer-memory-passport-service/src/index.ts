import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import passportRoutes from './routes/passportRoutes.js';
import { encryptionService } from './services/encryptionService.js';
import { logger } from './utils/logger.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ============================================
// CONSTANTS
// ============================================

const PORT = process.env.PORT || 4595;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/memory-passport';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// APP INITIALIZATION
// ============================================

const app: Express = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID'],
  credentials: true,
  maxAge: 86400,
}));

// ============================================
// RATE LIMITING
// ============================================

const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// ============================================
// BODY PARSING
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// REQUEST LOGGING
// ============================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  res.locals.requestId = requestId;

  logger.info(`${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger.log({
      level: logLevel,
      message: `${req.method} ${req.path} ${res.statusCode} ${duration}ms`,
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
});

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'memory-passport-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    if (mongoStatus !== 'connected') {
      res.status(503).json({
        success: false,
        status: 'not_ready',
        checks: {
          mongodb: mongoStatus,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: 'ready',
      checks: {
        mongodb: mongoStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API ROUTES
// ============================================

app.use('/api/v1', passportRoutes);

app.get('/api/v1', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Memory Passport Service API v1',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    endpoints: {
      passport: {
        'POST /api/v1/passport': 'Create a new customer passport',
        'GET /api/v1/passport/:customerId': 'Get customer passport',
        'PUT /api/v1/passport/:customerId/memory': 'Add memory to passport',
        'GET /api/v1/passport/:customerId/memories': 'Get memories with filters',
        'GET /api/v1/passport/:customerId/timeline': 'Get memory timeline',
        'GET /api/v1/passport/:customerId/search': 'Search memories',
        'PUT /api/v1/passport/memory/:memoryId': 'Update memory',
        'DELETE /api/v1/passport/memory/:memoryId': 'Delete memory',
      },
      company: {
        'POST /api/v1/passport/:customerId/link/:companyId': 'Link company to passport',
        'GET /api/v1/passport/:customerId/context/:companyId': 'Get company context',
      },
      context: {
        'GET /api/v1/passport/:customerId/conversation-context': 'Build conversation context',
        'GET /api/v1/passport/:customerId/history': 'Get recent history',
        'GET /api/v1/passport/:customerId/preferences': 'Get preferences',
        'GET /api/v1/passport/:customerId/sentiment': 'Get sentiment history',
        'GET /api/v1/passport/:customerId/patterns': 'Detect patterns',
      },
      graph: {
        'GET /api/v1/passport/:customerId/graph': 'Get memory graph',
        'POST /api/v1/passport/:customerId/graph/nodes': 'Create graph node',
        'POST /api/v1/passport/:customerId/graph/edges': 'Create graph edge',
        'GET /api/v1/passport/:customerId/graph/path': 'Find path in graph',
        'GET /api/v1/passport/:customerId/graph/related/:entityId': 'Get related entities',
        'GET /api/v1/passport/:customerId/graph/stats': 'Get graph statistics',
        'GET /api/v1/passport/:customerId/health-score': 'Calculate health score',
      },
      interactions: {
        'POST /api/v1/passport/:customerId/interactions': 'Add interaction',
      },
      merge: {
        'POST /api/v1/passport/merge': 'Merge two passports',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// 404 HANDLER
// ============================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// ERROR HANDLING
// ============================================

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

app.use((err: AppError, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  logger.error(err.message, {
    requestId: res.locals.requestId,
    stack: err.stack,
    code,
    statusCode,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: NODE_ENV === 'production' && statusCode === 500 ? 'Internal server error' : message,
      ...(err.details && { details: err.details }),
      ...(NODE_ENV !== 'production' && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId,
  });
});

// ============================================
// DATABASE CONNECTION
// ============================================

async function connectToDatabase(): Promise<void> {
  try {
    const options: mongoose.ConnectOptions = {
      maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10'),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL || '2'),
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_TIMEOUT || '5000'),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000'),
      family: 4,
    };

    await mongoose.connect(MONGODB_URI, options);

    logger.info('Connected to MongoDB', {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      port: mongoose.connection.port,
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', { error: error.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  const server = app.get('server');

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  logger.info('Graceful shutdown completed');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    promise: promise.toString(),
  });
});

// ============================================
// SERVER STARTUP
// ============================================

async function startServer(): Promise<void> {
  try {
    encryptionService.initialize({
      encryptionKey: process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production',
    });

    await connectToDatabase();

    const server = app.listen(PORT, () => {
      logger.info(`Memory Passport Service started`, {
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
        pid: process.pid,
      });
    });

    app.set('server', server);

    server.on('error', (error: Error) => {
      logger.error('Server error', { error: error.message });
      throw error;
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================
// START
// ============================================

startServer();

export { app };
