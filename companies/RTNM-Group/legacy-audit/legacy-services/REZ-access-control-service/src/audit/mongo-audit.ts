import mongoose, { Schema, Model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

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

export interface AuditContext {
  userId: string;
  resource: string;
  action: string;
  attributes?: Record<string, unknown>;
  environment?: Record<string, unknown>;
}

export interface AuditDecision {
  allowed: boolean;
  reason: string;
  evaluatedAt: Date;
  matchedPolicies: string[];
}

export interface IAuditLog extends Document {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  context: AuditContext;
  decision: AuditDecision;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

const AuditLogSchema = new Schema<IAuditLog>({
  id: { type: String, required: true, unique: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  eventType: {
    type: String,
    required: true,
    enum: [
      'ACCESS_ATTEMPT',
      'ACCESS_GRANTED',
      'ACCESS_DENIED',
      'ROLE_ASSIGNED',
      'ROLE_REVOKED',
      'PERMISSION_GRANTED',
      'PERMISSION_REVOKED',
      'POLICY_CREATED',
      'POLICY_UPDATED',
      'POLICY_DELETED',
      'USER_LOGIN',
      'USER_LOGOUT',
      'SERVICE_ERROR'
    ],
    index: true
  },
  context: {
    userId: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    attributes: { type: Schema.Types.Mixed },
    environment: { type: Schema.Types.Mixed }
  },
  decision: {
    allowed: { type: Boolean, required: true },
    reason: { type: String },
    evaluatedAt: { type: Date },
    matchedPolicies: [String]
  },
  userAgent: String,
  ipAddress: { type: String, index: true },
  sessionId: String,
  requestId: String,
  duration: Number,
  metadata: { type: Schema.Types.Mixed }
}, {
  collection: 'permission_audit_logs',
  timestamps: false
});

// Compound indexes for common queries
AuditLogSchema.index({ 'context.userId': 1, timestamp: -1 });
AuditLogSchema.index({ 'context.resource': 1, timestamp: -1 });
AuditLogSchema.index({ eventType: 1, timestamp: -1 });

// TTL index to automatically delete old logs after retention period (90 days)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

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

let AuditLogModel: Model<IAuditLog>;

export async function initializeAuditMongo(uri?: string): Promise<void> {
  const mongodbUri = uri || process.env.MONGODB_URI;

  if (!mongodbUri) {
    logger.warn('MongoDB URI not provided for audit logs, using in-memory fallback');
    return;
  }

  try {
    await mongoose.connect(mongodbUri);
    AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
    logger.info('Audit log MongoDB connection established');

    // Set up TTL index for automatic cleanup
    await AuditLogModel.collection.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 90 * 24 * 60 * 60 }
    );
  } catch (error) {
    logger.error('Failed to connect to MongoDB for audit logs:', error);
  }
}

export class MongoAuditStore {
  async logAccessAttempt(
    context: AuditContext,
    decision: AuditDecision,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const eventType: AuditEventType = decision.allowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED';

    const log = {
      id: uuidv4(),
      timestamp: new Date(),
      eventType,
      context,
      decision,
      metadata: {
        ...metadata,
        userId: context.userId,
        resource: context.resource,
        action: context.action
      }
    };

    if (AuditLogModel) {
      try {
        await AuditLogModel.create(log);
        logger.debug('Audit log persisted to MongoDB', { id: log.id, eventType });
      } catch (error) {
        logger.error('Failed to persist audit log to MongoDB:', error);
      }
    } else {
      logger.debug('Audit log (in-memory fallback)', { id: log.id, eventType });
    }
  }

  async queryLogs(options: AuditQueryOptions = {}): Promise<IAuditLog[]> {
    if (!AuditLogModel) {
      logger.warn('Audit log query: MongoDB not connected');
      return [];
    }

    const query: Record<string, unknown> = {};

    if (options.userId) {
      query['context.userId'] = options.userId;
    }
    if (options.resource) {
      query['context.resource'] = options.resource;
    }
    if (options.action) {
      query['context.action'] = options.action;
    }
    if (options.eventType) {
      query.eventType = options.eventType;
    }
    if (options.allowed !== undefined) {
      query['decision.allowed'] = options.allowed;
    }
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        (query.timestamp as Record<string, Date>).$gte = options.startDate;
      }
      if (options.endDate) {
        (query.timestamp as Record<string, Date>).$lte = options.endDate;
      }
    }

    const offset = options.offset || 0;
    const limit = Math.min(options.limit || 100, 1000);

    return AuditLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
  }

  async getSummary(options: AuditQueryOptions = {}): Promise<AuditSummary> {
    if (!AuditLogModel) {
      return {
        totalEvents: 0,
        allowedCount: 0,
        deniedCount: 0,
        byEventType: {} as Record<AuditEventType, number>,
        byUser: {},
        byResource: {},
        timeRange: { start: new Date(), end: new Date() }
      };
    }

    const query: Record<string, unknown> = {};

    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        (query.timestamp as Record<string, Date>).$gte = options.startDate;
      }
      if (options.endDate) {
        (query.timestamp as Record<string, Date>).$lte = options.endDate;
      }
    }

    const logs = await AuditLogModel.find(query).lean();

    const byEventType: Record<AuditEventType, number> = {} as Record<AuditEventType, number>;
    const byUser: Record<string, number> = {};
    const byResource: Record<string, number> = {};
    let allowedCount = 0;
    let deniedCount = 0;

    for (const log of logs) {
      byEventType[log.eventType] = (byEventType[log.eventType] || 0) + 1;
      byUser[log.context.userId] = (byUser[log.context.userId] || 0) + 1;
      byResource[log.context.resource] = (byResource[log.context.resource] || 0) + 1;

      if (log.decision.allowed) {
        allowedCount++;
      } else {
        deniedCount++;
      }
    }

    const timestamps = logs.map(l => l.timestamp.getTime());

    return {
      totalEvents: logs.length,
      allowedCount,
      deniedCount,
      byEventType,
      byUser,
      byResource,
      timeRange: {
        start: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date(),
        end: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date()
      }
    };
  }
}

export const mongoAuditStore = new MongoAuditStore();
