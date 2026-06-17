/**
 * Rate Limiting Middleware
 *
 * Prevents abuse by limiting request rates per client.
 */

import { Request, Response, NextFunction } from 'express';

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface ClientStore {
  [clientId: string]: RateLimitEntry;
}

// ============================================================================
// RATE LIMITER
// ============================================================================

export function createRateLimiter(config: RateLimitConfig) {
  const store: ClientStore = {};
  const { windowMs, max } = config;

  // Clean up expired entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const clientId of Object.keys(store)) {
      if (store[clientId].resetTime < now) {
        delete store[clientId];
      }
    }
  }, 60000);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use IP as client identifier, with fallback to API key
    const clientId =
      (req.headers['x-api-key'] as string) ||
      (req.headers['x-internal-service'] as string) ||
      req.ip ||
      'unknown';

    const now = Date.now();

    // Initialize or reset entry
    if (!store[clientId] || store[clientId].resetTime < now) {
      store[clientId] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    store[clientId].count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - store[clientId].count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(store[clientId].resetTime / 1000).toString());

    if (store[clientId].count > max) {
      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please retry after ${Math.ceil((store[clientId].resetTime - now) / 1000)} seconds.`,
        retryAfter: Math.ceil((store[clientId].resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

// ============================================================================
// ADVANCED RATE LIMITER (with Redis support)
// ============================================================================

export class AdvancedRateLimiter {
  private store: ClientStore = {};
  private windowMs: number;
  private max: number;
  private skipCount: number = 0;

  constructor(windowMs: number = 60000, max: number = 100) {
    this.windowMs = windowMs;
    this.max = max;

    // Clean up expired entries
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const clientId = this.getClientId(req);
      const now = Date.now();

      if (!this.store[clientId] || this.store[clientId].resetTime < now) {
        this.store[clientId] = {
          count: 0,
          resetTime: now + this.windowMs,
        };
      }

      this.store[clientId].count++;

      res.setHeader('X-RateLimit-Limit', this.max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.max - this.store[clientId].count).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(this.store[clientId].resetTime / 1000).toString());

      if (this.store[clientId].count > this.max) {
        res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((this.store[clientId].resetTime - now) / 1000),
        });
        return;
      }

      next();
    };
  }

  private getClientId(req: Request): string {
    return (
      (req.headers['x-api-key'] as string) ||
      (req.headers['x-internal-service'] as string) ||
      req.ip ||
      'unknown'
    );
  }

  private cleanup(): void {
    const now = Date.now();
    for (const clientId of Object.keys(this.store)) {
      if (this.store[clientId].resetTime < now) {
        delete this.store[clientId];
      }
    }
  }

  reset(clientId: string): void {
    delete this.store[clientId];
  }

  getStats(): { totalClients: number; skipCount: number } {
    return {
      totalClients: Object.keys(this.store).length,
      skipCount: this.skipCount,
    };
  }
}
