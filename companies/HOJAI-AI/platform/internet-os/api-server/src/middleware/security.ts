/**
 * HOJAI InternetOS Security Middleware
 *
 * - JWT authentication
 * - Rate limiting
 * - Security headers (helmet)
 * - Request signing
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    tenantId?: string;
    scopes: string[];
  };
}

/**
 * JWT Auth middleware
 * Reads Bearer token from Authorization header
 */
export function jwtAuth(requiredScopes: string[] = []) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as any;

      // Check scopes if required
      if (requiredScopes.length > 0) {
        const tokenScopes = decoded.scopes || [];
        const hasScope = requiredScopes.every(s => tokenScopes.includes(s));
        if (!hasScope) {
          res.status(403).json({
            error: 'Forbidden',
            message: `Missing required scopes: ${requiredScopes.join(', ')}`,
          });
          return;
        }
      }

      req.auth = {
        userId: decoded.userId || decoded.sub,
        tenantId: decoded.tenantId,
        scopes: decoded.scopes || [],
      };

      next();
    } catch (error) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  };
}

/**
 * Internal service auth middleware
 * Accepts either JWT or internal token
 */
export function internalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  // Try JWT first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return jwtAuth()(req, res, next);
  }

  // Fall back to internal token (x-internal-token header)
  const internalToken = req.headers['x-internal-token'] as string;
  if (internalToken === config.auth.internalToken) {
    req.auth = {
      userId: 'internal-service',
      scopes: ['internal'],
    };
    return next();
  }

  res.status(401).json({
    error: 'Unauthorized',
    message: 'Missing Authorization or internal token',
  });
}

/**
 * Generate a JWT for testing/dev
 */
export function generateToken(payload: {
  userId: string;
  tenantId?: string;
  scopes?: string[];
  expiresIn?: string;
}): string {
  return jwt.sign(
    {
      userId: payload.userId,
      tenantId: payload.tenantId,
      scopes: payload.scopes || [],
      sub: payload.userId,
    },
    config.auth.jwtSecret,
    { expiresIn: payload.expiresIn || '7d' } as jwt.SignOptions
  );
}

/**
 * Rate limiter (token bucket per IP)
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export function rateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
} = {}) {
  const windowMs = options.windowMs || config.rateLimit.windowMs;
  const max = options.max || config.rateLimit.maxRequests;
  const message = options.message || 'Too many requests, please try again later.';

  const buckets = new Map<string, RateLimitEntry>();

  // Cleanup old buckets periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets.entries()) {
      if (entry.resetTime < now) {
        buckets.delete(key);
      }
    }
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || entry.resetTime < now) {
      buckets.set(key, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(max - 1));
      res.setHeader('X-RateLimit-Reset', String(now + windowMs));
      next();
      return;
    }

    entry.count++;

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(entry.resetTime));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter,
      });
      return;
    }

    next();
  };
}

/**
 * Security headers (additional to helmet)
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
}

/**
 * Request logging
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Only log slow or failed requests in production
    if (duration > 1000 || status >= 400) {
      console.log(`[${requestId}] ${req.method} ${req.path} - ${status} (${duration}ms)`);
    }
  });

  next();
}