// ============================================================================
// SUTAR Exploration Engine - Market Scanner Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type { MarketScan, MarketDataPoint, MarketSummary, ScanQuery } from '../types/index.js';

export class MarketScannerService {
  private cache: Map<string, { data: MarketScan; expiry: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Scan the market for data points matching the query
   */
  async scan(query: ScanQuery): Promise<MarketScan> {
    const cacheKey = this.getCacheKey(query);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // Generate market data based on query
    const results = this.generateMarketData(query);
    const summary = this.calculateSummary(results);

    const scan: MarketScan = {
      id: uuidv4(),
      query: query.query,
      industry: query.industry,
      region: query.region,
      timestamp: new Date().toISOString(),
      results,
      summary,
      metadata: {
        timeRange: query.timeRange,
        cachedAt: new Date().toISOString(),
      },
    };

    // Cache the result
    this.cache.set(cacheKey, { data: scan, expiry: Date.now() + this.CACHE_TTL });

    return scan;
  }

  /**
   * Generate mock market data based on the query
   */
  private generateMarketData(query: ScanQuery): MarketDataPoint[] {
    const limit = query.limit || 20;
    const dataPoints: MarketDataPoint[] = [];

    const categories = [
      'Software', 'Hardware', 'Services', 'Cloud', 'AI/ML',
      'E-commerce', 'Healthcare', 'Finance', 'Education', 'Entertainment'
    ];

    const trends: Array<'rising' | 'falling' | 'stable'> = ['rising', 'falling', 'stable'];

    for (let i = 0; i < limit; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const trend = trends[Math.floor(Math.random() * trends.length)];

      dataPoints.push({
        id: uuidv4(),
        name: `${query.query} ${category} ${i + 1}`,
        category,
        size: Math.floor(Math.random() * 10000000000),
        growth: (Math.random() * 60) - 20,
        share: Math.random() * 100,
        trend,
        confidence: 50 + Math.random() * 50,
        source: this.getRandomSource(),
        metadata: {
          queryMatch: query.query,
          region: query.region,
          timeRange: query.timeRange,
        },
      });
    }

    // Sort by relevance (simulated)
    return dataPoints.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate summary statistics from data points
   */
  private calculateSummary(results: MarketDataPoint[]): MarketSummary {
    const totalResults = results.length;
    const avgGrowth = results.reduce((sum, r) => sum + (r.growth || 0), 0) / totalResults;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / totalResults;

    // Count categories
    const categoryCounts = new Map<string, number>();
    results.forEach(r => {
      categoryCounts.set(r.category, (categoryCounts.get(r.category) || 0) + 1);
    });

    const topCategories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // Determine market health
    let marketHealth: MarketSummary['marketHealth'];
    if (avgGrowth > 30 && avgConfidence > 80) {
      marketHealth = 'excellent';
    } else if (avgGrowth > 15 && avgConfidence > 60) {
      marketHealth = 'good';
    } else if (avgGrowth > 0 && avgConfidence > 40) {
      marketHealth = 'moderate';
    } else {
      marketHealth = 'poor';
    }

    return {
      totalResults,
      avgGrowth: Math.round(avgGrowth * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      topCategories,
      marketHealth,
    };
  }

  /**
   * Get cache key for a query
   */
  private getCacheKey(query: ScanQuery): string {
    return JSON.stringify(query);
  }

  /**
   * Get random data source
   */
  private getRandomSource(): string {
    const sources = [
      'Market Research Report',
      'Industry Analysis',
      'Competitor Data',
      'User Analytics',
      'Sales Data',
      'Public Records',
      'Survey Results',
    ];
    return sources[Math.floor(Math.random() * sources.length)];
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