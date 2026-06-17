/**
 * Redis Configuration
 *
 * Redis connection setup for caching and pub/sub.
 */

import Redis from 'ioredis';
import { config } from './index.js';
import { logger } from './logger.js';

// ============================================================================
// REDIS CLIENT
// ============================================================================

let redisClient: Redis | null = null;

// ============================================================================
// CONNECT
// ============================================================================

export function connectRedis(): Redis {
  if (redisClient) {
    return redisClient;
  }

  logger.info('Connecting to Redis...', { url: config.redis.url });

  redisClient = new Redis(config.redis.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 3) {
        logger.warn('Redis max retries reached, continuing without Redis');
        return null;
      }
      return Math.min(times * 100, 3000);
    },
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });

  redisClient.on('ready', () => {
    logger.info('Redis ready');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  // Connect
  redisClient.connect().catch((err) => {
    logger.warn('Redis initial connection failed', { error: err.message });
  });

  return redisClient;
}

// ============================================================================
// DISCONNECT
// ============================================================================

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
}

// ============================================================================
// GET CLIENT
// ============================================================================

export function getRedisClient(): Redis | null {
  return redisClient;
}

// ============================================================================
// CACHE HELPERS
// ============================================================================

export async function cacheGet(key: string): Promise<string | null> {
  if (!redisClient) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error('Redis cache set failed', { key, error });
  }
}

export async function cacheDelete(key: string): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error('Redis cache delete failed', { key, error });
  }
}

export async function cacheIncr(key: string): Promise<number> {
  if (!redisClient) return 0;
  try {
    return await redisClient.incr(key);
  } catch {
    return 0;
  }
}
