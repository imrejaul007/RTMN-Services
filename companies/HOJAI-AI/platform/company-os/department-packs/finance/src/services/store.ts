/**
 * Finance Service - Tenant-Aware Data Store
 *
 * In-memory data store with tenant isolation.
 */

import {
  Invoice, InvoiceStatus, Payment, PaymentStatus,
  Expense, ExpenseStatus, Account, AccountType,
  JournalEntry, Budget, BudgetAllocation
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Tenant-Scoped Data Stores
// ============================================

interface TenantData {
  invoices: Map<string, Invoice>;
  payments: Map<string, Payment>;
  expenses: Map<string, Expense>;
  accounts: Map<string, Account>;
  journalEntries: Map<string, JournalEntry>;
  budgets: Map<string, Budget>;
}

class TenantDataStore {
  private tenants: Map<string, TenantData> = new Map();

  /**
   * Get or create tenant data
   */
  getTenant(tenantId: string): TenantData {
    if (!this.tenants.has(tenantId)) {
      this.tenants.set(tenantId, {
        invoices: new Map(),
        payments: new Map(),
        expenses: new Map(),
        accounts: new Map(),
        journalEntries: new Map(),
        budgets: new Map(),
      });
      // Seed default chart of accounts
      this.seedDefaultAccounts(tenantId);
    }
    return this.tenants.get(tenantId)!;
  }

  /**
   * Seed default chart of accounts
   */
  private seedDefaultAccounts(tenantId: string): void {
    const data = this.tenants.get(tenantId)!;
    const accounts: Account[] = [
      // Assets
      { id: 'cash', tenantId, code: '1000', name: 'Cash', type: 'asset', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      { id: 'bank', tenantId, code: '1010', name: 'Bank Account', type: 'asset', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      { id: 'receivables', tenantId, code: '1100', name: 'Accounts Receivable', type: 'asset', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      { id: 'inventory', tenantId, code: '1200', name: 'Inventory', type: 'asset', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      // Liabilities
      { id: 'payables', tenantId, code: '2000', name: 'Accounts Payable', type: 'liability', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      { id: 'gst-payable', tenantId, code: '2100', name: 'GST Payable', type: 'liability', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      // Equity
      { id: 'capital', tenantId, code: '3000', name: 'Capital', type: 'equity', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      { id: 'retained-earnings', tenantId, code: '3100', name: 'Retained Earnings', type: 'equity', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      // Revenue
      { id: 'sales', tenantId, code: '4000', name: 'Sales Revenue', type: 'revenue', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      { id: 'service-revenue', tenantId, code: '4100', name: 'Service Revenue', type: 'revenue', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      // Expenses
      { id: 'cogs', tenantId, code: '5000', name: 'Cost of Goods Sold', type: 'expense', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      { id: 'rent', tenantId, code: '5100', name: 'Rent Expense', type: 'expense', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      { id: 'salaries', tenantId, code: '5200', name: 'Salaries Expense', type: 'expense', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
      { id: 'utilities', tenantId, code: '5300', name: 'Utilities Expense', type: 'expense', balance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
    ];

    for (const account of accounts) {
      data.accounts.set(account.id, account);
    }
  }

  /**
   * Delete all tenant data
   */
  deleteTenant(tenantId: string): void {
    this.tenants.delete(tenantId);
  }
}

// Singleton instance
export const tenantStore = new TenantDataStore();

// ============================================
// Invoice Service
// ============================================

export class InvoiceService {
  /**
   * Create invoice
   */
  create(tenantId: string, input: {
    customerId: string;
    customerName: string;
    items: { description: string; quantity: number; unitPrice: number; taxRate?: number }[];
    dueDate: string;
    issuedDate?: string;
  }): Invoice {
    const data = tenantStore.getTenant(tenantId);
    const id = `inv_${uuidv4().slice(0, 8)}`;
    const invoiceItems = input.items.map(item => ({
      id: `item_${uuidv4().slice(0, 6)}`,
      ...item,
      total: item.quantity * item.unitPrice,
      taxAmount: item.quantity * item.unitPrice * (item.taxRate || 0) / 100,
    }));

    const subtotal = invoiceItems.reduce((sum, i) => sum + i.total, 0);
    const tax = invoiceItems.reduce((sum, i) => sum + i.taxAmount, 0);

    const invoice: Invoice = {
      id,
      tenantId,
      number: `INV-${Date.now().toString(36).toUpperCase()}`,
      customerId: input.customerId,
      customerName: input.customerName,
      items: invoiceItems,
      subtotal,
      tax,
      total: subtotal + tax,
      currency: 'INR',
      status: 'draft',
      dueDate: input.dueDate,
      issuedDate: input.issuedDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.invoices.set(id, invoice);
    return invoice;
  }

  /**
   * Get invoice by ID
   */
  get(tenantId: string, invoiceId: string): Invoice | null {
    const data = tenantStore.getTenant(tenantId);
    const invoice = data.invoices.get(invoiceId);
    if (invoice && invoice.tenantId === tenantId) {
      return invoice;
    }
    return null;
  }

  /**
   * List invoices for tenant
   */
  list(tenantId: string, filters?: { status?: InvoiceStatus; customerId?: string }): Invoice[] {
    const data = tenantStore.getTenant(tenantId);
    let invoices = Array.from(data.invoices.values())
      .filter(inv => inv.tenantId === tenantId);

    if (filters?.status) {
      invoices = invoices.filter(inv => inv.status === filters.status);
    }
    if (filters?.customerId) {
      invoices = invoices.filter(inv => inv.customerId === filters.customerId);
    }

    return invoices.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Update invoice status
   */
  updateStatus(tenantId: string, invoiceId: string, status: InvoiceStatus): Invoice | null {
    const data = tenantStore.getTenant(tenantId);
    const invoice = data.invoices.get(invoiceId);

    if (!invoice || invoice.tenantId !== tenantId) {
      return null;
    }

    invoice.status = status;
    invoice.updatedAt = new Date().toISOString();

    if (status === 'paid') {
      invoice.paidDate = new Date().toISOString();
    }

    return invoice;
  }
}

export const invoiceService = new InvoiceService();

// ============================================
// Payment Service
// ============================================

export class PaymentService {
  create(tenantId: string, input: {
    invoiceId?: string;
    amount: number;
    method: 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque';
    reference?: string;
  }): Payment {
    const data = tenantStore.getTenant(tenantId);
    const id = `pay_${uuidv4().slice(0, 8)}`;

    const payment: Payment = {
      id,
      tenantId,
      invoiceId: input.invoiceId,
      amount: input.amount,
      currency: 'INR',
      method: input.method,
      status: 'completed',
      reference: input.reference,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    data.payments.set(id, payment);

    // Update invoice status if linked
    if (input.invoiceId) {
      invoiceService.updateStatus(tenantId, input.invoiceId, 'paid');
    }

    return payment;
  }

  list(tenantId: string): Payment[] {
    const data = tenantStore.getTenant(tenantId);
    return Array.from(data.payments.values())
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

export const paymentService = new PaymentService();

// ============================================
// Expense Service
// ============================================

export class ExpenseService {
  create(tenantId: string, input: {
    category: string;
    description: string;
    amount: number;
    date: string;
    vendor?: string;
  }): Expense {
    const data = tenantStore.getTenant(tenantId);
    const id = `exp_${uuidv4().slice(0, 8)}`;

    const expense: Expense = {
      id,
      tenantId,
      category: input.category,
      description: input.description,
      amount: input.amount,
      currency: 'INR',
      date: input.date,
      vendor: input.vendor,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    data.expenses.set(id, expense);
    return expense;
  }

  approve(tenantId: string, expenseId: string, approvedBy: string): Expense | null {
    const data = tenantStore.getTenant(tenantId);
    const expense = data.expenses.get(expenseId);

    if (!expense || expense.tenantId !== tenantId) {
      return null;
    }

    expense.status = 'approved';
    expense.approvedBy = approvedBy;
    expense.approvedAt = new Date().toISOString();
    return expense;
  }

  list(tenantId: string, filters?: { status?: ExpenseStatus }): Expense[] {
    const data = tenantStore.getTenant(tenantId);
    let expenses = Array.from(data.expenses.values())
      .filter(e => e.tenantId === tenantId);

    if (filters?.status) {
      expenses = expenses.filter(e => e.status === filters.status);
    }

    return expenses.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const expenseService = new ExpenseService();

// ============================================
// Account Service
// ============================================

export class AccountService {
  list(tenantId: string, type?: AccountType): Account[] {
    const data = tenantStore.getTenant(tenantId);
    let accounts = Array.from(data.accounts.values())
      .filter(a => a.tenantId === tenantId && a.isActive);

    if (type) {
      accounts = accounts.filter(a => a.type === type);
    }

    return accounts.sort((a, b) => a.code.localeCompare(b.code));
  }

  get(tenantId: string, accountId: string): Account | null {
    const data = tenantStore.getTenant(tenantId);
    const account = data.accounts.get(accountId);
    if (account && account.tenantId === tenantId) {
      return account;
    }
    return null;
  }

  updateBalance(tenantId: string, accountId: string, amount: number): Account | null {
    const data = tenantStore.getTenant(tenantId);
    const account = data.accounts.get(accountId);

    if (!account || account.tenantId !== tenantId) {
      return null;
    }

    account.balance += amount;
    return account;
  }
}

export const accountService = new AccountService();
