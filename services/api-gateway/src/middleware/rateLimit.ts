import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import type { RedisReply } from 'rate-limit-redis';

// Redis client for rate limiting
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

// Wrapper function to handle the spread properly with Redis v4 API
const sendCommand = async (...args: Parameters<typeof redis.call>): Promise<RedisReply> => {
  return redis.call(...args) as Promise<RedisReply>;
};

export function createRateLimiter(config: { windowMs: number; max: number; keyPrefix: string }) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand,
    }),
    keyGenerator: (req) => {
      // Rate limit by tenant + user or IP
      const tenantId = req.auth?.tenantId || req.ip || 'anonymous';
      const userId = req.auth?.userId || '';
      return `${config.keyPrefix}:${tenantId}:${userId}`.replace(/:/g, '_');
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    }
  });
}

// Default rate limiters
export const defaultLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyPrefix: 'rl_default'
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: 'rl_auth'
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'rl_api'
});
