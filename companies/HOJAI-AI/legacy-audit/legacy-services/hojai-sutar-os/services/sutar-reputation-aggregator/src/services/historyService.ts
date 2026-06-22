import { v4 as uuidv4 } from 'uuid';
import {
  HistoricalEntry,
  HistoricalData,
  DataPoint,
  HistoricalSummary,
  MetricType,
  TrendDirection,
} from '../types/index.js';

interface HistoryStore {
  entries: Map<string, HistoricalEntry>;
  entityIndex: Map<string, Map<MetricType, Set<string>>>;
}

const store: HistoryStore = {
  entries: new Map(),
  entityIndex: new Map(),
};

const MAX_ENTRIES_PER_ENTITY = 1000;
const DEFAULT_RETENTION_DAYS = 90;

export class HistoryService {
  async recordMetric(
    entityId: string,
    metricType: MetricType,
    value: number,
    metadata?: Record<string, unknown>
  ): Promise<HistoricalEntry> {
    const entry: HistoricalEntry = {
      id: uuidv4(),
      entityId,
      metricType,
      value,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    // Store the entry
    store.entries.set(entry.id, entry);

    // Index by entity and metric type
    if (!store.entityIndex.has(entityId)) {
      store.entityIndex.set(entityId, new Map());
    }
    const entityMetrics = store.entityIndex.get(entityId)!;

    if (!entityMetrics.has(metricType)) {
      entityMetrics.set(metricType, new Set());
    }
    entityMetrics.get(metricType)!.add(entry.id);

    // Cleanup old entries if needed
    await this.cleanupOldEntries(entityId, metricType);

    console.log(`[HistoryService] Recorded ${metricType} metric for ${entityId}: ${value}`);
    return entry;
  }

  async getHistory(
    entityId: string,
    metricType: MetricType,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<HistoricalData> {
    const entryIds = store.entityIndex.get(entityId)?.get(metricType);
    if (!entryIds) {
      return {
        entityId,
        metricType,
        entries: [],
        summary: this.createEmptySummary(),
      };
    }

    let entries = Array.from(entryIds)
      .map(id => store.entries.get(id))
      .filter((e): e is HistoricalEntry => e !== undefined)
      .filter(e => e.entityId === entityId && e.metricType === metricType);

    // Apply date filters
    if (options?.startDate) {
      entries = entries.filter(e => e.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      entries = entries.filter(e => e.timestamp <= options.endDate!);
    }

    // Sort by timestamp (newest first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }

    // Convert to data points
    const dataPoints: DataPoint[] = entries.map(e => ({
      timestamp: e.timestamp,
      value: e.value,
      metadata: e.metadata,
    }));

    // Calculate summary
    const summary = this.calculateSummary(dataPoints);

    return {
      entityId,
      metricType,
      entries: dataPoints,
      summary,
    };
  }

  async getLatestValue(entityId: string, metricType: MetricType): Promise<number | null> {
    const history = await this.getHistory(entityId, metricType, { limit: 1 });
    return history.entries.length > 0 ? history.entries[0].value : null;
  }

  async getTrend(entityId: string, metricType: MetricType, periodDays: number = 30): Promise<TrendDirection> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const history = await this.getHistory(entityId, metricType, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    if (history.entries.length < 2) return 'stable';

    const recent = history.entries.slice(0, Math.min(5, history.entries.length));
    const older = history.entries.slice(-Math.min(5, history.entries.length));

    const recentAvg = recent.reduce((a, b) => a + b.value, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b.value, 0) / older.length;

    const changePercent = olderAvg !== 0 ? ((recentAvg - olderAvg) / Math.abs(olderAvg)) * 100 : 0;

    if (changePercent > 5) return 'up';
    if (changePercent < -5) return 'down';
    return 'stable';
  }

  async getChange(entityId: string, metricType: MetricType, periodDays: number = 30): Promise<{
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const olderStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const currentHistory = await this.getHistory(entityId, metricType, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const previousHistory = await this.getHistory(entityId, metricType, {
      startDate: olderStartDate.toISOString(),
      endDate: startDate.toISOString(),
    });

    const current = currentHistory.entries.length > 0
      ? currentHistory.entries.reduce((a, b) => a + b.value, 0) / currentHistory.entries.length
      : 0;

    const previous = previousHistory.entries.length > 0
      ? previousHistory.entries.reduce((a, b) => a + b.value, 0) / previousHistory.entries.length
      : 0;

    const change = current - previous;
    const changePercent = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;

    return {
      current: Math.round(current * 100) / 100,
      previous: Math.round(previous * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  }

  async getAggregatedHistory(
    entityId: string,
    metricTypes: MetricType[],
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<HistoricalData[]> {
    return Promise.all(
      metricTypes.map(metricType => this.getHistory(entityId, metricType, options))
    );
  }

  async deleteHistory(entityId: string, metricType?: MetricType): Promise<number> {
    let deletedCount = 0;

    if (metricType) {
      const entryIds = store.entityIndex.get(entityId)?.get(metricType);
      if (entryIds) {
        for (const id of entryIds) {
          store.entries.delete(id);
          deletedCount++;
        }
        store.entityIndex.get(entityId)!.delete(metricType);
      }
    } else {
      // Delete all metrics for entity
      const entityMetrics = store.entityIndex.get(entityId);
      if (entityMetrics) {
        for (const entryIds of entityMetrics.values()) {
          for (const id of entryIds) {
            store.entries.delete(id);
            deletedCount++;
          }
        }
        store.entityIndex.delete(entityId);
      }
    }

    return deletedCount;
  }

  private async cleanupOldEntries(entityId: string, metricType: MetricType): Promise<void> {
    const entryIds = store.entityIndex.get(entityId)?.get(metricType);
    if (!entryIds || entryIds.size <= MAX_ENTRIES_PER_ENTITY) return;

    const entries = Array.from(entryIds)
      .map(id => store.entries.get(id))
      .filter((e): e is HistoricalEntry => e !== undefined)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Remove oldest entries beyond the limit
    const toRemove = entries.slice(0, entries.length - MAX_ENTRIES_PER_ENTITY);
    for (const entry of toRemove) {
      store.entries.delete(entry.id);
      entryIds.delete(entry.id);
    }

    console.log(`[HistoryService] Cleaned up ${toRemove.length} old entries for ${entityId}/${metricType}`);
  }

  private calculateSummary(dataPoints: DataPoint[]): HistoricalSummary {
    if (dataPoints.length === 0) {
      return this.createEmptySummary();
    }

    const values = dataPoints.map(d => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const current = values[0]; // Most recent
    const min = Math.min(...values);
    const max = Math.max(...values);

    const previous = values[values.length - 1]; // Oldest
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;

    let trend: TrendDirection = 'stable';
    if (changePercent > 5) trend = 'up';
    else if (changePercent < -5) trend = 'down';

    return {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      average: Math.round(average * 100) / 100,
      current: Math.round(current * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      trend,
    };
  }

  private createEmptySummary(): HistoricalSummary {
    return {
      min: 0,
      max: 0,
      average: 0,
      current: 0,
      change: 0,
      changePercent: 0,
      trend: 'stable',
    };
  }

  // For testing/debugging
  clearStore(): void {
    store.entries.clear();
    store.entityIndex.clear();
  }

  getStoreSize(): number {
    return store.entries.size;
  }
}

export const historyService = new HistoryService();
