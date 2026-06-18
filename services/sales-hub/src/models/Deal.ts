/**
 * Deal Model
 * Represents sales opportunities in progress
 */

export interface Deal {
  id: string;
  // Basic Info
  name: string;
  description?: string;
  reference?: string;

  // Value
  value: DealValue;
  currency: string;

  // Parties
  customer: CustomerReference;
  customerId: string;
  contact: ContactReference;
  contactId: string;

  // Deal Details
  type: DealType;
  category?: string;
  industry: string;

  // Stage & Status
  stage: DealStage;
  status: DealStatus;
  probability: number;

  // Pipeline
  pipelineId: string;
  pipelineName: string;
  stageOrder: number;

  // Assignment
  ownerId: string;
  ownerName: string;
  team?: string;
  territory?: string;

  // Timeline
  expectedCloseDate: Date;
  actualCloseDate?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Lifecycle
  leadId?: string;
  customerIdLinked?: string;
  previousDeals?: string[];

  // Financial
  margin?: number;
  discount?: number;
  paymentTerms?: string;

  // Products/Services
  lineItems: LineItem[];

  // Stakeholders
  stakeholders: Stakeholder[];

  // Activities
  activities: DealActivity[];
  nextStep?: string;
  lastActivityAt?: Date;

  // Scoring
  dealScore?: number;
  competitiveAnalysis?: CompetitiveAnalysis;

  // Trust & Risk
  trustScore?: TrustScoreData;
  riskIndicators: RiskIndicator[];

  // Forecasting
  forecastCategory: ForecastCategory;
  forecastConfidence: number;

  // Organization
  organizationId: string;

  // Metadata
  tags: string[];
  notes?: string;
  attachments?: string[];
  customFields?: Record<string, any>;
}

export type DealType =
  | 'new_business' | 'expansion' | 'renewal'
  | 'upgrade' | 'downgrade' | 'churn_risk';

export type DealStage =
  | 'prospecting' | 'qualification' | 'needs_analysis'
  | 'proposal' | 'negotiation' | 'closing'
  | 'won' | 'lost';

export type DealStatus = 'open' | 'won' | 'lost' | 'abandoned';

export type ForecastCategory = 'pipeline' | 'best_case' | 'commit' | 'closed';

export interface DealValue {
  amount: number;
  minAmount?: number;
  maxAmount?: number;
}

export interface CustomerReference {
  id: string;
  name: string;
  company: string;
  industry?: string;
}

export interface ContactReference {
  id: string;
  name: string;
  email: string;
  title?: string;
  phone?: string;
}

export interface LineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  total: number;
  description?: string;
  recurring?: RecurringDetails;
}

export interface RecurringDetails {
  frequency: 'monthly' | 'quarterly' | 'annually';
  startDate: Date;
  endDate?: Date;
  billingCycle: number;
}

export interface Stakeholder {
  id: string;
  name: string;
  title: string;
  email: string;
  role: StakeholderRole;
  influence: InfluenceLevel;
  engagement: EngagementLevel;
  isDecisionMaker: boolean;
  linkedIn?: string;
  notes?: string;
}

export type StakeholderRole =
  | 'champion' | 'decision_maker' | 'influencer'
  | 'user' | 'economic_buyer' | 'technical_buyer'
  | 'legal' | 'coach';

export type InfluenceLevel = 'low' | 'medium' | 'high';
export type EngagementLevel = 'none' | 'low' | 'medium' | 'high';

export interface DealActivity {
  id: string;
  type: ActivityType;
  description: string;
  performedBy: string;
  performedAt: Date;
  duration?: number;
  outcome?: string;
  attendees?: string[];
  nextStep?: string;
}

export type ActivityType =
  | 'call' | 'email' | 'meeting' | 'demo'
  | 'proposal_sent' | 'negotiation' | 'contract_sent'
  | 'presentation' | 'site_visit' | 'trial'
  | 'note' | 'task' | 'stage_change';

export interface CompetitiveAnalysis {
  competitors: CompetitorInfo[];
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  winProbability: number;
}

export interface CompetitorInfo {
  name: string;
  isCurrent: boolean;
  strengths: string[];
  weaknesses: string[];
  pricing?: string;
  marketShare?: number;
}

export interface TrustScoreData {
  overall: number;
  components: {
    financial: number;
    legal: number;
    operational: number;
  };
  lastUpdated: Date;
  verified: boolean;
}

export interface RiskIndicator {
  type: RiskType;
  severity: RiskSeverity;
  description: string;
  detectedAt: Date;
  mitigatedAt?: Date;
  mitigation?: string;
}

export type RiskType =
  | 'budget' | 'timeline' | 'competition'
  | 'technical' | 'stakeholder' | 'political'
  | 'economic' | 'compliance' | 'resource';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

// Deal Actions
export interface DealAction {
  id: string;
  dealId: string;
  type: DealActionType;
  performedBy: string;
  performedAt: Date;
  data: Record<string, any>;
  previousStage?: DealStage;
  newStage?: DealStage;
}

export type DealActionType =
  | 'created' | 'updated' | 'stage_changed' | 'assigned'
  | 'value_changed' | 'contact_added' | 'stakeholder_added'
  | 'activity_logged' | 'proposal_sent' | 'won' | 'lost';

// Deal Filters
export interface DealFilters {
  status?: DealStatus[];
  stage?: DealStage[];
  type?: DealType[];
  ownerId?: string[];
  territory?: string[];
  pipelineId?: string[];
  forecastCategory?: ForecastCategory[];
  riskLevel?: RiskSeverity[];
  valueMin?: number;
  valueMax?: number;
  expectedCloseBefore?: Date;
  expectedCloseAfter?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  tags?: string[];
}

// Deal Stats
export interface DealStats {
  total: number;
  totalValue: number;
  weightedValue: number;
  byStatus: Record<DealStatus, { count: number; value: number }>;
  byStage: Record<DealStage, { count: number; value: number }>;
  byType: Record<DealType, { count: number; value: number }>;
  byOwner: Record<string, { count: number; value: number }>;
  byIndustry: Record<string, { count: number; value: number }>;
  avgDealSize: number;
  medianDealSize: number;
  avgCycleTime: number;
  winRate: number;
  avgProbability: number;
  pipelineVelocity: number;
}

// Deal Report
export interface DealReport {
  period: ReportPeriod;
  startDate: Date;
  endDate: Date;
  summary: {
    dealsCreated: number;
    dealsWon: number;
    dealsLost: number;
    revenue: number;
    pipelineValue: number;
    avgDealSize: number;
    winRate: number;
    avgCycleTime: number;
  };
  byStage: StageReport[];
  byOwner: OwnerReport[];
  trends: TrendPoint[];
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface StageReport {
  stage: DealStage;
  count: number;
  value: number;
  avgDaysInStage: number;
  exitsToWon: number;
  exitsToLost: number;
}

export interface OwnerReport {
  ownerId: string;
  ownerName: string;
  dealsCreated: number;
  dealsWon: number;
  dealsLost: number;
  revenue: number;
  avgDealSize: number;
  winRate: number;
  avgCycleTime: number;
}

export interface TrendPoint {
  date: Date;
  pipelineValue: number;
  dealsInNegotiation: number;
  dealsClosing: number;
  winRate: number;
}
