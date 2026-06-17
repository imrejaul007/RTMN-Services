/**
 * Budget Service
 * Budget tracking and recommendations
 */

import { v4 as uuidv4 } from 'uuid';
import { Budget, BudgetRecommendation } from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export class BudgetService {
  // Simulated category spending patterns
  private readonly categoryPatterns: Record<string, { avgSpend: number; variance: number }> = {
    food: { avgSpend: 800, variance: 0.3 },
    transportation: { avgSpend: 400, variance: 0.25 },
    utilities: { avgSpend: 300, variance: 0.1 },
    entertainment: { avgSpend: 200, variance: 0.5 },
    shopping: { avgSpend: 500, variance: 0.4 },
    healthcare: { avgSpend: 150, variance: 0.6 },
    subscriptions: { avgSpend: 100, variance: 0.1 },
    education: { avgSpend: 200, variance: 0.4 },
    travel: { avgSpend: 300, variance: 0.8 },
    housing: { avgSpend: 1500, variance: 0.05 },
  };

  /**
   * Get current budget status for all categories
   */
  async getBudgetStatus(): Promise<Budget[]> {
    logger.info('Fetching budget status');

    const budgets: Budget[] = [];
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    for (const [category, pattern] of Object.entries(this.categoryPatterns)) {
      // Simulate current spending
      const spent = Math.round(pattern.avgSpend * (1 + (Math.random() - 0.5) * pattern.variance * 2));
      const allocated = pattern.avgSpend * 1.1; // 10% buffer

      budgets.push({
        id: uuidv4(),
        category,
        allocated: Math.round(allocated),
        spent,
        remaining: Math.round(allocated - spent),
        period: 'monthly',
        startDate: startOfMonth,
        endDate: endOfMonth,
      });
    }

    return budgets;
  }

  /**
   * Generate budget recommendations
   */
  async generateRecommendations(): Promise<BudgetRecommendation[]> {
    logger.info('Generating budget recommendations');

    const recommendations: BudgetRecommendation[] = [];
    const budgets = await this.getBudgetStatus();

    // Sort by over-budget percentage
    const overBudget = budgets
      .filter((b) => b.spent > b.allocated)
      .map((b) => ({
        ...b,
        overagePercent: (b.spent - b.allocated) / b.allocated,
      }))
      .sort((a, b) => b.overagePercent - a.overagePercent);

    // Generate recommendations for over-budget categories
    for (const budget of overBudget) {
      const potentialSavings = Math.round(budget.spent - budget.allocated);
      const recommendedAllocation = Math.round(budget.allocated * 1.15);

      recommendations.push({
        id: uuidv4(),
        category: budget.category,
        currentAllocation: budget.allocated,
        recommendedAllocation,
        reason: `${budget.category} is ${(budget.overagePercent * 100).toFixed(0)}% over budget. Consider increasing allocation or reducing spending.`,
        potentialSavings,
        priority: budget.overagePercent > 0.5 ? 'high' : 'medium',
        createdAt: new Date(),
      });
    }

    // Generate under-utilization recommendations
    const underUtilized = budgets
      .filter((b) => b.spent < b.allocated * 0.5)
      .map((b) => ({
        ...b,
        utilizationPercent: b.spent / b.allocated,
      }));

    for (const budget of underUtilized) {
      const recommendedAllocation = Math.round(budget.spent * 0.9);

      recommendations.push({
        id: uuidv4(),
        category: budget.category,
        currentAllocation: budget.allocated,
        recommendedAllocation,
        reason: `${budget.category} is only ${(budget.utilizationPercent * 100).toFixed(0)}% utilized. Consider reallocating funds to other categories.`,
        potentialSavings: Math.round(budget.allocated - recommendedAllocation),
        priority: 'low',
        createdAt: new Date(),
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  /**
   * Get budget summary
   */
  async getBudgetSummary(): Promise<{
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
    utilizationPercent: number;
    categoriesOverBudget: number;
    categoriesUnderBudget: number;
    topSpendingCategory: string;
    bestValueCategory: string;
  }> {
    const budgets = await this.getBudgetStatus();

    const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalAllocated - totalSpent;
    const utilizationPercent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    const overBudget = budgets.filter((b) => b.spent > b.allocated);
    const underBudget = budgets.filter((b) => b.spent < b.allocated * 0.8);

    const sortedBySpending = [...budgets].sort((a, b) => b.spent - a.spent);
    const sortedByValue = [...budgets].sort((a, b) => (b.spent / b.allocated) - (a.spent / a.allocated));

    return {
      totalAllocated,
      totalSpent,
      totalRemaining,
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,
      categoriesOverBudget: overBudget.length,
      categoriesUnderBudget: underBudget.length,
      topSpendingCategory: sortedBySpending[0]?.category || 'N/A',
      bestValueCategory: sortedByValue[sortedByValue.length - 1]?.category || 'N/A',
    };
  }

  /**
   * Create or update budget allocation
   */
  async setBudgetAllocation(
    category: string,
    allocated: number,
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Promise<Budget> {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        const dayOfWeek = today.getDay();
        startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'quarterly':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
    }

    const spent = Math.round(allocated * Math.random() * 0.7); // Simulated current spend

    return {
      id: uuidv4(),
      category,
      allocated,
      spent,
      remaining: allocated - spent,
      period,
      startDate,
      endDate,
    };
  }
}

export const budgetService = new BudgetService();
