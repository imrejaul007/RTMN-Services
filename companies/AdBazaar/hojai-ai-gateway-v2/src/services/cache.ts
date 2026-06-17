/**
 * Redis Cache Service
 *
 * Provides caching layer for AI predictions and intelligence data.
 */

import Redis from 'ioredis';

// ============================================================================
// TYPES
// ============================================================================

interface CacheStats {
  connected: boolean;
  hits: number;
  misses: number;
  keys: number;
}

interface IntentCache {
  intent: string;
  confidence: number;
  recommendations: string[];
  nextBestAction: string;
  cachedAt: string;
}

interface BehaviorCache {
  churnRisk: string;
  ltvScore: number;
  purchaseProbability: number;
  cachedAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TTL = 300; // 5 minutes
const INTENT_TTL = 300; // 5 minutes
const BEHAVIOR_TTL = 600; // 10 minutes
const SEGMENTS_TTL = 180; // 3 minutes
const RECOMMENDATIONS_TTL = 180; // 3 minutes

// ============================================================================
// CACHE SERVICE
// ============================================================================

export class CacheService {
  private client: Redis | null = null;
  private redisUrl: string;
  private connected: boolean = false;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.redisUrl = redisUrl;
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      this.client = new Redis(this.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.warn('[Cache] Max retries reached, running without cache');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      this.client.on('connect', () => {
        console.log('[Cache] Redis connected');
        this.connected = true;
      });

      this.client.on('error', (err) => {
        console.error('[Cache] Redis error:', err.message);
        this.connected = false;
      });

      this.client.on('close', () => {
        console.log('[Cache] Redis connection closed');
        this.connected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.warn('[Cache] Failed to connect to Redis, running without cache');
      this.connected = false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.client || !this.connected) {
      return {
        connected: false,
        hits: this.stats.hits,
        misses: this.stats.misses,
        keys: 0,
      };
    }

    try {
      const keys = await this.client.dbsize();
      return {
        connected: true,
        hits: this.stats.hits,
        misses: this.stats.misses,
        keys,
      };
    } catch {
      return {
        connected: false,
        hits: this.stats.hits,
        misses: this.stats.misses,
        keys: 0,
      };
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.flushdb();
      this.stats = { hits: 0, misses: 0 };
    }
  }

  // ==========================================================================
  // INTENT CACHE
  // ==========================================================================

  async getIntent(userId: string): Promise<IntentCache | null> {
    if (!this.client || !this.connected) {
      return null;
    }

    try {
      const key = `intent:${userId}`;
      const data = await this.client.get(key);

      if (data) {
        this.stats.hits++;
        return JSON.parse(data);
      }

      this.stats.misses++;
      return null;
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  async setIntent(userId: string, data: IntentCache): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      const key = `intent:${userId}`;
      await this.client.setex(key, INTENT_TTL, JSON.stringify({
        ...data,
        cachedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[Cache] Failed to set intent cache:', error);
    }
  }

  // ==========================================================================
  // BEHAVIOR CACHE
  // ==========================================================================

  async getBehavior(userId: string): Promise<BehaviorCache | null> {
    if (!this.client || !this.connected) {
      return null;
    }

    try {
      const key = `behavior:${userId}`;
      const data = await this.client.get(key);

      if (data) {
        this.stats.hits++;
        return JSON.parse(data);
      }

      this.stats.misses++;
      return null;
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  async setBehavior(userId: string, data: BehaviorCache): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      const key = `behavior:${userId}`;
      await this.client.setex(key, BEHAVIOR_TTL, JSON.stringify({
        ...data,
        cachedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[Cache] Failed to set behavior cache:', error);
    }
  }

  // ==========================================================================
  // SEGMENTS CACHE
  // ==========================================================================

  async getSegments(cacheKey: string): Promise<unknown | null> {
    if (!this.client || !this.connected) {
      return null;
    }

    try {
      const key = `segments:${cacheKey}`;
      const data = await this.client.get(key);

      if (data) {
        this.stats.hits++;
        return JSON.parse(data);
      }

      this.stats.misses++;
      return null;
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  async setSegments(cacheKey: string, data: unknown): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      const key = `segments:${cacheKey}`;
      await this.client.setex(key, SEGMENTS_TTL, JSON.stringify(data));
    } catch (error) {
      console.error('[Cache] Failed to set segments cache:', error);
    }
  }

  // ==========================================================================
  // RECOMMENDATIONS CACHE
  // ==========================================================================

  async getRecommendations(userId: string): Promise<string[] | null> {
    if (!this.client || !this.connected) {
      return null;
    }

    try {
      const key = `recommendations:${userId}`;
      const data = await this.client.get(key);

      if (data) {
        this.stats.hits++;
        return JSON.parse(data);
      }

      this.stats.misses++;
      return null;
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  async setRecommendations(userId: string, data: string[]): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      const key = `recommendations:${userId}`;
      await this.client.setex(key, RECOMMENDATIONS_TTL, JSON.stringify(data));
    } catch (error) {
      console.error('[Cache] Failed to set recommendations cache:', error);
    }
  }

  // ==========================================================================
  // GENERIC CACHE OPERATIONS
  // ==========================================================================

  async get(key: string): Promise<string | null> {
    if (!this.client || !this.connected) {
      return null;
    }

    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttl: number = DEFAULT_TTL): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      await this.client.setex(key, ttl, value);
    } catch (error) {
      console.error('[Cache] Failed to set cache:', error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error('[Cache] Failed to delete cache:', error);
    }
  }
}
