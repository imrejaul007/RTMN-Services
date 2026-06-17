import mongoose, { Document, Schema } from 'mongoose';

// Performance Period
export type PerformancePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// Performance Status
export type PerformanceStatus = 'on_track' | 'at_risk' | 'below_target' | 'exceeded';

// Performance Category
export type PerformanceCategory =
  | 'delivery'
  | 'quality'
  | 'responsiveness'
  | 'cost'
  | 'compliance'
  | 'innovation'
  | 'general';

// KPI Definition
export interface IKPI {
  name: string;
  description?: string;
  target: number;
  actual?: number;
  unit?: string;
  weight: number; // Weight in category (0-100)
  trend?: 'improving' | 'stable' | 'declining';
}

// Category Score
export interface ICategoryScore {
  category: PerformanceCategory;
  score: number; // 0-100
  weight: number; // Weight in overall (0-100)
  kpis: IKPI[];
}

// Performance Period Record
export interface IPerformanceRecord {
  period: PerformancePeriod;
  periodStart: Date;
  periodEnd: Date;
  overallScore: number;
  categoryScores: ICategoryScore[];
  status: PerformanceStatus;
  notes?: string;
}

// Delivery Metrics
export interface IDeliveryMetrics {
  onTimeDeliveryRate: number; // percentage
  averageDeliveryTime: number; // in hours
  deliveryAccuracy: number; // percentage
  fulfillmentRate: number; // percentage
  backorderRate: number; // percentage
  totalOrders: number;
  fulfilledOrders: number;
  lateOrders: number;
  cancelledOrders: number;
}

// Quality Metrics
export interface IQualityMetrics {
  qualityScore: number; // 0-100
  defectRate: number; // percentage
  returnRate: number; // percentage
  customerComplaints: number;
  firstPassYield: number; // percentage
  inspectionPassRate: number; // percentage
}

// Responsiveness Metrics
export interface IResponsivenessMetrics {
  averageResponseTime: number; // in minutes
  firstResponseTime: number; // in minutes
  resolutionTime: number; // in hours
  escalationRate: number; // percentage
  communicationQuality: number; // 0-100
  availabilityRate: number; // percentage
}

// Cost Metrics
export interface ICostMetrics {
  averageUnitCost: number;
  costEfficiency: number; // 0-100
  priceCompetitiveness: number; // 0-100
  totalSpend: number;
  savingsGenerated: number;
  costVariance: number; // percentage
}

// Compliance Metrics
export interface IComplianceMetrics {
  complianceRate: number; // percentage
  regulatoryCompliance: number; // 0-100
  documentationAccuracy: number; // 0-100
  auditScore: number; // 0-100
  certifications: string[];
}

// Incident Record
export interface IIncident {
  incidentId: string;
  type: 'delay' | 'quality_issue' | 'compliance_breach' | 'service_failure' | 'other';
  severity: 'minor' | 'major' | 'critical';
  description: string;
  reportedAt: Date;
  resolvedAt?: Date;
  resolutionTime?: number; // minutes
  impact: {
    ordersAffected?: number;
    financialImpact?: number;
    reputationalImpact?: number;
  };
  resolved: boolean;
  resolutionNotes?: string;
}

// Interface for Performance Document
export interface IPerformance extends Document {
  // Core Identification
  performanceId: string;
  partnerId: string;
  tenantId: string;

  // Period
  period: PerformancePeriod;
  periodStart: Date;
  periodEnd: Date;
  isCurrent: boolean;

  // Overall Score (0-100)
  overallScore: number;
  previousScore?: number;
  trend: 'improving' | 'stable' | 'declining';

  // Status
  status: PerformanceStatus;
  riskLevel: 'low' | 'medium' | 'high';

  // Category Scores
  deliveryMetrics: IDeliveryMetrics;
  qualityMetrics: IQualityMetrics;
  responsivenessMetrics: IResponsivenessMetrics;
  costMetrics: ICostMetrics;
  complianceMetrics: IComplianceMetrics;

  // Records
  records: IPerformanceRecord[];
  incidents: IIncident[];

  // Totals for Period
  totalOrders?: number;
  totalRevenue?: number;
  totalIncidents: number;
  resolvedIncidents: number;

  // SLA Compliance
  slaCompliance: number; // percentage

  // Customer Feedback
  customerSatisfaction?: number; // 0-100
  netPromoterScore?: number; // -100 to 100

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  calculatedAt?: Date;

  // Soft delete
  isDeleted?: boolean;
  deletedAt?: Date;
}

// Performance Schema
const PerformanceSchema = new Schema<IPerformance>(
  {
    performanceId: {
      type: String,
      required: true,
      unique: true,
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

    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      required: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },

    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    previousScore: Number,
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable',
    },

    status: {
      type: String,
      enum: ['on_track', 'at_risk', 'below_target', 'exceeded'],
      default: 'on_track',
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },

    deliveryMetrics: {
      onTimeDeliveryRate: { type: Number, default: 0 },
      averageDeliveryTime: { type: Number, default: 0 },
      deliveryAccuracy: { type: Number, default: 0 },
      fulfillmentRate: { type: Number, default: 0 },
      backorderRate: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      fulfilledOrders: { type: Number, default: 0 },
      lateOrders: { type: Number, default: 0 },
      cancelledOrders: { type: Number, default: 0 },
    },
    qualityMetrics: {
      qualityScore: { type: Number, default: 0 },
      defectRate: { type: Number, default: 0 },
      returnRate: { type: Number, default: 0 },
      customerComplaints: { type: Number, default: 0 },
      firstPassYield: { type: Number, default: 0 },
      inspectionPassRate: { type: Number, default: 0 },
    },
    responsivenessMetrics: {
      averageResponseTime: { type: Number, default: 0 },
      firstResponseTime: { type: Number, default: 0 },
      resolutionTime: { type: Number, default: 0 },
      escalationRate: { type: Number, default: 0 },
      communicationQuality: { type: Number, default: 0 },
      availabilityRate: { type: Number, default: 0 },
    },
    costMetrics: {
      averageUnitCost: { type: Number, default: 0 },
      costEfficiency: { type: Number, default: 0 },
      priceCompetitiveness: { type: Number, default: 0 },
      totalSpend: { type: Number, default: 0 },
      savingsGenerated: { type: Number, default: 0 },
      costVariance: { type: Number, default: 0 },
    },
    complianceMetrics: {
      complianceRate: { type: Number, default: 0 },
      regulatoryCompliance: { type: Number, default: 0 },
      documentationAccuracy: { type: Number, default: 0 },
      auditScore: { type: Number, default: 0 },
      certifications: [String],
    },

    records: [
      {
        period: String,
        periodStart: Date,
        periodEnd: Date,
        overallScore: Number,
        categoryScores: [
          {
            category: String,
            score: Number,
            weight: Number,
            kpis: [
              {
                name: String,
                description: String,
                target: Number,
                actual: Number,
                unit: String,
                weight: Number,
                trend: String,
              },
            ],
          },
        ],
        status: String,
        notes: String,
      },
    ],

    incidents: [
      {
        incidentId: String,
        type: {
          type: String,
          enum: ['delay', 'quality_issue', 'compliance_breach', 'service_failure', 'other'],
        },
        severity: { type: String, enum: ['minor', 'major', 'critical'] },
        description: String,
        reportedAt: Date,
        resolvedAt: Date,
        resolutionTime: Number,
        impact: {
          ordersAffected: Number,
          financialImpact: Number,
          reputationalImpact: Number,
        },
        resolved: { type: Boolean, default: false },
        resolutionNotes: String,
      },
    ],

    totalOrders: Number,
    totalRevenue: Number,
    totalIncidents: { type: Number, default: 0 },
    resolvedIncidents: { type: Number, default: 0 },

    slaCompliance: { type: Number, default: 100 },
    customerSatisfaction: Number,
    netPromoterScore: Number,

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
PerformanceSchema.index({ performanceId: 1, tenantId: 1 });
PerformanceSchema.index({ partnerId: 1, tenantId: 1 });
PerformanceSchema.index({ tenantId: 1, period: 1, isCurrent: 1 });
PerformanceSchema.index({ periodStart: 1, periodEnd: 1 });
PerformanceSchema.index({ overallScore: 1 });
PerformanceSchema.index({ isDeleted: 1 });

// Virtual for incident resolution rate
PerformanceSchema.virtual('incidentResolutionRate').get(function () {
  if (this.totalIncidents === 0) return 100;
  return (this.resolvedIncidents / this.totalIncidents) * 100;
});

// Export
export const Performance = mongoose.model<IPerformance>('Performance', PerformanceSchema);
export default Performance;
