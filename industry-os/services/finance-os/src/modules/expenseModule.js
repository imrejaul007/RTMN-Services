/**
 * RTMN Finance OS - Expense Module
 */

import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Expense Categories
const EXPENSE_CATEGORIES = [
  { id: 'travel', name: 'Travel', icon: '✈️', limit: 50000 },
  { id: 'meals', name: 'Meals & Entertainment', icon: '🍽️', limit: 5000 },
  { id: 'accommodation', name: 'Accommodation', icon: '🏨', limit: 15000 },
  { id: 'office_supplies', name: 'Office Supplies', icon: '📎', limit: 10000 },
  { id: 'software', name: 'Software & Subscriptions', icon: '💻', limit: 20000 },
  { id: 'training', name: 'Training & Education', icon: '📚', limit: 50000 },
  { id: 'fuel', name: 'Fuel & Transport', icon: '⛽', limit: 10000 },
  { id: 'client_entertainment', name: 'Client Entertainment', icon: '🤝', limit: 20000 },
  { id: 'communication', name: 'Communication', icon: '📱', limit: 5000 },
  { id: 'utilities', name: 'Utilities', icon: '💡', limit: 10000 },
  { id: 'maintenance', name: 'Maintenance', icon: '🔧', limit: 20000 },
  { id: 'insurance', name: 'Insurance', icon: '🛡️', limit: 30000 },
  { id: 'legal', name: 'Legal & Professional', icon: '⚖️', limit: 50000 },
  { id: 'marketing', name: 'Marketing', icon: '📢', limit: 50000 },
  { id: 'other', name: 'Other', icon: '📦', limit: 10000 },
];

// Get expense categories
router.get('/categories', (req, res) => {
  res.json({
    categories: EXPENSE_CATEGORIES,
    total: EXPENSE_CATEGORIES.length
  });
});

// Submit expense
router.post('/', (req, res) => {
  const { employeeId, employeeName, category, description, amount, date, receipt, policyId } = req.body;

  if (!employeeId || !category || !amount || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = `EXP${String(db.expenses.size + 1).padStart(4, '0')}`;
  const categoryInfo = EXPENSE_CATEGORIES.find(c => c.id === category) || EXPENSE_CATEGORIES[14];

  // Policy check
  const overLimit = amount > categoryInfo.limit;
  const policyViolation = overLimit ? `Exceeds ${categoryInfo.name} limit of ₹${categoryInfo.limit}` : null;

  const expense = {
    id,
    employeeId,
    employeeName: employeeName || 'Unknown',
    category,
    categoryName: categoryInfo.name,
    description: description || '',
    amount,
    currency: 'INR',
    date,
    receipt: receipt || null,
    status: overLimit ? 'pending_approval' : 'pending',
    policyViolation,
    approvedBy: null,
    approvedAt: null,
    notes: '',
    createdAt: new Date().toISOString(),
  };

  db.expenses.set(id, expense);

  // Update department budget if applicable
  if (req.body.departmentId) {
    const budget = Array.from(db.budgets.values()).find(b => b.department === req.body.departmentId);
    if (budget) {
      budget.spent += amount;
      budget.expenses = budget.expenses || [];
      budget.expenses.push(id);
      db.budgets.set(budget.id, budget);
    }
  }

  // Create GL entry
  const jeId = `JE${db.journalEntries.size + 1}`;
  const journalEntry = {
    id: jeId,
    date,
    description: `Expense: ${categoryInfo.name} - ${employeeName || employeeId}`,
    reference: id,
    entries: [
      { account: 'OFFICE_EXP', debit: amount, credit: 0 },
      { account: 'CASH', debit: 0, credit: amount },
    ],
    status: 'posted',
    source: 'expense',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  };
  db.journalEntries.set(jeId, journalEntry);

  res.status(201).json(expense);
});

// Get expenses
router.get('/', (req, res) => {
  const { employeeId, status, category, startDate, endDate, departmentId } = req.query;
  let expenses = Array.from(db.expenses.values());

  if (employeeId) expenses = expenses.filter(e => e.employeeId === employeeId);
  if (status) expenses = expenses.filter(e => e.status === status);
  if (category) expenses = expenses.filter(e => e.category === category);
  if (startDate) expenses = expenses.filter(e => e.date >= startDate);
  if (endDate) expenses = expenses.filter(e => e.date <= endDate);

  expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    expenses,
    total: expenses.length,
    summary: {
      totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
      pending: expenses.filter(e => e.status === 'pending' || e.status === 'pending_approval').reduce((sum, e) => sum + e.amount, 0),
      approved: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
      rejected: expenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + e.amount, 0),
    }
  });
});

// Approve/reject expense
router.patch('/:id/approve', (req, res) => {
  const expense = db.expenses.get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Expense not found' });

  const { status, approvedBy, notes } = req.body;

  expense.status = status;
  expense.approvedBy = approvedBy || 'manager';
  expense.approvedAt = new Date().toISOString();
  expense.notes = notes || '';

  db.expenses.set(req.params.id, expense);
  res.json(expense);
});

// OCR receipt processing (simulated)
router.post('/ocr', (req, res) => {
  const { imageUrl } = req.body;

  // Simulated OCR result
  const ocrResult = {
    amount: Math.floor(Math.random() * 5000) + 500,
    date: new Date().toISOString().split('T')[0],
    category: EXPENSE_CATEGORIES[Math.floor(Math.random() * 5)].id,
    merchant: 'Sample Merchant',
    confidence: 0.95,
    raw: 'Sample expense from receipt',
  };

  res.json({
    success: true,
    data: ocrResult,
    message: 'Receipt scanned successfully',
  });
});

// Policy check
router.post('/policy-check', (req, res) => {
  const { employeeId, category, amount } = req.body;
  const categoryInfo = EXPENSE_CATEGORIES.find(c => c.id === category) || EXPENSE_CATEGORIES[14];

  const checks = {
    category: categoryInfo.name,
    amount,
    limit: categoryInfo.limit,
    withinLimit: amount <= categoryInfo.limit,
    requiresApproval: amount > categoryInfo.limit,
    policy: {
      allowed: true,
      restrictions: amount > categoryInfo.limit ? [`Max ₹${categoryInfo.limit} per ${categoryInfo.name}`] : [],
      suggestions: [],
    },
  };

  if (amount > categoryInfo.limit * 2) {
    checks.policy.allowed = false;
    checks.policy.restrictions.push('Amount exceeds 2x limit - may be rejected');
  }

  res.json(checks);
});

// Analytics
router.get('/analytics', (req, res) => {
  const { startDate, endDate, departmentId } = req.query;
  let expenses = Array.from(db.expenses.values());

  if (startDate) expenses = expenses.filter(e => e.date >= startDate);
  if (endDate) expenses = expenses.filter(e => e.date <= endDate);

  // By category
  const byCategory = {};
  EXPENSE_CATEGORIES.forEach(cat => {
    const catExpenses = expenses.filter(e => e.category === cat.id);
    byCategory[cat.name] = {
      count: catExpenses.length,
      amount: catExpenses.reduce((sum, e) => sum + e.amount, 0),
    };
  });

  // By employee
  const byEmployee = {};
  expenses.forEach(e => {
    if (!byEmployee[e.employeeId]) {
      byEmployee[e.employeeId] = { name: e.employeeName, count: 0, amount: 0 };
    }
    byEmployee[e.employeeId].count++;
    byEmployee[e.employeeId].amount += e.amount;
  });

  // Top expenses
  const topExpenses = expenses.sort((a, b) => b.amount - a.amount).slice(0, 10);

  res.json({
    period: { startDate, endDate },
    total: {
      count: expenses.length,
      amount: expenses.reduce((sum, e) => sum + e.amount, 0),
    },
    byCategory,
    byEmployee: Object.entries(byEmployee).map(([id, data]) => ({ employeeId: id, ...data })),
    topExpenses,
    pendingApproval: expenses.filter(e => e.status === 'pending' || e.status === 'pending_approval').length,
    avgPerExpense: expenses.length > 0 ? expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length : 0,
  });
});

export default router;
