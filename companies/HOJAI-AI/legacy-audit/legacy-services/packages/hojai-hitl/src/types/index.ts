import { z } from 'zod';

export enum ReviewType {
  DECISION = 'decision',
  CONTENT = 'content',
  ACTION = 'action',
  ESCALATION = 'escalation',
  EXCEPTION = 'exception'
}

export enum ReviewStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  OVERRIDDEN = 'overridden',
  ESCALATED = 'escalated',
  EXPIRED = 'expired'
}

export enum ReviewPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export const ReviewRequestSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  type: z.nativeEnum(ReviewType),
  status: z.nativeEnum(ReviewStatus).default(ReviewStatus.PENDING),
  priority: z.nativeEnum(ReviewPriority).default(ReviewPriority.MEDIUM),

  // What needs review
  title: z.string(),
  description: z.string(),
  context: z.record(z.any()),

  // Original decision/action
  originalAction: z.object({
    type: z.string(),
    params: z.record(z.any()),
    result: z.any().optional(),
    confidence: z.number().optional()
  }),

  // AI recommendation
  aiRecommendation: z.object({
    action: z.string(),
    confidence: z.number(),
    reasoning: z.string()
  }),

  // Reviewers
  assignedTo: z.string().optional(),
  reviewerRole: z.string().optional(),
  escalatedTo: z.string().optional(),

  // SLA
  slaDeadline: z.date(),
  slaHours: z.number().default(24),

  // Decision
  decision: z.enum(['approve', 'reject', 'override', 'escalate']).optional(),
  decisionNote: z.string().optional(),
  decidedBy: z.string().optional(),
  decidedAt: z.date().optional(),

  // Override info
  overriddenBy: z.string().optional(),
  overrideReason: z.string().optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

export const EscalationRuleSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  name: z.string(),
  description: z.string(),

  // Trigger conditions
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'greater_than', 'less_than', 'in', 'contains']),
    value: z.any()
  })),

  // Actions
  action: z.enum(['escalate', 'block', 'require_review', 'notify']),
  escalateTo: z.string().optional(),
  reason: z.string().optional(),

  // Priority boost
  priorityBoost: z.number().optional(),

  active: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type EscalationRule = z.infer<typeof EscalationRuleSchema>;

export const ConfidenceThresholdSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  action: z.string(),
  category: z.string(),

  // Thresholds
  autoApproveBelow: z.number().default(0.3),
  reviewRequired: z.object({
    min: z.number().default(0.3),
    max: z.number().default(0.7)
  }),
  autoApproveAbove: z.number().default(0.7),

  // Override
  canOverride: z.boolean().default(true),
  overrideRoles: z.array(z.string()).optional(),

  active: z.boolean().default(true)
});

export type ConfidenceThreshold = z.infer<typeof ConfidenceThresholdSchema>;

export const ReviewAuditSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  reviewId: z.string().uuid(),

  action: z.enum(['created', 'assigned', 'decided', 'overridden', 'escalated', 'expired', 'commented']),

  performedBy: z.string(),
  role: z.string().optional(),

  details: z.record(z.any()),

  createdAt: z.date()
});

export type ReviewAudit = z.infer<typeof ReviewAuditSchema>;
