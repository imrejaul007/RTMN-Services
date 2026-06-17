/**
 * RTMN Finance OS - AI Autonomous Finance Department
 *
 * Features:
 * - Chart of Accounts (COA)
 * - General Ledger (GL)
 * - Journal Entries
 * - Trial Balance
 * - Accounts Receivable (AR)
 * - Accounts Payable (AP)
 * - Treasury Management
 * - AI Finance Copilot
 *
 * Port: 4801
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const PORT = process.env.PORT || 4801;
const SERVICE_NAME = 'finance-os';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) =>
      `${timestamp} [${level}] ${SERVICE_NAME}: ${message}`
    )
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

// ============================================================
// IN-MEMORY DATA STORES
// ============================================================

const db = {
  // Chart of Accounts
  accounts: new Map(),

  // Journal Entries
  journalEntries: new Map(),

  // Customers & AR
  customers: new Map(),
  invoices: new Map(),

  // Vendors & AP
  vendors: new Map(),
  bills: new Map(),

  // Bank Accounts & Cash
  bankAccounts: new Map(),

  // Budgets
  budgets: new Map(),

  // Transactions
  transactions: new Map(),
};

// ============================================================
// SAMPLE DATA INITIALIZATION
// ============================================================

function initializeSampleData() {
  // Chart of Accounts
  const accounts = [
    // Assets (1000s)
    { id: 'CASH', code: '1001', name: 'Cash', type: 'asset', category: 'Current Assets', nature: 'Debit', parent: null },
    { id: 'BANK', code: '1002', name: 'Bank Account', type: 'asset', category: 'Current Assets', nature: 'Debit', parent: 'CASH' },
    { id: 'AR', code: '1101', name: 'Accounts Receivable', type: 'asset', category: 'Current Assets', nature: 'Debit', parent: null },
    { id: 'INVENTORY', code: '1201', name: 'Inventory', type: 'asset', category: 'Current Assets', nature: 'Debit', parent: null },
    { id: 'FIXED_ASSETS', code: '1501', name: 'Fixed Assets', type: 'asset', category: 'Non-Current Assets', nature: 'Debit', parent: null },
    { id: 'ACCUM_DEP', code: '1502', name: 'Accumulated Depreciation', type: 'asset', category: 'Non-Current Assets', nature: 'Credit', parent: 'FIXED_ASSETS' },

    // Liabilities (2000s)
    { id: 'AP', code: '2001', name: 'Accounts Payable', type: 'liability', category: 'Current Liabilities', nature: 'Credit', parent: null },
    { id: 'TDS_PAYABLE', code: '2002', name: 'TDS Payable', type: 'liability', category: 'Current Liabilities', nature: 'Credit', parent: null },
    { id: 'GST_PAYABLE', code: '2003', name: 'GST Payable', type: 'liability', category: 'Current Liabilities', nature: 'Credit', parent: null },
    { id: 'SALARY_PAYABLE', code: '2004', name: 'Salary Payable', type: 'liability', category: 'Current Liabilities', nature: 'Credit', parent: null },
    { id: 'LOANS', code: '2501', name: 'Loans & Borrowings', type: 'liability', category: 'Non-Current Liabilities', nature: 'Credit', parent: null },

    // Equity (3000s)
    { id: 'CAPITAL', code: '3001', name: 'Share Capital', type: 'equity', category: 'Shareholders Equity', nature: 'Credit', parent: null },
    { id: 'RETAINED', code: '3002', name: 'Retained Earnings', type: 'equity', category: 'Shareholders Equity', nature: 'Credit', parent: null },
    { id: 'PROFIT', code: '3003', name: 'Current Year Profit', type: 'equity', category: 'Shareholders Equity', nature: 'Credit', parent: null },

    // Revenue (4000s)
    { id: 'SALES', code: '4001', name: 'Sales Revenue', type: 'revenue', category: 'Income', nature: 'Credit', parent: null },
    { id: 'SERVICE', code: '4002', name: 'Service Revenue', type: 'revenue', category: 'Income', nature: 'Credit', parent: null },
    { id: 'OTHER_INC', code: '4003', name: 'Other Income', type: 'revenue', category: 'Income', nature: 'Credit', parent: null },

    // Expenses (5000s)
    { id: 'SALARY_EXP', code: '5001', name: 'Salary Expense', type: 'expense', category: 'Operating Expenses', nature: 'Debit', parent: null },
    { id: 'RENT_EXP', code: '5002', name: 'Rent Expense', type: 'expense', category: 'Operating Expenses', nature: 'Debit', parent: null },
    { id: 'UTILITIES', code: '5003', name: 'Utilities', type: 'expense', category: 'Operating Expenses', nature: 'Debit', parent: null },
    { id: 'OFFICE_EXP', code: '5004', name: 'Office Expenses', type: 'expense', category: 'Operating Expenses', nature: 'Debit', parent: null },
    { id: 'MARKETING', code: '5005', name: 'Marketing Expense', type: 'expense', category: 'Operating Expenses', nature: 'Debit', parent: null },
    { id: 'TRAVEL', code: '5006', name: 'Travel Expense', type: 'expense', category: 'Operating Expenses', nature: 'Debit', parent: null },
    { id: 'COGS', code: '5007', name: 'Cost of Goods Sold', type: 'expense', category: 'Cost of Sales', nature: 'Debit', parent: null },
    { id: 'DEPRECIATION', code: '5008', name: 'Depreciation Expense', type: 'expense', category: 'Non-Operating', nature: 'Debit', parent: null },
    { id: 'INTEREST_EXP', code: '5009', name: 'Interest Expense', type: 'expense', category: 'Non-Operating', nature: 'Debit', parent: null },
    { id: 'TAX_EXP', code: '5010', name: 'Tax Expense', type: 'expense', category: 'Non-Operating', nature: 'Debit', parent: null },
  ];

  accounts.forEach(acc => {
    db.accounts.set(acc.id, { ...acc, balance: 0, createdAt: new Date().toISOString() });
  });

  // Sample Customers
  const customers = [
    { id: 'CUST001', name: 'Acme Corporation', email: 'finance@acme.com', phone: '+91-9876543210', creditLimit: 500000, balance: 125000, status: 'active' },
    { id: 'CUST002', name: 'TechStart India', email: 'accounts@techstart.in', phone: '+91-9876543211', creditLimit: 250000, balance: 45000, status: 'active' },
    { id: 'CUST003', name: 'Global Solutions', email: 'pay@globalsol.com', phone: '+91-9876543212', creditLimit: 1000000, balance: 320000, status: 'active' },
  ];

  customers.forEach(c => {
    db.customers.set(c.id, { ...c, createdAt: new Date().toISOString() });
  });

  // Sample Vendors
  const vendors = [
    { id: 'VEND001', name: 'Cloud Services Ltd', email: 'billing@cloudservices.com', phone: '+91-9876543220', paymentTerms: 30, balance: 85000, status: 'active' },
    { id: 'VEND002', name: 'Office Supplies Co', email: 'accounts@officesupplies.com', phone: '+91-9876543221', paymentTerms: 15, balance: 12000, status: 'active' },
    { id: 'VEND003', name: 'IT Solutions Pvt Ltd', email: 'invoices@itsolutions.in', phone: '+91-9876543222', paymentTerms: 45, balance: 156000, status: 'active' },
  ];

  vendors.forEach(v => {
    db.vendors.set(v.id, { ...v, createdAt: new Date().toISOString() });
  });

  // Sample Bank Accounts
  const banks = [
    { id: 'BANK001', name: 'HDFC Bank - Operating', accountNumber: '****1234', balance: 4570000, type: 'checking' },
    { id: 'BANK002', name: 'ICICI Bank - Payroll', accountNumber: '****5678', balance: 890000, type: 'payroll' },
    { id: 'BANK003', name: 'SBI - Reserve', accountNumber: '****9012', balance: 2500000, type: 'savings' },
  ];

  banks.forEach(b => {
    db.bankAccounts.set(b.id, { ...b, createdAt: new Date().toISOString() });
  });

  // Sample Journal Entries
  const entries = [
    {
      id: 'JE001',
      date: '2026-06-01',
      description: 'Sales revenue - Acme Corporation',
      reference: 'INV-2026-001',
      entries: [
        { account: 'AR', debit: 118000, credit: 0, customerId: 'CUST001' },
        { account: 'SALES', debit: 0, credit: 100000, customerId: 'CUST001' },
        { account: 'GST_PAYABLE', debit: 0, credit: 18000, customerId: 'CUST001' },
      ],
      status: 'posted',
      createdBy: 'system',
    },
    {
      id: 'JE002',
      date: '2026-06-05',
      description: 'Salary payment - June 2026',
      reference: 'SAL-2026-06',
      entries: [
        { account: 'SALARY_EXP', debit: 450000, credit: 0 },
        { account: 'TDS_PAYABLE', debit: 45000, credit: 0 },
        { account: 'BANK', debit: 0, credit: 405000 },
      ],
      status: 'posted',
      createdBy: 'payroll-system',
    },
    {
      id: 'JE003',
      date: '2026-06-10',
      description: 'Cloud hosting invoice - IT Solutions',
      reference: 'BILL-2026-015',
      entries: [
        { account: 'OFFICE_EXP', debit: 59000, credit: 0, vendorId: 'VEND003' },
        { account: 'GST_PAYABLE', debit: 10620, credit: 0, vendorId: 'VEND003' },
        { account: 'AP', debit: 0, credit: 69620, vendorId: 'VEND003' },
      ],
      status: 'posted',
      createdBy: 'system',
    },
  ];

  entries.forEach(e => {
    db.journalEntries.set(e.id, { ...e, createdAt: new Date().toISOString() });
    // Update account balances
    e.entries.forEach(entry => {
      const acc = db.accounts.get(entry.account);
      if (acc) {
        if (acc.nature === 'Debit') {
          acc.balance += entry.debit - entry.credit;
        } else {
          acc.balance += entry.credit - entry.debit;
        }
        db.accounts.set(acc.id, acc);
      }
    });
  });

  // Sample Invoices
  const invoices = [
    { id: 'INV001', customerId: 'CUST001', invoiceNumber: 'INV-2026-001', date: '2026-06-01', dueDate: '2026-06-30', amount: 118000, paid: 0, status: 'sent' },
    { id: 'INV002', customerId: 'CUST002', invoiceNumber: 'INV-2026-002', date: '2026-06-10', dueDate: '2026-07-10', amount: 59000, paid: 0, status: 'sent' },
    { id: 'INV003', customerId: 'CUST003', invoiceNumber: 'INV-2026-003', date: '2026-06-15', dueDate: '2026-07-15', amount: 236000, paid: 236000, status: 'paid' },
  ];

  invoices.forEach(inv => {
    db.invoices.set(inv.id, { ...inv, createdAt: new Date().toISOString() });
  });

  // Sample Bills
  const bills = [
    { id: 'BILL001', vendorId: 'VEND001', billNumber: 'BILL-2026-010', date: '2026-06-01', dueDate: '2026-06-30', amount: 35400, paid: 0, status: 'pending' },
    { id: 'BILL002', vendorId: 'VEND002', billNumber: 'BILL-2026-011', date: '2026-06-05', dueDate: '2026-06-20', amount: 11800, paid: 11800, status: 'paid' },
    { id: 'BILL003', vendorId: 'VEND003', billNumber: 'BILL-2026-015', date: '2026-06-10', dueDate: '2026-07-10', amount: 69620, paid: 0, status: 'approved' },
  ];

  bills.forEach(b => {
    db.bills.set(b.id, { ...b, createdAt: new Date().toISOString() });
  });

  // Sample Budgets
  const budgets = [
    { id: 'BUD001', department: 'Engineering', month: '2026-06', allocated: 500000, spent: 450000 },
    { id: 'BUD002', department: 'Marketing', month: '2026-06', allocated: 200000, spent: 245000 },
    { id: 'BUD003', department: 'Operations', month: '2026-06', allocated: 150000, spent: 98000 },
    { id: 'BUD004', department: 'HR', month: '2026-06', allocated: 100000, spent: 85000 },
  ];

  budgets.forEach(b => {
    db.budgets.set(b.id, { ...b, createdAt: new Date().toISOString() });
  });

  logger.info(`Initialized sample data: ${accounts.length} accounts, ${customers.length} customers, ${vendors.length} vendors, ${entries.length} journal entries`);
}

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/status', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    modules: {
      accounting: true,
      ar: true,
      ap: true,
      treasury: true,
      budget: true,
    },
    stats: {
      accounts: db.accounts.size,
      customers: db.customers.size,
      vendors: db.vendors.size,
      invoices: db.invoices.size,
      bills: db.bills.size,
      journalEntries: db.journalEntries.size,
      bankAccounts: db.bankAccounts.size,
    },
    integrations: {
      sales: 'connected',
      workforce: 'connected',
      procurement: 'pending',
    }
  });
});

// ============================================================
// CHART OF ACCOUNTS
// ============================================================

// List all accounts
app.get('/api/chart-of-accounts', (req, res) => {
  const { type, category, search } = req.query;
  let accounts = Array.from(db.accounts.values());

  if (type) {
    accounts = accounts.filter(a => a.type === type);
  }
  if (category) {
    accounts = accounts.filter(a => a.category === category);
  }
  if (search) {
    const term = search.toLowerCase();
    accounts = accounts.filter(a =>
      a.name.toLowerCase().includes(term) ||
      a.code.toLowerCase().includes(term)
    );
  }

  // Group by type
  const grouped = {
    asset: accounts.filter(a => a.type === 'asset'),
    liability: accounts.filter(a => a.type === 'liability'),
    equity: accounts.filter(a => a.type === 'equity'),
    revenue: accounts.filter(a => a.type === 'revenue'),
    expense: accounts.filter(a => a.type === 'expense'),
  };

  res.json({
    accounts,
    grouped,
    total: accounts.length,
    byType: {
      asset: grouped.asset.length,
      liability: grouped.liability.length,
      equity: grouped.equity.length,
      revenue: grouped.revenue.length,
      expense: grouped.expense.length,
    }
  });
});

// Get single account
app.get('/api/chart-of-accounts/:id', (req, res) => {
  const account = db.accounts.get(req.params.id);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  res.json(account);
});

// Create account
app.post('/api/chart-of-accounts', (req, res) => {
  const { id, code, name, type, category, nature, parent } = req.body;

  if (!id || !code || !name || !type || !nature) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (db.accounts.has(id)) {
    return res.status(400).json({ error: 'Account ID already exists' });
  }

  const account = {
    id,
    code,
    name,
    type,
    category: category || 'General',
    nature,
    parent: parent || null,
    balance: 0,
    createdAt: new Date().toISOString(),
  };

  db.accounts.set(id, account);
  res.status(201).json(account);
});

// Update account
app.patch('/api/chart-of-accounts/:id', (req, res) => {
  const account = db.accounts.get(req.params.id);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const updated = { ...account, ...req.body, updatedAt: new Date().toISOString() };
  db.accounts.set(req.params.id, updated);
  res.json(updated);
});

// ============================================================
// JOURNAL ENTRIES
// ============================================================

// List journal entries
app.get('/api/journal', (req, res) => {
  const { status, startDate, endDate, account, search } = req.query;
  let entries = Array.from(db.journalEntries.values());

  if (status) {
    entries = entries.filter(e => e.status === status);
  }
  if (startDate) {
    entries = entries.filter(e => e.date >= startDate);
  }
  if (endDate) {
    entries = entries.filter(e => e.date <= endDate);
  }
  if (account) {
    entries = entries.filter(e =>
      e.entries.some(entry => entry.account === account)
    );
  }
  if (search) {
    const term = search.toLowerCase();
    entries = entries.filter(e =>
      e.description.toLowerCase().includes(term) ||
      e.reference?.toLowerCase().includes(term)
    );
  }

  // Sort by date descending
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    entries,
    total: entries.length,
  });
});

// Get single entry
app.get('/api/journal/:id', (req, res) => {
  const entry = db.journalEntries.get(req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Journal entry not found' });
  }
  res.json(entry);
});

// Create journal entry
app.post('/api/journal', (req, res) => {
  const { date, description, reference, entries, source } = req.body;

  if (!date || !description || !entries || entries.length < 2) {
    return res.status(400).json({ error: 'Date, description, and at least 2 entries required' });
  }

  // Validate debits = credits
  const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({
      error: 'Debits must equal credits',
      totalDebit,
      totalCredit,
      difference: totalDebit - totalCredit,
    });
  }

  const id = `JE${String(db.journalEntries.size + 1).padStart(4, '0')}`;

  const entry = {
    id,
    date,
    description,
    reference: reference || null,
    entries: entries.map(e => ({
      account: e.account,
      debit: e.debit || 0,
      credit: e.credit || 0,
      description: e.description || '',
      customerId: e.customerId || null,
      vendorId: e.vendorId || null,
    })),
    status: 'posted',
    source: source || 'manual',
    createdBy: req.headers['x-user-id'] || 'system',
    createdAt: new Date().toISOString(),
  };

  db.journalEntries.set(id, entry);

  // Update account balances
  entries.forEach(e => {
    const account = db.accounts.get(e.account);
    if (account) {
      if (account.nature === 'Debit') {
        account.balance += (e.debit || 0) - (e.credit || 0);
      } else {
        account.balance += (e.credit || 0) - (e.debit || 0);
      }
      db.accounts.set(account.id, account);
    }
  });

  res.status(201).json(entry);
});

// ============================================================
// TRIAL BALANCE
// ============================================================

app.get('/api/trial-balance', (req, res) => {
  const { asOfDate } = req.query;
  const accounts = Array.from(db.accounts.values());

  let totalDebit = 0;
  let totalCredit = 0;

  const trialBalance = accounts
    .filter(a => a.balance !== 0)
    .map(account => {
      const isDebit = account.nature === 'Debit';
      const balance = account.balance;

      if (isDebit) {
        totalDebit += balance;
      } else {
        totalCredit += balance;
      }

      return {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        nature: account.nature,
        debit: isDebit ? balance : 0,
        credit: !isDebit ? balance : 0,
      };
    })
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  res.json({
    asOfDate: asOfDate || new Date().toISOString().split('T')[0],
    accounts: trialBalance,
    summary: {
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      difference: totalDebit - totalCredit,
    }
  });
});

// ============================================================
// ACCOUNTS RECEIVABLE (AR)
// ============================================================

// List customers
app.get('/api/ar/customers', (req, res) => {
  const customers = Array.from(db.customers.values());
  res.json({
    customers,
    total: customers.length,
    totalReceivable: customers.reduce((sum, c) => sum + c.balance, 0),
  });
});

// Get customer
app.get('/api/ar/customers/:id', (req, res) => {
  const customer = db.customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Get customer invoices
  const invoices = Array.from(db.invoices.values())
    .filter(inv => inv.customerId === req.params.id);

  res.json({ customer, invoices });
});

// Create invoice
app.post('/api/ar/invoices', (req, res) => {
  const { customerId, items, dueDate, notes } = req.body;

  if (!customerId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Customer and items required' });
  }

  const customer = db.customers.get(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const id = `INV${String(db.invoices.size + 1).padStart(4, '0')}`;
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = items.reduce((sum, item) => sum + (item.tax || item.amount * 0.18), 0);
  const total = subtotal + tax;

  const invoice = {
    id,
    customerId,
    invoiceNumber: `INV-2026-${String(db.invoices.size + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items,
    subtotal,
    tax,
    total,
    paid: 0,
    balance: total,
    status: 'draft',
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.invoices.set(id, invoice);

  // Create journal entry
  const entry = {
    id: `JE${db.journalEntries.size + 1}`,
    date: invoice.date,
    description: `Invoice ${invoice.invoiceNumber} - ${customer.name}`,
    reference: invoice.id,
    entries: [
      { account: 'AR', debit: total, credit: 0, customerId },
      { account: 'SALES', debit: 0, credit: subtotal, customerId },
      { account: 'GST_PAYABLE', debit: 0, credit: tax, customerId },
    ],
    status: 'posted',
    source: 'ar',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  };

  db.journalEntries.set(entry.id, entry);

  // Update balances
  customer.balance += total;
  db.customers.set(customerId, customer);

  const ar = db.accounts.get('AR');
  if (ar) {
    ar.balance += total;
    db.accounts.set('AR', ar);
  }

  res.status(201).json(invoice);
});

// List invoices
app.get('/api/ar/invoices', (req, res) => {
  const { status, customerId } = req.query;
  let invoices = Array.from(db.invoices.values());

  if (status) {
    invoices = invoices.filter(i => i.status === status);
  }
  if (customerId) {
    invoices = invoices.filter(i => i.customerId === customerId);
  }

  res.json({
    invoices,
    total: invoices.length,
    summary: {
      total: invoices.reduce((sum, i) => sum + i.total, 0),
      paid: invoices.reduce((sum, i) => sum + i.paid, 0),
      outstanding: invoices.reduce((sum, i) => sum + i.balance, 0),
    }
  });
});

// Aging Report
app.get('/api/ar/aging', (req, res) => {
  const invoices = Array.from(db.invoices.values())
    .filter(i => i.status !== 'paid');

  const today = new Date();
  const aging = {
    current: [],
    '1-30': [],
    '31-60': [],
    '61-90': [],
    '90+': [],
  };

  invoices.forEach(inv => {
    const dueDate = new Date(inv.dueDate);
    const daysPastDue = Math.floor((today - dueDate) / (24 * 60 * 60 * 1000));

    const record = {
      ...inv,
      customer: db.customers.get(inv.customerId),
      daysPastDue,
    };

    if (daysPastDue <= 0) {
      aging.current.push(record);
    } else if (daysPastDue <= 30) {
      aging['1-30'].push(record);
    } else if (daysPastDue <= 60) {
      aging['31-60'].push(record);
    } else if (daysPastDue <= 90) {
      aging['61-90'].push(record);
    } else {
      aging['90+'].push(record);
    }
  });

  const summary = {
    current: aging.current.reduce((sum, i) => sum + i.balance, 0),
    '1-30': aging['1-30'].reduce((sum, i) => sum + i.balance, 0),
    '31-60': aging['31-60'].reduce((sum, i) => sum + i.balance, 0),
    '61-90': aging['61-90'].reduce((sum, i) => sum + i.balance, 0),
    '90+': aging['90+'].reduce((sum, i) => sum + i.balance, 0),
  };

  summary.total = Object.values(summary).reduce((sum, v) => sum + v, 0);

  res.json({ aging, summary });
});

// Record payment
app.post('/api/ar/invoices/:id/pay', (req, res) => {
  const invoice = db.invoices.get(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const { amount, paymentDate, method, reference } = req.body;

  invoice.paid += amount || invoice.balance;
  invoice.balance = invoice.total - invoice.paid;
  invoice.status = invoice.balance <= 0 ? 'paid' : 'partial';
  invoice.payments = invoice.payments || [];
  invoice.payments.push({
    amount: amount || invoice.balance,
    date: paymentDate || new Date().toISOString(),
    method: method || 'bank_transfer',
    reference: reference || null,
  });

  db.invoices.set(invoice.id, invoice);

  // Update customer balance
  const customer = db.customers.get(invoice.customerId);
  if (customer) {
    customer.balance -= amount || invoice.balance;
    db.customers.set(customer.id, customer);
  }

  // Create journal entry
  const entry = {
    id: `JE${db.journalEntries.size + 1}`,
    date: paymentDate || new Date().toISOString().split('T')[0],
    description: `Payment received - ${invoice.invoiceNumber}`,
    reference: invoice.id,
    entries: [
      { account: 'BANK', debit: amount || invoice.balance, credit: 0 },
      { account: 'AR', debit: 0, credit: amount || invoice.balance, customerId: invoice.customerId },
    ],
    status: 'posted',
    source: 'ar',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  };

  db.journalEntries.set(entry.id, entry);

  res.json(invoice);
});

// ============================================================
// ACCOUNTS PAYABLE (AP)
// ============================================================

// List vendors
app.get('/api/ap/vendors', (req, res) => {
  const vendors = Array.from(db.vendors.values());
  res.json({
    vendors,
    total: vendors.length,
    totalPayable: vendors.reduce((sum, v) => sum + v.balance, 0),
  });
});

// Create bill
app.post('/api/ap/bills', (req, res) => {
  const { vendorId, items, dueDate, notes } = req.body;

  if (!vendorId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Vendor and items required' });
  }

  const vendor = db.vendors.get(vendorId);
  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  const id = `BILL${String(db.bills.size + 1).padStart(4, '0')}`;
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = items.reduce((sum, item) => sum + (item.tax || item.amount * 0.18), 0);
  const total = subtotal + tax;

  const bill = {
    id,
    vendorId,
    billNumber: `BILL-2026-${String(db.bills.size + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: dueDate || new Date(Date.now() + (vendor.paymentTerms || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items,
    subtotal,
    tax,
    total,
    paid: 0,
    balance: total,
    status: 'pending',
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.bills.set(id, bill);

  // Update vendor balance
  vendor.balance += total;
  db.vendors.set(vendorId, vendor);

  res.status(201).json(bill);
});

// List bills
app.get('/api/ap/bills', (req, res) => {
  const { status, vendorId } = req.query;
  let bills = Array.from(db.bills.values());

  if (status) {
    bills = bills.filter(b => b.status === status);
  }
  if (vendorId) {
    bills = bills.filter(b => b.vendorId === vendorId);
  }

  res.json({
    bills,
    total: bills.length,
    summary: {
      total: bills.reduce((sum, b) => sum + b.total, 0),
      paid: bills.reduce((sum, b) => sum + b.paid, 0),
      outstanding: bills.reduce((sum, b) => sum + b.balance, 0),
    }
  });
});

// Approve bill
app.post('/api/ap/bills/:id/approve', (req, res) => {
  const bill = db.bills.get(req.params.id);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  bill.status = 'approved';
  bill.approvedBy = req.headers['x-user-id'] || 'system';
  bill.approvedAt = new Date().toISOString();

  db.bills.set(bill.id, bill);
  res.json(bill);
});

// Pay bill
app.post('/api/ap/bills/:id/pay', (req, res) => {
  const bill = db.bills.get(req.params.id);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  const { amount, paymentDate, method } = req.body;

  bill.paid += amount || bill.balance;
  bill.balance = bill.total - bill.paid;
  bill.status = bill.balance <= 0 ? 'paid' : 'partial';
  bill.payments = bill.payments || [];
  bill.payments.push({
    amount: amount || bill.balance,
    date: paymentDate || new Date().toISOString(),
    method: method || 'bank_transfer',
  });

  db.bills.set(bill.id, bill);

  // Update vendor balance
  const vendor = db.vendors.get(bill.vendorId);
  if (vendor) {
    vendor.balance -= amount || bill.balance;
    db.vendors.set(vendor.id, vendor);
  }

  res.json(bill);
});

// AP Aging
app.get('/api/ap/aging', (req, res) => {
  const bills = Array.from(db.bills.values())
    .filter(b => b.status !== 'paid');

  const today = new Date();
  const aging = {
    current: [],
    '1-30': [],
    '31-60': [],
    '61-90': [],
    '90+': [],
  };

  bills.forEach(bill => {
    const dueDate = new Date(bill.dueDate);
    const daysPastDue = Math.floor((today - dueDate) / (24 * 60 * 60 * 1000));

    const record = {
      ...bill,
      vendor: db.vendors.get(bill.vendorId),
      daysPastDue,
    };

    if (daysPastDue <= 0) {
      aging.current.push(record);
    } else if (daysPastDue <= 30) {
      aging['1-30'].push(record);
    } else if (daysPastDue <= 60) {
      aging['31-60'].push(record);
    } else if (daysPastDue <= 90) {
      aging['61-90'].push(record);
    } else {
      aging['90+'].push(record);
    }
  });

  const summary = {
    current: aging.current.reduce((sum, b) => sum + b.balance, 0),
    '1-30': aging['1-30'].reduce((sum, b) => sum + b.balance, 0),
    '31-60': aging['31-60'].reduce((sum, b) => sum + b.balance, 0),
    '61-90': aging['61-90'].reduce((sum, b) => sum + b.balance, 0),
    '90+': aging['90+'].reduce((sum, b) => sum + b.balance, 0),
  };

  summary.total = Object.values(summary).reduce((sum, v) => sum + v, 0);

  res.json({ aging, summary });
});

// ============================================================
// TREASURY
// ============================================================

// Bank accounts
app.get('/api/treasury/bank-accounts', (req, res) => {
  const accounts = Array.from(db.bankAccounts.values());
  res.json({
    accounts,
    totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
  });
});

// Cash position
app.get('/api/treasury/cash-position', (req, res) => {
  const cash = db.accounts.get('CASH')?.balance || 0;
  const bank = db.accounts.get('BANK')?.balance || 0;
  const banks = Array.from(db.bankAccounts.values());

  res.json({
    cash,
    bank,
    totalBankBalance: banks.reduce((sum, b) => sum + b.balance, 0),
    totalCash: cash + banks.reduce((sum, b) => sum + b.balance, 0),
    accounts: banks,
    asOfDate: new Date().toISOString(),
  });
});

// ============================================================
// BUDGETS
// ============================================================

app.get('/api/budgets', (req, res) => {
  const { department, month } = req.query;
  let budgets = Array.from(db.budgets.values());

  if (department) {
    budgets = budgets.filter(b => b.department === department);
  }
  if (month) {
    budgets = budgets.filter(b => b.month === month);
  }

  res.json({
    budgets,
    total: {
      allocated: budgets.reduce((sum, b) => sum + b.allocated, 0),
      spent: budgets.reduce((sum, b) => sum + b.spent, 0),
    },
    summary: {
      totalAllocated: budgets.reduce((sum, b) => sum + b.allocated, 0),
      totalSpent: budgets.reduce((sum, b) => sum + b.spent, 0),
      totalRemaining: budgets.reduce((sum, b) => sum + (b.allocated - b.spent), 0),
    }
  });
});

// ============================================================
// DASHBOARD
// ============================================================

app.get('/api/dashboard/overview', (req, res) => {
  const accounts = Array.from(db.accounts.values());
  const customers = Array.from(db.customers.values());
  const vendors = Array.from(db.vendors.values());
  const invoices = Array.from(db.invoices.values());
  const bills = Array.from(db.bills.values());
  const budgets = Array.from(db.budgets.values());

  // Calculate totals
  const assets = accounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + a.balance, 0);
  const liabilities = accounts.filter(a => a.type === 'liability').reduce((sum, a) => sum + a.balance, 0);
  const revenue = accounts.filter(a => a.type === 'revenue').reduce((sum, a) => sum + a.balance, 0);
  const expenses = accounts.filter(a => a.type === 'expense').reduce((sum, a) => sum + a.balance, 0);

  // Cash position
  const banks = Array.from(db.bankAccounts.values());
  const totalCash = banks.reduce((sum, b) => sum + b.balance, 0);

  // AR/AP
  const totalReceivable = customers.reduce((sum, c) => sum + c.balance, 0);
  const totalPayable = vendors.reduce((sum, v) => sum + v.balance, 0);

  // Outstanding
  const outstandingInvoices = invoices.filter(i => i.status !== 'paid');
  const outstandingBills = bills.filter(b => b.status !== 'paid');

  res.json({
    date: new Date().toISOString(),
    financial: {
      assets,
      liabilities,
      equity: assets - liabilities,
      revenue,
      expenses,
      netProfit: revenue - expenses,
      profitMargin: revenue > 0 ? ((revenue - expenses) / revenue * 100).toFixed(2) : 0,
    },
    cash: {
      total: totalCash,
      operating: banks.filter(b => b.type === 'checking').reduce((sum, b) => sum + b.balance, 0),
      payroll: banks.filter(b => b.type === 'payroll').reduce((sum, b) => sum + b.balance, 0),
      reserve: banks.filter(b => b.type === 'savings').reduce((sum, b) => sum + b.balance, 0),
    },
    receivables: {
      total: totalReceivable,
      overdue: invoices.reduce((sum, i) => sum + (i.daysPastDue > 0 ? i.balance : 0), 0),
      count: outstandingInvoices.length,
    },
    payables: {
      total: totalPayable,
      due: bills.reduce((sum, b) => sum + b.balance, 0),
      count: outstandingBills.length,
    },
    budgets: {
      totalAllocated: budgets.reduce((sum, b) => sum + b.allocated, 0),
      totalSpent: budgets.reduce((sum, b) => sum + b.spent, 0),
      onTrack: budgets.filter(b => b.spent <= b.allocated).length,
      overBudget: budgets.filter(b => b.spent > b.allocated).length,
    },
    health: {
      score: calculateFinancialHealth(assets, liabilities, revenue, expenses, totalReceivable, totalPayable),
      indicators: getHealthIndicators(assets, liabilities, revenue, expenses, totalCash),
    }
  });
});

// Calculate financial health score
function calculateFinancialHealth(assets, liabilities, revenue, expenses, receivables, payables) {
  let score = 50; // Base score

  // Profitability
  if (revenue > expenses) {
    score += 20;
  }

  // Liquidity (cash ratio)
  const cashRatio = assets > 0 ? (assets * 0.3) / liabilities : 0;
  if (cashRatio > 1) {
    score += 15;
  } else if (cashRatio > 0.5) {
    score += 10;
  }

  // Debt management
  if (liabilities < assets * 0.5) {
    score += 15;
  }

  return Math.min(100, score);
}

// Get health indicators
function getHealthIndicators(assets, liabilities, revenue, expenses, cash) {
  return {
    profitability: revenue > expenses ? 'healthy' : 'concerning',
    liquidity: cash > liabilities * 0.2 ? 'healthy' : cash > 0 ? 'warning' : 'critical',
    leverage: liabilities < assets * 0.5 ? 'healthy' : 'warning',
    efficiency: expenses < revenue * 0.7 ? 'healthy' : 'concerning',
  };
}

// ============================================================
// AI COPILOT
// ============================================================

app.post('/api/copilot/chat', (req, res) => {
  const { message, context } = req.body;

  const lowerMsg = message.toLowerCase();

  let response = {
    message: 'I can help with finance questions.',
    data: null,
    actions: [],
  };

  // Cash question
  if (lowerMsg.includes('cash') && (lowerMsg.includes('how much') || lowerMsg.includes('balance'))) {
    const banks = Array.from(db.bankAccounts.values());
    const totalCash = banks.reduce((sum, b) => sum + b.balance, 0);
    response = {
      message: `You have ₹${(totalCash / 100000).toFixed(1)}L across ${banks.length} bank accounts.`,
      data: {
        total: totalCash,
        accounts: banks,
      },
      actions: [
        { type: 'link', label: 'View Cash Position', endpoint: '/treasury/cash-position' },
      ],
    };
  }

  // AR question
  else if (lowerMsg.includes('receivable') || lowerMsg.includes('customer') && lowerMsg.includes('owe')) {
    const customers = Array.from(db.customers.values());
    const total = customers.reduce((sum, c) => sum + c.balance, 0);
    response = {
      message: `Total receivables: ₹${(total / 100000).toFixed(1)}L from ${customers.length} customers.`,
      data: { total, customers },
      actions: [
        { type: 'link', label: 'View AR Aging', endpoint: '/ar/aging' },
      ],
    };
  }

  // AP question
  else if (lowerMsg.includes('payable') || lowerMsg.includes('vendor') && lowerMsg.includes('owe')) {
    const vendors = Array.from(db.vendors.values());
    const total = vendors.reduce((sum, v) => sum + v.balance, 0);
    response = {
      message: `Total payables: ₹${(total / 100000).toFixed(1)}L to ${vendors.length} vendors.`,
      data: { total, vendors },
      actions: [
        { type: 'link', label: 'View AP Aging', endpoint: '/ap/aging' },
      ],
    };
  }

  // Budget question
  else if (lowerMsg.includes('budget')) {
    const budgets = Array.from(db.budgets.values());
    const total = {
      allocated: budgets.reduce((sum, b) => sum + b.allocated, 0),
      spent: budgets.reduce((sum, b) => sum + b.spent, 0),
    };
    const percentUsed = total.allocated > 0 ? ((total.spent / total.allocated) * 100).toFixed(0) : 0;
    response = {
      message: `Total budget: ₹${(total.allocated / 100000).toFixed(1)}L. Spent: ₹${(total.spent / 100000).toFixed(1)}L (${percentUsed}%).`,
      data: { ...total, percentUsed },
      actions: [
        { type: 'link', label: 'View Budgets', endpoint: '/budgets' },
      ],
    };
  }

  // P&L question
  else if (lowerMsg.includes('profit') || lowerMsg.includes('revenue') || lowerMsg.includes('expense')) {
    const accounts = Array.from(db.accounts.values());
    const revenue = accounts.filter(a => a.type === 'revenue').reduce((sum, a) => sum + a.balance, 0);
    const expenses = accounts.filter(a => a.type === 'expense').reduce((sum, a) => sum + a.balance, 0);
    const profit = revenue - expenses;
    response = {
      message: `Revenue: ₹${(revenue / 100000).toFixed(1)}L | Expenses: ₹${(expenses / 100000).toFixed(1)}L | Net Profit: ₹${(profit / 100000).toFixed(1)}L (${((profit / revenue) * 100).toFixed(0)}% margin)`,
      data: { revenue, expenses, profit, margin: (profit / revenue) * 100 },
      actions: [
        { type: 'link', label: 'View Trial Balance', endpoint: '/trial-balance' },
      ],
    };
  }

  // Default
  else {
    response = {
      message: 'I can help with:\n• Cash position\n• Receivables/Payables\n• Budget status\n• Profit & Loss\n• Financial health',
      suggestions: [
        'How much cash do we have?',
        'What are our receivables?',
        'Show me the budget status',
        'What is our profit margin?',
      ],
    };
  }

  res.json(response);
});

// ============================================================
// START SERVER
// ============================================================

initializeSampleData();

app.listen(PORT, () => {
  logger.info(`🚀 RTMN Finance OS v1.0.0 started on port ${PORT}`);
  logger.info('');
  logger.info('Available endpoints:');
  logger.info('  GET  /health                    - Health check');
  logger.info('  GET  /status                    - Service status');
  logger.info('');
  logger.info('  Chart of Accounts:');
  logger.info('  GET  /api/chart-of-accounts    - List accounts');
  logger.info('  POST /api/chart-of-accounts    - Create account');
  logger.info('');
  logger.info('  Journal Entries:');
  logger.info('  GET  /api/journal              - List entries');
  logger.info('  POST /api/journal              - Create entry');
  logger.info('  GET  /api/trial-balance         - Trial balance');
  logger.info('');
  logger.info('  Accounts Receivable:');
  logger.info('  GET  /api/ar/customers          - List customers');
  logger.info('  GET  /api/ar/invoices           - List invoices');
  logger.info('  POST /api/ar/invoices           - Create invoice');
  logger.info('  GET  /api/ar/aging              - Aging report');
  logger.info('');
  logger.info('  Accounts Payable:');
  logger.info('  GET  /api/ap/vendors            - List vendors');
  logger.info('  GET  /api/ap/bills              - List bills');
  logger.info('  POST /api/ap/bills             - Create bill');
  logger.info('  GET  /api/ap/aging              - Aging report');
  logger.info('');
  logger.info('  Treasury:');
  logger.info('  GET  /api/treasury/bank-accounts - Bank accounts');
  logger.info('  GET  /api/treasury/cash-position - Cash position');
  logger.info('');
  logger.info('  Budgets:');
  logger.info('  GET  /api/budgets               - List budgets');
  logger.info('');
  logger.info('  Dashboard:');
  logger.info('  GET  /api/dashboard/overview    - CEO dashboard');
  logger.info('');
  logger.info('  AI Copilot:');
  logger.info('  POST /api/copilot/chat          - Chat with AI');
  logger.info('');
});

export default app;
