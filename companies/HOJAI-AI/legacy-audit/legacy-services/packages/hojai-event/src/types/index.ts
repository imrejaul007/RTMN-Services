import { z } from 'zod';

// ============================================================================
// EVENT TYPES
// ============================================================================

export enum EventCategory {
  COMMERCE = 'commerce',
  IDENTITY = 'identity',
  LOYALTY = 'loyalty',
  ENGAGEMENT = 'engagement',
  INTELLIGENCE = 'intelligence',
  SUPPORT = 'support',
  MEDIA = 'media',
  NOTIFICATION = 'notification'
}

// Event types by category
export enum EventType {
  // Commerce events
  ORDER_PLACED = 'commerce.order_placed',
  ORDER_COMPLETED = 'commerce.order_completed',
  ORDER_CANCELLED = 'commerce.order_cancelled',
  ORDER_REFUNDED = 'commerce.order_refunded',
  PAYMENT_SUCCESS = 'commerce.payment_success',
  PAYMENT_FAILED = 'commerce.payment_failed',
  CART_CREATED = 'commerce.cart_created',
  CART_ABANDONED = 'commerce.cart_abandoned',
  CHECKOUT_STARTED = 'commerce.checkout_started',
  PRODUCT_VIEWED = 'commerce.product_viewed',
  SEARCH = 'commerce.search',

  // Identity events
  USER_REGISTERED = 'identity.registered',
  USER_LOGGED_IN = 'identity.logged_in',
  USER_LOGGED_OUT = 'identity.logged_out',
  IDENTITY_LINKED = 'identity.linked',

  // Loyalty events
  POINTS_EARNED = 'loyalty.points_earned',
  POINTS_REDEEMED = 'loyalty.points_redeemed',
  TIER_CHANGED = 'loyalty.tier_changed',

  // Engagement events
  PAGE_VIEW = 'engagement.page_view',
  QR_SCANNED = 'engagement.qr_scan',
  NOTIFICATION_SENT = 'engagement.notification_sent',
  NOTIFICATION_OPENED = 'engagement.notification_opened',

  // Intelligence events
  INTENT_DETECTED = 'intelligence.intent',
  CHURN_PREDICTED = 'intelligence.churn',
  LTV_CALCULATED = 'intelligence.ltv',
  SEGMENT_CHANGED = 'intelligence.segment',
  RECOMMENDATION_SHOWN = 'intelligence.recommendation',
  RECOMMENDATION_CLICKED = 'intelligence.recommendation_clicked',

  // Support events
  TICKET_CREATED = 'support.ticket_created',
  TICKET_RESOLVED = 'support.ticket_resolved',
  CSAT_RECEIVED = 'support.csat',

  // Media events
  AD_IMPRESSED = 'media.ad_impressed',
  AD_CLICKED = 'media.ad_clicked',
  AD_CONVERTED = 'media.ad_converted',

  // Notification events
  NOTIFICATION_DELIVERED = 'notification.delivered',
  NOTIFICATION_CLICKED = 'notification.clicked',
  NOTIFICATION_BOUNCED = 'notification.bounced'
}

// Schema for any event
export const EventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Event identification
  type: z.string(), // e.g., "commerce.order_placed"
  category: z.nativeEnum(EventCategory),
  name: z.string(),

  // Who/What
  userId: z.string().optional(),
  entityType: z.string().optional(), // "order", "product", "user"
  entityId: z.string().optional(),

  // When
  timestamp: z.date(),

  // Where
  source: z.string().optional(), // "web", "mobile", "api"
  sessionId: z.string().optional(),
  channel: z.string().optional(), // "whatsapp", "app", "website"

  // Location
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z.string().optional(),
    country: z.string().optional()
  }).optional(),

  // Event data
  properties: z.record(z.any()).optional(),
  metrics: z.record(z.number()).optional(),

  // Context
  context: z.object({
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    deviceType: z.string().optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
    referrer: z.string().optional()
  }).optional(),

  // Derived
  derivedFrom: z.string().uuid().optional(), // If this event was derived from another

  // Processing
  processed: z.boolean().default(false),
  processedAt: z.date().optional(),
  version: z.string().default('1.0')
});

export type Event = z.infer<typeof EventSchema>;

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

export enum SubscriptionProtocol {
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  KAFKA = 'kafka',
  REDIS = 'redis'
}

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  name: z.string(),
  description: z.string().optional(),

  // Event filters
  eventTypes: z.array(z.string()).optional(), // e.g., ["commerce.*", "identity.*"]
  eventCategories: z.array(z.nativeEnum(EventCategory)).optional(),
  userId: z.string().optional(), // Filter by specific user

  // Destination
  protocol: z.nativeEnum(SubscriptionProtocol),
  endpoint: z.string().url(), // URL for HTTP, WS endpoint, or Kafka topic

  // Auth for HTTP endpoints
  auth: z.object({
    type: z.enum(['bearer', 'api_key', 'basic']),
    token: z.string().optional(),
    apiKey: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional()
  }).optional(),

  // Configuration
  enabled: z.boolean().default(true),
  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().default(3),
  retryDelayMs: z.number().default(1000),

  // Filtering
  filter: z.record(z.any()).optional(), // Additional filter conditions

  createdAt: z.date(),
  updatedAt: z.date(),
  lastTriggeredAt: z.date().optional(),
  triggerCount: z.number().default(0)
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

// ============================================================================
// EVENT SCHEMA REGISTRY
// ============================================================================

export const EventSchemaDefinitionSchema = z.object({
  name: z.string(), // e.g., "commerce.order_placed"
  version: z.string().default('1.0'),
  tenantId: z.string().uuid().optional(), // null for global schemas

  // JSON Schema definition
  schema: z.record(z.any()),

  // Validation
  validationRules: z.array(z.object({
    field: z.string(),
    rule: z.string(),
    params: z.record(z.any()).optional()
  })).optional(),

  // Metadata
  description: z.string().optional(),
  examples: z.array(z.record(z.any())).optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type EventSchemaDefinition = z.infer<typeof EventSchemaDefinitionSchema>;

// ============================================================================
// DEAD LETTER QUEUE
// ============================================================================

export enum DLQReason {
  PARSING_ERROR = 'parsing_error',
  VALIDATION_ERROR = 'validation_error',
  SCHEMA_NOT_FOUND = 'schema_not_found',
  TENANT_NOT_FOUND = 'tenant_not_found',
  PROCESSING_ERROR = 'processing_error',
  SUBSCRIPTION_FAILED = 'subscription_failed',
  TIMEOUT = 'timeout'
}

export const DLQEntrySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Original event
  originalEvent: z.record(z.any()),
  eventType: z.string(),

  // Error info
  reason: z.nativeEnum(DLQReason),
  errorMessage: z.string(),
  errorStack: z.string().optional(),

  // Retry info
  retryCount: z.number().default(0),
  maxRetries: z.number().default(5),
  nextRetryAt: z.date().optional(),

  // Status
  status: z.enum(['pending', 'retrying', 'dead', 'resolved']),
  resolvedAt: z.date().optional(),
  resolvedBy: z.string().optional(),

  // Timestamps
  failedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type DLQEntry = z.infer<typeof DLQEntrySchema>;

// ============================================================================
// EVENT QUERY
// ============================================================================

export const EventQuerySchema = z.object({
  tenantId: z.string().uuid(),

  // Filters
  eventTypes: z.array(z.string()).optional(),
  eventCategories: z.array(z.nativeEnum(EventCategory)).optional(),
  userId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  source: z.string().optional(),

  // Time range
  startDate: z.date().optional(),
  endDate: z.date().optional(),

  // Pagination
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),

  // Sort
  sortBy: z.enum(['timestamp', 'createdAt']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type EventQuery = z.infer<typeof EventQuerySchema>;

// ============================================================================
// AGGREGATION
// ============================================================================

export const EventAggregationSchema = z.object({
  tenantId: z.string().uuid(),

  // Group by
  groupBy: z.array(z.string()), // e.g., ["type", "source"]

  // Metrics
  metrics: z.array(z.object({
    name: z.string(),
    field: z.string(),
    operation: z.enum(['count', 'sum', 'avg', 'min', 'max', 'countDistinct'])
  })),

  // Filters
  eventTypes: z.array(z.string()).optional(),
  userId: z.string().optional(),

  // Time range
  startDate: z.date(),
  endDate: z.date(),

  // Granularity (for time-based aggregation)
  granularity: z.enum(['minute', 'hour', 'day', 'week', 'month']).optional()
});

export type EventAggregation = z.infer<typeof EventAggregationSchema>;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { Event, Subscription, EventSchemaDefinition, DLQEntry };
