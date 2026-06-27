/**
 * Middleware Utilities
 * Reusable Express middleware for rate limiting, auth, etc.
 */

import { Request, Response, RequestHandler, NextFunction } from 'express';
import * as winston from 'winston';
import { tokenManager, SalesforceToken } from './token.js';
import { sessionManager, Session } from './session.js';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      session?: Session;
      instanceUrl?: string;
      token?: SalesforceToken;
    }
  }
}

// ============ Rate Limiting ============

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStorage = new Map<string, RateLimitEntry>();

/**
 * Rate limiting middleware
 */
export function rateLimit(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitStorage.get(ip);

    if (!entry || now > entry.resetTime) {
      rateLimitStorage.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      res.setHeader('X-RateLimit-Remaining', String(RATE_LIMIT_MAX_REQUESTS - 1));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)));
      return next();
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      const resetIn = entry.resetTime - now;
      logger.warn('Rate limit exceeded', { ip, path: req.path });
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetIn / 1000)));
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          details: { retryAfterMs: resetIn },
        },
      });
      return;
    }

    entry.count++;
    res.setHeader('X-RateLimit-Remaining', String(RATE_LIMIT_MAX_REQUESTS - entry.count));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((entry.resetTime - now) / 1000)));
    next();
  };
}

// ============ Session Middleware ============

/**
 * Session middleware
 */
export function session(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const sessionId = req.headers['x-session-id'] as string || req.cookies?.sessionId;

    let session: Session | undefined;

    if (sessionId) {
      session = sessionManager.get(sessionId);
    }

    if (!session) {
      session = sessionManager.create();
    }

    req.session = session;
    res.setHeader('X-Session-Id', session.id);

    if (!req.cookies?.sessionId) {
      res.setHeader('Set-Cookie', `sessionId=${session.id}; HttpOnly; SameSite=Strict; Max-Age=86400`);
    }

    next();
  };
}

// ============ Authentication Middleware ============

/**
 * Require authentication middleware
 */
export function requireAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Try to get instance URL from session
    let instanceUrl = req.session?.instanceUrl;

    // Fallback to first available instance
    if (!instanceUrl) {
      instanceUrl = tokenManager.getFirstInstanceUrl();
    }

    if (!instanceUrl || !tokenManager.has(instanceUrl)) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated. Please authenticate with Salesforce first.',
        },
      });
      return;
    }

    req.instanceUrl = instanceUrl;
    req.token = tokenManager.get(instanceUrl);

    next();
  };
}

/**
 * Optional authentication middleware
 * Attaches token if available but doesn't require it
 */
export function optionalAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    let instanceUrl = req.session?.instanceUrl;

    if (!instanceUrl) {
      instanceUrl = tokenManager.getFirstInstanceUrl();
    }

    if (instanceUrl && tokenManager.has(instanceUrl)) {
      req.instanceUrl = instanceUrl;
      req.token = tokenManager.get(instanceUrl);
    }

    next();
  };
}

// ============ Error Handler ============

/**
 * Global error handler
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    sessionId: req.session?.id,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
}

// ============ Request Logger ============

/**
 * Request logging middleware
 */
export function requestLogger(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        sessionId: req.session?.id,
      });
    });

    next();
  };
}

// ============ JSON Body Size Limit ============

/**
 * JSON body parser with size limit
 */
export const jsonBodyParser: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body too large. Maximum size is 10MB.',
      },
    });
    return;
  }

  next();
};

// ============ CORS Headers ============

/**
 * CORS configuration
 */
export function corsConfig(origin: string | string[] | boolean = '*'): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const allowedOrigins = typeof origin === 'string' ? [origin] : Array.isArray(origin) ? origin : ['*'];

    const requestOrigin = _req.headers.origin;

    if (allowedOrigins.includes('*') || !requestOrigin || allowedOrigins.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-Request-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    next();
  };
}
