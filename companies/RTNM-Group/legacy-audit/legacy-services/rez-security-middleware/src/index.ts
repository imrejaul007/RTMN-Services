/**
 * @rez/security-middleware
 *
 * Shared security middleware for all ReZ services.
 * Provides authentication, rate limiting, request ID tracking, and error handling.
 *
 * Usage:
 * ```typescript
 * import express from 'express';
 * import helmet from 'helmet';
 * import { auth, rateLimit, requestId, errorHandler, securityHeaders } from '@rez/security-middleware';
 *
 * const app = express();
 * app.use(requestId);
 * app.use(helmet());
 * app.use(securityHeaders());
 * app.use(rateLimit());
 * app.use('/api', auth);
 * app.use(errorHandler);
 * ```
 */

import { Request, Response, NextFunction, Express } from 'express';

// ============================================================================
// Types
// ============================================================================

export interface SecurityConfig {
  /** Service name for logging */
  serviceName?: string;
  /** Allowed CORS origins */
  allowedOrigins?: string[];
  /** Rate limit max requests per window */
  rateLimitMax?: number;
  /** Rate limit window in milliseconds */
  rateLimitWindowMs?: number;
  /** Skip auth for certain paths */
  skipAuthPaths?: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<SecurityConfig> = {
  serviceName: 'service',
  allowedOrigins: ['https://rezapp.com', 'https://www.rezapp.com'],
  rateLimitMax: 100,
  rateLimitWindowMs: 60 * 1000, // 1 minute
  skipAuthPaths: ['/health', '/ready', '/metrics'],
};

let globalConfig: Required<SecurityConfig> = { ...DEFAULT_CONFIG };

/**
 * Configure global security settings
 */
export function configureSecurity(config: SecurityConfig): void {
  globalConfig = { ...DEFAULT_CONFIG, ...config };
}

/**
 * Get current configuration
 */
export function getSecurityConfig(): Required<SecurityConfig> {
  return { ...globalConfig };
}

// ============================================================================
// Timing-Safe Comparison
// ============================================================================

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// Service Tokens
// ============================================================================

/**
 * Get internal service tokens from environment
 */
export function getServiceTokens(): Record<string, string> {
  const tokensJson = process.env.INTERNAL_SERVICE_TOKENS_JSON;
  if (!tokensJson) return {};
  try {
    return JSON.parse(tokensJson);
  } catch {
    console.error('[Security] Failed to parse INTERNAL_SERVICE_TOKENS_JSON');
    return {};
  }
}

/**
 * Validate an internal token
 */
export function validateToken(token: string): boolean {
  const tokens = getServiceTokens();
  return Object.values(tokens).some(t => timingSafeEqual(t, token));
}

// ============================================================================
// Rate Limiting Store
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for an IP
 */
export function checkRateLimit(ip: string, path: string): RateLimitResult {
  const key = `ratelimit:${ip}:${path}`;
  const now = Date.now();

  let record = rateLimitStore.get(key);
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + globalConfig.rateLimitWindowMs };
    rateLimitStore.set(key, record);
  }

  record.count++;

  const remaining = Math.max(0, globalConfig.rateLimitMax - record.count);
  const resetAt = record.resetTime;
  const allowed = record.count <= globalConfig.rateLimitMax;

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    cleanupRateLimitStore();
  }

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? undefined : Math.ceil((resetAt - now) / 1000),
  };
}

/**
 * Cleanup old rate limit entries
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// ============================================================================
// Middleware Factories
// ============================================================================

/**
 * Request ID middleware - adds unique ID for tracing
 */
export function requestId() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId =
      (req.headers['x-request-id'] as string) ||
      `${globalConfig.serviceName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    res.setHeader('X-Request-Id', requestId);
    (req as any).requestId = requestId;

    next();
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimit() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const path = req.path;

    const result = checkRateLimit(ip, path);

    res.setHeader('X-RateLimit-Limit', String(globalConfig.rateLimitMax));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: result.retryAfter,
      });
      return;
    }

    next();
  };
}

/**
 * Authentication middleware
 */
export function auth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip auth for certain paths
    if (globalConfig.skipAuthPaths.includes(req.path)) {
      return next();
    }

    const token = req.headers['x-internal-token'] as string;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'X-Internal-Token header required',
      });
      return;
    }

    if (!validateToken(token)) {
      console.warn(`[Security] Invalid token from ${req.ip} for ${req.method} ${req.path}`);
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid token',
      });
      return;
    }

    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  };
}

/**
 * Error handler middleware
 */
export function errorHandler() {
  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const requestId = (req as any).requestId;

    console.error(`[${errorId}] [${requestId}] Error:`, {
      message: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
    });

    // Don't leak internal details in production
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: err.message,
        stack: err.stack,
        errorId,
      });
    }
  };
}

/**
 * CORS middleware
 */
export function cors() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;

    if (origin && globalConfig.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Token, X-Request-Id');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
}

// ============================================================================
// Express Plugin
// ============================================================================

/**
 * Apply all security middleware to an Express app
 */
export function applySecurity(app: Express, config?: SecurityConfig): void {
  if (config) {
    configureSecurity(config);
  }

  app.use(requestId());
  app.use(securityHeaders());
  app.use(cors());
  app.use(rateLimit());

  // Add /api routes require auth
  app.use('/api', auth());
}

// ============================================================================
// Exports
// ============================================================================

export default {
  configure: configureSecurity,
  getConfig: getSecurityConfig,
  auth,
  rateLimit,
  requestId,
  securityHeaders,
  errorHandler,
  cors: cors(),
  applySecurity,
  timingSafeEqual,
  validateToken,
  checkRateLimit,
};


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'rez-security-middleware',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
