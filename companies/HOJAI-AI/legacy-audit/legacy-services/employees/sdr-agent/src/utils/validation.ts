// ============================================
// HOJAI AI - SDR Agent Validation Utilities
// ============================================

import { z, ZodSchema, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Validation error response
export interface ValidationError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

// Parse Zod error to structured format
export function parseZodError(error: ZodError): ValidationError['error'] {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));

  return {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details
  };
}

// Async validation middleware factory
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await schema.parseAsync(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: parseZodError(error)
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Validation error'
          }
        });
      }
    }
  };
}

// Validate query parameters
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await schema.parseAsync(req.query);
      req.query = result as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: parseZodError(error)
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Validation error'
          }
        });
      }
    }
  };
}

// Validate params
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await schema.parseAsync(req.params);
      req.params = result as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: parseZodError(error)
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Validation error'
          }
        });
      }
    }
  };
}

// UUID validation schema
export const UUIDSchema = z.string().uuid('Invalid UUID format');

// Pagination schema
export const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

// Date range schema
export const DateRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional()
});

// Lead filters schema
export const LeadFiltersSchema = z.object({
  stage: z.enum([
    'new', 'contacted', 'qualified', 'proposal',
    'negotiation', 'closed_won', 'closed_lost'
  ]).optional(),
  source: z.enum([
    'cold_outreach', 'inbound', 'referral', 'event',
    'linkedin', 'campaign', 'webinar', 'partner'
  ]).optional(),
  score: z.enum(['hot', 'warm', 'cold', 'unqualified']).optional(),
  assignedTo: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

// Prospect search schema
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

// Qualification schema
export const QualificationInputSchema = z.object({
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
    painPoints: z.array(z.string()).min(1, 'At least one pain point is required'),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    businessImpact: z.string().optional()
  }),
  timeline: z.object({
    targetClose: z.string().datetime().optional(),
    buyingStage: z.enum(['awareness', 'consideration', 'decision', 'none']),
    urgency: z.enum(['low', 'medium', 'high'])
  })
});

// Outreach message schema
export const OutreachMessageSchema = z.object({
  channel: z.enum(['email', 'linkedin', 'phone', 'sms', 'whatsapp']),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(5000),
  templateId: z.string().optional(),
  personalization: z.record(z.string()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url()
  })).optional()
});

// Followup schedule schema
export const FollowupScheduleItemSchema = z.object({
  channel: z.enum(['email', 'linkedin', 'phone', 'sms', 'whatsapp']),
  scheduledAt: z.string().datetime(),
  message: z.string().max(5000).optional(),
  reminder: z.boolean().default(true)
});

// Followup batch schema
export const FollowupBatchSchema = z.object({
  leadId: z.string().uuid(),
  followups: z.array(FollowupScheduleItemSchema).min(1)
});

// Stage update schema
export const StageUpdateSchema = z.object({
  stage: z.enum([
    'new', 'contacted', 'qualified', 'proposal',
    'negotiation', 'closed_won', 'closed_lost'
  ]),
  notes: z.string().max(2000).optional()
});

// CRM config schema
export const CRMConfigSchema = z.object({
  provider: z.enum(['hubspot', 'salesforce', 'pipedrive', 'zoho', 'custom']),
  apiKey: z.string().min(1),
  apiSecret: z.string().optional(),
  instanceUrl: z.string().url().optional(),
  webhookSecret: z.string().optional()
});

// API response helpers
export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    ...(message ? { message } : {}),
    data
  };
}

export function errorResponse(code: string, message: string, details?: unknown) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  };
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number
) {
  return {
    success: true,
    data: {
      items,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + items.length < total
      }
    }
  };
}
