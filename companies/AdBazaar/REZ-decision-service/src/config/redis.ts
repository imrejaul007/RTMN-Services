/**
 * Redis Configuration
 */
import Redis from 'ioredis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let redis: Redis | null = null;

export function connectRedis(): Redis {
  if (redis) return redis;

  redis = new Redis(config.redis.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });

  redis.on('connect', () => {
    logger.info('[Redis] Connected');
  });

  redis.on('error', (err) => {
    logger.error('[Redis] Error', { error: err.message });
  });

  redis.connect().catch((err) => {
    logger.warn('[Redis] Connection failed', { error: err.message });
  });

  return redis;
}

export function getRedis(): Redis | null {
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
