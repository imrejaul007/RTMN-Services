/**
 * Audit Log Model
 * Immutable audit trail for compliance tracking
 */

export enum AuditAction {
  // KYC Actions
  KYC_CREATED = 'KYC_CREATED',
  KYC_DOCUMENT_UPLOADED = 'KYC_DOCUMENT_UPLOADED',
  KYC_DOCUMENT_VERIFIED = 'KYC_DOCUMENT_VERIFIED',
  KYC_DOCUMENT_REJECTED = 'KYC_DOCUMENT_REJECTED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  KYC_EXPIRED = 'KYC_EXPIRED',
  KYC_UPDATED = 'KYC_UPDATED',

  // GDPR Actions
  GDPR_REQUEST_RECEIVED = 'GDPR_REQUEST_RECEIVED',
  GDPR_DATA_EXPORTED = 'GDPR_DATA_EXPORTED',
  GDPR_DATA_DELETED = 'GDPR_DATA_DELETED',
  GDPR_CONSENT_GRANTED = 'GDPR_CONSENT_GRANTED',
  GDPR_CONSENT_WITHDRAWN = 'GDPR_CONSENT_WITHDRAWN',
  GDPR_PRIVACY_NOTICE_UPDATED = 'GDPR_PRIVACY_NOTICE_UPDATED',

  // AML Actions
  AML_SCREENING_PERFORMED = 'AML_SCREENING_PERFORMED',
  AML_ALERT_TRIGGERED = 'AML_ALERT_TRIGGERED',
  AML_TRANSACTION_BLOCKED = 'AML_TRANSACTION_BLOCKED',
  AML_SAR_FILED = 'AML_SAR_FILED',
  AML_SANCTIONS_MATCH = 'AML_SANCTIONS_MATCH',

  // Compliance Actions
  VIOLATION_DETECTED = 'VIOLATION_DETECTED',
  VIOLATION_RESOLVED = 'VIOLATION_RESOLVED',
  RULE_CREATED = 'RULE_CREATED',
  RULE_UPDATED = 'RULE_UPDATED',
  RULE_DELETED = 'RULE_DELETED',

  // System Actions
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CONFIG_CHANGED = 'CONFIG_CHANGED',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  DATA_ACCESSED = 'DATA_ACCESSED'
}

export enum AuditEntityType {
  USER = 'USER',
  KYC_RECORD = 'KYC_RECORD',
  DOCUMENT = 'DOCUMENT',
  TRANSACTION = 'TRANSACTION',
  ACCOUNT = 'ACCOUNT',
  RULE = 'RULE',
  VIOLATION = 'VIOLATION',
  COMPLIANCE_REQUEST = 'COMPLIANCE_REQUEST',
  SYSTEM = 'SYSTEM'
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  userId?: string;
  actorId: string;
  actorType: 'user' | 'system' | 'service';
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status: 'success' | 'failure' | 'pending';
  errorMessage?: string;
  retentionUntil?: Date;
}

export interface AuditSearchParams {
  startDate?: Date;
  endDate?: Date;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  userId?: string;
  actorId?: string;
  status?: 'success' | 'failure' | 'pending';
  limit?: number;
  offset?: number;
}

export interface AuditRetentionPolicy {
  entityType: AuditEntityType;
  retentionDays: number;
  archivedAfterDays: number;
  deletedAfterDays: number;
}

// Default retention policies (GDPR requires minimum 5 years for financial records)
export const RETENTION_POLICIES: AuditRetentionPolicy[] = [
  { entityType: AuditEntityType.USER, retentionDays: 365, archivedAfterDays: 180, deletedAfterDays: 365 },
  { entityType: AuditEntityType.KYC_RECORD, retentionDays: 2555, archivedAfterDays: 1825, deletedAfterDays: 2555 },
  { entityType: AuditEntityType.DOCUMENT, retentionDays: 2555, archivedAfterDays: 1825, deletedAfterDays: 2555 },
  { entityType: AuditEntityType.TRANSACTION, retentionDays: 2555, archivedAfterDays: 1825, deletedAfterDays: 2555 },
  { entityType: AuditEntityType.ACCOUNT, retentionDays: 2555, archivedAfterDays: 1825, deletedAfterDays: 2555 },
  { entityType: AuditEntityType.VIOLATION, retentionDays: 2555, archivedAfterDays: 1825, deletedAfterDays: 2555 },
  { entityType: AuditEntityType.RULE, retentionDays: 365, archivedAfterDays: 180, deletedAfterDays: 365 },
  { entityType: AuditEntityType.COMPLIANCE_REQUEST, retentionDays: 2555, archivedAfterDays: 1825, deletedAfterDays: 2555 },
  { entityType: AuditEntityType.SYSTEM, retentionDays: 730, archivedAfterDays: 365, deletedAfterDays: 730 }
];

// In-memory audit store
export class AuditStore {
  private logs: Map<string, AuditLog> = new Map();
  private retentionPolicies: Map<AuditEntityType, AuditRetentionPolicy> = new Map();

  constructor() {
    RETENTION_POLICIES.forEach(policy => {
      this.retentionPolicies.set(policy.entityType, policy);
    });
  }

  createLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const id = `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newLog: AuditLog = {
      ...log,
      id,
      timestamp: new Date()
    };

    // Calculate retention date
    const policy = this.retentionPolicies.get(log.entityType);
    if (policy) {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() + policy.retentionDays);
      newLog.retentionUntil = retentionDate;
    }

    this.logs.set(id, newLog);
    return newLog;
  }

  getLogById(id: string): AuditLog | undefined {
    return this.logs.get(id);
  }

  getLogsByEntity(entityId: string): AuditLog[] {
    return Array.from(this.logs.values())
      .filter(log => log.entityId === entityId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getLogsByUser(userId: string): AuditLog[] {
    return Array.from(this.logs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getLogsByAction(action: AuditAction): AuditLog[] {
    return Array.from(this.logs.values())
      .filter(log => log.action === action)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  search(params: AuditSearchParams): AuditLog[] {
    let results = Array.from(this.logs.values());

    if (params.startDate) {
      results = results.filter(log => log.timestamp >= params.startDate!);
    }

    if (params.endDate) {
      results = results.filter(log => log.timestamp <= params.endDate!);
    }

    if (params.action) {
      results = results.filter(log => log.action === params.action);
    }

    if (params.entityType) {
      results = results.filter(log => log.entityType === params.entityType);
    }

    if (params.entityId) {
      results = results.filter(log => log.entityId === params.entityId);
    }

    if (params.userId) {
      results = results.filter(log => log.userId === params.userId);
    }

    if (params.actorId) {
      results = results.filter(log => log.actorId === params.actorId);
    }

    if (params.status) {
      results = results.filter(log => log.status === params.status);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = params.offset || 0;
    const limit = params.limit || 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  getAllLogs(limit = 1000): AuditLog[] {
    return Array.from(this.logs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get logs for export (GDPR data portability)
  exportUserLogs(userId: string): AuditLog[] {
    return Array.from(this.logs.values())
      .filter(log => log.userId === userId || log.entityId === userId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Cleanup expired logs
  cleanupExpiredLogs(): number {
    const now = new Date();
    let deletedCount = 0;

    for (const [id, log] of this.logs.entries()) {
      if (log.retentionUntil && log.retentionUntil < now) {
        this.logs.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Statistics
  getStatistics(startDate?: Date, endDate?: Date): {
    totalLogs: number;
    byAction: Record<string, number>;
    byEntityType: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    let logs = Array.from(this.logs.values());

    if (startDate) {
      logs = logs.filter(log => log.timestamp >= startDate);
    }

    if (endDate) {
      logs = logs.filter(log => log.timestamp <= endDate);
    }

    const byAction: Record<string, number> = {};
    const byEntityType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    logs.forEach(log => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1;
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
    });

    return {
      totalLogs: logs.length,
      byAction,
      byEntityType,
      byStatus
    };
  }
}

export const auditStore = new AuditStore();
