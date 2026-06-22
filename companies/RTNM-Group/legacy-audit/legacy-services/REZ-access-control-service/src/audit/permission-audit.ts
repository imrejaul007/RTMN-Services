import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AccessContext, AccessDecision } from '../index';

export interface AuditLog {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  context: AccessContext;
  decision: AccessDecision;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export type AuditEventType =
  | 'ACCESS_ATTEMPT'
  | 'ACCESS_GRANTED'
  | 'ACCESS_DENIED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REVOKED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'POLICY_CREATED'
  | 'POLICY_UPDATED'
  | 'POLICY_DELETED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'SERVICE_ERROR';

export interface AuditQueryOptions {
  userId?: string;
  resource?: string;
  action?: string;
  eventType?: AuditEventType;
  startDate?: Date;
  endDate?: Date;
  allowed?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  totalEvents: number;
  allowedCount: number;
  deniedCount: number;
  byEventType: Record<AuditEventType, number>;
  byUser: Record<string, number>;
  byResource: Record<string, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface AuditRetentionPolicy {
  id: string;
  name: string;
  retentionDays: number;
  eventTypes: AuditEventType[];
  archiveBeforeDelete: boolean;
  enabled: boolean;
}

export class PermissionAudit {
  private logs: AuditLog[] = [];
  private retentionPolicies: AuditRetentionPolicy[] = [];
  private logIndex: Map<string, AuditLog[]> = new Map();

  constructor() {
    this.initializeDefaultRetentionPolicy();
  }

  private initializeDefaultRetentionPolicy(): void {
    this.retentionPolicies.push({
      id: 'default-90-days',
      name: 'Default 90-Day Retention',
      retentionDays: 90,
      eventTypes: ['ACCESS_ATTEMPT', 'ACCESS_GRANTED', 'ACCESS_DENIED'],
      archiveBeforeDelete: true,
      enabled: true
    });
  }

  async logAccessAttempt(context: AccessContext, decision: AccessDecision): Promise<AuditLog> {
    const eventType: AuditEventType = decision.allowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED';

    const log: AuditLog = {
      id: uuidv4(),
      timestamp: new Date(),
      eventType,
      context,
      decision,
      metadata: {
        userId: context.userId,
        resource: context.resource,
        action: context.action
      }
    };

    this.logs.push(log);
    this.indexLog(log);
    logger.info(`Audit log created: ${eventType} for ${context.userId} on ${context.resource}`);

    return log;
  }

  async logEvent(
    eventType: AuditEventType,
    context: AccessContext,
    decision?: AccessDecision,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: uuidv4(),
      timestamp: new Date(),
      eventType,
      context,
      decision: decision || {
        allowed: false,
        reason: eventType,
        evaluatedAt: new Date(),
        matchedPolicies: []
      },
      metadata
    };

    this.logs.push(log);
    this.indexLog(log);
    logger.info(`Audit event: ${eventType}`, { logId: log.id });

    return log;
  }

  private indexLog(log: AuditLog): void {
    // Index by userId
    if (!this.logIndex.has('userId')) {
      this.logIndex.set('userId', []);
    }
    this.logIndex.get('userId')!.push(log);

    // Index by resource
    if (!this.logIndex.has('resource')) {
      this.logIndex.set('resource', []);
    }
    this.logIndex.get('resource')!.push(log);

    // Index by eventType
    if (!this.logIndex.has('eventType')) {
      this.logIndex.set('eventType', []);
    }
    this.logIndex.get('eventType')!.push(log);
  }

  async queryLogs(options: AuditQueryOptions = {}): Promise<AuditLog[]> {
    let results = [...this.logs];

    if (options.userId) {
      results = results.filter(log => log.context.userId === options.userId);
    }

    if (options.resource) {
      results = results.filter(log => log.context.resource === options.resource);
    }

    if (options.action) {
      results = results.filter(log => log.context.action === options.action);
    }

    if (options.eventType) {
      results = results.filter(log => log.eventType === options.eventType);
    }

    if (options.allowed !== undefined) {
      results = results.filter(log => log.decision.allowed === options.allowed);
    }

    if (options.startDate) {
      results = results.filter(log => log.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      results = results.filter(log => log.timestamp <= options.endDate!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;

    return results.slice(offset, offset + limit);
  }

  async getLogById(logId: string): Promise<AuditLog | undefined> {
    return this.logs.find(log => log.id === logId);
  }

  async getSummary(options: AuditQueryOptions = {}): Promise<AuditSummary> {
    const logs = await this.queryLogs({
      ...options,
      limit: undefined,
      offset: undefined
    });

    const byEventType: Record<AuditEventType, number> = {
      'ACCESS_ATTEMPT': 0,
      'ACCESS_GRANTED': 0,
      'ACCESS_DENIED': 0,
      'ROLE_ASSIGNED': 0,
      'ROLE_REVOKED': 0,
      'PERMISSION_GRANTED': 0,
      'PERMISSION_REVOKED': 0,
      'POLICY_CREATED': 0,
      'POLICY_UPDATED': 0,
      'POLICY_DELETED': 0,
      'USER_LOGIN': 0,
      'USER_LOGOUT': 0,
      'SERVICE_ERROR': 0
    };

    const byUser: Record<string, number> = {};
    const byResource: Record<string, number> = {};

    let allowedCount = 0;
    let deniedCount = 0;

    for (const log of logs) {
      byEventType[log.eventType]++;

      if (!byUser[log.context.userId]) {
        byUser[log.context.userId] = 0;
      }
      byUser[log.context.userId]++;

      if (!byResource[log.context.resource]) {
        byResource[log.context.resource] = 0;
      }
      byResource[log.context.resource]++;

      if (log.decision.allowed) {
        allowedCount++;
      } else {
        deniedCount++;
      }
    }

    const timestamps = logs.map(l => l.timestamp);

    return {
      totalEvents: logs.length,
      allowedCount,
      deniedCount,
      byEventType,
      byUser,
      byResource,
      timeRange: {
        start: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date(),
        end: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date()
      }
    };
  }

  async getUserActivity(userId: string, days: number = 30): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.queryLogs({
      userId,
      startDate,
      limit: 1000
    });
  }

  async getResourceAccessHistory(resource: string, days: number = 30): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.queryLogs({
      resource,
      startDate,
      limit: 1000
    });
  }

  async getFailedAccessAttempts(userId?: string, minutes: number = 60): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - minutes);

    return this.queryLogs({
      userId,
      startDate,
      allowed: false,
      eventType: 'ACCESS_DENIED',
      limit: 100
    });
  }

  async addRetentionPolicy(policy: Omit<AuditRetentionPolicy, 'id'>): AuditRetentionPolicy {
    const newPolicy: AuditRetentionPolicy = {
      ...policy,
      id: uuidv4()
    };

    this.retentionPolicies.push(newPolicy);
    logger.info(`Retention policy added: ${newPolicy.name}`);
    return newPolicy;
  }

  async enforceRetentionPolicy(): Promise<{ deleted: number; archived: number }> {
    let deleted = 0;
    let archived = 0;

    for (const policy of this.retentionPolicies) {
      if (!policy.enabled) continue;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      const toDelete = this.logs.filter(log =>
        log.timestamp < cutoffDate &&
        policy.eventTypes.includes(log.eventType)
      );

      for (const log of toDelete) {
        if (policy.archiveBeforeDelete) {
          // In production, this would archive to cold storage
          archived++;
        }

        const index = this.logs.indexOf(log);
        if (index > -1) {
          this.logs.splice(index, 1);
          deleted++;
        }
      }
    }

    logger.info(`Retention enforcement complete: ${deleted} deleted, ${archived} archived`);
    return { deleted, archived };
  }

  getRetentionPolicies(): AuditRetentionPolicy[] {
    return [...this.retentionPolicies];
  }

  async exportLogs(options: AuditQueryOptions = {}): Promise<string> {
    const logs = await this.queryLogs({ ...options, limit: undefined });

    const csvHeader = 'id,timestamp,eventType,userId,resource,action,allowed,reason';
    const csvRows = logs.map(log =>
      `"${log.id}","${log.timestamp.toISOString()}","${log.eventType}","${log.context.userId}","${log.context.resource}","${log.context.action}","${log.decision.allowed}","${log.decision.reason}"`
    );

    return [csvHeader, ...csvRows].join('\n');
  }

  clearLogs(): void {
    const count = this.logs.length;
    this.logs = [];
    this.logIndex.clear();
    logger.warn(`All ${count} audit logs cleared`);
  }
}
