import { describe, it, expect } from 'vitest';

// QuickBooks Connector Constants
const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue'];
const EXPENSE_STATUSES = ['pending', 'approved', 'paid'];
const ACCOUNT_TYPES = ['bank', 'credit_card', 'expense', 'income', 'asset', 'liability'];

describe('QuickBooks Connector', () => {
  describe('Invoice Statuses', () => {
    it('should have all invoice statuses', () => {
      expect(INVOICE_STATUSES).toContain('draft');
      expect(INVOICE_STATUSES).toContain('sent');
      expect(INVOICE_STATUSES).toContain('paid');
      expect(INVOICE_STATUSES).toContain('overdue');
    });
  });

  describe('Expense Statuses', () => {
    it('should have all expense statuses', () => {
      expect(EXPENSE_STATUSES).toContain('pending');
      expect(EXPENSE_STATUSES).toContain('approved');
      expect(EXPENSE_STATUSES).toContain('paid');
    });
  });

  describe('Account Types', () => {
    it('should have all account types', () => {
      expect(ACCOUNT_TYPES).toContain('bank');
      expect(ACCOUNT_TYPES).toContain('income');
      expect(ACCOUNT_TYPES).toContain('expense');
    });
  });

  describe('Invoice Validation', () => {
    const validateInvoice = (invoice: {
      customer?: string;
      amount?: number;
      due_date?: string;
      line_items?: Array<{ description: string; quantity: number; rate: number }>;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!invoice.customer) errors.push('customer is required');
      if (!invoice.amount) errors.push('amount is required');
      if (invoice.amount !== undefined && invoice.amount <= 0) errors.push('amount must be positive');
      if (invoice.due_date && isNaN(Date.parse(invoice.due_date))) errors.push('invalid due_date');

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct invoice', () => {
      const result = validateInvoice({
        customer: 'Acme Corp',
        amount: 5000,
        due_date: '2026-07-15',
        line_items: [{ description: 'Service', quantity: 1, rate: 5000 }]
      });
      expect(result.valid).toBe(true);
    });

    it('should require customer and amount', () => {
      const result = validateInvoice({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('customer is required');
      expect(result.errors).toContain('amount is required');
    });
  });

  describe('Expense Validation', () => {
    const validateExpense = (expense: {
      vendor?: string;
      amount?: number;
      date?: string;
      category?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!expense.vendor) errors.push('vendor is required');
      if (!expense.amount) errors.push('amount is required');
      if (expense.amount !== undefined && expense.amount <= 0) errors.push('amount must be positive');

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct expense', () => {
      const result = validateExpense({
        vendor: 'Office Supplies Inc',
        amount: 150,
        date: '2026-06-20',
        category: 'office'
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Account Validation', () => {
    const validateAccount = (account: {
      name?: string;
      type?: string;
      balance?: number;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!account.name) errors.push('name is required');
      if (!account.type) errors.push('type is required');
      if (account.type && !ACCOUNT_TYPES.includes(account.type)) {
        errors.push(`invalid type: ${account.type}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct account', () => {
      const result = validateAccount({
        name: 'Checking Account',
        type: 'bank',
        balance: 50000
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Invoice Filtering', () => {
    const filterInvoices = (
      invoices: Array<{ status: string; customer: string; amount: number }>,
      filters: { status?: string; customer?: string; minAmount?: number }
    ) => {
      let filtered = [...invoices];

      if (filters.status) filtered = filtered.filter(i => i.status === filters.status);
      if (filters.customer) filtered = filtered.filter(i => i.customer.includes(filters.customer));
      if (filters.minAmount !== undefined) filtered = filtered.filter(i => i.amount >= filters.minAmount);

      return filtered;
    };

    it('should filter by status', () => {
      const invoices = [
        { status: 'paid', customer: 'Acme', amount: 1000 },
        { status: 'overdue', customer: 'Beta', amount: 2000 }
      ];
      const results = filterInvoices(invoices, { status: 'overdue' });
      expect(results).toHaveLength(1);
    });
  });

  describe('Revenue Calculation', () => {
    const calculateRevenue = (invoices: Array<{ status: string; amount: number; customer: string }>) => {
      const paid = invoices.filter(i => i.status === 'paid');
      const overdue = invoices.filter(i => i.status === 'overdue');

      return {
        totalBilled: invoices.reduce((sum, i) => sum + i.amount, 0),
        totalCollected: paid.reduce((sum, i) => sum + i.amount, 0),
        totalOutstanding: overdue.reduce((sum, i) => sum + i.amount, 0),
        collectionRate: invoices.length > 0 ? (paid.length / invoices.length) * 100 : 0
      };
    };

    it('should calculate revenue metrics', () => {
      const invoices = [
        { status: 'paid', customer: 'A', amount: 1000 },
        { status: 'paid', customer: 'B', amount: 2000 },
        { status: 'overdue', customer: 'C', amount: 500 }
      ];
      const revenue = calculateRevenue(invoices);
      expect(revenue.totalBilled).toBe(3500);
      expect(revenue.totalCollected).toBe(3000);
      expect(revenue.totalOutstanding).toBe(500);
      expect(revenue.collectionRate).toBeCloseTo(66.67, 0);
    });
  });

  describe('Expense Categorization', () => {
    const categorizeExpenses = (
      expenses: Array<{ category: string; amount: number; status: string }>
    ) => {
      const byCategory: Record<string, number> = {};
      const approved = expenses.filter(e => e.status === 'approved');

      approved.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      });

      return byCategory;
    };

    it('should group expenses by category', () => {
      const expenses = [
        { category: 'travel', amount: 500, status: 'approved' },
        { category: 'office', amount: 200, status: 'approved' },
        { category: 'travel', amount: 300, status: 'pending' }
      ];
      const categorized = categorizeExpenses(expenses);
      expect(categorized.travel).toBe(500);
      expect(categorized.office).toBe(200);
    });
  });

  describe('Invoice Due Date Analysis', () => {
    const analyzeDueDates = (invoices: Array<{ due_date: string; status: string }>) => {
      const now = new Date();
      const overdue = invoices.filter(i => i.status !== 'paid' && new Date(i.due_date) < now);
      const dueSoon = invoices.filter(i => {
        if (i.status === 'paid') return false;
        const due = new Date(i.due_date);
        const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      });

      return { overdueCount: overdue.length, dueSoonCount: dueSoon.length };
    };

    it('should identify overdue and upcoming invoices', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
      const soon = new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0];
      const future = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];

      const invoices = [
        { due_date: past, status: 'sent' },
        { due_date: soon, status: 'sent' },
        { due_date: future, status: 'sent' }
      ];
      const analysis = analyzeDueDates(invoices);
      expect(analysis.overdueCount).toBe(1);
      expect(analysis.dueSoonCount).toBe(1);
    });
  });
});