/**
 * HOJAI Redis Cache
 * Redis-based distributed caching
 */

import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export interface CacheOptions {
  ttl?: number; // seconds
  prefix?: string;
}

export class RedisCache {
  private client: RedisClientType;
  private prefix: string;
  private connected = false;

  constructor(prefix: string = 'hojai') {
    this.prefix = prefix;
    this.client = createClient({ url: REDIS_URL });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    this.client.on('error', (err) => {
      console.error('[Redis Cache] Error:', err);
    });

    await this.client.connect();
    this.connected = true;
    console.log('[Redis Cache] Connected to Redis');
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.client.quit();
    this.connected = false;
    console.log('[Redis Cache] Disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Get value
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(this.getKey(key));
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Set value
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (options?.ttl) {
      await this.client.setEx(this.getKey(key), options.ttl, stringValue);
    } else {
      await this.client.set(this.getKey(key), stringValue);
    }
  }

  /**
   * Delete key
   */
  async delete(key: string): Promise<void> {
    await this.client.del(this.getKey(key));
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(this.getKey(key));
    return exists === 1;
  }

  /**
   * Set with TTL
   */
  async setEx<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await this.client.setEx(this.getKey(key), ttlSeconds, stringValue);
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(this.getKey(key));
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    return this.client.decr(this.getKey(key));
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(`${this.prefix}:${pattern}`);
    if (keys.length === 0) return 0;

    await this.client.del(keys);
    return keys.length;
  }

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    const prefixedKeys = keys.map(k => this.getKey(k));
    const values = await this.client.mGet(prefixedKeys);

    return values.map(v => {
      if (!v) return null;
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as T;
      }
    });
  }

  /**
   * Set multiple keys
   */
  async mset(entries: Record<string, any>, ttl?: number): Promise<void> {
    const pipeline = this.client.multi();

    for (const [key, value] of Object.entries(entries)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const fullKey = this.getKey(key);

      if (ttl) {
        pipeline.setEx(fullKey, ttl, stringValue);
      } else {
        pipeline.set(fullKey, stringValue);
      }
    }

    await pipeline.exec();
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(this.getKey(key));
  }

  /**
   * Expire key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(this.getKey(key), ttlSeconds);
  }
}
