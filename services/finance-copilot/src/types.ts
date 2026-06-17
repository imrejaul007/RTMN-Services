/**
 * Finance Copilot Type Definitions
 */

// Transaction Types
export type TransactionType = 'income' | 'expense' | 'transfer';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

// Base Transaction
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  description: string;
  merchant?: string;
  timestamp: Date;
  accountId: string;
  metadata?: Record<string, unknown>;
}

// Anomaly Detection
export interface AnomalyAlert {
  id: string;
  transactionId: string;
  type: 'suspicious_amount' | 'unusual_pattern' | 'velocity_check' | 'geographic_anomaly';
  severity: AnomalySeverity;
  score: number;
  description: string;
  detectedAt: Date;
  resolved: boolean;
  resolution?: string;
  metadata?: Record<string, unknown>;
}

// Cash Flow Forecast
export interface CashFlowForecast {
  id: string;
  date: Date;
  predictedInflow: number;
  predictedOutflow: number;
  netCashFlow: number;
  confidence: number;
  horizon: number; // days
  factors: ForecastFactor[];
  createdAt: Date;
}

export interface ForecastFactor {
  name: string;
  impact: number;
  description: string;
}

// Budget
export interface Budget {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
}

export interface BudgetRecommendation {
  id: string;
  category: string;
  currentAllocation: number;
  recommendedAllocation: number;
  reason: string;
  potentialSavings: number;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

// Refund Analysis
export interface RefundAnalysis {
  id: string;
  refundId: string;
  originalTransactionId: string;
  amount: number;
  reason: string;
  customerId: string;
  riskScore: number;
  riskFactors: string[];
  recommendation: 'approve' | 'review' | 'reject';
  analyzedAt: Date;
}

// Fraud Detection
export interface FraudRiskScore {
  id: string;
  entityId: string;
  entityType: 'customer' | 'vendor' | 'account';
  score: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: FraudRiskFactor[];
  lastUpdated: Date;
  recommendations: string[];
}

export interface FraudRiskFactor {
  name: string;
  weight: number;
  description: string;
  detected: boolean;
}

// Finance Insights
export interface FinanceInsight {
  id: string;
  type: 'trend' | 'warning' | 'opportunity' | 'anomaly';
  title: string;
  description: string;
  metric?: number;
  previousMetric?: number;
  change?: number;
  changePercent?: number;
  category: string;
  priority: 'low' | 'medium' | 'high';
  generatedAt: Date;
  actionableSteps?: string[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Health Check
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: Date;
  services: {
    mongodb: boolean;
    openai?: boolean;
  };
  version: string;
}

// Filter Options
export interface AnomalyFilter {
  severity?: AnomalySeverity;
  type?: string;
  resolved?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface ForecastFilter {
  horizon?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface InsightFilter {
  type?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}
