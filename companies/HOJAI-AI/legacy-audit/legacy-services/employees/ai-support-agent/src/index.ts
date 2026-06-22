/**
 * HOJAI AI Support Agent - Main Entry Point
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: 24x7 customer support with ticket resolution, FAQ, escalation routing, warranty verification, and refund processing
 *
 * Tagline: "AI-powered support that resolves issues instantly, 24 hours a day."
 *
 * Port: 4760
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import supportRoutes from './routes/supportRoutes.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '4760', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'ai-support-agent';
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
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['*'];
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

// Stricter rate limit for expensive operations
const expensiveOperationsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 expensive requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many expensive operations, please slow down',
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
  // Support agent is stateless, always ready
  res.json({
    status: 'ready',
    checks: {
      service: 'ready',
    },
    timestamp: new Date().toISOString(),
  });
});

// Service info endpoint
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    description: 'AI-powered 24x7 customer support with ticket resolution, FAQ, escalation routing, warranty verification, and refund processing',
    tagline: 'AI-powered support that resolves issues instantly, 24 hours a day.',
    capabilities: {
      tickets: true,
      faq: true,
      escalation: true,
      warranty: true,
      refund: true,
      customerHistory: true,
      aiSuggestions: true,
    },
    endpoints: {
      tickets: 'POST /api/support/tickets, GET /api/support/tickets',
      resolve: 'POST /api/support/tickets/:id/resolve',
      escalate: 'POST /api/support/escalate',
      warranty: 'POST /api/support/warranty/check',
      refund: 'POST /api/support/refund/process',
      customerHistory: 'GET /api/support/customer/:id/history',
      faq: 'GET /api/support/faq, POST /api/support/faq/search',
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// API Routes
// ============================================================================

// Apply stricter rate limit for expensive operations
app.use('/api/support/refund/process', expensiveOperationsLimiter);
app.use('/api/support/escalate', expensiveOperationsLimiter);
app.use('/api/support/ai/suggest', expensiveOperationsLimiter);

// Support routes
app.use('/api/support', supportRoutes);

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

  if (err.name === 'ForbiddenError' || err.code === 'FORBIDDEN') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied',
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
    logger.info('cleanup_complete');
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

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info('service_started', {
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
      });

      console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   HOJAI AI Support Agent                                                    ║
║   24x7 AI-Powered Customer Support                                           ║
║                                                                              ║
║   Status:    RUNNING                                                         ║
║   Port:      ${PORT.toString().padEnd(55)}║
║   Version:   ${SERVICE_VERSION.padEnd(55)}║
║                                                                              ║
║   Capabilities:                                                              ║
║   - Ticket Resolution    - FAQ Engine              - Escalation Routing      ║
║   - Warranty Verification - Refund Processing       - Customer History       ║
║                                                                              ║
║   "AI-powered support that resolves issues instantly, 24 hours a day."       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('service_start_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Start the service
start();

export default app;
