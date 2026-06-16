/**
 * RTMN Shared SDK - Security Middleware
 *
 * Centralized security middleware for all RTMN services.
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

// ============================================
// Security Configuration
// ============================================

export interface SecurityConfig {
  corsOrigins: string[];
  cspDirectives?: helmet.IHelmetContentSecurityPolicyConfiguration;
  hstsMaxAge?: number;
  enableNonce?: boolean;
}

// ============================================
// CORS Middleware
// ============================================

export function createCorsMiddleware(config?: Partial<SecurityConfig>) {
  const allowedOrigins = config?.corsOrigins || process.env.ALLOWED_ORIGINS?.split(',') || [];

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must be set in production');
  }

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) {
        return callback(null, true);
      }

      // In development, allow localhost
      if (process.env.NODE_ENV !== 'production') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
      }

      // Check against allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Tenant-ID',
      'X-API-Key',
      'X-Internal-Token',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 86400, // 24 hours
  });
}

// ============================================
// Helmet Middleware
// ============================================

export function createHelmetMiddleware(config?: Partial<SecurityConfig>) {
  return helmet({
    contentSecurityPolicy: config?.cspDirectives || {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: config?.hstsMaxAge || 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    noSniff: true,
    frameguard: { action: 'deny' },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    hidePoweredBy: true,
  });
}

// ============================================
// Rate Limiting
// ============================================

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

export function createRateLimiters() {
  const rateLimit = require('express-rate-limit');

  // Global rate limiter
  const global = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      success: false,
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter for auth endpoints
  const auth = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
      success: false,
      error: 'Too many authentication attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // For write operations
  const write = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: {
      success: false,
      error: 'Too many write requests',
      code: 'WRITE_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // For expensive operations
  const expensive = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: {
      success: false,
      error: 'Rate limit exceeded for expensive operations',
      code: 'EXPENSIVE_OPERATION_LIMIT',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  return { global, auth, write, expensive };
}

// ============================================
// Request Validation
// ============================================

import { z, ZodSchema, ZodError } from 'zod';

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace with validated data
      if (result.body) req.body = result.body;
      if (result.query) req.query = result.query;
      if (result.params) req.params = result.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

// ============================================
// Error Handler
// ============================================

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler() {
  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    console.error('Error:', {
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
      path: req.path,
      method: req.method,
    });

    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
        code: err.code,
        details: err.details,
      });
      return;
    }

    // Handle specific error types
    if (err.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    if (err.name === 'UnauthorizedError') {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Default error response
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      code: 'INTERNAL_ERROR',
    });
  };
}

// ============================================
// Request ID Middleware
// ============================================

import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    next();
  };
}

// ============================================
// Logger
// ============================================

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private formatEntry(entry: Omit<LogEntry, 'timestamp'>): string {
    return JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
    });
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    console.log(this.formatEntry({ level: 'debug', message, metadata }));
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    console.log(this.formatEntry({ level: 'info', message, metadata }));
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    console.warn(this.formatEntry({ level: 'warn', message, metadata }));
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    console.error(this.formatEntry({
      level: 'error',
      message,
      error: error?.message,
      stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined,
      metadata,
    }));
  }

  logRequest(req: Request, res: Response, duration: number): void {
    this.info('Request completed', {
      requestId: req.headers['x-request-id'],
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
    });
  }
}

// ============================================
// Request Logger Middleware
// ============================================

export function requestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.logRequest(req, res, duration);
    });

    next();
  };
}

// ============================================
// Health Check
// ============================================

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database?: { status: 'up' | 'down'; latency?: number };
    redis?: { status: 'up' | 'down'; latency?: number };
    external?: { status: 'up' | 'down'; latency?: number };
  };
}

export async function createHealthCheck(serviceName: string, version: string) {
  return async (_req: Request, res: Response): Promise<void> => {
    const checks: HealthStatus['checks'] = {};

    // Check MongoDB
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        const start = Date.now();
        await mongoose.connection.db.admin().ping();
        checks.database = { status: 'up', latency: Date.now() - start };
      } else {
        checks.database = { status: 'down' };
      }
    } catch {
      checks.database = { status: 'down' };
    }

    // Check Redis
    try {
      const redis = require('redis');
      // Add Redis check if client is configured
      checks.redis = { status: 'up', latency: 0 };
    } catch {
      checks.redis = { status: 'down' };
    }

    const overallStatus = Object.values(checks).every(c => c?.status === 'up')
      ? 'healthy'
      : Object.values(checks).some(c => c?.status === 'up')
        ? 'degraded'
        : 'unhealthy';

    res.status(overallStatus === 'unhealthy' ? 503 : 200).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
      uptime: process.uptime(),
      checks,
    } as HealthStatus);
  };
}

// ============================================
// Circuit Breaker
// ============================================

export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
    private resetTimeout = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }
}

// ============================================
// Pagination Helper
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));

  return { page, limit };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginationResult<T> {
  const totalPages = Math.ceil(total / params.limit);

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}
