// Trust Level Enums
export type TrustLevel = 'UNTRUSTED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'PREMIUM';

// Entity Types
export type EntityType = 'user' | 'merchant' | 'business' | 'partner' | 'agent';

// Verification Status
export type VerificationStatus = 'pending' | 'in_progress' | 'verified' | 'rejected' | 'expired';

// KYC Status
export type KYCStatus = 'not_started' | 'in_progress' | 'submitted' | 'verified' | 'rejected' | 'expired';

// Risk Level
export type RiskLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

// Payment Status
export type PaymentStatus = 'paid' | 'partial' | 'overdue' | 'defaulted' | 'pending';

// Verification Badge Types
export type VerificationBadge =
  | 'email_verified'
  | 'phone_verified'
  | 'kyc_verified'
  | 'kyb_verified'
  | 'document_verified'
  | 'address_verified'
  | 'biometric_verified'
  | 'video_verified'
  | 'bank_verified'
  | 'business_verified';

// Trust Score Components
export interface IPaymentScore {
  score: number;
  onTimePayments: number;
  latePayments: number;
  defaultedPayments: number;
  totalPayments: number;
  paymentRate: number; // Percentage of on-time payments
}

export interface IFulfillmentScore {
  score: number;
  ordersCompleted: number;
  ordersPartial: number;
  ordersFailed: number;
  totalOrders: number;
  fulfillmentRate: number;
}

export interface IDisputeScore {
  score: number;
  disputesWon: number;
  disputesLost: number;
  disputesPending: number;
  totalDisputes: number;
  winRate: number;
}

export interface IVerificationScore {
  score: number;
  kycStatus: KYCStatus;
  kybStatus: KYCStatus;
  documentsVerified: number;
  verificationBadges: VerificationBadge[];
  lastVerificationDate: Date | null;
}

export interface ITransactionScore {
  score: number;
  totalVolume: number;
  transactionCount: number;
  avgTransactionSize: number;
  suspiciousTransactions: number;
}

// Main Trust Score Interface
export interface ITrustScore {
  entityId: string;
  entityType: EntityType;
  overallScore: number; // 0-100
  trustLevel: TrustLevel;
  paymentScore: IPaymentScore;
  fulfillmentScore: IFulfillmentScore;
  disputeScore: IDisputeScore;
  verificationScore: IVerificationScore;
  transactionScore: ITransactionScore;
  badges: VerificationBadge[];
  riskLevel: RiskLevel;
  history: ITrustHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

// Trust History Entry
export interface ITrustHistoryEntry {
  timestamp: Date;
  overallScore: number;
  paymentScore: number;
  fulfillmentScore: number;
  disputeScore: number;
  verificationScore: number;
  changeReason: string;
  changeType: 'increase' | 'decrease' | 'reset' | 'manual';
}

// Credit Score Interface
export interface ICreditScore {
  entityId: string;
  score: number; // 300-900
  creditLimit: number;
  currentUtilization: number;
  availableCredit: number;
  creditGrade: string;
  riskLevel: RiskLevel;
  paymentHistory: IPaymentHistoryEntry[];
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentHistoryEntry {
  date: Date;
  amount: number;
  status: PaymentStatus;
  dueDate: Date;
  paidDate: Date | null;
}

// Reputation Interface
export interface IReputation {
  entityId: string;
  totalReviews: number;
  avgRating: number; // 1-5
  positiveReviews: number;
  negativeReviews: number;
  neutralReviews: number;
  responseRate: number;
  avgResponseTime: number; // in hours
  verifiedPurchases: number;
  recentActivity: IActivityEntry[];
  lastUpdated: Date;
}

export interface IActivityEntry {
  date: Date;
  type: 'transaction' | 'review' | 'verification' | 'dispute' | 'payment';
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  scoreChange: number;
}

// Verification Request
export interface IVerificationRequest {
  requestId: string;
  entityId: string;
  entityType: EntityType;
  verificationType: 'kyc' | 'kyb' | 'document' | 'address' | 'biometric' | 'bank' | 'video';
  status: VerificationStatus;
  documents: IDocument[];
  submittedAt: Date;
  completedAt: Date | null;
  expiresAt: Date | null;
  verificationResult?: IVerificationResult;
}

export interface IDocument {
  documentId: string;
  type: string;
  url: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: Date;
  verifiedAt: Date | null;
}

export interface IVerificationResult {
  isVerified: boolean;
  confidence: number; // 0-100
  verifiedFields: string[];
  failedFields: string[];
  riskIndicators: string[];
  notes: string;
}

// KYC Request
export interface IKYCRequest {
  requestId: string;
  entityId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  documents: IDocument[];
  status: KYCStatus;
  submittedAt: Date;
  verifiedAt: Date | null;
  verifiedBy: string | null;
}

// API Request Types
export interface CalculateTrustScoreRequest {
  entityId: string;
  entityType: EntityType;
  factors?: Partial<{
    paymentHistory: IPaymentScore['score'];
    fulfillmentHistory: IFulfillmentScore['score'];
    disputeHistory: IDisputeScore['score'];
    verificationStatus: IVerificationScore['score'];
    transactionVolume: number;
  }>;
}

export interface VerifyEntityRequest {
  entityId: string;
  verificationType: 'kyc' | 'kyb' | 'document' | 'address' | 'bank' | 'biometric';
  documents?: Array<{
    type: string;
    url: string;
  }>;
}

export interface CreditCheckRequest {
  entityId: string;
  requestType: 'score_only' | 'full_report' | 'pre_approval';
  amount?: number; // Optional amount for pre-approval
  purpose?: string;
}

export interface KYCMergeRequest {
  entityId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  documents: Array<{
    type: string;
    url: string;
  }>;
}

// API Response Types
export interface TrustScoreResponse {
  entityId: string;
  overallScore: number;
  trustLevel: TrustLevel;
  riskLevel: RiskLevel;
  componentScores: {
    paymentScore: number;
    fulfillmentScore: number;
    disputeScore: number;
    verificationScore: number;
    transactionScore: number;
  };
  badges: VerificationBadge[];
  calculatedAt: Date;
}

export interface CreditCheckResponse {
  entityId: string;
  creditScore: number;
  creditGrade: string;
  riskLevel: RiskLevel;
  creditLimit: number;
  availableCredit: number;
  utilizationRate: number;
  reportType: 'score_only' | 'full_report' | 'pre_approval';
  generatedAt: Date;
}

export interface ReputationResponse {
  entityId: string;
  totalReviews: number;
  avgRating: number;
  positiveReviews: number;
  negativeReviews: number;
  verifiedPurchases: number;
  responseRate: number;
  recentActivity: IActivityEntry[];
  lastUpdated: Date;
}

export interface VerificationResponse {
  requestId: string;
  entityId: string;
  verificationType: string;
  status: VerificationStatus;
  result?: IVerificationResult;
  completedAt: Date | null;
}

export interface KYCResponse {
  requestId: string;
  entityId: string;
  status: KYCStatus;
  verificationBadges: VerificationBadge[];
  verifiedAt: Date | null;
  expiresAt: Date | null;
}

// External Service Integration
export interface DecisionEnginePayload {
  entityId: string;
  trustScore: number;
  trustLevel: TrustLevel;
  riskLevel: RiskLevel;
  creditScore: number;
  creditLimit: number;
  verificationStatus: KYCStatus;
  transactionHistory: {
    totalVolume: number;
    transactionCount: number;
    suspiciousCount: number;
  };
  requestType: 'approval' | 'risk_assessment' | 'credit_decision';
}

export interface ContractOSPayload {
  entityId: string;
  trustLevel: TrustLevel;
  verifiedBadges: VerificationBadge[];
  creditLimit: number;
  escrowRequired: boolean;
  escrowPercentage: number;
  terms: {
    maxPaymentDays: number;
    latePaymentPenalty: number;
  };
}

// Config Types
export interface ServiceConfig {
  port: number;
  nodeEnv: string;
  cors: {
    origin: string;
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  trust: {
    defaultScore: number;
    maxScore: number;
    minScore: number;
    scoreWeights: {
      payment: number;
      fulfillment: number;
      dispute: number;
      verification: number;
      transaction: number;
    };
    levelThresholds: {
      UNTRUSTED: number;
      LOW: number;
      MEDIUM: number;
      HIGH: number;
      PREMIUM: number;
    };
  };
  credit: {
    defaultScore: number;
    minScore: number;
    maxScore: number;
    grades: Record<string, { min: number; max: number; riskLevel: RiskLevel }>;
  };
  externalServices: {
    decisionEngine: {
      host: string;
      port: number;
      timeout: number;
    };
    contractOS: {
      host: string;
      port: number;
      timeout: number;
    };
  };
}
