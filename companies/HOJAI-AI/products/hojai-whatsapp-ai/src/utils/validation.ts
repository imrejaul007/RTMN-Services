import { z } from 'zod';

// ============================================================================
// WEBHOOK VALIDATION SCHEMAS
// ============================================================================

/**
 * WhatsApp webhook message payload schema
 */
export const WhatsAppMessageSchema = z.object({
  messaging_product: z.string(),
  to: z.string().optional(),
  type: z.enum(['text', 'image', 'audio', 'video', 'document', 'location', 'contacts', 'interactive', 'template']),
  text: z.object({
    body: z.string().max(4096)
  }).optional(),
  recipient_type: z.string().optional()
});

/**
 * WhatsApp incoming webhook payload schema
 */
export const WhatsAppWebhookPayloadSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.string(),
        metadata: z.object({
          display_phone_number: z.string().optional(),
          phone_number_id: z.string()
        }),
        contacts: z.array(z.object({
          profile: z.object({
            name: z.string()
          }),
          wa_id: z.string()
        })).optional(),
        messages: z.array(z.object({
          from: z.string(),
          id: z.string(),
          timestamp: z.string(),
          type: z.string(),
          text: z.object({
            body: z.string()
          }).optional(),
          image: z.object({
            id: z.string().optional(),
            caption: z.string().optional(),
            mime_type: z.string().optional(),
            sha256: z.string().optional()
          }).optional(),
          audio: z.object({
            id: z.string().optional(),
            mime_type: z.string().optional(),
            file_size: z.string().optional()
          }).optional(),
          video: z.object({
            id: z.string().optional(),
            mime_type: z.string().optional(),
            file_size: z.string().optional()
          }).optional(),
          document: z.object({
            id: z.string().optional(),
            mime_type: z.string().optional(),
            filename: z.string().optional()
          }).optional(),
          location: z.object({
            latitude: z.number(),
            longitude: z.number(),
            name: z.string().optional(),
            address: z.string().optional()
          }).optional()
        })).optional(),
        statuses: z.array(z.object({
          id: z.string(),
          status: z.enum(['sent', 'delivered', 'read', 'failed']),
          timestamp: z.string(),
          recipient_id: z.string(),
          conversation: z.object({
            id: z.string().optional(),
            origin: z.object({
              type: z.string()
            }).optional()
          }).optional()
        })).optional()
      }),
      field: z.string()
    }))
  }))
});

/**
 * Validate WhatsApp webhook payload
 */
export function validateWhatsAppPayload(payload: unknown): {
  valid: boolean;
  data?: z.infer<typeof WhatsAppWebhookPayloadSchema>;
  error?: string;
} {
  try {
    const result = WhatsAppWebhookPayloadSchema.parse(payload);
    return { valid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      };
    }
    return { valid: false, error: 'Invalid payload structure' };
  }
}

// ============================================================================
// API REQUEST VALIDATION SCHEMAS
// ============================================================================

/**
 * Merchant registration schema
 */
export const MerchantRegistrationSchema = z.object({
  businessName: z.string().min(2).max(100),
  businessType: z.enum(['restaurant', 'retail', 'service', 'healthcare', 'other']),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().default('India')
  }).optional(),
  whatsappNumber: z.string().regex(/^\+?[1-9]\d{6,14}$/).optional(),
  timezone: z.string().default('Asia/Kolkata'),
  language: z.string().default('en')
});

/**
 * Message schema
 */
export const MessageSchema = z.object({
  content: z.string().min(1).max(4096),
  role: z.enum(['user', 'assistant', 'system']),
  metadata: z.record(z.any()).optional()
});

/**
 * Conversation schema
 */
export const ConversationSchema = z.object({
  customerId: z.string(),
  customerName: z.string().optional(),
  customerPhone: z.string().regex(/^\+?[1-9]\d{6,14}$/).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Session context schema
 */
export const SessionContextSchema = z.object({
  lastIntent: z.string().optional(),
  lastEntities: z.record(z.any()).optional(),
  collectedInfo: z.record(z.any()).optional(),
  language: z.string().optional(),
  preferredService: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional()
});

/**
 * AI response request schema
 */
export const AIResponseRequestSchema = z.object({
  merchantPersona: z.string().optional(),
  knowledgeBase: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })).optional(),
  userMessage: z.string().min(1).max(4096),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
  customerName: z.string().optional(),
  customerContext: z.record(z.any()).optional()
});

/**
 * Knowledge base item schema
 */
export const KnowledgeBaseItemSchema = z.object({
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(5000),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().default(true),
  priority: z.number().min(0).max(10).default(5)
});

/**
 * Automation rule schema
 */
export const AutomationRuleSchema = z.object({
  name: z.string().min(1).max(100),
  trigger: z.object({
    type: z.enum(['keyword', 'intent', 'time', 'event']),
    value: z.string(),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith']),
      value: z.string()
    })).optional()
  }),
  actions: z.array(z.object({
    type: z.enum(['reply', 'redirect', 'tag', 'webhook', 'ai']),
    config: z.record(z.any())
  })),
  active: z.boolean().default(true),
  priority: z.number().min(0).max(100).default(50)
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate data against a Zod schema
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { valid: true; data: z.infer<T> } | { valid: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
  return { valid: false, errors };
}

/**
 * Express middleware factory for request validation
 */
export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    const result = validate(schema, req.body);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        errors: (result as { valid: false; errors: string[] }).errors
      });
    }

    req.validatedBody = (result as { valid: true; data: z.infer<T> }).data;
    next();
  };
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    req.validatedQuery = result.data;
    next();
  };
}

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * ID parameter schema
 */
export const IdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format')
});

/**
 * Date range schema
 */
export const DateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
}).refine(data => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: 'startDate must be before or equal to endDate'
});