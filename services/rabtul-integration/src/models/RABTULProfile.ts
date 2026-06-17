/**
 * RABTUL Profile Model
 * Unified profile for RABTUL (Auth, Wallet, Payment) integration
 */

export interface RABTULAuthProfile {
  id: string;
  corpid?: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  status: 'active' | 'suspended' | 'inactive';
  kycStatus: 'pending' | 'verified' | 'rejected' | 'not_required';
  createdAt: Date;
  updatedAt: Date;
}

export interface RABTULWalletProfile {
  id: string;
  corpid: string;
  balance: number;
  currency: string;
  walletType: 'personal' | 'business' | 'escrow';
  status: 'active' | 'frozen' | 'closed';
  dailyLimit?: number;
  monthlyLimit?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RABTULPaymentProfile {
  id: string;
  corpid: string;
  paymentMethods: PaymentMethod[];
  defaultMethod?: string;
  transactionLimits: TransactionLimits;
  riskLevel: 'low' | 'medium' | 'high';
  fraudScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'wallet' | 'upi';
  provider?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  status: 'active' | 'expired' | 'blocked';
}

export interface TransactionLimits {
  perTransaction: number;
  daily: number;
  monthly: number;
  yearly: number;
}

export interface RABTULProfile {
  auth: RABTULAuthProfile;
  wallet?: RABTULWalletProfile;
  payment?: RABTULPaymentProfile;
  trustScore?: TrustScore;
  lastSynced?: Date;
}

export interface TrustScore {
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  factors: TrustFactor[];
  lastUpdated: Date;
}

export interface TrustFactor {
  name: string;
  contribution: number;
  description: string;
}

export interface Transaction {
  id: string;
  corpid: string;
  type: 'credit' | 'debit' | 'transfer' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
}

export interface PaymentIntent {
  id: string;
  corpid: string;
  amount: number;
  currency: string;
  status: 'created' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  paymentMethodId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Factory functions
export function createRABTULAuthProfile(data: Partial<RABTULAuthProfile> & { email: string }): RABTULAuthProfile {
  return {
    id: data.id || generateId('auth'),
    corpid: data.corpid,
    email: data.email,
    phone: data.phone,
    firstName: data.firstName,
    lastName: data.lastName,
    status: data.status || 'active',
    kycStatus: data.kycStatus || 'pending',
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
}

export function createRABTULWalletProfile(data: Partial<RABTULWalletProfile> & { corpid: string }): RABTULWalletProfile {
  return {
    id: data.id || generateId('wallet'),
    corpid: data.corpid,
    balance: data.balance || 0,
    currency: data.currency || 'INR',
    walletType: data.walletType || 'personal',
    status: data.status || 'active',
    dailyLimit: data.dailyLimit,
    monthlyLimit: data.monthlyLimit,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
}

export function createRABTULPaymentProfile(data: Partial<RABTULPaymentProfile> & { corpid: string }): RABTULPaymentProfile {
  return {
    id: data.id || generateId('payment'),
    corpid: data.corpid,
    paymentMethods: data.paymentMethods || [],
    defaultMethod: data.defaultMethod,
    transactionLimits: data.transactionLimits || {
      perTransaction: 100000,
      daily: 500000,
      monthly: 2000000,
      yearly: 24000000
    },
    riskLevel: data.riskLevel || 'low',
    fraudScore: data.fraudScore,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  };
}

export function createRABTULProfile(
  auth: RABTULAuthProfile,
  wallet?: Partial<RABTULWalletProfile>,
  payment?: Partial<RABTULPaymentProfile>
): RABTULProfile {
  return {
    auth,
    wallet: wallet ? createRABTULWalletProfile({ ...wallet, corpid: auth.corpid || '' }) : undefined,
    payment: payment ? createRABTULPaymentProfile({ ...payment, corpid: auth.corpid || '' }) : undefined,
    lastSynced: new Date()
  };
}

// Helper functions
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

export function calculateTrustScore(profile: RABTULProfile): TrustScore {
  let score = 50; // Base score

  const factors: TrustFactor[] = [];

  // KYC factor
  if (profile.auth.kycStatus === 'verified') {
    score += 20;
    factors.push({ name: 'kyc_verified', contribution: 20, description: 'KYC verification completed' });
  } else if (profile.auth.kycStatus === 'pending') {
    score -= 5;
    factors.push({ name: 'kyc_pending', contribution: -5, description: 'KYC verification pending' });
  }

  // Wallet activity factor
  if (profile.wallet) {
    if (profile.wallet.status === 'active') {
      score += 10;
      factors.push({ name: 'wallet_active', contribution: 10, description: 'Wallet is active' });
    }
    if (profile.wallet.balance > 1000) {
      score += 5;
      factors.push({ name: 'wallet_balance', contribution: 5, description: 'Positive wallet balance' });
    }
  }

  // Payment history factor
  if (profile.payment) {
    if (profile.payment.riskLevel === 'low') {
      score += 15;
      factors.push({ name: 'low_risk', contribution: 15, description: 'Low risk payment profile' });
    } else if (profile.payment.riskLevel === 'high') {
      score -= 20;
      factors.push({ name: 'high_risk', contribution: -20, description: 'High risk payment profile' });
    }
  }

  // Normalize score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level: TrustScore['level'];
  if (score >= 80) level = 'excellent';
  else if (score >= 60) level = 'good';
  else if (score >= 40) level = 'fair';
  else level = 'poor';

  return {
    score,
    level,
    factors,
    lastUpdated: new Date()
  };
}
