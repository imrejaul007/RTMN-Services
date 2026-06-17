import { RiskLevel, BlockAction } from './Fraud';

export enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
  FLAGGED = 'flagged',
  UNDER_REVIEW = 'under_review',
  BLOCKED = 'blocked'
}

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
  AUTHORIZATION = 'authorization'
}

export enum Channel {
  WEB = 'web',
  MOBILE = 'mobile',
  POS = 'pos',
  API = 'api',
  ATM = 'atm',
  IN_PERSON = 'in_person'
}

export interface Transaction {
  id: string;
  customerId: string;
  merchantId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  channel: Channel;
  status: TransactionStatus;
  description?: string;
  category?: string;
  metadata: TransactionMetadata;
  riskAssessment?: RiskAssessment;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionMetadata {
  // Device information
  deviceId?: string;
  deviceFingerprint?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ip?: string;
  userAgent?: string;

  // Location
  location?: GeoLocation;
  billingAddress?: Address;
  shippingAddress?: Address;

  // Authentication
  authenticated: boolean;
  authMethod?: 'password' | 'biometric' | 'otp' | 'token' | 'none';

  // Session
  sessionId?: string;
  loginAttempts?: number;
  sessionDuration?: number;

  // History
  previousTransactionCount?: number;
  customerTenureDays?: number;

  // Additional
  cardPresent?: boolean;
  cvvVerified?: boolean;
  addressVerified?: boolean;
  threeDSecure?: boolean;
}

export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  blockAction: BlockAction;
  factors: RiskFactor[];
  matchedPatterns: string[];
  recommendations: string[];
  assessedAt: Date;
  processingTimeMs: number;
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  reason: string;
  details?: Record<string, unknown>;
}

export interface TransactionContext {
  // Current transaction
  transaction: Transaction;

  // Customer history
  customerAverageAmount: number;
  customerTransactionCount: number;
  customerLastTransaction?: Date;
  customerKnownDevices: string[];
  customerUsualLocations: string[];
  customerAccountAge: number;

  // Recent activity
  recentTransactions: Transaction[];
  recentTransactionCount: number;
  recentAmountTotal: number;
  recentVelocity: number; // transactions per hour

  // Merchant info
  merchantRiskRating?: string;
  merchantCategory?: string;

  // External signals
  blacklistMatch?: boolean;
  watchlistMatch?: boolean;
  networkConnections?: string[];
}

export interface TransactionCheckRequest {
  transactionId: string;
  customerId: string;
  merchantId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  channel: Channel;
  description?: string;
  category?: string;
  metadata: TransactionMetadata;
  context?: Partial<TransactionContext>;
}

export interface TransactionCheckResponse {
  transactionId: string;
  allowed: boolean;
  status: TransactionStatus;
  riskAssessment: RiskAssessment;
  processingTimeMs: number;
  timestamp: Date;
  actions?: TransactionAction[];
}

export interface TransactionAction {
  type: 'block' | 'flag' | 'review' | 'notify' | 'challenge';
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

// In-memory transaction store
export class TransactionStore {
  private transactions: Map<string, Transaction> = new Map();
  private customerIndex: Map<string, string[]> = new Map();
  private merchantIndex: Map<string, string[]> = new Map();

  add(transaction: Transaction): void {
    this.transactions.set(transaction.id, transaction);

    // Update customer index
    const customerTx = this.customerIndex.get(transaction.customerId) || [];
    customerTx.push(transaction.id);
    this.customerIndex.set(transaction.customerId, customerTx);

    // Update merchant index
    const merchantTx = this.merchantIndex.get(transaction.merchantId) || [];
    merchantTx.push(transaction.id);
    this.merchantIndex.set(transaction.merchantId, merchantTx);
  }

  get(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  getByCustomer(customerId: string): Transaction[] {
    const ids = this.customerIndex.get(customerId) || [];
    return ids.map(id => this.transactions.get(id)).filter((t): t is Transaction => t !== undefined);
  }

  getByMerchant(merchantId: string): Transaction[] {
    const ids = this.merchantIndex.get(merchantId) || [];
    return ids.map(id => this.transactions.get(id)).filter((t): t is Transaction => t !== undefined);
  }

  getRecent(customerId: string, limit: number = 10): Transaction[] {
    const all = this.getByCustomer(customerId);
    return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  update(id: string, updates: Partial<Transaction>): Transaction | undefined {
    const existing = this.transactions.get(id);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.transactions.set(id, updated);
      return updated;
    }
    return undefined;
  }

  getStats(): {
    total: number;
    byStatus: Record<TransactionStatus, number>;
    byType: Record<TransactionType, number>;
  } {
    const transactions = Array.from(this.transactions.values());
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const tx of transactions) {
      byStatus[tx.status] = (byStatus[tx.status] || 0) + 1;
      byType[tx.type] = (byType[tx.type] || 0) + 1;
    }

    return {
      total: transactions.length,
      byStatus: byStatus as Record<TransactionStatus, number>,
      byType: byType as Record<TransactionType, number>
    };
  }

  clear(): void {
    this.transactions.clear();
    this.customerIndex.clear();
    this.merchantIndex.clear();
  }
}
