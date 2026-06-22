/**
 * Rate Limiting Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './error';

// Simple in-memory rate limiter
// For production, use Redis-based rate limiting
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> =
    new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 1000) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (value.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || record.resetTime < now) {
      // New window
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetIn: this.windowMs,
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: record.resetTime - now,
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetIn: record.resetTime - now,
    };
  }
}

// Rate limiters for different endpoints
const standardLimiter = new RateLimiter(60000, 1000); // 1000 requests/minute
const batchLimiter = new RateLimiter(60000, 100); // 100 batch requests/minute

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use entity ID or IP as identifier
  const identifier =
    (req.params.entityId as string) ||
    (req.headers['x-internal-token'] as string) ||
    req.ip ||
    'unknown';

  const limiter = req.path.includes('/batch') ? batchLimiter : standardLimiter;
  const result = limiter.check(identifier);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', limiter['maxRequests']);
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetIn / 1000).toString());

  if (!result.allowed) {
    throw new RateLimitError(Math.ceil(result.resetIn / 1000));
  }

  next();
}
