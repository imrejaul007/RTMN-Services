/**
 * Cache System - Comprehensive Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// IN-MEMORY CACHE
// ============================================

describe('In-Memory Cache', () => {
  interface CacheEntry<T> {
    value: T;
    expiresAt: number | null;
    createdAt: number;
    hits: number;
  }

  class InMemoryCache<T = any> {
    private store: Map<string, CacheEntry<T>> = new Map();
    private maxSize: number;
    private defaultTTL: number;

    constructor(maxSize: number = 1000, defaultTTL: number = 3600000) {
      this.maxSize = maxSize;
      this.defaultTTL = defaultTTL;
    }

    private isExpired(entry: CacheEntry<T>): boolean {
      if (entry.expiresAt === null) return false;
      return Date.now() > entry.expiresAt;
    }

    set(key: string, value: T, ttl?: number): void {
      if (this.store.size >= this.maxSize && !this.store.has(key)) {
        // Evict oldest entry
        const oldestKey = this.store.keys().next().value;
        this.store.delete(oldestKey);
      }

      this.store.set(key, {
        value,
        expiresAt: ttl ? Date.now() + ttl : null,
        createdAt: Date.now(),
        hits: 0,
      });
    }

    get(key: string): T | null {
      const entry = this.store.get(key);
      if (!entry) return null;
      if (this.isExpired(entry)) {
        this.store.delete(key);
        return null;
      }
      entry.hits++;
      return entry.value;
    }

    has(key: string): boolean {
      const entry = this.store.get(key);
      if (!entry) return false;
      if (this.isExpired(entry)) {
        this.store.delete(key);
        return false;
      }
      return true;
    }

    delete(key: string): boolean {
      return this.store.delete(key);
    }

    clear(): void {
      this.store.clear();
    }

    size(): number {
      return this.store.size;
    }

    keys(): string[] {
      return Array.from(this.store.keys());
    }

    prune(): number {
      let pruned = 0;
      for (const [key, entry] of this.store.entries()) {
        if (this.isExpired(entry)) {
          this.store.delete(key);
          pruned++;
        }
      }
      return pruned;
    }

    getStats(): { size: number; hits: number; misses: number } {
      let hits = 0;
      this.store.forEach(entry => {
        hits += entry.hits;
      });
      return {
        size: this.store.size,
        hits,
        misses: 0,
      };
    }
  }

  describe('Basic Operations', () => {
    it('should set and get value', () => {
      const cache = new InMemoryCache<string>();
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for missing key', () => {
      const cache = new InMemoryCache<string>();
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing value', () => {
      const cache = new InMemoryCache<string>();
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should check existence with has()', () => {
      const cache = new InMemoryCache<string>();
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete entry', () => {
      const cache = new InMemoryCache<string>();
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should clear all entries', () => {
      const cache = new InMemoryCache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entry after TTL', async () => {
      const cache = new InMemoryCache<string>(100, 100); // 100ms TTL
      cache.set('key1', 'value1', 100);
      expect(cache.get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
    });

    it('should not expire entry without TTL', () => {
      const cache = new InMemoryCache<string>(100, 1000000);
      cache.set('key1', 'value1'); // No TTL
      expect(cache.get('key1')).toBe('value1');
    });

    it('should prune expired entries', async () => {
      const cache = new InMemoryCache<string>(100, 100);
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2'); // No expiration

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.prune()).toBe(1);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict oldest when max size reached', () => {
      const cache = new InMemoryCache<string>(2);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3'); // Should evict key1

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    it('should not evict when updating existing key', () => {
      const cache = new InMemoryCache<string>(2);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key1', 'value1updated'); // Update, not new key
      cache.set('key3', 'value3');

      expect(cache.get('key1')).toBe('value1updated');
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache size', () => {
      const cache = new InMemoryCache<string>();
      expect(cache.size()).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
    });

    it('should track key access', () => {
      const cache = new InMemoryCache<string>();
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });
  });
});

// ============================================
// CACHE WITH PERSISTENCE
// ============================================

describe('Cache with Persistence', () => {
  interface PersistentCacheEntry {
    value: any;
    expiresAt: number | null;
  }

  class PersistentCache<T = any> {
    private cache: Map<string, PersistentCacheEntry> = new Map();
    private storageKey: string;

    constructor(storageKey: string = 'cache') {
      this.storageKey = storageKey;
      this.load();
    }

    private load(): void {
      try {
        const data = localStorage?.getItem(this.storageKey);
        if (data) {
          const entries = JSON.parse(data);
          for (const [key, entry] of Object.entries(entries)) {
            this.cache.set(key, entry as PersistentCacheEntry);
          }
        }
      } catch {
        // Ignore errors
      }
    }

    private save(): void {
      try {
        const data: Record<string, PersistentCacheEntry> = {};
        this.cache.forEach((value, key) => {
          data[key] = value;
        });
        localStorage?.setItem(this.storageKey, JSON.stringify(data));
      } catch {
        // Ignore errors
      }
    }

    set(key: string, value: T, ttl?: number): void {
      this.cache.set(key, {
        value,
        expiresAt: ttl ? Date.now() + ttl : null,
      });
      this.save();
    }

    get(key: string): T | null {
      const entry = this.cache.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        this.save();
        return null;
      }
      return entry.value;
    }
  }

  // Tests would require localStorage mock
  describe('Serialization', () => {
    it('should serialize cache entries', () => {
      const entry: PersistentCacheEntry = {
        value: { name: 'test' },
        expiresAt: Date.now() + 60000,
      };

      const serialized = JSON.stringify(entry);
      const parsed = JSON.parse(serialized);

      expect(parsed.value.name).toBe('test');
      expect(typeof parsed.expiresAt).toBe('number');
    });
  });
});

// ============================================
// CACHE STRATEGIES
// ============================================

describe('Cache Strategies', () => {
  describe('Cache-Aside (Lazy Loading)', () => {
    const cacheAside = async <T>(
      cache: Map<string, T>,
      key: string,
      fetchFn: () => Promise<T>
    ): Promise<T> => {
      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const value = await fetchFn();
      cache.set(key, value);
      return value;
    };

    it('should return cached value if exists', async () => {
      const cache = new Map<string, string>();
      cache.set('key1', 'cached_value');

      const fetchFn = vi.fn(() => Promise.resolve('fresh_value'));

      const result = await cacheAside(cache, 'key1', fetchFn);

      expect(result).toBe('cached_value');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache if not exists', async () => {
      const cache = new Map<string, string>();
      const fetchFn = vi.fn(() => Promise.resolve('fresh_value'));

      const result = await cacheAside(cache, 'key1', fetchFn);

      expect(result).toBe('fresh_value');
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(cache.get('key1')).toBe('fresh_value');
    });
  });

  describe('Write-Through', () => {
    const writeThrough = async <T>(
      cache: Map<string, T>,
      db: Map<string, T>,
      key: string,
      value: T
    ): Promise<void> => {
      cache.set(key, value);
      db.set(key, value);
    };

    it('should write to both cache and database', async () => {
      const cache = new Map<string, string>();
      const db = new Map<string, string>();

      await writeThrough(cache, db, 'key1', 'value1');

      expect(cache.get('key1')).toBe('value1');
      expect(db.get('key1')).toBe('value1');
    });
  });

  describe('Write-Behind (Write-Back)', () => {
    const writeBehind = async <T>(
      cache: Map<string, T>,
      pendingWrites: Map<string, T>,
      key: string,
      value: T
    ): Promise<void> => {
      cache.set(key, value);
      pendingWrites.set(key, value);
    };

    it('should write to cache and pending queue', async () => {
      const cache = new Map<string, string>();
      const pendingWrites = new Map<string, string>();

      await writeBehind(cache, pendingWrites, 'key1', 'value1');

      expect(cache.get('key1')).toBe('value1');
      expect(pendingWrites.get('key1')).toBe('value1');
    });
  });

  describe('Refresh-Ahead', () => {
    const refreshAhead = async <T>(
      cache: Map<string, { value: T; expiresAt: number }>,
      key: string,
      fetchFn: () => Promise<T>,
      refreshThreshold: number = 0.8
    ): Promise<T> => {
      const cached = cache.get(key);
      
      if (!cached) {
        const value = await fetchFn();
        cache.set(key, { value, expiresAt: Date.now() + 60000 });
        return value;
      }

      const timeLeft = cached.expiresAt - Date.now();
      const totalTime = 60000;
      
      if (timeLeft / totalTime < refreshThreshold) {
        // Async refresh
        fetchFn().then(value => {
          cache.set(key, { value, expiresAt: Date.now() + 60000 });
        });
      }

      return cached.value;
    };

    it('should return cached value', async () => {
      const cache = new Map<string, { value: string; expiresAt: number }>();
      cache.set('key1', { value: 'cached', expiresAt: Date.now() + 60000 });

      const fetchFn = vi.fn(() => Promise.resolve('fresh'));

      const result = await refreshAhead(cache, 'key1', fetchFn, 0.5);

      expect(result).toBe('cached');
    });
  });
});

// ============================================
// CACHE INVALIDATION
// ============================================

describe('Cache Invalidation', () => {
  describe('Invalidation Patterns', () => {
    const invalidateByPattern = (
      cache: Map<string, any>,
      pattern: RegExp
    ): number => {
      let count = 0;
      for (const key of cache.keys()) {
        if (pattern.test(key)) {
          cache.delete(key);
          count++;
        }
      }
      return count;
    };

    it('should invalidate by pattern', () => {
      const cache = new Map<string, string>();
      cache.set('user:1', 'user1');
      cache.set('user:2', 'user2');
      cache.set('post:1', 'post1');

      const count = invalidateByPattern(cache, /^user:/);

      expect(count).toBe(2);
      expect(cache.has('user:1')).toBe(false);
      expect(cache.has('user:2')).toBe(false);
      expect(cache.get('post:1')).toBe('post1');
    });

    it('should invalidate all with wildcard', () => {
      const cache = new Map<string, string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      invalidateByPattern(cache, /.*/);

      expect(cache.size).toBe(0);
    });
  });

  describe('TTL-based Invalidation', () => {
    const createTTL = (ttl: number) => Date.now() + ttl;

    it('should create correct TTL', () => {
      const ttl = createTTL(60000);
      expect(ttl).toBeGreaterThan(Date.now());
      expect(ttl - Date.now()).toBe(60000);
    });

    it('should check expiration', () => {
      const isExpired = (expiresAt: number) => Date.now() > expiresAt;

      expect(isExpired(Date.now() - 1000)).toBe(true);
      expect(isExpired(Date.now() + 60000)).toBe(false);
    });
  });

  describe('Version-based Invalidation', () => {
    const CacheVersion = new Map<string, number>();

    const isValid = (key: string, version: number): boolean => {
      return CacheVersion.get(key) === version;
    };

    const invalidate = (key: string): void => {
      const current = CacheVersion.get(key) || 0;
      CacheVersion.set(key, current + 1);
    };

    it('should track cache versions', () => {
      CacheVersion.set('key1', 1);

      expect(isValid('key1', 1)).toBe(true);
      expect(isValid('key1', 2)).toBe(false);
    });

    it('should increment version on invalidation', () => {
      CacheVersion.set('key1', 1);
      invalidate('key1');

      expect(CacheVersion.get('key1')).toBe(2);
    });
  });
});

// ============================================
// DISTRIBUTED CACHE
// ============================================

describe('Distributed Cache (Redis-like)', () => {
  class RedisCache {
    private store: Map<string, { value: string; expiry: number | null }> = new Map();

    async get(key: string): Promise<string | null> {
      const entry = this.store.get(key);
      if (!entry) return null;
      if (entry.expiry && Date.now() > entry.expiry) {
        this.store.delete(key);
        return null;
      }
      return entry.value;
    }

    async set(key: string, value: string, ttlMs?: number): Promise<void> {
      this.store.set(key, {
        value,
        expiry: ttlMs ? Date.now() + ttlMs : null,
      });
    }

    async del(key: string): Promise<number> {
      return this.store.delete(key) ? 1 : 0;
    }

    async exists(key: string): Promise<boolean> {
      const value = await this.get(key);
      return value !== null;
    }

    async expire(key: string, ttlMs: number): Promise<boolean> {
      const entry = this.store.get(key);
      if (!entry) return false;
      entry.expiry = Date.now() + ttlMs;
      return true;
    }

    async ttl(key: string): Promise<number> {
      const entry = this.store.get(key);
      if (!entry || !entry.expiry) return -1;
      const remaining = entry.expiry - Date.now();
      return remaining > 0 ? remaining : -2;
    }

    async incr(key: string): Promise<number> {
      const current = await this.get(key);
      const newValue = (parseInt(current || '0', 10) + 1).toString();
      await this.set(key, newValue);
      return parseInt(newValue, 10);
    }

    async keys(pattern: string): Promise<string[]> {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(this.store.keys()).filter(k => regex.test(k));
    }
  }

  describe('Basic Operations', () => {
    it('should get and set values', async () => {
      const cache = new RedisCache();
      await cache.set('key1', 'value1');
      expect(await cache.get('key1')).toBe('value1');
    });

    it('should return null for missing key', async () => {
      const cache = new RedisCache();
      expect(await cache.get('nonexistent')).toBeNull();
    });

    it('should delete key', async () => {
      const cache = new RedisCache();
      await cache.set('key1', 'value1');
      await cache.del('key1');
      expect(await cache.get('key1')).toBeNull();
    });

    it('should check existence', async () => {
      const cache = new RedisCache();
      await cache.set('key1', 'value1');
      expect(await cache.exists('key1')).toBe(true);
      expect(await cache.exists('key2')).toBe(false);
    });
  });

  describe('TTL Operations', () => {
    it('should set with TTL', async () => {
      const cache = new RedisCache();
      await cache.set('key1', 'value1', 100);
      expect(await cache.get('key1')).toBe('value1');
    });

    it('should expire key', async () => {
      const cache = new RedisCache();
      await cache.set('key1', 'value1');
      await cache.expire('key1', 50);
      
      expect(await cache.get('key1')).toBe('value1');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(await cache.get('key1')).toBeNull();
    });

    it('should return TTL', async () => {
      const cache = new RedisCache();
      await cache.set('key1', 'value1', 60000);
      const ttl = await cache.ttl('key1');
      expect(ttl).toBeGreaterThan(50000);
      expect(ttl).toBeLessThanOrEqual(60000);
    });
  });

  describe('Atomic Operations', () => {
    it('should increment value', async () => {
      const cache = new RedisCache();
      await cache.set('counter', '0');
      expect(await cache.incr('counter')).toBe(1);
      expect(await cache.incr('counter')).toBe(2);
      expect(await cache.get('counter')).toBe('2');
    });

    it('should increment from zero', async () => {
      const cache = new RedisCache();
      expect(await cache.incr('new_counter')).toBe(1);
    });
  });

  describe('Pattern Matching', () => {
    it('should find keys by pattern', async () => {
      const cache = new RedisCache();
      await cache.set('user:1', 'user1');
      await cache.set('user:2', 'user2');
      await cache.set('post:1', 'post1');

      const userKeys = await cache.keys('user:*');
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain('user:1');
      expect(userKeys).toContain('user:2');
    });
  });
});
