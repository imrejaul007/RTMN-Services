import mongoose, { Schema, Document } from 'mongoose';
import { ICampaign, ITargetAudience, ICampaignMetrics, IContentSuggestion, IABTestRecommendation, IROIPrediction } from '../types';

export interface ICampaignDocument extends Omit<ICampaign, 'targetAudience' | 'metrics' | 'suggestedContent' | 'abTestRecommendations' | 'roiPrediction'>, Document {
  targetAudience: ITargetAudience;
  metrics?: ICampaignMetrics;
  suggestedContent: IContentSuggestion[];
  abTestRecommendations: IABTestRecommendation[];
  roiPrediction?: IROIPrediction;
}

const AudienceSegmentSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  size: { type: Number, required: true },
  characteristics: [{ type: String }],
  engagementScore: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  preferredChannels: [{ type: String }],
  preferredContentTypes: [{ type: String }],
  avgOrderValue: { type: Number },
  churnRisk: { type: String, enum: ['low', 'medium', 'high'] }
}, { _id: false });

const TargetAudienceSchema = new Schema({
  segments: [AudienceSegmentSchema],
  demographics: {
    ageRange: {
      min: Number,
      max: Number
    },
    gender: [String],
    location: [String],
    income: {
      min: Number,
      max: Number
    }
  },
  interests: [String],
  behaviors: [String],
  customAttributes: { type: Schema.Types.Mixed }
}, { _id: false });

const KPITargetSchema = new Schema({
  name: { type: String, required: true },
  target: { type: Number, required: true },
  current: { type: Number, default: 0 },
  unit: { type: String, required: true }
}, { _id: false });

const CampaignMetricsSchema = new Schema({
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  roas: { type: Number, default: 0 },
  engagement: { type: Number, default: 0 }
}, { _id: false });

const ContentSuggestionSchema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['blog', 'social', 'email', 'video', 'ad', 'landing_page'],
    required: true
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  targetSegment: { type: String, required: true },
  recommendedChannels: [{ type: String }],
  hashtags: [String],
  callToAction: { type: String, required: true },
  estimatedReach: { type: Number, default: 0 },
  engagementPrediction: { type: Number, default: 0 }
}, { _id: false });

const ABTestRecommendationSchema = new Schema({
  id: { type: String, required: true },
  element: {
    type: String,
    enum: ['subject_line', 'headline', 'cta', 'image', 'copy', 'timing'],
    required: true
  },
  variantA: { type: String, required: true },
  variantB: { type: String, required: true },
  hypothesis: { type: String, required: true },
  expectedLift: { type: Number, required: true },
  confidence: { type: Number, required: true },
  sampleSize: { type: Number, required: true },
  duration: { type: Number, required: true }
}, { _id: false });

const ROIPredictionSchema = new Schema({
  predictedRevenue: { type: Number, required: true },
  predictedCost: { type: Number, required: true },
  predictedROI: { type: Number, required: true },
  confidenceInterval: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  breakEvenPoint: { type: Number, required: true },
  paybackPeriod: { type: Number, required: true },
  assumptions: [{ type: String }]
}, { _id: false });

const CampaignSchema = new Schema({
  name: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['email', 'social', 'ppc', 'content', 'influencer', 'seo'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'draft',
    index: true
  },
  budget: { type: Number, required: true },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date },
  targetAudience: { type: TargetAudienceSchema, required: true },
  channels: [{ type: String }],
  objectives: [{ type: String }],
  kpis: [KPITargetSchema],
  metrics: { type: CampaignMetricsSchema },
  suggestedContent: [ContentSuggestionSchema],
  abTestRecommendations: [ABTestRecommendationSchema],
  roiPrediction: { type: ROIPredictionSchema }
}, {
  timestamps: true
});

// Indexes for common queries
CampaignSchema.index({ status: 1, startDate: 1 });
CampaignSchema.index({ type: 1, status: 1 });
CampaignSchema.index({ 'metrics.roas': -1 });

export const Campaign = mongoose.model<ICampaignDocument>('Campaign', CampaignSchema);
