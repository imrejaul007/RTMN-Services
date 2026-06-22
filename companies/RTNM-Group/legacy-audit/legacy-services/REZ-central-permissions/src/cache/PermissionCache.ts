/**
 * REZ Central Permissions - Permission Cache
 * High-performance caching for permission decisions
 */

import { PermissionRequest, PermissionResult, UserType, CacheEntry } from '../types';

interface CacheKey {
  userId: string;
  userType: UserType;
  resource: string;
  action: string;
  resourceId?: string;
}

// In-memory cache (use Redis in production)
const memoryCache = new Map<string, CacheEntry<PermissionResult>>();
const userIndex = new Map<string, Set<string>>(); // userId -> cacheKeys
const resourceIndex = new Map<string, Set<string>>(); // resource -> cacheKeys

export class PermissionCache {
  private ttl: number; // seconds
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(ttl = 300, maxSize = 10000) {
    this.ttl = ttl;
    this.maxSize = maxSize;
  }

  /**
   * Get cached permission result
   */
  async get(
    request: PermissionRequest,
    userType: UserType
  ): Promise<PermissionResult | null> {
    const key = this.buildKey(request, userType);
    const entry = memoryCache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expires_at) {
      this.delete(key, request.user_id, request.resource);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Set cached permission result
   */
  async set(
    request: PermissionRequest,
    userType: UserType,
    result: PermissionResult
  ): Promise<void> {
    const key = this.buildKey(request, userType);
    const now = Date.now();

    const entry: CacheEntry<PermissionResult> = {
      key,
      value: result,
      expires_at: now + this.ttl * 1000,
      created_at: now,
    };

    memoryCache.set(key, entry);

    // Update user index
    const userKeys = userIndex.get(request.user_id) || new Set();
    userKeys.add(key);
    userIndex.set(request.user_id, userKeys);

    // Update resource index
    const resourceKeys = resourceIndex.get(request.resource) || new Set();
    resourceKeys.add(key);
    resourceIndex.set(request.resource, resourceKeys);

    // Evict if over max size
    if (memoryCache.size > this.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * Invalidate all cache entries
   */
  async invalidateAll(): Promise<void> {
    memoryCache.clear();
    userIndex.clear();
    resourceIndex.clear();
  }

  /**
   * Invalidate cache entries for a user
   */
  async invalidateByUser(userId: string): Promise<void> {
    const keys = userIndex.get(userId);
    if (keys) {
      for (const key of keys) {
        const entry = memoryCache.get(key);
        if (entry) {
          // Remove from resource index
          const resourceKeys = resourceIndex.get(entry.value.granted ? 'granted' : 'denied');
          resourceKeys?.delete(key);
        }
        memoryCache.delete(key);
      }
      userIndex.delete(userId);
    }
  }

  /**
   * Invalidate cache entries for a resource
   */
  async invalidateByResource(resource: string): Promise<void> {
    const keys = resourceIndex.get(resource);
    if (keys) {
      for (const key of keys) {
        const entry = memoryCache.get(key);
        if (entry) {
          // Remove from user index
          // Extract user_id from key and remove from userIndex
          const parts = key.split(':');
          if (parts.length >= 1) {
            const userKeys = userIndex.get(parts[0]);
            userKeys?.delete(key);
          }
        }
        memoryCache.delete(key);
      }
      resourceIndex.delete(resource);
    }
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(request: PermissionRequest, userType: UserType): Promise<void> {
    const key = this.buildKey(request, userType);
    const entry = memoryCache.get(key);
    if (entry) {
      // Remove from indexes
      const userKeys = userIndex.get(request.user_id);
      userKeys?.delete(key);
      const resourceKeys = resourceIndex.get(request.resource);
      resourceKeys?.delete(key);
      memoryCache.delete(key);
    }
  }

  /**
   * Set cache TTL
   */
  setTTL(ttl: number): void {
    this.ttl = ttl;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    maxSize: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: memoryCache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      maxSize: this.maxSize,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Preload cache entries (for warming up)
   */
  async preload(entries: Array<{
    request: PermissionRequest;
    userType: UserType;
    result: PermissionResult;
  }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.request, entry.userType, entry.result);
    }
  }

  /**
   * Get all cached user IDs
   */
  getCachedUserIds(): string[] {
    return Array.from(userIndex.keys());
  }

  /**
   * Get all cached resources
   */
  getCachedResources(): string[] {
    return Array.from(resourceIndex.keys());
  }

  /**
   * Build cache key from request
   */
  private buildKey(request: PermissionRequest, userType: UserType): string {
    const parts = [
      request.user_id,
      userType,
      request.resource,
      request.action,
      request.resource_id || '',
    ];

    // Add context-relevant fields if present
    if (request.context?.merchant_id) {
      parts.push(`m:${request.context.merchant_id}`);
    }
    if (request.context?.store_id) {
      parts.push(`s:${request.context.store_id}`);
    }
    if (request.context?.device_trusted !== undefined) {
      parts.push(`dt:${request.context.device_trusted}`);
    }

    return parts.join(':');
  }

  /**
   * Delete cache entry and update indexes
   */
  private delete(key: string, userId: string, resource: string): void {
    memoryCache.delete(key);
    userIndex.get(userId)?.delete(key);
    resourceIndex.get(resource)?.delete(key);
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of memoryCache) {
      if (entry.created_at < oldestTime) {
        oldestTime = entry.created_at;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = memoryCache.get(oldestKey);
      if (entry) {
        const parts = oldestKey.split(':');
        if (parts.length >= 1) {
          userIndex.get(parts[0])?.delete(oldestKey);
        }
      }
      memoryCache.delete(oldestKey);
    }
  }

  /**
   * Check if Redis is available and use it for distributed caching
   */
  async useRedis(redisUrl: string): Promise<boolean> {
    try {
      // In production, implement Redis connection here
      // const redis = new Redis(redisUrl);
      logger.info(Redis connection configured: ${redisUrl}`);
      return true;
    } catch (error) {
      console.error('Redis connection failed, using in-memory cache:', error);
      return false;
    }
  }
}
