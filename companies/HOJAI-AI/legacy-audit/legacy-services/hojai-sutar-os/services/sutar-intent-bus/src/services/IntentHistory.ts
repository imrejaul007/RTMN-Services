// ============================================================================
// Intent History Service - Track all intents
// ============================================================================

import { Intent } from '../index';

export interface HistoryEntry {
  intent: Intent;
  timestamp: string;
  action: 'captured' | 'classified' | 'enriched' | 'routed' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export interface HistoryQuery {
  userId?: string;
  sessionId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface HistoryStats {
  totalEntries: number;
  entriesByAction: Record<string, number>;
  entriesByCategory: Record<string, number>;
  averageSessionLength: number;
  mostActiveUsers: Array<{ userId: string; count: number }>;
  peakHours: number[];
}

export interface ConversationThread {
  sessionId: string;
  userId?: string;
  entries: HistoryEntry[];
  startedAt: string;
  lastActivityAt: string;
  isActive: boolean;
  metadata: Record<string, any>;
}

export class IntentHistory {
  private history: Map<string, HistoryEntry[]>;
  private threads: Map<string, ConversationThread>;
  private indexByUser: Map<string, string[]>;
  private indexBySession: Map<string, string[]>;
  private indexByCategory: Map<string, string[]>;
  private stats: HistoryStats;

  constructor() {
    this.history = new Map();
    this.threads = new Map();
    this.indexByUser = new Map();
    this.indexBySession = new Map();
    this.indexByCategory = new Map();
    this.stats = this.initStats();
  }

  private initStats(): HistoryStats {
    return {
      totalEntries: 0,
      entriesByAction: {},
      entriesByCategory: {},
      averageSessionLength: 0,
      mostActiveUsers: [],
      peakHours: []
    };
  }

  /**
   * Add an entry to history
   */
  addEntry(intent: Intent, action: HistoryEntry['action'], metadata?: Record<string, any>): void {
    const entry: HistoryEntry = {
      intent,
      timestamp: new Date().toISOString(),
      action,
      metadata
    };

    // Add to history
    const intentId = intent.id;
    if (!this.history.has(intentId)) {
      this.history.set(intentId, []);
    }
    this.history.get(intentId)!.push(entry);

    // Update indexes
    this.updateIndexes(intent, intentId);

    // Update stats
    this.updateStats(action, intent.category);

    // Update thread
    this.updateThread(intent, entry);
  }

  /**
   * Get history for an intent
   */
  getHistory(intentId: string): HistoryEntry[] {
    return this.history.get(intentId) || [];
  }

  /**
   * Get full history with query
   */
  queryHistory(query: HistoryQuery): HistoryEntry[] {
    let results: HistoryEntry[] = [];

    // Collect all entries
    this.history.forEach(entries => {
      results.push(...entries);
    });

    // Filter by userId
    if (query.userId) {
      const userIntentIds = this.indexByUser.get(query.userId) || [];
      results = results.filter(e => userIntentIds.includes(e.intent.id));
    }

    // Filter by sessionId
    if (query.sessionId) {
      const sessionIntentIds = this.indexBySession.get(query.sessionId) || [];
      results = results.filter(e => sessionIntentIds.includes(e.intent.id));
    }

    // Filter by category
    if (query.category) {
      const categoryIntentIds = this.indexByCategory.get(query.category) || [];
      results = results.filter(e => categoryIntentIds.includes(e.intent.id));
    }

    // Filter by date range
    if (query.startDate) {
      const startDate = new Date(query.startDate);
      results = results.filter(e => new Date(e.timestamp) >= startDate);
    }

    if (query.endDate) {
      const endDate = new Date(query.endDate);
      results = results.filter(e => new Date(e.timestamp) <= endDate);
    }

    // Sort by timestamp descending
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    return results.slice(offset, offset + limit);
  }

  /**
   * Get conversation thread for a session
   */
  getConversationThread(sessionId: string): ConversationThread | undefined {
    return this.threads.get(sessionId);
  }

  /**
   * Get all active threads
   */
  getActiveThreads(): ConversationThread[] {
    return Array.from(this.threads.values()).filter(t => t.isActive);
  }

  /**
   * Get history statistics
   */
  getStats(): HistoryStats {
    return {
      ...this.stats,
      mostActiveUsers: this.getMostActiveUsers(10),
      peakHours: this.calculatePeakHours()
    };
  }

  /**
   * Search history by intent text
   */
  searchHistory(searchTerm: string, limit: number = 50): HistoryEntry[] {
    const results: HistoryEntry[] = [];
    const term = searchTerm.toLowerCase();

    this.history.forEach(entries => {
      for (const entry of entries) {
        if (entry.intent.intent.toLowerCase().includes(term)) {
          results.push(entry);
        }
      }
    });

    return results
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get intent timeline
   */
  getIntentTimeline(intentId: string): Array<{ timestamp: string; action: string; duration?: number }> {
    const entries = this.getHistory(intentId);
    const timeline: Array<{ timestamp: string; action: string; duration?: number }> = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const duration = i > 0
        ? new Date(entry.timestamp).getTime() - new Date(entries[i - 1].timestamp).getTime()
        : undefined;

      timeline.push({
        timestamp: entry.timestamp,
        action: entry.action,
        duration
      });
    }

    return timeline;
  }

  /**
   * Get session summary
   */
  getSessionSummary(sessionId: string): {
    totalIntents: number;
    categories: string[];
    averageConfidence: number;
    startTime: string;
    endTime: string;
    duration: number;
  } | null {
    const thread = this.threads.get(sessionId);
    if (!thread || thread.entries.length === 0) return null;

    const intents = thread.entries.map(e => e.intent);
    const categories = [...new Set(intents.map(i => i.category))];
    const averageConfidence = intents.reduce((sum, i) => sum + i.confidence, 0) / intents.length;

    return {
      totalIntents: intents.length,
      categories,
      averageConfidence,
      startTime: thread.startedAt,
      endTime: thread.lastActivityAt,
      duration: new Date(thread.lastActivityAt).getTime() - new Date(thread.startedAt).getTime()
    };
  }

  /**
   * Archive old history entries
   */
  archiveOldEntries(olderThanDays: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    let archivedCount = 0;

    this.history.forEach((entries, intentId) => {
      const filteredEntries = entries.filter(e => new Date(e.timestamp) > cutoffDate);
      if (filteredEntries.length === 0) {
        this.history.delete(intentId);
        archivedCount++;
      } else if (filteredEntries.length !== entries.length) {
        this.history.set(intentId, filteredEntries);
        archivedCount += entries.length - filteredEntries.length;
      }
    });

    return archivedCount;
  }

  /**
   * Export history to JSON
   */
  exportHistory(format: 'json' | 'csv' = 'json'): string {
    const allEntries: HistoryEntry[] = [];
    this.history.forEach(entries => allEntries.push(...entries));

    if (format === 'json') {
      return JSON.stringify(allEntries, null, 2);
    }

    // CSV format
    const headers = ['intentId', 'userId', 'sessionId', 'category', 'intent', 'action', 'timestamp'];
    const rows = allEntries.map(e => [
      e.intent.id,
      e.intent.userId || '',
      e.intent.sessionId || '',
      e.intent.category,
      `"${e.intent.intent.replace(/"/g, '""')}"`,
      e.action,
      e.timestamp
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history.clear();
    this.threads.clear();
    this.indexByUser.clear();
    this.indexBySession.clear();
    this.indexByCategory.clear();
    this.stats = this.initStats();
  }

  // Private helper methods

  private updateIndexes(intent: Intent, intentId: string): void {
    // Index by user
    if (intent.userId) {
      const userIds = this.indexByUser.get(intent.userId) || [];
      if (!userIds.includes(intentId)) {
        userIds.push(intentId);
        this.indexByUser.set(intent.userId, userIds);
      }
    }

    // Index by session
    if (intent.sessionId) {
      const sessionIds = this.indexBySession.get(intent.sessionId) || [];
      if (!sessionIds.includes(intentId)) {
        sessionIds.push(intentId);
        this.indexBySession.set(intent.sessionId, sessionIds);
      }
    }

    // Index by category
    const categoryIds = this.indexByCategory.get(intent.category) || [];
    if (!categoryIds.includes(intentId)) {
      categoryIds.push(intentId);
      this.indexByCategory.set(intent.category, categoryIds);
    }
  }

  private updateStats(action: HistoryEntry['action'], category: string): void {
    this.stats.totalEntries++;
    this.stats.entriesByAction[action] = (this.stats.entriesByAction[action] || 0) + 1;
    this.stats.entriesByCategory[category] = (this.stats.entriesByCategory[category] || 0) + 1;
  }

  private updateThread(intent: Intent, entry: HistoryEntry): void {
    const sessionId = intent.sessionId || 'default';

    if (!this.threads.has(sessionId)) {
      this.threads.set(sessionId, {
        sessionId,
        userId: intent.userId,
        entries: [],
        startedAt: entry.timestamp,
        lastActivityAt: entry.timestamp,
        isActive: true,
        metadata: {}
      });
    }

    const thread = this.threads.get(sessionId)!;
    thread.entries.push(entry);
    thread.lastActivityAt = entry.timestamp;

    // Mark as inactive if no activity for 30 minutes
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    if (new Date(thread.lastActivityAt) < thirtyMinutesAgo) {
      thread.isActive = false;
    }
  }

  private getMostActiveUsers(limit: number): Array<{ userId: string; count: number }> {
    const userCounts = new Map<string, number>();

    this.indexByUser.forEach((intentIds, userId) => {
      userCounts.set(userId, intentIds.length);
    });

    return Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId, count]) => ({ userId, count }));
  }

  private calculatePeakHours(): number[] {
    const hourCounts = new Map<number, number>();

    this.history.forEach(entries => {
      for (const entry of entries) {
        const hour = new Date(entry.timestamp).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
    });

    const sortedHours = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    return sortedHours;
  }
}

// Export singleton instance
export const intentHistory = new IntentHistory();
