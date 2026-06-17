import mongoose, { Document, Schema } from 'mongoose';

// Channel budget schema
export interface IChannelBudget {
  channel: string;
  budget: number;
  spent: number;
  currency?: string;
}

// Campaign metrics schema
export interface ICampaignMetrics {
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  ctr?: number;        // Click-through rate
  conversionRate?: number;
  costPerClick?: number;
  costPerConversion?: number;
}

// ROI schema
export interface IROIMetrics {
  calculated: boolean;
  value: number;
  cost?: number;
  revenue?: number;
}

// Campaign document interface
export interface ICampaign extends Document {
  campaignId: string;
  tenantId: string;
  name: string;
  description?: string;
  objective: 'awareness' | 'consideration' | 'conversion' | 'retention';
  type: 'email' | 'sms' | 'social' | 'ads' | 'seo' | 'content' | 'influencer';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  channels: IChannelBudget[];
  startDate: Date;
  endDate: Date;
  targetAudience?: {
    demographics?: Record<string, any>;
    interests?: string[];
    locations?: string[];
  };
  metrics: ICampaignMetrics;
  roi: IROIMetrics;
  tags?: string[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Channel budget schema
const ChannelBudgetSchema = new Schema<IChannelBudget>({
  channel: { type: String, required: true },
  budget: { type: Number, required: true, default: 0 },
  spent: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' }
}, { _id: false });

// Campaign metrics schema
const CampaignMetricsSchema = new Schema<ICampaignMetrics>({
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  leads: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  costPerClick: { type: Number, default: 0 },
  costPerConversion: { type: Number, default: 0 }
}, { _id: false });

// ROI schema
const ROIMetricsSchema = new Schema<IROIMetrics>({
  calculated: { type: Boolean, default: false },
  value: { type: Number, default: 0 },
  cost: { type: Number },
  revenue: { type: Number }
}, { _id: false });

// Target audience schema
const TargetAudienceSchema = new Schema({
  demographics: { type: Schema.Types.Mixed },
  interests: [{ type: String }],
  locations: [{ type: String }]
}, { _id: false });

// Main campaign schema
const CampaignSchema = new Schema<ICampaign>({
  campaignId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  objective: {
    type: String,
    enum: ['awareness', 'consideration', 'conversion', 'retention'],
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'social', 'ads', 'seo', 'content', 'influencer'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft',
    index: true
  },
  channels: [ChannelBudgetSchema],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  targetAudience: TargetAudienceSchema,
  metrics: {
    type: CampaignMetricsSchema,
    default: () => ({
      impressions: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      revenue: 0
    })
  },
  roi: {
    type: ROIMetricsSchema,
    default: () => ({
      calculated: false,
      value: 0
    })
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdBy: String,
  updatedBy: String
}, {
  timestamps: true
});

// Compound indexes
CampaignSchema.index({ tenantId: 1, status: 1 });
CampaignSchema.index({ tenantId: 1, type: 1 });
CampaignSchema.index({ startDate: 1, endDate: 1 });

// Pre-save hook to calculate ROI
CampaignSchema.pre('save', function(next) {
  if (this.isModified('metrics') || this.isModified('channels')) {
    const totalSpent = this.channels.reduce((sum: number, ch: IChannelBudget) => sum + ch.spent, 0);
    const revenue = this.metrics.revenue;

    this.roi.cost = totalSpent;
    this.roi.revenue = revenue;
    this.roi.calculated = true;

    if (totalSpent > 0) {
      this.roi.value = ((revenue - totalSpent) / totalSpent) * 100;
    } else {
      this.roi.value = 0;
    }

    // Calculate derived metrics
    if (this.metrics.impressions > 0) {
      this.metrics.ctr = (this.metrics.clicks / this.metrics.impressions) * 100;
    }
    if (this.metrics.clicks > 0) {
      this.metrics.costPerClick = totalSpent / this.metrics.clicks;
    }
    if (this.metrics.conversions > 0) {
      this.metrics.conversionRate = (this.metrics.conversions / this.metrics.clicks) * 100;
      this.metrics.costPerConversion = totalSpent / this.metrics.conversions;
    }
  }
  next();
});

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
