import { v4 as uuidv4 } from 'uuid';

/**
 * Finance Profile Model
 * Represents a customer's financial profile in RidZa
 */
export interface FinanceProfile {
  id: string;
  customerId: string;
  businessId?: string;

  // Account Information
  accountType: 'individual' | 'business' | 'corporate';
  accountStatus: 'active' | 'suspended' | 'closed' | 'pending';

  // KYC/AML Status
  kycStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  kycExpiryDate?: Date;
  riskLevel: 'low' | 'medium' | 'high';

  // Financial Limits
  dailyTransferLimit: number;
  monthlyTransferLimit: number;
  currentDailyUsage: number;
  currentMonthlyUsage: number;

  // Balance
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;

  // Preferences
  preferredCurrency: string;
  allowedCurrencies: string[];
  autoConvert: boolean;

  // Connected Services
  linkedPaymentMethods: string[];
  connectedTwins: {
    paymentTwin?: string;
    industryTwin?: string;
    trustIntelligence?: string;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastTransactionAt?: Date;
}

/**
 * Transfer Request Model
 */
export interface TransferRequest {
  id?: string;
  senderId: string;
  senderAccountId: string;
  recipientId: string;
  recipientAccountId?: string;
  recipientName: string;
  recipientBank?: string;
  recipientAccountNumber?: string;

  amount: number;
  currency: string;
  targetCurrency?: string;
  exchangeRate?: number;

  fee: number;
  totalAmount: number;

  purpose: string;
  reference?: string;
  notes?: string;

  urgency: 'standard' | 'express' | 'instant';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  failureReason?: string;

  trustScore?: number;
  complianceCheckPassed?: boolean;

  createdAt?: Date;
  completedAt?: Date;
}

/**
 * Insurance Policy Model
 */
export interface InsurancePolicy {
  id: string;
  customerId: string;

  policyNumber: string;
  policyType: 'life' | 'health' | 'property' | 'vehicle' | 'business' | 'travel';

  provider: string;
  providerName: string;

  coverageAmount: number;
  premium: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'annually';

  startDate: Date;
  endDate: Date;
  status: 'active' | 'expired' | 'cancelled' | 'pending_claim';

  beneficiary?: {
    name: string;
    relationship: string;
    contact?: string;
  };

  coverageDetails: {
    [key: string]: number | string;
  };

  claims: Claim[];
  linkedFinanceProfileId?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Insurance Claim Model
 */
export interface Claim {
  id: string;
  policyId: string;
  claimNumber: string;

  claimType: string;
  description: string;

  claimedAmount: number;
  approvedAmount?: number;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';

  submittedAt: Date;
  reviewedAt?: Date;
  paidAt?: Date;

  documents: string[];
  notes?: string;
}

/**
 * CFO Dashboard Metrics
 */
export interface CFOMetrics {
  totalVolume: number;
  transactionCount: number;
  averageTransactionSize: number;

  revenue: {
    total: number;
    transferFees: number;
    exchangeFees: number;
    insurancePremiums: number;
  };

  activeUsers: number;
  newUsersThisMonth: number;

  riskMetrics: {
    flaggedTransactions: number;
    complianceAlerts: number;
    averageTrustScore: number;
  };

  trends: {
    volumeChange: number;
    userGrowth: number;
    revenueGrowth: number;
  };

  currencyBreakdown: {
    [currency: string]: {
      volume: number;
      count: number;
      percentage: number;
    };
  };

  industryBreakdown: {
    [industry: string]: {
      volume: number;
      count: number;
    };
  };

  period: string;
  generatedAt: Date;
}

/**
 * Factory function to create a new Finance Profile
 */
export function createFinanceProfile(
  customerId: string,
  accountType: FinanceProfile['accountType'] = 'individual'
): FinanceProfile {
  const now = new Date();
  return {
    id: `FP-${uuidv4().substring(0, 8).toUpperCase()}`,
    customerId,
    accountType,
    accountStatus: 'pending',
    kycStatus: 'pending',
    riskLevel: 'low',
    dailyTransferLimit: accountType === 'corporate' ? 1000000 : accountType === 'business' ? 100000 : 10000,
    monthlyTransferLimit: accountType === 'corporate' ? 10000000 : accountType === 'business' ? 1000000 : 100000,
    currentDailyUsage: 0,
    currentMonthlyUsage: 0,
    availableBalance: 0,
    pendingBalance: 0,
    totalBalance: 0,
    preferredCurrency: 'USD',
    allowedCurrencies: ['USD', 'EUR', 'GBP', 'INR'],
    autoConvert: false,
    linkedPaymentMethods: [],
    connectedTwins: {},
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Factory function to create a Transfer Request
 */
export function createTransferRequest(data: Omit<TransferRequest, 'id' | 'createdAt' | 'status'>): TransferRequest {
  return {
    ...data,
    id: `TRF-${uuidv4().substring(0, 8).toUpperCase()}`,
    status: 'pending',
    createdAt: new Date()
  };
}

/**
 * Factory function to create an Insurance Policy
 */
export function createInsurancePolicy(
  customerId: string,
  policyType: InsurancePolicy['policyType'],
  coverageAmount: number,
  premium: number
): InsurancePolicy {
  const now = new Date();
  return {
    id: `POL-${uuidv4().substring(0, 8).toUpperCase()}`,
    customerId,
    policyNumber: `RZD-${Date.now().toString(36).toUpperCase()}`,
    policyType,
    provider: 'ridza',
    providerName: 'RidZa Financial Services',
    coverageAmount,
    premium,
    premiumFrequency: 'monthly',
    startDate: now,
    endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
    status: 'active',
    coverageDetails: {},
    claims: [],
    createdAt: now,
    updatedAt: now
  };
}
