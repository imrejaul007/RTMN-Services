/**
 * Hojai Core - Redis Cache Utility
 * Version: 1.0.0 | Date: June 12, 2026
 * Purpose: Redis caching layer for performance optimization
 */

import { Redis } from 'ioredis';
import { createLogger } from './logger.js';

const logger = createLogger('cache');

// ============================================
// TYPES
// ============================================

export interface CacheOptions {
  ttl?: number;           // Time to live in seconds (default: 300 = 5 minutes)
  prefix?: string;         // Key prefix (default: 'hojai:')
  namespace?: string;       // Namespace for keys (e.g., 'tenant:123')
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

const defaultStats: CacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0
};

// ============================================
// CACHE CLIENT
// ============================================

export class CacheClient {
  private client: Redis | null = null;
  private connected: boolean = false;
  private stats: CacheStats = { ...defaultStats };
  private prefix: string;
  private defaultTTL: number;

  constructor(options?: {
    url?: string;
    prefix?: string;
    defaultTTL?: number;
  }) {
    this.prefix = options?.prefix || 'hojai:';
    this.defaultTTL = options?.defaultTTL || 300;

    const redisUrl = options?.url || process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.client = new Redis(redisUrl, {
        retryStrategy: (times) => {
          if (times > 10) {
            logger.error('redis_max_retries', { times });
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: true
      });

      this.client.on('connect', () => {
        this.connected = true;
        logger.info('redis_connected');
      });

      this.client.on('error', (err) => {
        this.connected = false;
        logger.error('redis_error', { error: err.message });
      });

      this.client.on('close', () => {
        this.connected = false;
        logger.warn('redis_disconnected');
      });
    } catch (error) {
      logger.error('redis_init_failed', { error: (error as Error).message });
    }
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.connect();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      logger.error('redis_connect_failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  /**
   * Get cache stats
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache stats
   */
  resetStats(): void {
    this.stats = { ...defaultStats };
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string, namespace?: string): string {
    const parts = [this.prefix];
    if (namespace) parts.push(`${namespace}:`);
    parts.push(key);
    return parts.join('');
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    if (!this.isConnected()) {
      this.stats.misses++;
      return null;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      const value = await this.client!.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      this.stats.errors++;
      logger.error('cache_get_error', { key, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options?.namespace);
      const ttl = options?.ttl || this.defaultTTL;
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await this.client!.setex(fullKey, ttl, serialized);
      } else {
        await this.client!.set(fullKey, serialized);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('cache_set_error', { key, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      await this.client!.del(fullKey);
      this.stats.deletes++;
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('cache_delete_error', { key, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Delete all keys matching pattern
   */
  async deletePattern(pattern: string, namespace?: string): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      const fullPattern = this.buildKey(pattern, namespace);
      const keys = await this.client!.keys(fullPattern);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.client!.del(...keys);
      this.stats.deletes += deleted;
      return deleted;
    } catch (error) {
      this.stats.errors++;
      logger.error('cache_delete_pattern_error', { pattern, error: (error as Error).message });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.client!.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      logger.error('cache_exists_error', { key, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Increment value
   */
  async increment(key: string, namespace?: string, amount: number = 1): Promise<number | null> {
    if (!this.isConnected()) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      return await this.client!.incrby(fullKey, amount);
    } catch (error) {
      this.stats.errors++;
      logger.error('cache_increment_error', { key, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Get or set value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options?.namespace);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const value = await factory();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      logger.info('redis_closed');
    }
  }
}

// ============================================
// CACHE DECORATOR HELPER
// ============================================

/**
 * Create a cached version of a function
 */
export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  cache: CacheClient,
  keyBuilder: (...args: Parameters<T>) => string,
  options?: CacheOptions
): (fn: T) => T {
  return (fn: T): T => {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const key = keyBuilder(...args);
      const cached = await cache.get<ReturnType<T>>(key, options?.namespace);

      if (cached !== null) {
        return cached;
      }

      const result = await fn(...args);
      await cache.set(key, result, options);
      return result;
    }) as T;
  };
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let cacheInstance: CacheClient | null = null;

/**
 * Get or create cache instance
 */
export function getCache(): CacheClient {
  if (!cacheInstance) {
    cacheInstance = new CacheClient();
  }
  return cacheInstance;
}

/**
 * Initialize cache with connection
 */
export async function initCache(): Promise<CacheClient> {
  const cache = getCache();
  await cache.connect();
  return cache;
}

// ============================================
// EXPORTS
// ============================================

export default {
  CacheClient,
  getCache,
  initCache,
  withCache
};
