/**
 * HOJAI Finance Accounting Service
 * Ledger, invoices, financial reports
 * Reuses: RIDZA FinanceOS pattern
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  parentId?: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  entries: { accountId: string; accountName: string; debit: number; credit: number }[];
  amount: number;
  type: 'journal' | 'payment' | 'receipt' | 'invoice' | 'expense';
  reference?: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: { description: string; quantity: number; rate: number; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor?: string;
  receipt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
}

interface FinancialReport {
  type: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'trial_balance';
  period: { from: string; to: string };
  generatedAt: string;
  data: any;
}

const accounts = new Map<string, Account>();
const transactions = new Map<string, Transaction>();
const invoices = new Map<string, Invoice>();
const expenses = new Map<string, Expense>();

// Initialize default chart of accounts
function initAccounts(): void {
  const defaultAccounts: Omit<Account, 'id'>[] = [
    { code: '1000', name: 'Cash', type: 'asset', balance: 0 },
    { code: '1100', name: 'Bank', type: 'asset', balance: 0 },
    { code: '1200', name: 'Accounts Receivable', type: 'asset', balance: 0 },
    { code: '1500', name: 'Inventory', type: 'asset', balance: 0 },
    { code: '2000', name: 'Accounts Payable', type: 'liability', balance: 0 },
    { code: '2100', name: 'Tax Payable', type: 'liability', balance: 0 },
    { code: '3000', name: 'Capital', type: 'equity', balance: 0 },
    { code: '4000', name: 'Sales Revenue', type: 'revenue', balance: 0 },
    { code: '4100', name: 'Service Revenue', type: 'revenue', balance: 0 },
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense', balance: 0 },
    { code: '5100', name: 'Salaries & Wages', type: 'expense', balance: 0 },
    { code: '5200', name: 'Rent Expense', type: 'expense', balance: 0 },
    { code: '5300', name: 'Utilities', type: 'expense', balance: 0 },
    { code: '5400', name: 'Marketing', type: 'expense', balance: 0 },
  ];

  defaultAccounts.forEach(a => {
    const account: Account = { ...a, id: uuidv4() };
    accounts.set(account.id, account);
  });
}

initAccounts();

// Account CRUD
router.get('/accounts', async (req, res) => {
  try {
    const { type } = req.query;
    let result = Array.from(accounts.values());
    if (type) result = result.filter(a => a.type === type);
    res.json({ accounts: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const account: Account = { ...req.body, id: uuidv4(), balance: 0 };
    accounts.set(account.id, account);
    res.status(201).json({ success: true, account });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Journal Entry
router.post('/journal', async (req, res) => {
  try {
    const { date, description, entries, type, reference } = req.body;

    // Validate double-entry
    const totalDebit = entries.reduce((sum: number, e: any) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum: number, e: any) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ error: 'Debits must equal credits' });
    }

    const transaction: Transaction = {
      id: uuidv4(),
      date,
      description,
      entries,
      amount: totalDebit,
      type: type || 'journal',
      reference,
      createdAt: new Date().toISOString(),
    };

    transactions.set(transaction.id, transaction);

    // Update account balances
    entries.forEach((entry: any) => {
      const account = accounts.get(entry.accountId);
      if (account) {
        if (account.type === 'asset' || account.type === 'expense') {
          account.balance += entry.debit - entry.credit;
        } else {
          account.balance += entry.credit - entry.debit;
        }
        accounts.set(account.id, account);
      }
    });

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const { from, to, accountId, type } = req.query;
    let result = Array.from(transactions.values());

    if (from) result = result.filter(t => t.date >= (from as string));
    if (to) result = result.filter(t => t.date <= (to as string));
    if (accountId) result = result.filter(t => t.entries.some((e: any) => e.accountId === accountId));
    if (type) result = result.filter(t => t.type === type);

    result.sort((a, b) => b.date.localeCompare(a.date));

    res.json({ transactions: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Invoice
router.post('/invoices', async (req, res) => {
  try {
    const { customerId, customerName, items, taxRate } = req.body;

    const subtotal = items.reduce((sum: number, i: any) => sum + i.amount, 0);
    const tax = Math.round(subtotal * (taxRate || 0.18));
    const total = subtotal + tax;

    const invoice: Invoice = {
      id: uuidv4(),
      invoiceNumber: `INV-${Date.now()}`,
      customerId,
      customerName,
      items,
      subtotal,
      tax,
      total,
      status: 'draft',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    invoices.set(invoice.id, invoice);

    // Create journal entry
    await createJournalEntry(invoice.date || new Date().toISOString().split('T')[0], `Invoice ${invoice.invoiceNumber}`, [
      { accountId: '1200', accountName: 'Accounts Receivable', debit: total, credit: 0 },
      { accountId: '4000', accountName: 'Sales Revenue', debit: 0, credit: subtotal },
      { accountId: '2100', accountName: 'Tax Payable', debit: 0, credit: tax },
    ], 'invoice', invoice.id);

    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const { status, customerId } = req.query;
    let result = Array.from(invoices.values());

    if (status) result = result.filter(i => i.status === status);
    if (customerId) result = result.filter(i => i.customerId === customerId);

    res.json({ invoices: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.patch('/invoices/:id/status', async (req, res) => {
  try {
    const invoice = invoices.get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    invoice.status = req.body.status;
    if (req.body.status === 'paid') {
      invoice.paidAt = new Date().toISOString();
    }

    invoices.set(invoice.id, invoice);
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Expenses
router.post('/expenses', async (req, res) => {
  try {
    const expense: Expense = { ...req.body, id: uuidv4(), status: 'pending' };
    expenses.set(expense.id, expense);
    res.status(201).json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

router.patch('/expenses/:id', async (req, res) => {
  try {
    const expense = expenses.get(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    Object.assign(expense, req.body);
    expenses.set(expense.id, expense);
    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Financial Reports
router.get('/reports/balance-sheet', async (req, res) => {
  try {
    const assets = Array.from(accounts.values()).filter(a => a.type === 'asset');
    const liabilities = Array.from(accounts.values()).filter(a => a.type === 'liability');
    const equity = Array.from(accounts.values()).filter(a => a.type === 'equity');

    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
    const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);

    res.json({
      report: {
        assets: { accounts: assets, total: totalAssets },
        liabilities: { accounts: liabilities, total: totalLiabilities },
        equity: { accounts: equity, total: totalEquity },
      },
      totalAssets,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate balance sheet' });
  }
});

router.get('/reports/income-statement', async (req, res) => {
  try {
    const revenue = Array.from(accounts.values()).filter(a => a.type === 'revenue');
    const expenses = Array.from(accounts.values()).filter(a => a.type === 'expense');

    const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0);
    const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);

    res.json({
      revenue: { accounts: revenue, total: totalRevenue },
      expenses: { accounts: expenses, total: totalExpenses },
      netIncome: totalRevenue - totalExpenses,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate income statement' });
  }
});

async function createJournalEntry(date: string, description: string, entries: any[], type: string, reference?: string): Promise<void> {
  const transaction: Transaction = {
    id: uuidv4(),
    date,
    description,
    entries,
    amount: entries.reduce((sum, e: any) => sum + e.debit, 0),
    type: type as any,
    reference,
    createdAt: new Date().toISOString(),
  };
  transactions.set(transaction.id, transaction);
}

export { router, accounts, transactions, invoices, expenses };
