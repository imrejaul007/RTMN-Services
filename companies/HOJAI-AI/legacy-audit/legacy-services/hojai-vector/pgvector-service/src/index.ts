/**
 * HOJAI pgvector Service - Main Entry Point
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Vector storage and similarity search using PostgreSQL pgvector
 *
 * Port: 4721
 *
 * NOTE: This service uses a mock in-memory storage for development.
 * In production, replace with actual PostgreSQL + pgvector operations.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import { createVectorRouter } from './routes/vector.routes.js';
import { initializeStorage } from './services/storage.service.js';
import type { HealthStatus, HealthCheckResult } from './types/index.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env['PORT'] || '4721', 10);
const NODE_ENV = process.env['NODE_ENV'] || 'development';
const SERVICE_NAME = 'hojai-pgvector-service';
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

// Helmet - Security headers
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

// CORS - Cross-Origin Resource Sharing
const corsOrigins = process.env['CORS_ORIGINS']?.split(',') || ['*'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-User-Id', 'X-Request-Id', 'X-Internal-Token'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

// Rate Limiting - Global
const rateLimitWindow = parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000', 10);
const rateLimitMax = parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10);

const globalLimiter = rateLimit({
  windowMs: rateLimitWindow,
  max: rateLimitMax,
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

// Stricter rate limit for search operations
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many search requests, please slow down',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// Body Parsing
// ============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// Compression
// ============================================================================

app.use(compression());

// ============================================================================
// Request Logging
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Add request ID to response headers
  res.setHeader('X-Request-Id', requestId);

  // Log request
  logger.info('request_start', {
    requestId,
    method: req.method,
    path: req.path,
    tenantId: req.headers['x-tenant-id'],
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('request_end', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      tenantId: req.headers['x-tenant-id'],
    });
  });

  next();
});

// ============================================================================
// Health Endpoints
// ============================================================================

// Basic health check
app.get('/health', (_req: Request, res: Response) => {
  const status: HealthStatus = {
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  res.json(status);
});

// API health check (required endpoint)
app.get('/api/health', (_req: Request, res: Response) => {
  const checks: Record<string, HealthCheckResult> = {
    storage: {
      status: 'ok',
      message: 'Mock storage initialized',
    },
  };

  const status: HealthStatus = {
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };

  res.json(status);
});

// Liveness probe (Kubernetes)
app.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe (Kubernetes)
app.get('/health/ready', (_req: Request, res: Response) => {
  res.json({
    status: 'ready',
    checks: {
      storage: 'ok',
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// API Routes
// ============================================================================

// Apply stricter rate limit for search operations
app.use('/api/vectors/search', searchLimiter);

// Vector routes
app.use('/api', createVectorRouter(logger));

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
  // Log error
  logger.error('request_error', {
    error: err.message,
    stack: err.stack,
    code: err.code,
    path: _req.path,
  });

  // Handle specific error types
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

  if (err.name === 'UnauthorizedError' || err.code === 'UNAUTHORIZED') {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
    });
    return;
  }

  // Default error response
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
// Graceful Shutdown
// ============================================================================

async function shutdown(signal: string): Promise<void> {
  logger.info('shutdown_initiated', { signal });

  try {
    // Close any open connections here
    logger.info('shutdown_complete');
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

function start(): void {
  logger.info('service_starting', {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    environment: NODE_ENV,
  });

  // Initialize mock storage
  initializeStorage(logger);

  app.listen(PORT, () => {
    logger.info('service_started', {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      port: PORT,
      environment: NODE_ENV,
      nodeVersion: process.version,
    });

    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   HOJAI pgvector Service                                         ║
║   Vector Storage & Similarity Search                             ║
║                                                                  ║
║   Status:    RUNNING                                            ║
║   Port:      ${PORT.toString().padEnd(51)}║
║   Version:   ${SERVICE_VERSION.padEnd(51)}║
║   Storage:   Mock In-Memory (Dev Mode)                          ║
║                                                                  ║
║   Endpoints:                                                     ║
║   POST   /api/vectors              - Insert vectors             ║
║   POST   /api/vectors/batch        - Batch insert vectors       ║
║   POST   /api/vectors/search       - Search similar vectors    ║
║   GET    /api/vectors/:id          - Get vector by ID          ║
║   DELETE /api/vectors/:id          - Delete vector             ║
║   GET    /api/health               - Health check               ║
║   GET    /api/namespaces           - List namespaces            ║
║   GET    /api/stats                - Storage statistics        ║
║                                                                  ║
║   Note: Using mock storage. For production, integrate with     ║
║         PostgreSQL + pgvector extension.                         ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
    `);
  });
}

// Start the service
start();

export default app;
