/**
 * REZ Central Permissions - Access Audit Module
 * Comprehensive audit logging for permission decisions
 */

import { v4 as uuidv4 } from 'uuid';
import { AuditEntry, Action, UserType, PermissionContext } from '../types';

// In-memory audit store (use database in production)
const auditStore: AuditEntry[] = [];
const MAX_IN_MEMORY_ENTRIES = 10000;

interface AuditQueryFilters {
  user_id?: string;
  resource?: string;
  action?: Action;
  decision?: 'granted' | 'denied';
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

interface AuditStats {
  totalEntries: number;
  grantedCount: number;
  deniedCount: number;
  byResource: Record<string, number>;
  byUser: Record<string, number>;
  averageEvaluationTime: number;
}

export class AccessAudit {
  private retentionDays: number;
  private logPath?: string;
  private enabled: boolean;

  constructor(retentionDays = 90, logPath?: string) {
    this.retentionDays = retentionDays;
    this.logPath = logPath;
    this.enabled = true;
  }

  /**
   * Log an audit entry
   */
  async log(entry: AuditEntry): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Add to in-memory store
    auditStore.push(entry);

    // Trim old entries if exceeding max
    while (auditStore.length > MAX_IN_MEMORY_ENTRIES) {
      auditStore.shift();
    }

    // Write to persistent storage if configured
    if (this.logPath) {
      await this.writeToFile(entry);
    }

    // Clean up old entries based on retention
    this.cleanupOldEntries();
  }

  /**
   * Query audit entries with filters
   */
  async query(filters: AuditQueryFilters): Promise<AuditEntry[]> {
    let results = [...auditStore];

    // Apply filters
    if (filters.user_id) {
      results = results.filter(e => e.user_id === filters.user_id);
    }

    if (filters.resource) {
      results = results.filter(e => e.resource === filters.resource);
    }

    if (filters.action) {
      results = results.filter(e => e.action === filters.action);
    }

    if (filters.decision) {
      results = results.filter(e => e.decision === filters.decision);
    }

    if (filters.start_date) {
      const startDate = new Date(filters.start_date);
      results = results.filter(e => new Date(e.timestamp) >= startDate);
    }

    if (filters.end_date) {
      const endDate = new Date(filters.end_date);
      results = results.filter(e => new Date(e.timestamp) <= endDate);
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get audit entry by ID
   */
  async getById(id: string): Promise<AuditEntry | undefined> {
    return auditStore.find(e => e.id === id);
  }

  /**
   * Get audit entries for a specific user
   */
  async getByUser(userId: string, limit = 100): Promise<AuditEntry[]> {
    return this.query({
      user_id: userId,
      limit,
    });
  }

  /**
   * Get audit entries for a specific resource
   */
  async getByResource(resource: string, limit = 100): Promise<AuditEntry[]> {
    return this.query({
      resource,
      limit,
    });
  }

  /**
   * Get denied access entries
   */
  async getDeniedAccess(filters: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<AuditEntry[]> {
    return this.query({
      decision: 'denied',
      start_date: filters.start_date,
      end_date: filters.end_date,
      limit: filters.limit,
    });
  }

  /**
   * Get audit statistics
   */
  async getStats(startDate?: string, endDate?: string): Promise<AuditStats> {
    let entries = [...auditStore];

    // Filter by date range if provided
    if (startDate) {
      const start = new Date(startDate);
      entries = entries.filter(e => new Date(e.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      entries = entries.filter(e => new Date(e.timestamp) <= end);
    }

    const stats: AuditStats = {
      totalEntries: entries.length,
      grantedCount: 0,
      deniedCount: 0,
      byResource: {},
      byUser: {},
      averageEvaluationTime: 0,
    };

    let totalTime = 0;

    for (const entry of entries) {
      if (entry.decision === 'granted') {
        stats.grantedCount++;
      } else {
        stats.deniedCount++;
      }

      // Count by resource
      stats.byResource[entry.resource] = (stats.byResource[entry.resource] || 0) + 1;

      // Count by user
      stats.byUser[entry.user_id] = (stats.byUser[entry.user_id] || 0) + 1;

      // Sum evaluation times
      totalTime += entry.evaluation_time_ms;
    }

    // Calculate average evaluation time
    if (entries.length > 0) {
      stats.averageEvaluationTime = totalTime / entries.length;
    }

    return stats;
  }

  /**
   * Get recent denials for security monitoring
   */
  async getRecentDenials(minutes = 60, threshold = 5): Promise<Map<string, AuditEntry[]>> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentDenials = auditStore.filter(
      e => e.decision === 'denied' && new Date(e.timestamp) >= cutoff
    );

    // Group by user
    const groupedByUser = new Map<string, AuditEntry[]>();
    for (const entry of recentDenials) {
      const existing = groupedByUser.get(entry.user_id) || [];
      existing.push(entry);
      groupedByUser.set(entry.user_id, existing);
    }

    // Filter to only users exceeding threshold
    const suspicious = new Map<string, AuditEntry[]>();
    for (const [userId, entries] of groupedByUser) {
      if (entries.length >= threshold) {
        suspicious.set(userId, entries);
      }
    }

    return suspicious;
  }

  /**
   * Export audit entries for compliance
   */
  async export(
    format: 'json' | 'csv',
    startDate: string,
    endDate: string
  ): Promise<string> {
    const entries = await this.query({
      start_date: startDate,
      end_date: endDate,
      limit: 100000,
    });

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    }

    // CSV format
    const headers = [
      'id',
      'timestamp',
      'request_id',
      'user_id',
      'user_type',
      'action',
      'resource',
      'resource_id',
      'decision',
      'reason',
      'matched_policy',
      'ip_address',
    ];

    const rows = entries.map(e => [
      e.id,
      e.timestamp,
      e.request_id,
      e.user_id,
      e.user_type,
      e.action,
      e.resource,
      e.resource_id,
      e.decision,
      e.reason,
      e.matched_policy || '',
      e.context.ip_address || '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Clear all audit entries (use with caution)
   */
  async clear(): Promise<void> {
    auditStore.length = 0;
  }

  /**
   * Enable/disable audit logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get entry count
   */
  getEntryCount(): number {
    return auditStore.length;
  }

  /**
   * Write entry to log file
   */
  private async writeToFile(entry: AuditEntry): Promise<void> {
    if (!this.logPath) {
      return;
    }

    try {
      const logLine = JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.decision === 'granted' ? 'info' : 'warn',
        message: `Permission ${entry.decision}: ${entry.user_id} -> ${entry.action} ${entry.resource}`,
        ...entry,
      });

      // In production, use proper file writing
      logger.info([AUDIT] ${logLine}`);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Cleanup old entries based on retention policy
   */
  private cleanupOldEntries(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);

    // Remove entries older than retention period
    while (auditStore.length > 0) {
      const oldest = auditStore[0];
      if (new Date(oldest.timestamp) < cutoff) {
        auditStore.shift();
      } else {
        break;
      }
    }
  }

  /**
   * Create audit entry from permission check
   */
  createEntry(params: {
    user_id: string;
    user_type: UserType;
    action: Action;
    resource: string;
    resource_id: string;
    decision: 'granted' | 'denied';
    reason: string;
    policies_evaluated: string[];
    matched_policy?: string;
    context: PermissionContext;
    evaluation_time_ms: number;
    ip_address?: string;
    user_agent?: string;
  }): AuditEntry {
    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      request_id: uuidv4(),
      user_id: params.user_id,
      user_type: params.user_type,
      action: params.action,
      resource: params.resource,
      resource_id: params.resource_id,
      decision: params.decision,
      reason: params.reason,
      policies_evaluated: params.policies_evaluated,
      matched_policy: params.matched_policy,
      context: params.context,
      evaluation_time_ms: params.evaluation_time_ms,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
    };
  }
}
