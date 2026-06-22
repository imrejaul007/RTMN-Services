/**
 * Memory Bridge - Integration with HOJAI MemoryOS
 *
 * Stores web intelligence events in MemoryOS for later retrieval
 */

import axios from 'axios';

export interface WebIntelligenceEvent {
  type: 'WEB_SCRAPE' | 'NEWS_ARTICLE' | 'ENTITY_EXTRACTED' | 'PRICE_CHANGE' | 'CONTENT_CHANGE';
  source: string;
  url?: string;
  timestamp: string;
  data: any;
  metadata?: {
    company?: string;
    industry?: string;
    location?: string;
    [key: string]: any;
  };
}

export interface MemoryQuery {
  type?: string;
  limit?: number;
  since?: string;
  entityId?: string;
}

export class MemoryBridge {
  private memoryUrl: string;
  private apiKey: string;
  private axiosInstance;

  constructor() {
    this.memoryUrl = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
    this.apiKey = process.env.MEMORY_API_KEY || 'memory-internal-key';

    this.axiosInstance = axios.create({
      baseURL: this.memoryUrl,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Store a web intelligence event in MemoryOS
   */
  async storeEvent(event: WebIntelligenceEvent): Promise<{ id: string }> {
    try {
      const response = await this.axiosInstance.post('/events', {
        type: event.type,
        source: 'hojai-web-intelligence',
        data: event.data,
        metadata: {
          ...event.metadata,
          url: event.url,
          timestamp: event.timestamp
        },
        timestamp: event.timestamp
      });

      return { id: response.data.id };
    } catch (error: any) {
      // Log but don't fail - memory storage is non-critical
      console.warn(`Failed to store event in MemoryOS: ${error.message}`);
      return { id: 'memory-store-failed' };
    }
  }

  /**
   * Store multiple events
   */
  async storeEvents(events: WebIntelligenceEvent[]): Promise<{ stored: number; failed: number }> {
    let stored = 0;
    let failed = 0;

    for (const event of events) {
      try {
        await this.storeEvent(event);
        stored++;
      } catch {
        failed++;
      }
    }

    return { stored, failed };
  }

  /**
   * Get events from MemoryOS
   */
  async getEvents(query: MemoryQuery): Promise<WebIntelligenceEvent[]> {
    try {
      const params = new URLSearchParams();
      if (query.type) params.append('type', query.type);
      if (query.limit) params.append('limit', String(query.limit));
      if (query.since) params.append('since', query.since);

      const response = await this.axiosInstance.get(`/events?${params}`);

      return response.data.events || [];
    } catch (error: any) {
      console.warn(`Failed to get events from MemoryOS: ${error.message}`);
      return [];
    }
  }

  /**
   * Get events by entity
   */
  async getEventsByEntity(entityId: string): Promise<WebIntelligenceEvent[]> {
    try {
      const response = await this.axiosInstance.get(`/entities/${entityId}/events`);

      return response.data.events || [];
    } catch (error: any) {
      console.warn(`Failed to get entity events: ${error.message}`);
      return [];
    }
  }

  /**
   * Search events by keyword
   */
  async searchEvents(keyword: string, limit = 100): Promise<WebIntelligenceEvent[]> {
    try {
      const response = await this.axiosInstance.post('/events/search', {
        query: keyword,
        limit
      });

      return response.data.events || [];
    } catch (error: any) {
      console.warn(`Failed to search events: ${error.message}`);
      return [];
    }
  }

  /**
   * Store news article as event
   */
  async storeNewsArticle(article: {
    title: string;
    url: string;
    domain: string;
    seendate: string;
    sentiment?: any;
    entities?: any;
  }): Promise<{ id: string }> {
    return this.storeEvent({
      type: 'NEWS_ARTICLE',
      source: 'gdelt',
      url: article.url,
      timestamp: article.seendate,
      data: {
        title: article.title,
        domain: article.domain,
        sentiment: article.sentiment,
        entities: article.entities
      },
      metadata: {
        source: 'gdelt',
        category: 'news'
      }
    });
  }

  /**
   * Store scraped content as event
   */
  async storeScrapedContent(url: string, content: any, metadata?: Record<string, any>): Promise<{ id: string }> {
    return this.storeEvent({
      type: 'WEB_SCRAPE',
      source: 'hojai-web-intelligence',
      url,
      timestamp: new Date().toISOString(),
      data: content,
      metadata: {
        ...metadata,
        source: 'scraped'
      }
    });
  }

  /**
   * Store entity extraction as event
   */
  async storeEntityExtraction(
    url: string,
    entities: any[],
    metadata?: Record<string, any>
  ): Promise<{ id: string }> {
    return this.storeEvent({
      type: 'ENTITY_EXTRACTED',
      source: 'hojai-web-intelligence',
      url,
      timestamp: new Date().toISOString(),
      data: { entities },
      metadata: {
        ...metadata,
        entityCount: entities.length
      }
    });
  }

  /**
   * Check if MemoryOS is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}
