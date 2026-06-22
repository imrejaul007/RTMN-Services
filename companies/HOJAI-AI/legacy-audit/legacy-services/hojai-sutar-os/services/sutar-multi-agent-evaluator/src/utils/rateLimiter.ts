import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs || 60000, // 1 minute default
      max: config.max || 100, // 100 requests per window default
      message: config.message || 'Too many requests, please try again later',
    };

    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();

      let entry = this.store.get(key);

      if (!entry || now > entry.resetTime) {
        entry = {
          count: 1,
          resetTime: now + this.config.windowMs,
        };
        this.store.set(key, entry);
        res.setHeader('X-RateLimit-Limit', this.config.max.toString());
        res.setHeader('X-RateLimit-Remaining', (this.config.max - 1).toString());
        res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
        return next();
      }

      entry.count++;
      res.setHeader('X-RateLimit-Limit', this.config.max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.max - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());

      if (entry.count > this.config.max) {
        res.status(429).json({
          success: false,
          error: this.config.message,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    };
  }

  private getKey(req: Request): string {
    // Use IP address as key, with fallback
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  resetAll(): void {
    this.store.clear();
  }

  getStats(): { activeKeys: number; totalRequests: number } {
    let totalRequests = 0;
    for (const entry of this.store.values()) {
      totalRequests += entry.count;
    }
    return {
      activeKeys: this.store.size,
      totalRequests,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Default rate limiter: 100 requests per minute
export const defaultRateLimiter = new RateLimiter({
  windowMs: 60000,
  max: 100,
  message: 'Too many requests, please try again later',
});

// Strict rate limiter: 20 requests per minute for sensitive endpoints
export const strictRateLimiter = new RateLimiter({
  windowMs: 60000,
  max: 20,
  message: 'Rate limit exceeded for this operation',
});

export { RateLimiter };
