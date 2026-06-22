import { z } from 'zod';

// ============================================================================
// SIGNAL VALIDATION TYPES
// ============================================================================

export enum SignalQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  INVALID = 'invalid'
}

export enum ValidationAction {
  ACCEPT = 'accept',
  REJECT = 'reject',
  FLAG = 'flag',
  NORMALIZE = 'normalize',
  MERGE = 'merge',
  SPLIT = 'split'
}

export const EventSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string().optional(),
  deviceId: z.string().optional(),
  sessionId: z.string().optional(),

  // Core
  type: z.string(),
  category: z.string(),
  timestamp: z.string(),

  // Data
  properties: z.record(z.any()).optional(),
  metrics: z.record(z.number()).optional(),

  // Context
  source: z.string().optional(),
  channel: z.string().optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z.string().optional(),
    country: z.string().optional()
  }).optional()
});

export type Event = z.infer<typeof EventSchema>;

export const ValidatedSignalSchema = z.object({
  id: z.string().uuid(),
  originalEventId: z.string(),
  tenantId: z.string().uuid(),

  // Validation result
  quality: z.nativeEnum(SignalQuality),
  confidence: z.number().min(0).max(1),
  validationActions: z.array(z.nativeEnum(ValidationAction)),
  issues: z.array(z.object({
    type: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    message: z.string(),
    field: z.string().optional(),
    corrected: z.any().optional()
  })).optional(),

  // Normalized data
  normalizedEvent: Event,
  canonicalTimestamp: z.date(),
  canonicalUserId: z.string().optional(),

  // Identity resolution
  resolvedIdentity: z.object({
    primaryId: z.string(),
    linkedIds: z.array(z.string()).optional(),
    confidence: z.number()
  }).optional(),

  // Deduplication
  isDuplicate: z.boolean().default(false),
  duplicateOf: z.string().uuid().optional(),

  // Metadata
  processedAt: z.date(),
  processingDurationMs: z.number(),

  createdAt: z.date()
});

export type ValidatedSignal = z.infer<typeof ValidatedSignalSchema>;

// ============================================================================
// IDENTITY RESOLUTION TYPES
// ============================================================================

export const IdentitySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Primary identity
  primaryId: z.string(),

  // Linked identifiers
  identifiers: z.object({
    email: z.array(z.string()).optional(),
    phone: z.array(z.string()).optional(),
    deviceId: z.array(z.string()).optional(),
    sessionId: z.array(z.string()).optional(),
    externalId: z.record(z.array(z.string())).optional()
  }),

  // Resolution metadata
  resolution: z.object({
    method: z.enum(['exact', 'fuzzy', 'probabilistic', 'inferred']),
    confidence: z.number(),
    firstSeen: z.date(),
    lastSeen: z.date(),
    linkCount: z.number()
  }),

  // Graph connections
  graphLinks: z.array(z.object({
    identityId: z.string().uuid(),
    relationship: z.string(),
    strength: z.number(),
    verified: z.boolean()
  })).optional(),

  // Status
  status: z.enum(['active', 'merged', 'archived', 'flagged']),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Identity = z.infer<typeof IdentitySchema>;

// ============================================================================
// DEDUPLICATION TYPES
// ============================================================================

export const DeduplicationConfigSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Event types to dedupe
  eventTypes: z.array(z.string()),
  categories: z.array(z.string()).optional(),

  // Deduplication strategy
  strategy: z.enum(['exact', 'fuzzy', 'sliding_window', 'probabilistic']),

  // Keys to consider
  keys: z.array(z.enum(['userId', 'type', 'properties', 'sessionId', 'deviceId'])),

  // Time window (in ms)
  windowMs: z.number().default(5000),

  // Fuzzy matching config
  fuzzyConfig: z.object({
    enabled: z.boolean().default(false),
    threshold: z.number().min(0).max(1).default(0.8),
    fieldsToCompare: z.array(z.string())
  }).optional(),

  active: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type DeduplicationConfig = z.infer<typeof DeduplicationConfigSchema>;

// ============================================================================
// ANOMALY DETECTION TYPES
// ============================================================================

export const AnomalySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  type: z.enum([
    'velocity_spike',
    'impossible_sequence',
    'duplicate_burst',
    'schema_drift',
    'data_poisoning',
    'timing_anomaly',
    'geographic_impossible',
    'device_anomaly'
  ]),

  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),

  // Detection
  description: z.string(),
  affectedEvents: z.array(z.string()),
  eventCount: z.number(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),

  // Details
  details: z.record(z.any()),
  expectedValue: z.any().optional(),
  actualValue: z.any().optional(),
  deviation: z.number().optional(),

  // Status
  status: z.enum(['detected', 'investigating', 'resolved', 'false_positive', 'blocked']),
  resolvedAt: z.date().optional(),
  resolution: z.string().optional(),

  createdAt: z.date()
});

export type Anomaly = z.infer<typeof AnomalySchema>;

// ============================================================================
// QUALITY METRICS
// ============================================================================

export const QualityMetricsSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  timestamp: z.date(),

  // Volume metrics
  totalEvents: z.number(),
  validEvents: z.number(),
  invalidEvents: z.number(),
  flaggedEvents: z.number(),

  // Quality distribution
  qualityDistribution: z.object({
    excellent: z.number(),
    good: z.number(),
    fair: z.number(),
    poor: z.number(),
    invalid: z.number()
  }),

  // Issue breakdown
  issues: z.object({
    duplicates: z.number(),
    malformed: z.number(),
    timing: z.number(),
    schema: z.number(),
    identity: z.number(),
    anomalies: z.number()
  }),

  // Latency
  avgProcessingMs: z.number(),
  p99ProcessingMs: z.number(),

  createdAt: z.date()
});

export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;
