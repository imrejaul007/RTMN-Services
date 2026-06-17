import mongoose, { Schema, Document } from 'mongoose';

export interface IMetric extends Document {
  tenantId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  totals: {
    totalRevenueSaved: number;
    totalRevenueProtected: number;
    totalRevenueCost: number;
    totalCustomersRetained: number;
    totalCustomersChurned: number;
    totalUpsellsGenerated: number;
    totalUpsellAmount: number;
    totalReferralsCreated: number;
    totalRisksIdentified: number;
    totalOutcomesTracked: number;
  };
  averages: {
    avgCsatImprovement: number;
    avgResolutionTime: number;
    avgRevenuePerTicket: number;
  };
  trends: {
    revenueSavedTrend: number;
    retentionRate: number;
    upsellConversionRate: number;
  };
  calculatedAt: Date;
}

const TotalsSchema = new Schema({
  totalRevenueSaved: { type: Number, default: 0 },
  totalRevenueProtected: { type: Number, default: 0 },
  totalRevenueCost: { type: Number, default: 0 },
  totalCustomersRetained: { type: Number, default: 0 },
  totalCustomersChurned: { type: Number, default: 0 },
  totalUpsellsGenerated: { type: Number, default: 0 },
  totalUpsellAmount: { type: Number, default: 0 },
  totalReferralsCreated: { type: Number, default: 0 },
  totalRisksIdentified: { type: Number, default: 0 },
  totalOutcomesTracked: { type: Number, default: 0 }
}, { _id: false });

const AveragesSchema = new Schema({
  avgCsatImprovement: { type: Number, default: 0 },
  avgResolutionTime: { type: Number, default: 0 },
  avgRevenuePerTicket: { type: Number, default: 0 }
}, { _id: false });

const TrendsSchema = new Schema({
  revenueSavedTrend: { type: Number, default: 0 },
  retentionRate: { type: Number, default: 0 },
  upsellConversionRate: { type: Number, default: 0 }
}, { _id: false });

const MetricSchema = new Schema<IMetric>({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  totals: {
    type: TotalsSchema,
    default: () => ({
      totalRevenueSaved: 0,
      totalRevenueProtected: 0,
      totalRevenueCost: 0,
      totalCustomersRetained: 0,
      totalCustomersChurned: 0,
      totalUpsellsGenerated: 0,
      totalUpsellAmount: 0,
      totalReferralsCreated: 0,
      totalRisksIdentified: 0,
      totalOutcomesTracked: 0
    })
  },
  averages: {
    type: AveragesSchema,
    default: () => ({
      avgCsatImprovement: 0,
      avgResolutionTime: 0,
      avgRevenuePerTicket: 0
    })
  },
  trends: {
    type: TrendsSchema,
    default: () => ({
      revenueSavedTrend: 0,
      retentionRate: 0,
      upsellConversionRate: 0
    })
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes
MetricSchema.index({ tenantId: 1, period: 1, date: -1 });
MetricSchema.index({ tenantId: 1, date: 1 }, { unique: true });

// Unique constraint for tenant + period + date combination
MetricSchema.index(
  { tenantId: 1, period: 1, date: 1 },
  { unique: true }
);

export const Metric = mongoose.model<IMetric>('Metric', MetricSchema);
