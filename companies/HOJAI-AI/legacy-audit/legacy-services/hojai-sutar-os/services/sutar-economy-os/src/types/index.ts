/**
 * SUTAR Economy OS - Type Definitions
 * Layer 10: Karma points, earnings, and transactions
 */

// ============================================
// Karma Types
// ============================================

export type KarmaTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type KarmaAction =
  | 'contract_signed'
  | 'negotiation_completed'
  | 'decision_made'
  | 'referral'
  | 'contribution'
  | 'milestone'
  | 'streak'
  | 'bonus'
  | 'penalty'
  | 'refund';

export interface IKarmaTierInfo {
  tier: KarmaTier;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  benefits: string[];
  multiplier: number;
}

export interface IKarmaPointConfig {
  [action: string]: {
    basePoints: number;
    tierMultipliers: {
      [tier in KarmaTier]: number;
    };
  };
}

export interface IKarmaHistory {
  historyId: string;
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  action: KarmaAction;
  points: number;
  pointsBefore: number;
  pointsAfter: number;
  tier: KarmaTier;
  tierBefore: string;
  tierAfter: string;
  reason: string;
  metadata?: Record<string, unknown>;
  sourceService?: string;
  referenceId?: string;
  createdAt: Date;
}

export interface IKarma {
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  points: number;
  tier: KarmaTier;
  lifetimePoints: number;
  spentPoints: number;
  availablePoints: number;
  lastEarnedAt?: Date;
  lastSpentAt?: Date;
  streakDays: number;
  lastActivityDate?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Transaction Types
// ============================================

export type TransactionType = 'payment' | 'refund' | 'fee' | 'reward' | 'transfer' | 'adjustment';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'reversed';
export type TransactionCategory = 'inflow' | 'outflow' | 'internal';

export interface ITransaction {
  transactionId: string;
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  status: TransactionStatus;
  description?: string;
  referenceId?: string;
  referenceType?: 'contract' | 'negotiation' | 'decision' | 'invoice' | 'payout' | 'manual';
  metadata?: Record<string, unknown>;
  failureReason?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransactionFee {
  feeId: string;
  transactionId?: string;
  entityId: string;
  type: 'platform' | 'processing' | 'service' | 'custom';
  amount: number;
  currency: string;
  percentage?: number;
  fixedAmount?: number;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// Billing Types
// ============================================

export type BillingStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
export type BillingCycle = 'one_time' | 'weekly' | 'monthly' | 'quarterly' | 'annually';

export interface IBillingLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  metadata?: Record<string, unknown>;
}

export interface IBilling {
  billingId: string;
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  invoiceNumber: string;
  status: BillingStatus;
  cycle: BillingCycle;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  dueDate?: Date;
  paidAt?: Date;
  lineItems: IBillingLineItem[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Earnings Types
// ============================================

export type EarningStatus = 'pending' | 'calculated' | 'paid' | 'cancelled';
export type EarningSource = 'contract' | 'negotiation' | 'bonus' | 'referral' | 'other';

export interface IEarning {
  earningId: string;
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  source: EarningSource;
  sourceId?: string;
  amount: number;
  currency: string;
  status: EarningStatus;
  calculatedAt?: Date;
  paidAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEarningsSummary {
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
}

// ============================================
// Balance Types
// ============================================

export interface IBalance {
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
  reservedBalance: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API Request/Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface KarmaBalanceResponse {
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  points: number;
  availablePoints: number;
  tier: KarmaTier;
  tierInfo: IKarmaTierInfo;
  lifetimePoints: number;
  streakDays: number;
  lastEarnedAt?: string;
  lastSpentAt?: string;
}

export interface EarnKarmaRequest {
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  action: KarmaAction;
  points?: number;
  reason: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface SpendKarmaRequest {
  entityId: string;
  points: number;
  reason: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTransactionRequest {
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  type: TransactionType;
  amount: number;
  currency?: string;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, unknown>;
}

export interface CalculateEarningsRequest {
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  source: EarningSource;
  sourceId?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

// ============================================
// External Service Integration Types
// ============================================

export interface DecisionEngineRequest {
  decisionType: string;
  context: Record<string, unknown>;
  karmaPoints?: number;
  karmaTier?: KarmaTier;
}

export interface NegotiationEngineRequest {
  negotiationId: string;
  parties: string[];
  context: Record<string, unknown>;
  karmaContext?: {
    entityId: string;
    points: number;
    tier: KarmaTier;
  };
}

export interface ContractOSContext {
  contractId?: string;
  parties: string[];
  terms: Record<string, unknown>;
  karmaBonus?: {
    entityId: string;
    bonusPoints: number;
  };
}

// ============================================
// Configuration Types
// ============================================

export interface ServiceConfig {
  port: number;
  nodeEnv: string;
  mongodb: {
    uri: string;
    options?: Record<string, unknown>;
  };
  redis?: {
    url: string;
  };
  externalServices: {
    decisionEngine: string;
    negotiationEngine: string;
    contractOS: string;
  };
  internalAuth: {
    apiKey: string;
  };
  sentry?: {
    dsn: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}
