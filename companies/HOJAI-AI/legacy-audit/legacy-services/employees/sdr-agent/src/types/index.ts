// ============================================
// HOJAI AI - SDR Agent Type Definitions
// ============================================

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export enum LeadStage {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

export enum LeadSource {
  COLD_OUTREACH = 'cold_outreach',
  INBOUND = 'inbound',
  REFERRAL = 'referral',
  EVENT = 'event',
  LINKEDIN = 'linkedin',
  CAMPAIGN = 'campaign',
  WEBINAR = 'webinar',
  PARTNER = 'partner'
}

export enum LeadScore {
  HOT = 'hot',      // 80-100
  WARM = 'warm',    // 50-79
  COLD = 'cold',    // 0-49
  UNQUALIFIED = 'unqualified'
}

export enum OutreachChannel {
  EMAIL = 'email',
  LINKEDIN = 'linkedin',
  PHONE = 'phone',
  SMS = 'sms',
  WHATSAPP = 'whatsapp'
}

export enum OutreachStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  REPLIED = 'replied',
  BOUNCED = 'bounced',
  FAILED = 'failed'
}

export enum FollowupStatus {
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  COMPLETED = 'completed',
  SKIPPED = 'skipped'
}

export enum BANTField {
  BUDGET = 'budget',
  AUTHORITY = 'authority',
  NEED = 'need',
  TIMELINE = 'timeline'
}

export enum QualificationStatus {
  NOT_QUALIFIED = 'not_qualified',
  IN_PROGRESS = 'in_progress',
  QUALIFIED = 'qualified',
  DISQUALIFIED = 'disqualified'
}

// ============================================
// Zod Schemas for Validation
// ============================================

export const ContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
  linkedinUrl: z.string().url().optional(),
  title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
  industry: z.string().max(100).optional(),
  location: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional()
  }).optional()
});

export const CompanySchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
  revenue: z.string().optional(),
  location: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional()
  }).optional(),
  linkedinUrl: z.string().url().optional(),
  crunchbaseUrl: z.string().url().optional()
});

export const ProspectSearchSchema = z.object({
  industry: z.array(z.string()).optional(),
  companySize: z.array(z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])).optional(),
  location: z.object({
    cities: z.array(z.string()).optional(),
    states: z.array(z.string()).optional(),
    countries: z.array(z.string()).optional()
  }).optional(),
  title: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
  fundingStage: z.array(z.enum(['seed', 'series_a', 'series_b', 'series_c', 'ipo', 'profitable'])).optional(),
  recentlyHired: z.boolean().optional(),
  jobChanges: z.object({
    titles: z.array(z.string()).optional(),
    withinDays: z.number().min(1).max(365).optional()
  }).optional()
});

export const QualificationSchema = z.object({
  budget: z.object({
    hasBudget: z.boolean(),
    amount: z.number().min(0).optional(),
    currency: z.string().default('USD'),
    comments: z.string().optional()
  }),
  authority: z.object({
    level: z.enum(['individual', 'manager', 'director', 'vp', 'cxo', 'unknown']),
    isDecisionMaker: z.boolean(),
    involvesOthers: z.boolean().optional(),
    comments: z.string().optional()
  }),
  need: z.object({
    painPoints: z.array(z.string()),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    businessImpact: z.string().optional()
  }),
  timeline: z.object({
    targetClose: z.string().datetime().optional(),
    buyingStage: z.enum(['awareness', 'consideration', 'decision', 'none']),
    urgency: z.enum(['low', 'medium', 'high'])
  })
});

export const OutreachMessageSchema = z.object({
  channel: z.nativeEnum(OutreachChannel),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(5000),
  templateId: z.string().optional(),
  personalization: z.record(z.string()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url()
  })).optional()
});

export const FollowupScheduleSchema = z.object({
  leadId: z.string().uuid(),
  channel: z.nativeEnum(OutreachChannel),
  scheduledAt: z.string().datetime(),
  message: z.string().max(5000).optional(),
  reminder: z.boolean().default(true)
});

// ============================================
// TypeScript Interfaces
// ============================================

export interface IContact extends z.infer<typeof ContactSchema> {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICompany extends z.infer<typeof CompanySchema> {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILead {
  id: string;
  tenantId: string;
  contactId: string;
  companyId: string;
  stage: LeadStage;
  source: LeadSource;
  score: LeadScore;
  scoreValue: number;
  ownerId: string;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt: Date | null;
  nextFollowupAt: Date | null;
}

export interface IQualification {
  id: string;
  tenantId: string;
  leadId: string;
  status: QualificationStatus;
  bant: {
    budget: {
      hasBudget: boolean;
      amount?: number;
      currency: string;
      comments?: string;
    };
    authority: {
      level: 'individual' | 'manager' | 'director' | 'vp' | 'cxo' | 'unknown';
      isDecisionMaker: boolean;
      involvesOthers?: boolean;
      comments?: string;
    };
    need: {
      painPoints: string[];
      priority: 'low' | 'medium' | 'high' | 'critical';
      businessImpact?: string;
    };
    timeline: {
      targetClose?: Date;
      buyingStage: 'awareness' | 'consideration' | 'decision' | 'none';
      urgency: 'low' | 'medium' | 'high';
    };
  };
  notes: string;
  disqualifyReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOutreach {
  id: string;
  tenantId: string;
  leadId: string;
  channel: OutreachChannel;
  status: OutreachStatus;
  subject?: string;
  body: string;
  templateId?: string;
  personalization?: Record<string, string>;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFollowup {
  id: string;
  tenantId: string;
  leadId: string;
  outreachId?: string;
  channel: OutreachChannel;
  status: FollowupStatus;
  scheduledFor: Date;
  message?: string;
  sentAt?: Date;
  completedAt?: Date;
  skippedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProspect {
  id: string;
  tenantId: string;
  contact: IContact;
  company: ICompany;
  matchScore: number;
  matchReasons: string[];
  scrapedAt: Date;
  createdAt: Date;
}

export interface ISDRMetrics {
  totalProspectsFound: number;
  totalContactsReached: number;
  totalQualified: number;
  totalDisqualified: number;
  totalMeetingsBooked: number;
  conversionRate: number;
  avgResponseRate: number;
  avgTimeToQualify: number;
  outreachByChannel: Record<OutreachChannel, {
    sent: number;
    opened: number;
    replied: number;
    conversionRate: number;
  }>;
  stageDistribution: Record<LeadStage, number>;
}

// ============================================
// API Request/Response Types
// ============================================

export interface ProspectFindRequest {
  search: z.infer<typeof ProspectSearchSchema>;
  limit?: number;
  offset?: number;
}

export interface ProspectFindResponse {
  success: boolean;
  data?: {
    prospects: IProspect[];
    total: number;
    hasMore: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface QualifyLeadRequest {
  leadId: string;
  qualification: z.infer<typeof QualificationSchema>;
}

export interface OutreachSendRequest {
  leadId: string;
  channel: OutreachChannel;
  message: z.infer<typeof OutreachMessageSchema>;
  scheduleFor?: string;
}

export interface FollowupScheduleRequest {
  leadId: string;
  followups: z.infer<typeof FollowupScheduleSchema>[];
}

export interface LeadListRequest {
  stage?: LeadStage;
  source?: LeadSource;
  score?: LeadScore;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export interface LeadStageUpdateRequest {
  stage: LeadStage;
  notes?: string;
}

// ============================================
// CRM Integration Types
// ============================================

export interface CRMConfig {
  provider: 'hubspot' | 'salesforce' | 'pipedrive' | 'zoho' | 'custom';
  apiKey: string;
  apiSecret?: string;
  instanceUrl?: string;
  webhookSecret?: string;
}

export interface CRMSyncResult {
  success: boolean;
  crmContactId?: string;
  crmLeadId?: string;
  syncedAt?: Date;
  error?: string;
}

// ============================================
// Internal Types
// ============================================

export interface TenantContext {
  tenantId: string;
  userId?: string;
  roles?: string[];
}

export interface SDRAgentConfig {
  tenantId: string;
  ownerId: string;
  defaultChannels: OutreachChannel[];
  followupSchedule: {
    days: number[];
    hours: number[];
    timezone: string;
  };
  scoringWeights: {
    companyMatch: number;
    roleMatch: number;
    engagement: number;
    intent: number;
  };
}
