/**
 * Burn Analyzer — Monthly burn rate analysis
 * Spec Part 27: Financial LifeOS
 */

import axios from 'axios';
import { BurnAnalysis, Expense, Income } from '../types/financial.js';

const GENIE_MONEY_URL = process.env.GENIE_MONEY_URL || 'http://localhost:4724';

export async function analyzeBurn(userId: string, period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<BurnAnalysis> {
  // Fetch expenses and income
  const [expenses, incomes] = await Promise.all([
    fetchExpenses(userId, period),
    fetchIncomes(userId, period),
  ]);

  // Calculate totals
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const netBurn = totalIncome - totalSpent;

  // Top categories
  const categoryMap = new Map<string, number>();
  for (const e of expenses) {
    categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
  }
  const topCategories = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalSpent) * 100,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Compare to previous period
  const previousBurn = await fetchPreviousBurn(userId, period);
  const comparedToPrevious = previousBurn > 0
    ? ((netBurn - previousBurn) / previousBurn) * 100
    : 0;

  const trend: 'increasing' | 'stable' | 'decreasing' =
    comparedToPrevious > 5 ? 'increasing' :
    comparedToPrevious < -5 ? 'decreasing' : 'stable';

  // Runway calculation
  let runwayMonths: number | undefined;
  if (netBurn < 0 && totalSpent > 0) {
    // Simple runway: assume savings, calculate
    const monthlyNetBurn = -netBurn / getPeriodMonths(period);
    runwayMonths = undefined; // Would need savings data
  }

  return {
    userId,
    period,
    totalSpent,
    totalIncome,
    netBurn,
    topCategories,
    trend,
    comparedToPrevious: Math.round(comparedToPrevious * 100) / 100,
    runwayMonths,
  };
}

async function fetchExpenses(userId: string, period: string): Promise<Expense[]> {
  try {
    const response = await axios.get(
      `${GENIE_MONEY_URL}/api/expenses`,
      {
        params: {
          userId,
          since: getSinceDate(period),
        },
        timeout: 10000,
      }
    );
    return response.data?.data || response.data || [];
  } catch {
    return [];
  }
}

async function fetchIncomes(userId: string, period: string): Promise<Income[]> {
  try {
    const response = await axios.get(
      `${GENIE_MONEY_URL}/api/income`,
      {
        params: {
          userId,
          since: getSinceDate(period),
        },
        timeout: 10000,
      }
    );
    return response.data?.data || response.data || [];
  } catch {
    return [];
  }
}

async function fetchPreviousBurn(userId: string, period: string): Promise<number> {
  try {
    const response = await axios.get(
      `${GENIE_MONEY_URL}/api/burn`,
      {
        params: {
          userId,
          period,
          previous: true,
        },
        timeout: 5000,
      }
    );
    return response.data?.data?.netBurn || 0;
  } catch {
    return 0;
  }
}

function getSinceDate(period: string): string {
  const now = new Date();
  const months = getPeriodMonths(period);
  const since = new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000);
  return since.toISOString();
}

function getPeriodMonths(period: string): number {
  switch (period) {
    case 'week': return 0.25;
    case 'month': return 1;
    case 'quarter': return 3;
    case 'year': return 12;
    default: return 1;
  }
}