import { z } from 'zod';

// ============================================================================
// CONSENT TYPES
// ============================================================================

export enum ConsentType {
  DATA_COLLECTION = 'data_collection',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  AI_PROCESSING = 'ai_processing',
  AI_TRAINING = 'ai_training',
  DATA_SHARING = 'data_sharing',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  PROFILING = 'profiling',
  AUTOMATED_DECISIONS = 'automated_decisions',
  LOCATION_TRACKING = 'location_tracking'
}

export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired',
  PENDING = 'pending'
}

export enum ConsentSource {
  EXPLICIT = 'explicit',     // User clicked accept
  IMPLIED = 'implied',       // User continued using service
  LEGAL = 'legal',           // Legal obligation
  CONTRACT = 'contract'       // Contractual necessity
}

export const ConsentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string(),

  // What consent is for
  type: z.nativeEnum(ConsentType),

  // Who gave consent
  source: z.nativeEnum(ConsentSource),

  // Status
  status: z.nativeEnum(ConsentStatus).default(ConsentStatus.PENDING),

  // Details
  version: z.string(),              // Consent policy version
  description: z.string(),           // What they're consenting to
  dataCategories: z.array(z.string()), // e.g., ['behavior', 'location', 'purchase_history']

  // Granularity
  scope: z.object({
    scope: z.enum(['global', 'tenant', 'service', 'specific']),
    services: z.array(z.string()).optional(),
    dataTypes: z.array(z.string()).optional()
  }),

  // Purpose limitation
  purpose: z.string(),               // e.g., "improve_recommendations"
  purposeDescription: z.string(),

  // Duration
  validFrom: z.date(),
  validUntil: z.date().optional(),

  // Withdrawal
  canWithdraw: z.boolean().default(true),
  withdrawalMethod: z.string().optional(),

  // Audit
  grantedAt: z.date().optional(),
  grantedIP: z.string().optional(),
  grantedUserAgent: z.string().optional(),
  withdrawnAt: z.date().optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Consent = z.infer<typeof ConsentSchema>;

// ============================================================================
// DATA RIGHTS TYPES
// ============================================================================

export enum DataRightType {
  ACCESS = 'access',           // Right to access their data
  RECTIFICATION = 'rectification', // Right to correct errors
  ERASURE = 'erasure',       // Right to delete ("right to be forgotten")
  RESTRICTION = 'restriction', // Right to restrict processing
  PORTABILITY = 'portability', // Right to data portability
  OBJECTION = 'objection',     // Right to object to processing
  HUMAN_REVIEW = 'human_review', // Right to human review of automated decisions
  EXPLAIN = 'explain'          // Right to explanation
}

export enum DataRightStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  DENIED = 'denied',
  PARTIAL = 'partial',
  FULFILLED = 'fulfilled',
  EXPIRED = 'expired'
}

export const DataRightRequestSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string(),

  type: z.nativeEnum(DataRightType),

  status: z.nativeEnum(DataRightStatus).default(DataRightStatus.PENDING),

  // Request details
  description: z.string(),
  requestedData: z.array(z.string()).optional(), // Specific data requested
  reason: z.string().optional(),

  // For erasure requests
  cascadeDelete: z.boolean().default(false), // Also delete from third parties?
  retentionOverride: z.boolean().default(false), // Override legal retention

  // For objection requests
  objectionTo: z.string().optional(), // Processing being objected to

  // Processing
  assignedTo: z.string().optional(),     // Employee handling it
  dueDate: z.date().optional(),

  // Response
  responseData: z.record(z.any()).optional(),
  responseAt: z.date().optional(),
  responseBy: z.string().optional(),

  // Fulfillment
  fulfilledAt: z.date().optional(),
  fulfillmentMethod: z.enum(['download', 'deletion', 'correction', 'restriction_applied']).optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type DataRightRequest = z.infer<typeof DataRightRequestSchema>;

// ============================================================================
// DATA RETENTION POLICIES
// ============================================================================

export enum RetentionPolicy {
  ACTIVE_USER = 'active_user',           // Keep while account active
  INACTIVE_USER = 'inactive_user',         // Keep X months after last activity
  TRANSACTION = 'transaction',           // Keep X years for legal compliance
  CONSENT_BASED = 'consent_based',         // Keep only while consent valid
  LEGAL_HOLD = 'legal_hold',             // Never delete (legal)
  ANONYMIZED = 'anonymized'               // Anonymize after X months
}

export const RetentionPolicySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  name: z.string(),
  description: z.string(),

  // What data category this applies to
  dataCategory: z.string(), // e.g., 'behavior', 'transaction', 'location'

  // Policy
  policy: z.nativeEnum(RetentionPolicy),

  // Duration (in days)
  retentionDays: z.number().optional(),

  // Trigger
  trigger: z.enum(['consent_valid', 'last_activity', 'account_closed', 'manual', 'legal_requirement']).optional(),

  // Actions at expiry
  expiryAction: z.enum(['delete', 'anonymize', 'restrict', 'archive', 'review']),

  // Legal compliance
  legalBasis: z.string().optional(), // GDPR, CCPA, DPDPA, etc.
  legalBasisArticle: z.string().optional(), // e.g., "GDPR Article 6(1)(a)"

  active: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type RetentionPolicyDoc = z.infer<typeof RetentionPolicySchema>;

// ============================================================================
// DATA CATEGORIES
// ============================================================================

export enum DataCategory {
  PERSONAL = 'personal',             // Name, email, phone
  FINANCIAL = 'financial',           // Payment info, transactions
  BEHAVIORAL = 'behavioral',         // Browsing, clicks, preferences
  LOCATION = 'location',             // GPS, visit history
  BIOMETRIC = 'biometric',           // Fingerprint, face (highly sensitive)
  HEALTH = 'health',               // Medical, health records
  CHILDREN = 'children',           // Data about children (very sensitive)
  COMMUNICATION = 'communication',  // Messages, calls
  SOCIAL = 'social',               // Social connections
  PROFESSIONAL = 'professional',   // Employment, education
  CONSUMPTION = 'consumption',     // Purchase history, habits
  DEVICE = 'device'               // Device IDs, technical data
}

export const DataCategorySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  category: z.nativeEnum(DataCategory),

  // Sensitivity level (1-5, 5 = highest)
  sensitivityLevel: z.number().min(1).max(5).default(1),

  // Legal classification
  legalClassification: z.enum(['public', 'personal', 'sensitive', 'special']),

  // Required protections
  requiredProtections: z.array(z.enum([
    'encryption_at_rest',
    'encryption_in_transit',
    'access_logging',
    'audit_trail',
    'consent_required',
    'legal_basis_required',
    'dpo_approval',
    'breach_notification',
    'impact_assessment'
  ])),

  // Sharing rules
  sharingRules: z.object({
    canShareWithProcessors: z.boolean().default(true),
    canShareWithThirdParties: z.boolean().default(false),
    requiresConsent: z.boolean().default(true),
    requiresLegalBasis: z.boolean().default(true)
  }),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type DataCategoryDoc = z.infer<typeof DataCategorySchema>;

// ============================================================================
// AUDIT & COMPLIANCE
// ============================================================================

export const ComplianceAuditSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  // What happened
  event: z.string(),
  category: z.enum(['consent', 'data_right', 'retention', 'breach', 'transfer', 'security']),

  // Who was affected
  userId: z.string().optional(),
  dataCategories: z.array(z.string()),

  // Details
  action: z.string(),
  result: z.enum(['success', 'failure', 'partial']),

  // Legal
  legalBasis: z.string().optional(),
  gdprArticle: z.string().optional(),

  // Technical
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),

  // Metadata
  processedBy: z.string().optional(),
  processingPurpose: z.string().optional(),

  createdAt: z.date()
});

export type ComplianceAudit = z.infer<typeof ComplianceAuditSchema>;

// ============================================================================
// POLICY RULES
// ============================================================================

export const PolicyRuleSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  name: z.string(),
  description: z.string(),

  // Priority (higher = evaluated first)
  priority: z.number().default(0),

  // Conditions
  conditions: z.object({
    dataCategory: z.array(z.nativeEnum(DataCategory)).optional(),
    consentStatus: z.array(z.nativeEnum(ConsentStatus)).optional(),
    userSegment: z.array(z.string()).optional(),
    processingType: z.array(z.string()).optional()
  }),

  // Action
  action: z.enum(['allow', 'deny', 'require_consent', 'require_review', 'restrict', 'mask', 'anonymize']),

  // Enforcement
  enforcement: z.object({
    immediate: z.boolean().default(true),
    gracePeriodDays: z.number().default(0),
    notificationRequired: z.boolean().default(false)
  }),

  // Override
  canOverride: z.boolean().default(false),
  overrideRoles: z.array(z.string()).optional(),

  active: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;
