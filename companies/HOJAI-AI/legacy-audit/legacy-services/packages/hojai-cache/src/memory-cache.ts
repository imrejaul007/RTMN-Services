/**
 * HOJAI Memory Cache
 * In-memory LRU cache for single-instance caching
 */

import { LRUCache } from 'lru-cache';

export interface MemoryCacheOptions {
  max?: number; // max items
  ttl?: number; // ms
  prefix?: string;
}

export class MemoryCache {
  private cache: LRUCache<string, any>;
  private prefix: string;

  constructor(options: MemoryCacheOptions = {}) {
    this.prefix = options.prefix || 'hojai';
    this.cache = new LRUCache<string, any>({
      max: options.max || 1000,
      ttl: options.ttl,
      updateAgeOnGet: false,
    });
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
  get<T>(key: string): T | undefined {
    return this.cache.get(this.getKey(key)) as T | undefined;
  }

  /**
   * Set value
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const fullKey = this.getKey(key);

    if (ttl) {
      // LRU cache handles TTL internally
      this.cache.set(fullKey, value, { ttl });
    } else {
      this.cache.set(fullKey, value);
    }
  }

  /**
   * Delete key
   */
  delete(key: string): boolean {
    return this.cache.delete(this.getKey(key));
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.cache.has(this.getKey(key));
  }

  /**
   * Clear all
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value);
    return value;
  }

  /**
   * Delete by pattern (prefix match)
   */
  deleteByPattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(`^${this.prefix}:${pattern}`);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cache stats
   */
  getStats(): {
    size: number;
    max: number;
  } {
    return {
      size: this.cache.size,
      max: this.cache.max as number,
    };
  }
}
