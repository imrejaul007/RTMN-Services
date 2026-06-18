/**
 * SalesHub Unified Data Models
 * Central data structures for sales orchestration
 */

export interface SalesHubConfig {
  id: string;
  organizationId: string;
  name: string;
  settings: SalesHubSettings;
  integrations: IntegrationConfig[];
  territories: Territory[];
  teamMembers: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SalesHubSettings {
  autoLeadAssignment: boolean;
  autoScoring: boolean;
  aiRecommendationsEnabled: boolean;
  trustScoreEnabled: boolean;
  journeyTrackingEnabled: boolean;
  scoringWeights: ScoringWeights;
  notificationPreferences: NotificationPreferences;
}

export interface ScoringWeights {
  engagement: number;
  technical: number;
  budget: number;
  authority: number;
  trustScore: number;
  brandAffinity: number;
}

export interface NotificationPreferences {
  email: boolean;
  slack: boolean;
  sms: boolean;
  inApp: boolean;
}

export interface IntegrationConfig {
  service: string;
  url: string;
  apiKey?: string;
  enabled: boolean;
  syncInterval: number;
  lastSync?: Date;
}

export interface Territory {
  id: string;
  name: string;
  region: string;
  countries: string[];
  states?: string[];
  cities?: string[];
  zipCodes?: string[];
  assignedReps: string[];
  quotas: TerritoryQuota;
  isActive: boolean;
}

export interface TerritoryQuota {
  monthlyRevenue: number;
  quarterlyRevenue: number;
  annualRevenue: number;
  leadTarget: number;
  conversionRate: number;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: SalesRole;
  territories: string[];
  quotas: RepQuota;
  skills: string[];
  certifications: string[];
  performance: RepPerformance;
  isActive: boolean;
}

export type SalesRole = 'admin' | 'manager' | 'senior_rep' | 'rep' | 'bdr' | 'sdr';

export interface RepQuota {
  monthly: QuotaTarget;
  quarterly: QuotaTarget;
  annual: QuotaTarget;
}

export interface QuotaTarget {
  revenue: number;
  deals: number;
  calls: number;
  meetings: number;
  leads: number;
}

export interface RepPerformance {
  currentMonth: PerformanceMetrics;
  currentQuarter: PerformanceMetrics;
  currentYear: PerformanceMetrics;
  lifetime: LifetimeMetrics;
}

export interface PerformanceMetrics {
  revenue: number;
  deals: number;
  conversions: number;
  calls: number;
  meetings: number;
  leads: number;
  avgDealSize: number;
  winRate: number;
  quotaAttainment: number;
}

export interface LifetimeMetrics extends PerformanceMetrics {
  totalRevenue: number;
  totalDeals: number;
  avgCustomerLTV: number;
}

// Sales Pipeline Models
export interface SalesPipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  metrics: PipelineMetrics;
  createdAt: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  avgDaysInStage: number;
  requirements?: string[];
}

export interface PipelineMetrics {
  totalValue: number;
  weightedValue: number;
  dealCount: number;
  avgDealSize: number;
  avgCycleTime: number;
  conversionRate: number;
  byStage: StageMetrics[];
}

export interface StageMetrics {
  stageId: string;
  stageName: string;
  dealCount: number;
  totalValue: number;
  avgDaysInStage: number;
}

// Sales Activity Models
export interface SalesActivity {
  id: string;
  type: ActivityType;
  entityType: 'lead' | 'deal' | 'customer';
  entityId: string;
  repId: string;
  details: ActivityDetails;
  timestamp: Date;
}

export type ActivityType =
  | 'call' | 'email' | 'meeting' | 'demo'
  | 'proposal' | 'negotiation' | 'contract'
  | 'note' | 'task' | 'follow_up';

export interface ActivityDetails {
  subject?: string;
  description?: string;
  duration?: number;
  outcome?: string;
  nextSteps?: string;
  participants?: string[];
  attachments?: string[];
}

// Sales Forecasting
export interface SalesForecast {
  id: string;
  period: ForecastPeriod;
  territory?: string;
  repId?: string;
  predictions: ForecastPrediction;
  actuals?: ForecastActuals;
  confidence: number;
  generatedAt: Date;
}

export type ForecastPeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface ForecastPrediction {
  revenue: number;
  deals: number;
  newCustomers: number;
  expansion: number;
  churnRisk: number;
  pipelineCoverage: number;
}

export interface ForecastActuals {
  revenue: number;
  deals: number;
  newCustomers: number;
}

// Sales Analytics
export interface SalesAnalytics {
  overview: AnalyticsOverview;
  pipeline: PipelineMetrics;
  teamPerformance: TeamPerformanceMetrics;
  conversion: ConversionMetrics;
  trends: TrendData[];
}

export interface AnalyticsOverview {
  totalRevenue: number;
  totalDeals: number;
  totalLeads: number;
  totalCustomers: number;
  avgDealSize: number;
  avgSalesCycle: number;
  winRate: number;
  YoYGrowth: number;
  MoMGrowth: number;
}

export interface TeamPerformanceMetrics {
  topPerformers: RepPerformance[];
  teamAvgDealSize: number;
  teamWinRate: number;
  teamQuotaAttainment: number;
  avgCycleTime: number;
}

export interface ConversionMetrics {
  leadToOpportunity: number;
  opportunityToProposal: number;
  proposalToNegotiation: number;
  negotiationToClose: number;
  overall: number;
  bySource: Record<string, number>;
  byIndustry: Record<string, number>;
}

export interface TrendData {
  date: Date;
  revenue: number;
  deals: number;
  leads: number;
  conversions: number;
}

// Campaign Models
export interface SalesCampaign {
  id: string;
  name: string;
  type: CampaignType;
  target: CampaignTarget;
  budget: number;
  spent: number;
  startDate: Date;
  endDate: Date;
  status: CampaignStatus;
  metrics: CampaignMetrics;
}

export type CampaignType = 'email' | 'social' | 'content' | 'event' | 'paid' | 'multi_channel';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface CampaignTarget {
  segments: string[];
  industries: string[];
  companySizes: string[];
  locations: string[];
  expectedResponses: number;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  revenue: number;
  ROI: number;
}
