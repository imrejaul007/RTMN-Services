import Redis from 'ioredis';
import { logger } from '../utils/logger';

/**
 * Redis-based distributed rate limiter
 * Prevents bypass by distributed attacks (unlike in-memory rate limiting)
 */
export class RedisRateLimiter {
  private redis: Redis;
  private defaultWindowMs: number;
  private defaultMaxRequests: number;

  constructor(options: {
    redisUrl?: string;
    defaultWindowMs?: number;
    defaultMaxRequests?: number;
  } = {}) {
    this.redis = new Redis(options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.defaultWindowMs = options.defaultWindowMs || 60000;
    this.defaultMaxRequests = options.defaultMaxRequests || 100;

    this.redis.on('error', (err) => {
      logger.error('Redis rate limiter error:', err);
    });
  }

  /**
   * Check if request is allowed under rate limit
   * Uses sliding window algorithm with Redis sorted sets
   */
  async check(key: string, options?: {
    windowMs?: number;
    maxRequests?: number;
  }): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
    const windowMs = options?.windowMs || this.defaultWindowMs;
    const maxRequests = options?.maxRequests || this.defaultMaxRequests;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const redisKey = `ratelimit:${key}`;

      // Use Redis transaction for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(redisKey, 0, windowStart);

      // Count current requests in window
      pipeline.zcard(redisKey);

      // Add current request with timestamp as score
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);

      // Set expiry on the key
      pipeline.pexpire(redisKey, windowMs);

      const results = await pipeline.exec();

      if (!results) {
        // Redis error - fail open (allow request)
        logger.warn('Redis pipeline returned null, allowing request');
        return { allowed: true, remaining: maxRequests, resetMs: windowMs };
      }

      const currentCount = results[1][1] as number;

      if (currentCount >= maxRequests) {
        // Rate limit exceeded
        const oldestEntry = await this.redis.zrange(redisKey, 0, 0, 'WITHSCORES');
        const oldestTimestamp = oldestEntry.length > 1 ? parseInt(oldestEntry[1]) : now;
        const resetMs = Math.max(0, oldestTimestamp + windowMs - now);

        return { allowed: false, remaining: 0, resetMs };
      }

      return {
        allowed: true,
        remaining: maxRequests - currentCount - 1,
        resetMs: windowMs
      };
    } catch (error) {
      logger.error('Rate limit check error:', error);
      // Fail open on Redis errors
      return { allowed: true, remaining: maxRequests, resetMs: windowMs };
    }
  }

  /**
   * Express middleware for rate limiting
   */
  middleware(options?: {
    windowMs?: number;
    maxRequests?: number;
    keyGenerator?: (req: { ip?: string; headers: Record<string, string | string[] | undefined> }) => string;
  }) {
    const windowMs = options?.windowMs || this.defaultWindowMs;
    const maxRequests = options?.maxRequests || this.defaultMaxRequests;
    const keyGenerator = options?.keyGenerator || ((req) => req.ip || 'unknown');

    return async (req: { ip?: string; headers: Record<string, string | string[] | undefined>; method: string; path: string }, res: { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } }, next: () => void) => {
      const key = keyGenerator(req);
      const result = await this.check(key, { windowMs, maxRequests });

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + result.resetMs) / 1000).toString());

      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil(result.resetMs / 1000).toString());
        res.status(429).json({
          error: 'Too Many Requests',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfterMs: result.resetMs
        });
        return;
      }

      next();
    };
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(`ratelimit:${key}`);
    } catch (error) {
      logger.error('Rate limit reset error:', error);
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instance
let rateLimiter: RedisRateLimiter | null = null;

export function getRateLimiter(): RedisRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RedisRateLimiter();
  }
  return rateLimiter;
}
