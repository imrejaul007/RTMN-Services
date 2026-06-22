import { z } from 'zod';

export enum AttributionModel {
  FIRST_TOUCH = 'first_touch',
  LAST_TOUCH = 'last_touch',
  LINEAR = 'linear',
  TIME_DECAY = 'time_decay',
  POSITION_BASED = 'position_based',
  DATA_DRIVEN = 'data_driven'
}

export const AttributionEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string(),
  sessionId: z.string().optional(),

  // Touchpoint
  channel: z.string(),
  source: z.string().optional(),
  campaign: z.string().optional(),
  medium: z.string().optional(),
  content: z.string().optional(),
  keyword: z.string().optional(),

  // Interaction
  type: z.enum(['impression', 'click', 'conversion']),
  timestamp: z.date(),

  // Value
  value: z.number().optional(),
  conversionId: z.string().optional(),

  // Context
  device: z.string().optional(),
  location: z.string().optional()
});

export type AttributionEvent = z.infer<typeof AttributionEventSchema>;

export const ConversionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string(),
  conversionType: z.string(),
  value: z.number(),
  currency: z.string().default('INR'),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional()
});

export type Conversion = z.infer<typeof ConversionSchema>;

export const AttributionResultSchema = z.object({
  channel: z.string(),
  conversions: z.number(),
  revenue: z.number(),
  cost: z.number(),
  roas: z.number(),
  attribution: z.number(),
  touchpoints: z.array(z.object({
    channel: z.string(),
    touchpointDate: z.date(),
    value: z.number()
  }))
});

export type AttributionResult = z.infer<typeof AttributionResultSchema>;

// A/B Testing
export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed'
}

export const ExperimentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),

  hypothesis: z.string(),
  status: z.nativeEnum(ExperimentStatus).default(ExperimentStatus.DRAFT),

  // Variants
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    traffic: z.number().min(0).max(100),
    config: z.record(z.any())
  })).min(2),

  // Targeting
  targeting: z.object({
    userSegments: z.array(z.string()).optional(),
    channels: z.array(z.string()).optional(),
    minSampleSize: z.number().default(100)
  }).optional(),

  // Metrics
  primaryMetric: z.object({
    name: z.string(),
    type: z.enum(['conversion_rate', 'revenue', 'engagement', 'custom'])
  }),

  secondaryMetrics: z.array(z.object({
    name: z.string(),
    type: z.string()
  })).optional(),

  // Results
  results: z.object({
    winner: z.string().uuid().optional(),
    confidence: z.number().optional(),
    pValue: z.number().optional(),
    variantStats: z.record(z.object({
      conversions: z.number(),
      total: z.number(),
      conversionRate: z.number(),
      revenue: z.number()
    }))
  }).optional(),

  // Schedule
  startDate: z.date().optional(),
  endDate: z.date().optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Experiment = z.infer<typeof ExperimentSchema>;

export const ExperimentVariantSchema = z.object({
  id: z.string().uuid(),
  experimentId: z.string().uuid(),
  variantId: z.string().uuid(),
  userId: z.string(),
  assignedAt: z.date(),
  converted: z.boolean().default(false),
  conversionValue: z.number().optional(),
  metadata: z.record(z.any()).optional()
});

export type ExperimentVariant = z.infer<typeof ExperimentVariantSchema>;

// Targeting
export const AudienceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),

  criteria: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'exists']),
    value: z.any()
  })),

  logic: z.enum(['AND', 'OR']).default('AND'),

  estimatedSize: z.number().optional(),
  actualSize: z.number().optional(),

  tags: z.array(z.string()).optional(),
  active: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Audience = z.infer<typeof AudienceSchema>;

// Reports
export const ReportSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),

  type: z.enum(['attribution', 'experiment', 'audience', 'custom']),
  config: z.record(z.any()),

  schedule: z.object({
    enabled: z.boolean().default(false),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    recipients: z.array(z.string().email())
  }).optional(),

  lastRunAt: z.date().optional(),
  createdBy: z.string(),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Report = z.infer<typeof ReportSchema>;
