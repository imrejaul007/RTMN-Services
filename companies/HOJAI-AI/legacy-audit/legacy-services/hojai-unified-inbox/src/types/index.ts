import { z } from 'zod';

// ============ CHANNEL TYPES ============
export const ChannelEnum = z.enum([
  'whatsapp',
  'instagram',
  'facebook',
  'webchat',
  'voice',
  'email',
  'sms',
  'telegram'
]);
export type Channel = z.infer<typeof ChannelEnum>;

// ============ CONVERSATION STATUS ============
export const ConversationStatusEnum = z.enum([
  'new',
  'assigned',
  'in_progress',
  'pending',
  'resolved',
  'closed',
  'transferred'
]);
export type ConversationStatus = z.infer<typeof ConversationStatusEnum>;

// ============ PRIORITY ============
export const PriorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);
export type Priority = z.infer<typeof PriorityEnum>;

// ============ AGENT STATUS ============
export const AgentStatusEnum = z.enum([
  'online',
  'offline',
  'busy',
  'away',
  'break',
  'email'
]);
export type AgentStatus = z.infer<typeof AgentStatusEnum>;

// ============ MESSAGE TYPE ============
export const MessageTypeEnum = z.enum([
  'text',
  'image',
  'video',
  'audio',
  'document',
  'location',
  'contact',
  'sticker',
  'template',
  'system'
]);
export type MessageType = z.infer<typeof MessageTypeEnum>;

// ============ MESSAGE DIRECTION ============
export const MessageDirectionEnum = z.enum(['inbound', 'outbound', 'internal']);
export type MessageDirection = z.infer<typeof MessageDirectionEnum>;

// ============ MESSAGE ============
export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  channel: ChannelEnum,
  type: MessageTypeEnum,
  direction: MessageDirectionEnum,
  content: z.object({
    text: z.string().optional(),
    mediaUrl: z.string().url().optional(),
    mediaType: z.string().optional(),
    caption: z.string().optional(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().optional()
    }).optional(),
    templateId: z.string().optional(),
    templateData: z.record(z.any()).optional()
  }),
  sender: z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    avatar: z.string().url().optional()
  }),
  metadata: z.object({
    messageId: z.string().optional(),
    deliveryStatus: z.enum(['sent', 'delivered', 'read', 'failed']).optional(),
    error: z.string().optional(),
    agentId: z.string().optional(),
    aiGenerated: z.boolean().default(false)
  }).optional(),
  timestamp: z.date(),
  createdAt: z.date()
});
export type Message = z.infer<typeof MessageSchema>;

// ============ CONVERSATION ============
export const ConversationSchema = z.object({
  id: z.string(),
  channel: ChannelEnum,
  status: ConversationStatusEnum,
  priority: PriorityEnum.default('normal'),

  // Participants
  customer: z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    avatar: z.string().url().optional(),
    metadata: z.record(z.any()).optional()
  }),
  assignedAgentId: z.string().optional(),
  assignedTeam: z.string().optional(),

  // Content
  subject: z.string().optional(),
  lastMessage: z.string().optional(),
  lastMessageAt: z.date().optional(),

  // Tags & Labels
  tags: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),

  // Stats
  messageCount: z.number().default(0),
  aiHandled: z.boolean().default(false),
  resolutionTime: z.number().optional(),

  // Context
  context: z.object({
    source: z.string().optional(),
    campaign: z.string().optional(),
    botId: z.string().optional(),
    flowId: z.string().optional(),
    pageUrl: z.string().url().optional(),
    userAgent: z.string().optional()
  }).optional(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  assignedAt: z.date().optional(),
  resolvedAt: z.date().optional(),
  closedAt: z.date().optional()
});
export type Conversation = z.infer<typeof ConversationSchema>;

// ============ AGENT ============
export const AgentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  role: z.enum(['agent', 'supervisor', 'admin']),
  status: AgentStatusEnum.default('offline'),
  teams: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  maxConcurrentChats: z.number().default(5),
  workingHours: z.object({
    start: z.string(),
    end: z.string(),
    timezone: z.string(),
    days: z.array(z.number()).optional()
  }).optional(),
  settings: z.object({
    autoAccept: z.boolean().default(false),
    soundNotifications: z.boolean().default(true),
    desktopNotifications: z.boolean().default(true),
    greeting: z.string().optional()
  }).optional(),
  stats: z.object({
    totalConversations: z.number().default(0),
    resolvedConversations: z.number().default(0),
    avgResponseTime: z.number().default(0),
    avgResolutionTime: z.number().default(0),
    csat: z.number().min(0).max(5).optional(),
    lastActiveAt: z.date().optional()
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type Agent = z.infer<typeof AgentSchema>;

// ============ TEAM ============
export const TeamSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  channels: z.array(ChannelEnum).default([]),
  skills: z.array(z.string()).optional(),
  autoAssign: z.boolean().default(true),
  maxQueueSize: z.number().default(50),
  routingRule: z.enum(['round_robin', 'least_busy', 'skills_based', 'weighted']).default('round_robin'),
  supervisorId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type Team = z.infer<typeof TeamSchema>;

// ============ QUEUE ITEM ============
export const QueueItemSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  channel: ChannelEnum,
  priority: PriorityEnum,
  assignedTeam: z.string(),
  estimatedWaitTime: z.number().optional(),
  customerWaitingSince: z.date(),
  position: z.number()
});
export type QueueItem = z.infer<typeof QueueItemSchema>;

// ============ WORKFLOW ============
export const WorkflowRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  })),
  actions: z.array(z.object({
    type: z.enum(['assign_agent', 'assign_team', 'add_tag', 'set_priority', 'send_message', 'webhook']),
    config: z.record(z.any())
  })),
  priority: z.number().default(0),
  active: z.boolean().default(true)
});
export type WorkflowRule = z.infer<typeof WorkflowRuleSchema>;

// ============ Canned RESPONSE ============
export const CannedResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  agentId: z.string().optional(),
  teamId: z.string().optional(),
  shortcut: z.string(),
  content: z.string(),
  description: z.string().optional(),
  channel: ChannelEnum.optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  usageCount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type CannedResponse = z.infer<typeof CannedResponseSchema>;

// ============ STATS ============
export const InboxStatsSchema = z.object({
  totalConversations: z.number(),
  activeConversations: z.number(),
  newConversations: z.number(),
  assignedConversations: z.number(),
  pendingConversations: z.number(),
  resolvedToday: z.number(),
  closedToday: z.number(),
  avgResponseTime: z.number(),
  avgResolutionTime: z.number(),
  csat: z.number().optional(),
  byChannel: z.record(z.number()),
  byStatus: z.record(z.number()),
  queueSize: z.number(),
  agentsOnline: z.number(),
  agentsBusy: z.number()
});
export type InboxStats = z.infer<typeof InboxStatsSchema>;
