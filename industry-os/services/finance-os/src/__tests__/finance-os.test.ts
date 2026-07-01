/**
 * Finance OS - Test Suite
 *
 * Tests: Chart of Accounts, Journal Entries, Trial Balance, Reports
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Data stores
const mockAccounts = new Map();
const mockEntries = new Map();
const mockBudgets = new Map();

let idCounter = 1;
const generateId = () => `fin_${String(idCounter++).padStart(6, '0')}`;

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentId?: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  lines: { accountId: string; debit: number; credit: number }[];
  status: 'draft' | 'posted' | 'reversed';
  postedAt?: string;
  createdAt: string;
}

interface Budget {
  id: string;
  name: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  allocations: { accountId: string; amount: number }[];
  status: 'draft' | 'approved';
  createdAt: string;
}

// Service
const financeService = {
  // Chart of Accounts
  createAccount(data: Partial<Account>): Account {
    const account: Account = {
      id: generateId(),
      code: data.code || '',
      name: data.name || '',
      type: data.type || 'expense',
      parentId: data.parentId,
      balance: data.balance || 0,
      currency: data.currency || 'INR',
      isActive: data.isActive !== false,
      createdAt: new Date().toISOString(),
    };
    mockAccounts.set(account.id, account);
    return account;
  },

  getAccount(id: string): Account | undefined {
    return mockAccounts.get(id);
  },

  listAccounts(filters?: { type?: Account['type']; isActive?: boolean }): Account[] {
    let accounts = Array.from(mockAccounts.values());
    if (filters?.type) accounts = accounts.filter(a => a.type === filters.type);
    if (filters?.isActive !== undefined) accounts = accounts.filter(a => a.isActive === filters.isActive);
    return accounts;
  },

  updateAccountBalance(id: string, amount: number, type: 'debit' | 'credit'): Account | undefined {
    const account = mockAccounts.get(id);
    if (!account) return undefined;

    if (type === 'debit') {
      if (account.type === 'asset' || account.type === 'expense') {
        account.balance += amount;
      } else {
        account.balance -= amount;
      }
    } else {
      if (account.type === 'liability' || account.type === 'equity' || account.type === 'revenue') {
        account.balance += amount;
      } else {
        account.balance -= amount;
      }
    }
    mockAccounts.set(id, account);
    return account;
  },

  // Journal Entries
  createJournalEntry(data: Partial<JournalEntry>): JournalEntry {
    const entry: JournalEntry = {
      id: generateId(),
      date: data.date || new Date().toISOString(),
      description: data.description || '',
      lines: data.lines || [],
      status: data.status || 'draft',
      postedAt: data.postedAt,
      createdAt: new Date().toISOString(),
    };
    mockEntries.set(entry.id, entry);
    return entry;
  },

  postJournalEntry(id: string): JournalEntry | undefined {
    const entry = mockEntries.get(id);
    if (!entry) return undefined;

    // Validate debits = credits
    const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('Debits must equal credits');
    }

    entry.status = 'posted';
    entry.postedAt = new Date().toISOString();
    mockEntries.set(id, entry);

    // Update account balances
    entry.lines.forEach(line => {
      if (line.debit > 0) {
        financeService.updateAccountBalance(line.accountId, line.debit, 'debit');
      }
      if (line.credit > 0) {
        financeService.updateAccountBalance(line.accountId, line.credit, 'credit');
      }
    });

    return entry;
  },

  getTrialBalance(): { account: string; debit: number; credit: number }[] {
    const accounts = Array.from(mockAccounts.values());
    const result: { account: string; debit: number; credit: number }[] = [];

    accounts.forEach(acc => {
      if (acc.isActive) {
        if (acc.type === 'asset' || acc.type === 'expense') {
          result.push({ account: acc.name, debit: Math.abs(acc.balance), credit: 0 });
        } else {
          result.push({ account: acc.name, debit: 0, credit: Math.abs(acc.balance) });
        }
      }
    });

    return result;
  },

  // Budgets
  createBudget(data: Partial<Budget>): Budget {
    const budget: Budget = {
      id: generateId(),
      name: data.name || '',
      period: data.period || 'monthly',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      allocations: data.allocations || [],
      status: data.status || 'draft',
      createdAt: new Date().toISOString(),
    };
    mockBudgets.set(budget.id, budget);
    return budget;
  },

  approveBudget(id: string): Budget | undefined {
    const budget = mockBudgets.get(id);
    if (!budget) return undefined;
    budget.status = 'approved';
    mockBudgets.set(id, budget);
    return budget;
  },

  getBudgetVariance(budgetId: string): { accountId: string; budgeted: number; actual: number; variance: number }[] {
    const budget = mockBudgets.get(budgetId);
    if (!budget) return [];

    return budget.allocations.map(alloc => {
      const account = mockAccounts.get(alloc.accountId);
      const actual = account?.balance || 0;
      return {
        accountId: alloc.accountId,
        budgeted: alloc.amount,
        actual,
        variance: actual - alloc.amount,
      };
    });
  },

  reset() {
    mockAccounts.clear();
    mockEntries.clear();
    mockBudgets.clear();
    idCounter = 1;
  },
};

describe('Finance OS - Chart of Accounts', () => {
  beforeEach(() => financeService.reset());

  describe('createAccount', () => {
    it('should create account with required fields', () => {
      const account = financeService.createAccount({
        code: '1001',
        name: 'Cash',
        type: 'asset',
      });
      expect(account.id).toBeDefined();
      expect(account.code).toBe('1001');
      expect(account.name).toBe('Cash');
      expect(account.type).toBe('asset');
      expect(account.balance).toBe(0);
      expect(account.isActive).toBe(true);
    });

    it('should create all account types', () => {
      const types: Account['type'][] = ['asset', 'liability', 'equity', 'revenue', 'expense'];
      types.forEach(type => {
        const account = financeService.createAccount({ code: `code_${type}`, name: type, type });
        expect(account.type).toBe(type);
      });
    });
  });

  describe('listAccounts', () => {
    it('should filter by type', () => {
      financeService.createAccount({ code: 'A1', name: 'Asset', type: 'asset' });
      financeService.createAccount({ code: 'L1', name: 'Liability', type: 'liability' });
      financeService.createAccount({ code: 'E1', name: 'Expense', type: 'expense' });

      const assets = financeService.listAccounts({ type: 'asset' });
      expect(assets).toHaveLength(1);
      expect(assets[0].type).toBe('asset');
    });

    it('should filter by active status', () => {
      financeService.createAccount({ code: 'A1', name: 'Active', isActive: true });
      financeService.createAccount({ code: 'I1', name: 'Inactive', isActive: false });

      const active = financeService.listAccounts({ isActive: true });
      expect(active).toHaveLength(1);
    });
  });

  describe('updateAccountBalance', () => {
    it('should debit asset account', () => {
      const account = financeService.createAccount({ code: 'CASH', name: 'Cash', type: 'asset', balance: 10000 });
      const updated = financeService.updateAccountBalance(account.id, 5000, 'debit');
      expect(updated?.balance).toBe(15000);
    });

    it('should credit liability account', () => {
      const account = financeService.createAccount({ code: 'LOAN', name: 'Loan Payable', type: 'liability', balance: 50000 });
      const updated = financeService.updateAccountBalance(account.id, 10000, 'credit');
      expect(updated?.balance).toBe(60000);
    });
  });
});

describe('Finance OS - Journal Entries', () => {
  beforeEach(() => financeService.reset());

  describe('createJournalEntry', () => {
    it('should create entry with lines', () => {
      const cash = financeService.createAccount({ code: 'CASH', name: 'Cash', type: 'asset' });
      const revenue = financeService.createAccount({ code: 'REV', name: 'Revenue', type: 'revenue' });

      const entry = financeService.createJournalEntry({
        date: '2026-07-01',
        description: 'Cash Sale',
        lines: [
          { accountId: cash.id, debit: 10000, credit: 0 },
          { accountId: revenue.id, debit: 0, credit: 10000 },
        ],
      });

      expect(entry.id).toBeDefined();
      expect(entry.status).toBe('draft');
      expect(entry.lines).toHaveLength(2);
    });
  });

  describe('postJournalEntry', () => {
    it('should post entry and update balances', () => {
      const cash = financeService.createAccount({ code: 'CASH', name: 'Cash', type: 'asset' });
      const revenue = financeService.createAccount({ code: 'REV', name: 'Revenue', type: 'revenue' });

      const entry = financeService.createJournalEntry({
        description: 'Test Entry',
        lines: [
          { accountId: cash.id, debit: 50000, credit: 0 },
          { accountId: revenue.id, debit: 0, credit: 50000 },
        ],
      });

      const posted = financeService.postJournalEntry(entry.id);

      expect(posted?.status).toBe('posted');
      expect(posted?.postedAt).toBeDefined();

      // Check balances
      const updatedCash = financeService.getAccount(cash.id);
      expect(updatedCash?.balance).toBe(50000);

      const updatedRevenue = financeService.getAccount(revenue.id);
      expect(updatedRevenue?.balance).toBe(50000);
    });

    it('should reject unbalanced entries', () => {
      const cash = financeService.createAccount({ code: 'CASH', name: 'Cash', type: 'asset' });
      const revenue = financeService.createAccount({ code: 'REV', name: 'Revenue', type: 'revenue' });

      const entry = financeService.createJournalEntry({
        description: 'Unbalanced Entry',
        lines: [
          { accountId: cash.id, debit: 10000, credit: 0 },
          { accountId: revenue.id, debit: 0, credit: 5000 }, // Only 5000 credit
        ],
      });

      expect(() => financeService.postJournalEntry(entry.id)).toThrow('Debits must equal credits');
    });
  });
});

describe('Finance OS - Trial Balance', () => {
  beforeEach(() => financeService.reset());

  it('should generate trial balance', () => {
    const cash = financeService.createAccount({ code: 'CASH', name: 'Cash', type: 'asset', balance: 100000 });
    const equipment = financeService.createAccount({ code: 'EQUIP', name: 'Equipment', type: 'asset', balance: 50000 });
    const loan = financeService.createAccount({ code: 'LOAN', name: 'Loan', type: 'liability', balance: 30000 });
    const equity = financeService.createAccount({ code: 'EQ', name: 'Equity', type: 'equity', balance: 120000 });

    const trialBalance = financeService.getTrialBalance();

    expect(trialBalance).toHaveLength(4);

    const totalDebits = trialBalance.reduce((sum, r) => sum + r.debit, 0);
    const totalCredits = trialBalance.reduce((sum, r) => sum + r.credit, 0);

    expect(totalDebits).toBe(150000); // Cash + Equipment
    expect(totalCredits).toBe(150000); // Loan + Equity
    expect(Math.abs(totalDebits - totalCredits)).toBeLessThan(0.01); // Balanced
  });
});

describe('Finance OS - Budgets', () => {
  beforeEach(() => financeService.reset());

  it('should create and approve budget', () => {
    const marketing = financeService.createAccount({ code: 'MKT', name: 'Marketing', type: 'expense' });

    const budget = financeService.createBudget({
      name: 'Marketing Budget Q3',
      period: 'quarterly',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      allocations: [
        { accountId: marketing.id, amount: 500000 },
      ],
    });

    expect(budget.status).toBe('draft');

    const approved = financeService.approveBudget(budget.id);
    expect(approved?.status).toBe('approved');
  });

  it('should calculate variance', () => {
    const marketing = financeService.createAccount({ code: 'MKT', name: 'Marketing', type: 'expense', balance: 60000 });
    const budget = financeService.createBudget({
      name: 'Test Budget',
      allocations: [{ accountId: marketing.id, amount: 100000 }],
    });

    const variance = financeService.getBudgetVariance(budget.id);

    expect(variance).toHaveLength(1);
    expect(variance[0].budgeted).toBe(100000);
    expect(variance[0].actual).toBe(60000);
    expect(variance[0].variance).toBe(-40000); // Under budget
  });
});
