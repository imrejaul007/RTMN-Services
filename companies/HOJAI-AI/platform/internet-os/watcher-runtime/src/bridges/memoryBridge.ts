/**
 * MemoryOS Bridge for Watcher Runtime
 *
 * REUSES: MemoryOS (port 4703) - DO NOT build new storage
 *
 * This bridge allows watchers to store their state and changes
 * in the existing MemoryOS service.
 */

import axios from 'axios';

const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';

export interface WatcherMemory {
  id: string;
  type: string;
  url: string;
  lastChecked: string;
  lastState: Record<string, any>;
  changes: WatcherChange[];
}

export interface WatcherChange {
  id: string;
  watcherId: string;
  changeType: 'added' | 'removed' | 'modified';
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  detectedAt: string;
}

export class MemoryBridge {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.INTERNAL_SERVICE_TOKEN || 'watcher-runtime';
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Store watcher state in MemoryOS
   */
  async storeWatcherState(watcher: WatcherMemory): Promise<void> {
    try {
      await axios.post(
        `${MEMORY_OS_URL}/api/memories`,
        {
          userId: 'watcher-runtime',
          content: JSON.stringify(watcher),
          type: 'watcher_state',
          metadata: {
            watcherId: watcher.id,
            source: 'watcher-runtime',
            lastChecked: watcher.lastChecked,
          },
        },
        { headers: this.headers }
      );
    } catch (error) {
      console.error(`Failed to store watcher state: ${watcher.id}`, error);
      throw error;
    }
  }

  /**
   * Store a watcher change in MemoryOS
   */
  async storeChange(change: WatcherChange): Promise<void> {
    try {
      await axios.post(
        `${MEMORY_OS_URL}/api/memories`,
        {
          userId: 'watcher-runtime',
          content: JSON.stringify(change),
          type: 'watcher_change',
          metadata: {
            watcherId: change.watcherId,
            changeType: change.changeType,
            detectedAt: change.detectedAt,
          },
        },
        { headers: this.headers }
      );
    } catch (error) {
      console.error(`Failed to store change: ${change.id}`, error);
      throw error;
    }
  }

  /**
   * Get watcher history from MemoryOS
   */
  async getWatcherHistory(watcherId: string, limit = 100): Promise<WatcherChange[]> {
    try {
      const response = await axios.get(
        `${MEMORY_OS_URL}/api/memories/search`,
        {
          params: {
            query: `watcherId:${watcherId}`,
            userId: 'watcher-runtime',
            limit,
          },
          headers: this.headers,
        }
      );

      return response.data.memories?.map((m: any) => JSON.parse(m.content)) || [];
    } catch (error) {
      console.error(`Failed to get watcher history: ${watcherId}`, error);
      return [];
    }
  }

  /**
   * Get all changes for a watcher type
   */
  async getChangesByType(changeType: string, limit = 100): Promise<WatcherChange[]> {
    try {
      const response = await axios.get(
        `${MEMORY_OS_URL}/api/memories/search`,
        {
          params: {
            query: `changeType:${changeType}`,
            userId: 'watcher-runtime',
            limit,
          },
          headers: this.headers,
        }
      );

      return response.data.memories?.map((m: any) => JSON.parse(m.content)) || [];
    } catch (error) {
      console.error(`Failed to get changes by type: ${changeType}`, error);
      return [];
    }
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(watcherId: string, since: Date): Promise<WatcherChange[]> {
    try {
      const history = await this.getWatcherHistory(watcherId);
      return history.filter(
        (c) => new Date(c.detectedAt) >= since
      );
    } catch (error) {
      console.error(`Failed to get recent alerts: ${watcherId}`, error);
      return [];
    }
  }

  /**
   * Delete old watcher state
   */
  async cleanupOldState(olderThanDays: number): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Search for old memories and delete
      const response = await axios.get(
        `${MEMORY_OS_URL}/api/memories/search`,
        {
          params: {
            query: 'type:watcher_state',
            userId: 'watcher-runtime',
            limit: 1000,
          },
          headers: this.headers,
        }
      );

      const oldMemories = response.data.memories?.filter(
        (m: any) => new Date(m.metadata?.lastChecked) < cutoffDate
      ) || [];

      for (const memory of oldMemories) {
        await axios.delete(
          `${MEMORY_OS_URL}/api/memories/${memory.id}`,
          { headers: this.headers }
        );
      }
    } catch (error) {
      console.error('Failed to cleanup old state', error);
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
let instance: MemoryBridge | null = null;

export function getMemoryBridge(token?: string): MemoryBridge {
  if (!instance) {
    instance = new MemoryBridge(token);
  }
  return instance;
}

export default MemoryBridge;
