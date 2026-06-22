import Redis from 'ioredis';

// ============================================================================
// REDIS-BACKED RATE LIMITER
// ============================================================================

export interface RateLimiterConfig {
  /** Max requests per window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Redis key prefix */
  keyPrefix?: string;
  /** Error message when rate limited */
  message?: string;
  /** Enable per-IP limiting */
  perIP?: boolean;
  /** Enable per-key limiting (e.g., per user, per merchant) */
  perKey?: (req: Request) => string | null;
}

interface Request {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  path: string;
  method: string;
}

/**
 * Sliding window rate limiter using Redis
 */
export class RedisRateLimiter {
  private redis: Redis;
  private config: Required<RateLimiterConfig>;

  constructor(config: RateLimiterConfig) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      }
    });

    this.config = {
      max: config.max,
      windowMs: config.windowMs,
      keyPrefix: config.keyPrefix || 'ratelimit',
      message: config.message || 'Too many requests, please try again later',
      perIP: config.perIP !== false,
      perKey: config.perKey
    };

    this.redis.on('error', (err) => {
      console.error('[RateLimiter] Redis error:', err.message);
    });
  }

  /**
   * Generate rate limit key
   */
  private getKey(req: Request): string {
    const parts = [this.config.keyPrefix];

    if (this.config.perIP && req.ip) {
      parts.push(`ip:${this.sanitizeKey(req.ip)}`);
    }

    if (this.config.perKey) {
      const customKey = this.config.perKey(req);
      if (customKey) {
        parts.push(`key:${this.sanitizeKey(customKey)}`);
      }
    }

    // Add endpoint and method
    parts.push(`${req.method}:${req.path}`);

    return parts.join(':');
  }

  /**
   * Sanitize key to remove special characters
   */
  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  }

  /**
   * Check if request is allowed
   */
  async check(req: Request): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    const key = this.getKey(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const resetAt = now + this.config.windowMs;

    try {
      // Use Redis sorted set for sliding window
      const multi = this.redis.multi();

      // Remove old entries outside the window
      multi.zremrangebyscore(key, 0, windowStart);

      // Count current requests in window
      multi.zcard(key);

      // Add current request
      multi.zadd(key, now, `${now}:${Math.random()}`);

      // Set expiry on the key
      multi.pexpire(key, this.config.windowMs);

      const results = await multi.exec();

      if (!results) {
        // Redis not available, allow request
        return {
          allowed: true,
          limit: this.config.max,
          remaining: this.config.max - 1,
          resetAt
        };
      }

      const currentCount = (results[1]?.[1] as number) || 0;
      const remaining = Math.max(0, this.config.max - currentCount - 1);
      const allowed = currentCount < this.config.max;

      return {
        allowed,
        limit: this.config.max,
        remaining,
        resetAt,
        retryAfter: allowed ? undefined : Math.ceil(this.config.windowMs / 1000)
      };
    } catch (error) {
      console.error('[RateLimiter] Error:', error);
      // On error, allow request (fail open)
      return {
        allowed: true,
        limit: this.config.max,
        remaining: this.config.max - 1,
        resetAt
      };
    }
  }

  /**
   * Express middleware factory
   */
  middleware() {
    return async (req: Request, res: any) => {
      const result = await this.check(req);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString()
      });

      if (!result.allowed) {
        res.set('Retry-After', (result.retryAfter || Math.ceil(this.config.windowMs / 1000)).toString());
        res.status(429).json({
          success: false,
          error: this.config.message,
          retryAfter: result.retryAfter
        });
        return;
      }
    };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// ============================================================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================================================

/**
 * Webhook rate limiter - strict limits for WhatsApp webhook
 */
export const webhookRateLimiter = new RedisRateLimiter({
  max: 100,
  windowMs: 60000, // 1 minute
  keyPrefix: 'ratelimit:webhook',
  message: 'Webhook rate limit exceeded'
});

/**
 * API rate limiter - moderate limits for general API
 */
export const apiRateLimiter = new RedisRateLimiter({
  max: 1000,
  windowMs: 60000, // 1 minute
  keyPrefix: 'ratelimit:api',
  message: 'API rate limit exceeded'
});

/**
 * Strict rate limiter - for sensitive endpoints
 */
export const strictRateLimiter = new RedisRateLimiter({
  max: 10,
  windowMs: 60000, // 1 minute
  keyPrefix: 'ratelimit:strict',
  message: 'Rate limit exceeded, please slow down'
});

/**
 * Per-merchant rate limiter
 */
export const merchantRateLimiter = new RedisRateLimiter({
  max: 500,
  windowMs: 60000,
  keyPrefix: 'ratelimit:merchant',
  perKey: (req: Request) => {
    // Extract merchant ID from Authorization header or body
    const auth = req.headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth.slice(7);
    }
    return null;
  }
});
