/**
 * Redis Configuration
 */
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_URI || 'redis://localhost:6379';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });

    redis.on('connect', () => {
      logger.info('[Redis] Connected');
    });

    redis.on('error', (err) => {
      logger.error('[Redis] Error', { error: err.message });
    });

    redis.on('close', () => {
      logger.warn('[Redis] Connection closed');
    });

    // Connect immediately
    redis.connect().catch((err) => {
      logger.warn('[Redis] Initial connection failed', { error: err.message });
    });
  }

  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('[Redis] Disconnected');
  }
}
