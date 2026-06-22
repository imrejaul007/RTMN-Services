import mongoose, { Document, Schema } from 'mongoose';
import { IAuditLog, AuditEventType } from '../types';

export interface AuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const AuditLogSchema = new Schema<AuditLogDocument>({
  eventType: {
    type: String,
    enum: Object.values(AuditEventType),
    required: true,
    index: true
  },
  serviceId: {
    type: String,
    index: true
  },
  secretName: {
    type: String,
    index: true
  },
  policyId: {
    type: String,
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  success: {
    type: Boolean,
    required: true,
    index: true
  },
  errorMessage: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  collection: 'audit_logs'
});

// Compound indexes for common queries
AuditLogSchema.index({ secretName: 1, eventType: 1, timestamp: -1 });
AuditLogSchema.index({ serviceId: 1, eventType: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1, eventType: 1 });
AuditLogSchema.index({ success: 1, timestamp: -1 });

// TTL index for automatic cleanup
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days retention

// Static methods for querying
AuditLogSchema.statics.findBySecret = function(secretName: string, limit = 100) {
  return this.find({ secretName })
    .sort({ timestamp: -1 })
    .limit(limit);
};

AuditLogSchema.statics.findByService = function(serviceId: string, limit = 100) {
  return this.find({ serviceId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

AuditLogSchema.statics.findByEventType = function(eventType: AuditEventType, startDate?: Date, endDate?: Date) {
  const query: Record<string, unknown> = { eventType };
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) (query.timestamp as Record<string, Date>).$gte = startDate;
    if (endDate) (query.timestamp as Record<string, Date>).$lte = endDate;
  }
  return this.find(query).sort({ timestamp: -1 });
};

AuditLogSchema.statics.findFailures = function(since: Date, limit = 100) {
  return this.find({
    success: false,
    timestamp: { $gte: since }
  })
    .sort({ timestamp: -1 })
    .limit(limit);
};

AuditLogSchema.statics.getAccessStats = function(startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          eventType: '$eventType',
          success: '$success'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.eventType',
        total: { $sum: '$count' },
        successful: {
          $sum: {
            $cond: [{ $eq: ['$_id.success', true] }, '$count', 0]
          }
        },
        failed: {
          $sum: {
            $cond: [{ $eq: ['$_id.success', false] }, '$count', 0]
          }
        }
      }
    },
    {
      $sort: { total: -1 }
    }
  ]);
};

AuditLogSchema.statics.getMostAccessedSecrets = function(startDate: Date, endDate: Date, limit = 10) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        secretName: { $exists: true, $ne: null },
        eventType: { $in: [AuditEventType.SECRET_READ, AuditEventType.SECRET_ACCESSED] }
      }
    },
    {
      $group: {
        _id: '$secretName',
        accessCount: { $sum: 1 },
        lastAccessed: { $max: '$timestamp' },
        uniqueServices: { $addToSet: '$serviceId' }
      }
    },
    {
      $sort: { accessCount: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        secretName: '$_id',
        accessCount: 1,
        lastAccessed: 1,
        uniqueServiceCount: { $size: '$uniqueServices' },
        _id: 0
      }
    }
  ]);
};

// Create a log entry helper
AuditLogSchema.statics.log = async function(
  eventType: AuditEventType,
  options: {
    serviceId?: string;
    secretName?: string;
    policyId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
  }
): Promise<AuditLogDocument> {
  return this.create({
    eventType,
    ...options,
    timestamp: new Date()
  });
}

export const AuditLog = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);
