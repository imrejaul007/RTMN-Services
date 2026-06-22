import { z } from 'zod';

// ============ NODE TYPES ============
export const NodeTypeEnum = z.enum([
  'trigger',
  'message',
  'quick_reply',
  'button',
  'list',
  'media',
  'condition',
  'action',
  'ai_response',
  'webhook',
  'delay',
  'handoff',
  'end'
]);
export type NodeType = z.infer<typeof NodeTypeEnum>;

// ============ CONDITION OPERATORS ============
export const ConditionOperatorEnum = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'greater_than',
  'less_than',
  'in',
  'not_in',
  'has_value',
  'is_empty'
]);
export type ConditionOperator = z.infer<typeof ConditionOperatorEnum>;

// ============ VARIABLE TYPES ============
export const VariableTypeEnum = z.enum([
  'text',
  'number',
  'boolean',
  'date',
  'phone',
  'email',
  'array',
  'object'
]);
export type VariableType = z.infer<typeof VariableTypeEnum>;

// ============ CHANNEL TYPES ============
export const ChannelTypeEnum = z.enum([
  'whatsapp',
  'instagram',
  'facebook',
  'webchat',
  'voice',
  'telegram',
  'email'
]);
export type ChannelType = z.infer<typeof ChannelTypeEnum>;

// ============ BOT STATUS ============
export const BotStatusEnum = z.enum([
  'draft',
  'testing',
  'active',
  'paused',
  'archived'
]);
export type BotStatus = z.infer<typeof BotStatusEnum>;

// ============ NODE CONDITION ============
export const ConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: ConditionOperatorEnum,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  logicalOperator: z.enum(['and', 'or']).optional()
});
export type Condition = z.infer<typeof ConditionSchema>;

// ============ QUICK REPLY OPTION ============
export const QuickReplyOptionSchema = z.object({
  id: z.string(),
  text: z.string().max(20),
  emoji: z.string().optional(),
  nextNodeId: z.string().optional()
});
export type QuickReplyOption = z.infer<typeof QuickReplyOptionSchema>;

// ============ BUTTON ============
export const ButtonSchema = z.object({
  id: z.string(),
  text: z.string().max(25),
  type: z.enum(['postback', 'url', 'phone', 'copy']),
  value: z.string(),
  nextNodeId: z.string().optional()
});
export type Button = z.infer<typeof ButtonSchema>;

// ============ MEDIA CONTENT ============
export const MediaContentSchema = z.object({
  type: z.enum(['image', 'video', 'audio', 'document', 'sticker']),
  url: z.string().url(),
  caption: z.string().optional(),
  filename: z.string().optional()
});
export type MediaContent = z.infer<typeof MediaContentSchema>;

// ============ MESSAGE CONTENT ============
export const MessageContentSchema = z.object({
  text: z.string().max(4096).optional(),
  media: MediaContentSchema.optional(),
  quickReplies: z.array(QuickReplyOptionSchema).max(13).optional(),
  buttons: z.array(ButtonSchema).max(3).optional()
});
export type MessageContent = z.infer<typeof MessageContentSchema>;

// ============ ACTION TYPES ============
export const ActionTypeEnum = z.enum([
  'send_email',
  'send_sms',
  'send_push',
  'update_variable',
  'increment_counter',
  'add_tag',
  'remove_tag',
  'add_to_list',
  'remove_from_list',
  'create_ticket',
  'send_webhook',
  'add_to_calendar',
  'create_order',
  'reserve_appointment',
  'send_notification',
  'ai_memory_store',
  'ai_memory_recall'
]);
export type ActionType = z.infer<typeof ActionTypeEnum>;

// ============ ACTION CONFIG ============
export const ActionConfigSchema = z.object({
  actionType: ActionTypeEnum,
  params: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  continueToNext: z.boolean().default(true),
  onFailure: z.object({
    goToNodeId: z.string().optional(),
    replyWithMessage: z.string().optional()
  }).optional()
});
export type ActionConfig = z.infer<typeof ActionConfigSchema>;

// ============ CONDITION BRANCH ============
export const ConditionBranchSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  conditions: z.array(ConditionSchema),
  nextNodeId: z.string(),
  priority: z.number().default(0)
});
export type ConditionBranch = z.infer<typeof ConditionBranchSchema>;

// ============ DELAY CONFIG ============
export const DelayConfigSchema = z.object({
  type: z.enum(['fixed', 'random', 'scheduled']),
  value: z.number().optional(),
  unit: z.enum(['seconds', 'minutes', 'hours', 'days']).optional(),
  sendAt: z.string().optional(),
  timezone: z.string().optional()
});
export type DelayConfig = z.infer<typeof DelayConfigSchema>;

// ============ HANDSOFF CONFIG ============
export const HandoffConfigSchema = z.object({
  department: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  customFields: z.record(z.string()).optional(),
  summaryPrompt: z.string().optional(),
  silenceTimeout: z.number().optional(),
  silenceTimeoutAction: z.enum(['close', 'extend', 'transfer']).optional()
});
export type HandoffConfig = z.infer<typeof HandoffConfigSchema>;

// ============ AI RESPONSE CONFIG ============
export const AIResponseConfigSchema = z.object({
  model: z.enum(['claude-3-5-sonnet', 'gpt-4o', 'gpt-4-turbo']).default('claude-3-5-sonnet'),
  systemPrompt: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().max(4096).default(1024),
  contextWindow: z.number().default(10),
  variables: z.array(z.string()).optional(),
  knowledgeBaseIds: z.array(z.string()).optional(),
  fallbackMessage: z.string().optional(),
  silenceTimeout: z.number().optional(),
  silenceTimeoutMessage: z.string().optional()
});
export type AIResponseConfig = z.infer<typeof AIResponseConfigSchema>;

// ============ WEBHOOK CONFIG ============
export const WebhookConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.record(z.string()).optional(),
  bodyTemplate: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  timeout: z.number().default(30000),
  retryCount: z.number().default(3),
  retryDelay: z.number().default(1000),
  continueToNextOnSuccess: z.boolean().default(true),
  continueToNextOnFailure: z.boolean().default(false),
  successNextNodeId: z.string().optional(),
  failureNextNodeId: z.string().optional()
});
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

// ============ TRIGGER CONFIG ============
export const TriggerConfigSchema = z.object({
  type: z.enum(['welcome', 'keyword', 'webhook', 'schedule', 'event', 'api']),
  keyword: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  keywordMatchType: z.enum(['exact', 'contains', 'starts_with', 'any']).default('contains'),
  eventType: z.string().optional(),
  scheduleCron: z.string().optional(),
  scheduleTimezone: z.string().default('Asia/Kolkata'),
  apiEndpoint: z.string().optional(),
  conditions: z.array(ConditionSchema).optional()
});
export type TriggerConfig = z.infer<typeof TriggerConfigSchema>;

// ============ NODE POSITION ============
export const NodePositionSchema = z.object({
  x: z.number(),
  y: z.number()
});
export type NodePosition = z.infer<typeof NodePositionSchema>;

// ============ FLOW NODE ============
export const FlowNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeEnum,
  label: z.string().max(100),
  position: NodePositionSchema,
  config: z.object({
    // Common
    delay: DelayConfigSchema.optional(),
    handoff: HandoffConfigSchema.optional(),

    // Message/AI
    message: MessageContentSchema.optional(),
    aiResponse: AIResponseConfigSchema.optional(),

    // Condition
    branches: z.array(ConditionBranchSchema).optional(),
    defaultBranchNextNodeId: z.string().optional(),

    // Action
    actions: z.array(ActionConfigSchema).optional(),

    // Webhook
    webhook: WebhookConfigSchema.optional(),

    // Trigger
    trigger: TriggerConfigSchema.optional(),

    // Media
    media: MediaContentSchema.optional()
  }),
  nextNodeId: z.string().optional(),
  errorNodeId: z.string().optional(),
  style: z.object({
    backgroundColor: z.string().optional(),
    borderColor: z.string().optional(),
    icon: z.string().optional()
  }).optional()
});
export type FlowNode = z.infer<typeof FlowNodeSchema>;

// ============ FLOW ============
export const FlowSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  description: z.string().max(500).optional(),
  nodes: z.array(FlowNodeSchema),
  entryNodeId: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: VariableTypeEnum,
    defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
    description: z.string().optional()
  })).optional(),
  channels: z.array(ChannelTypeEnum).default(['whatsapp']),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});
export type Flow = z.infer<typeof FlowSchema>;

// ============ BOT ============
export const BotSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  description: z.string().max(1000).optional(),
  tenantId: z.string(),
  userId: z.string(),
  status: BotStatusEnum.default('draft'),
  flows: z.array(FlowSchema),
  defaultFlowId: z.string().optional(),
  channels: z.array(ChannelTypeEnum).default(['whatsapp']),
  variables: z.array(z.object({
    name: z.string(),
    type: VariableTypeEnum,
    defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
    description: z.string().optional()
  })).optional(),
  settings: z.object({
    language: z.string().default('en'),
    timezone: z.string().default('Asia/Kolkata'),
    startTypingIndicator: z.boolean().default(true),
    readReceipts: z.boolean().default(true),
    blockAfterHours: z.boolean().default(false),
    afterHoursMessage: z.string().optional(),
    offDays: z.array(z.string()).optional(),
    offHoursStart: z.string().optional(),
    offHoursEnd: z.string().optional()
  }).optional(),
  analytics: z.object({
    totalConversations: z.number().default(0),
    activeConversations: z.number().default(0),
    completedConversations: z.number().default(0),
    averageResponseTime: z.number().default(0),
    satisfactionScore: z.number().optional(),
    lastUpdated: z.date().optional()
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type Bot = z.infer<typeof BotSchema>;

// ============ CONVERSATION ============
export const ConversationContextSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  tenantId: z.string(),
  channel: ChannelTypeEnum,
  botId: z.string(),
  flowId: z.string().optional(),
  currentNodeId: z.string().optional(),
  variables: z.record(z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())])),
  tags: z.array(z.string()).optional(),
  startedAt: z.date(),
  lastActivityAt: z.date(),
  endedAt: z.date().optional(),
  endedBy: z.enum(['user', 'bot', 'agent', 'system']).optional(),
  endedReason: z.string().optional()
});
export type ConversationContext = z.infer<typeof ConversationContextSchema>;

// ============ MESSAGE ============
export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  nodeId: z.string().optional(),
  type: z.enum(['user', 'bot', 'system', 'agent']),
  content: z.object({
    text: z.string().optional(),
    media: MediaContentSchema.optional(),
    quickReplies: z.array(QuickReplyOptionSchema).optional(),
    buttons: z.array(ButtonSchema).optional()
  }),
  timestamp: z.date(),
  metadata: z.object({
    sessionId: z.string().optional(),
    messageId: z.string().optional(),
    deliveryStatus: z.enum(['sent', 'delivered', 'read', 'failed']).optional(),
    error: z.string().optional()
  }).optional()
});
export type Message = z.infer<typeof MessageSchema>;

// ============ TEMPLATE ============
export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  description: z.string().max(500).optional(),
  category: z.enum([
    'welcome',
    'onboarding',
    'support',
    'marketing',
    'order',
    'appointment',
    'feedback',
    'notification',
    'custom'
  ]),
  industry: z.enum([
    'banking',
    'healthcare',
    'restaurant',
    'retail',
    'travel',
    'hr',
    'ecommerce',
    'general'
  ]).default('general'),
  flows: z.array(FlowSchema),
  variables: z.array(z.object({
    name: z.string(),
    type: VariableTypeEnum,
    required: z.boolean().default(false),
    description: z.string().optional(),
    example: z.string().optional()
  })),
  thumbnail: z.string().optional(),
  isPublic: z.boolean().default(false),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type Template = z.infer<typeof TemplateSchema>;

// ============ ANALYTICS ============
export const NodeAnalyticsSchema = z.object({
  nodeId: z.string(),
  nodeType: NodeTypeEnum,
  totalVisits: z.number().default(0),
  totalExits: z.number().default(0),
  avgTimeSpent: z.number().default(0),
  exitRates: z.record(z.number()),
  successRates: z.record(z.number())
});
export type NodeAnalytics = z.infer<typeof NodeAnalyticsSchema>;

export const BotAnalyticsSchema = z.object({
  botId: z.string(),
  period: z.object({
    start: z.date(),
    end: z.date()
  }),
  overview: z.object({
    totalConversations: z.number(),
    activeConversations: z.number(),
    completedConversations: z.number(),
    abandonedConversations: z.number(),
    handoffRate: z.number(),
    avgConversationDuration: z.number(),
    avgNodesPerConversation: z.number()
  }),
  messages: z.object({
    totalSent: z.number(),
    totalReceived: z.number(),
    avgMessagesPerConversation: z.number(),
    responseTimeAvg: z.number()
  }),
  nodeAnalytics: z.array(NodeAnalyticsSchema),
  channelBreakdown: z.record(z.number()),
  topExitNodes: z.array(z.object({
    nodeId: z.string(),
    exitCount: z.number()
  })),
  sentimentBreakdown: z.object({
    positive: z.number(),
    neutral: z.number(),
    negative: z.number()
  })
});
export type BotAnalytics = z.infer<typeof BotAnalyticsSchema>;
