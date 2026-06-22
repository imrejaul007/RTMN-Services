// Core Types
export interface Config {
  port: number;
  environment: string;
  logLevel: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Investment Types
export interface Investment {
  id: string;
  name: string;
  description?: string;
  initialInvestment: number;
  currency: string;
  startDate: string;
  endDate?: string;
  expectedReturn: number;
  actualReturn: number;
  costs: CostItem[];
  benefits: BenefitItem[];
  status: InvestmentStatus;
  createdAt: string;
  updatedAt: string;
}

export type InvestmentStatus = 'active' | 'completed' | 'cancelled' | 'pending';

export interface CostItem {
  id: string;
  name: string;
  amount: number;
  type: CostType;
  date: string;
  recurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export type CostType = 'initial' | 'operational' | 'maintenance' | 'scaling' | 'other';

export interface BenefitItem {
  id: string;
  name: string;
  amount: number;
  type: BenefitType;
  date: string;
  recurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export type BenefitType = 'revenue' | 'cost_savings' | 'efficiency' | 'other';

// ROI Calculation Types
export interface ROICalculationRequest {
  initialInvestment: number;
  finalValue: number;
  timePeriod: number; // in days
  currency?: string;
}

export interface ROICalculationResult {
  roi: number; // percentage
  annualizedRoi: number; // percentage
  netReturn: number;
  returnMultiple: number; // e.g., 2.5x
  paybackPeriod: number; // in days
}

export interface HistoricalROI {
  investmentId: string;
  entries: ROIEntry[];
  currentRoi: number;
  averageRoi: number;
  bestRoi: number;
  worstRoi: number;
}

export interface ROIEntry {
  date: string;
  value: number;
  roi: number;
  cumulativeReturn: number;
}

// Cost-Benefit Analysis Types
export interface CostBenefitRequest {
  investmentId?: string;
  costs: CostInput[];
  benefits: BenefitInput[];
  timeHorizon: number; // in days
  discountRate?: number; // annual percentage
  currency?: string;
}

export interface CostInput {
  name: string;
  amount: number;
  type: CostType;
  timing: 'immediate' | 'recurring';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  durationDays?: number;
}

export interface BenefitInput {
  name: string;
  amount: number;
  type: BenefitType;
  timing: 'immediate' | 'recurring';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  durationDays?: number;
}

export interface CostBenefitResult {
  totalCosts: number;
  totalBenefits: number;
  netBenefit: number;
  benefitCostRatio: number;
  adjustedCosts: number; // with discount applied
  adjustedBenefits: number;
  adjustedNetBenefit: number;
  paybackPeriod: number; // in days
  monthlyBreakdown: MonthlyBreakdown[];
  recommendation: 'highly_recommended' | 'recommended' | 'neutral' | 'not_recommended' | 'strongly_not_recommended';
  confidence: number; // 0-100
}

export interface MonthlyBreakdown {
  month: number;
  cumulativeCosts: number;
  cumulativeBenefits: number;
  netCashFlow: number;
  discountedNetCashFlow: number;
}

// Break-Even Analysis Types
export interface BreakEvenRequest {
  fixedCosts: number;
  variableCostPerUnit: number;
  pricePerUnit: number;
  expectedUnitsPerDay?: number;
  currency?: string;
}

export interface BreakEvenResult {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  breakEvenDays?: number;
  marginOfSafety: number; // percentage
  contributionMargin: number;
  contributionMarginRatio: number;
  currentUtilization?: number; // percentage
  daysToBreakEven?: number;
}

// Profit Margin Calculation Types
export interface ProfitMarginRequest {
  revenue: number;
  costOfGoodsSold?: number;
  operatingExpenses?: number;
  otherExpenses?: number;
  taxRate?: number;
  currency?: string;
}

export interface ProfitMarginResult {
  grossProfit: number;
  grossMargin: number; // percentage
  operatingProfit: number;
  operatingMargin: number; // percentage
  netProfit: number;
  netMargin: number; // percentage
  EBITDA: number;
  EBITDA_margin: number; // percentage
  effectiveTaxRate: number; // percentage
}

// Performance Tracking Types
export interface PerformanceMetrics {
  investmentId: string;
  ROI: number;
  annualizedReturn: number;
  sharpeRatio?: number;
  volatility?: number;
  maxDrawdown?: number;
  winRate?: number;
  totalReturn: number;
  periodReturn: number;
  benchmarkReturn?: number;
  alpha?: number;
  beta?: number;
}

export interface PerformanceRequest {
  investmentId: string;
  benchmarkValue?: number;
  riskFreeRate?: number;
  includeRiskMetrics?: boolean;
}

// Investment Projection Types
export interface ProjectionRequest {
  initialInvestment: number;
  expectedAnnualReturn: number; // percentage
  volatility?: number; // standard deviation percentage
  years: number;
  monthlyContribution?: number;
  inflationRate?: number; // percentage
  currency?: string;
}

export interface ProjectionResult {
  projectedFinalValue: number;
  totalContributions: number;
  totalEarnings: number;
  inflationAdjustedValue: number;
  yearlyProjections: YearlyProjection[];
  optimisticScenario: YearlyProjection[];
  pessimisticScenario: YearlyProjection[];
  probabilityOfReturn: {
    loss: number;
    breakeven: number;
    modest: number; // 0-10% return
    good: number; // 10-20% return
    excellent: number; // >20% return
  };
}

export interface YearlyProjection {
  year: number;
  value: number;
  contributions: number;
  earnings: number;
  cumulativeReturn: number;
}

// External Service Integration Types
export interface SimulationOSConfig {
  baseUrl: string;
  timeout: number;
}

export interface EconomyOSConfig {
  baseUrl: string;
  timeout: number;
}

export interface SimulationScenario {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  results?: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface EconomyTransaction {
  id: string;
  type: 'cost' | 'benefit' | 'investment' | 'return';
  amount: number;
  currency: string;
  category: string;
  metadata?: Record<string, unknown>;
}

// Request/Response types for API
export interface CreateInvestmentRequest {
  name: string;
  description?: string;
  initialInvestment: number;
  currency?: string;
  startDate: string;
  endDate?: string;
  expectedReturn?: number;
  costs?: Omit<CostItem, 'id'>[];
  benefits?: Omit<BenefitItem, 'id'>[];
}

export interface UpdateInvestmentRequest {
  name?: string;
  description?: string;
  expectedReturn?: number;
  actualReturn?: number;
  status?: InvestmentStatus;
  costs?: CostItem[];
  benefits?: BenefitItem[];
}