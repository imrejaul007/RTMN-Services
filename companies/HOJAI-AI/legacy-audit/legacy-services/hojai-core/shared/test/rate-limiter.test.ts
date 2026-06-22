/**
 * Rate Limiter - Comprehensive Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// RATE LIMITER
// ============================================

describe('Rate Limiter', () => {
  interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: any) => string;
  }

  interface RateLimitStore {
    [key: string]: { count: number; resetTime: number };
  }

  class InMemoryRateLimiter {
    private store: RateLimitStore = {};
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
      this.config = config;
    }

    private getKey(req: any): string {
      if (this.config.keyGenerator) {
        return this.config.keyGenerator(req);
      }
      return req.ip || req.ipAddress || 'default';
    }

    private cleanup(): void {
      const now = Date.now();
      for (const key in this.store) {
        if (this.store[key].resetTime < now) {
          delete this.store[key];
        }
      }
    }

    check(req: any): { allowed: boolean; remaining: number; resetTime: number } {
      this.cleanup();

      const key = this.getKey(req);
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      if (!this.store[key] || this.store[key].resetTime < now) {
        this.store[key] = {
          count: 1,
          resetTime: now + this.config.windowMs,
        };
        return {
          allowed: true,
          remaining: this.config.maxRequests - 1,
          resetTime: this.store[key].resetTime,
        };
      }

      if (this.store[key].count >= this.config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: this.store[key].resetTime,
        };
      }

      this.store[key].count++;
      return {
        allowed: true,
        remaining: this.config.maxRequests - this.store[key].count,
        resetTime: this.store[key].resetTime,
      };
    }

    reset(req: any): void {
      const key = this.getKey(req);
      delete this.store[key];
    }

    resetAll(): void {
      this.store = {};
    }
  }

  describe('Basic Rate Limiting', () => {
    it('should allow first request', () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      const result = limiter.check({ ip: '192.168.1.1' });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should allow subsequent requests within limit', () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
      });

      const req = { ip: '192.168.1.1' };
      
      expect(limiter.check(req).allowed).toBe(true);
      expect(limiter.check(req).allowed).toBe(true);
      expect(limiter.check(req).allowed).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      const req = { ip: '192.168.1.1' };

      limiter.check(req);
      limiter.check(req);
      const result = limiter.check(req);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track remaining requests', () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      const req = { ip: '192.168.1.1' };

      expect(limiter.check(req).remaining).toBe(4);
      expect(limiter.check(req).remaining).toBe(3);
      expect(limiter.check(req).remaining).toBe(2);
      expect(limiter.check(req).remaining).toBe(1);
      expect(limiter.check(req).remaining).toBe(0);
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should track requests per IP', () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      limiter.check({ ip: '192.168.1.1' });
      limiter.check({ ip: '192.168.1.1' });
      
      const result = limiter.check({ ip: '192.168.1.2' });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should block specific IP', () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      limiter.check({ ip: '192.168.1.1' });
      limiter.check({ ip: '192.168.1.1' });
      
      const result = limiter.check({ ip: '192.168.1.1' });

      expect(result.allowed).toBe(false);
    });
  });

  describe('Custom Key Generation', () => {
    it('should use custom key generator', () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        keyGenerator: (req) => req.userId || req.ip,
      });

      limiter.check({ userId: 'user_123' });
      limiter.check({ userId: 'user_123' });
      
      const result = limiter.check({ userId: 'user_123' });

      expect(result.allowed).toBe(false);
    });

    it('should fall back to IP when userId not provided', () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        keyGenerator: (req) => req.userId || req.ip,
      });

      limiter.check({ ip: '192.168.1.1' });
      limiter.check({ ip: '192.168.1.1' });
      
      const result = limiter.check({ ip: '192.168.1.1' });

      expect(result.allowed).toBe(false);
    });
  });

  describe('Window Expiration', () => {
    it('should reset after window expires', async () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 100, // 100ms window
        maxRequests: 1,
      });

      const req = { ip: '192.168.1.1' };
      
      expect(limiter.check(req).allowed).toBe(true);
      expect(limiter.check(req).allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(limiter.check(req).allowed).toBe(true);
    });

    it('should maintain separate windows per key', async () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 100,
        maxRequests: 1,
      });

      limiter.check({ ip: '192.168.1.1' });
      
      const result2 = limiter.check({ ip: '192.168.1.2' });

      expect(result2.allowed).toBe(true);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset specific key', () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      const req = { ip: '192.168.1.1' };

      limiter.check(req);
      limiter.check(req);
      expect(limiter.check(req).allowed).toBe(false);

      limiter.reset(req);
      expect(limiter.check(req).allowed).toBe(true);
    });

    it('should reset all keys', () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      limiter.check({ ip: '192.168.1.1' });
      limiter.check({ ip: '192.168.1.2' });

      limiter.resetAll();

      expect(limiter.check({ ip: '192.168.1.1' }).allowed).toBe(true);
      expect(limiter.check({ ip: '192.168.1.2' }).allowed).toBe(true);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include reset time', () => {
      const limiter = new InMemoryRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      const result = limiter.check({ ip: '192.168.1.1' });

      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
  });
});

// ============================================
// TOKEN BUCKET ALGORITHM
// ============================================

describe('Token Bucket Algorithm', () => {
  interface Bucket {
    tokens: number;
    lastRefill: number;
  }

  class TokenBucket {
    private buckets: Map<string, Bucket> = new Map();
    private config: {
      capacity: number;
      refillRate: number; // tokens per second
      refillInterval: number;
    };

    constructor(capacity: number, refillRate: number) {
      this.config = {
        capacity,
        refillRate,
        refillInterval: 1000, // 1 second
      };
    }

    private getBucket(key: string): Bucket {
      if (!this.buckets.has(key)) {
        this.buckets.set(key, {
          tokens: this.config.capacity,
          lastRefill: Date.now(),
        });
      }
      return this.buckets.get(key)!;
    }

    private refill(bucket: Bucket): void {
      const now = Date.now();
      const elapsed = now - bucket.lastRefill;
      const tokensToAdd = (elapsed / 1000) * this.config.refillRate;
      bucket.tokens = Math.min(this.config.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    consume(key: string, tokens: number = 1): boolean {
      const bucket = this.getBucket(key);
      this.refill(bucket);

      if (bucket.tokens >= tokens) {
        bucket.tokens -= tokens;
        return true;
      }
      return false;
    }

    getTokens(key: string): number {
      const bucket = this.getBucket(key);
      this.refill(bucket);
      return Math.floor(bucket.tokens);
    }
  }

  describe('Basic Token Bucket', () => {
    it('should allow request when tokens available', () => {
      const bucket = new TokenBucket(5, 1);

      expect(bucket.consume('user_1')).toBe(true);
    });

    it('should decrement tokens on consume', () => {
      const bucket = new TokenBucket(5, 1);

      bucket.consume('user_1');
      expect(bucket.getTokens('user_1')).toBe(4);
    });

    it('should deny request when no tokens', () => {
      const bucket = new TokenBucket(1, 0);

      bucket.consume('user_1');
      expect(bucket.consume('user_1')).toBe(false);
    });

    it('should track separate buckets per key', () => {
      const bucket = new TokenBucket(3, 0);

      bucket.consume('user_1');
      bucket.consume('user_1');
      
      expect(bucket.consume('user_2')).toBe(true);
      expect(bucket.getTokens('user_1')).toBe(1);
      expect(bucket.getTokens('user_2')).toBe(2);
    });
  });

  describe('Token Refill', () => {
    it('should refill tokens over time', async () => {
      const bucket = new TokenBucket(2, 100); // 100 tokens per second

      bucket.consume('user_1');
      bucket.consume('user_1');
      expect(bucket.getTokens('user_1')).toBe(0);

      // Wait 50ms = 5 tokens
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(bucket.consume('user_1')).toBe(true);
    });

    it('should not exceed capacity', async () => {
      const bucket = new TokenBucket(5, 100);

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have 10 tokens but capacity is 5
      for (let i = 0; i < 5; i++) {
        bucket.consume('user_1');
      }
      expect(bucket.consume('user_1')).toBe(false);
    });
  });
});

// ============================================
// SLIDING WINDOW ALGORITHM
// ============================================

describe('Sliding Window Rate Limiter', () => {
  interface RequestRecord {
    timestamp: number;
  }

  class SlidingWindowLimiter {
    private requests: Map<string, RequestRecord[]> = new Map();
    private config: {
      windowMs: number;
      maxRequests: number;
    };

    constructor(windowMs: number, maxRequests: number) {
      this.config = { windowMs, maxRequests };
    }

    isAllowed(key: string): boolean {
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      if (!this.requests.has(key)) {
        this.requests.set(key, []);
      }

      const records = this.requests.get(key)!;
      
      // Remove old records
      const recentRecords = records.filter(r => r.timestamp > windowStart);
      this.requests.set(key, recentRecords);

      if (recentRecords.length >= this.config.maxRequests) {
        return false;
      }

      recentRecords.push({ timestamp: now });
      return true;
    }

    getCount(key: string): number {
      const now = Date.now();
      const windowStart = now - this.config.windowMs;
      const records = this.requests.get(key) || [];
      return records.filter(r => r.timestamp > windowStart).length;
    }
  }

  describe('Basic Sliding Window', () => {
    it('should allow first request', () => {
      const limiter = new SlidingWindowLimiter(60000, 5);

      expect(limiter.isAllowed('user_1')).toBe(true);
    });

    it('should count requests in window', () => {
      const limiter = new SlidingWindowLimiter(60000, 5);

      for (let i = 0; i < 5; i++) {
        limiter.isAllowed('user_1');
      }

      expect(limiter.getCount('user_1')).toBe(5);
    });

    it('should block when limit exceeded', () => {
      const limiter = new SlidingWindowLimiter(60000, 2);

      limiter.isAllowed('user_1');
      limiter.isAllowed('user_1');
      
      expect(limiter.isAllowed('user_1')).toBe(false);
    });
  });

  describe('Window Sliding', () => {
    it('should allow new requests as window slides', async () => {
      const limiter = new SlidingWindowLimiter(100, 2);

      limiter.isAllowed('user_1');
      limiter.isAllowed('user_1');
      expect(limiter.isAllowed('user_1')).toBe(false);

      // Wait for window to slide
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(limiter.isAllowed('user_1')).toBe(true);
    });
  });
});

// ============================================
// FIXED WINDOW ALGORITHM
// ============================================

describe('Fixed Window Rate Limiter', () => {
  interface WindowData {
    count: number;
    resetTime: number;
  }

  class FixedWindowLimiter {
    private windows: Map<string, WindowData> = new Map();
    private config: {
      windowMs: number;
      maxRequests: number;
    };

    constructor(windowMs: number, maxRequests: number) {
      this.config = { windowMs, maxRequests };
    }

    check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
      const now = Date.now();
      const windowKey = `${key}_${Math.floor(now / this.config.windowMs)}`;

      if (!this.windows.has(windowKey) || this.windows.get(windowKey)!.resetTime < now) {
        this.windows.set(windowKey, {
          count: 1,
          resetTime: Math.floor(now / this.config.windowMs) * this.config.windowMs + this.config.windowMs,
        });
        return {
          allowed: true,
          remaining: this.config.maxRequests - 1,
          resetTime: this.windows.get(windowKey)!.resetTime,
        };
      }

      const window = this.windows.get(windowKey)!;

      if (window.count >= this.config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: window.resetTime,
        };
      }

      window.count++;
      return {
        allowed: true,
        remaining: this.config.maxRequests - window.count,
        resetTime: window.resetTime,
      };
    }
  }

  describe('Basic Fixed Window', () => {
    it('should allow first request', () => {
      const limiter = new FixedWindowLimiter(60000, 5);

      expect(limiter.check('user_1').allowed).toBe(true);
    });

    it('should track request count', () => {
      const limiter = new FixedWindowLimiter(60000, 3);

      expect(limiter.check('user_1').remaining).toBe(2);
      expect(limiter.check('user_1').remaining).toBe(1);
      expect(limiter.check('user_1').remaining).toBe(0);
    });

    it('should block when limit reached', () => {
      const limiter = new FixedWindowLimiter(60000, 2);

      limiter.check('user_1');
      limiter.check('user_1');
      
      expect(limiter.check('user_1').allowed).toBe(false);
    });
  });
});

// ============================================
// DISTRIBUTED RATE LIMITING
// ============================================

describe('Distributed Rate Limiting', () => {
  // Mock Redis client
  class RedisMock {
    private store: Map<string, string> = new Map();

    async incr(key: string): Promise<number> {
      const current = parseInt(this.store.get(key) || '0', 10);
      const next = current + 1;
      this.store.set(key, next.toString());
      return next;
    }

    async expire(key: string, seconds: number): Promise<void> {
      // Mock implementation
    }

    async ttl(key: string): Promise<number> {
      return 60;
    }

    async get(key: string): Promise<string | null> {
      return this.store.get(key) || null;
    }
  }

  class RedisRateLimiter {
    private redis: RedisMock;
    private config: {
      windowSec: number;
      maxRequests: number;
      keyPrefix: string;
    };

    constructor(redis: RedisMock, windowSec: number, maxRequests: number) {
      this.redis = redis;
      this.config = {
        windowSec,
        maxRequests,
        keyPrefix: 'ratelimit:',
      };
    }

    async isAllowed(key: string): Promise<boolean> {
      const redisKey = `${this.config.keyPrefix}${key}`;
      
      const count = await this.redis.incr(redisKey);
      
      if (count === 1) {
        await this.redis.expire(redisKey, this.config.windowSec);
      }

      return count <= this.config.maxRequests;
    }

    async getRemaining(key: string): Promise<number> {
      const redisKey = `${this.config.keyPrefix}${key}`;
      const count = parseInt(await this.redis.get(redisKey) || '0', 10);
      return Math.max(0, this.config.maxRequests - count);
    }
  }

  describe('Redis-based Rate Limiting', () => {
    it('should allow first request', async () => {
      const redis = new RedisMock();
      const limiter = new RedisRateLimiter(redis, 60, 5);

      expect(await limiter.isAllowed('user_1')).toBe(true);
    });

    it('should track request count in Redis', async () => {
      const redis = new RedisMock();
      const limiter = new RedisRateLimiter(redis, 60, 3);

      await limiter.isAllowed('user_1');
      await limiter.isAllowed('user_1');
      
      const remaining = await limiter.getRemaining('user_1');
      expect(remaining).toBe(1);
    });

    it('should block when limit exceeded', async () => {
      const redis = new RedisMock();
      const limiter = new RedisRateLimiter(redis, 60, 2);

      await limiter.isAllowed('user_1');
      await limiter.isAllowed('user_1');
      
      expect(await limiter.isAllowed('user_1')).toBe(false);
    });

    it('should track separate keys', async () => {
      const redis = new RedisMock();
      const limiter = new RedisRateLimiter(redis, 60, 2);

      await limiter.isAllowed('user_1');
      await limiter.isAllowed('user_1');
      
      expect(await limiter.isAllowed('user_2')).toBe(true);
    });
  });
});
