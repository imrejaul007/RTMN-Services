import { z } from 'zod';

// ============ MESSAGE TYPES ============
export const WhatsAppMessageTypeEnum = z.enum([
  'text',
  'image',
  'video',
  'audio',
  'document',
  'sticker',
  'location',
  'contacts',
  'template',
  'interactive'
]);
export type WhatsAppMessageType = z.infer<typeof WhatsAppMessageTypeEnum>;

// ============ INTERACTIVE TYPES ============
export const InteractiveTypeEnum = z.enum([
  'button',
  'list',
  'product',
  'product_list'
]);
export type InteractiveType = z.infer<typeof InteractiveTypeEnum>;

// ============ TEMPLATE STATUS ============
export const TemplateStatusEnum = z.enum([
  'pending',
  'approved',
  'rejected',
  'pending_deletion',
  'deleted'
]);
export type TemplateStatus = z.enum<typeof TemplateStatusEnum>;

// ============ SENT MESSAGE ============
export const SendMessageSchema = z.object({
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  type: WhatsAppMessageTypeEnum,
  text: z.object({
    body: z.string().max(4096)
  }).optional(),
  image: z.object({
    link: z.string().url().optional(),
    id: z.string().optional(),
    caption: z.string().max(1024).optional()
  }).optional(),
  video: z.object({
    link: z.string().url().optional(),
    id: z.string().optional(),
    caption: z.string().max(1024).optional()
  }).optional(),
  audio: z.object({
    link: z.string().url().optional(),
    id: z.string().optional()
  }).optional(),
  document: z.object({
    link: z.string().url().optional(),
    id: z.string().optional(),
    caption: z.string().max(1024).optional(),
    filename: z.string().optional(),
    mimeType: z.string().optional()
  }).optional(),
  sticker: z.object({
    link: z.string().url().optional(),
    id: z.string().optional()
  }).optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string().optional(),
    address: z.string().optional()
  }).optional(),
  contacts: z.array(z.object({
    name: z.object({
      firstName: z.string(),
      lastName: z.string().optional(),
      formattedName: z.string().optional()
    }),
    phones: z.array(z.object({
      phone: z.string(),
      type: z.string().optional(),
      waId: z.string().optional()
    })),
    emails: z.array(z.object({
      email: z.string(),
      type: z.string().optional()
    })).optional()
  })).optional(),
  template: z.object({
    name: z.string(),
    language: z.object({
      code: z.string().default('en')
    }),
    components: z.array(z.any()).optional()
  }).optional(),
  interactive: z.object({
    type: InteractiveTypeEnum,
    header: z.object({
      type: z.enum(['text', 'image', 'video']),
      text: z.string().optional(),
      image: z.object({ link: z.string() }).optional(),
      video: z.object({ link: z.string() }).optional()
    }).optional(),
    body: z.object({
      text: z.string().max(1024)
    }),
    footer: z.object({
      text: z.string().max(60)
    }).optional(),
    header: z.any().optional()
  }).optional()
});
export type SendMessage = z.infer<typeof SendMessageSchema>;

// ============ WEBHOOK EVENT ============
export const WebhookEventSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.string(),
        metadata: z.object({
          display_phone_number: z.string(),
          phone_number_id: z.string()
        }),
        contacts: z.array(z.object({
          profile: z.object({
            name: z.string()
          }),
          wa_id: z.string()
        })).optional(),
        messages: z.array(z.any()).optional(),
        statuses: z.array(z.any()).optional()
      }),
      field: z.string()
    }))
  }))
});
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

// ============ INCOMING MESSAGE ============
export const IncomingMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  timestamp: z.string(),
  type: WhatsAppMessageTypeEnum,
  text: z.object({
    body: z.string()
  }).optional(),
  image: z.object({
    id: z.string(),
    mimeType: z.string(),
    sha256: z.string(),
    caption: z.string().optional()
  }).optional(),
  video: z.object({
    id: z.string(),
    mimeType: z.string(),
    sha256: z.string()
  }).optional(),
  audio: z.object({
    id: z.string(),
    mimeType: z.string(),
    sha256: z.string()
  }).optional(),
  document: z.object({
    id: z.string(),
    mimeType: z.string(),
    sha256: z.string(),
    filename: z.string()
  }).optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string().optional(),
    address: z.string().optional()
  }).optional(),
  context: z.object({
    from: z.string(),
    id: z.string()
  }).optional(),
  interactive: z.any().optional()
});
export type IncomingMessage = z.infer<typeof IncomingMessageSchema>;

// ============ MESSAGE STATUS ============
export const MessageStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['sent', 'delivered', 'read', 'failed', 'pending']),
  timestamp: z.string(),
  recipient_id: z.string(),
  conversation: z.object({
    id: z.string(),
    origin: z.object({
      type: z.enum(['user_initiated', 'business_initiated'])
    })
  }).optional(),
  pricing: z.object({
    billable: z.boolean(),
    pricing_model: z.enum(['CBP', 'NBP']),
    category: z.string()
  }).optional()
});
export type MessageStatus = z.infer<typeof MessageStatusSchema>;

// ============ TEMPLATE ============
export const TemplateSchema = z.object({
  name: z.string(),
  language: z.string(),
  status: TemplateStatusEnum,
  category: z.enum([
    'ACCOUNT_UPDATE',
    'APPOINTMENT_UPDATE',
    'ISSUE_RESOLUTION',
    'PAYMENT_UPDATE',
    'PERSONAL_FINANCE_UPDATE',
    'RESERVATION_UPDATE',
    'SHIPPING_UPDATE',
    'TICKET_UPDATE',
    'TRANSPORTATION_UPDATE',
    'VERIFICATION',
    'MARKETING',
    'UTILITY'
  ]),
  components: z.array(z.any()),
  sample: z.string().optional(),
  rejectedReason: z.string().optional()
});
export type Template = z.infer<typeof TemplateSchema>;
