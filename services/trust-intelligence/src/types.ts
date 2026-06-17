import { z } from 'zod';

// Entity Types
export type EntityType =
  | 'customer'
  | 'merchant'
  | 'agent'
  | 'vendor'
  | 'partner'
  | 'device';

// Trust Score Ranges
export type TrustLevel = 'critical' | 'low' | 'medium' | 'high' | 'excellent';

export interface TrustScore {
  _id?: string;
  entityId: string;
  entityType: EntityType;
  tenantId: string;
  score: number;
  level: TrustLevel;
  factors: TrustFactors;
  breakdown: ScoreBreakdown;
  lastUpdated: Date;
  nextReview: Date;
  history: TrustHistoryEntry[];
  linkedEntities: LinkedEntity[];
  riskFlags: string[];
  verified: boolean;
  verificationLevel: VerificationLevel;
}

export interface TrustFactors {
  transactionReliability: number;
  verificationStatus: number;
  behavioralPattern: number;
  historicalBehavior: number;
  networkTrust: number;
  riskIndicators: number;
  complianceScore: number;
}

export interface ScoreBreakdown {
  baseScore: number;
  transactionBonus: number;
  verificationBonus: number;
  behaviorBonus: number;
  historyBonus: number;
  networkBonus: number;
  penalties: number;
}

export interface TrustHistoryEntry {
  timestamp: Date;
  previousScore: number;
  newScore: number;
  changeReason: string;
  triggeredBy: string;
  factors: Partial<TrustFactors>;
}

export interface LinkedEntity {
  entityId: string;
  entityType: EntityType;
  relationship: 'parent' | 'child' | 'sibling' | 'related';
  trustInfluence: number;
  linkedAt: Date;
}

// Verification Types
export type VerificationMethod = 'kyc' | 'document' | 'biometric' | 'phone' | 'email' | 'bank' | 'social';
export type VerificationStatus = 'pending' | 'in_progress' | 'verified' | 'rejected' | 'expired';
export type VerificationLevel = 'none' | 'basic' | 'standard' | 'enhanced' | 'full';

export interface Verification {
  _id?: string;
  entityId: string;
  entityType: EntityType;
  tenantId: string;
  method: VerificationMethod;
  status: VerificationStatus;
  level: VerificationLevel;
  provider: string;
  referenceId?: string;
  data: Record<string, any>;
  score: number;
  expiresAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  documents?: VerificationDocument[];
  attempts: VerificationAttempt[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationDocument {
  type: string;
  url: string;
  verified: boolean;
  verifiedAt?: Date;
}

export interface VerificationAttempt {
  timestamp: Date;
  method: VerificationMethod;
  success: boolean;
  failureReason?: string;
  ipAddress?: string;
  deviceId?: string;
}

// Risk Flag Types
export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FlagStatus = 'active' | 'resolved' | 'dismissed' | 'escalated';

export interface RiskFlag {
  _id?: string;
  entityId: string;
  entityType: EntityType;
  tenantId: string;
  type: RiskFlagType;
  severity: FlagSeverity;
  status: FlagStatus;
  score: number;
  description: string;
  evidence: FlagEvidence[];
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  escalatedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RiskFlagType =
  | 'suspicious_transaction'
  | 'unusual_pattern'
  | 'address_mismatch'
  | 'velocity_exceeded'
  | 'geo_anomaly'
  | 'device_mismatch'
  | 'identity_discrepancy'
  | 'fraud_report'
  | 'chargeback'
  | 'policy_violation'
  | 'compliance_risk'
  | 'link_to_flagged';

export interface FlagEvidence {
  type: string;
  data: Record<string, any>;
  timestamp: Date;
  source: string;
}

// Fraud Detection
export interface FraudPattern {
  _id?: string;
  tenantId: string;
  name: string;
  type: string;
  conditions: FraudCondition[];
  severity: FlagSeverity;
  action: FraudAction;
  enabled: boolean;
  hitCount: number;
  lastTriggered?: Date;
  createdAt: Date;
}

export interface FraudCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'between';
  value: any;
}

export interface FraudAction {
  type: 'flag' | 'block' | 'review' | 'score_penalty';
  value?: number;
}

// Request/Response Types
export interface CalculateScoreRequest {
  entityId: string;
  entityType: EntityType;
  tenantId?: string;
  factors?: Partial<TrustFactors>;
}

export interface UpdateScoreRequest {
  entityId: string;
  entityType: EntityType;
  changeReason: string;
  triggeredBy: string;
  factors: Partial<TrustFactors>;
  penalty?: number;
}

export interface VerificationRequest {
  entityId: string;
  entityType: EntityType;
  method: VerificationMethod;
  data: Record<string, any>;
  tenantId?: string;
}

export interface CreateFlagRequest {
  entityId: string;
  entityType: EntityType;
  type: RiskFlagType;
  severity: FlagSeverity;
  description: string;
  evidence: FlagEvidence[];
  tenantId?: string;
}

// Zod Schemas
export const EntityTypeSchema = z.enum(['customer', 'merchant', 'agent', 'vendor', 'partner', 'device']);
export const TrustLevelSchema = z.enum(['critical', 'low', 'medium', 'high', 'excellent']);
export const VerificationMethodSchema = z.enum(['kyc', 'document', 'biometric', 'phone', 'email', 'bank', 'social']);
export const VerificationStatusSchema = z.enum(['pending', 'in_progress', 'verified', 'rejected', 'expired']);
export const FlagSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const FlagStatusSchema = z.enum(['active', 'resolved', 'dismissed', 'escalated']);

export const CalculateScoreRequestSchema = z.object({
  entityId: z.string().min(1),
  entityType: EntityTypeSchema,
  tenantId: z.string().optional(),
  factors: z.object({
    transactionReliability: z.number().optional(),
    verificationStatus: z.number().optional(),
    behavioralPattern: z.number().optional(),
    historicalBehavior: z.number().optional(),
    networkTrust: z.number().optional(),
    riskIndicators: z.number().optional(),
    complianceScore: z.number().optional(),
  }).optional(),
});

export const VerificationRequestSchema = z.object({
  entityId: z.string().min(1),
  entityType: EntityTypeSchema,
  method: VerificationMethodSchema,
  data: z.record(z.any()),
  tenantId: z.string().optional(),
});

export const CreateFlagRequestSchema = z.object({
  entityId: z.string().min(1),
  entityType: EntityTypeSchema,
  type: z.enum([
    'suspicious_transaction',
    'unusual_pattern',
    'address_mismatch',
    'velocity_exceeded',
    'geo_anomaly',
    'device_mismatch',
    'identity_discrepancy',
    'fraud_report',
    'chargeback',
    'policy_violation',
    'compliance_risk',
    'link_to_flagged',
  ]),
  severity: FlagSeveritySchema,
  description: z.string().min(1),
  evidence: z.array(z.object({
    type: z.string(),
    data: z.record(z.any()),
    timestamp: z.date(),
    source: z.string(),
  })),
  tenantId: z.string().optional(),
});

// API Response Types
export interface TrustScoreResponse {
  entityId: string;
  entityType: EntityType;
  score: number;
  level: TrustLevel;
  factors: TrustFactors;
  breakdown: ScoreBreakdown;
  verified: boolean;
  verificationLevel: VerificationLevel;
  riskFlags: string[];
  linkedEntities: number;
  lastUpdated: Date;
  nextReview: Date;
}

export interface VerificationResponse {
  id: string;
  entityId: string;
  method: VerificationMethod;
  status: VerificationStatus;
  level: VerificationLevel;
  score: number;
  verifiedAt?: Date;
  expiresAt?: Date;
}

export interface RiskFlagResponse {
  id: string;
  entityId: string;
  type: RiskFlagType;
  severity: FlagSeverity;
  status: FlagStatus;
  description: string;
  score: number;
  createdAt: Date;
}

export interface TrustTrendResponse {
  entityId: string;
  history: {
    timestamp: Date;
    score: number;
    level: TrustLevel;
  }[];
  trend: 'improving' | 'stable' | 'declining';
  averageChange: number;
}
