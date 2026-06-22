// Trust Score Types for SUTAR Trust Score Service

/**
 * Trust levels representing the trustworthiness of an entity
 */
export enum TrustLevel {
  UNTRUSTED = "UNTRUSTED",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  PREMIUM = "PREMIUM"
}

/**
 * Trust factor types that contribute to the overall trust score
 */
export enum TrustFactorType {
  IDENTITY_VERIFICATION = "IDENTITY_VERIFICATION",
  TRANSACTION_HISTORY = "TRANSACTION_HISTORY",
  CONTRACT_COMPLIANCE = "CONTRACT_COMPLIANCE",
  NETWORK_REPUTATION = "NETWORK_REPUTATION",
  AGENT_PERFORMANCE = "AGENT_PERFORMANCE",
  IDENTITY_STABILITY = "IDENTITY_STABILITY",
  VERIFICATION_DEPTH = "VERIFICATION_DEPTH",
  NETWORK_CONNECTIONS = "NETWORK_CONNECTIONS",
  HISTORICAL_BEHAVIOR = "HISTORICAL_BEHAVIOR",
  RESPONSE_RATE = "RESPONSE_RATE"
}

/**
 * Badge types for trust verification
 */
export enum TrustBadgeType {
  VERIFIED_IDENTITY = "VERIFIED_IDENTITY",
  PREMIUM_MEMBER = "PREMIUM_MEMBER",
  EARLY_ADOPTER = "EARLY_ADOPTER",
  TOP_RATED = "TOP_RATED",
  COMPLIANCE_CHAMPION = "COMPLIANCE_CHAMPION",
  NETWORK_TRUSTED = "NETWORK_TRUSTED",
  LONG_STANDING = "LONG_STANDING",
  ZERO_DISPUTES = "ZERO_DISPUTES",
  SECURITY_CERTIFIED = "SECURITY_CERTIFIED",
  KYC_COMPLETED = "KYC_COMPLETED"
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = "INFO",
  WARNING = "WARNING",
  CRITICAL = "CRITICAL"
}

/**
 * Alert types for trust changes
 */
export enum AlertType {
  TRUST_SCORE_DROP = "TRUST_SCORE_DROP",
  TRUST_SCORE_RISE = "TRUST_SCORE_RISE",
  LEVEL_CHANGE = "LEVEL_CHANGE",
  NEW_BADGE_EARNED = "NEW_BADGE_EARNED",
  BADGE_REVOKED = "BADGE_REVOKED",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  THRESHOLD_BREACH = "THRESHOLD_BREACH"
}

/**
 * Entity types that can have trust scores
 */
export enum EntityType {
  AGENT = "AGENT",
  USER = "USER",
  ORGANIZATION = "ORGANIZATION",
  CONTRACT = "CONTRACT",
  TRANSACTION = "TRANSACTION",
  SERVICE = "SERVICE"
}

/**
 * Trust factor contribution to the overall score
 */
export interface TrustFactor {
  type: TrustFactorType;
  name: string;
  description: string;
  score: number;
  weight: number;
  contribution: number;
  lastUpdated: string;
  evidence: TrustFactorEvidence[];
}

export interface TrustFactorEvidence {
  type: string;
  value: string | number | boolean;
  timestamp: string;
  source: string;
}

/**
 * Trust score calculation result
 */
export interface TrustScore {
  entityId: string;
  entityType: EntityType;
  score: number;
  level: TrustLevel;
  factors: TrustFactor[];
  totalWeight: number;
  confidence: number;
  calculatedAt: string;
  expiresAt: string;
  previousScore?: number;
  scoreChange?: number;
}

/**
 * Trust history entry
 */
export interface TrustHistoryEntry {
  id: string;
  entityId: string;
  timestamp: string;
  score: number;
  level: TrustLevel;
  changeType: "INCREASE" | "DECREASE" | "STABLE" | "INITIAL";
  changeAmount: number;
  trigger: string;
  factors: TrustFactor[];
  notes?: string;
}

/**
 * Trust badge
 */
export interface TrustBadge {
  type: TrustBadgeType;
  name: string;
  description: string;
  earnedAt: string;
  expiresAt?: string;
  verified: boolean;
  issuer?: string;
  criteria: string;
  icon?: string;
}

/**
 * Trust recommendation
 */
export interface TrustRecommendation {
  id: string;
  priority: number;
  category: string;
  title: string;
  description: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  estimatedScoreGain: number;
  steps: string[];
  estimatedTime: string;
  requiredFactors: TrustFactorType[];
  completed: boolean;
  completedAt?: string;
}

/**
 * Trust alert configuration
 */
export interface TrustAlert {
  id: string;
  entityId: string;
  type: AlertType;
  severity: AlertSeverity;
  threshold?: number;
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
  notificationChannels: ("EMAIL" | "WEBHOOK" | "IN_APP")[];
  webhookUrl?: string;
  email?: string;
}

/**
 * Trust alert event
 */
export interface TrustAlertEvent {
  id: string;
  alertId: string;
  entityId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  previousValue?: number;
  newValue?: number;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

/**
 * Trust engine integration request
 */
export interface TrustEngineRequest {
  entityId: string;
  entityType: EntityType;
  action: "GET_SCORE" | "UPDATE_SCORE" | "VERIFY_IDENTITY" | "CHECK_NETWORK";
  metadata?: Record<string, unknown>;
}

/**
 * Trust engine integration response
 */
export interface TrustEngineResponse {
  success: boolean;
  data?: {
    score?: number;
    level?: TrustLevel;
    factors?: TrustFactor[];
    verified?: boolean;
  };
  error?: string;
  timestamp: string;
}

/**
 * Trust score summary for listing
 */
export interface TrustScoreSummary {
  entityId: string;
  entityType: EntityType;
  score: number;
  level: TrustLevel;
  badgesCount: number;
  lastUpdated: string;
}

/**
 * Trust statistics
 */
export interface TrustStatistics {
  totalEntities: number;
  averageScore: number;
  levelDistribution: Record<TrustLevel, number>;
  topFactors: Array<{ type: TrustFactorType; avgContribution: number }>;
  recentChanges: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Trust score calculation options
 */
export interface TrustScoreOptions {
  includeFactors?: boolean;
  includeHistory?: boolean;
  includeBadges?: boolean;
  calculateExpiry?: boolean;
  confidenceLevel?: number;
}

/**
 * Batch trust score request
 */
export interface BatchTrustScoreRequest {
  entityIds: string[];
  options?: TrustScoreOptions;
}

/**
 * Batch trust score response
 */
export interface BatchTrustScoreResponse {
  results: TrustScore[];
  failed: Array<{ entityId: string; error: string }>;
  processedAt: string;
}

/**
 * Trust score change notification
 */
export interface TrustScoreChangeNotification {
  entityId: string;
  previousScore: number;
  newScore: number;
  scoreChange: number;
  previousLevel: TrustLevel;
  newLevel: TrustLevel;
  triggeredFactors: TrustFactorType[];
  timestamp: string;
}

/**
 * Trust threshold configuration
 */
export interface TrustThreshold {
  level: TrustLevel;
  minScore: number;
  maxScore: number;
  color: string;
  description: string;
}

/**
 * Trust factor weights configuration
 */
export interface TrustFactorWeight {
  type: TrustFactorType;
  weight: number;
  description: string;
  minScore: number;
  maxScore: number;
}

/**
 * Trust calculation context
 */
export interface TrustCalculationContext {
  entityId: string;
  entityType: EntityType;
  timestamp: string;
  factors: Map<TrustFactorType, TrustFactor>;
  metadata: Record<string, unknown>;
}

/**
 * Trust decay configuration
 */
export interface TrustDecayConfig {
  enabled: boolean;
  decayRate: number;
  decayIntervalDays: number;
  minimumScore: number;
  factorsSubjectToDecay: TrustFactorType[];
}

/**
 * Trust verification request
 */
export interface TrustVerificationRequest {
  entityId: string;
  verificationType: "FULL" | "PARTIAL" | "EXPRESS";
  requiredBadges?: TrustBadgeType[];
  callbackUrl?: string;
}

/**
 * Trust verification result
 */
export interface TrustVerificationResult {
  verified: boolean;
  verificationId: string;
  entityId: string;
  verificationType: string;
  checksPassed: number;
  checksFailed: number;
  badgesVerified: TrustBadgeType[];
  verifiedAt: string;
  expiresAt: string;
}
