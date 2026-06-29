/**
 * Redis client wrapper for Genie services
 */

import Redis from 'ioredis';

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });

    redisInstance.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
    });
  }
  return redisInstance;
}

export async function withRedis<T>(fn: (redis: Redis) => Promise<T>): Promise<T> {
  const redis = getRedis();
  return fn(redis);
}