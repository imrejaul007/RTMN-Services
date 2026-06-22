import { z } from 'zod';

// ============ RCS PROVIDER ============
export const RCSProviderEnum = z.enum(['jio', 'airtel', 'vi', 'google']);
export type RCSProvider = z.infer<typeof RCSProviderEnum>;

// ============ RCS MESSAGE TYPE ============
export const RCSMessageTypeEnum = z.enum([
  'text',
  'image',
  'video',
  'audio',
  'document',
  'card',
  'carousel',
  'suggestion',
  'location'
]);
export type RCSMessageType = z.infer<typeof RCSMessageTypeEnum>;

// ============ RCS STATUS ============
export const RCSStatusEnum = z.enum([
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
  'undelivered'
]);
export type RCSStatus = z.infer<typeof RCSStatusEnum>;

// ============ RCS CARD ============
export const RCSCardSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(2000).optional(),
  mediaUrl: z.string().url().optional(),
  mediaMimeType: z.string().optional(),
  actions: z.array(z.object({
    id: z.string(),
    label: z.string().max(25),
    type: z.enum(['url', 'phone', 'reply', 'mapLocation', 'calendarEvent']),
    value: z.string()
  })).max(4)
});
export type RCSCard = z.infer<typeof RCSCardSchema>;

// ============ RCS CAROUSEL ============
export const RCSCarouselSchema = z.object({
  cards: z.array(RCSCardSchema).min(2).max(10),
  cardWidth: z.enum(['compact', 'standard', 'tall']).default('standard')
});
export type RCSCarousel = z.infer<typeof RCSCarouselSchema>;

// ============ RCS SUGGESTION ============
export const RCSSuggestionSchema = z.object({
  type: z.enum(['reply', 'url', 'phone', 'location', 'calendar']),
  label: z.string().max(25),
  value: z.string().optional()
});
export type RCSSuggestion = z.infer<typeof RCSSuggestionSchema>;

// ============ RCS LOCATION ============
export const RCSLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  label: z.string().max(100).optional(),
  address: z.string().max(500).optional()
});
export type RCSLocation = z.infer<typeof RCSLocationSchema>;

// ============ RCS MESSAGE ============
export const RCSMessageSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  provider: RCSProviderEnum,
  recipient: z.string(),
  type: RCSMessageTypeEnum,

  // Content
  text: z.string().max(4096).optional(),
  mediaUrl: z.string().url().optional(),
  mediaMimeType: z.string().optional(),
  mediaCaption: z.string().max(2000).optional(),

  // Structured content
  card: RCSCardSchema.optional(),
  carousel: RCSCarouselSchema.optional(),
  suggestions: z.array(RCSSuggestionSchema).max(11).optional(),
  location: RCSLocationSchema.optional(),

  // Brand
  brandId: z.string().optional(),
  brandName: z.string().optional(),

  // Tracking
  status: RCSStatusEnum.default('pending'),
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  readAt: z.date().optional(),
  failedAt: z.date().optional(),
  errorMessage: z.string().optional(),

  // Provider
  providerMessageId: z.string().optional(),

  // Metadata
  metadata: z.record(z.any()).optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});
export type RCSMessage = z.infer<typeof RCSMessageSchema>;

// ============ RCS BRAND ============
export const RCSBrandSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  description: z.string().max(500).optional(),
  website: z.string().url().optional(),
  vertical: z.enum([
    'RETAIL',
    'TRAVEL',
    'BANKING',
    'INSURANCE',
    'HEALTHCARE',
    'EDUCATION',
    'GOVERNMENT',
    'UTILITIES',
    'OTHER'
  ]),

  // Verification
  verified: z.boolean().default(false),
  verifiedAt: z.date().optional(),

  // Provider specific
  providerBrandIds: z.record(RCSProviderEnum, z.string()).optional(),

  // Settings
  enabled: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});
export type RCSBrand = z.infer<typeof RCSBrandSchema>;

// ============ RCS CAMPAIGN ============
export const RCSCampaignSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),

  // Content
  content: z.object({
    type: RCSMessageTypeEnum,
    text: z.string().optional(),
    mediaUrl: z.string().url().optional(),
    card: RCSCardSchema.optional(),
    carousel: RCSCarouselSchema.optional(),
    suggestions: z.array(RCSSuggestionSchema).optional()
  }),

  // Targeting
  segmentIds: z.array(z.string()),
  recipientCount: z.number().default(0),

  // Brand
  brandId: z.string(),

  // Scheduling
  scheduledAt: z.date().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),

  // Status
  status: z.enum(['draft', 'scheduled', 'sending', 'completed', 'paused', 'cancelled']).default('draft'),

  // Stats
  stats: z.object({
    sent: z.number().default(0),
    delivered: z.number().default(0),
    read: z.number().default(0),
    failed: z.number().default(0),
    clicked: z.number().default(0)
  }),

  createdAt: z.date(),
  updatedAt: z.date()
});
export type RCSCampaign = z.infer<typeof RCSCampaignSchema>;

// ============ RCS ANALYTICS ============
export const RCSAnalyticsSchema = z.object({
  tenantId: z.string(),
  brandId: z.string().optional(),
  provider: RCSProviderEnum.optional(),
  period: z.object({
    start: z.date(),
    end: z.date()
  }),

  overview: z.object({
    totalSent: z.number(),
    totalDelivered: z.number(),
    totalRead: z.number(),
    totalFailed: z.number(),
    deliveryRate: z.number(),
    readRate: z.number(),
    avgDeliveryTime: z.number()
  }),

  byProvider: z.record(RCSProviderEnum, z.object({
    sent: z.number(),
    delivered: z.number(),
    read: z.number()
  })),

  byMessageType: z.record(RCSMessageTypeEnum, z.object({
    sent: z.number(),
    delivered: z.number(),
    read: z.number()
  })),

  trends: z.array(z.object({
    date: z.date(),
    sent: z.number(),
    delivered: z.number(),
    read: z.number()
  }))
});
export type RCSAnalytics = z.infer<typeof RCSAnalyticsSchema>;
