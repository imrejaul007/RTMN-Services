import { z } from 'zod';

export enum EntityType {
  MERCHANT = 'merchant',
  CUSTOMER = 'customer',
  SERVICE_PROVIDER = 'service_provider',
  GIG_WORKER = 'gig_worker',
  COMMUNITY = 'community',
  PRODUCT = 'product',
  BRAND = 'brand'
}

export enum TrustLevel {
  UNVERIFIED = 'unverified',
  BASIC = 'basic',
  VERIFIED = 'verified',
  TRUSTED = 'trusted',
  ELITE = 'elite'
}

export const TrustScoreSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  entityType: z.nativeEnum(EntityType),
  entityId: z.string(),

  // Scores (0-100)
  overallScore: z.number().min(0).max(100),
  reliabilityScore: z.number().min(0).max(100),
  qualityScore: z.number().min(0).max(100),
  responsivenessScore: z.number().min(0).max(100),
  deliveryScore: z.number().min(0).max(100),

  // Trust level
  trustLevel: z.nativeEnum(TrustLevel),

  // Factors
  factors: z.object({
    positiveReviews: z.number().default(0),
    negativeReviews: z.number().default(0),
    totalTransactions: z.number().default(0),
    avgRating: z.number().min(0).max(5).default(0),
    responseRate: z.number().min(0).max(100).default(0),
    deliveryRate: z.number().min(0).max(100).default(0),
    disputeRate: z.number().min(0).max(100).default(0),
    verifiedBadges: z.array(z.string()).default([]),
    tenure: z.number().default(0), // days
    volumeScore: z.number().min(0).max(100).default(0)
  }),

  // Recency
  lastUpdated: z.date(),
  scoreHistory: z.array(z.object({
    date: z.date(),
    score: z.number()
  })).max(30), // Keep 30 days of history

  createdAt: z.date(),
  updatedAt: z.date()
});

export type TrustScore = z.infer<typeof TrustScoreSchema>;

export const VerificationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  entityType: z.nativeEnum(EntityType),
  entityId: z.string(),

  type: z.enum([
    'identity',
    'business',
    'address',
    'phone',
    'email',
    'bank_account',
    'document',
    'social',
    'kyc'
  ]),
  status: z.enum(['pending', 'verified', 'rejected', 'expired']),
  level: z.enum(['basic', 'standard', 'enhanced', 'premium']),

  provider: z.string().optional(),
  externalId: z.string().optional(),
  verifiedAt: z.date().optional(),
  expiresAt: z.date().optional(),

  metadata: z.record(z.any()).optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Verification = z.infer<typeof VerificationSchema>;

export const ReviewSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Reviewer
  reviewerId: z.string(),
  reviewerType: z.nativeEnum(EntityType),

  // Reviewed entity
  entityId: z.string(),
  entityType: z.nativeEnum(EntityType),

  // Rating (1-5)
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  content: z.string().optional(),

  // Categories
  categories: z.record(z.number().min(1).max(5)).optional(), // e.g., { quality: 5, delivery: 4 }

  // Attributes
  isVerified: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  orderId: z.string().optional(),
  transactionValue: z.number().optional(),

  // Feedback
  helpful: z.number().default(0),
  unhelpful: z.number().default(0),

  // Response
  response: z.object({
    content: z.string(),
    respondedAt: z.date(),
    respondedBy: z.string()
  }).optional(),

  status: z.enum(['published', 'hidden', 'flagged', 'disputed']),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Review = z.infer<typeof ReviewSchema>;

export const TrustEdgeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Nodes
  sourceType: z.nativeEnum(EntityType),
  sourceId: z.string(),
  targetType: z.nativeEnum(EntityType),
  targetId: z.string(),

  // Relationship
  relationship: z.enum([
    'customer_of',
    'partner_with',
    'employee_of',
    'supplier_of',
    'member_of',
    'endorsed_by',
    'referred',
    'blocked',
    'flagged'
  ]),

  // Strength (0-1)
  strength: z.number().min(0).max(1),

  // Verification
  isVerified: z.boolean().default(false),
  verifiedAt: z.date().optional(),

  // Last interaction
  lastInteraction: z.date().optional(),
  interactionCount: z.number().default(0),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type TrustEdge = z.infer<typeof TrustEdgeSchema>;

export const BadgeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  name: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),

  criteria: z.object({
    minTransactions: z.number().optional(),
    minRating: z.number().optional(),
    minTrustScore: z.number().optional(),
    requiredVerifications: z.array(z.string()).optional(),
    maxDisputeRate: z.number().optional()
  }),

  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),

  active: z.boolean().default(true),

  createdAt: z.date()
});

export type Badge = z.infer<typeof BadgeSchema>;
