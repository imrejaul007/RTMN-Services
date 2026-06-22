import { Request, Response, NextFunction } from 'express';

/**
 * Simple in-memory rate limiter
 * In production, use Redis for distributed rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later' } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use IP address as identifier
    const identifier = req.ip || 'unknown';
    const key = `${identifier}:${req.path}`;

    const now = Date.now();
    let entry = rateLimitStore.get(key);

    // Reset if window has passed
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    if (entry.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Default rate limiter for API endpoints
 * 100 requests per minute
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many API requests, please try again later',
});

/**
 * Strict rate limiter for expensive operations
 * 10 requests per minute
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Rate limit exceeded for this operation',
});

/**
 * Get current rate limit status for an identifier
 */
export function getRateLimitStatus(identifier: string, path: string): {
  current: number;
  remaining: number;
  resetTime: number;
} | null {
  const key = `${identifier}:${path}`;
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return null;
  }

  return {
    current: entry.count,
    remaining: Math.max(0, 100 - entry.count),
    resetTime: entry.resetTime,
  };
}

export default { createRateLimiter, apiRateLimiter, strictRateLimiter, getRateLimitStatus };
