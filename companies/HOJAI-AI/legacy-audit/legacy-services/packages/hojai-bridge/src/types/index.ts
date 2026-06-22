import { z } from 'zod';

// ============================================================================
// BRIDGE TYPES
// ============================================================================

export enum TenantType {
  REZ_ECOSYSTEM = 'rez_ecosystem',
  RABTUL_SAAS = 'rabtul_saas',
  EXTERNAL = 'external'
}

export enum DataSensitivity {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted'
}

export const BridgeConfigSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  tenantType: z.nativeEnum(TenantType),

  // REZ Ecosystem connection
  rezEnabled: z.boolean().default(false),
  rezTenantId: z.string().optional(),
  crossAppDataEnabled: z.boolean().default(false),

  // Data sharing
  shareEventsToRez: z.boolean().default(false),
  receiveEventsFromRez: z.boolean().default(false),

  // Intelligence sharing
  sharePredictions: z.boolean().default(false),
  shareBehavioralSignals: z.boolean().default(false),
  shareAudienceSegments: z.boolean().default(false),

  // Trust graph
  shareTrustScores: z.boolean().default(false),
  receiveTrustScores: z.boolean().default(false),

  active: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type BridgeConfig = z.infer<typeof BridgeConfigSchema>;

// ============================================================================
// CROSS-APP IDENTITY
// ============================================================================

export const CrossAppIdentitySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // REZ unified ID
  rezUserId: z.string(),
  rezUnifiedId: z.string().optional(),

  // App-specific IDs
  appIds: z.record(z.string()), // e.g., { 'rez-app': 'user_123', 'rez-ride': 'driver_456' }

  // Link metadata
  linkMethod: z.enum(['exact', 'fuzzy', 'probabilistic', 'manual']),
  linkConfidence: z.number().min(0).max(1),

  // Last activity across apps
  lastActivity: z.record(z.string()), // e.g., { 'rez-app': '2026-05-27', 'rez-ride': '2026-05-26' }

  createdAt: z.date(),
  updatedAt: z.date()
});

export type CrossAppIdentity = z.infer<typeof CrossAppIdentitySchema>;

// ============================================================================
// BRIDGE EVENT
// ============================================================================

export const BridgeEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  tenantType: z.nativeEnum(TenantType),

  // Source
  source: z.enum(['hojai', 'rez_intelligence', 'rez_ecosystem']),
  sourceService: z.string(),
  sourceApp: z.string().optional(),

  // Event data
  event: z.object({
    type: z.string(),
    category: z.string(),
    data: z.record(z.any()),
    timestamp: z.string()
  }),

  // Routing
  routeTo: z.array(z.enum(['hojai', 'rez_intelligence', 'rez_ecosystem'])),
  routingStatus: z.enum(['pending', 'forwarded', 'filtered', 'failed']),

  // Privacy
  sensitivity: z.nativeEnum(DataSensitivity),
  piiFields: z.array(z.string()).optional(),

  // Processing
  processedAt: z.date().optional(),
  error: z.string().optional(),

  createdAt: z.date()
});

export type BridgeEvent = z.infer<typeof BridgeEventSchema>;

// ============================================================================
// INTELLIGENCE SHARING
// ============================================================================

export const IntelligenceShareSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Type of intelligence
  type: z.enum([
    'prediction',
    'segment',
    'behavioral_signal',
    'trust_score',
    'intent',
    'churn_risk',
    'ltv_score',
    'audience'
  ]),

  // Direction
  direction: z.enum(['hojai_to_rez', 'rez_to_hojai']),

  // Data
  entityType: z.string(), // 'user', 'merchant', 'product'
  entityId: z.string(),
  data: z.record(z.any()),

  // Metadata
  confidence: z.number().min(0).max(1),
  source: z.string(),
  model: z.string().optional(),

  createdAt: z.date()
});

export type IntelligenceShare = z.infer<typeof IntelligenceShareSchema>;

// ============================================================================
// AUDIENCE SYNC
// ============================================================================

export const AudienceSyncSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Audience
  audienceId: z.string(),
  audienceName: z.string(),
  audienceType: z.enum(['behavioral', 'demographic', 'predictive', 'rfm']),

  // Users in audience
  userCount: z.number(),
  userSample: z.array(z.string()).max(100),

  // Sync settings
  syncEnabled: z.boolean().default(false),
  syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly']),

  // Last sync
  lastSyncedAt: z.date().optional(),
  syncStatus: z.enum(['pending', 'syncing', 'synced', 'failed']),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type AudienceSync = z.infer<typeof AudienceSyncSchema>;

// ============================================================================
// CROSS-APP ATTRIBUTION
// ============================================================================

export const CrossAppAttributionSchema = z.object({
  id: z.string().uuid(),

  // User journey
  userId: z.string(),
  sessionId: z.string(),

  // Touchpoints across apps
  touchpoints: z.array(z.object({
    app: z.string(),
    event: z.string(),
    timestamp: z.string(),
    channel: z.string().optional(),
    campaign: z.string().optional(),
    conversionValue: z.number().optional()
  })),

  // Attribution model
  model: z.enum(['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based']),

  // Results
  attributedApp: z.string(),
  attributedChannel: z.string().optional(),
  attributedConversion: z.number().optional(),

  createdAt: z.date()
});

export type CrossAppAttribution = z.infer<typeof CrossAppAttributionSchema>;

// ============================================================================
// PRIVILEGED ACCESS (REZ-ONLY)
// ============================================================================

export const PrivilegedAccessSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  tenantType: z.enum([TenantType.REZ_ECOSYSTEM]),

  // What REZ can access
  accessScope: z.object({
    crossAppIdentity: z.boolean().default(true),
    behavioralSignals: z.boolean().default(true),
    mobilityPatterns: z.boolean().default(true),
    commerceHistory: z.boolean().default(true),
    loyaltyData: z.boolean().default(true),
    predictionModels: z.boolean().default(true)
  }),

  // What tenant can access from REZ
  rezAccess: z.object({
    crossAppSegments: z.boolean().default(true),
    ecosystemTrends: z.boolean().default(true),
    unifiedProfiles: z.boolean().default(true)
  }),

  active: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type PrivilegedAccess = z.infer<typeof PrivilegedAccessSchema>;
