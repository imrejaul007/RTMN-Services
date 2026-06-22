/**
 * Hojai Model Router - Rate Limiting Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './error';

// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const WINDOW_MS = parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000', 10); // 1 minute default
const MAX_REQUESTS = parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10); // 100 per minute default

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredEntries, 60000);

export function rateLimitMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const key = req.ip || 'unknown';
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Start new window
    entry = {
      count: 1,
      resetAt: now + WINDOW_MS,
    };
    rateLimitStore.set(key, entry);
    return next();
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds`
    );
  }

  next();
}
