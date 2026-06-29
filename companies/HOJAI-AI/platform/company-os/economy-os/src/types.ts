/**
 * EconomyOS Types
 *
 * Three wallet types:
 * - Corporate Wallet (company-level)
 * - User Wallet (employees + customers)
 * - Agent Wallet (AI workers)
 *
 * Powers:
 * - Transactions
 * - Authority limits
 * - Treasury management
 * - Rewards
 * - Reputation/Trust
 */

// ============================================
// WALLET TYPES
// ============================================

export type WalletType = 'corporate' | 'user' | 'agent';

export type WalletStatus = 'active' | 'frozen' | 'closed';

export interface Wallet {
  id: string;
  type: WalletType;
  ownerId: string;          // Company ID / User ID / Agent ID
  ownerType: 'company' | 'user' | 'agent';
  balance: number;
  currency: string;
  status: WalletStatus;
  spendingLimits: SpendingLimits;
  createdAt: string;
  updatedAt: string;
}

export interface SpendingLimits {
  dailyMax: number;          // Max per day
  perTransactionMax: number;  // Max per transaction
  monthlyMax: number;        // Max per month
  requiresApprovalAbove: number;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export type TransactionType =
  | 'payment'           // Payment to vendor
  | 'salary'            // Salary to employee
  | 'refund'            // Customer refund
  | 'purchase'          // Customer purchase
  | 'agent_spend'       // AI agent autonomous spend
  | 'transfer'          // Internal transfer between wallets
  | 'reward'            // Loyalty reward
  | 'tax'               // Tax payment
  | 'inventory'         // Inventory purchase
  | 'marketing';        // Marketing spend

export type TransactionStatus = 'pending' | 'approved' | 'completed' | 'failed' | 'reversed';

export interface Transaction {
  id: string;
  fromWalletId: string;
  toWalletId?: string;        // null for external payments
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description: string;
  metadata?: Record<string, any>;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  executedAt?: string;
  createdAt: string;
}

// ============================================
// AGENT AUTHORITY
// ============================================

export interface AgentAuthority {
  agentId: string;
  departmentId: string;
  walletId: string;          // Agent's wallet
  approvedBy: string;        // Who approved these limits
  approvalDate: string;
  limits: {
    canApproveTransactions: boolean;
    maxAutoApproveAmount: number;
    canHireServices: boolean;
    canMakePurchases: boolean;
    maxPurchaseAmount: number;
    canIssueRefunds: boolean;
    maxRefundAmount: number;
  };
  policies: string[];        // Policy IDs that apply
}

// ============================================
// TREASURY
// ============================================

export interface TreasuryAccount {
  id: string;
  companyId: string;
  name: string;              // "Main Operating", "Marketing Reserve", etc.
  type: 'operating' | 'reserve' | 'payroll' | 'tax' | 'marketing';
  balance: number;
  currency: string;
  rules: TreasuryRule[];
  createdAt: string;
}

export interface TreasuryRule {
  type: 'auto_refill' | 'min_balance' | 'max_balance' | 'transfer_limit';
  threshold?: number;
  amount?: number;
  fromAccount?: string;
}

// ============================================
// REWARDS
// ============================================

export interface LoyaltyProgram {
  id: string;
  companyId: string;
  name: string;
  type: 'points' | 'cashback' | 'tiered' | 'stamp';
  earnRate: number;           // e.g., 1 point per ₹100
  redeemRate: number;         // e.g., 1 point = ₹0.10
  tiers?: LoyaltyTier[];
  isActive: boolean;
}

export interface LoyaltyTier {
  name: string;               // Bronze, Silver, Gold
  minPoints: number;
  benefits: string[];
  multiplier: number;         // Earning multiplier
}

export interface LoyaltyMember {
  id: string;
  customerId: string;
  programId: string;
  points: number;
  tier: string;
  joinedAt: string;
  lastActivityAt: string;
}

// ============================================
// REPUTATION / TRUST
// ============================================

export interface ReputationScore {
  entityId: string;           // Company / User / Agent ID
  entityType: 'company' | 'user' | 'agent' | 'supplier';
  score: number;              // 0-100
  breakdown: {
    reliability: number;      // Met commitments
    quality: number;           // Quality of output
    speed: number;             // Speed of delivery
    financial: number;         // Financial reliability
    communication: number;    // Responsiveness
  };
  totalTransactions: number;
  lastUpdated: string;
  history: ReputationEvent[];
}

export interface ReputationEvent {
  date: string;
  event: string;              // "delivered_on_time", "quality_issue"
  impact: number;             // +5 or -3 etc.
  referenceId?: string;        // Order ID, Transaction ID
}