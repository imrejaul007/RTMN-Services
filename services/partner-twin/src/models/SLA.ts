import mongoose, { Document, Schema } from 'mongoose';

// SLA Status
export type SLAStatus = 'active' | 'breached' | 'at_risk' | 'paused' | 'terminated';

// SLA Metric Types
export type SLAMetricType =
  | 'uptime'
  | 'response_time'
  | 'resolution_time'
  | 'delivery_time'
  | 'quality_score'
  | 'accuracy'
  | 'availability'
  | 'custom';

// SLA Priority
export type SLAPriority = 'critical' | 'high' | 'medium' | 'low';

// SLA Threshold
export interface ISLAThreshold {
  operator: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
  value: number;
  unit?: string;
}

// SLA Metric Definition
export interface ISLAMetricDefinition {
  name: string;
  type: SLAMetricType;
  description: string;
  target: ISLAThreshold;
  warning?: ISLAThreshold; // Warning threshold before breach
  weight: number; // Weight in overall SLA calculation (0-100)
  measurementPeriod: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'per_incident';
  dataSource?: string; // Where to get data from
}

// SLA Metric Actual
export interface ISLAMetricActual {
  metricName: string;
  currentValue: number;
  unit?: string;
  lastUpdated: Date;
  dataPoints: {
    timestamp: Date;
    value: number;
  }[];
}

// SLA Breach Record
export interface ISLABreach {
  breachId: string;
  metricName: string;
  expectedValue: number;
  actualValue: number;
  severity: 'minor' | 'major' | 'critical';
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  resolved: boolean;
  resolutionNotes?: string;
  penalty?: {
    type: 'refund' | 'credit' | 'fee';
    amount: number;
    currency: string;
  };
}

// SLA Review
export interface ISLAReview {
  reviewId: string;
  periodStart: Date;
  periodEnd: Date;
  overallCompliance: number; // percentage
  metrics: {
    metricName: string;
    target: number;
    actual: number;
    compliance: boolean;
  }[];
  creditsIssued?: number;
  reviewedBy?: string;
  reviewedAt?: Date;
}

// Interface for SLA Document
export interface ISLA extends Document {
  // Core Identification
  slaId: string;
  contractId?: string;
  partnerId: string;
  tenantId: string;

  // SLA Details
  name: string;
  description?: string;
  status: SLAStatus;
  priority: SLAPriority;

  // Duration
  effectiveDate: Date;
  expirationDate?: Date;

  // Metrics
  metrics: ISLAMetricDefinition[];
  actuals: ISLAMetricActual[];

  // Overall Compliance
  overallCompliance: number; // percentage (0-100)
  lastCalculatedAt?: Date;

  // Breaches
  breaches: ISLABreach[];
  totalBreaches: number;
  openBreaches: number;

  // Reviews
  reviews: ISLAReview[];
  lastReviewDate?: Date;
  nextReviewDate?: Date;

  // Penalties & Credits
  totalCredits?: number;
  totalPenalties?: number;
  currency: string;

  // Metadata
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;

  // Soft delete
  isDeleted?: boolean;
  deletedAt?: Date;
}

// SLA Schema
const SLASchema = new Schema<ISLA>(
  {
    slaId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    contractId: {
      type: String,
      index: true,
    },
    partnerId: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    status: {
      type: String,
      enum: ['active', 'breached', 'at_risk', 'paused', 'terminated'],
      default: 'active',
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },

    effectiveDate: {
      type: Date,
      required: true,
    },
    expirationDate: Date,

    metrics: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          enum: [
            'uptime',
            'response_time',
            'resolution_time',
            'delivery_time',
            'quality_score',
            'accuracy',
            'availability',
            'custom',
          ],
          required: true,
        },
        description: String,
        target: {
          operator: { type: String, enum: ['gte', 'lte', 'eq', 'gt', 'lt'], required: true },
          value: { type: Number, required: true },
          unit: String,
        },
        warning: {
          operator: { type: String, enum: ['gte', 'lte', 'eq', 'gt', 'lt'] },
          value: Number,
          unit: String,
        },
        weight: { type: Number, default: 1 },
        measurementPeriod: {
          type: String,
          enum: ['hourly', 'daily', 'weekly', 'monthly', 'per_incident'],
          default: 'monthly',
        },
        dataSource: String,
      },
    ],

    actuals: [
      {
        metricName: { type: String, required: true },
        currentValue: { type: Number, required: true },
        unit: String,
        lastUpdated: Date,
        dataPoints: [
          {
            timestamp: Date,
            value: Number,
          },
        ],
      },
    ],

    overallCompliance: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    lastCalculatedAt: Date,

    breaches: [
      {
        breachId: String,
        metricName: String,
        expectedValue: Number,
        actualValue: Number,
        severity: { type: String, enum: ['minor', 'major', 'critical'] },
        startTime: Date,
        endTime: Date,
        duration: Number,
        resolved: { type: Boolean, default: false },
        resolutionNotes: String,
        penalty: {
          type: { type: String, enum: ['refund', 'credit', 'fee'] },
          amount: Number,
          currency: String,
        },
      },
    ],
    totalBreaches: { type: Number, default: 0 },
    openBreaches: { type: Number, default: 0 },

    reviews: [
      {
        reviewId: String,
        periodStart: Date,
        periodEnd: Date,
        overallCompliance: Number,
        metrics: [
          {
            metricName: String,
            target: Number,
            actual: Number,
            compliance: Boolean,
          },
        ],
        creditsIssued: Number,
        reviewedBy: String,
        reviewedAt: Date,
      },
    ],
    lastReviewDate: Date,
    nextReviewDate: Date,

    totalCredits: { type: Number, default: 0 },
    totalPenalties: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },

    notes: String,
    tags: [String],
    metadata: Schema.Types.Mixed,

    createdBy: String,
    updatedBy: String,

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
SLASchema.index({ slaId: 1, tenantId: 1 });
SLASchema.index({ partnerId: 1, tenantId: 1 });
SLASchema.index({ contractId: 1, tenantId: 1 });
SLASchema.index({ tenantId: 1, status: 1 });
SLASchema.index({ overallCompliance: 1 });
SLASchema.index({ isDeleted: 1 });

// Virtual for SLA health status
SLASchema.virtual('healthStatus').get(function () {
  if (this.openBreaches > 0) return 'critical';
  if (this.overallCompliance < 95) return 'at_risk';
  return 'healthy';
});

// Export
export const SLA = mongoose.model<ISLA>('SLA', SLASchema);
export default SLA;
