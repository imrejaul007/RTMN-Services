/**
 * Financial Types — Spec Part 27: Financial LifeOS
 */

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  merchant?: string;
  date: Date;
  description?: string;
  recurring?: boolean;
}

export interface Income {
  id: string;
  userId: string;
  amount: number;
  source: string;
  date: Date;
  recurring?: boolean;
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface BurnAnalysis {
  userId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  totalSpent: number;
  totalIncome: number;
  netBurn: number;
  topCategories: Array<{ category: string; amount: number; percentage: number }>;
  trend: 'increasing' | 'stable' | 'decreasing';
  comparedToPrevious: number;
  runwayMonths?: number; // If income < expenses
}

export interface AffordabilityRequest {
  userId: string;
  item: string;
  cost: number;
  category?: string;
}

export interface AffordabilityResponse {
  canAfford: boolean;
  confidence: number;
  reasoning: string;
  impact: {
    monthlyBudgetImpact: number;
    savingsImpact: number;
    goalsImpact: string;
  };
  recommendation: 'yes' | 'yes-but-modify' | 'wait' | 'no';
  alternatives?: string[];
}

export interface FutureSimulation {
  userId: string;
  monthlySaving: number;
  years: number;
  expectedReturn: number;
  projectedValue: number;
  milestones: Array<{ year: number; value: number }>;
}

export interface Investment {
  id: string;
  userId: string;
  type: 'stocks' | 'bonds' | 'real_estate' | 'crypto' | 'mutual_funds' | 'fixed_deposit';
  amount: number;
  currentValue: number;
  purchaseDate: Date;
}