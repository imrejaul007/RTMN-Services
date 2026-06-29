/**
 * Affordability Engine — "Can I afford X?"
 * Spec Part 27: Financial LifeOS
 */

import axios from 'axios';
import { AffordabilityRequest, AffordabilityResponse, BurnAnalysis } from '../types/financial.js';

const GENIE_MONEY_URL = process.env.GENIE_MONEY_URL || 'http://localhost:4724';

export async function checkAffordability(req: AffordabilityRequest): Promise<AffordabilityResponse> {
  // Get current burn rate
  const burn = await fetchBurn(req.userId);

  // Calculate impact
  const monthlyBudgetImpact = burn.totalSpent > 0
    ? (req.cost / burn.totalSpent) * 100
    : 100;

  // Get savings
  const savings = await fetchSavings(req.userId);

  const savingsImpact = savings > 0
    ? Math.round((req.cost / savings) * 100)
    : 100;

  // Check goals impact
  const goalsImpact = await checkGoalsImpact(req);

  // Calculate recommendation
  let recommendation: AffordabilityResponse['recommendation'];
  let canAfford: boolean;
  let reasoning: string;

  if (savings >= req.cost && burn.netBurn >= 0) {
    canAfford = true;
    recommendation = 'yes';
    reasoning = `You can afford this. Cost is ${savingsImpact}% of your savings.`;
  } else if (savings >= req.cost * 0.5 && burn.netBurn >= -req.cost / 12) {
    canAfford = true;
    recommendation = 'yes-but-modify';
    reasoning = `Yes but consider modifying. Cost is ${savingsImpact}% of savings.`;
  } else if (savings < req.cost && burn.netBurn < 0) {
    canAfford = false;
    recommendation = 'wait';
    reasoning = `Wait. You have ${savingsImpact}% of the cost. Build savings first.`;
  } else {
    canAfford = false;
    recommendation = 'no';
    reasoning = `Cannot afford. Cost exceeds savings.`;
  }

  // Calculate confidence based on data completeness
  const confidence = burn.totalSpent > 0 && savings > 0 ? 0.85 : 0.5;

  // Suggest alternatives if cannot afford
  const alternatives: string[] = [];
  if (!canAfford) {
    if (req.category === 'travel') {
      alternatives.push('Consider domestic destinations', 'Wait for off-season deals');
    }
    if (req.category === 'shopping') {
      alternatives.push('Look for second-hand options', 'Wait for sales');
    }
  }

  return {
    canAfford,
    confidence,
    reasoning,
    impact: {
      monthlyBudgetImpact: Math.round(monthlyBudgetImpact * 100) / 100,
      savingsImpact,
      goalsImpact,
    },
    recommendation,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
  };
}

async function fetchBurn(userId: string): Promise<BurnAnalysis> {
  try {
    const response = await axios.get(
      `${GENIE_MONEY_URL}/api/burn`,
      { params: { userId, period: 'month' }, timeout: 10000 }
    );
    return response.data?.data || response.data || {
      userId,
      period: 'month',
      totalSpent: 0,
      totalIncome: 0,
      netBurn: 0,
      topCategories: [],
      trend: 'stable',
      comparedToPrevious: 0,
    };
  } catch {
    return {
      userId,
      period: 'month',
      totalSpent: 0,
      totalIncome: 0,
      netBurn: 0,
      topCategories: [],
      trend: 'stable',
      comparedToPrevious: 0,
    };
  }
}

async function fetchSavings(userId: string): Promise<number> {
  try {
    const response = await axios.get(
      `${GENIE_MONEY_URL}/api/savings`,
      { params: { userId }, timeout: 5000 }
    );
    return response.data?.data?.total || 0;
  } catch {
    return 0;
  }
}

async function checkGoalsImpact(req: AffordabilityRequest): Promise<string> {
  try {
    const response = await axios.get(
      `${GENIE_MONEY_URL}/api/goals`,
      { params: { userId: req.userId }, timeout: 5000 }
    );
    const goals = response.data?.data || response.data || [];
    if (goals.length === 0) return 'No active financial goals';

    const affected = goals.filter((g: any) => {
      const remaining = g.target - g.saved;
      return req.cost >= remaining * 0.5;
    });

    if (affected.length > 0) {
      return `May delay: ${affected.map((g: any) => g.name).join(', ')}`;
    }
    return 'Minimal impact on goals';
  } catch {
    return 'Unknown';
  }
}