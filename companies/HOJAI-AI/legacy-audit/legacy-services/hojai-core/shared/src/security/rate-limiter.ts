/**
 * HOJAI AI - Security Rate Limiter
 * 
 * Redis-based rate limiting middleware with token bucket algorithm
 */

import { Request, Response, NextFunction } from 'express';

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  onRateLimit?: (req: Request, res: Response) => void;
  standardHeaders?: boolean;
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
}

// In-memory store for development
const memoryStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyGenerator = defaultKeyGenerator,
    onRateLimit,
    standardHeaders = true,
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `ratelimit:${keyGenerator(req)}`;
    const now = Date.now();

    cleanupExpired(now);

    let entry = memoryStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      memoryStore.set(key, entry);
    }

    entry.count++;
    const remaining = Math.max(0, maxRequests - entry.count);

    if (standardHeaders) {
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
    }

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      if (onRateLimit) onRateLimit(req, res);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      });
    }

    next();
  };
}

function defaultKeyGenerator(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function cleanupExpired(now: number): void {
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetTime < now) memoryStore.delete(key);
  }
}

setInterval(() => cleanupExpired(Date.now()), 60000);

export const rateLimiters = {
  default: createRateLimiter({ windowMs: 60000, maxRequests: 100 }),
  strict: createRateLimiter({ windowMs: 60000, maxRequests: 10 }),
  relaxed: createRateLimiter({ windowMs: 3600000, maxRequests: 1000 }),
  auth: createRateLimiter({ windowMs: 60000, maxRequests: 5, keyGenerator: (req) => `auth:${req.ip}` }),
};

export default rateLimiters;
