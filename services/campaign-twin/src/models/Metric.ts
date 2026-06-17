import mongoose, { Document, Schema } from 'mongoose';

// Metric data point interface
export interface IMetricDataPoint {
  timestamp: Date;
  value: number;
  source?: string;
}

// Daily metrics summary interface
export interface IDailyMetrics extends Document {
  metricId: string;
  campaignId: string;
  tenantId: string;
  date: Date;
  metrics: {
    impressions: number;
    clicks: number;
    leads: number;
    conversions: number;
    revenue: number;
    spend: number;
    ctr?: number;
    conversionRate?: number;
    cpc?: number;
    cpa?: number;
    roas?: number;
  };
  channelMetrics?: {
    channel: string;
    impressions: number;
    clicks: number;
    spend: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// Metric data point schema (for time-series data)
const MetricDataPointSchema = new Schema<IMetricDataPoint>({
  timestamp: { type: Date, required: true },
  value: { type: Number, required: true },
  source: { type: String }
}, { _id: false });

// Channel metrics breakdown schema
const ChannelMetricsSchema = new Schema({
  channel: { type: String, required: true },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  spend: { type: Number, default: 0 }
}, { _id: false });

// Daily metrics schema
const DailyMetricsSchema = new Schema<IDailyMetrics>({
  metricId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  campaignId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    ctr: { type: Number },
    conversionRate: { type: Number },
    cpc: { type: Number },
    cpa: { type: Number },
    roas: { type: Number }
  },
  channelMetrics: [ChannelMetricsSchema]
}, {
  timestamps: true
});

// Compound indexes
DailyMetricsSchema.index({ campaignId: 1, date: 1 });
DailyMetricsSchema.index({ tenantId: 1, date: 1 });
DailyMetricsSchema.index({ campaignId: 1, 'metrics.date': 1 });

// Pre-save to calculate derived metrics
DailyMetricsSchema.pre('save', function(next) {
  const m = this.metrics;

  if (m.impressions > 0 && m.clicks > 0) {
    m.ctr = (m.clicks / m.impressions) * 100;
  }
  if (m.clicks > 0 && m.conversions > 0) {
    m.conversionRate = (m.conversions / m.clicks) * 100;
  }
  if (m.clicks > 0 && m.spend > 0) {
    m.cpc = m.spend / m.clicks;
  }
  if (m.conversions > 0 && m.spend > 0) {
    m.cpa = m.spend / m.conversions;
  }
  if (m.spend > 0 && m.revenue > 0) {
    m.roas = m.revenue / m.spend;
  }

  next();
});

export const DailyMetrics = mongoose.model<IDailyMetrics>('DailyMetrics', DailyMetricsSchema);

// Aggregated metrics summary for quick lookups
export interface IMetricsSummary extends Document {
  summaryId: string;
  campaignId: string;
  tenantId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totals: {
    impressions: number;
    clicks: number;
    leads: number;
    conversions: number;
    revenue: number;
    spend: number;
  };
  averages: {
    ctr: number;
    conversionRate: number;
    cpc: number;
    cpa: number;
    roas: number;
  };
  bestChannel?: string;
  worstChannel?: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

const MetricsSummarySchema = new Schema<IMetricsSummary>({
  summaryId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  campaignId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totals: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    spend: { type: Number, default: 0 }
  },
  averages: {
    ctr: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    cpa: { type: Number, default: 0 },
    roas: { type: Number, default: 0 }
  },
  bestChannel: String,
  worstChannel: String,
  trend: {
    type: String,
    enum: ['up', 'down', 'stable'],
    default: 'stable'
  },
  trendPercentage: Number
}, {
  timestamps: true
});

MetricsSummarySchema.index({ campaignId: 1, period: 1, startDate: 1 });
MetricsSummarySchema.index({ tenantId: 1, period: 1 });

export const MetricsSummary = mongoose.model<IMetricsSummary>('MetricsSummary', MetricsSummarySchema);
