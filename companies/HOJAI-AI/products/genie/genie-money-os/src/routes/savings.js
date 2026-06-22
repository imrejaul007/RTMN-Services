const express = require('express');
const router = express.Router();

// In-memory savings data
const savingsAccounts = new Map();
const savingsGoals = new Map();
const savingsTransactions = new Map();

// Savings account types
const accountTypes = [
  { id: 'emergency', name: 'Emergency Fund', icon: '🆘', targetMonths: 6, description: '3-6 months of expenses' },
  { id: 'vacation', name: 'Vacation Fund', icon: '✈️', targetAmount: 5000, description: 'Dream vacation savings' },
  { id: 'home', name: 'Home Down Payment', icon: '🏠', targetAmount: 50000, description: '20% down payment' },
  { id: 'car', name: 'Car Fund', icon: '🚗', targetAmount: 15000, description: 'Next car purchase' },
  { id: 'education', name: 'Education Fund', icon: '🎓', targetAmount: 30000, description: 'Degree or course savings' },
  { id: 'wedding', name: 'Wedding Fund', icon: '💒', targetAmount: 20000, description: 'Dream wedding savings' },
  { id: 'retirement', name: 'Retirement', icon: '🏖️', targetAmount: 1000000, description: 'Long-term retirement' },
  { id: 'general', name: 'General Savings', icon: '💰', targetAmount: null, description: 'Flexible savings' }
];

// Create savings account
router.post('/:userId/accounts', (req, res) => {
  const { userId } = req.params;
  const { name, accountType, targetAmount, monthlyContribution, startDate } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'name is required'
    });
  }

  const account = {
    id: `savings-${Date.now()}`,
    userId,
    name,
    accountType: accountType || 'general',
    targetAmount: targetAmount || null,
    currentAmount: 0,
    monthlyContribution: monthlyContribution || 0,
    startDate: startDate || new Date().toISOString(),
    interestRate: getInterestRate(accountType || 'general'),
    createdAt: new Date().toISOString(),
    transactions: []
  };

  if (!savingsAccounts.has(userId)) {
    savingsAccounts.set(userId, []);
  }
  savingsAccounts.get(userId).push(account);

  res.json({
    success: true,
    message: 'Savings account created',
    data: {
      account,
      projectedValue: calculateProjectedValue(account),
      monthsToGoal: account.targetAmount ?
        calculateMonthsToGoal(account.currentAmount, account.targetAmount, account.monthlyContribution) : null
    }
  });
});

// Get savings accounts
router.get('/:userId/accounts', (req, res) => {
  const { userId } = req.params;

  const accounts = savingsAccounts.get(userId) || [];

  const withProjections = accounts.map(account => ({
    ...account,
    projectedValue: calculateProjectedValue(account),
    progress: account.targetAmount ?
      Math.round((account.currentAmount / account.targetAmount) * 100) : null,
    onTrack: account.targetAmount ?
      (account.currentAmount / (getMonthsElapsed(account.startDate) * account.monthlyContribution || 1)) >= 0.8 :
      null
  }));

  const totalSavings = accounts.reduce((sum, a) => sum + a.currentAmount, 0);
  const totalTarget = accounts.reduce((sum, a) => sum + (a.targetAmount || 0), 0);

  res.json({
    success: true,
    data: {
      accounts: withProjections,
      summary: {
        totalAccounts: accounts.length,
        totalSavings: Math.round(totalSavings * 100) / 100,
        totalTarget: totalTarget || null,
        overallProgress: totalTarget ? Math.round((totalSavings / totalTarget) * 100) : null
      }
    }
  });
});

// Get specific account
router.get('/:userId/accounts/:accountId', (req, res) => {
  const { userId, accountId } = req.params;

  const accounts = savingsAccounts.get(userId) || [];
  const account = accounts.find(a => a.id === accountId);

  if (!account) {
    return res.status(404).json({
      success: false,
      error: 'Account not found'
    });
  }

  res.json({
    success: true,
    data: {
      ...account,
      projectedValue: calculateProjectedValue(account),
      progress: account.targetAmount ?
        Math.round((account.currentAmount / account.targetAmount) * 100) : null,
      transactions: (account.transactions || []).slice(-20)
    }
  });
});

// Deposit to savings
router.post('/:userId/accounts/:accountId/deposit', (req, res) => {
  const { userId, accountId } = req.params;
  const { amount, source, date, notes } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Valid amount is required'
    });
  }

  const accounts = savingsAccounts.get(userId) || [];
  const account = accounts.find(a => a.id === accountId);

  if (!account) {
    return res.status(404).json({
      success: false,
      error: 'Account not found'
    });
  }

  const transaction = {
    id: `txn-${Date.now()}`,
    type: 'deposit',
    amount,
    source: source || 'manual',
    date: date || new Date().toISOString(),
    notes: notes || '',
    balanceAfter: account.currentAmount + amount
  };

  account.currentAmount += amount;
  account.transactions = account.transactions || [];
  account.transactions.push(transaction);

  res.json({
    success: true,
    message: `Deposited $${amount.toFixed(2)}`,
    data: {
      transaction,
      newBalance: account.currentAmount,
      progress: account.targetAmount ?
        Math.round((account.currentAmount / account.targetAmount) * 100) : null,
      remaining: account.targetAmount ? account.targetAmount - account.currentAmount : null
    }
  });
});

// Withdraw from savings
router.post('/:userId/accounts/:accountId/withdraw', (req, res) => {
  const { userId, accountId } = req.params;
  const { amount, reason, date } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Valid amount is required'
    });
  }

  const accounts = savingsAccounts.get(userId) || [];
  const account = accounts.find(a => a.id === accountId);

  if (!account) {
    return res.status(404).json({
      success: false,
      error: 'Account not found'
    });
  }

  if (amount > account.currentAmount) {
    return res.status(400).json({
      success: false,
      error: 'Insufficient funds',
      available: account.currentAmount
    });
  }

  const transaction = {
    id: `txn-${Date.now()}`,
    type: 'withdrawal',
    amount,
    reason: reason || 'Manual withdrawal',
    date: date || new Date().toISOString(),
    balanceAfter: account.currentAmount - amount
  };

  account.currentAmount -= amount;
  account.transactions.push(transaction);

  res.json({
    success: true,
    message: `Withdrew $${amount.toFixed(2)}`,
    data: {
      transaction,
      newBalance: account.currentAmount,
      remaining: account.targetAmount ? account.targetAmount - account.currentAmount : null
    }
  });
});

// Get account transactions
router.get('/:userId/accounts/:accountId/transactions', (req, res) => {
  const { userId, accountId } = req.params;
  const { limit = 50 } = req.query;

  const accounts = savingsAccounts.get(userId) || [];
  const account = accounts.find(a => a.id === accountId);

  if (!account) {
    return res.status(404).json({
      success: false,
      error: 'Account not found'
    });
  }

  const transactions = (account.transactions || [])
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      account: account.name,
      transactions,
      summary: {
        totalDeposits: transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0),
        totalWithdrawals: transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0)
      }
    }
  });
});

// Set savings goal
router.post('/:userId/goals', (req, res) => {
  const { userId } = req.params;
  const { name, targetAmount, deadline, monthlyAllocation, priority } = req.body;

  if (!name || !targetAmount) {
    return res.status(400).json({
      success: false,
      error: 'name and targetAmount are required'
    });
  }

  const goal = {
    id: `goal-${Date.now()}`,
    userId,
    name,
    targetAmount,
    currentAmount: 0,
    monthlyAllocation: monthlyAllocation || Math.round(targetAmount / 12),
    deadline: deadline || null,
    priority: priority || 'medium',
    createdAt: new Date().toISOString(),
    milestones: generateMilestones(targetAmount)
  };

  if (!savingsGoals.has(userId)) {
    savingsGoals.set(userId, []);
  }
  savingsGoals.get(userId).push(goal);

  res.json({
    success: true,
    message: 'Savings goal created',
    data: {
      goal,
      recommendedMonthly: Math.round(targetAmount / 12),
      monthsToGoal: deadline ?
        calculateMonthsToDeadline(targetAmount, 0, monthlyAllocation, new Date(deadline)) :
        Math.ceil(targetAmount / (monthlyAllocation || targetAmount / 12))
    }
  });
});

// Get savings goals
router.get('/:userId/goals', (req, res) => {
  const { userId } = req.params;

  const goals = savingsGoals.get(userId) || [];

  const withProgress = goals.map(g => ({
    ...g,
    progress: Math.round((g.currentAmount / g.targetAmount) * 100),
    remaining: g.targetAmount - g.currentAmount,
    monthsRemaining: g.deadline ?
      getMonthsUntil(new Date(g.deadline)) :
      Math.ceil((g.targetAmount - g.currentAmount) / (g.monthlyAllocation || 1)),
    status: g.currentAmount >= g.targetAmount ? 'completed' :
            g.deadline && new Date(g.deadline) < new Date() ? 'overdue' : 'active'
  }));

  res.json({
    success: true,
    data: {
      goals: withProgress,
      summary: {
        totalGoals: goals.length,
        completed: withProgress.filter(g => g.status === 'completed').length,
        totalSaved: goals.reduce((sum, g) => sum + g.currentAmount, 0),
        totalTarget: goals.reduce((sum, g) => sum + g.targetAmount, 0)
      }
    }
  });
});

// Add to savings goal
router.post('/:userId/goals/:goalId/contribute', (req, res) => {
  const { userId, goalId } = req.params;
  const { amount, date } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Valid amount is required'
    });
  }

  const goals = savingsGoals.get(userId) || [];
  const goal = goals.find(g => g.id === goalId);

  if (!goal) {
    return res.status(404).json({
      success: false,
      error: 'Goal not found'
    });
  }

  goal.currentAmount += amount;

  // Check for milestones
  const achievedMilestones = goal.milestones.filter(m =>
    goal.currentAmount >= m.amount && !m.achieved
  );
  achievedMilestones.forEach(m => m.achieved = true);

  res.json({
    success: true,
    data: {
      contribution: amount,
      newTotal: goal.currentAmount,
      progress: Math.round((goal.currentAmount / goal.targetAmount) * 100),
      achievedMilestones: achievedMilestones.length,
      completed: goal.currentAmount >= goal.targetAmount
    }
  });
});

// Get account types
router.get('/account-types', (req, res) => {
  res.json({
    success: true,
    data: accountTypes
  });
});

// Calculate savings projection
router.post('/:userId/project', (req, res) => {
  const { userId } = req.params;
  const { startingAmount, monthlyContribution, interestRate, years } = req.body;

  const projections = [];
  let balance = startingAmount || 0;
  const monthlyRate = (interestRate || 4) / 100 / 12;
  const months = (years || 5) * 12;

  for (let m = 0; m <= months; m++) {
    if (m > 0) {
      balance = balance * (1 + monthlyRate) + (monthlyContribution || 0);
    }

    if (m % 12 === 0) {
      projections.push({
        year: m / 12,
        balance: Math.round(balance * 100) / 100,
        contributions: m * (monthlyContribution || 0),
        interestEarned: Math.round((balance - startingAmount - m * (monthlyContribution || 0)) * 100) / 100
      });
    }
  }

  res.json({
    success: true,
    data: {
      projectionYears: years || 5,
      startingAmount: startingAmount || 0,
      monthlyContribution: monthlyContribution || 0,
      annualInterestRate: interestRate || 4,
      finalBalance: projections[projections.length - 1]?.balance || 0,
      totalContributions: (monthlyContribution || 0) * months,
      totalInterest: projections[projections.length - 1]?.interestEarned || 0,
      yearlyProjection: projections
    }
  });
});

// Helper functions
function getInterestRate(accountType) {
  const rates = {
    emergency: 4.5,
    vacation: 4.0,
    home: 4.5,
    car: 4.0,
    education: 4.5,
    wedding: 3.5,
    retirement: 7.0,
    general: 4.0
  };
  return rates[accountType] || 4.0;
}

function calculateProjectedValue(account) {
  const monthsElapsed = getMonthsElapsed(account.startDate);
  const monthlyRate = account.interestRate / 100 / 12;
  let projected = account.currentAmount;

  for (let i = 0; i < monthsElapsed; i++) {
    projected = projected * (1 + monthlyRate) + account.monthlyContribution;
  }

  return Math.round(projected * 100) / 100;
}

function calculateMonthsToGoal(current, target, monthlyContribution) {
  if (current >= target) return 0;
  if (monthlyContribution <= 0) return null;

  const monthlyRate = 0.04 / 12; // Average 4% APY
  let balance = current;
  let months = 0;

  while (balance < target && months < 600) { // Max 50 years
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    months++;
  }

  return months;
}

function calculateMonthsToDeadline(target, current, monthly, deadline) {
  const monthsRemaining = getMonthsUntil(new Date(deadline));
  const amountNeeded = target - current;
  const requiredMonthly = amountNeeded / monthsRemaining;

  return {
    monthsRemaining,
    requiredMonthly: Math.round(requiredMonthly * 100) / 100,
    achievable: monthly >= requiredMonthly
  };
}

function getMonthsElapsed(startDate) {
  const start = new Date(startDate);
  const now = new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

function getMonthsUntil(date) {
  const target = new Date(date);
  const now = new Date();
  return Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
}

function generateMilestones(targetAmount) {
  const milestones = [
    { amount: targetAmount * 0.25, label: '25% - Foundation', achieved: false },
    { amount: targetAmount * 0.50, label: '50% - Halfway There', achieved: false },
    { amount: targetAmount * 0.75, label: '75% - Almost Done', achieved: false },
    { amount: targetAmount, label: '100% - Goal Achieved!', achieved: false }
  ];
  return milestones;
}

module.exports = router;