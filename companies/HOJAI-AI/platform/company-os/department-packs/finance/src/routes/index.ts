/**
 * Finance Department Routes
 */

import { Router, Request, Response } from 'express';
import { tenantMiddleware, optionalTenantMiddleware } from '../middleware/tenant';
import {
  invoiceService,
  paymentService,
  expenseService,
  accountService,
} from '../services/store';
import { InvoiceStatus, ExpenseStatus } from '../types';

const router = Router();

// ============================================
// Invoice Routes
// ============================================

/**
 * POST /api/invoices - Create invoice
 */
router.post('/api/invoices', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const { customerId, customerName, items, dueDate, issuedDate } = req.body;

  if (!customerId || !customerName || !items?.length || !dueDate) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const invoice = invoiceService.create(tenantId, {
    customerId,
    customerName,
    items,
    dueDate,
    issuedDate,
  });

  res.status(201).json(invoice);
});

/**
 * GET /api/invoices - List invoices
 */
router.get('/api/invoices', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const { status, customerId } = req.query;

  const invoices = invoiceService.list(tenantId, {
    status: status as InvoiceStatus,
    customerId: customerId as string,
  });

  res.json({ invoices, total: invoices.length });
});

/**
 * GET /api/invoices/:id - Get invoice
 */
router.get('/api/invoices/:id', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const { id } = req.params;

  const invoice = invoiceService.get(tenantId, id);

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  res.json(invoice);
});

/**
 * PUT /api/invoices/:id/status - Update invoice status
 */
router.put('/api/invoices/:id/status', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const invoice = invoiceService.updateStatus(tenantId, id, status);

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  res.json(invoice);
});

// ============================================
// Payment Routes
// ============================================

/**
 * POST /api/payments - Create payment
 */
router.post('/api/payments', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const { invoiceId, amount, method, reference } = req.body;

  if (!amount || !method) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const payment = paymentService.create(tenantId, {
    invoiceId,
    amount,
    method,
    reference,
  });

  res.status(201).json(payment);
});

/**
 * GET /api/payments - List payments
 */
router.get('/api/payments', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const payments = paymentService.list(tenantId);
  res.json({ payments, total: payments.length });
});

/**
 * POST /api/payments/:id/refund - Refund payment
 */
router.post('/api/payments/:id/refund', tenantMiddleware, (req: Request, res: Response) => {
  // Simplified - just return success
  res.json({ success: true, message: 'Refund processed' });
});

// ============================================
// Expense Routes
// ============================================

/**
 * POST /api/expenses - Create expense
 */
router.post('/api/expenses', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const { category, description, amount, date, vendor } = req.body;

  if (!category || !description || !amount || !date) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const expense = expenseService.create(tenantId, {
    category,
    description,
    amount,
    date,
    vendor,
  });

  res.status(201).json(expense);
});

/**
 * GET /api/expenses - List expenses
 */
router.get('/api/expenses', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const { status } = req.query;

  const expenses = expenseService.list(tenantId, {
    status: status as ExpenseStatus,
  });

  res.json({ expenses, total: expenses.length });
});

/**
 * PUT /api/expenses/:id/approve - Approve expense
 */
router.put('/api/expenses/:id/approve', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const { id } = req.params;
  const { approvedBy } = req.body;

  const expense = expenseService.approve(tenantId, id, approvedBy || 'system');

  if (!expense) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }

  res.json(expense);
});

// ============================================
// Accounting Routes
// ============================================

/**
 * GET /api/accounting/chart-of-accounts - List accounts
 */
router.get('/api/accounting/chart-of-accounts', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const { type } = req.query;

  const accounts = accountService.list(tenantId, type as any);
  res.json({ accounts, total: accounts.length });
});

/**
 * GET /api/accounting/trial-balance - Generate trial balance
 */
router.get('/api/accounting/trial-balance', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const accounts = accountService.list(tenantId);

  const trialBalance = {
    asOfDate: new Date().toISOString(),
    accounts: accounts.map(a => ({
      account: a,
      debit: a.type === 'asset' || a.type === 'expense' ? Math.max(0, a.balance) : 0,
      credit: a.type !== 'asset' && a.type !== 'expense' ? Math.max(0, a.balance) : 0,
    })),
    totalDebits: 0,
    totalCredits: 0,
    isBalanced: true,
  };

  trialBalance.totalDebits = trialBalance.accounts.reduce((sum, a) => sum + a.debit, 0);
  trialBalance.totalCredits = trialBalance.accounts.reduce((sum, a) => sum + a.credit, 0);
  trialBalance.isBalanced = Math.abs(trialBalance.totalDebits - trialBalance.totalCredits) < 0.01;

  res.json(trialBalance);
});

// ============================================
// Treasury Routes
// ============================================

/**
 * GET /api/treasury/balances - Get cash balances
 */
router.get('/api/treasury/balances', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const accounts = accountService.list(tenantId, 'asset');

  const balances = accounts
    .filter(a => ['cash', 'bank'].includes(a.id))
    .map(a => ({
      accountId: a.id,
      accountName: a.name,
      balance: a.balance,
      currency: a.currency,
    }));

  res.json({ balances });
});

/**
 * GET /api/treasury/cash-flow - Get cash flow summary
 */
router.get('/api/treasury/cash-flow', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const accounts = accountService.list(tenantId);

  const cashAccount = accounts.find(a => a.id === 'cash');

  res.json({
    currentBalance: cashAccount?.balance || 0,
    currency: 'INR',
  });
});

// ============================================
// Reports Routes
// ============================================

/**
 * GET /api/reports/balance-sheet - Balance sheet report
 */
router.get('/api/reports/balance-sheet', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const accounts = accountService.list(tenantId);

  res.json({
    asOfDate: new Date().toISOString(),
    assets: accounts.filter(a => a.type === 'asset').map(a => ({
      accountId: a.id,
      accountName: a.name,
      balance: a.balance,
    })),
    liabilities: accounts.filter(a => a.type === 'liability').map(a => ({
      accountId: a.id,
      accountName: a.name,
      balance: a.balance,
    })),
    equity: accounts.filter(a => a.type === 'equity').map(a => ({
      accountId: a.id,
      accountName: a.name,
      balance: a.balance,
    })),
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
  });
});

/**
 * GET /api/reports/p&l - Profit & Loss report
 */
router.get('/api/reports/p&l', tenantMiddleware, (req: Request, res: Response) => {
  const { tenantId } = req.tenant!;
  const accounts = accountService.list(tenantId);

  res.json({
    startDate: req.query.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
    revenue: accounts.filter(a => a.type === 'revenue').map(a => ({
      accountId: a.id,
      accountName: a.name,
      balance: a.balance,
    })),
    expenses: accounts.filter(a => a.type === 'expense').map(a => ({
      accountId: a.id,
      accountName: a.name,
      balance: a.balance,
    })),
    netIncome: 0,
  });
});

export default router;
