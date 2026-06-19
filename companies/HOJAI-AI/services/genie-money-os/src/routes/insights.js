const express = require('express');
const router = express.Router();

// In-memory data references (shared with other routes)
const budgets = new Map();
const expenses = new Map();
const savingsAccounts = new Map();
const savingsGoals = new Map();
const portfolios = new Map();
const financialGoals = new Map();

// Get comprehensive financial insights
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  // Aggregate all financial data
  const userBudget = budgets.get(userId) || {};
  const userExpenses = expenses.get(userId) || [];
  const userSavings = savingsAccounts.get(userId) || [];
  const userGoals = financialGoals.get(userId) || [];
  const userInvestments = portfolios.get(userId) || {};

  // Calculate net worth
  const totalAssets = userSavings.reduce((sum, a) => sum + a.currentAmount, 0) +
                      (userInvestments.totalValue || 0);
  const totalLiabilities = 0; // Would come from debt tracking
  const netWorth = totalAssets - totalLiabilities;

  // Calculate monthly cash flow
  const monthlyIncome = userBudget.monthlyIncome || 0;
  const monthlyExpenses = userExpenses
    .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  // Calculate financial health score
  const scores = {
    savings: calculateSavingsScore(userSavings, monthlyIncome),
    budget: calculateBudgetScore(userBudget, monthlyExpenses),
    goals: calculateGoalsScore(userGoals),
    investments: calculateInvestmentScore(userInvestments),
    emergency: calculateEmergencyScore(userSavings, monthlyExpenses)
  };

  const overallScore = Math.round(
    (scores.savings * 0.25) +
    (scores.budget * 0.20) +
    (scores.goals * 0.20) +
    (scores.investments * 0.20) +
    (scores.emergency * 0.15)
  );

  res.json({
    success: true,
    data: {
      overallScore,
      dimensionScores: scores,
      netWorth: Math.round(netWorth * 100) / 100,
      monthlyCashFlow: {
        income: monthlyIncome,
        expenses: Math.round(monthlyExpenses * 100) / 100,
        savings: Math.round(monthlySavings * 100) / 100,
        savingsRate: Math.round(savingsRate * 100) / 100
      },
      summary: {
        totalSavings: Math.round(totalAssets * 100) / 100,
        totalGoals: userGoals.length,
        goalsCompleted: userGoals.filter(g => g.status === 'completed').length,
        monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
        investmentValue: userInvestments.totalValue || 0
      },
      recommendations: generateFinancialRecommendations(scores, monthlySavings, savingsRate)
    }
  });
});

// Get spending insights
router.get('/:userId/spending', (req, res) => {
  const { userId } = req.params;
  const { months = 3 } = req.query;

  const userExpenses = expenses.get(userId) || [];
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - parseInt(months));

  const recentExpenses = userExpenses.filter(e => new Date(e.date) > cutoff);

  // Category breakdown
  const byCategory = {};
  recentExpenses.forEach(e => {
    if (!byCategory[e.category]) {
      byCategory[e.category] = { total: 0, count: 0, items: [] };
    }
    byCategory[e.category].total += e.amount;
    byCategory[e.category].count++;
    byCategory[e.category].items.push(e);
  });

  // Top spending categories
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([cat, data]) => ({
      category: cat,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
      average: Math.round((data.total / data.count) * 100) / 100
    }));

  // Identify potential savings
  const savingsOpportunities = [];

  const dining = byCategory['dining'];
  if (dining && dining.total > 200) {
    savingsOpportunities.push({
      category: 'Dining Out',
      currentSpending: Math.round(dining.total),
      potential: Math.round(dining.total * 0.3),
      tip: 'Try cooking at home 3 more times per week'
    });
  }

  const subscriptions = byCategory['subscriptions'];
  if (subscriptions) {
    savingsOpportunities.push({
      category: 'Subscriptions',
      currentSpending: Math.round(subscriptions.total),
      potential: Math.round(subscriptions.total * 0.2),
      tip: 'Review each subscription - cancel unused ones'
    });
  }

  res.json({
    success: true,
    data: {
      period: `${months} months`,
      totalSpending: Math.round(recentExpenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100,
      transactionCount: recentExpenses.length,
      topCategories,
      savingsOpportunities,
      insights: generateSpendingInsights(byCategory)
    }
  });
});

// Get savings insights
router.get('/:userId/savings-insights', (req, res) => {
  const { userId } = req.params;

  const userSavings = savingsAccounts.get(userId) || [];
  const userGoals = financialGoals.get(userId) || [];

  // Calculate savings rate
  const totalSavings = userSavings.reduce((sum, a) => sum + a.currentAmount, 0);
  const emergencyFund = userSavings.find(a => a.accountType === 'emergency');
  const hasEmergencyFund = emergencyFund && emergencyFund.currentAmount >= 3000;

  // Savings velocity (how fast savings are growing)
  const savingsVelocity = calculateSavingsVelocity(userSavings);

  const insights = [];

  // Emergency fund check
  if (!hasEmergencyFund) {
    insights.push({
      priority: 'high',
      category: 'Emergency Fund',
      message: 'You need a 3-6 month emergency fund',
      action: `Save $${3000 - (emergencyFund?.currentAmount || 0)} more to reach minimum emergency fund`,
      icon: '🆘'
    });
  }

  // High-yield savings opportunity
  const avgInterestRate = userSavings.length ?
    userSavings.reduce((sum, a) => sum + a.interestRate, 0) / userSavings.length : 0;

  if (avgInterestRate < 4.5) {
    insights.push({
      priority: 'medium',
      category: 'Savings Rate',
      message: 'Your savings could be earning more',
      action: 'Consider high-yield savings accounts (4.5%+ APY)',
      icon: '💰'
    });
  }

  // Goal progress
  const activeGoals = userGoals.filter(g => g.status === 'active');
  if (activeGoals.length > 0) {
    const goalProgress = activeGoals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount), 0) / activeGoals.length;
    insights.push({
      priority: goalProgress > 0.5 ? 'low' : 'medium',
      category: 'Goals Progress',
      message: `${Math.round(goalProgress * 100)}% average progress on active goals`,
      action: goalProgress < 0.3 ? 'Increase monthly contributions to stay on track' : 'Great progress! Keep going',
      icon: '🎯'
    });
  }

  res.json({
    success: true,
    data: {
      totalSavings: Math.round(totalSavings * 100) / 100,
      savingsVelocity: Math.round(savingsVelocity * 100) / 100,
      accountCount: userSavings.length,
      emergencyFundStatus: {
        has: hasEmergencyFund,
        current: emergencyFund?.currentAmount || 0,
        target: 3000
      },
      insights,
      recommendations: generateSavingsRecommendations(userSavings, activeGoals)
    }
  });
});

// Get investment insights
router.get('/:userId/investment-insights', (req, res) => {
  const { userId } = req.params;

  const userInvestments = portfolios.get(userId) || {};

  // Portfolio allocation analysis
  const allocation = userInvestments.allocation || [];
  const stockPercent = allocation.find(a => a.type === 'stocks')?.percent || 0;
  const bondPercent = allocation.find(a => a.type === 'bonds')?.percent || 0;

  const insights = [];

  // Diversification check
  if (stockPercent > 90) {
    insights.push({
      priority: 'high',
      category: 'Diversification',
      message: 'Portfolio may be too concentrated in stocks',
      action: 'Consider adding bonds or ETFs for stability',
      icon: '⚖️'
    });
  }

  // Fee analysis
  insights.push({
    priority: 'medium',
    category: 'Investment Fees',
    message: 'Be mindful of expense ratios',
    action: 'Choose low-cost index funds (expense ratio < 0.20%)',
    icon: '📊'
  });

  // Tax-loss harvesting opportunity
  if (userInvestments.totalGain < 0) {
    insights.push({
      priority: 'medium',
      category: 'Tax Strategy',
      message: 'Tax-loss harvesting opportunity',
      action: 'Consider selling losing positions to offset gains',
      icon: '📋'
    });
  }

  res.json({
    success: true,
    data: {
      portfolioValue: userInvestments.totalValue || 0,
      allocation,
      performance: userInvestments.totalReturn || 0,
      insights,
      tips: [
        'Invest consistently regardless of market conditions (dollar-cost averaging)',
        'Rebalance portfolio annually to maintain target allocation',
        'Max out tax-advantaged accounts before taxable brokerage'
      ]
    }
  });
});

// Get debt analysis
router.get('/:userId/debt', (req, res) => {
  const { userId } = req.params;

  // This would integrate with actual debt tracking
  // For now, provide general guidance

  res.json({
    success: true,
    data: {
      totalDebt: 0, // Would come from debt tracking
      debtPayoffStrategy: 'debt-snowball',
      strategies: [
        { name: 'Debt Snowball', description: 'Pay off smallest balances first for motivation', bestFor: 'Psychological wins' },
        { name: 'Debt Avalanche', description: 'Pay off highest interest first to save money', bestFor: 'Mathematical optimization' },
        { name: 'Debt Consolidation', description: 'Combine multiple debts into one', bestFor: 'Simplifying payments' }
      ],
      recommendations: [
        'Pay more than minimum payments when possible',
        'Stop taking on new debt while paying off existing',
        'Consider balance transfer for high-interest credit cards'
      ]
    }
  });
});

// Get financial calendar
router.get('/:userId/calendar', (req, res) => {
  const { userId } = req.params;

  const userExpenses = expenses.get(userId) || [];
  const userGoals = financialGoals.get(userId) || [];
  const userSavings = savingsAccounts.get(userId) || [];

  const events = [];

  // Recurring expenses (estimated)
  const recurringCategories = ['rent', 'subscriptions', 'insurance'];
  recurringCategories.forEach(cat => {
    const catExpenses = userExpenses.filter(e => e.category === cat);
    if (catExpenses.length > 0) {
      const avgAmount = catExpenses.reduce((sum, e) => sum + e.amount, 0) / catExpenses.length;
      events.push({
        type: 'recurring',
        category: cat,
        amount: Math.round(avgAmount * 100) / 100,
        frequency: 'monthly',
        reminder: 'budget'
      });
    }
  });

  // Goal deadlines
  userGoals.forEach(g => {
    if (g.deadline) {
      events.push({
        type: 'goal-deadline',
        goalId: g.id,
        name: g.name,
        amount: g.targetAmount,
        remaining: g.targetAmount - g.currentAmount,
        deadline: g.deadline
      });
    }
  });

  // Savings milestones
  userSavings.forEach(a => {
    if (a.targetAmount) {
      const progress = a.currentAmount / a.targetAmount;
      if (progress >= 0.5 && progress < 1) {
        events.push({
          type: 'milestone',
          account: a.name,
          progress: Math.round(progress * 100),
          remaining: a.targetAmount - a.currentAmount
        });
      }
    }
  });

  res.json({
    success: true,
    data: {
      events,
      upcomingMonth: events.slice(0, 5)
    }
  });
});

// Get monthly summary
router.get('/:userId/monthly', (req, res) => {
  const { userId } = req.params;
  const { month, year } = req.query;

  const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
  const targetYear = year ? parseInt(year) : new Date().getFullYear();

  const userExpenses = expenses.get(userId) || [];
  const userBudget = budgets.get(userId) || {};

  const monthlyExpenses = userExpenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
  });

  const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const income = userBudget.monthlyIncome || 0;
  const savings = income - totalExpenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  // Compare to previous month
  const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
  const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;

  const prevExpenses = userExpenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const prevTotal = prevExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseChange = prevTotal > 0 ? ((totalExpenses - prevTotal) / prevTotal) * 100 : 0;

  res.json({
    success: true,
    data: {
      period: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`,
      income,
      expenses: Math.round(totalExpenses * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      savingsRate: Math.round(savingsRate * 100) / 100,
      expenseChange: Math.round(expenseChange * 100) / 100,
      comparison: expenseChange > 0 ? 'spending_up' : expenseChange < 0 ? 'spending_down' : 'spending_same',
      topCategories: getTopExpenseCategories(monthlyExpenses, 5)
    }
  });
});

// Get wealth projection
router.get('/:userId/projection', (req, res) => {
  const { userId } = req.params;
  const { years = 10 } = req.query;

  const userSavings = savingsAccounts.get(userId) || [];
  const userInvestments = portfolios.get(userId) || {};

  const currentAssets = userSavings.reduce((sum, a) => sum + a.currentAmount, 0) +
                        (userInvestments.totalValue || 0);
  const monthlySavings = 1000; // Estimated

  const projections = [];
  let balance = currentAssets;
  const annualReturn = 0.07; // 7% average return

  for (let y = 0; y <= parseInt(years); y++) {
    if (y > 0) {
      balance = balance * (1 + annualReturn) + (monthlySavings * 12);
    }

    projections.push({
      year: y,
      age: 30 + y, // Would use actual age
      balance: Math.round(balance),
      contributions: y * monthlySavings * 12,
      gains: Math.round(balance - currentAssets - y * monthlySavings * 12)
    });
  }

  res.json({
    success: true,
    data: {
      currentAssets: Math.round(currentAssets),
      monthlySavings,
      annualReturn: annualReturn * 100,
      projections,
      milestones: {
        $100k: projections.find(p => p.balance >= 100000)?.year,
        $250k: projections.find(p => p.balance >= 250000)?.year,
        $500k: projections.find(p => p.balance >= 500000)?.year,
        $1m: projections.find(p => p.balance >= 1000000)?.year
      }
    }
  });
});

// AI financial advisor
router.post('/:userId/ask', (req, res) => {
  const { userId } = req.params;
  const { question } = req.body;

  // Get context
  const userBudget = budgets.get(userId);
  const userSavings = savingsAccounts.get(userId) || [];
  const userGoals = financialGoals.get(userId) || [];

  // Keyword-based responses
  const responses = {
    savings: 'To maximize savings: 1) Pay yourself first - automate transfers, 2) Use high-yield savings (4.5%+ APY), 3) Cut unnecessary subscriptions, 4) Try the 24-hour rule for impulse purchases',
    budget: 'Budgeting tips: 1) Try 50/30/20 rule - 50% needs, 30% wants, 20% savings, 2) Use zero-based budgeting, 3) Track every expense for 30 days first, 4) Set realistic limits per category',
    investing: 'Getting started: 1) Max out 401k to employer match, 2) Open Roth IRA, 3) Use low-cost index funds, 4) Automate monthly contributions, 5) Don\'t time the market',
    debt: 'Debt payoff strategies: 1) Avalanche (highest interest first) saves most money, 2) Snowball (smallest balance first) builds motivation, 3) Consider consolidation for simpler payments',
    emergency: 'Emergency fund: 1) Start with $1,000 mini fund, 2) Build to 3-6 months of expenses, 3) Keep in high-yield savings, 4) Only use for true emergencies',
    retirement: 'Retirement planning: 1) Aim for 15-20% of income, 2) Get full 401k match, 3) Open IRA for additional tax benefits, 4) Increase contributions 1% yearly'
  };

  const keywords = ['savings', 'budget', 'investing', 'debt', 'emergency', 'retirement'];
  let matchedTopic = 'general';

  for (const keyword of keywords) {
    if (question.toLowerCase().includes(keyword)) {
      matchedTopic = keyword;
      break;
    }
  }

  res.json({
    success: true,
    data: {
      question,
      topic: matchedTopic,
      response: responses[matchedTopic],
      context: {
        monthlyIncome: userBudget?.monthlyIncome || 0,
        totalSavings: userSavings.reduce((sum, a) => sum + a.currentAmount, 0),
        activeGoals: userGoals.filter(g => g.status === 'active').length
      }
    }
  });
});

// Helper functions
function calculateSavingsScore(savingsAccounts, monthlyIncome) {
  const totalSavings = savingsAccounts.reduce((sum, a) => sum + a.currentAmount, 0);
  const emergencyFund = savingsAccounts.find(a => a.accountType === 'emergency');

  let score = 0;

  // Emergency fund (30 points)
  if (emergencyFund && emergencyFund.currentAmount >= monthlyIncome * 6) score += 30;
  else if (emergencyFund && emergencyFund.currentAmount >= monthlyIncome * 3) score += 20;
  else if (emergencyFund && emergencyFund.currentAmount >= 1000) score += 10;

  // Overall savings (40 points)
  const monthsOfIncome = monthlyIncome > 0 ? totalSavings / monthlyIncome : 0;
  if (monthsOfIncome >= 12) score += 40;
  else if (monthsOfIncome >= 6) score += 30;
  else if (monthsOfIncome >= 3) score += 20;
  else if (monthsOfIncome >= 1) score += 10;

  // Regular contributions (30 points)
  const accountsWithContributions = savingsAccounts.filter(a => a.monthlyContribution > 0).length;
  score += Math.min(30, accountsWithContributions * 15);

  return Math.min(100, score);
}

function calculateBudgetScore(budget, monthlyExpenses) {
  if (!budget.monthlyIncome) return 50;

  const spendingRate = monthlyExpenses / budget.monthlyIncome;

  if (spendingRate <= 0.8) return 100;
  if (spendingRate <= 0.9) return 85;
  if (spendingRate <= 1.0) return 70;
  if (spendingRate <= 1.1) return 50;
  return 30;
}

function calculateGoalsScore(goals) {
  if (!goals.length) return 50;

  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const activeGoals = goals.filter(g => g.status === 'active');
  const avgProgress = activeGoals.length ?
    activeGoals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount), 0) / activeGoals.length : 0;

  return Math.round((completedGoals * 20) + (avgProgress * 50));
}

function calculateInvestmentScore(portfolio) {
  if (!portfolio.totalValue || portfolio.totalValue < 1000) return 30;

  const allocation = portfolio.allocation || [];
  const diversificationScore = allocation.length >= 3 ? 40 : allocation.length * 15;
  const performanceScore = Math.min(60, (portfolio.totalReturn || 0) + 30);

  return Math.min(100, diversificationScore + performanceScore);
}

function calculateEmergencyScore(savingsAccounts, monthlyExpenses) {
  const emergencyFund = savingsAccounts.find(a => a.accountType === 'emergency');
  const fund = emergencyFund?.currentAmount || 0;
  const months = monthlyExpenses > 0 ? fund / monthlyExpenses : 0;

  if (months >= 6) return 100;
  if (months >= 3) return 70;
  if (months >= 1) return 40;
  if (fund >= 1000) return 20;
  return 0;
}

function calculateSavingsVelocity(savingsAccounts) {
  // Simplified: average monthly growth
  const total = savingsAccounts.reduce((sum, a) => sum + a.currentAmount, 0);
  const contributions = savingsAccounts.reduce((sum, a) => sum + (a.monthlyContribution || 0), 0);
  return contributions;
}

function generateFinancialRecommendations(scores, monthlySavings, savingsRate) {
  const recommendations = [];

  if (scores.emergency < 50) {
    recommendations.push({ priority: 'high', area: 'Emergency Fund', action: 'Build emergency fund to 3-6 months of expenses' });
  }

  if (savingsRate < 20) {
    recommendations.push({ priority: 'high', area: 'Savings Rate', action: 'Increase savings rate to at least 20% of income' });
  }

  if (scores.goals < 40) {
    recommendations.push({ priority: 'medium', area: 'Financial Goals', action: 'Set specific, measurable financial goals' });
  }

  if (monthlySavings > 500) {
    recommendations.push({ priority: 'medium', area: 'Investing', action: 'Consider investing excess savings for long-term growth' });
  }

  return recommendations;
}

function generateSpendingInsights(byCategory) {
  const insights = [];

  const total = Object.values(byCategory).reduce((sum, c) => sum + c.total, 0);
  const housingPercent = (byCategory['housing']?.total || 0) / total;
  if (housingPercent > 0.35) {
    insights.push('Housing costs are above the recommended 30%. Consider roommates or different location.');
  }

  const diningPercent = (byCategory['dining']?.total || 0) / total;
  if (diningPercent > 0.15) {
    insights.push('Dining out is a significant expense. Try meal prepping to save.');
  }

  return insights;
}

function generateSavingsRecommendations(accounts, goals) {
  const recommendations = [];

  if (!accounts.find(a => a.accountType === 'emergency')) {
    recommendations.push('Open a dedicated emergency fund account');
  }

  const avgRate = accounts.length ?
    accounts.reduce((sum, a) => sum + a.interestRate, 0) / accounts.length : 0;
  if (avgRate < 4) {
    recommendations.push('Your savings rate is below market. Switch to a high-yield account.');
  }

  if (goals.length > 0) {
    recommendations.push(`Automate contributions to your ${goals.length} active goals`);
  }

  return recommendations;
}

function getTopExpenseCategories(expenses, limit) {
  const byCategory = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  return Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }));
}

module.exports = router;