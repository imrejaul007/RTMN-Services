import mongoose, { Schema, Document } from 'mongoose';
import {
  EntityType,
  RiskFlagType,
  FlagSeverity,
  FlagStatus,
  FlagEvidence,
} from '../types';

export interface IRiskFlag extends Document {
  entityId: string;
  entityType: EntityType;
  tenantId: string;
  type: RiskFlagType;
  severity: FlagSeverity;
  status: FlagStatus;
  score: number;
  description: string;
  evidence: FlagEvidence[];
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  escalatedTo?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const FlagEvidenceSchema = new Schema<FlagEvidence>(
  {
    type: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, required: true },
    source: { type: String, required: true },
  },
  { _id: false }
);

const RiskFlagSchema = new Schema<IRiskFlag>(
  {
    entityId: { type: String, required: true, index: true },
    entityType: {
      type: String,
      required: true,
      enum: ['customer', 'merchant', 'agent', 'vendor', 'partner', 'device'],
      index: true,
    },
    tenantId: { type: String, required: true, default: 'default', index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'suspicious_transaction',
        'unusual_pattern',
        'address_mismatch',
        'velocity_exceeded',
        'geo_anomaly',
        'device_mismatch',
        'identity_discrepancy',
        'fraud_report',
        'chargeback',
        'policy_violation',
        'compliance_risk',
        'link_to_flagged',
      ],
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'resolved', 'dismissed', 'escalated'],
      default: 'active',
      index: true,
    },
    score: { type: Number, required: true, default: 50, min: 0, max: 100 },
    description: { type: String, required: true },
    evidence: { type: [FlagEvidenceSchema], required: true, default: [] },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
    resolution: { type: String },
    escalatedTo: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'risk_flags',
  }
);

// Compound indexes
RiskFlagSchema.index({ entityId: 1, entityType: 1, tenantId: 1 });
RiskFlagSchema.index({ tenantId: 1, status: 1, severity: 1 });
RiskFlagSchema.index({ tenantId: 1, type: 1, status: 1 });
RiskFlagSchema.index({ entityId: 1, type: 1 }, { unique: true, sparse: true });

// Severity score mapping
const severityScores: Record<FlagSeverity, number> = {
  low: 10,
  medium: 25,
  high: 50,
  critical: 75,
};

// Pre-save hook to calculate score from severity
RiskFlagSchema.pre('save', function (next) {
  if (this.isModified('severity') || !this.score) {
    this.score = severityScores[this.severity];
  }
  next();
});

// Methods
RiskFlagSchema.methods.resolve = function (
  resolvedBy: string,
  resolution: string
) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolution = resolution;
};

RiskFlagSchema.methods.dismiss = function (resolvedBy: string) {
  this.status = 'dismissed';
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
};

RiskFlagSchema.methods.escalate = function (escalateTo: string) {
  this.status = 'escalated';
  this.escalatedTo = escalateTo;
};

RiskFlagSchema.methods.addEvidence = function (evidence: FlagEvidence) {
  this.evidence.push(evidence);
};

// Static methods
RiskFlagSchema.statics.findActiveForEntity = function (
  entityId: string,
  tenantId: string
) {
  return this.find({
    entityId,
    tenantId,
    status: 'active',
  });
};

RiskFlagSchema.statics.findCriticalFlags = function (tenantId: string) {
  return this.find({
    tenantId,
    status: 'active',
    severity: 'critical',
  });
};

RiskFlagSchema.statics.findByType = function (
  type: RiskFlagType,
  tenantId: string,
  status?: FlagStatus
) {
  const query: any = { tenantId, type };
  if (status) query.status = status;
  return this.find(query);
};

RiskFlagSchema.statics.getFlagStats = async function (tenantId: string) {
  const stats = await this.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: {
          status: '$status',
          severity: '$severity',
        },
        count: { $sum: 1 },
      },
    },
  ]);
  return stats;
};

export const RiskFlagModel = mongoose.model<IRiskFlag>('RiskFlag', RiskFlagSchema);

export default RiskFlagModel;
