import { v4 as uuidv4 } from 'uuid';

export interface AuditEntry {
  id: string;
  action: string;
  entityId?: string;
  requestId?: string;
  applicantId?: string;
  details?: Record<string, any>;
  userId?: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface AuditFilter {
  action?: string;
  entityId?: string;
  requestId?: string;
  applicantId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditService {
  private entries: Map<string, AuditEntry> = new Map();
  private readonly MAX_ENTRIES = 10000;

  /**
   * Log an audit entry
   */
  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const auditEntry: AuditEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: new Date()
    };

    this.entries.set(auditEntry.id, auditEntry);

    // Cleanup old entries if over limit
    if (this.entries.size > this.MAX_ENTRIES) {
      this.cleanupOldEntries();
    }

    return auditEntry;
  }

  /**
   * Get audit entry by ID
   */
  get(id: string): AuditEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Query audit entries with filters
   */
  query(filters: AuditFilter): AuditEntry[] {
    let results = Array.from(this.entries.values());

    if (filters.action) {
      results = results.filter(e => e.action === filters.action);
    }
    if (filters.entityId) {
      results = results.filter(e => e.entityId === filters.entityId);
    }
    if (filters.requestId) {
      results = results.filter(e => e.requestId === filters.requestId);
    }
    if (filters.applicantId) {
      results = results.filter(e => e.applicantId === filters.applicantId);
    }
    if (filters.startDate) {
      results = results.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter(e => e.timestamp <= filters.endDate!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get audit trail for a specific approval
   */
  getApprovalTrail(approvalId: string): AuditEntry[] {
    return this.query({ entityId: approvalId });
  }

  /**
   * Get audit trail for a specific request
   */
  getRequestTrail(requestId: string): AuditEntry[] {
    return this.query({ requestId });
  }

  /**
   * Get audit trail for a specific applicant
   */
  getApplicantTrail(applicantId: string, limit?: number): AuditEntry[] {
    return this.query({ applicantId, limit });
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byAction: Record<string, number>;
    recentCount: number;
  } {
    const entries = Array.from(this.entries.values());
    const byAction: Record<string, number> = {};

    for (const entry of entries) {
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = entries.filter(e => e.timestamp >= oneHourAgo).length;

    return {
      total: entries.length,
      byAction,
      recentCount
    };
  }

  /**
   * Export audit entries
   */
  export(filters?: AuditFilter): AuditEntry[] {
    return this.query({ ...filters, limit: this.entries.size });
  }

  /**
   * Cleanup old entries
   */
  private cleanupOldEntries(): void {
    const entries = Array.from(this.entries.values());
    entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Keep only the most recent entries
    const toKeep = entries.slice(-this.MAX_ENTRIES);
    const toRemove = entries.slice(0, entries.length - this.MAX_ENTRIES);

    for (const entry of toRemove) {
      this.entries.delete(entry.id);
    }
  }

  /**
   * Clear all entries (use with caution)
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get activity summary for an entity
   */
  getActivitySummary(entityId: string): {
    totalActions: number;
    actionsByType: Record<string, number>;
    firstActivity: Date | null;
    lastActivity: Date | null;
  } {
    const entries = this.query({ entityId, limit: this.MAX_ENTRIES });
    const actionsByType: Record<string, number> = {};

    for (const entry of entries) {
      actionsByType[entry.action] = (actionsByType[entry.action] || 0) + 1;
    }

    return {
      totalActions: entries.length,
      actionsByType,
      firstActivity: entries.length > 0 ? entries[entries.length - 1].timestamp : null,
      lastActivity: entries.length > 0 ? entries[0].timestamp : null
    };
  }
}

// Singleton instance
export const auditService = new AuditService();
