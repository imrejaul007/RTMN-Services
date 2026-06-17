import { Document } from 'mongoose';

// Lead Types
export interface ILead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  title?: string;
  industry?: string;
  companySize?: string;
  revenue?: number;
  score: number;
  stage: LeadStage;
  source: string;
  owner?: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
  nextFollowUp?: Date;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export enum LeadStage {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

// Conversation Types
export interface IConversation extends Document {
  leadId: string;
  type: ConversationType;
  content: string;
  talkingPoints?: string[];
  sentiment?: Sentiment;
  keyInsights?: string[];
  followUpTasks?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum ConversationType {
  EMAIL = 'email',
  CALL = 'call',
  MEETING = 'meeting',
  CHAT = 'chat',
  DEMO = 'demo'
}

export enum Sentiment {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative'
}

// Recommendation Types
export interface IRecommendation extends Document {
  leadId: string;
  type: RecommendationType;
  priority: number;
  title: string;
  description: string;
  action: string;
  reasoning?: string;
  confidence?: number;
  status: RecommendationStatus;
  createdAt: Date;
  completedAt?: Date;
}

export enum RecommendationType {
  NEXT_BEST_ACTION = 'next_best_action',
  TALKING_POINTS = 'talking_points',
  EMAIL_TEMPLATE = 'email_template',
  COMPETITIVE_INSIGHT = 'competitive_insight',
  PRICING_SUGGESTION = 'pricing_suggestion',
  TIMING_SUGGESTION = 'timing_suggestion'
}

export enum RecommendationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COMPLETED = 'completed'
}

// Talking Points
export interface TalkingPoint {
  id: string;
  category: string;
  title: string;
  content: string;
  relevance?: number;
  objections?: string[];
  successIndicators?: string[];
}

// Prioritization
export interface PrioritizedLead extends ILead {
  priorityScore: number;
  priorityFactors: {
    factor: string;
    weight: number;
    score: number;
  }[];
  recommendedAction: string;
}

// Email Generation
export interface EmailRequest {
  leadId: string;
  templateType: EmailTemplateType;
  context?: string;
  tone?: 'formal' | 'casual' | 'aggressive' | 'friendly';
  goal?: string;
}

export enum EmailTemplateType {
  INTRODUCTORY = 'introductory',
  FOLLOW_UP = 'follow_up',
  PROPOSAL = 'proposal',
  DISCOVERY = 'discovery',
  RE_ENGAGEMENT = 're_engagement',
  CUSTOM = 'custom'
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  preview: string;
  callToAction?: string;
}

// Forecast
export interface ForecastRequest {
  period: ForecastPeriod;
  deals: ForecastDeal[];
}

export enum ForecastPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly'
}

export interface ForecastDeal {
  leadId: string;
  companyName: string;
  amount: number;
  stage: LeadStage;
  closeDate: Date;
  probability: number;
}

export interface SalesForecast {
  period: ForecastPeriod;
  totalRevenue: number;
  weightedRevenue: number;
  dealCount: number;
  averageDealSize: number;
  confidence: number;
  breakdown: ForecastBreakdown[];
  trends: ForecastTrend[];
  recommendations: string[];
}

export interface ForecastBreakdown {
  stage: LeadStage;
  count: number;
  amount: number;
  percentage: number;
}

export interface ForecastTrend {
  date: string;
  predicted: number;
  actual?: number;
}

// Competitive Insights
export interface CompetitiveInsight {
  competitor: string;
  strengths: string[];
  weaknesses: string[];
  talkingPoints: string[];
  suggestedResponses: string[];
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
