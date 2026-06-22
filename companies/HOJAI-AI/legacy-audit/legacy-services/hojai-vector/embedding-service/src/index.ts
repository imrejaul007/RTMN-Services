/**
 * HOJAI Embedding Service - Main Entry Point
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: OpenAI embeddings integration for HOJAI Vector
 *
 * Port: 4720
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import { createEmbedRouter } from './routes/embed.routes.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env['PORT'] || '4720', 10);
const NODE_ENV = process.env['NODE_ENV'] || 'development';
const SERVICE_NAME = 'hojai-embedding-service';
const SERVICE_VERSION = '1.0.0';
const OPENAI_API_KEY = process.env['OPENAI_API_KEY'] || '';

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
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
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

// Stricter rate limit for embedding operations
const embedLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 embedding requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many embedding requests, please slow down',
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
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
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
  // Check if OpenAI API key is configured
  const isConfigured = !!OPENAI_API_KEY;

  if (!isConfigured) {
    res.status(503).json({
      status: 'not_ready',
      checks: {
        openai: 'not_configured',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    status: 'ready',
    checks: {
      openai: 'configured',
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// API Routes
// ============================================================================

// Apply stricter rate limit for embedding operations
app.use('/api', embedLimiter);

// Embed routes
app.use('/api', createEmbedRouter(logger, OPENAI_API_KEY));

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

  // Handle OpenAI errors
  if (err.message?.includes('Incorrect API key') || err.message?.includes('invalid_api_key')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid OpenAI API key',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
    });
    return;
  }

  if (err.message?.includes('rate limit')) {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_ERROR',
        message: 'OpenAI rate limit exceeded',
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
  // Validate OpenAI API key
  if (!OPENAI_API_KEY) {
    logger.warn('openai_api_key_missing', {
      message: 'OPENAI_API_KEY not set - embedding features will fail',
    });
  }

  logger.info('service_starting', {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    environment: NODE_ENV,
  });

  app.listen(PORT, () => {
    logger.info('service_started', {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      port: PORT,
      environment: NODE_ENV,
      nodeVersion: process.version,
    });

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   HOJAI Embedding Service                                    ║
║   Vector Embeddings for AI Infrastructure                    ║
║                                                              ║
║   Status:  RUNNING                                           ║
║   Port:    ${PORT.toString().padEnd(51)}║
║   Version: ${SERVICE_VERSION.padEnd(51)}║
║   OpenAI:  ${OPENAI_API_KEY ? 'Configured' : 'NOT CONFIGURED'.padEnd(44)}║
║                                                              ║
║   Endpoints:                                                  ║
║   POST /api/embed       - Single embedding                   ║
║   POST /api/embed/batch - Batch embeddings                   ║
║   GET  /api/models      - List models                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
}

// Start the service
start();

export default app;
