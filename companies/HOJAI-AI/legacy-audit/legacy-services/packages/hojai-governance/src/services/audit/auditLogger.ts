import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { AuditLog, AuditAction } from '../../types/index.js';

interface AuditLogDocument extends AuditLog {}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    id: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    organizationId: { type: String, index: true },

    userId: { type: String, index: true },
    userEmail: { type: String },
    apiKeyId: { type: String, index: true },

    action: { type: String, enum: Object.values(AuditAction), required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },

    details: { type: Map, of: Schema.Types.Mixed },

    ip: { type: String },
    userAgent: { type: String },
    requestId: { type: String, index: true },

    success: { type: Boolean, default: true },
    error: { type: String }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'audit_logs'
  }
);

// Indexes for common queries
AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, resource: 1, createdAt: -1 });

// TTL index - keep logs for 2 years
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

export const AuditLogModel: Model<AuditLogDocument> = mongoose.model<AuditLogDocument>(
  'AuditLog',
  AuditLogSchema
);

// ============================================================================
// AUDIT LOGGER SERVICE
// ============================================================================

export interface AuditLogParams {
  tenantId: string;
  organizationId?: string;
  userId?: string;
  userEmail?: string;
  apiKeyId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  success?: boolean;
  error?: string;
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  async log(params: AuditLogParams): Promise<AuditLog> {
    const log = new AuditLogModel({
      id: uuid(),
      ...params,
      success: params.success ?? true
    });

    await log.save();
    return log.toObject() as AuditLog;
  }

  /**
   * Log an audit event asynchronously (fire and forget)
   */
  logAsync(params: AuditLogParams): void {
    setImmediate(async () => {
      try {
        await this.log(params);
      } catch (error) {
        console.error('[AuditLogger] Failed to log event:', error);
      }
    });
  }

  /**
   * Query audit logs with filters
   */
  async query(params: {
    tenantId: string;
    userId?: string;
    action?: AuditAction;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const filter: Record<string, unknown> = { tenantId: params.tenantId };

    if (params.userId) filter.userId = params.userId;
    if (params.action) filter.action = params.action;
    if (params.resource) filter.resource = params.resource;
    if (params.success !== undefined) filter.success = params.success;

    if (params.startDate || params.endDate) {
      filter.createdAt = {};
      if (params.startDate) {
        (filter.createdAt as Record<string, Date>).$gte = params.startDate;
      }
      if (params.endDate) {
        (filter.createdAt as Record<string, Date>).$lte = params.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(params.offset ?? 0)
        .limit(params.limit ?? 50),
      AuditLogModel.countDocuments(filter)
    ]);

    return { logs: logs.map(l => l.toObject() as AuditLog), total };
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceHistory(
    tenantId: string,
    resource: string,
    resourceId: string
  ): Promise<AuditLog[]> {
    const logs = await AuditLogModel.find({
      tenantId,
      resource,
      resourceId
    })
      .sort({ createdAt: -1 })
      .limit(100);

    return logs.map(l => l.toObject() as AuditLog);
  }

  /**
   * Get user activity history
   */
  async getUserActivity(
    tenantId: string,
    userId: string,
    limit = 50
  ): Promise<AuditLog[]> {
    const logs = await AuditLogModel.find({
      tenantId,
      userId
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    return logs.map(l => l.toObject() as AuditLog);
  }

  /**
   * Get failed operations for a tenant
   */
  async getFailedOperations(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditLog[]> {
    const logs = await AuditLogModel.find({
      tenantId,
      success: false,
      createdAt: { $gte: startDate, $lte: endDate }
    })
      .sort({ createdAt: -1 })
      .limit(100);

    return logs.map(l => l.toObject() as AuditLog);
  }

  /**
   * Export audit logs (for compliance)
   */
  async export(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    format: 'json' | 'csv';
  }): Promise<string> {
    const logs = await AuditLogModel.find({
      tenantId: params.tenantId,
      createdAt: { $gte: params.startDate, $lte: params.endDate }
    }).sort({ createdAt: -1 });

    if (params.format === 'json') {
      return JSON.stringify(logs.map(l => l.toObject()), null, 2);
    }

    // CSV format
    const headers = [
      'id',
      'tenantId',
      'userId',
      'userEmail',
      'action',
      'resource',
      'resourceId',
      'success',
      'error',
      'ip',
      'createdAt'
    ];

    const rows = logs.map(log => [
      log.id,
      log.tenantId,
      log.userId ?? '',
      log.userEmail ?? '',
      log.action,
      log.resource,
      log.resourceId ?? '',
      log.success.toString(),
      log.error ?? '',
      log.ip ?? '',
      log.createdAt.toISOString()
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Get security events summary
   */
  async getSecuritySummary(tenantId: string, days = 7): Promise<{
    totalEvents: number;
    failedLogins: number;
    apiKeyUsage: number;
    quotaExceeded: number;
    policyViolations: number;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [logs] = await Promise.all([
      AuditLogModel.aggregate([
        { $match: { tenantId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const summary = {
      totalEvents: 0,
      failedLogins: 0,
      apiKeyUsage: 0,
      quotaExceeded: 0,
      policyViolations: 0
    };

    for (const log of logs) {
      summary.totalEvents += log.count;

      if (log._id === AuditAction.AUTH_LOGIN_FAILED) {
        summary.failedLogins = log.count;
      } else if (log._id === AuditAction.API_KEY_CREATED || log._id === AuditAction.API_KEY_REVOKED) {
        summary.apiKeyUsage += log.count;
      } else if (log._id === AuditAction.TENANT_QUOTA_EXCEEDED) {
        summary.quotaExceeded = log.count;
      } else if (log._id === AuditAction.POLICY_VIOLATED) {
        summary.policyViolations = log.count;
      }
    }

    return summary;
  }
}

export const auditLogger = new AuditLogger();
