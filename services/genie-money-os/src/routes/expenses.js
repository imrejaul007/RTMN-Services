const express = require('express');
const router = express.Router();

// In-memory expense data
const expenses = new Map();
const expenseCategories = new Map();

// Default expense categories with icons
const defaultExpenseCategories = [
  { id: 'housing', name: 'Housing', icon: '🏠', color: '#4A90D9' },
  { id: 'rent', name: 'Rent/Mortgage', icon: '🏠', color: '#4A90D9', parentId: 'housing' },
  { id: 'utilities', name: 'Utilities', icon: '💡', color: '#F5A623', parentId: 'housing' },
  { id: 'transportation', name: 'Transportation', icon: '🚗', color: '#7B68EE' },
  { id: 'gas', name: 'Gas', icon: '⛽', color: '#7B68EE', parentId: 'transportation' },
  { id: 'car-payment', name: 'Car Payment', icon: '🚙', color: '#7B68EE', parentId: 'transportation' },
  { id: 'insurance', name: 'Insurance', icon: '🛡️', color: '#50C878' },
  { id: 'health-insurance', name: 'Health Insurance', icon: '🏥', color: '#50C878', parentId: 'insurance' },
  { id: 'car-insurance', name: 'Car Insurance', icon: '🚗', color: '#50C878', parentId: 'insurance' },
  { id: 'food', name: 'Food', icon: '🍽️', color: '#FF6B6B' },
  { id: 'groceries', name: 'Groceries', icon: '🛒', color: '#FF6B6B', parentId: 'food' },
  { id: 'dining', name: 'Dining Out', icon: '🍜', color: '#FF6B6B', parentId: 'food' },
  { id: 'coffee', name: 'Coffee', icon: '☕', color: '#FF6B6B', parentId: 'food' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', color: '#FF69B4' },
  { id: 'personal', name: 'Personal', icon: '👤', color: '#9B59B6' },
  { id: 'clothing', name: 'Clothing', icon: '👕', color: '#9B59B6', parentId: 'personal' },
  { id: 'personal-care', name: 'Personal Care', icon: '💆', color: '#9B59B6', parentId: 'personal' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#E74C3C' },
  { id: 'subscriptions', name: 'Subscriptions', icon: '📱', color: '#E74C3C', parentId: 'entertainment' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#FF69B4' },
  { id: 'education', name: 'Education', icon: '📚', color: '#3498DB' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#1ABC9C' },
  { id: 'gifts', name: 'Gifts', icon: '🎁', color: '#E91E63' },
  { id: 'debt', name: 'Debt Payments', icon: '💳', color: '#795548' },
  { id: 'other', name: 'Other', icon: '📌', color: '#9E9E9E' }
];

// Log expense
router.post('/:userId', (req, res) => {
  const { userId } = req.params;
  const { amount, category, description, merchant, date, tags, recurring, notes } = req.body;

  if (!amount || !category) {
    return res.status(400).json({
      success: false,
      error: 'amount and category are required'
    });
  }

  const expense = {
    id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    amount,
    category,
    description: description || '',
    merchant: merchant || '',
    date: date || new Date().toISOString(),
    tags: tags || [],
    recurring: recurring || null,
    notes: notes || '',
    createdAt: new Date().toISOString()
  };

  if (!expenses.has(userId)) {
    expenses.set(userId, []);
  }
  expenses.get(userId).push(expense);

  // Update category spending
  if (!expenseCategories.has(userId)) {
    expenseCategories.set(userId, JSON.parse(JSON.stringify(defaultExpenseCategories)));
  }
  const cats = expenseCategories.get(userId);
  const cat = cats.find(c => c.id === category);
  if (cat) {
    cat.spent = (cat.spent || 0) + amount;
    cat.count = (cat.count || 0) + 1;
  }

  res.json({
    success: true,
    message: 'Expense logged',
    data: {
      expense,
      monthlyTotal: getMonthlyTotal(userId),
      categoryTotal: cat ? cat.spent : amount
    }
  });
});

// Get expenses
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const { month, year, category, startDate, endDate, limit = 100 } = req.query;

  let userExpenses = expenses.get(userId) || [];

  // Filter by date
  if (month && year) {
    userExpenses = userExpenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year);
    });
  } else if (startDate && endDate) {
    userExpenses = userExpenses.filter(e => {
      const d = new Date(e.date);
      return d >= new Date(startDate) && d <= new Date(endDate);
    });
  }

  // Filter by category
  if (category) {
    userExpenses = userExpenses.filter(e => e.category === category);
  }

  // Sort by date descending
  userExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Limit results
  userExpenses = userExpenses.slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      expenses: userExpenses,
      count: userExpenses.length,
      total: userExpenses.reduce((sum, e) => sum + e.amount, 0)
    }
  });
});

// Get expense summary
router.get('/:userId/summary', (req, res) => {
  const { userId } = req.params;
  const { month, year } = req.query;

  const currentDate = new Date();
  const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
  const targetYear = year ? parseInt(year) : currentDate.getFullYear();

  const userExpenses = (expenses.get(userId) || []).filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
  });

  // Group by category
  const byCategory = {};
  userExpenses.forEach(e => {
    if (!byCategory[e.category]) {
      byCategory[e.category] = { total: 0, count: 0, expenses: [] };
    }
    byCategory[e.category].total += e.amount;
    byCategory[e.category].count++;
    byCategory[e.category].expenses.push(e);
  });

  // Group by merchant
  const byMerchant = {};
  userExpenses.forEach(e => {
    const merchant = e.merchant || 'Unknown';
    if (!byMerchant[merchant]) {
      byMerchant[merchant] = { total: 0, count: 0 };
    }
    byMerchant[merchant].total += e.amount;
    byMerchant[merchant].count++;
  });

  // Get top merchants
  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([name, data]) => ({ name, ...data }));

  // Calculate totals
  const total = userExpenses.reduce((sum, e) => sum + e.amount, 0);
  const average = userExpenses.length ? total / userExpenses.length : 0;

  res.json({
    success: true,
    data: {
      period: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`,
      total,
      count: userExpenses.length,
      average,
      byCategory: Object.entries(byCategory).map(([id, data]) => ({
        id,
        name: getCategoryName(id),
        icon: getCategoryIcon(id),
        ...data
      })),
      topMerchants,
      topCategories: Object.entries(byCategory)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([id, data]) => ({ id, name: getCategoryName(id), total: data.total }))
    }
  });
});

// Get monthly trends
router.get('/:userId/trends', (req, res) => {
  const { userId } = req.params;
  const { months = 6 } = req.query;

  const userExpenses = expenses.get(userId) || [];
  const trends = [];
  const currentDate = new Date();

  for (let i = parseInt(months) - 1; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const monthExpenses = userExpenses.filter(e => {
      const ed = new Date(e.date);
      return ed.getMonth() + 1 === month && ed.getFullYear() === year;
    });

    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    trends.push({
      month: `${year}-${String(month).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      total: Math.round(total * 100) / 100,
      count: monthExpenses.length,
      average: monthExpenses.length ? Math.round((total / monthExpenses.length) * 100) / 100 : 0
    });
  }

  // Calculate trend direction
  const recentAvg = trends.slice(-3).reduce((sum, t) => sum + t.total, 0) / 3;
  const olderAvg = trends.slice(0, 3).reduce((sum, t) => sum + t.total, 0) / 3;
  const trend = recentAvg > olderAvg * 1.05 ? 'increasing' :
                recentAvg < olderAvg * 0.95 ? 'decreasing' : 'stable';

  res.json({
    success: true,
    data: {
      trends,
      trend,
      changePercent: olderAvg ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0
    }
  });
});

// Delete expense
router.delete('/:userId/:expenseId', (req, res) => {
  const { userId, expenseId } = req.params;

  const userExpenses = expenses.get(userId) || [];
  const index = userExpenses.findIndex(e => e.id === expenseId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Expense not found'
    });
  }

  const deleted = userExpenses.splice(index, 1)[0];

  res.json({
    success: true,
    message: 'Expense deleted',
    data: { deleted }
  });
});

// Update expense
router.put('/:userId/:expenseId', (req, res) => {
  const { userId, expenseId } = req.params;
  const updates = req.body;

  const userExpenses = expenses.get(userId) || [];
  const expense = userExpenses.find(e => e.id === expenseId);

  if (!expense) {
    return res.status(404).json({
      success: false,
      error: 'Expense not found'
    });
  }

  Object.assign(expense, updates, { updatedAt: new Date().toISOString() });

  res.json({
    success: true,
    message: 'Expense updated',
    data: expense
  });
});

// Get categories
router.get('/categories/all', (req, res) => {
  const cats = expenseCategories.get('global') || defaultExpenseCategories;
  res.json({
    success: true,
    data: cats
  });
});

// Split expense (for roommates, groups)
router.post('/:userId/split', (req, res) => {
  const { userId } = req.params;
  const { amount, splitWith, description, category, date } = req.body;

  if (!amount || !splitWith || !Array.isArray(splitWith)) {
    return res.status(400).json({
      success: false,
      error: 'amount and splitWith (array) are required'
    });
  }

  const splitAmount = amount / (splitWith.length + 1); // +1 for payer

  const splits = splitWith.map(person => ({
    person,
    amount: Math.round(splitAmount * 100) / 100,
    paid: false
  }));

  splits.push({
    person: userId,
    amount: Math.round(splitAmount * 100) / 100,
    paid: true
  });

  res.json({
    success: true,
    data: {
      totalAmount: amount,
      splitCount: splits.length,
      perPerson: Math.round(splitAmount * 100) / 100,
      splits,
      description: description || 'Split expense',
      category,
      date: date || new Date().toISOString()
    }
  });
});

// Get recurring expenses
router.get('/:userId/recurring', (req, res) => {
  const { userId } = req.params;

  const userExpenses = expenses.get(userId) || [];
  const recurring = userExpenses.filter(e => e.recurring);

  const byFrequency = {
    monthly: recurring.filter(e => e.recurring === 'monthly'),
    weekly: recurring.filter(e => e.recurring === 'weekly'),
    yearly: recurring.filter(e => e.recurring === 'yearly')
  };

  const monthlyTotal = byFrequency.monthly.reduce((sum, e) => sum + e.amount, 0) * 12 +
                       byFrequency.yearly.reduce((sum, e) => sum + e.amount, 0);

  res.json({
    success: true,
    data: {
      recurring: byFrequency,
      summary: {
        monthlyTotal,
        yearlyTotal: monthlyTotal,
        count: recurring.length
      }
    }
  });
});

// Helper functions
function getMonthlyTotal(userId) {
  const userExpenses = expenses.get(userId) || [];
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  return userExpenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

function getCategoryName(categoryId) {
  const cat = defaultExpenseCategories.find(c => c.id === categoryId);
  return cat ? cat.name : categoryId;
}

function getCategoryIcon(categoryId) {
  const cat = defaultExpenseCategories.find(c => c.id === categoryId);
  return cat ? cat.icon : '📌';
}

module.exports = router;