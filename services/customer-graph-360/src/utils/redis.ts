import { createClient, RedisClientType } from 'redis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis client
 */
export async function initRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: config.redisUrl,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Get Redis client
 */
export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initRedis() first.');
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const value = await client.get(`${config.cache.keyPrefix}${key}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set value in cache
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const client = getRedisClient();
      const expiry = ttl || config.cache.ttl;
      await client.setEx(
        `${config.cache.keyPrefix}${key}`,
        expiry,
        JSON.stringify(value)
      );
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  },

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(`${config.cache.keyPrefix}${key}`);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedisClient();
      const result = await client.exists(`${config.cache.keyPrefix}${key}`);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Clear all cache with prefix
   */
  async clear(): Promise<void> {
    try {
      const client = getRedisClient();
      const keys = await client.keys(`${config.cache.keyPrefix}*`);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  },
};

export default cache;