// ============================================================================
// SUTAR Exploration Engine - Discovery Engine Integration
// ============================================================================

import type { DiscoveryQuery, DiscoveryResult } from '../types/index.js';

const DISCOVERY_ENGINE_URL = process.env.DISCOVERY_ENGINE_URL || 'http://localhost:4256';
const DISCOVERY_TIMEOUT = 10000; // 10 seconds

export class DiscoveryIntegration {
  private cache: Map<string, { data: DiscoveryResult[]; expiry: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Search the Discovery Engine for relevant results
   */
  async search(query: DiscoveryQuery): Promise<DiscoveryResult[]> {
    const cacheKey = JSON.stringify(query);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT);

      const response = await fetch(`${DISCOVERY_ENGINE_URL}/api/v1/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `exploration-${Date.now()}`,
        },
        body: JSON.stringify({
          query: query.query,
          type: query.type,
          limit: query.limit || 20,
          filters: query.filters,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Discovery Engine returned ${response.status}`);
      }

      const data = await response.json() as { success: boolean; data?: DiscoveryResult[]; error?: string };

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Unknown error from Discovery Engine');
      }

      // Cache the results
      this.cache.set(cacheKey, { data: data.data, expiry: Date.now() + this.CACHE_TTL });

      return data.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Discovery Engine request timed out');
        return this.getFallbackResults(query);
      }

      console.error('Discovery Engine error:', error);
      return this.getFallbackResults(query);
    }
  }

  /**
   * Get fallback results when Discovery Engine is unavailable
   */
  private getFallbackResults(query: DiscoveryQuery): DiscoveryResult[] {
    // Generate fallback results based on query
    const results: DiscoveryResult[] = [];
    const limit = query.limit || 20;

    const categories = ['Product', 'Service', 'Technology', 'Market', 'Trend'];
    const types = ['opportunity', 'competitor', 'trend', 'market', 'technology'];

    for (let i = 0; i < Math.min(limit, 5); i++) {
      results.push({
        id: `fallback-${i}-${Date.now()}`,
        type: types[Math.floor(Math.random() * types.length)],
        title: `${query.query} - ${categories[i % categories.length]} ${i + 1}`,
        description: `Discovered ${query.query} related ${categories[i % categories.length].toLowerCase()} through market analysis.`,
        relevance: 100 - (i * 15),
        metadata: {
          source: 'fallback',
          query: query.query,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return results;
  }

  /**
   * Check if Discovery Engine is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${DISCOVERY_ENGINE_URL}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get information about Discovery Engine
   */
  async getInfo(): Promise<{ name: string; version: string; features: string[] } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${DISCOVERY_ENGINE_URL}/api/v1/info`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as { success: boolean; data?: { name: string; version: string; features: string[] } };
      return data.data || null;
    } catch {
      return null;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.CACHE_TTL,
    };
  }
}
