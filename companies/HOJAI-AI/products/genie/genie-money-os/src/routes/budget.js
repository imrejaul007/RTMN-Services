const express = require('express');
const router = express.Router();

// In-memory budget data
const budgets = new Map();
const categories = new Map();

// Default budget categories
const defaultCategories = [
  { id: 'housing', name: 'Housing', icon: '🏠', defaultPercent: 30, type: 'expense' },
  { id: 'transportation', name: 'Transportation', icon: '🚗', defaultPercent: 15, type: 'expense' },
  { id: 'food', name: 'Food & Groceries', icon: '🍽️', defaultPercent: 10, type: 'expense' },
  { id: 'utilities', name: 'Utilities', icon: '💡', defaultPercent: 5, type: 'expense' },
  { id: 'insurance', name: 'Insurance', icon: '🛡️', defaultPercent: 5, type: 'expense' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', defaultPercent: 5, type: 'expense' },
  { id: 'personal', name: 'Personal', icon: '👤', defaultPercent: 10, type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', defaultPercent: 5, type: 'expense' },
  { id: 'savings', name: 'Savings', icon: '💰', defaultPercent: 10, type: 'savings' },
  { id: 'investments', name: 'Investments', icon: '📈', defaultPercent: 5, type: 'investment' }
];

// Create monthly budget
router.post('/:userId', (req, res) => {
  const { userId } = req.params;
  const { monthlyIncome, period = 'monthly', startDay = 1 } = req.body;

  if (!monthlyIncome) {
    return res.status(400).json({
      success: false,
      error: 'monthlyIncome is required'
    });
  }

  // Initialize categories for user
  if (!categories.has(userId)) {
    categories.set(userId, JSON.parse(JSON.stringify(defaultCategories)));
  }

  const budget = {
    id: `budget-${userId}-${Date.now()}`,
    userId,
    monthlyIncome,
    period,
    startDay,
    createdAt: new Date().toISOString(),
    categories: calculateCategoryAmounts(monthlyIncome, categories.get(userId)),
    totalAllocated: monthlyIncome,
    totalRemaining: 0
  };

  budget.totalRemaining = monthlyIncome;

  budgets.set(userId, budget);

  res.json({
    success: true,
    message: 'Budget created successfully',
    data: budget
  });
});

// Get budget
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const { month, year } = req.query;

  const budget = budgets.get(userId);
  if (!budget) {
    return res.status(404).json({
      success: false,
      error: 'No budget found. Create one with POST /budget/:userId'
    });
  }

  res.json({
    success: true,
    data: {
      ...budget,
      categories: categories.get(userId) || defaultCategories
    }
  });
});

// Update budget
router.put('/:userId', (req, res) => {
  const { userId } = req.params;
  const { monthlyIncome, categoryAllocations } = req.body;

  const budget = budgets.get(userId);
  if (!budget) {
    return res.status(404).json({
      success: false,
      error: 'No budget found'
    });
  }

  if (monthlyIncome) {
    budget.monthlyIncome = monthlyIncome;
  }

  if (categoryAllocations) {
    const userCategories = categories.get(userId) || defaultCategories;
    for (const [catId, amount] of Object.entries(categoryAllocations)) {
      const cat = userCategories.find(c => c.id === catId);
      if (cat) {
        cat.amount = amount;
        cat.percent = Math.round((amount / monthlyIncome) * 100);
      }
    }
    categories.set(userId, userCategories);
    budget.categories = userCategories;
  }

  res.json({
    success: true,
    message: 'Budget updated',
    data: budget
  });
});

// Get category details
router.get('/:userId/categories', (req, res) => {
  const { userId } = req.params;

  const userCategories = categories.get(userId) || defaultCategories;

  res.json({
    success: true,
    data: userCategories
  });
});

// Update category
router.put('/:userId/categories/:categoryId', (req, res) => {
  const { userId, categoryId } = req.params;
  const { amount, percent, name, icon } = req.body;

  const userCategories = categories.get(userId) || defaultCategories;
  const category = userCategories.find(c => c.id === categoryId);

  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  if (amount !== undefined) category.amount = amount;
  if (percent !== undefined) category.percent = percent;
  if (name !== undefined) category.name = name;
  if (icon !== undefined) category.icon = icon;

  categories.set(userId, userCategories);

  res.json({
    success: true,
    message: 'Category updated',
    data: category
  });
});

// Add custom category
router.post('/:userId/categories', (req, res) => {
  const { userId } = req.params;
  const { name, icon, amount, percent, type } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'name is required'
    });
  }

  const userCategories = categories.get(userId) || [...defaultCategories];
  const budget = budgets.get(userId);

  const newCategory = {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    icon: icon || '📁',
    amount: amount || 0,
    percent: percent || 0,
    type: type || 'expense',
    custom: true
  };

  userCategories.push(newCategory);
  categories.set(userId, userCategories);

  if (budget) {
    budget.categories.push(newCategory);
    budget.monthlyIncome += amount || 0;
  }

  res.json({
    success: true,
    message: 'Category added',
    data: newCategory
  });
});

// Get budget progress
router.get('/:userId/progress', (req, res) => {
  const { userId } = req.params;
  const { month, year } = req.query;

  const budget = budgets.get(userId);
  const userCategories = categories.get(userId) || defaultCategories;

  if (!budget) {
    return res.status(404).json({
      success: false,
      error: 'No budget found'
    });
  }

  const progress = userCategories.map(cat => ({
    ...cat,
    budgeted: cat.amount || 0,
    spent: cat.spent || 0,
    remaining: (cat.amount || 0) - (cat.spent || 0),
    percentUsed: cat.amount ? Math.round(((cat.spent || 0) / cat.amount) * 100) : 0,
    status: ((cat.spent || 0) / (cat.amount || 1)) > 1 ? 'over' :
            ((cat.spent || 0) / (cat.amount || 1)) > 0.8 ? 'warning' : 'good'
  }));

  const totalBudgeted = progress.reduce((sum, p) => sum + p.budgeted, 0);
  const totalSpent = progress.reduce((sum, p) => sum + p.spent, 0);

  res.json({
    success: true,
    data: {
      monthlyIncome: budget.monthlyIncome,
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgeted - totalSpent,
      percentUsed: Math.round((totalSpent / totalBudgeted) * 100),
      categories: progress,
      daysRemaining: calculateDaysRemaining(budget.startDay)
    }
  });
});

// Allocate spending to category
router.post('/:userId/allocate', (req, res) => {
  const { userId } = req.params;
  const { categoryId, amount, description } = req.body;

  if (!categoryId || amount === undefined) {
    return res.status(400).json({
      success: false,
      error: 'categoryId and amount are required'
    });
  }

  const userCategories = categories.get(userId);
  if (!userCategories) {
    return res.status(404).json({
      success: false,
      error: 'No budget found'
    });
  }

  const category = userCategories.find(c => c.id === categoryId);
  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  category.spent = (category.spent || 0) + amount;

  const overBudget = category.spent > category.amount;

  res.json({
    success: true,
    data: {
      category: category.name,
      allocated: amount,
      totalSpent: category.spent,
      budgeted: category.amount,
      remaining: category.amount - category.spent,
      overBudget,
      warning: overBudget ? `${category.name} is over budget by $${(category.spent - category.amount).toFixed(2)}` : null
    }
  });
});

// Get default categories
router.get('/defaults/categories', (req, res) => {
  res.json({
    success: true,
    data: defaultCategories,
    totalPercent: defaultCategories.reduce((sum, c) => sum + c.defaultPercent, 0)
  });
});

// Generate budget recommendation
router.post('/:userId/recommend', (req, res) => {
  const { userId } = req.params;
  const { monthlyIncome, goals } = req.body;

  if (!monthlyIncome) {
    return res.status(400).json({
      success: false,
      error: 'monthlyIncome is required'
    });
  }

  // 50/30/20 Rule recommended allocation
  const recommendation = {
    rule: '50/30/20 Budget',
    description: 'Traditional budgeting rule: 50% needs, 30% wants, 20% savings',
    allocations: [
      { category: 'Needs (50%)', items: ['Housing (30%)', 'Utilities (5%)', 'Food (10%)', 'Transportation (5%)'], amount: monthlyIncome * 0.5 },
      { category: 'Wants (30%)', items: ['Entertainment (10%)', 'Personal (15%)', 'Dining Out (5%)'], amount: monthlyIncome * 0.3 },
      { category: 'Savings (20%)', items: ['Emergency Fund (10%)', 'Investments (10%)'], amount: monthlyIncome * 0.2 }
    ]
  };

  // Custom recommendations based on goals
  const customRecommendations = [];

  if (goals?.includes('emergency-fund')) {
    customRecommendations.push({
      priority: 'high',
      tip: 'Build 3-6 months emergency fund before other investments',
      action: 'Allocate 10% extra to savings until fund is complete'
    });
  }

  if (goals?.includes('debt-free')) {
    customRecommendations.push({
      priority: 'high',
      tip: 'Use debt snowball method - pay minimums on all, extra on smallest',
      action: 'Consider 50/30/20 with extra 10% to debt payoff'
    });
  }

  if (goals?.includes('home')) {
    customRecommendations.push({
      priority: 'medium',
      tip: 'Save 20% down payment over 3-5 years',
      action: `Save $${Math.round(monthlyIncome * 0.15)}/month to reach ${Math.round(monthlyIncome * 180 * 0.15)} in 5 years`
    });
  }

  res.json({
    success: true,
    data: {
      recommendation,
      customRecommendations,
      monthlyIncome
    }
  });
});

// Helper functions
function calculateCategoryAmounts(income, userCategories) {
  if (!userCategories) return defaultCategories;

  return userCategories.map(cat => ({
    ...cat,
    amount: cat.amount || Math.round(income * (cat.percent || cat.defaultPercent) / 100)
  }));
}

function calculateDaysRemaining(startDay) {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const currentDay = today.getDate();
  return Math.max(0, lastDay.getDate() - currentDay);
}

module.exports = router;