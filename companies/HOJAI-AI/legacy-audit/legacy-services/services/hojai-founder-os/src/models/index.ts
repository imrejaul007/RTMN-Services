/**
 * HOJAI FounderOS - MongoDB Models
 * Company Building Tools and AI-Powered Executive Briefings
 */

import mongoose, { Schema, Document } from 'mongoose';
import { FundraisingStage, BriefingType, HiringStatus, HiringPriority, SeniorityLevel } from '../types/index.js';

// ============================================================================
// BUSINESS MODEL CANVAS
// ============================================================================

export interface IBusinessModel extends Document {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  segments: {
    keyPartners: string[];
    keyActivities: string[];
    keyResources: string[];
    valuePropositions: string[];
    customerRelationships: string[];
    channels: string[];
    customerSegments: string[];
    costStructure: string[];
    revenueStreams: string[];
  };
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessModelSchema = new Schema<IBusinessModel>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  segments: {
    keyPartners: { type: [String], default: [] },
    keyActivities: { type: [String], default: [] },
    keyResources: { type: [String], default: [] },
    valuePropositions: { type: [String], default: [] },
    customerRelationships: { type: [String], default: [] },
    channels: { type: [String], default: [] },
    customerSegments: { type: [String], default: [] },
    costStructure: { type: [String], default: [] },
    revenueStreams: { type: [String], default: [] }
  },
  createdBy: { type: String }
}, { timestamps: true });

BusinessModelSchema.index({ tenantId: 1, id: 1 }, { unique: true });
BusinessModelSchema.index({ tenantId: 1, name: 1 });

export const BusinessModelModel = mongoose.model<IBusinessModel>('BusinessModel', BusinessModelSchema);

// ============================================================================
// GTM STRATEGY
// ============================================================================

export interface IGTMStrategy extends Document {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  targetMarket?: string;
  strategy: {
    targetSegments: string[];
    positioning?: string;
    channels: string[];
    pricingModel?: string;
    goLiveDate?: Date;
    milestones: Array<{
      id: string;
      title: string;
      description?: string;
      targetDate?: Date;
      status: 'pending' | 'in_progress' | 'completed' | 'delayed';
    }>;
  };
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GTMMilestoneSchema = new Schema({
  id: String,
  title: String,
  description: String,
  targetDate: Date,
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'delayed'], default: 'pending' }
}, { _id: false });

const GTMStrategySchema = new Schema<IGTMStrategy>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  targetMarket: { type: String },
  strategy: {
    targetSegments: { type: [String], default: [] },
    positioning: { type: String },
    channels: { type: [String], default: [] },
    pricingModel: { type: String },
    goLiveDate: { type: Date },
    milestones: { type: [GTMMilestoneSchema], default: [] }
  },
  createdBy: { type: String }
}, { timestamps: true });

GTMStrategySchema.index({ tenantId: 1, id: 1 }, { unique: true });
GTMStrategySchema.index({ tenantId: 1, name: 1 });

export const GTMStrategyModel = mongoose.model<IGTMStrategy>('GTMStrategy', GTMStrategySchema);

// ============================================================================
// FUNDRAISING PLAN
// ============================================================================

export interface IFundraisingPlan extends Document {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  stage: FundraisingStage;
  targetAmount?: number;
  currency: string;
  targetDate?: Date;
  valuation?: number;
  raisedAmount: number;
  pitchDeck?: string;
  investors: Array<{
    name: string;
    type?: string;
    contact?: string;
    status: 'contacted' | 'meeting_scheduled' | 'interested' | 'passed' | 'committed';
  }>;
  milestones: Array<{
    id: string;
    title: string;
    description?: string;
    targetDate?: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  }>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FundraisingMilestoneSchema = new Schema({
  id: String,
  title: String,
  description: String,
  targetDate: Date,
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'delayed'], default: 'pending' }
}, { _id: false });

const InvestorSchema = new Schema({
  name: String,
  type: String,
  contact: String,
  status: { type: String, enum: ['contacted', 'meeting_scheduled', 'interested', 'passed', 'committed'], default: 'contacted' }
}, { _id: false });

const FundraisingPlanSchema = new Schema<IFundraisingPlan>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  stage: { type: String, enum: ['pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'ipo'], required: true },
  targetAmount: { type: Number },
  currency: { type: String, default: 'USD' },
  targetDate: { type: Date },
  valuation: { type: Number },
  raisedAmount: { type: Number, default: 0 },
  pitchDeck: { type: String },
  investors: { type: [InvestorSchema], default: [] },
  milestones: { type: [FundraisingMilestoneSchema], default: [] },
  createdBy: { type: String }
}, { timestamps: true });

FundraisingPlanSchema.index({ tenantId: 1, id: 1 }, { unique: true });
FundraisingPlanSchema.index({ tenantId: 1, stage: 1 });
FundraisingPlanSchema.index({ tenantId: 1, name: 1 });

export const FundraisingPlanModel = mongoose.model<IFundraisingPlan>('FundraisingPlan', FundraisingPlanSchema);

// ============================================================================
// HIRING PLAN
// ============================================================================

export interface IHiringPlan extends Document {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  timeline: {
    startDate?: Date;
    endDate?: Date;
    quarters: string[];
  };
  roles: Array<{
    id: string;
    title: string;
    department: string;
    seniority: SeniorityLevel;
    location?: string;
    remote: boolean;
    salary?: number;
    priority: HiringPriority;
    status: HiringStatus;
    targetStartDate?: Date;
    description?: string;
  }>;
  totalBudget: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HiringRoleSchema = new Schema({
  id: String,
  title: String,
  department: String,
  seniority: { type: String, enum: ['intern', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'vp', 'c_level'] },
  location: String,
  remote: { type: Boolean, default: true },
  salary: Number,
  priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_progress', 'filled', 'cancelled'], default: 'open' },
  targetStartDate: Date,
  description: String
}, { _id: false });

const HiringPlanSchema = new Schema<IHiringPlan>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  timeline: {
    startDate: Date,
    endDate: Date,
    quarters: { type: [String], default: [] }
  },
  roles: { type: [HiringRoleSchema], default: [] },
  totalBudget: { type: Number, default: 0 },
  createdBy: { type: String }
}, { timestamps: true });

HiringPlanSchema.index({ tenantId: 1, id: 1 }, { unique: true });
HiringPlanSchema.index({ tenantId: 1, name: 1 });

export const HiringPlanModel = mongoose.model<IHiringPlan>('HiringPlan', HiringPlanSchema);

// ============================================================================
// MARKET ANALYSIS
// ============================================================================

export interface IMarketAnalysis extends Document {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  marketSize?: {
    value?: number;
    currency: string;
    unit?: string;
  };
  tam?: number;
  sam?: number;
  som?: number;
  trends: Array<{
    id: string;
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  competitors: Array<{
    id: string;
    name: string;
    marketShare?: number;
    strengths: string[];
    weaknesses: string[];
    website?: string;
  }>;
  opportunities: string[];
  threats: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrendSchema = new Schema({
  id: String,
  title: String,
  description: String,
  impact: { type: String, enum: ['positive', 'negative', 'neutral'], default: 'neutral' }
}, { _id: false });

const CompetitorSchema = new Schema({
  id: String,
  name: String,
  marketShare: Number,
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  website: String
}, { _id: false });

const MarketAnalysisSchema = new Schema<IMarketAnalysis>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  marketSize: {
    value: Number,
    currency: { type: String, default: 'USD' },
    unit: String
  },
  tam: { type: Number },
  sam: { type: Number },
  som: { type: Number },
  trends: { type: [TrendSchema], default: [] },
  competitors: { type: [CompetitorSchema], default: [] },
  opportunities: { type: [String], default: [] },
  threats: { type: [String], default: [] },
  createdBy: { type: String }
}, { timestamps: true });

MarketAnalysisSchema.index({ tenantId: 1, id: 1 }, { unique: true });
MarketAnalysisSchema.index({ tenantId: 1, name: 1 });

export const MarketAnalysisModel = mongoose.model<IMarketAnalysis>('MarketAnalysis', MarketAnalysisSchema);

// ============================================================================
// FOUNDER BRIEFING
// ============================================================================

export interface IFounderBriefing extends Document {
  id: string;
  tenantId: string;
  type: BriefingType;
  date: Date;
  period: {
    start: Date;
    end: Date;
  };
  content: {
    overview: string;
    priorities: Array<{
      id: string;
      title: string;
      description?: string;
      weight: number;
    }>;
    risks: Array<{
      id: string;
      title: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      mitigation?: string;
    }>;
    opportunities: Array<{
      id: string;
      title: string;
      description?: string;
      potential: 'low' | 'medium' | 'high';
    }>;
    metrics: Array<{
      name: string;
      value: string | number;
      change?: number;
      unit?: string;
      trend?: 'up' | 'down' | 'stable';
    }>;
    recommendations: string[];
  };
  generatedAt: Date;
  generatedBy?: string;
}

const BriefingPrioritySchema = new Schema({
  id: String,
  title: String,
  description: String,
  weight: { type: Number, default: 1 }
}, { _id: false });

const BriefingRiskSchema = new Schema({
  id: String,
  title: String,
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  mitigation: String
}, { _id: false });

const BriefingOpportunitySchema = new Schema({
  id: String,
  title: String,
  description: String,
  potential: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, { _id: false });

const BriefingMetricSchema = new Schema({
  name: String,
  value: Schema.Types.Mixed,
  change: Number,
  unit: String,
  trend: { type: String, enum: ['up', 'down', 'stable'] }
}, { _id: false });

const FounderBriefingSchema = new Schema<IFounderBriefing>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['daily', 'weekly', 'board', 'investor'], required: true },
  date: { type: Date, required: true },
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  content: {
    overview: { type: String, default: '' },
    priorities: { type: [BriefingPrioritySchema], default: [] },
    risks: { type: [BriefingRiskSchema], default: [] },
    opportunities: { type: [BriefingOpportunitySchema], default: [] },
    metrics: { type: [BriefingMetricSchema], default: [] },
    recommendations: { type: [String], default: [] }
  },
  generatedAt: { type: Date, required: true },
  generatedBy: { type: String }
}, { timestamps: true });

FounderBriefingSchema.index({ tenantId: 1, id: 1 }, { unique: true });
FounderBriefingSchema.index({ tenantId: 1, type: 1, date: -1 });

export const FounderBriefingModel = mongoose.model<IFounderBriefing>('FounderBriefing', FounderBriefingSchema);

// ============================================================================
// BRIEFING TEMPLATE
// ============================================================================

export interface IBriefingTemplate extends Document {
  id: string;
  tenantId: string;
  type: BriefingType;
  name: string;
  description?: string;
  sections: Array<{
    id: string;
    name: string;
    description?: string;
    order: number;
    required: boolean;
    prompts: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSectionSchema = new Schema({
  id: String,
  name: String,
  description: String,
  order: { type: Number, default: 0 },
  required: { type: Boolean, default: true },
  prompts: { type: [String], default: [] }
}, { _id: false });

const BriefingTemplateSchema = new Schema<IBriefingTemplate>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['daily', 'weekly', 'board', 'investor'], required: true },
  name: { type: String, required: true },
  description: { type: String },
  sections: { type: [TemplateSectionSchema], default: [] }
}, { timestamps: true });

BriefingTemplateSchema.index({ tenantId: 1, id: 1 }, { unique: true });
BriefingTemplateSchema.index({ tenantId: 1, type: 1 });

export const BriefingTemplateModel = mongoose.model<IBriefingTemplate>('BriefingTemplate', BriefingTemplateSchema);

// ============================================================================
// EXPORTS
// ============================================================================

export const models = {
  BusinessModel: BusinessModelModel,
  GTMStrategy: GTMStrategyModel,
  FundraisingPlan: FundraisingPlanModel,
  HiringPlan: HiringPlanModel,
  MarketAnalysis: MarketAnalysisModel,
  FounderBriefing: FounderBriefingModel,
  BriefingTemplate: BriefingTemplateModel
};

export default models;
