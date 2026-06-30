/**
 * HOJAI Memorizers
 *
 * REUSES: MemoryOS (4703) + Memory Temporal (4794) + Memory Observation (4785)
 *
 * Builds historical memory from scraped web data:
 * - Price History
 * - Review Timeline
 * - Trend Detection
 *
 * DO NOT build new storage - use MemoryOS bridge
 */

import axios from 'axios';

const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';
const MEMORY_TEMPORAL_URL = process.env.MEMORY_TEMPORAL_URL || 'http://localhost:4794';

export interface PricePoint {
  productId: string;
  price: number;
  currency: string;
  source: string;
  url?: string;
  timestamp: string;
}

export interface ReviewPoint {
  entityId: string;
  rating: number;
  reviewCount: number;
  source: string;
  url?: string;
  timestamp: string;
}

export interface TrendPoint {
  topic: string;
  volume: number;
  region?: string;
  source: string;
  timestamp: string;
}

export interface HistoricalData {
  entity: string;
  type: 'price' | 'review' | 'trend';
  dataPoints: (PricePoint | ReviewPoint | TrendPoint)[];
  startDate: string;
  endDate: string;
}

/**
 * Base Memorizer class
 */
export class BaseMemorizer {
  protected token: string;

  constructor(token?: string) {
    this.token = token || process.env.INTERNAL_SERVICE_TOKEN || 'memorizers';
  }

  protected get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Store in MemoryOS
   */
  protected async store(entityId: string, content: any, type: string, metadata?: any): Promise<void> {
    try {
      await axios.post(
        `${MEMORY_OS_URL}/api/memories`,
        {
          userId: entityId,
          content: typeof content === 'string' ? content : JSON.stringify(content),
          type,
          metadata: {
            ...metadata,
            memorizer: this.constructor.name,
            timestamp: new Date().toISOString(),
          },
        },
        { headers: this.headers }
      );
    } catch (error) {
      console.error('Failed to store in MemoryOS:', error);
    }
  }

  /**
   * Query MemoryOS
   */
  protected async query(entityId: string, type?: string, limit = 100): Promise<any[]> {
    try {
      const params: Record<string, string> = {
        query: `userId:${entityId}`,
        limit: String(limit),
      };
      if (type) params.query += ` type:${type}`;

      const response = await axios.get(`${MEMORY_OS_URL}/api/memories/search`, {
        params,
        headers: this.headers,
      });
      return response.data.memories || [];
    } catch (error) {
      console.error('Failed to query MemoryOS:', error);
      return [];
    }
  }
}

/**
 * Price History Memorizer
 * Tracks price changes over time
 */
export class PriceHistoryMemorizer extends BaseMemorizer {
  /**
   * Record a price observation
   */
  async record(data: PricePoint): Promise<void> {
    await this.store(
      `price-${data.productId}`,
      data,
      'price-history',
      {
        productId: data.productId,
        price: data.price,
        currency: data.currency,
        source: data.source,
      }
    );
  }

  /**
   * Get price history for product
   */
  async getHistory(productId: string, days = 30): Promise<PricePoint[]> {
    const memories = await this.query(`price-${productId}`, 'price-history', 1000);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return memories
      .map((m: any) => JSON.parse(m.content))
      .filter((p: PricePoint) => new Date(p.timestamp) >= cutoff)
      .sort((a: PricePoint, b: PricePoint) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }

  /**
   * Calculate price statistics
   */
  calculateStats(history: PricePoint[]): {
    current: number;
    average: number;
    min: number;
    max: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  } {
    if (history.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0, changePercent: 0, trend: 'stable' };
    }

    const prices = history.map(p => p.price);
    const current = prices[prices.length - 1];
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    const first = prices[0];
    const changePercent = first > 0 ? ((current - first) / first) * 100 : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 5) trend = 'up';
    else if (changePercent < -5) trend = 'down';

    return { current, average, min, max, changePercent, trend };
  }

  /**
   * Detect price drops
   */
  async detectPriceDrops(productId: string, threshold = 10): Promise<PricePoint[]> {
    const history = await this.getHistory(productId, 7);

    const drops: PricePoint[] = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      const change = ((curr.price - prev.price) / prev.price) * 100;

      if (change <= -threshold) {
        drops.push(curr);
      }
    }

    return drops;
  }
}

/**
 * Review Timeline Memorizer
 * Tracks reviews and ratings over time
 */
export class ReviewTimelineMemorizer extends BaseMemorizer {
  /**
   * Record review observation
   */
  async record(data: ReviewPoint): Promise<void> {
    await this.store(
      `reviews-${data.entityId}`,
      data,
      'review-timeline',
      {
        entityId: data.entityId,
        rating: data.rating,
        reviewCount: data.reviewCount,
      }
    );
  }

  /**
   * Get review timeline
   */
  async getTimeline(entityId: string, days = 90): Promise<ReviewPoint[]> {
    const memories = await this.query(`reviews-${entityId}`, 'review-timeline', 1000);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return memories
      .map((m: any) => JSON.parse(m.content))
      .filter((r: ReviewPoint) => new Date(r.timestamp) >= cutoff)
      .sort((a: ReviewPoint, b: ReviewPoint) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }

  /**
   * Detect rating changes
   */
  async detectRatingChanges(entityId: string, threshold = 0.3): Promise<ReviewPoint[]> {
    const timeline = await this.getTimeline(entityId);
    const changes: ReviewPoint[] = [];

    for (let i = 1; i < timeline.length; i++) {
      const prev = timeline[i - 1];
      const curr = timeline[i];
      const change = Math.abs(curr.rating - prev.rating);

      if (change >= threshold) {
        changes.push(curr);
      }
    }

    return changes;
  }
}

/**
 * Trend Detection Memorizer
 * Tracks trends and topics over time
 */
export class TrendDetectionMemorizer extends BaseMemorizer {
  /**
   * Record trend observation
   */
  async record(data: TrendPoint): Promise<void> {
    await this.store(
      `trend-${data.topic.toLowerCase().replace(/\s+/g, '-')}`,
      data,
      'trend-history',
      {
        topic: data.topic,
        region: data.region,
      }
    );
  }

  /**
   * Get trend history
   */
  async getTrend(topic: string, days = 30): Promise<TrendPoint[]> {
    const entityId = `trend-${topic.toLowerCase().replace(/\s+/g, '-')}`;
    const memories = await this.query(entityId, 'trend-history', 1000);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return memories
      .map((m: any) => JSON.parse(m.content))
      .filter((t: TrendPoint) => new Date(t.timestamp) >= cutoff)
      .sort((a: TrendPoint, b: TrendPoint) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }

  /**
   * Detect trending topics (volume increase)
   */
  async detectTrendingTopics(threshold = 50): Promise<string[]> {
    // Query all recent trend data
    try {
      const response = await axios.get(`${MEMORY_OS_URL}/api/memories/search`, {
        params: {
          query: 'type:trend-history',
          limit: 500,
        },
        headers: this.headers,
      });

      const memories = response.data.memories || [];
      const topics = new Map<string, TrendPoint[]>();

      // Group by topic
      for (const memory of memories) {
        const data = JSON.parse(memory.content);
        const topic = data.topic;
        if (!topics.has(topic)) {
          topics.set(topic, []);
        }
        topics.get(topic)!.push(data);
      }

      // Find topics with significant volume increase
      const trending: string[] = [];
      for (const [topic, points] of topics.entries()) {
        if (points.length < 2) continue;

        const sorted = points.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const oldest = sorted[0].volume;
        const newest = sorted[sorted.length - 1].volume;

        if (oldest > 0 && ((newest - oldest) / oldest) * 100 >= threshold) {
          trending.push(topic);
        }
      }

      return trending;
    } catch {
      return [];
    }
  }
}

// Singleton instances
export const priceHistory = new PriceHistoryMemorizer();
export const reviewTimeline = new ReviewTimelineMemorizer();
export const trendDetection = new TrendDetectionMemorizer();

export default {
  PriceHistoryMemorizer,
  ReviewTimelineMemorizer,
  TrendDetectionMemorizer,
  priceHistory,
  reviewTimeline,
  trendDetection,
};