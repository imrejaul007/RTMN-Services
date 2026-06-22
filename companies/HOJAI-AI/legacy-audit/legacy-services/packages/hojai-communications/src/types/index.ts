import { z } from 'zod';

export enum Channel {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  WHATSAPP = 'whatsapp'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  BOUNCED = 'bounced'
}

export const MessageSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  channel: z.nativeEnum(Channel),
  direction: z.enum(['inbound', 'outbound']),

  from: z.string(),
  to: z.string(),

  subject: z.string().optional(),
  body: z.string(),
  templateId: z.string().optional(),
  variables: z.record(z.string()).optional(),

  status: z.nativeEnum(MessageStatus).default(MessageStatus.PENDING),
  externalId: z.string().optional(),
  externalStatus: z.string().optional(),

  metadata: z.record(z.any()).optional(),

  scheduledAt: z.date().optional(),
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  readAt: z.date().optional(),

  error: z.string().optional(),
  errorCode: z.string().optional(),

  cost: z.number().optional(),
  segments: z.number().optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Message = z.infer<typeof MessageSchema>;

export const TemplateSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  channel: z.nativeEnum(Channel),

  content: z.object({
    subject: z.string().optional(),
    body: z.string(),
    buttons: z.array(z.object({
      id: z.string(),
      text: z.string(),
      url: z.string().optional()
    })).optional(),
    imageUrl: z.string().optional()
  }),

  variables: z.array(z.string()),

  status: z.enum(['draft', 'active', 'archived']).default('active'),

  stats: z.object({
    sent: z.number().default(0),
    delivered: z.number().default(0),
    read: z.number().default(0),
    bounced: z.number().default(0)
  }).optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Template = z.infer<typeof TemplateSchema>;

export const CampaignSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),

  channel: z.nativeEnum(Channel),
  templateId: z.string().uuid(),

  audience: z.object({
    type: z.enum(['segment', 'list', 'filter']),
    id: z.string().optional(),
    criteria: z.record(z.any()).optional()
  }),

  schedule: z.object({
    type: z.enum(['immediate', 'scheduled', 'recurring']),
    sendAt: z.date().optional(),
    recurring: z.object({
      frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
      days: z.array(z.number()).optional(),
      time: z.string().optional()
    }).optional()
  }),

  settings: z.object({
    dedupe: z.boolean().default(true),
    allowDuplicates: z.boolean().default(false),
    cap: z.number().optional(),
    randomize: z.boolean().default(false)
  }),

  status: z.enum(['draft', 'scheduled', 'running', 'paused', 'completed', 'failed']).default('draft'),

  stats: z.object({
    total: z.number().default(0),
    sent: z.number().default(0),
    delivered: z.number().default(0),
    read: z.number().default(0),
    clicked: z.number().default(0),
    bounced: z.number().default(0),
    failed: z.number().default(0)
  }).optional(),

  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Campaign = z.infer<typeof CampaignSchema>;

export const WebhookPayloadSchema = z.object({
  event: z.enum(['sent', 'delivered', 'read', 'bounced', 'failed', 'clicked']),
  messageId: z.string(),
  externalId: z.string().optional(),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional()
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
