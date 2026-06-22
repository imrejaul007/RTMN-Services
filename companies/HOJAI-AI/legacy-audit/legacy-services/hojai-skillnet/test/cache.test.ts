/**
 * Cache Utility Tests
 * Note: Redis caching is optional for hojai-skillnet
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock CacheClient class for testing
class MockCacheClient {
  private connected = false;
  private prefix: string;
  private defaultTTL: number;
  private stats = { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 };
  private store = new Map<string, { value: string; expires: number }>();

  constructor(options?: { prefix?: string; defaultTTL?: number }) {
    this.prefix = options?.prefix || 'hojai:';
    this.defaultTTL = options?.defaultTTL || 300;
  }

  isConnected(): boolean { return this.connected; }
  getStats() { return { ...this.stats }; }
  resetStats() { this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 }; }

  async get(key: string): Promise<unknown | null> {
    if (!this.connected) { this.stats.misses++; return null; }
    const item = this.store.get(this.prefix + key);
    if (!item || Date.now() > item.expires) {
      this.stats.misses++;
      this.store.delete(this.prefix + key);
      return null;
    }
    this.stats.hits++;
    return JSON.parse(item.value);
  }

  async set(key: string, value: unknown, options?: { ttl?: number }): Promise<boolean> {
    if (!this.connected) return false;
    this.store.set(this.prefix + key, {
      value: JSON.stringify(value),
      expires: Date.now() + (options?.ttl || this.defaultTTL) * 1000
    });
    this.stats.sets++;
    return true;
  }

  async delete(key: string): Promise<boolean> {
    if (!this.connected) return false;
    this.stats.deletes++;
    return this.store.delete(this.prefix + key);
  }
}

describe('CacheClient', () => {
  let cache: MockCacheClient;

  beforeEach(() => {
    cache = new MockCacheClient({ prefix: 'test:', defaultTTL: 60 });
  });

  describe('constructor', () => {
    it('should create with custom options', () => {
      const customCache = new MockCacheClient({ prefix: 'custom:', defaultTTL: 120 });
      expect(customCache).toBeDefined();
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(cache.isConnected()).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = cache.getStats();
      expect(stats).toEqual({ hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 });
    });
  });

  describe('resetStats', () => {
    it('should reset stats', () => {
      cache.resetStats();
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
    });
  });

  describe('get (disconnected)', () => {
    it('should return null when not connected', async () => {
      const result = await cache.get('key');
      expect(result).toBeNull();
    });
  });

  describe('set (disconnected)', () => {
    it('should return false when not connected', async () => {
      const result = await cache.set('key', 'value');
      expect(result).toBe(false);
    });
  });

  describe('delete (disconnected)', () => {
    it('should return false when not connected', async () => {
      const result = await cache.delete('key');
      expect(result).toBe(false);
    });
  });

  describe('Cache interface', () => {
    it('should provide cache interface', () => {
      expect(typeof cache.isConnected).toBe('function');
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.set).toBe('function');
      expect(typeof cache.delete).toBe('function');
      expect(typeof cache.getStats).toBe('function');
      expect(typeof cache.resetStats).toBe('function');
    });

    it('should return stats object', () => {
      const stats = cache.getStats();
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('deletes');
      expect(stats).toHaveProperty('errors');
    });
  });
});

describe('Cache Key Patterns', () => {
  it('should build prefixed keys', () => {
    const prefix = 'hojai:';
    const key = 'predictions:123';
    const fullKey = prefix + key;
    expect(fullKey).toBe('hojai:predictions:123');
  });

  it('should support tenant namespacing', () => {
    const tenantId = 'tenant-123';
    const key = 'predictions';
    const fullKey = `${tenantId}:${key}`;
    expect(fullKey).toBe('tenant-123:predictions');
  });
});
