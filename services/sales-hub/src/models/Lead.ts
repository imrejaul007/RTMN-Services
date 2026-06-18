/**
 * Lead Model
 * Represents potential customers in the sales pipeline
 */

export interface Lead {
  id: string;
  // Core Information
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  title?: string;
  company: string;
  companySize?: CompanySize;
  industry?: string;
  website?: string;
  linkedIn?: string;

  // Lead Source
  source: LeadSource;
  sourceDetails?: string;
  campaignId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;

  // Status & Stage
  status: LeadStatus;
  stage: LeadStage;
  temperature: LeadTemperature;
  quality: LeadQuality;

  // Scoring
  score: LeadScore;
  scoreBreakdown: ScoreBreakdown;

  // Assignment
  assignedTo?: string;
  territory?: string;
  team?: string;

  // Trust & Reputation
  trustScore?: TrustScore;
  brandAffinity?: BrandAffinity;

  // Journey
  journeyStage: JourneyStage;
  touchpoints: Touchpoint[];
  lastActivity?: Date;
  nextFollowUp?: Date;

  // Qualification
  budget?: BudgetRange;
  authority?: AuthorityLevel;
  timeline?: PurchaseTimeline;
  painPoints: string[];

  // Enrichment Data
  enrichment?: LeadEnrichment;

  // Metadata
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  convertedAt?: Date;
  convertedToCustomerId?: string;
  convertedToDealId?: string;
}

export type LeadStatus =
  | 'new' | 'contacted' | 'qualified' | 'unqualified'
  | 'nurturing' | 'hot' | 'converted' | 'lost';

export type LeadStage =
  | 'initial' | 'engaged' | 'qualified'
  | 'proposal' | 'negotiation' | 'closed';

export type LeadTemperature = 'cold' | 'warm' | 'hot';

export type LeadQuality = 'low' | 'medium' | 'high' | 'premium';

export type LeadSource =
  | 'website' | 'referral' | 'linkedin' | 'cold_outreach'
  | 'event' | 'content' | 'paid_ads' | 'partner' | 'other';

export type CompanySize =
  | '1-10' | '11-50' | '51-200' | '201-500'
  | '501-1000' | '1001-5000' | '5000+';

export type AuthorityLevel =
  | 'individual' | 'manager' | 'director'
  | 'vp' | 'cxo' | 'owner';

export type PurchaseTimeline =
  | 'immediate' | '1_month' | '3_months'
  | '6_months' | '1_year' | 'exploring';

export type JourneyStage =
  | 'awareness' | 'consideration' | 'decision'
  | 'purchase' | 'retention' | 'advocacy';

export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
}

export interface LeadScore {
  total: number;
  grade: ScoreGrade;
  factors: ScoreFactors;
}

export type ScoreGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface ScoreFactors {
  engagement: number;
  technical: number;
  budget: number;
  authority: number;
  timing: number;
  trust: number;
  brand: number;
}

export interface ScoreBreakdown {
  baseScore: number;
  engagementBonus: number;
  technicalBonus: number;
  budgetBonus: number;
  authorityBonus: number;
  trustBonus: number;
  brandBonus: number;
  penalty: number;
  total: number;
}

export interface TrustScore {
  overall: number;
  financial: number;
  reputation: number;
  compliance: number;
  verification: VerificationStatus;
}

export type VerificationStatus = 'verified' | 'pending' | 'unverified' | 'failed';

export interface BrandAffinity {
  brandMentions: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  shareOfVoice: number;
  competitivePosition: string[];
}

export interface Touchpoint {
  id: string;
  type: TouchpointType;
  channel: string;
  timestamp: Date;
  duration?: number;
  outcome?: string;
  notes?: string;
  repId?: string;
  automated: boolean;
}

export type TouchpointType =
  | 'email_open' | 'email_click' | 'email_reply'
  | 'website_visit' | 'page_view' | 'content_download'
  | 'form_submit' | 'demo_request' | 'trial_signup'
  | 'call' | 'meeting' | 'linkedin_message'
  | 'webinar_attend' | 'event_attend' | 'chat';

export interface LeadEnrichment {
  company: CompanyEnrichment;
  technology?: TechnologyStack;
  funding?: FundingInfo;
  news?: CompanyNews[];
  social?: SocialProfiles;
  intent?: IntentData;
}

export interface CompanyEnrichment {
  description?: string;
  founded?: number;
  employees?: number;
  revenue?: string;
  headquarters?: string;
  locations?: string[];
  leadership?: Leader[];
  logo?: string;
  certifications?: string[];
}

export interface Leader {
  name: string;
  title: string;
  linkedIn?: string;
}

export interface TechnologyStack {
  hosting?: string[];
  analytics?: string[];
  marketing?: string[];
  sales?: string[];
  tools?: string[];
  crm?: string[];
}

export interface FundingInfo {
  totalRaised?: number;
  lastRound?: string;
  lastRoundAmount?: number;
  lastRoundDate?: Date;
  investors?: string[];
}

export interface CompanyNews {
  title: string;
  source: string;
  url: string;
  publishedAt: Date;
  summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface SocialProfiles {
  linkedIn?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export interface IntentData {
  topics: IntentTopic[];
  overallScore: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  lastUpdated: Date;
}

export interface IntentTopic {
  topic: string;
  score: number;
  trend: number;
}

// Lead Actions
export interface LeadAction {
  id: string;
  leadId: string;
  type: LeadActionType;
  performedBy: string;
  performedAt: Date;
  data: Record<string, any>;
  previousState?: Partial<Lead>;
  newState?: Partial<Lead>;
}

export type LeadActionType =
  | 'created' | 'updated' | 'assigned' | 'reassigned'
  | 'scored' | 'qualified' | 'unqualified' | 'nurtured'
  | 'contacted' | 'emailed' | 'called' | 'met'
  | 'converted' | 'lost' | 'merged' | 'split';

// Lead Filters
export interface LeadFilters {
  status?: LeadStatus[];
  stage?: LeadStage[];
  temperature?: LeadTemperature[];
  quality?: LeadQuality[];
  source?: LeadSource[];
  industry?: string[];
  companySize?: CompanySize[];
  assignedTo?: string[];
  territory?: string[];
  scoreMin?: number;
  scoreMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  lastActivityBefore?: Date;
  lastActivityAfter?: Date;
}

// Lead Search
export interface LeadSearchQuery {
  query?: string;
  filters?: LeadFilters;
  sort?: LeadSort;
  page?: number;
  limit?: number;
}

export interface LeadSort {
  field: keyof Lead;
  direction: 'asc' | 'desc';
}

// Lead Stats
export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  byStage: Record<LeadStage, number>;
  byTemperature: Record<LeadTemperature, number>;
  byQuality: Record<LeadQuality, number>;
  bySource: Record<LeadSource, number>;
  byIndustry: Record<string, number>;
  avgScore: number;
  avgAge: number;
  conversionRate: number;
}
