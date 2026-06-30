/**
 * MemoryOS Integration
 *
 * REUSES: MemoryOS (port 4703)
 * DO NOT build new storage - use this bridge
 */

import axios from 'axios';
import { config } from '../config.js';

const MEMORY_OS_URL = config.services.memoryOs;

export interface MemoryEntry {
  id?: string;
  entityId: string;
  content: string;
  metadata?: Record<string, any>;
  type?: string;
  createdAt?: string;
}

export class MemoryIntegration {
  private token: string;

  constructor(token?: string) {
    this.token = token || config.auth.internalToken;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Store data in MemoryOS
   */
  async store(entry: MemoryEntry): Promise<any> {
    try {
      const response = await axios.post(
        `${MEMORY_OS_URL}/api/memories`,
        {
          userId: entry.entityId,
          content: typeof entry.content === 'string'
            ? entry.content
            : JSON.stringify(entry.content),
          type: entry.type || 'internet-os-data',
          metadata: {
            ...entry.metadata,
            source: 'internet-os',
          },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to store in MemoryOS:', error);
      throw error;
    }
  }

  /**
   * Store scraped data with metadata
   */
  async storeScrapedData(
    source: string,
    url: string,
    data: any,
    actorId: string
  ): Promise<any> {
    return this.store({
      entityId: source,
      content: JSON.stringify(data),
      type: 'scraped_data',
      metadata: {
        source,
        url,
        actorId,
        scrapedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Search memories
   */
  async search(query: string, limit = 100, offset = 0): Promise<any> {
    try {
      const response = await axios.get(`${MEMORY_OS_URL}/api/memories/search`, {
        params: { query, limit, offset },
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to search MemoryOS:', error);
      return { memories: [], count: 0 };
    }
  }

  /**
   * Get memory by ID
   */
  async get(id: string): Promise<any> {
    try {
      const response = await axios.get(`${MEMORY_OS_URL}/api/memories/${id}`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to get memory ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get entity history
   */
  async getEntityHistory(entityId: string, limit = 100): Promise<any[]> {
    try {
      const response = await axios.get(`${MEMORY_OS_URL}/api/memories/search`, {
        params: {
          query: `userId:${entityId}`,
          limit,
        },
        headers: this.headers,
      });
      return response.data.memories || [];
    } catch (error) {
      console.error(`Failed to get history for ${entityId}:`, error);
      return [];
    }
  }

  /**
   * Get changes by type
   */
  async getChangesByType(
    changeType: string,
    limit = 100,
    since?: Date
  ): Promise<any[]> {
    try {
      const response = await axios.get(`${MEMORY_OS_URL}/api/memories/search`, {
        params: {
          query: `type:watcher_change changeType:${changeType}`,
          limit,
        },
        headers: this.headers,
      });

      let changes = response.data.memories || [];

      // Filter by date if provided
      if (since) {
        changes = changes.filter(
          (c: any) => new Date(c.metadata?.detectedAt) >= since
        );
      }

      return changes;
    } catch (error) {
      console.error(`Failed to get changes by type ${changeType}:`, error);
      return [];
    }
  }

  /**
   * Get timeline for an entity
   */
  async getTimeline(
    entityId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      const history = await this.getEntityHistory(entityId, 1000);

      let timeline = history;

      if (startDate) {
        timeline = timeline.filter(
          (h: any) => new Date(h.createdAt) >= startDate
        );
      }

      if (endDate) {
        timeline = timeline.filter(
          (h: any) => new Date(h.createdAt) <= endDate
        );
      }

      // Sort by date
      timeline.sort((a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      return timeline;
    } catch (error) {
      console.error(`Failed to get timeline for ${entityId}:`, error);
      return [];
    }
  }

  /**
   * Delete memory
   */
  async delete(id: string): Promise<void> {
    try {
      await axios.delete(`${MEMORY_OS_URL}/api/memories/${id}`, {
        headers: this.headers,
      });
    } catch (error) {
      console.error(`Failed to delete memory ${id}:`, error);
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<any> {
    try {
      const response = await axios.get(`${MEMORY_OS_URL}/api/stats`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get MemoryOS stats:', error);
      return {};
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${MEMORY_OS_URL}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let instance: MemoryIntegration | null = null;

export function getMemoryIntegration(token?: string): MemoryIntegration {
  if (!instance) {
    instance = new MemoryIntegration(token);
  }
  return instance;
}

export const memoryIntegration = new MemoryIntegration();
export default memoryIntegration;
