/**
 * HOJAI FounderOS - Type Definitions
 * Company Building Tools and AI-Powered Executive Briefings
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export enum FundraisingStage {
  PRE_SEED = 'pre_seed',
  SEED = 'seed',
  SERIES_A = 'series_a',
  SERIES_B = 'series_b',
  SERIES_C = 'series_c',
  IPO = 'ipo'
}

export enum BriefingType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BOARD = 'board',
  INVESTOR = 'investor'
}

export enum HiringPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum HiringStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  FILLED = 'filled',
  CANCELLED = 'cancelled'
}

export enum SeniorityLevel {
  INTERN = 'intern',
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
  MANAGER = 'manager',
  DIRECTOR = 'director',
  VP = 'vp',
  C_LEVEL = 'c_level'
}

// ============================================================================
// BUSINESS MODEL CANVAS
// ============================================================================

export const BusinessModelSegmentsSchema = z.object({
  keyPartners: z.array(z.string()).default([]),
  keyActivities: z.array(z.string()).default([]),
  keyResources: z.array(z.string()).default([]),
  valuePropositions: z.array(z.string()).default([]),
  customerRelationships: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
  customerSegments: z.array(z.string()).default([]),
  costStructure: z.array(z.string()).default([]),
  revenueStreams: z.array(z.string()).default([])
});

export type BusinessModelSegments = z.infer<typeof BusinessModelSegmentsSchema>;

export const BusinessModelSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  segments: BusinessModelSegmentsSchema,
  createdBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type BusinessModel = z.infer<typeof BusinessModelSchema>;

// ============================================================================
// GTM STRATEGY
// ============================================================================

export const GTMMilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  targetDate: z.date().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed']).default('pending')
});

export const GTMStrategyDataSchema = z.object({
  targetSegments: z.array(z.string()).default([]),
  positioning: z.string().optional(),
  channels: z.array(z.string()).default([]),
  pricingModel: z.string().optional(),
  goLiveDate: z.date().optional(),
  milestones: z.array(GTMMilestoneSchema).default([])
});

export type GTMStrategyData = z.infer<typeof GTMStrategyDataSchema>;

export const GTMStrategySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  targetMarket: z.string().optional(),
  strategy: GTMStrategyDataSchema,
  createdBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type GTMStrategy = z.infer<typeof GTMStrategySchema>;

// ============================================================================
// FUNDRAISING PLAN
// ============================================================================

export const FundraisingMilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  targetDate: z.date().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed']).default('pending')
});

export const FundraisingPlanSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  stage: z.nativeEnum(FundraisingStage),
  targetAmount: z.number().optional(),
  currency: z.string().default('USD'),
  targetDate: z.date().optional(),
  valuation: z.number().optional(),
  raisedAmount: z.number().default(0),
  pitchDeck: z.string().optional(),
  investors: z.array(z.object({
    name: z.string(),
    type: z.string().optional(),
    contact: z.string().optional(),
    status: z.enum(['contacted', 'meeting_scheduled', 'interested', 'passed', 'committed']).default('contacted')
  })).default([]),
  milestones: z.array(FundraisingMilestoneSchema).default([]),
  createdBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type FundraisingPlan = z.infer<typeof FundraisingPlanSchema>;

// ============================================================================
// HIRING PLAN
// ============================================================================

export const HiringRoleSchema = z.object({
  id: z.string(),
  title: z.string(),
  department: z.string(),
  seniority: z.nativeEnum(SeniorityLevel),
  location: z.string().optional(),
  remote: z.boolean().default(true),
  salary: z.number().optional(),
  priority: z.nativeEnum(HiringPriority).default(HiringPriority.MEDIUM),
  status: z.nativeEnum(HiringStatus).default(HiringStatus.OPEN),
  targetStartDate: z.date().optional(),
  description: z.string().optional()
});

export const HiringPlanSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  timeline: z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    quarters: z.array(z.string()).default([])
  }),
  roles: z.array(HiringRoleSchema).default([]),
  totalBudget: z.number().default(0),
  createdBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type HiringPlan = z.infer<typeof HiringPlanSchema>;

// ============================================================================
// MARKET ANALYSIS
// ============================================================================

export const MarketAnalysisSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  marketSize: z.object({
    value: z.number().optional(),
    currency: z.string().default('USD'),
    unit: z.string().optional()
  }).optional(),
  tam: z.number().optional(),
  sam: z.number().optional(),
  som: z.number().optional(),
  trends: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    impact: z.enum(['positive', 'negative', 'neutral']).default('neutral')
  })).default([]),
  competitors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    marketShare: z.number().optional(),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    website: z.string().optional()
  })).default([]),
  opportunities: z.array(z.string()).default([]),
  threats: z.array(z.string()).default([]),
  createdBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type MarketAnalysis = z.infer<typeof MarketAnalysisSchema>;

// ============================================================================
// FOUNDER BRIEFING
// ============================================================================

export const BriefingContentSchema = z.object({
  overview: z.string(),
  priorities: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    weight: z.number().default(1)
  })).default([]),
  risks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    mitigation: z.string().optional()
  })).default([]),
  opportunities: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    potential: z.enum(['low', 'medium', 'high']).default('medium')
  })).default([]),
  metrics: z.array(z.object({
    name: z.string(),
    value: z.union([z.string(), z.number()]),
    change: z.number().optional(),
    unit: z.string().optional(),
    trend: z.enum(['up', 'down', 'stable']).optional()
  })).default([]),
  recommendations: z.array(z.string()).default([])
});

export type BriefingContent = z.infer<typeof BriefingContentSchema>;

export const FounderBriefingSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  type: z.nativeEnum(BriefingType),
  date: z.date(),
  period: z.object({
    start: z.date(),
    end: z.date()
  }),
  content: BriefingContentSchema,
  generatedAt: z.date(),
  generatedBy: z.string().optional()
});

export type FounderBriefing = z.infer<typeof FounderBriefingSchema>;

// ============================================================================
// BRIEFING TEMPLATE
// ============================================================================

export const BriefingTemplateSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  order: z.number().default(0),
  required: z.boolean().default(true),
  prompts: z.array(z.string()).default([])
});

export const BriefingTemplateSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  type: z.nativeEnum(BriefingType),
  name: z.string(),
  description: z.string().optional(),
  sections: z.array(BriefingTemplateSectionSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type BriefingTemplate = z.infer<typeof BriefingTemplateSchema>;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta: {
    timestamp: string;
    requestId: string;
    tenantId?: string;
  };
}

export function createResponse<T>(data: T, options?: { tenantId?: string }): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      tenantId: options?.tenantId
    }
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): APIResponse<null> {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    }
  };
}

// ============================================================================
// TENANT CONTEXT
// ============================================================================

export interface TenantContext {
  tenantId: string;
  tenant_id: string;
  namespace: string;
  userId?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}
