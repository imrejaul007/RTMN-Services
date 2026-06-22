/**
 * GENIE Meeting Service - Main Entry Point
 * Version: 1.0.0 | Date: June 13, 2026
 * Purpose: Meeting intelligence - summaries, action items, decisions
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 *
 * Port: 4713
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import meetingRoutes from './routes/meetingRoutes.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '4713', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/genie-meeting';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'genie-meeting-service';
const SERVICE_VERSION = '1.0.0';

// ============================================================================
// Logger
// ============================================================================

const logger = createLogger(SERVICE_NAME);

// ============================================================================
// Express App
// ============================================================================

const app = express();

// ============================================================================
// Security Middleware
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-User-Id', 'X-Request-Id', 'X-Internal-Token'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req.headers['x-tenant-id'] as string) || req.ip || 'unknown';
  },
});

app.use('/api', globalLimiter);

// ============================================================================
// Body Parsing
// ============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ============================================================================
// Request Logging
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  res.setHeader('X-Request-Id', requestId);

  logger.info('request_start', {
    requestId,
    method: req.method,
    path: req.path,
    tenantId: req.headers['x-tenant-id'],
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('request_end', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
  });

  next();
});

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const isMongoReady = mongoState === 1;

    if (!isMongoReady) {
      res.status(503).json({
        status: 'not_ready',
        checks: { mongodb: 'disconnected' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      status: 'ready',
      checks: { mongodb: 'connected' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// API Routes
// ============================================================================

app.use('/api/meetings', meetingRoutes);

// ============================================================================
// 404 Handler
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  });
});

// ============================================================================
// Error Handler
// ============================================================================

interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

app.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('request_error', {
    error: err.message,
    stack: err.stack,
    code: err.code,
    path: _req.path,
  });

  if (err.name === 'ValidationError' || err.code === 'VALIDATION_ERROR') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
    });
    return;
  }

  if (err.name === 'NotFoundError' || err.code === 'NOT_FOUND') {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: err.message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
    });
    return;
  }

  if (err.name === 'MongoServerError' || err.name === 'MongooseError') {
    logger.error('database_error', { error: err.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: NODE_ENV === 'production' ? 'Database error' : err.message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
    });
    return;
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  });
});

// ============================================================================
// Database Connection
// ============================================================================

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('mongodb_connected', { uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });
  } catch (error) {
    logger.error('mongodb_connection_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

async function shutdown(signal: string): Promise<void> {
  logger.info('shutdown_initiated', { signal });

  try {
    await mongoose.connection.close();
    logger.info('mongodb_disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('shutdown_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============================================================================
// Start Server
// ============================================================================

async function start(): Promise<void> {
  try {
    logger.info('service_starting', {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      port: PORT,
      environment: NODE_ENV,
    });

    await connectDatabase();

    app.listen(PORT, () => {
      logger.info('service_started', {
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        port: PORT,
        environment: NODE_ENV,
      });

      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   GENIE Meeting Service                                      ║
║   Personal Intelligence OS                                   ║
║                                                              ║
║   Status:  RUNNING                                           ║
║   Port:    ${PORT.toString().padEnd(51)}║
║   Version: ${SERVICE_VERSION.padEnd(51)}║
║                                                              ║
║   "You don't use Genie. You talk to Genie."                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('service_start_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

start();

export default app;
