/**
 * Redis Connection
 * Exhibition OS Cache Layer
 */

import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let client: RedisClientType;

export async function connectRedis(): Promise<RedisClientType> {
  client = createClient({ url: REDIS_URL });

  client.on('error', (err) => console.error('Redis error:', err));
  client.on('connect', () => console.log('Redis connected'));
  client.on('ready', () => console.log('Redis ready'));

  await client.connect();
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    console.log('Redis disconnected');
  }
}

export function getRedisClient(): RedisClientType {
  if (!client) {
    throw new Error('Redis client not initialized');
  }
  return client;
}

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  await client.setEx(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(key: string): Promise<void> {
  await client.del(key);
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(keys);
  }
}

export default { connectRedis, disconnectRedis, getRedisClient, cacheGet, cacheSet, cacheDel, cacheInvalidatePattern };
