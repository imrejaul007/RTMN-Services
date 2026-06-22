/**
 * Hojai Core - Rate Limiter Utility
 * Version: 1.1 | Date: June 12, 2026
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import { Redis } from 'ioredis';

/**
 * Create tenant-aware rate limiter
 */
export function createRateLimiter(options?: {
  windowMs?: number;
  maxRequests?: number;
  redisClient?: Redis;
}) {
  const windowMs = options?.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options?.maxRequests || 100;

  // Use Redis if client provided
  const store = options?.redisClient
    ? new RedisStore({
        // RedisStore expects sendCommand as (cmd, ...args) => Promise<result>
        sendCommand: async (...args: string[]): Promise<unknown> => {
          const command = args[0]?.toUpperCase();
          const commandArgs = args.slice(1);
          return options.redisClient!.call(command, ...commandArgs) as Promise<unknown>;
        },
      })
    : undefined;

  return rateLimit({
    windowMs,
    max: maxRequests,
    store,
    keyGenerator: (req: Request): string => {
      // Use tenant_id if available, otherwise IP
      return req.headers['x-tenant-id'] as string || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response): void => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil(windowMs / 1000)
        }
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}

/**
 * Create stricter rate limiter for sensitive endpoints
 */
export function createStrictRateLimiter(options?: {
  windowMs?: number;
  maxRequests?: number;
}): ReturnType<typeof rateLimit> {
  return createRateLimiter({
    windowMs: options?.windowMs || 60 * 1000,
    maxRequests: options?.maxRequests || 10
  });
}
