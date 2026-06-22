import { z } from 'zod';

export const ChannelType = z.enum(['whatsapp', 'email', 'instagram', 'web', 'chat']);
export type ChannelType = z.infer<typeof ChannelType>;

export const ConversationStatus = z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed']);
export type ConversationStatus = z.infer<typeof ConversationStatus>;

export const Priority = z.enum(['low', 'medium', 'high', 'urgent']);
export type Priority = z.infer<typeof Priority>;

export const MessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  sender: z.enum(['customer', 'agent', 'system', 'bot']),
  senderId: z.string().optional(),
  senderName: z.string().optional(),
  timestamp: z.date(),
  attachments: z.array(z.object({
    id: z.string(),
    type: z.string(),
    url: z.string(),
    name: z.string(),
  })).optional(),
  read: z.boolean().default(false),
});

export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.string(),
  channel: ChannelType,
  customerId: z.string(),
  customerName: z.string(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  customerAvatar: z.string().optional(),
  assignedAgent: z.string().optional(),
  assignedAgentName: z.string().optional(),
  status: ConversationStatus.default('open'),
  priority: Priority.default('medium'),
  subject: z.string().optional(),
  tags: z.array(z.string()).default([]),
  messages: z.array(MessageSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
  slaDeadline: z.date().optional(),
  resolvedAt: z.date().optional(),
  sourceService: z.string(),
  sourceConversationId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const AgentStatsSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  activeConversations: z.number(),
  resolvedToday: z.number(),
  avgResponseTime: z.number(),
  avgResolutionTime: z.number(),
  satisfactionScore: z.number().optional(),
});

export type AgentStats = z.infer<typeof AgentStatsSchema>;

export const QueueItemSchema = z.object({
  channel: ChannelType,
  count: z.number(),
  avgWaitTime: z.number(),
});

export type QueueItem = z.infer<typeof QueueItemSchema>;

export const SLAStatsSchema = z.object({
  total: z.number(),
  withinSLA: z.number(),
  breached: z.number(),
  breachRate: z.number(),
  avgResolutionTime: z.number(),
});

export type SLAStats = z.infer<typeof SLAStatsSchema>;

export const DashboardAnalyticsSchema = z.object({
  totalConversations: z.number(),
  openConversations: z.number(),
  resolvedToday: z.number(),
  avgResponseTime: z.number(),
  avgResolutionTime: z.number(),
  channelBreakdown: z.record(ChannelType, z.number()),
  priorityBreakdown: z.record(Priority, z.number()),
  slaStats: SLAStatsSchema,
});

export type DashboardAnalytics = z.infer<typeof DashboardAnalyticsSchema>;

export interface ConversationCreateInput {
  channel: ChannelType;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  subject?: string;
  initialMessage?: string;
  sourceService: string;
  sourceConversationId: string;
  metadata?: Record<string, unknown>;
}

export interface ReplyInput {
  content: string;
  attachments?: Array<{ type: string; url: string; name: string }>;
}
