import { z } from 'zod';

// ============ CHANNEL ============
export const ChannelEnum = z.enum(['whatsapp', 'sms', 'email', 'push', 'voice', 'instagram', 'telegram']);
export type Channel = z.infer<typeof ChannelEnum>;

// ============ MESSAGE STATUS ============
export const MessageStatusEnum = z.enum(['pending', 'queued', 'sent', 'delivered', 'read', 'failed', 'undelivered']);
export type MessageStatus = z.infer<typeof MessageStatusEnum>;

// ============ MESSAGE PRIORITY ============
export const MessagePriorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);
export type MessagePriority = z.infer<typeof MessagePriorityEnum>;

// ============ CAMPAIGN STATUS ============
export const CampaignStatusEnum = z.enum(['draft', 'scheduled', 'sending', 'completed', 'paused', 'cancelled']);
export type CampaignStatus = z.infer<typeof CampaignStatusEnum>;

// ============ TEMPLATE STATUS ============
export const TemplateStatusEnum = z.enum(['active', 'inactive', 'archived']);
export type TemplateStatus = z.infer<typeof TemplateStatusEnum>;

// ============ MESSAGE ============
export const MessageSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  channel: ChannelEnum,
  recipient: z.string(),
  sender: z.string().optional(),
  type: z.enum(['transactional', 'marketing', 'notification', 'alert']),
  priority: MessagePriorityEnum.default('normal'),

  // Content
  subject: z.string().optional(),
  body: z.string(),
  htmlBody: z.string().optional(),
  previewText: z.string().max(100).optional(),

  // Media
  media: z.object({
    type: z.enum(['image', 'video', 'audio', 'document']),
    url: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    caption: z.string().optional(),
    filename: z.string().optional()
  }).optional(),

  // Template
  templateId: z.string().optional(),
  templateVariables: z.record(z.union([z.string(), z.number()])).optional(),

  // Tracking
  status: MessageStatusEnum.default('pending'),
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  readAt: z.date().optional(),
  failedAt: z.date().optional(),
  errorMessage: z.string().optional(),

  // Provider
  providerMessageId: z.string().optional(),
  provider: z.string().optional(),

  // Scheduling
  scheduledAt: z.date().optional(),

  // Metadata
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),

  // Cost
  cost: z.number().optional(),
  currency: z.string().default('INR'),

  // Tracking
  opened: z.boolean().default(false),
  clicked: z.boolean().default(false),
  conversionTracked: z.boolean().default(false),

  createdAt: z.date(),
  updatedAt: z.date()
});
export type Message = z.infer<typeof MessageSchema>;

// ============ TEMPLATE ============
export const TemplateSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  channel: ChannelEnum,
  category: z.enum([
    'welcome',
    'onboarding',
    'transaction',
    'marketing',
    'notification',
    'reminder',
    'alert',
    'survey',
    'feedback',
    'promotional'
  ]),

  // Content
  subject: z.string().optional(),
  body: z.string(),
  htmlBody: z.string().optional(),

  // Variables
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'date', 'boolean']),
    required: z.boolean().default(false),
    defaultValue: z.string().optional(),
    description: z.string().optional()
  })),

  // Settings
  status: TemplateStatusEnum.default('active'),
  isDefault: z.boolean().default(false),

  // WhatsApp specific
  whatsappHeader: z.string().optional(),
  whatsappFooter: z.string().optional(),
  whatsappButtons: z.array(z.object({
    id: z.string(),
    text: z.string()
  })).optional(),

  // Email specific
  emailFromName: z.string().optional(),
  emailReplyTo: z.string().email().optional(),

  // Stats
  usageCount: z.number().default(0),
  lastUsedAt: z.date().optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});
export type Template = z.infer<typeof TemplateSchema>;

// ============ CAMPAIGN ============
export const CampaignSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  channel: ChannelEnum,

  // Content
  templateId: z.string().optional(),
  subject: z.string().optional(),
  body: z.string(),
  media: z.object({
    type: z.enum(['image', 'video', 'audio', 'document']),
    url: z.string().url()
  }).optional(),

  // Targeting
  segmentIds: z.array(z.string()),
  recipientCount: z.number().default(0),
  excludeRecipientIds: z.array(z.string()).optional(),

  // Filters
  filters: z.object({
    tags: z.array(z.string()).optional(),
    excludeTags: z.array(z.string()).optional(),
    lastActiveDays: z.number().optional(),
    signupDateAfter: z.date().optional()
  }).optional(),

  // Scheduling
  status: CampaignStatusEnum.default('draft'),
  scheduledAt: z.date().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),

  // A/B Testing
  abTest: z.object({
    enabled: z.boolean().default(false),
    variants: z.array(z.object({
      id: z.string(),
      name: z.string(),
      body: z.string(),
      weight: z.number()
    })).optional(),
    winner: z.string().optional()
  }).optional(),

  // Stats
  stats: z.object({
    sent: z.number().default(0),
    delivered: z.number().default(0),
    failed: z.number().default(0),
    opened: z.number().default(0),
    clicked: z.number().default(0),
    converted: z.number().default(0),
    unsubscribed: z.number().default(0),
    complained: z.number().default(0)
  }),

  // Cost
  totalCost: z.number().optional(),
  costPerMessage: z.number().optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});
export type Campaign = z.infer<typeof CampaignSchema>;

// ============ SUBSCRIBER ============
export const SubscriberSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string().optional(),

  // Contact
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsappId: z.string().optional(),
  deviceToken: z.string().optional(),

  // Preferences
  channels: z.array(ChannelEnum).default(['email']),
  subscribed: z.boolean().default(true),
  unsubscribedAt: z.date().optional(),
  unsubscribedChannels: z.array(ChannelEnum).optional(),

  // Tags
  tags: z.array(z.string()),
  segments: z.array(z.string()),

  // Stats
  totalMessagesReceived: z.number().default(0),
  lastMessageAt: z.date().optional(),
  lastOpenedAt: z.date().optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});
export type Subscriber = z.infer<typeof SubscriberSchema>;

// ============ CHANNEL CONFIG ============
export const ChannelConfigSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  channel: ChannelEnum,

  // WhatsApp
  whatsappPhoneNumber: z.string().optional(),
  whatsappBusinessAccountId: z.string().optional(),
  whatsappAccessToken: z.string().optional(),

  // SMS
  smsProvider: z.enum(['twilio', 'msg91', 'plivo', 'textlocal']).optional(),
  smsApiKey: z.string().optional(),
  smsSenderId: z.string().optional(),

  // Email
  emailProvider: z.enum(['sendgrid', 'mailgun', 'ses', 'smtp']).optional(),
  emailApiKey: z.string().optional(),
  emailFromAddress: z.string().email().optional(),
  emailFromName: z.string().optional(),

  // Push
  fcmServerKey: z.string().optional(),
  apnsCertPath: z.string().optional(),

  // Voice
  voiceProvider: z.enum(['twilio', 'nexmo']).optional(),
  voiceApiKey: z.string().optional(),

  // Settings
  enabled: z.boolean().default(true),
  webhooks: z.object({
    delivery: z.string().url().optional(),
    open: z.string().url().optional(),
    click: z.string().url().optional()
  }).optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});
export type ChannelConfig = z.infer<typeof ChannelConfigSchema>;

// ============ STATISTICS ============
export const ChannelStatsSchema = z.object({
  tenantId: z.string(),
  channel: ChannelEnum,
  period: z.object({
    start: z.date(),
    end: z.date()
  }),
  metrics: z.object({
    sent: z.number(),
    delivered: z.number(),
    failed: z.number(),
    opened: z.number(),
    clicked: z.number(),
    unsubscribed: z.number(),
    complained: z.number(),
    deliveryRate: z.number(),
    openRate: z.number(),
    clickRate: z.number()
  }),
  cost: z.object({
    total: z.number(),
    byType: z.record(z.number())
  })
});
export type ChannelStats = z.infer<typeof ChannelStatsSchema>;
