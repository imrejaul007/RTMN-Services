/**
 * Audit Log Service - Tracks all synchronization activities for compliance and debugging
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AuditEntry,
  SyncSource,
  SyncStats
} from '../models/Sync';

interface AuditQuery {
  source?: SyncSource;
  target?: SyncSource;
  entityType?: string;
  entityId?: string;
  action?: string;
  status?: 'success' | 'failure' | 'conflict';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

interface AuditSummary {
  totalEntries: number;
  byStatus: Record<string, number>;
  byAction: Record<string, number>;
  bySource: Record<string, number>;
  byTarget: Record<string, number>;
  averageDuration: number;
  lastEntryAt: Date | null;
}

export class AuditLog {
  private logger: any;
  private logs: AuditEntry[];
  private maxEntries: number;
  private retentionDays: number;

  constructor(logger: any, maxEntries: number = 10000, retentionDays: number = 90) {
    this.logger = logger;
    this.logs = [];
    this.maxEntries = maxEntries;
    this.retentionDays = retentionDays;
  }

  /**
   * Log a sync action
   */
  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
    const auditEntry: AuditEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      ...entry
    };

    // Add to logs
    this.logs.push(auditEntry);

    // Trim if over max
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(-this.maxEntries);
    }

    // Log to Winston
    this.logger.info('Audit log entry', {
      auditId: auditEntry.id,
      action: auditEntry.action,
      source: auditEntry.source,
      target: auditEntry.target,
      entityType: auditEntry.entityType,
      entityId: auditEntry.entityId,
      status: auditEntry.status,
      duration: auditEntry.duration
    });

    return auditEntry;
  }

  /**
   * Get logs with optional filtering
   */
  getLogs(query: AuditQuery = {}): {
    logs: AuditEntry[];
    total: number;
    hasMore: boolean;
  } {
    let filtered = [...this.logs];

    // Apply filters
    if (query.source) {
      filtered = filtered.filter(l => l.source === query.source);
    }
    if (query.target) {
      filtered = filtered.filter(l => l.target === query.target);
    }
    if (query.entityType) {
      filtered = filtered.filter(l => l.entityType === query.entityType);
    }
    if (query.entityId) {
      filtered = filtered.filter(l => l.entityId === query.entityId);
    }
    if (query.action) {
      filtered = filtered.filter(l => l.action === query.action);
    }
    if (query.status) {
      filtered = filtered.filter(l => l.status === query.status);
    }
    if (query.startDate) {
      filtered = filtered.filter(l => l.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      filtered = filtered.filter(l => l.timestamp <= query.endDate!);
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filtered.length;
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    // Apply pagination
    const paginatedLogs = filtered.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total,
      hasMore: offset + limit < total
    };
  }

  /**
   * Get a single log entry by ID
   */
  getLog(id: string): AuditEntry | null {
    return this.logs.find(l => l.id === id) || null;
  }

  /**
   * Get audit summary statistics
   */
  getSummary(): AuditSummary {
    const byStatus: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byTarget: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;
    let lastEntryAt: Date | null = null;

    for (const log of this.logs) {
      // Count by status
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;

      // Count by action
      byAction[log.action] = (byAction[log.action] || 0) + 1;

      // Count by source
      bySource[log.source] = (bySource[log.source] || 0) + 1;

      // Count by target
      byTarget[log.target] = (byTarget[log.target] || 0) + 1;

      // Calculate average duration
      if (log.duration > 0) {
        totalDuration += log.duration;
        durationCount++;
      }

      // Track last entry
      if (!lastEntryAt || log.timestamp > lastEntryAt) {
        lastEntryAt = log.timestamp;
      }
    }

    return {
      totalEntries: this.logs.length,
      byStatus,
      byAction,
      bySource,
      byTarget,
      averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      lastEntryAt
    };
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    success: number;
    failure: number;
    conflict: number;
    bySource: Record<string, number>;
    byTarget: Record<string, number>;
    byEntityType: Record<string, number>;
  } {
    const stats = {
      total: this.logs.length,
      success: 0,
      failure: 0,
      conflict: 0,
      bySource: {} as Record<string, number>,
      byTarget: {} as Record<string, number>,
      byEntityType: {} as Record<string, number>
    };

    for (const log of this.logs) {
      switch (log.status) {
        case 'success':
          stats.success++;
          break;
        case 'failure':
          stats.failure++;
          break;
        case 'conflict':
          stats.conflict++;
          break;
      }

      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
      stats.byTarget[log.target] = (stats.byTarget[log.target] || 0) + 1;
      stats.byEntityType[log.entityType] = (stats.byEntityType[log.entityType] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get logs for a specific entity
   */
  getEntityHistory(
    entityType: string,
    entityId: string
  ): AuditEntry[] {
    return this.logs
      .filter(l => l.entityType === entityType && l.entityId === entityId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get sync history between sources
   */
  getSyncHistory(
    source: SyncSource,
    target: SyncSource,
    limit: number = 50
  ): AuditEntry[] {
    return this.logs
      .filter(l => l.source === source && l.target === target)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get failed operations
   */
  getFailures(limit: number = 100): AuditEntry[] {
    return this.logs
      .filter(l => l.status === 'failure')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get conflict events
   */
  getConflicts(limit: number = 100): AuditEntry[] {
    return this.logs
      .filter(l => l.status === 'conflict')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get recent activity
   */
  getRecentActivity(limit: number = 50): AuditEntry[] {
    return this.logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Export logs for a date range
   */
  exportLogs(startDate: Date, endDate: Date): AuditEntry[] {
    return this.logs
      .filter(l => l.timestamp >= startDate && l.timestamp <= endDate)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Clean up old logs based on retention policy
   */
  cleanup(): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);

    const initialCount = this.logs.length;
    this.logs = this.logs.filter(l => l.timestamp >= cutoff);
    const cleaned = initialCount - this.logs.length;

    if (cleaned > 0) {
      this.logger.info(`Cleaned up ${cleaned} audit log entries older than ${this.retentionDays} days`);
    }

    return cleaned;
  }

  /**
   * Clear all logs
   */
  clear(): void {
    const count = this.logs.length;
    this.logs = [];
    this.logger.info(`Cleared ${count} audit log entries`);
  }

  /**
   * Get time series data for dashboard
   */
  getTimeSeriesData(
    interval: 'hour' | 'day' = 'day',
    days: number = 30
  ): Array<{
    timestamp: Date;
    success: number;
    failure: number;
    conflict: number;
    total: number;
  }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const recentLogs = this.logs.filter(l => l.timestamp >= cutoff);

    // Group by interval
    const groups = new Map<string, {
      success: number;
      failure: number;
      conflict: number;
    }>();

    for (const log of recentLogs) {
      let key: string;
      if (interval === 'hour') {
        const d = new Date(log.timestamp);
        d.setMinutes(0, 0, 0);
        key = d.toISOString();
      } else {
        const d = new Date(log.timestamp);
        d.setHours(0, 0, 0, 0);
        key = d.toISOString();
      }

      if (!groups.has(key)) {
        groups.set(key, { success: 0, failure: 0, conflict: 0 });
      }

      const group = groups.get(key)!;
      switch (log.status) {
        case 'success':
          group.success++;
          break;
        case 'failure':
          group.failure++;
          break;
        case 'conflict':
          group.conflict++;
          break;
      }
    }

    // Convert to array
    const result = Array.from(groups.entries())
      .map(([timestamp, data]) => ({
        timestamp: new Date(timestamp),
        ...data,
        total: data.success + data.failure + data.conflict
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return result;
  }

  /**
   * Calculate sync performance metrics
   */
  getPerformanceMetrics(days: number = 7): {
    averageDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
    throughput: number;
    successRate: number;
  } {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const recentLogs = this.logs.filter(
      l => l.timestamp >= cutoff && l.status === 'success'
    );

    const durations = recentLogs
      .filter(l => l.duration > 0)
      .map(l => l.duration)
      .sort((a, b) => a - b);

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = durations.length > 0 ? totalDuration / durations.length : 0;

    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    const successCount = this.logs.filter(
      l => l.timestamp >= cutoff && l.status === 'success'
    ).length;
    const totalCount = this.logs.filter(l => l.timestamp >= cutoff).length;

    return {
      averageDuration,
      p50Duration: durations[p50Index] || 0,
      p95Duration: durations[p95Index] || 0,
      p99Duration: durations[p99Index] || 0,
      throughput: totalCount / days,
      successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0
    };
  }
}
