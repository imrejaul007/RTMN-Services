import { Document } from 'mongoose';

// Tenant identifier
export interface Tenant {
  tenantId: string;
  name: string;
  industry: string;
  settings: TenantSettings;
}

export interface TenantSettings {
  briefingTime: string;
  timezone: string;
  channels: NotificationChannel[];
  recipientEmails: string[];
  recipientPhones: string[];
  slackChannels: string[];
  riskThreshold: number;
  alertPreferences: AlertPreferences;
}

export interface NotificationChannel {
  type: 'email' | 'whatsapp' | 'slack';
  enabled: boolean;
  config?: Record<string, string>;
}

// Risk Analysis
export interface RiskAnalysis {
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  risks: RiskItem[];
  trendingRisks: RiskItem[];
}

export interface RiskItem {
  id: string;
  category: RiskCategory;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  affectedAreas: string[];
  indicators: string[];
  recommendedActions: string[];
  trend: 'increasing' | 'stable' | 'decreasing';
  detectedAt: Date;
}

export type RiskCategory =
  | 'customer_churn'
  | 'financial'
  | 'operational'
  | 'compliance'
  | 'market'
  | 'product'
  | 'supply_chain'
  | 'reputation';

// Opportunity Analysis
export interface OpportunityAnalysis {
  totalOpportunities: number;
  opportunities: Opportunity[];
  topPriority: Opportunity[];
}

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  potentialValue: number;
  confidence: number;
  timeline: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  category: string;
  actionItems: string[];
  roi?: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  detectedAt: Date;
}

export type OpportunityType =
  | 'revenue_growth'
  | 'cost_savings'
  | 'customer_expansion'
  | 'market_entry'
  | 'partnership'
  | 'operational_efficiency'
  | 'product_extension';

// AI Recommendations
export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  rationale: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  metrics: RecommendationMetrics;
  relatedOpportunities?: string[];
  relatedRisks?: string[];
  generatedAt: Date;
}

export interface RecommendationMetrics {
  potentialRevenue?: number;
  potentialSavings?: number;
  riskReduction?: number;
  customerImpact?: number;
  efficiencyGain?: number;
}

export type RecommendationCategory =
  | 'revenue'
  | 'cost_optimization'
  | 'customer_experience'
  | 'operational'
  | 'strategic'
  | 'risk_mitigation';

// Pending Approvals
export interface PendingApproval {
  id: string;
  type: ApprovalType;
  title: string;
  requester: string;
  requestedAt: Date;
  priority: 'low' | 'medium' | 'high';
  amount?: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  history: ApprovalHistory[];
}

export type ApprovalType =
  | 'budget'
  | 'hiring'
  | 'contract'
  | 'pricing'
  | 'expansion'
  | 'partnership'
  | 'policy';

// Alert System
export interface Alert {
  _id?: Document['_id'];
  id: string;
  tenantId: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  category: AlertCategory;
  relatedEntity?: {
    type: string;
    id: string;
    name: string;
  };
  metadata: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export type AlertType =
  | 'customer_at_risk'
  | 'product_issue'
  | 'revenue_drop'
  | 'compliance_breach'
  | 'service_degradation'
  | 'market_alert';

export type AlertCategory =
  | 'sales'
  | 'customer'
  | 'product'
  | 'financial'
  | 'compliance'
  | 'operations';

// Briefing Document
export interface Briefing {
  _id?: Document['_id'];
  id: string;
  tenantId: string;
  date: Date;
  generatedAt: Date;
  status: 'draft' | 'generating' | 'completed' | 'failed' | 'sent';
  summary: BriefingSummary;
  riskAnalysis: RiskAnalysis;
  opportunities: OpportunityAnalysis;
  recommendations: Recommendation[];
  pendingApprovals: PendingApproval[];
  alerts: AlertSummary[];
  metrics: BriefingMetrics;
  deliveryStatus: DeliveryStatus[];
  metadata: BriefingMetadata;
}

export interface BriefingSummary {
  headline: string;
  keyHighlights: string[];
  executiveSummary: string;
  quickWins: QuickWin[];
}

export interface QuickWin {
  title: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  action: string;
}

export interface AlertSummary {
  total: number;
  critical: number;
  warnings: number;
  byCategory: Record<string, number>;
}

export interface BriefingMetrics {
  revenue: MetricData;
  customers: MetricData;
  operations: MetricData;
  market: MetricData;
}

export interface MetricData {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
}

export interface DeliveryStatus {
  channel: 'email' | 'whatsapp' | 'slack';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
}

export interface BriefingMetadata {
  dataSources: string[];
  confidence: number;
  processingTime: number;
  version: string;
}

// API Request/Response Types
export interface GenerateBriefingRequest {
  tenantId: string;
  date?: Date;
  forceRegenerate?: boolean;
}

export interface ScheduleBriefingRequest {
  tenantId: string;
  time: string;
  timezone: string;
  channels: NotificationChannel[];
}

export interface SendBriefingRequest {
  briefingId: string;
  channels: NotificationChannel[];
  recipients?: {
    emails?: string[];
    phones?: string[];
    slackChannels?: string[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Notification Payloads
export interface BriefingNotification {
  briefingId: string;
  tenantId: string;
  subject: string;
  summary: string;
  preview: string;
  priority: 'low' | 'medium' | 'high';
  attachments?: string[];
}

export interface EmailPayload {
  to: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer }[];
}

export interface WhatsAppPayload {
  to: string[];
  message: string;
  priority: 'normal' | 'high';
}

export interface SlackPayload {
  channel: string;
  text: string;
  blocks: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: unknown[];
  fields?: { type: string; text: string }[];
  accessory?: unknown;
}

export interface SlackAttachment {
  color: string;
  title: string;
  text: string;
  fields?: { title: string; value: string; short: boolean }[];
}
