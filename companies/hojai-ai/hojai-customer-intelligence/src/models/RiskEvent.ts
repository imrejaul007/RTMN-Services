import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { RiskEvent } from '../types';

export interface IRiskEvent extends Document {
  eventId: string;
  customerId: string;
  eventType: RiskEvent['eventType'];
  severity: RiskEvent['severity'];
  details: Record<string, unknown>;
  source: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RiskEventSchema = new Schema<IRiskEvent>({
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: () => `RISK-${uuidv4().substring(0, 8).toUpperCase()}`
  },
  customerId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: [
      'fraud_attempt',
      'chargeback',
      'dispute',
      'refund',
      'suspicious_activity',
      'high_value_order',
      'policy_violation'
    ],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  details: {
    type: Schema.Types.Mixed,
    default: {}
  },
  source: {
    type: String,
    required: true
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedAt: Date,
  resolvedBy: String,
  resolution: String
}, {
  timestamps: true
});

// Compound indexes
RiskEventSchema.index({ customerId: 1, eventType: 1 });
RiskEventSchema.index({ customerId: 1, severity: 1 });
RiskEventSchema.index({ customerId: 1, resolved: 1 });
RiskEventSchema.index({ eventType: 1, severity: 1, createdAt: -1 });
RiskEventSchema.index({ resolved: 1, createdAt: -1 });

// Static methods
RiskEventSchema.statics.findByCustomerId = function(customerId: string) {
  return this.find({ customerId }).sort({ createdAt: -1 });
};

RiskEventSchema.statics.findUnresolvedByCustomer = function(customerId: string) {
  return this.find({ customerId, resolved: false }).sort({ severity: -1, createdAt: -1 });
};

RiskEventSchema.statics.findByEventType = function(eventType: string, limit = 100) {
  return this.find({ eventType })
    .sort({ createdAt: -1 })
    .limit(limit);
};

RiskEventSchema.statics.findBySeverity = function(severity: string, limit = 100) {
  return this.find({ severity })
    .sort({ createdAt: -1 })
    .limit(limit);
};

RiskEventSchema.statics.getRecentHighSeverityEvents = function(hours = 24, limit = 100) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    createdAt: { $gte: since },
    severity: { $in: ['high', 'critical'] }
  }).sort({ severity: -1, createdAt: -1 }).limit(limit);
};

RiskEventSchema.statics.createEvent = async function(
  customerId: string,
  eventType: RiskEvent['eventType'],
  severity: RiskEvent['severity'],
  details: Record<string, unknown>,
  source: string
): Promise<IRiskEvent> {
  const event = new this({
    customerId,
    eventType,
    severity,
    details,
    source
  });

  return event.save();
};

RiskEventSchema.statics.resolveEvent = async function(
  eventId: string,
  resolvedBy: string,
  resolution: string
): Promise<IRiskEvent | null> {
  const event = await this.findById(eventId);
  if (!event) return null;

  event.resolved = true;
  event.resolvedAt = new Date();
  event.resolvedBy = resolvedBy;
  event.resolution = resolution;

  return event.save();
};

RiskEventSchema.statics.getCustomerRiskHistory = function(customerId: string) {
  return this.aggregate([
    { $match: { customerId } },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        unresolved: {
          $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] }
        },
        critical: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        },
        high: {
          $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
        },
        lastEvent: { $max: '$createdAt' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

RiskEventSchema.statics.getRiskTrend = function(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          severity: '$severity'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);
};

export const RiskEvent = mongoose.model<IRiskEvent>('RiskEvent', RiskEventSchema);
