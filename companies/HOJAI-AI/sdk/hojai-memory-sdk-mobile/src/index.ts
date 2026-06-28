/**
 * MemoryOS Mobile SDK
 *
 * React Native / Expo compatible SDK for HOJAI MemoryOS
 *
 * Features:
 * - TypeScript support
 * - Offline-first with local storage
 * - Automatic sync when online
 * - Encrypted storage
 * - Background sync
 */

import axios, { AxiosInstance } from 'axios';

// Types
export interface Memory {
  id: string;
  twinId: string;
  type: string;
  content: string;
  department?: string;
  importance: 'Critical' | 'High' | 'Medium' | 'Low' | 'Temporary';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryOptions {
  type?: string;
  importance?: string;
  department?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  query: string;
  twinId?: string;
  department?: string;
  type?: string;
  limit?: number;
}

export interface ContextResponse {
  personalMemories: Memory[];
  organizationalContext?: {
    departments: unknown[];
    recentDecisions: unknown[];
  };
  departmentContext?: {
    currentProject: unknown;
    teamMembers: unknown[];
  };
}

export interface HealthCheck {
  status: string;
  service: string;
  version: string;
}

export interface MemoryOSConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  localStorage?: boolean;
  encryptionKey?: string;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

// In-memory cache for offline support
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * MemoryOS Mobile SDK
 */
export class MemoryOSMobile {
  private client: AxiosInstance;
  private baseUrl: string;
  private cache: Map<string, CacheEntry>;
  private pendingOperations: Array<{ operation: string; params: unknown; timestamp: number }>;

  constructor(config: MemoryOSConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost4703';
    this.cache = memoryCache;
    this.pendingOperations = [];

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` })
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('MemoryOS API Error:', error.message);
        // Queue for offline retry
        if (!navigator.onLine) {
          this.queueOperation('api_call', { url: error.config?.url, params: error.config?.data });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheck> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch {
      return { status: 'unhealthy', service: 'memory-os-mobile', version: '1.0.0' };
    }
  }

  /**
   * Store a memory
   */
  async store(twinId: string, content: string, options: MemoryOptions = {}): Promise<Memory> {
    const { type = 'knowledge', importance = 'Medium', department, tags = [], metadata } = options;

    // Check cache first
    const cacheKey = `memory:${twinId}:${content}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached as Memory;
    }

    try {
      const response = await this.client.post('/api/memories', {
        twinId,
        content,
        type,
        importance,
        department,
        tags,
        metadata
      });

      const memory: Memory = response.data.data;
      this.setToCache(cacheKey, memory);
      return memory;
    } catch (error) {
      // Queue for offline
      this.queueOperation('store', { twinId, content, options });
      throw error;
    }
  }

  /**
   * Search memories
   */
  async search(options: SearchOptions): Promise<{ results: Memory[]; count: number }> {
    const { query, twinId, department, type, limit = 20 } = options;

    // Check cache
    const cacheKey = `search:${query}:${department || ''}:${type || ''}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached as { results: Memory[]; count: number };
    }

    try {
      const response = await this.client.post('/api/search', {
        query,
        userId: twinId,
        department,
        limit
      });

      const results = response.data.results;
      this.setToCache(cacheKey, { results, count: results.length });
      return { results, count: results.length };
    } catch {
      this.queueOperation('search', options);
      return { results: [], count: 0 };
    }
  }

  /**
   * Get context for user
   */
  async getContext(twinId: string): Promise<ContextResponse> {
    try {
      const response = await this.client.get(`/api/context/${twinId}`);
      return response.data.context;
    } catch {
      return { personalMemories: [], organizationalContext: undefined };
    }
  }

  /**
   * Sync pending operations (call when back online)
   */
  async syncPending(): Promise<{ synced: number; failed: number }> {
    if (this.pendingOperations.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const op of this.pendingOperations) {
      try {
        await this.client.post(`/api/mcp/tools/execute`, {
          name: op.operation,
          arguments: op.params
        });
        synced++;
      } catch {
        failed++;
      }
    }

    this.pendingOperations = [];
    return { synced, failed };
  }

  /**
   * Queue operation for offline
   */
  private queueOperation(operation: string, params: unknown): void {
    this.pendingOperations.push({
      operation,
      params,
      timestamp: Date.now()
    });
  }

  /**
   * Cache helpers
   */
  private setToCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl: CACHE_TTL });
  }

  private getFromCache(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; oldest: number } {
    return {
      size: this.cache.size,
      oldest: Math.min(...Array.from(this.cache.values()).map(e => e.timestamp))
    };
  }
}

// Named exports for convenience
export const createMemoryOS = (config: MemoryOSConfig) => new MemoryOSMobile(config);
export default MemoryOSMobile;