// REZ-economy-os Type Definitions
// Agent economy: karma, credit, transactions, ledger

export type KarmaTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type CreditTier = 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor' | 'unrated';
export type LedgerEntryType = 'debit' | 'credit';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed' | 'disputed';
export type TransactionType =
  | 'payment'
  | 'refund'
  | 'fee'
  | 'reward'
  | 'penalty'
  | 'transfer'
  | 'escrow'
  | 'release'
  | 'adjustment';
export type AccountType = 'agent' | 'user' | 'merchant' | 'platform' | 'escrow' | 'fee';

// Karma record per agent
export interface KarmaRecord {
  id: string;
  agentId: string;
  totalKarma: number;
  lifetimeKarma: number; // never decreases
  tier: KarmaTier;
  tierProgress: number; // 0-1, progress to next tier
  sources: Record<string, number>; // karma source → points
  lastUpdated: string;
  history: KarmaEvent[];
  createdAt: string;
}

export interface KarmaEvent {
  id: string;
  agentId: string;
  source: string; // e.g., 'taskCompleted', 'slaMet'
  points: number;
  reason: string;
  referenceId?: string; // task id, payment id, etc.
  timestamp: string;
}

// Credit score record per agent
export interface CreditRecord {
  id: string;
  agentId: string;
  score: number; // 0-1000
  tier: CreditTier;
  components: {
    creditHistory: number; // 0-1000
    paymentHistory: number; // 0-1000
    disputeRate: number; // 0-1000 (lower dispute = higher score)
    deliverySuccess: number; // 0-1000
  };
  factors: {
    totalTransactions: number;
    onTimePayments: number;
    latePayments: number;
    totalDisputes: number;
    resolvedDisputes: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    accountAgeDays: number;
  };
  lastUpdated: string;
  lastCalculated: string;
  createdAt: string;
}

// Wallet account - holds balance
export interface Account {
  id: string;
  ownerId: string; // agentId, userId, etc.
  ownerType: AccountType;
  type: AccountType;
  currency: string; // default 'USD'
  balance: number;
  availableBalance: number; // balance - holds
  heldBalance: number; // in escrow
  lifetimeCredits: number;
  lifetimeDebits: number;
  transactionCount: number;
  status: 'active' | 'frozen' | 'closed';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Double-entry ledger entry
export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  type: LedgerEntryType;
  amount: number;
  balance: number; // balance after this entry
  currency: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: string;
  postedAt: string;
}

// Transaction - pairs debit + credit entries
export interface Transaction {
  id: string;
  reference: string; // human-readable, e.g., TXN-2026-001234
  type: TransactionType;
  status: TransactionStatus;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number; // amount - fee
  description: string;
  metadata: Record<string, any>;
  // For double-entry verification
  debitEntryId?: string;
  creditEntryId?: string;
  feeEntryId?: string;
  // Idempotency
  idempotencyKey?: string;
  // External references
  externalRefs: {
    trustScoreAtTime?: number;
    karmaAtTime?: number;
    creditScoreAtTime?: number;
  };
  initiatedBy: string;
  approvedBy?: string;
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  // Reversal tracking
  reversedByTransactionId?: string;
  reversesTransactionId?: string;
}

// Escrow holding
export interface Escrow {
  id: string;
  transactionId: string;
  payerAccountId: string;
  payeeAccountId: string;
  amount: number;
  currency: string;
  status: 'held' | 'released' | 'refunded' | 'disputed';
  conditions: string[]; // release conditions
  releasedAt?: string;
  refundedAt?: string;
  disputeId?: string;
  createdAt: string;
  updatedAt: string;
}

// Economic event for analytics
export interface EconomicEvent {
  id: string;
  type: string; // 'transaction.completed', 'karma.changed', 'credit.updated', etc.
  agentId?: string;
  data: Record<string, any>;
  timestamp: string;
}

// Agent economic profile - aggregate view
export interface AgentEconomicProfile {
  agentId: string;
  karma: KarmaRecord;
  credit: CreditRecord;
  accounts: Account[];
  trustScore: number; // from trust-scorer
  totalVolume: number;
  netFlow: number;
  lastActivity: string;
  joinedAt: string;
  status: 'active' | 'suspended' | 'newcomer' | 'veteran';
}
