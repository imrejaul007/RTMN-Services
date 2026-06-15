// Trust Scorer Type Definitions
// Trust Score Calculation with 25/25/25/25 Weighted Formula

export type TrustTier = 'excellent' | 'good' | 'fair' | 'poor' | 'untrusted';

export type TrustEventType =
  | 'payment_completed'
  | 'payment_late'
  | 'payment_failed'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'dispute_lost'
  | 'delivery_completed'
  | 'delivery_failed'
  | 'delivery_returned'
  | 'account_created'
  | 'verification_completed'
  | 'review_received'
  | 'sla_met'
  | 'sla_breached'
  | 'contract_completed'
  | 'contract_breached';

// Trust score record for an entity
export interface TrustRecord {
  id: string;
  entityId: string; // agentId, userId, merchantId, etc.
  entityType: string; // 'agent', 'user', 'merchant', 'service'
  score: number; // 0-1000
  tier: TrustTier;
  components: TrustComponents;
  factors: TrustFactors;
  events: TrustEvent[];
  history: TrustHistoryEntry[];
  lastUpdated: string;
  lastCalculated: string;
  createdAt: string;
}

// The four main trust components (each 0-1000)
export interface TrustComponents {
  creditHistory: number; // 0-1000
  paymentHistory: number; // 0-1000
  disputeRate: number; // 0-1000 (inverse: lower disputes = higher score)
  deliverySuccess: number; // 0-1000
}

// Raw factors that feed into components
export interface TrustFactors {
  // Credit history factors
  accountAgeDays: number;
  firstTransactionDate?: string;
  totalTransactionVolume: number;
  totalTransactionCount: number;
  transactionTypeDiversity: number; // 0-10 different types

  // Payment history factors
  totalPayments: number;
  onTimePayments: number;
  latePayments: number;
  failedPayments: number;
  avgPaymentDaysEarly: number; // negative = late

  // Dispute factors
  totalDisputes: number;
  disputesWon: number;
  disputesLost: number;
  disputesPending: number;
  totalDisputeValue: number;

  // Delivery factors
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  returnedDeliveries: number;
  avgDeliveryDays: number;
  onTimeDeliveryRate: number; // 0-1

  // Verification and reviews
  verified: boolean;
  identityVerified: boolean;
  totalReviews: number;
  positiveReviews: number;
  negativeReviews: number;
  avgRating: number; // 0-5

  // SLA factors
  totalSLAs: number;
  slasMet: number;
  slasBreached: number;
}

// Individual trust event
export interface TrustEvent {
  id: string;
  entityId: string;
  type: TrustEventType;
  weight: number; // 0-1, how much this event affects score
  impact: number; // points change
  details: Record<string, any>;
  timestamp: string;
}

// Trust score history entry
export interface TrustHistoryEntry {
  timestamp: string;
  score: number;
  tier: TrustTier;
  change: number; // delta from previous
  reason: string;
}

// Trust calculation request
export interface TrustCalculationRequest {
  entityId: string;
  forceRecalculate?: boolean;
  includeEvents?: boolean;
  timeRange?: {
    start?: string;
    end?: string;
  };
}

// Trust calculation result
export interface TrustCalculationResult {
  entityId: string;
  score: number;
  tier: TrustTier;
  components: TrustComponents;
  factors: TrustFactors;
  scoreBreakdown: ScoreBreakdown;
  confidence: number; // 0-1, how confident we are in this score
  factors: TrustFactors;
  warnings: string[];
  calculatedAt: string;
}

// Detailed breakdown of score calculation
export interface ScoreBreakdown {
  creditHistory: ComponentBreakdown;
  paymentHistory: ComponentBreakdown;
  disputeRate: ComponentBreakdown;
  deliverySuccess: ComponentBreakdown;
  bonuses: BonusBreakdown;
  penalties: PenaltyBreakdown;
  finalScore: number;
}

export interface ComponentBreakdown {
  rawScore: number;
  weightedScore: number;
  subFactors: Record<string, number>;
  weight: number;
}

export interface BonusBreakdown {
  verificationBonus: number;
  reviewBonus: number;
  slaBonus: number;
  total: number;
}

export interface PenaltyBreakdown {
  disputePenalty: number;
  latePaymentPenalty: number;
  failedDeliveryPenalty: number;
  total: number;
}

// Trust event for API
export interface TrustEventRequest {
  entityId: string;
  type: TrustEventType;
  details?: Record<string, any>;
  weight?: number;
  timestamp?: string;
}

// Trust comparison request
export interface TrustComparisonRequest {
  entityIds: string[];
  includeFactors?: boolean;
}

// Trust comparison result
export interface TrustComparisonResult {
  comparisons: Array<{
    entityId: string;
    score: number;
    tier: TrustTier;
    rank: number;
  }>;
  calculatedAt: string;
}

// Trust recommendation
export interface TrustRecommendation {
  entityId: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  actions: RecommendedAction[];
}

export interface RecommendedAction {
  action: string;
  description: string;
  impact: number; // expected score improvement
  priority: 'high' | 'medium' | 'low';
}

// Trust audit log entry
export interface TrustAuditEntry {
  id: string;
  entityId: string;
  action: string;
  previousScore: number;
  newScore: number;
  reason: string;
  performedBy: string;
  timestamp: string;
}