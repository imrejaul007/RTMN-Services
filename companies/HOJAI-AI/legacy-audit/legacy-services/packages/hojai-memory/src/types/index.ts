import { z } from 'zod';

// ============================================================================
// MEMORY TYPES
// ============================================================================

/**
 * Memory Tiers - Hojai Flow Memory Architecture
 *
 * L1: Working Memory - Current conversation, immediate context
 * L2: Episodic Memory - Recent events (24h), session history
 * L3: Procedural Memory - How-tos, instructions, learned behaviors
 * L4: Semantic Memory - Facts, preferences, structured knowledge
 * L5: World Knowledge - External knowledge, common sense, general info
 */
export enum MemoryTier {
  L1_WORKING = 'l1_working',       // Current conversation context
  L2_EPISODIC = 'l2_episodic',     // Recent 24h events
  L3_PROCEDURAL = 'l3_procedural',  // Instructions, how-tos
  L4_SEMANTIC = 'l4_semantic',     // Facts, preferences
  L5_WORLD = 'l5_world'             // External knowledge
}

export enum MemoryType {
  INTERACTION = 'interaction',
  PREFERENCE = 'preference',
  BEHAVIOR = 'behavior',
  CONTEXT = 'context',
  KNOWLEDGE = 'knowledge',
  CONVERSATION = 'conversation'
}

export enum MemoryConfidence {
  LOW = 0.3,
  MEDIUM = 0.6,
  HIGH = 0.85,
  CERTAIN = 1.0
}

export const MemorySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Who this memory belongs to
  userId: z.string(),
  entityType: z.enum(['user', 'merchant', 'product', 'session']),
  entityId: z.string(),

  // Memory content
  type: z.nativeEnum(MemoryType),
  content: z.string(),

  // Structured data
  data: z.record(z.any()).optional(),

  // Importance and confidence
  importance: z.number().min(0).max(10).default(5),
  confidence: z.number().min(0).max(1).default(0.7),

  // Source
  source: z.string().optional(), // 'event', 'conversation', 'manual'
  eventId: z.string().uuid().optional(),

  // Memory Tier (Hojai Flow Architecture)
  tier: z.nativeEnum(MemoryTier).default(MemoryTier.L4_SEMANTIC),

  // Context
  context: z.object({
    channel: z.string().optional(),
    location: z.string().optional(),
    time: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional(),

  // Temporal
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),

  // Access
  isPrivate: z.boolean().default(false),
  sharedWith: z.array(z.string()).optional(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  lastAccessedAt: z.date().optional(),
  accessCount: z.number().default(0)
});

export type Memory = z.infer<typeof MemorySchema>;

// Add tier field to memory schema
export const MemoryWithTierSchema = MemorySchema.extend({
  tier: z.nativeEnum(MemoryTier).default(MemoryTier.L4_SEMANTIC)
});

export type MemoryWithTier = z.infer<typeof MemoryWithTierSchema>;

// ============================================================================
// MEMORY TIER CONFIGURATION
// ============================================================================

export interface MemoryTierConfig {
  tier: MemoryTier;
  name: string;
  description: string;
  ttl: number; // Time to live in ms
  maxItems: number; // Max items to retrieve
  priority: number; // Retrieval priority (1 = highest)
  storage: 'memory' | 'redis' | 'mongodb';
}

export const MEMORY_TIER_CONFIG: Record<MemoryTier, MemoryTierConfig> = {
  [MemoryTier.L1_WORKING]: {
    tier: MemoryTier.L1_WORKING,
    name: 'Working Memory',
    description: 'Current conversation context',
    ttl: 5 * 60 * 1000, // 5 minutes
    maxItems: 20,
    priority: 1,
    storage: 'memory'
  },
  [MemoryTier.L2_EPISODIC]: {
    tier: MemoryTier.L2_EPISODIC,
    name: 'Episodic Memory',
    description: 'Recent 24h events',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxItems: 100,
    priority: 2,
    storage: 'redis'
  },
  [MemoryTier.L3_PROCEDURAL]: {
    tier: MemoryTier.L3_PROCEDURAL,
    name: 'Procedural Memory',
    description: 'Instructions, how-tos',
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxItems: 50,
    priority: 3,
    storage: 'mongodb'
  },
  [MemoryTier.L4_SEMANTIC]: {
    tier: MemoryTier.L4_SEMANTIC,
    name: 'Semantic Memory',
    description: 'Facts, preferences',
    ttl: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxItems: 200,
    priority: 4,
    storage: 'mongodb'
  },
  [MemoryTier.L5_WORLD]: {
    tier: MemoryTier.L5_WORLD,
    name: 'World Knowledge',
    description: 'External knowledge',
    ttl: -1, // Never expires
    maxItems: 500,
    priority: 5,
    storage: 'mongodb'
  }
};

// ============================================================================
// TIMELINE TYPES
// ============================================================================

export const TimelineEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string(),

  // Event data
  type: z.string(), // 'order_placed', 'login', 'preference_updated'
  category: z.string(),
  timestamp: z.date(),

  // Content
  title: z.string(),
  description: z.string().optional(),
  data: z.record(z.any()).optional(),

  // Related entities
  entityType: z.string().optional(),
  entityId: z.string().optional(),

  // Impact
  impact: z.enum(['positive', 'negative', 'neutral']).optional(),
  value: z.number().optional(), // Monetary value if applicable

  // Memory links
  memoryIds: z.array(z.string().uuid()).optional(),

  createdAt: z.date()
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export const ContextSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string(),

  // Session context
  sessionId: z.string().optional(),
  channel: z.enum(['whatsapp', 'app', 'web', 'api', 'voice']).default('app'),
  intent: z.string().optional(),

  // Location context
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    timezone: z.string().optional()
  }).optional(),

  // Time context
  time: z.object({
    hour: z.number(),
    dayOfWeek: z.number(),
    isWeekend: z.boolean(),
    isHoliday: z.boolean().optional()
  }),

  // Device context
  device: z.object({
    type: z.enum(['mobile', 'tablet', 'desktop', 'voice']),
    os: z.string().optional(),
    browser: z.string().optional()
  }).optional(),

  // Recent history (last N events)
  recentEvents: z.array(z.object({
    type: z.string(),
    timestamp: z.date(),
    data: z.record(z.any()).optional()
  })).max(50),

  // Active preferences at this moment
  activePreferences: z.record(z.any()).optional(),

  // Custom context
  custom: z.record(z.any()).optional(),

  createdAt: z.date(),
  expiresAt: z.date()
});

export type Context = z.infer<typeof ContextSchema>;

// ============================================================================
// PROFILE TYPES
// ============================================================================

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Identity
  userId: z.string().optional(), // External user ID
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),

  // Demographics
  demographics: z.object({
    age: z.number().optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    language: z.string().default('en'),
    locale: z.string().default('en-US')
  }).optional(),

  // Preferences
  preferences: z.object({
    language: z.string().optional(),
    notifications: z.boolean().default(true),
    timezone: z.string().optional(),
    currency: z.string().default('INR')
  }),

  // Computed
  computed: z.object({
    loyaltyTier: z.string().optional(),
    lifetimeValue: z.number().default(0),
    visitFrequency: z.enum(['daily', 'weekly', 'monthly', 'rarely']).default('monthly'),
    preferredChannel: z.string().optional(),
    lastActiveAt: z.date().optional(),
    firstSeenAt: z.date().optional()
  }),

  // Stats
  stats: z.object({
    totalOrders: z.number().default(0),
    totalSpent: z.number().default(0),
    averageOrderValue: z.number().default(0),
    ordersThisMonth: z.number().default(0)
  }),

  // Tags
  tags: z.array(z.string()).default([]),
  segments: z.array(z.string()).default([]),

  // Privacy
  consent: z.object({
    marketing: z.boolean().default(false),
    analytics: z.boolean().default(true),
    dataProcessing: z.boolean().default(true)
  }),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Profile = z.infer<typeof ProfileSchema>;

// ============================================================================
// VECTOR MEMORY TYPES
// ============================================================================

export const VectorMemorySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Entity
  entityType: z.enum(['user', 'merchant', 'product', 'conversation', 'knowledge']),
  entityId: z.string(),

  // Vector
  vector: z.array(z.number()), // Embedding vector
  model: z.string().default('openai'),

  // Content
  content: z.string(), // Original text
  metadata: z.record(z.any()).optional(),

  // Index
  collection: z.string().default('default'),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type VectorMemory = z.infer<typeof VectorMemorySchema>;

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export const ConversationMessageSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),

  // Who
  role: z.enum(['user', 'assistant', 'system']),
  userId: z.string().optional(),

  // Content
  content: z.string(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'document', 'link']),
    url: z.string(),
    metadata: z.record(z.any()).optional()
  })).optional(),

  // AI metadata
  aiMetadata: z.object({
    model: z.string().optional(),
    tokens: z.number().optional(),
    confidence: z.number().optional(),
    intent: z.string().optional()
  }).optional(),

  // Feedback
  feedback: z.object({
    rating: z.number().min(1).max(5).optional(),
    helpful: z.boolean().optional(),
    corrections: z.string().optional()
  }).optional(),

  createdAt: z.date().optional()
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// MemoryTier, MemoryWithTier, MemoryTierConfig, and MEMORY_TIER_CONFIG are already exported above
