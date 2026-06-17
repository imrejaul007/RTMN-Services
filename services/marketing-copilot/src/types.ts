import { Document } from 'mongoose';

// Campaign Interfaces
export interface ICampaign {
  name: string;
  type: 'email' | 'social' | 'ppc' | 'content' | 'influencer' | 'seo';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  budget: number;
  startDate: Date;
  endDate?: Date;
  targetAudience: ITargetAudience;
  channels: string[];
  objectives: string[];
  kpis: IKPITarget[];
  metrics?: ICampaignMetrics;
  suggestedContent?: IContentSuggestion[];
  abTestRecommendations?: IABTestRecommendation[];
  roiPrediction?: IROIPrediction;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITargetAudience {
  segments: IAudienceSegment[];
  demographics?: {
    ageRange?: { min: number; max: number };
    gender?: string[];
    location?: string[];
    income?: { min: number; max: number };
  };
  interests?: string[];
  behaviors?: string[];
  customAttributes?: Record<string, any>;
}

export interface IAudienceSegment {
  id: string;
  name: string;
  description: string;
  size: number;
  characteristics: string[];
  engagementScore: number;
  conversionRate: number;
  preferredChannels: string[];
  preferredContentTypes: string[];
  avgOrderValue?: number;
  churnRisk?: 'low' | 'medium' | 'high';
}

export interface IKPITarget {
  name: string;
  target: number;
  current: number;
  unit: string;
}

export interface ICampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  ctr: number;
  conversionRate: number;
  roas: number;
  engagement: number;
}

export interface IContentSuggestion {
  id: string;
  type: 'blog' | 'social' | 'email' | 'video' | 'ad' | 'landing_page';
  title: string;
  description: string;
  content: string;
  targetSegment: string;
  recommendedChannels: string[];
  hashtags?: string[];
  callToAction: string;
  estimatedReach: number;
  engagementPrediction: number;
}

export interface IABTestRecommendation {
  id: string;
  element: 'subject_line' | 'headline' | 'cta' | 'image' | 'copy' | 'timing';
  variantA: string;
  variantB: string;
  hypothesis: string;
  expectedLift: number;
  confidence: number;
  sampleSize: number;
  duration: number;
}

export interface IROIPrediction {
  predictedRevenue: number;
  predictedCost: number;
  predictedROI: number;
  confidenceInterval: { min: number; max: number };
  breakEvenPoint: number;
  paybackPeriod: number;
  assumptions: string[];
}

// Content Interfaces
export interface IContent {
  title: string;
  type: 'blog' | 'social' | 'email' | 'video' | 'ad' | 'landing_page' | 'newsletter' | 'case_study';
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
  body: string;
  summary?: string;
  targetAudience: string[];
  channels: string[];
  seoKeywords: string[];
  metaDescription?: string;
  featuredImage?: string;
  createdBy: string;
  variations?: IContentVariation[];
  performance?: IContentPerformance;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContentVariation {
  id: string;
  name: string;
  content: string;
  element: string;
  testResult?: {
    impressions: number;
    clicks: number;
    conversions: number;
    winner: boolean;
  };
}

export interface IContentPerformance {
  views: number;
  uniqueViews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  shares: number;
  comments: number;
  conversions: number;
  engagementScore: number;
}

// Marketing Insights Interfaces
export interface IMarketingInsight {
  type: 'trend' | 'opportunity' | 'threat' | 'recommendation' | 'anomaly';
  category: 'content' | 'audience' | 'channel' | 'competitor' | 'market';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  evidence: string[];
  recommendations: string[];
  actionable: boolean;
  timestamp: Date;
}

export interface IChannelPerformance {
  channel: string;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    cost: number;
    revenue: number;
    roas: number;
  };
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  topPerformers: string[];
}

export interface ICustomerJourney {
  segmentId: string;
  touchpoints: {
    channel: string;
    interaction: string;
    timestamp: Date;
    conversionPotential: number;
  }[];
  conversionPath: string[];
  dropOffPoints: string[];
  optimizationSuggestions: string[];
}

// API Request/Response Types
export interface IGenerateContentRequest {
  topic: string;
  type: IContent['type'];
  targetAudience: string[];
  channels: string[];
  tone?: 'professional' | 'casual' | 'humorous' | 'inspirational' | 'educational';
  length?: 'short' | 'medium' | 'long';
  keywords?: string[];
  includeSEO?: boolean;
}

export interface IContentGenerationResponse {
  content: IContentSuggestion;
  alternatives?: IContentSuggestion[];
  seoSuggestions?: {
    keywords: string[];
    metaDescription: string;
    headlines: string[];
  };
}

export interface ISegmentAnalysisResponse {
  segments: IAudienceSegment[];
  totalAddressableMarket: number;
  segmentDistribution: { segmentId: string; percentage: number }[];
  insights: IMarketingInsight[];
}

export interface ICampaignOptimizationResponse {
  campaignId: string;
  currentMetrics: ICampaignMetrics;
  predictions: IROIPrediction;
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: number;
    implementation: string;
  }[];
  abTests: IABTestRecommendation[];
  budgetReallocation?: {
    from: string;
    to: string;
    amount: number;
    rationale: string;
  }[];
}

export interface IInsightsResponse {
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSpend: number;
    totalRevenue: number;
    overallROI: number;
  };
  topPerforming: {
    campaigns: { id: string; name: string; roas: number }[];
    channels: { channel: string; roas: number }[];
    contentTypes: { type: string; engagement: number }[];
  };
  trends: IMarketingInsight[];
  opportunities: IMarketingInsight[];
  warnings: IMarketingInsight[];
  channelPerformance: IChannelPerformance[];
}
