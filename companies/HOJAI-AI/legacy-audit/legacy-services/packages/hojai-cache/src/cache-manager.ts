/**
 * HOJAI Cache Manager
 * Unified caching interface with fallback support
 */

import { RedisCache } from './redis.js';
import { MemoryCache } from './memory-cache.js';

export interface CacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

export class CacheManager implements CacheBackend {
  private redis: RedisCache;
  private memory: MemoryCache;
  private useRedis: boolean = false;

  constructor(options: {
    useRedis?: boolean;
    redisPrefix?: string;
    memoryMax?: number;
  } = {}) {
    this.redis = new RedisCache(options.redisPrefix || 'hojai');
    this.memory = new MemoryCache({
      max: options.memoryMax || 1000,
      prefix: options.redisPrefix || 'hojai'
    });
    this.useRedis = options.useRedis || false;
  }

  /**
   * Initialize Redis connection
   */
  async init(): Promise<void> {
    if (this.useRedis) {
      try {
        await this.redis.connect();
      } catch (err) {
        console.warn('[CacheManager] Redis unavailable, falling back to memory cache');
        this.useRedis = false;
      }
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis) {
      return this.redis.get<T>(key);
    }
    return this.memory.get<T>(key) || null;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (this.useRedis) {
      await this.redis.set(key, value, { ttl });
    } else {
      this.memory.set(key, value, ttl);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    if (this.useRedis) {
      await this.redis.delete(key);
    } else {
      this.memory.delete(key);
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    if (this.useRedis) {
      return this.redis.has(key);
    }
    return this.memory.has(key);
  }

  /**
   * Get or set pattern
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    if (this.useRedis) {
      return this.redis.getOrSet(key, factory, { ttl });
    }
    return this.memory.getOrSet(key, factory);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.useRedis) {
      await this.redis.deletePattern('*');
    } else {
      this.memory.clear();
    }
  }

  /**
   * Delete by tenant pattern
   */
  async deleteByTenant(tenantId: string): Promise<void> {
    const pattern = `${tenantId}:*`;
    if (this.useRedis) {
      await this.redis.deletePattern(pattern);
    } else {
      this.memory.deleteByPattern(pattern);
    }
  }

  /**
   * Get memory cache stats
   */
  getMemoryStats() {
    return this.memory.getStats();
  }
}
