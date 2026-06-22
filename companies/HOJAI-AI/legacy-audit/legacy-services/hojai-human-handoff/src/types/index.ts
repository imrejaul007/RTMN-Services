import { z } from 'zod';

// ============ HANDOVER STATUS ============
export const HandoffStatusEnum = z.enum([
  'pending',
  'in_queue',
  'offered',
  'accepted',
  'declined',
  'completed',
  'cancelled',
  'timeout'
]);
export type HandoffStatus = z.infer<typeof HandoffStatusEnum>;

// ============ HANDOVER REASON ============
export const HandoffReasonEnum = z.enum([
  'user_request',
  'ai_suggestion',
  'complexity_threshold',
  'sentiment_threshold',
  'silence_threshold',
  'escalation_rule',
  'manual_override',
  'business_hours'
]);
export type HandoffReason = z.infer<typeof HandoffReasonEnum>;

// ============ HANDOVER PRIORITY ============
export const HandoffPriorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);
export type HandoffPriority = z.infer<typeof HandoffPriorityEnum>;

// ============ HANDOVER ============
export const HandoffSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  tenantId: z.string(),
  channel: z.string(),

  // AI Context
  aiContext: z.object({
    botId: z.string(),
    flowId: z.string(),
    lastNodeId: z.string(),
    conversationSummary: z.string(),
    unresolvedIntents: z.array(z.string()).optional(),
    customerSentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    conversationDuration: z.number().optional(),
    messageCount: z.number().optional()
  }),

  // Reason
  reason: HandoffReasonEnum,
  reasonDescription: z.string().optional(),

  // Routing
  priority: HandoffPriorityEnum.default('normal'),
  targetTeam: z.string().optional(),
  targetAgent: z.string().optional(),

  // State
  status: HandoffStatusEnum.default('pending'),

  // Timing
  initiatedAt: z.date(),
  queuedAt: z.date().optional(),
  offeredAt: z.date().optional(),
  acceptedAt: z.date().optional(),
  completedAt: z.date().optional(),
  cancelledAt: z.date().optional(),
  timeoutAt: z.date().optional(),

  // Agent
  offeredAgentId: z.string().optional(),
  assignedAgentId: z.string().optional(),
  assignedAgentName: z.string().optional(),

  // Feedback
  customerFeedback: z.object({
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().optional(),
    wouldEscalate: z.boolean().optional()
  }).optional(),

  // Notes
  agentNotes: z.string().optional(),

  // Meta
  metadata: z.record(z.any()).optional()
});
export type Handoff = z.infer<typeof HandoffSchema>;

// ============ HANDOVER QUEUE ============
export const HandoffQueueItemSchema = z.object({
  id: z.string(),
  handoffId: z.string(),
  tenantId: z.string(),
  team: z.string(),
  priority: HandoffPriorityEnum,
  customerInfo: z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().optional()
  }),
  summary: z.string(),
  waitingTime: z.number(),
  position: z.number(),
  createdAt: z.date()
});
export type HandoffQueueItem = z.infer<typeof HandoffQueueItemSchema>;

// ============ HANDOVER OFFER ============
export const HandoffOfferSchema = z.object({
  id: z.string(),
  handoffId: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  team: z.string(),
  offeredAt: z.date(),
  expiresAt: z.date(),
  status: z.enum(['pending', 'accepted', 'declined', 'expired']),
  responseAt: z.date().optional()
});
export type HandoffOffer = z.infer<typeof HandoffOfferSchema>;

// ============ HANDOVER RULES ============
export const HandoffRuleSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),

  // Conditions
  conditions: z.array(z.object({
    type: z.enum(['sentiment', 'intent', 'silence', 'complexity', 'business_hours', 'custom']),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in']),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  })),

  // Action
  action: z.object({
    type: z.enum(['handoff', 'suggest_handoff', 'queue_priority', 'notify_supervisor']),
    targetTeam: z.string().optional(),
    targetAgent: z.string().optional(),
    priority: HandoffPriorityEnum.optional(),
    message: z.string().optional()
  }),

  // Config
  active: z.boolean().default(true),
  priority: z.number().default(0),

  createdAt: z.date(),
  updatedAt: z.date()
});
export type HandoffRule = z.infer<typeof HandoffRuleSchema>;

// ============ HANDOVER ANALYTICS ============
export const HandoffAnalyticsSchema = z.object({
  tenantId: z.string(),
  period: z.object({
    start: z.date(),
    end: z.date()
  }),

  overview: z.object({
    totalHandovers: z.number(),
    completedHandovers: z.number(),
    cancelledHandovers: z.number(),
    avgWaitTime: z.number(),
    avgHandleTime: z.number(),
    avgCustomerEffort: z.number(),
    handoffRate: z.number(),
    deflectionRate: z.number()
  }),

  byReason: z.record(z.number()),
  byPriority: z.record(z.number()),
  byTeam: z.record(z.object({
    handovers: z.number(),
    avgWaitTime: z.number()
  })),
  byChannel: z.record(z.number()),

  sentimentBreakdown: z.object({
    positive: z.number(),
    neutral: z.number(),
    negative: z.number()
  }),

  customerFeedback: z.object({
    avgRating: z.number().optional(),
    wouldEscalateRate: z.number().optional()
  }),

  trends: z.array(z.object({
    date: z.date(),
    handovers: z.number(),
    avgWaitTime: z.number(),
    satisfaction: z.number().optional()
  }))
});
export type HandoffAnalytics = z.infer<typeof HandoffAnalyticsSchema>;
