/**
 * Finance Service Client for Capital Service
 * Provides typed access to the finance service API
 */

import axios, { AxiosInstance } from 'axios';

// Configuration
const FINANCE_SERVICE_URL = process.env.FINANCE_SERVICE_URL || 'http://localhost:3006';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

// Types
export interface Transaction {
  _id: string;
  transactionId: string;
  merchantId: string;
  storeId?: string;
  type: 'credit' | 'debit' | 'fee' | 'repayment' | 'disbursement';
  amount: number;
  currency: string;
  category: string;
  description: string;
  referenceId?: string;
  referenceType?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}

export interface LedgerEntry {
  _id: string;
  ledgerId: string;
  merchantId: string;
  entries: Array<{
    account: string;
    debit: number;
    credit: number;
    description: string;
  }>;
  balance: number;
  status: 'pending' | 'posted';
  createdAt: Date;
  postedAt?: Date;
}

export interface AccountSummary {
  merchantId: string;
  accountType: string;
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  lastUpdated: Date;
}

export interface Invoice {
  _id: string;
  invoiceId: string;
  merchantId: string;
  type: 'loan_statement' | 'fee' | 'interest';
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidAt?: Date;
  paidAmount?: number;
  createdAt: Date;
}

export class FinanceClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: FINANCE_SERVICE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': INTERNAL_SERVICE_TOKEN,
        'x-internal-service': 'rez-capital-service',
      },
    });
  }

  /**
   * Get transactions for a merchant
   */
  async getTransactions(
    merchantId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      type?: string;
      status?: string;
      limit?: number;
    }
  ): Promise<Transaction[]> {
    const response = await this.client.get(`/merchants/${merchantId}/transactions`, {
      params: {
        ...params,
        startDate: params?.startDate?.toISOString(),
        endDate: params?.endDate?.toISOString(),
      },
    });
    return response.data.transactions || response.data;
  }

  /**
   * Create a transaction
   */
  async createTransaction(transaction: {
    merchantId: string;
    type: Transaction['type'];
    amount: number;
    category: string;
    description: string;
    referenceId?: string;
    referenceType?: string;
  }): Promise<Transaction> {
    const response = await this.client.post('/transactions', transaction);
    return response.data;
  }

  /**
   * Record disbursement
   */
  async recordDisbursement(params: {
    loanId: string;
    merchantId: string;
    amount: number;
    referenceId?: string;
  }): Promise<Transaction> {
    return this.createTransaction({
      merchantId: params.merchantId,
      type: 'disbursement',
      amount: params.amount,
      category: 'loan_disbursement',
      description: `Loan disbursement for loan ${params.loanId}`,
      referenceId: params.referenceId || params.loanId,
      referenceType: 'loan',
    });
  }

  /**
   * Record repayment
   */
  async recordRepayment(params: {
    loanId: string;
    merchantId: string;
    amount: number;
    referenceId?: string;
  }): Promise<Transaction> {
    return this.createTransaction({
      merchantId: params.merchantId,
      type: 'repayment',
      amount: params.amount,
      category: 'loan_repayment',
      description: `Loan repayment for loan ${params.loanId}`,
      referenceId: params.referenceId || params.loanId,
      referenceType: 'loan',
    });
  }

  /**
   * Record fee
   */
  async recordFee(params: {
    loanId: string;
    merchantId: string;
    feeType: string;
    amount: number;
    referenceId?: string;
  }): Promise<Transaction> {
    return this.createTransaction({
      merchantId: params.merchantId,
      type: 'fee',
      amount: params.amount,
      category: `fee_${params.feeType}`,
      description: `${params.feeType} fee for loan ${params.loanId}`,
      referenceId: params.referenceId || params.loanId,
      referenceType: 'loan',
    });
  }

  /**
   * Get account summary
   */
  async getAccountSummary(merchantId: string, accountType: string = 'capital'): Promise<AccountSummary> {
    const response = await this.client.get(`/merchants/${merchantId}/accounts/${accountType}`);
    return response.data;
  }

  /**
   * Get ledger entries
   */
  async getLedgerEntries(
    merchantId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      limit?: number;
    }
  ): Promise<LedgerEntry[]> {
    const response = await this.client.get(`/merchants/${merchantId}/ledger`, {
      params: {
        ...params,
        startDate: params?.startDate?.toISOString(),
        endDate: params?.endDate?.toISOString(),
      },
    });
    return response.data.entries || response.data;
  }

  /**
   * Create invoice
   */
  async createInvoice(invoice: {
    merchantId: string;
    type: Invoice['type'];
    amount: number;
    dueDate: Date;
    referenceId?: string;
  }): Promise<Invoice> {
    const response = await this.client.post('/invoices', invoice);
    return response.data;
  }

  /**
   * Get invoices
   */
  async getInvoices(
    merchantId: string,
    params?: {
      status?: string;
      type?: string;
      limit?: number;
    }
  ): Promise<Invoice[]> {
    const response = await this.client.get(`/merchants/${merchantId}/invoices`, { params });
    return response.data.invoices || response.data;
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    invoiceId: string,
    status: Invoice['status'],
    paidAmount?: number
  ): Promise<Invoice> {
    const response = await this.client.patch(`/invoices/${invoiceId}`, {
      status,
      paidAmount,
      paidAt: status === 'paid' ? new Date() : undefined,
    });
    return response.data;
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(merchantId: string): Promise<{
    totalDisbursed: number;
    totalRepaid: number;
    totalOutstanding: number;
    pendingInvoices: number;
    overdueInvoices: number;
  }> {
    const response = await this.client.get(`/merchants/${merchantId}/summary`);
    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'ok' || response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Singleton instance
let financeClient: FinanceClient | null = null;

export function getFinanceClient(): FinanceClient {
  if (!financeClient) {
    financeClient = new FinanceClient();
  }
  return financeClient;
}

export default FinanceClient;
