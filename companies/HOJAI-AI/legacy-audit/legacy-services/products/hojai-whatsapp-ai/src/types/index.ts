import { z } from 'zod';

export const WhatsAppMessageSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  to: z.string(),
  type: z.enum(['text', 'image', 'document', 'audio', 'video', 'template', 'interactive']),
  text: z.object({
    preview_url: z.boolean().optional(),
    body: z.string()
  }).optional(),
  image: z.object({
    id: z.string().optional(),
    link: z.string().optional(),
    caption: z.string().optional()
  }).optional(),
  template: z.object({
    name: z.string(),
    language: z.object({ code: z.string() }),
    components: z.array(z.any()).optional()
  }).optional(),
  interactive: z.object({
    type: z.enum(['button', 'list_reply', 'product', 'product_list']),
    header: z.any().optional(),
    body: z.object({ text: z.string() }),
    footer: z.any().optional(),
    actions: z.any()
  }).optional()
});

export type WhatsAppMessage = z.infer<typeof WhatsAppMessageSchema>;

export const WebhookPayloadSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.literal('whatsapp'),
        metadata: z.object({
          display_phone_number: z.string(),
          phone_number_id: z.string()
        }),
        contacts: z.array(z.object({
          profile: z.object({ name: z.string() }),
          wa_id: z.string()
        })).optional(),
        messages: z.array(z.any()).optional()
      }),
      field: z.string()
    }))
  }))
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  merchantId: z.string().uuid(),
  customerId: z.string(),
  customerName: z.string().optional(),
  customerPhone: z.string(),
  channel: z.literal('whatsapp'),
  status: z.enum(['active', 'waiting', 'resolved', 'escalated']),
  context: z.record(z.any()).optional(),
  lastMessageAt: z.date(),
  messageCount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  merchantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  messageId: z.string(), // WhatsApp message ID
  direction: z.enum(['inbound', 'outbound']),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  type: z.enum(['text', 'image', 'document', 'audio', 'video', 'template', 'button', 'location']),
  mediaUrl: z.string().optional(),
  intent: z.string().optional(),
  confidence: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date()
});

export type Message = z.infer<typeof MessageSchema>;

export const BusinessProfileSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  merchantId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  address: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  timezone: z.string().default('Asia/Kolkata'),
  language: z.string().default('en'),
  businessHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional()
  }).optional(),
  features: z.object({
    ordering: z.boolean().default(false),
    booking: z.boolean().default(false),
    support: z.boolean().default(true),
    catalog: z.boolean().default(false),
    feedback: z.boolean().default(false)
  }),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;

export const KnowledgeBaseItemSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  merchantId: z.string().uuid(),
  category: z.string(),
  question: z.string(),
  answer: z.string(),
  keywords: z.array(z.string()).optional(),
  intents: z.array(z.string()).optional(),
  confidence: z.number().default(0.8),
  usageCount: z.number().default(0),
  helpfulCount: z.number().default(0),
  notHelpfulCount: z.number().default(0),
  active: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type KnowledgeBaseItem = z.infer<typeof KnowledgeBaseItemSchema>;

export const AutomationRuleSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  merchantId: z.string().uuid(),
  name: z.string(),
  trigger: z.object({
    type: z.enum(['keyword', 'intent', 'time', 'event', ' inactivity']),
    config: z.record(z.any())
  }),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'greater_than', 'less_than']),
    value: z.any()
  })).optional(),
  actions: z.array(z.object({
    type: z.enum(['reply', 'template', 'tag', 'assign', 'webhook', 'workflow']),
    config: z.record(z.any())
  })),
  priority: z.number().default(0),
  active: z.boolean().default(true),
  stats: z.object({
    triggers: z.number().default(0),
    success: z.number().default(0),
    failures: z.number().default(0)
  }).optional(),
  createdAt: z.date()
});

export type AutomationRule = z.infer<typeof AutomationRuleSchema>;
