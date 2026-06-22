/**
 * HOJAI RAG Service - Rate Limiting Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './error';

// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100,
};

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `rate_limit:${ip}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new window
    entry = {
      count: 1,
      resetTime: now + defaultConfig.windowMs,
    };
    rateLimitStore.set(key, entry);
    return next();
  }

  entry.count++;

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', defaultConfig.maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, defaultConfig.maxRequests - entry.count).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());

  if (entry.count > defaultConfig.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return next(new RateLimitError(retryAfter));
  }

  return next();
}

/**
 * Stricter rate limit for expensive operations (generation)
 */
export function generationRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `generation_limit:${ip}`;
  const now = Date.now();

  const genConfig: RateLimitConfig = {
    windowMs: 60000,
    maxRequests: 10, // Only 10 generations per minute
  };

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + genConfig.windowMs,
    };
    rateLimitStore.set(key, entry);
    return next();
  }

  entry.count++;

  res.setHeader('X-RateLimit-Limit', genConfig.maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, genConfig.maxRequests - entry.count).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());

  if (entry.count > genConfig.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return next(new RateLimitError(retryAfter));
  }

  return next();
}
