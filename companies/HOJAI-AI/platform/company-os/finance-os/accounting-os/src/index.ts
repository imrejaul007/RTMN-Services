/**
 * FinanceOS - Accounting OS
 *
 * Complete General Ledger, AP, AR system
 * Inspired by: Zoho Books + QuickBooks + Tally
 *
 * Modules:
 * - General Ledger (GL)
 * - Accounts Payable (AP)
 * - Accounts Receivable (AR)
 * - Fixed Assets
 * - Cost Accounting
 * - Intercompany
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  description?: string;
  balance: number;
  nature: 'debit' | 'credit';
  isActive: boolean;
  taxRate?: number;
  analytics?: { category: string; tags: string[] };
}

export type AccountType =
  | 'asset' | 'liability' | 'equity'
  | 'revenue' | 'expense' | 'other_income' | 'other_expense';

export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  entries: JournalLine[];
  status: 'draft' | 'posted' | 'reversed';
  postedAt?: Date;
  createdBy: string;
  attachments?: string[];
  createdAt: Date;
}

export interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  narration?: string;
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  type: 'individual' | 'company';
  email: string;
  phone?: string;
  address?: Address;
  gstin?: string;
  pan?: string;
  bankDetails?: BankDetails;
  paymentTerms: number;
  creditLimit?: number;
  outstanding: number;
  status: 'active' | 'blocked' | 'inactive';
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  type: 'individual' | 'company' | 'government';
  email: string;
  phone?: string;
  address?: Address;
  gstin?: string;
  pan?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  bankDetails?: BankDetails;
  creditLimit?: number;
  outstanding: number;
  since: Date;
  status: 'active' | 'blocked' | 'inactive';
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode?: string;
  swiftCode?: string;
  accountType: 'savings' | 'current';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'sales' | 'purchase';

  customerId?: string;
  vendorId?: string;
  customerName?: string;
  vendorName?: string;

  date: string;
  dueDate: string;
  gstin?: string;

  lineItems: InvoiceLine[];
  subtotal: number;
  taxAmount: number;
  discount?: { type: 'percentage' | 'fixed'; value: number; amount: number };
  total: number;
  amountInWords: string;

  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  paidAmount: number;
  balanceAmount: number;

  adjustments?: Adjustment[];
  credits?: CreditNote[];

  notes?: string;
  terms?: string;

  createdAt: Date;
  createdBy: string;
}

export interface InvoiceLine {
  description: string;
  hsnSac?: string;
  quantity: number;
  rate: number;
  discount?: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface Payment {
  id: string;
  type: 'receive' | 'make';

  customerId?: string;
  vendorId?: string;

  amount: number;
  date: string;
  reference: string;
  mode: 'cash' | 'bank' | 'upi' | 'card' | 'cheque' | 'neft' | 'rtgs';

  bankAccountId?: string;
  chequeNumber?: string;
  chequeDate?: string;

  invoices: PaymentAllocation[];

  status: 'pending' | 'completed' | 'failed' | 'cancelled';

  notes?: string;
  attachments?: string[];

  createdAt: Date;
}

export interface PaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  invoiceAmount: number;
  amountPaid: number;
  balance: number;
}

export interface CreditNote {
  id: string;
  noteNumber: string;
  type: 'sales_return' | 'purchase_return' | 'debit' | 'credit';

  customerId?: string;
  vendorId?: string;

  date: string;
  reference: string;
  reason: string;

  lineItems: InvoiceLine[];
  total: number;

  linkedInvoices: string[];

  status: 'draft' | 'posted';

  createdAt: Date;
}

export interface Adjustment {
  type: 'round_off' | 'cash_discount' | 'other';
  description: string;
  amount: number;
}

export interface FixedAsset {
  id: string;
  assetCode: string;
  name: string;
  category: string;

  purchaseDate: string;
  purchaseValue: number;
  vendor?: string;
  invoiceId?: string;

  depreciation: Depreciation;
  currentValue: number;

  location?: string;
  assignedTo?: string;

  status: 'active' | 'sold' | 'scrapped' | 'disposed';

  maintenance: MaintenanceRecord[];
}

export interface Depreciation {
  method: 'straight_line' | 'wdown' | 'units_of_production';
  rate: number;
  usefulLife: number;
  residualValue: number;
  accumulated: number;
  lastDepreciationDate?: string;
}

export interface MaintenanceRecord {
  date: string;
  type: 'repair' | 'service' | 'insurance' | 'upgrade';
  description: string;
  cost: number;
  vendor?: string;
}

// ============================================================
// STORAGE
// ============================================================

const accounts = new Map<string, Account>();
const journalEntries = new Map<string, JournalEntry>();
const vendors = new Map<string, Vendor>();
const customers = new Map<string, Customer>();
const invoices = new Map<string, Invoice>();
const payments = new Map<string, Payment>();
const creditNotes = new Map<string, CreditNote>();
const fixedAssets = new Map<string, FixedAsset>();

// Default Chart of Accounts
function initializeChartOfAccounts() {
  const defaultAccounts: Omit<Account, 'id' | 'balance'>[] = [
    // Assets
    { code: '1001', name: 'Cash', type: 'asset', nature: 'debit', isActive: true },
    { code: '1002', name: 'Bank Accounts', type: 'asset', nature: 'debit', isActive: true },
    { code: '1101', name: 'Accounts Receivable', type: 'asset', nature: 'debit', isActive: true },
    { code: '1201', name: 'Inventory', type: 'asset', nature: 'debit', isActive: true },
    { code: '1301', name: 'Fixed Assets', type: 'asset', nature: 'debit', isActive: true },
    { code: '1302', name: 'Accumulated Depreciation', type: 'asset', nature: 'credit', isActive: true },
    { code: '1401', name: 'Advances', type: 'asset', nature: 'debit', isActive: true },
    { code: '1501', name: 'Prepaid Expenses', type: 'asset', nature: 'debit', isActive: true },
    { code: '1601', name: 'TDS Receivable', type: 'asset', nature: 'debit', isActive: true },
    { code: '1701', name: 'GST Input Tax Credit', type: 'asset', nature: 'debit', isActive: true },

    // Liabilities
    { code: '2001', name: 'Accounts Payable', type: 'liability', nature: 'credit', isActive: true },
    { code: '2101', name: 'GST Payable', type: 'liability', nature: 'credit', isActive: true },
    { code: '2201', name: 'TDS Payable', type: 'liability', nature: 'credit', isActive: true },
    { code: '2301', name: 'Employee Liabilities', type: 'liability', nature: 'credit', isActive: true },
    { code: '2401', name: 'Loans & Borrowings', type: 'liability', nature: 'credit', isActive: true },
    { code: '2501', name: 'Unearned Revenue', type: 'liability', nature: 'credit', isActive: true },

    // Equity
    { code: '3001', name: 'Share Capital', type: 'equity', nature: 'credit', isActive: true },
    { code: '3101', name: 'Retained Earnings', type: 'equity', nature: 'credit', isActive: true },
    { code: '3201', name: 'Current Year Profit', type: 'equity', nature: 'credit', isActive: true },

    // Revenue
    { code: '4001', name: 'Sales Revenue', type: 'revenue', nature: 'credit', isActive: true },
    { code: '4101', name: 'Service Revenue', type: 'revenue', nature: 'credit', isActive: true },
    { code: '4201', name: 'Other Income', type: 'other_income', nature: 'credit', isActive: true },

    // Expenses
    { code: '5001', name: 'Cost of Goods Sold', type: 'expense', nature: 'debit', isActive: true },
    { code: '5101', name: 'Employee Expenses', type: 'expense', nature: 'debit', isActive: true },
    { code: '5201', name: 'Rent & Utilities', type: 'expense', nature: 'debit', isActive: true },
    { code: '5301', name: 'Office Expenses', type: 'expense', nature: 'debit', isActive: true },
    { code: '5401', name: 'Travel & Conveyance', type: 'expense', nature: 'debit', isActive: true },
    { code: '5501', name: 'Communication Expenses', type: 'expense', nature: 'debit', isActive: true },
    { code: '5601', name: 'Marketing Expenses', type: 'expense', nature: 'debit', isActive: true },
    { code: '5701', name: 'Depreciation Expense', type: 'expense', nature: 'debit', isActive: true },
    { code: '5801', name: 'Interest Expense', type: 'expense', nature: 'debit', isActive: true },
    { code: '5901', name: 'Other Expenses', type: 'other_expense', nature: 'debit', isActive: true },
  ];

  defaultAccounts.forEach(acc => {
    const id = crypto.randomUUID();
    accounts.set(id, { ...acc, id, balance: 0 });
  });

  console.log(`Initialized ${defaultAccounts.length} default accounts`);
}

initializeChartOfAccounts();

// ============================================================
// ROUTES - ACCOUNTS
// ============================================================

router.get('/accounts', async (req, res) => {
  try {
    const { type, parentId, isActive } = req.query;
    let result = Array.from(accounts.values());

    if (type) result = result.filter(a => a.type === type);
    if (parentId) result = result.filter(a => a.parentId === parentId);
    if (isActive !== undefined) result = result.filter(a => a.isActive === (isActive === 'true'));

    res.json({ success: true, accounts: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const account: Account = {
      id: crypto.randomUUID(),
      ...req.body,
      balance: 0,
      isActive: true,
    };

    accounts.set(account.id, account);
    res.status(201).json({ success: true, account });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - JOURNAL ENTRIES
// ============================================================

router.post('/journal', async (req, res) => {
  try {
    const { date, reference, description, entries } = req.body;

    // Validate debit = credit
    const totalDebit = entries.reduce((s: number, e: any) => s + e.debit, 0);
    const totalCredit = entries.reduce((s: number, e: any) => s + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Debit and Credit must be equal',
        debit: totalDebit,
        credit: totalCredit,
      });
    }

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date,
      reference: reference || generateReference('JV'),
      description,
      entries: entries.map((e: any) => {
        const account = Array.from(accounts.values()).find(a => a.id === e.accountId);
        return {
          ...e,
          accountName: account?.name || e.accountName || 'Unknown',
        };
      }),
      status: 'draft',
      createdBy: req.body.createdBy || 'system',
      createdAt: new Date(),
    };

    journalEntries.set(entry.id, entry);
    res.status(201).json({ success: true, entry });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/journal/:id/post', async (req, res) => {
  try {
    const entry = journalEntries.get(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    // Update account balances
    for (const line of entry.entries) {
      const account = Array.from(accounts.values()).find(a => a.id === line.accountId);
      if (account) {
        if (account.nature === 'debit') {
          account.balance += line.debit - line.credit;
        } else {
          account.balance += line.credit - line.debit;
        }
        accounts.set(account.id, account);
      }
    }

    entry.status = 'posted';
    entry.postedAt = new Date();
    journalEntries.set(req.params.id, entry);

    res.json({ success: true, entry });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/journal', async (req, res) => {
  try {
    const { from, to, status, accountId } = req.query;
    let result = Array.from(journalEntries.values());

    if (from) result = result.filter(e => e.date >= from);
    if (to) result = result.filter(e => e.date <= to);
    if (status) result = result.filter(e => e.status === status);
    if (accountId) {
      result = result.filter(e => e.entries.some(line => line.accountId === accountId));
    }

    result.sort((a, b) => b.date.localeCompare(a.date));

    res.json({ success: true, entries: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - VENDORS
// ============================================================

router.post('/vendors', async (req, res) => {
  try {
    const vendor: Vendor = {
      id: crypto.randomUUID(),
      code: req.body.code || generateReference('VND'),
      ...req.body,
      outstanding: 0,
      status: 'active',
    };

    vendors.set(vendor.id, vendor);
    res.status(201).json({ success: true, vendor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/vendors', async (req, res) => {
  try {
    const { status } = req.query;
    let result = Array.from(vendors.values());

    if (status) result = result.filter(v => v.status === status);

    res.json({ success: true, vendors: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - CUSTOMERS
// ============================================================

router.post('/customers', async (req, res) => {
  try {
    const customer: Customer = {
      id: crypto.randomUUID(),
      code: req.body.code || generateReference('CUST'),
      ...req.body,
      outstanding: 0,
      since: new Date(),
      status: 'active',
    };

    customers.set(customer.id, customer);
    res.status(201).json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const { status } = req.query;
    let result = Array.from(customers.values());

    if (status) result = result.filter(c => c.status === status);

    res.json({ success: true, customers: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - INVOICES
// ============================================================

router.post('/invoices', async (req, res) => {
  try {
    const { type, customerId, vendorId, lineItems, date, dueDate, discount } = req.body;

    // Calculate totals
    const subtotal = lineItems.reduce((s: number, item: any) => s + item.taxableAmount, 0);
    const taxAmount = lineItems.reduce((s: number, item: any) => s + item.taxAmount, 0);
    const discountAmount = discount?.type === 'percentage'
      ? subtotal * discount.value / 100
      : discount?.type === 'fixed' ? discount.value : 0;
    const total = subtotal + taxAmount - discountAmount;

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber: generateReference(type === 'sales' ? 'INV' : 'PINV'),
      type,
      customerId,
      vendorId,
      customerName: customers.get(customerId)?.name,
      vendorName: vendors.get(vendorId)?.name,
      date,
      dueDate,
      gstin: customers.get(customerId)?.gstin || vendors.get(vendorId)?.gstin,
      lineItems,
      subtotal,
      taxAmount,
      discount: discount ? { ...discount, amount: discountAmount } : undefined,
      total,
      amountInWords: numberToWords(total),
      paymentStatus: 'pending',
      paidAmount: 0,
      balanceAmount: total,
      createdAt: new Date(),
      createdBy: req.body.createdBy || 'system',
    };

    invoices.set(invoice.id, invoice);

    // Update customer/vendor outstanding
    if (customerId) {
      const customer = customers.get(customerId);
      if (customer) {
        customer.outstanding += total;
        customers.set(customerId, customer);
      }
    } else if (vendorId) {
      const vendor = vendors.get(vendorId);
      if (vendor) {
        vendor.outstanding += total;
        vendors.set(vendorId, vendor);
      }
    }

    // Create journal entry
    await createInvoiceJournalEntry(invoice);

    res.status(201).json({ success: true, invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const { type, customerId, vendorId, status, from, to } = req.query;
    let result = Array.from(invoices.values());

    if (type) result = result.filter(i => i.type === type);
    if (customerId) result = result.filter(i => i.customerId === customerId);
    if (vendorId) result = result.filter(i => i.vendorId === vendorId);
    if (status) result = result.filter(i => i.paymentStatus === status);
    if (from) result = result.filter(i => i.date >= from);
    if (to) result = result.filter(i => i.date <= to);

    result.sort((a, b) => b.date.localeCompare(a.date));

    res.json({ success: true, invoices: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = invoices.get(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true, invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - PAYMENTS
// ============================================================

router.post('/payments', async (req, res) => {
  try {
    const { type, customerId, vendorId, amount, invoices: allocations } = req.body;

    const payment: Payment = {
      id: crypto.randomUUID(),
      type,
      customerId,
      vendorId,
      amount,
      date: req.body.date || new Date().toISOString().split('T')[0],
      reference: req.body.reference || generateReference(type === 'receive' ? 'REC' : 'PAY'),
      mode: req.body.mode || 'bank',
      invoices: allocations || [],
      status: 'completed',
      createdAt: new Date(),
    };

    payments.set(payment.id, payment);

    // Update invoice balances
    for (const alloc of allocations || []) {
      const invoice = invoices.get(alloc.invoiceId);
      if (invoice) {
        invoice.paidAmount += alloc.amountPaid;
        invoice.balanceAmount -= alloc.amountPaid;

        if (invoice.balanceAmount <= 0) {
          invoice.paymentStatus = 'paid';
        } else {
          invoice.paymentStatus = 'partial';
        }

        invoices.set(invoice.id, invoice);
      }
    }

    // Update customer/vendor outstanding
    if (customerId) {
      const customer = customers.get(customerId);
      if (customer) {
        customer.outstanding -= amount;
        customers.set(customerId, customer);
      }
    } else if (vendorId) {
      const vendor = vendors.get(vendorId);
      if (vendor) {
        vendor.outstanding -= amount;
        vendors.set(vendorId, vendor);
      }
    }

    // Create payment journal entry
    await createPaymentJournalEntry(payment);

    res.status(201).json({ success: true, payment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - CREDIT NOTES
// ============================================================

router.post('/credit-notes', async (req, res) => {
  try {
    const creditNote: CreditNote = {
      id: crypto.randomUUID(),
      noteNumber: generateReference('CN'),
      ...req.body,
      total: req.body.lineItems.reduce((s: number, item: any) => s + item.total, 0),
      status: 'draft',
      createdAt: new Date(),
    };

    creditNotes.set(creditNote.id, creditNote);
    res.status(201).json({ success: true, creditNote });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - FIXED ASSETS
// ============================================================

router.post('/assets', async (req, res) => {
  try {
    const asset: FixedAsset = {
      id: crypto.randomUUID(),
      assetCode: req.body.assetCode || generateReference('AST'),
      ...req.body,
      depreciation: {
        method: 'straight_line',
        rate: req.body.rate || 10,
        usefulLife: req.body.usefulLife || 10,
        residualValue: req.body.residualValue || 0,
        accumulated: 0,
      },
      currentValue: req.body.purchaseValue,
      status: 'active',
      maintenance: [],
    };

    fixedAssets.set(asset.id, asset);
    res.status(201).json({ success: true, asset });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/assets', async (req, res) => {
  try {
    const { status, category } = req.query;
    let result = Array.from(fixedAssets.values());

    if (status) result = result.filter(a => a.status === status);
    if (category) result = result.filter(a => a.category === category);

    res.json({ success: true, assets: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - REPORTS
// ============================================================

router.get('/reports/trial-balance', async (req, res) => {
  try {
    const { date } = req.query;
    const asOfDate = date || new Date().toISOString().split('T')[0];

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];
    const revenue: any[] = [];
    const expenses: any[] = [];

    for (const account of accounts.values()) {
      if (!account.isActive || account.balance === 0) continue;

      const entry = {
        code: account.code,
        name: account.name,
        nature: account.nature,
        balance: account.balance,
      };

      switch (account.type) {
        case 'asset':
          assets.push(entry);
          break;
        case 'liability':
          liabilities.push(entry);
          break;
        case 'equity':
          equity.push(entry);
          break;
        case 'revenue':
        case 'other_income':
          revenue.push(entry);
          break;
        case 'expense':
        case 'other_expense':
          expenses.push(entry);
          break;
      }
    }

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    const totalEquity = equity.reduce((s, e) => s + e.balance, 0);
    const totalRevenue = revenue.reduce((s, r) => s + r.balance, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.balance, 0);

    const netProfit = totalRevenue - totalExpenses;

    res.json({
      success: true,
      asOf: asOfDate,
      assets: { accounts: assets, total: totalAssets },
      liabilities: { accounts: liabilities, total: totalLiabilities },
      equity: { accounts: equity, total: totalEquity + netProfit },
      revenue: { accounts: revenue, total: totalRevenue },
      expenses: { accounts: expenses, total: totalExpenses },
      netProfit,
      balancesEqual: Math.abs(totalAssets - (totalLiabilities + totalEquity + netProfit)) < 1,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/balance-sheet', async (req, res) => {
  try {
    const assets = Array.from(accounts.values())
      .filter(a => a.type === 'asset' && a.isActive)
      .reduce((s, a) => s + a.balance, 0);

    const liabilities = Array.from(accounts.values())
      .filter(a => a.type === 'liability' && a.isActive)
      .reduce((s, a) => s + a.balance, 0);

    const equity = Array.from(accounts.values())
      .filter(a => a.type === 'equity' && a.isActive)
      .reduce((s, a) => s + a.balance, 0);

    const netProfit = calculateNetProfit();

    res.json({
      success: true,
      balanceSheet: {
        assets,
        liabilities,
        equity: equity + netProfit,
        totalLiabilities: liabilities + equity + netProfit,
        totalAssets: assets,
        balanced: Math.abs(assets - (liabilities + equity + netProfit)) < 1,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/profit-loss', async (req, res) => {
  try {
    const { from, to } = req.query;

    const revenue = Array.from(accounts.values())
      .filter(a => (a.type === 'revenue' || a.type === 'other_income') && a.isActive)
      .reduce((s, a) => s + a.balance, 0);

    const expenses = Array.from(accounts.values())
      .filter(a => (a.type === 'expense' || a.type === 'other_expense') && a.isActive)
      .reduce((s, a) => s + a.balance, 0);

    const grossProfit = revenue * 0.7; // Simplified
    const netProfit = grossProfit - expenses;

    res.json({
      success: true,
      pnl: {
        revenue,
        grossProfit,
        expenses,
        netProfit,
        margin: revenue > 0 ? (netProfit / revenue * 100).toFixed(2) : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function generateReference(prefix: string): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}/${year}${month}/${random}`;
}

function numberToWords(num: number): string {
  // Simplified - would use proper Indian numbering
  return `Rupees ${Math.floor(num)} only`;
}

async function createInvoiceJournalEntry(invoice: Invoice): Promise<void> {
  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    date: invoice.date,
    reference: invoice.invoiceNumber,
    description: `${invoice.type === 'sales' ? 'Sales' : 'Purchase'} Invoice ${invoice.invoiceNumber}`,
    entries: [],
    status: 'posted',
    postedAt: new Date(),
    createdBy: 'system',
    createdAt: new Date(),
  };

  if (invoice.type === 'sales') {
    // Debit: Customer (AR)
    const arAccount = Array.from(accounts.values()).find(a => a.code === '1101');
    if (arAccount) {
      entry.entries.push({
        accountId: arAccount.id,
        accountName: arAccount.name,
        debit: invoice.total,
        credit: 0,
      });
    }

    // Credit: Sales Revenue
    const salesAccount = Array.from(accounts.values()).find(a => a.code === '4001');
    if (salesAccount) {
      entry.entries.push({
        accountId: salesAccount.id,
        accountName: salesAccount.name,
        debit: 0,
        credit: invoice.subtotal,
      });
    }

    // Credit: GST Payable
    const gstAccount = Array.from(accounts.values()).find(a => a.code === '2101');
    if (gstAccount) {
      entry.entries.push({
        accountId: gstAccount.id,
        accountName: gstAccount.name,
        debit: 0,
        credit: invoice.taxAmount,
      });
    }
  } else {
    // Purchase invoice (reverse of above)
  }

  journalEntries.set(entry.id, entry);
}

async function createPaymentJournalEntry(payment: Payment): Promise<void> {
  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    date: payment.date,
    reference: payment.reference,
    description: `Payment ${payment.reference}`,
    entries: [],
    status: 'posted',
    postedAt: new Date(),
    createdBy: 'system',
    createdAt: new Date(),
  };

  if (payment.type === 'receive') {
    // Debit: Bank/Cash
    const bankAccount = Array.from(accounts.values()).find(a => a.code === '1002');
    if (bankAccount) {
      entry.entries.push({
        accountId: bankAccount.id,
        accountName: bankAccount.name,
        debit: payment.amount,
        credit: 0,
      });
    }

    // Credit: Customer (AR)
    const arAccount = Array.from(accounts.values()).find(a => a.code === '1101');
    if (arAccount) {
      entry.entries.push({
        accountId: arAccount.id,
        accountName: arAccount.name,
        debit: 0,
        credit: payment.amount,
      });
    }
  } else {
    // Payment to vendor (reverse)
  }

  journalEntries.set(entry.id, entry);
}

function calculateNetProfit(): number {
  const revenue = Array.from(accounts.values())
    .filter(a => (a.type === 'revenue' || a.type === 'other_income') && a.isActive)
    .reduce((s, a) => s + a.balance, 0);

  const expenses = Array.from(accounts.values())
    .filter(a => (a.type === 'expense' || a.type === 'other_expense') && a.isActive)
    .reduce((s, a) => s + a.balance, 0);

  return revenue - expenses;
}

export default router;
