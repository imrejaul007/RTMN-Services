import mongoose, { Document, Schema } from 'mongoose';

export interface ICampaign extends Document {
  campaignId: string;
  brandId: string;
  name: string;
  description?: string;
  hashtags: string[];
  keywords: string[];
  platforms: Array<'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'news' | 'all'>;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  scheduledStart: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  targets: {
    reach?: number;
    impressions?: number;
    engagement?: number;
    mentions?: number;
    sentiment?: number;
  };
  performance: {
    reach: number;
    impressions: number;
    engagement: number;
    mentions: number;
    sentiment: {
      score: number;
      positive: number;
      neutral: number;
      negative: number;
    };
    roi?: number;
  };
  milestones: Array<{
    name: string;
    targetDate: Date;
    actualDate?: Date;
    metrics: Record<string, number>;
  }>;
  competitorMentioned: string[];
  trending: {
    direction: 'rising' | 'falling' | 'stable';
    velocity: number;
  };
  alerts: Array<{
    type: 'crisis' | 'opportunity' | 'milestone' | 'competitor';
    message: string;
    severity: 'info' | 'warning' | 'critical';
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    campaignId: { type: String, required: true, unique: true, index: true },
    brandId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    hashtags: [String],
    keywords: { type: [String], required: true },
    platforms: [{
      type: String,
      enum: ['twitter', 'facebook', 'instagram', 'linkedin', 'news', 'all']
    }],
    status: {
      type: String,
      enum: ['planning', 'active', 'paused', 'completed', 'cancelled'],
      default: 'planning'
    },
    scheduledStart: { type: Date, required: true },
    scheduledEnd: Date,
    actualStart: Date,
    actualEnd: Date,
    targets: {
      reach: Number,
      impressions: Number,
      engagement: Number,
      mentions: Number,
      sentiment: Number
    },
    performance: {
      reach: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      mentions: { type: Number, default: 0 },
      sentiment: {
        score: { type: Number, default: 0 },
        positive: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 },
        negative: { type: Number, default: 0 }
      },
      roi: Number
    },
    milestones: [{
      name: String,
      targetDate: Date,
      actualDate: Date,
      metrics: { type: Map, of: Number }
    }],
    competitorMentioned: [String],
    trending: {
      direction: { type: String, enum: ['rising', 'falling', 'stable'], default: 'stable' },
      velocity: { type: Number, default: 0 }
    },
    alerts: [{
      type: {
        type: String,
        enum: ['crisis', 'opportunity', 'milestone', 'competitor']
      },
      message: String,
      severity: {
        type: String,
        enum: ['info', 'warning', 'critical']
      },
      timestamp: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

// Indexes
CampaignSchema.index({ brandId: 1, status: 1 });
CampaignSchema.index({ brandId: 1, scheduledStart: -1 });
CampaignSchema.index({ 'hashtags': 1 });
CampaignSchema.index({ 'competitorMentioned': 1 });

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
