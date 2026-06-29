/**
 * Finance Department Pack - Types
 *
 * Tenant-aware finance service types.
 */

export interface TenantContext {
  tenantId: string;
  companyId: string;
  config: FinanceConfig;
}

export interface FinanceConfig {
  currency: string;
  timezone: string;
  fiscalYearStart: string;
  gstEnabled: boolean;
  tdsEnabled: boolean;
  multiCurrency: boolean;
}

// ============================================
// Invoice Types
// ============================================

export interface Invoice {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  issuedDate: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate: number;
  taxAmount: number;
}

export interface CreateInvoiceInput {
  customerId: string;
  customerName: string;
  items: Omit<InvoiceItem, 'id'>[];
  dueDate: string;
  issuedDate?: string;
}

// ============================================
// Payment Types
// ============================================

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  processedAt: string;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface CreatePaymentInput {
  invoiceId?: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

// ============================================
// Expense Types
// ============================================

export interface Expense {
  id: string;
  tenantId: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  vendor?: string;
  receipt?: string;
  status: ExpenseStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface CreateExpenseInput {
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  receipt?: string;
}

// ============================================
// Account Types
// ============================================

export interface Account {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export type AccountType =
  | 'asset' | 'liability' | 'equity'
  | 'revenue' | 'expense';

// ============================================
// Journal Entry Types
// ============================================

export interface JournalEntry {
  id: string;
  tenantId: string;
  date: string;
  description: string;
  lines: JournalLine[];
  posted: boolean;
  createdAt: string;
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
}

// ============================================
// Budget Types
// ============================================

export interface Budget {
  id: string;
  tenantId: string;
  name: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  allocations: BudgetAllocation[];
  totalBudget: number;
  totalSpent: number;
  status: 'draft' | 'active' | 'closed';
  createdAt: string;
}

export interface BudgetAllocation {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  spent: number;
  remaining: number;
}

// ============================================
// Report Types
// ============================================

export interface TrialBalance {
  asOfDate: string;
  accounts: {
    account: Account;
    debit: number;
    credit: number;
  }[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface BalanceSheet {
  asOfDate: string;
  assets: AccountSummary[];
  liabilities: AccountSummary[];
  equity: AccountSummary[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface AccountSummary {
  accountId: string;
  accountName: string;
  balance: number;
}

export interface CashFlow {
  startDate: string;
  endDate: string;
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  openingBalance: number;
  closingBalance: number;
}
