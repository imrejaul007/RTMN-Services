/**
 * RTMN Finance API Service
 *
 * Integration with RTMN Finance for:
 * - Corporate wallet management
 * - BNPL (Buy Now Pay Later)
 * - Expense cards
 * - Corporate credit
 * - Payment processing
 */

import { apiClient } from './apiClient';

// Types
export interface CorpWallet {
  walletId: string;
  companyId: string;
  companyName: string;
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  status: 'active' | 'suspended' | 'closed';
  features: {
    payments: boolean;
    collections: boolean;
    payroll: boolean;
    bnpl: boolean;
    expenseCards: boolean;
  };
  limits: {
    dailyLimit: number;
    monthlyLimit: number;
    perTransactionLimit: number;
  };
  bankDetails: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    ifscCode: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCard {
  _id: string;
  cardId: string;
  cardNumber: string;
  cardType: 'virtual' | 'physical';
  status: 'active' | 'blocked' | 'expired';
  employee: {
    employeeId: string;
    name: string;
    email: string;
  };
  limits: {
    dailyLimit: number;
    monthlyLimit: number;
    perTransactionLimit: number;
  };
  spent: {
    daily: number;
    monthly: number;
    total: number;
  };
  expiryMonth: number;
  expiryYear: number;
  createdAt: string;
}

export interface BNPLPlan {
  planId: string;
  name: string;
  description: string;
  tenure: number; // days
  interestRate: number; // percentage
  processingFee: number; // percentage
  minAmount: number;
  maxAmount: number;
  eligible: boolean;
  features: string[];
}

export interface BNPLTransaction {
  _id: string;
  transactionId: string;
  reference: string;
  amount: number;
  tenure: number;
  emiAmount: number;
  totalAmount: number;
  interestAmount: number;
  processingFee: number;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'defaulted';
  startDate: string;
  nextPaymentDate: string;
  endDate: string;
  payments: Array<{
    paymentId: string;
    amount: number;
    dueDate: string;
    paidDate?: string;
    status: 'pending' | 'paid' | 'overdue';
    method?: string;
  }>;
  invoiceId?: string;
  createdAt: string;
}

export interface ExpenseClaim {
  _id: string;
  claimId: string;
  claimNumber: string;
  employee: {
    employeeId: string;
    name: string;
    department: string;
  };
  type: 'travel' | 'meal' | 'accommodation' | 'client_entertainment' | 'office' | 'other';
  amount: number;
  currency: string;
  description: string;
  category: string;
  costCenter: string;
  merchant: {
    name: string;
    gstIn?: string;
  };
  expenseDate: string;
  receipt?: {
    url: string;
    verified: boolean;
  };
  gst?: {
    invoiceNumber: string;
    itcEligible: boolean;
    itcAmount: number;
  };
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  approval?: {
    approvedBy: string;
    approvedAt: string;
    notes?: string;
  };
  payment?: {
    method: 'wallet' | 'bank_transfer' | 'card';
    reference: string;
    paidAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  purpose: string;
  reference?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  transactionId: string;
  status: 'success' | 'pending' | 'failed';
  amount: number;
  currency: string;
  reference: string;
  gatewayTransactionId?: string;
  paymentMethod?: string;
  createdAt: string;
}

// Helper
function getCompanyId(): string {
  return 'demo-company';
}

// RTMN Finance API Service
export const rtmnFinanceApi = {
  // ========== Wallet ==========

  /**
   * Get corporate wallet details
   */
  async getWallet(): Promise<CorpWallet | null> {
    const response = await apiClient.get<{ data: CorpWallet }>('/api/finance/wallet', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || null;
  },

  /**
   * Add funds to wallet
   */
  async addFunds(
    amount: number,
    paymentMethod: 'upi' | 'netbanking' | 'neft' | 'rtgs'
  ): Promise<PaymentResult> {
    const response = await apiClient.post<{ data: PaymentResult }>(
      '/api/finance/wallet/deposit',
      { amount, paymentMethod },
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to add funds');
    }
    return response.data!.data;
  },

  /**
   * Withdraw funds from wallet
   */
  async withdrawFunds(amount: number): Promise<PaymentResult> {
    const response = await apiClient.post<{ data: PaymentResult }>(
      '/api/finance/wallet/withdraw',
      { amount },
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to withdraw funds');
    }
    return response.data!.data;
  },

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(params?: {
    startDate?: string;
    endDate?: string;
    type?: 'credit' | 'debit' | 'all';
    page?: number;
    limit?: number;
  }): Promise<{
    data: Array<{
      transactionId: string;
      type: 'credit' | 'debit';
      amount: number;
      balance: number;
      description: string;
      reference: string;
      category: string;
      createdAt: string;
    }>;
    pagination: { total: number; page: number; limit: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.type) queryParams.set('type', params.type);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 50));

    const response = await apiClient.get<{
      data: Array<{
        transactionId: string;
        type: 'credit' | 'debit';
        amount: number;
        balance: number;
        description: string;
        reference: string;
        category: string;
        createdAt: string;
      }>;
      pagination: { total: number; page: number; limit: number };
    }>(`/api/finance/wallet/transactions?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 50 },
    };
  },

  // ========== Expense Cards ==========

  /**
   * Get expense cards
   */
  async getExpenseCards(params?: {
    employeeId?: string;
    status?: ExpenseCard['status'];
  }): Promise<ExpenseCard[]> {
    const queryParams = new URLSearchParams();
    if (params?.employeeId) queryParams.set('employeeId', params.employeeId);
    if (params?.status) queryParams.set('status', params.status);

    const response = await apiClient.get<{ data: ExpenseCard[] }>(
      `/api/finance/cards?${queryParams}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  /**
   * Issue new expense card
   */
  async issueExpenseCard(data: {
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    cardType: 'virtual' | 'physical';
    limits?: {
      dailyLimit?: number;
      monthlyLimit?: number;
      perTransactionLimit?: number;
    };
  }): Promise<ExpenseCard> {
    const response = await apiClient.post<{ data: ExpenseCard }>('/api/finance/cards', data, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to issue card');
    }
    return response.data!.data;
  },

  /**
   * Block/unblock expense card
   */
  async updateCardStatus(cardId: string, status: 'active' | 'blocked'): Promise<void> {
    const response = await apiClient.post(
      `/api/finance/cards/${cardId}/status`,
      { status },
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to update card');
    }
  },

  /**
   * Update card limits
   */
  async updateCardLimits(
    cardId: string,
    limits: {
      dailyLimit?: number;
      monthlyLimit?: number;
      perTransactionLimit?: number;
    }
  ): Promise<void> {
    const response = await apiClient.put(`/api/finance/cards/${cardId}/limits`, limits, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to update limits');
    }
  },

  /**
   * Get card transactions
   */
  async getCardTransactions(cardId: string): Promise<
    Array<{
      transactionId: string;
      merchant: string;
      amount: number;
      category: string;
      status: 'pending' | 'completed' | 'declined';
      date: string;
    }>
  > {
    const response = await apiClient.get<{
      data: Array<{
        transactionId: string;
        merchant: string;
        amount: number;
        category: string;
        status: 'pending' | 'completed' | 'declined';
        date: string;
      }>;
    }>(`/api/finance/cards/${cardId}/transactions`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || [];
  },

  // ========== BNPL ==========

  /**
   * Get available BNPL plans
   */
  async getBNPLPlans(): Promise<BNPLPlan[]> {
    const response = await apiClient.get<{ data: BNPLPlan[] }>('/api/finance/bnpl/plans', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || [];
  },

  /**
   * Create BNPL transaction
   */
  async createBNPLTransaction(data: {
    amount: number;
    planId: string;
    invoiceId?: string;
    description?: string;
  }): Promise<BNPLTransaction> {
    const response = await apiClient.post<{ data: BNPLTransaction }>(
      '/api/finance/bnpl/transactions',
      data,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to create BNPL');
    }
    return response.data!.data;
  },

  /**
   * Get BNPL transactions
   */
  async getBNPLTransactions(params?: {
    status?: BNPLTransaction['status'];
    page?: number;
    limit?: number;
  }): Promise<{
    data: BNPLTransaction[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 20));

    const response = await apiClient.get<{
      data: BNPLTransaction[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/finance/bnpl/transactions?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  /**
   * Make BNPL payment
   */
  async payBNPLEMI(transactionId: string, paymentId: string): Promise<PaymentResult> {
    const response = await apiClient.post<{ data: PaymentResult }>(
      `/api/finance/bnpl/transactions/${transactionId}/pay`,
      { paymentId },
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to make payment');
    }
    return response.data!.data;
  },

  // ========== Expense Claims ==========

  /**
   * Get expense claims
   */
  async getExpenseClaims(params?: {
    employeeId?: string;
    status?: ExpenseClaim['status'];
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: ExpenseClaim[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.employeeId) queryParams.set('employeeId', params.employeeId);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 20));

    const response = await apiClient.get<{
      data: ExpenseClaim[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/finance/expenses/claims?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  /**
   * Submit expense claim
   */
  async submitExpenseClaim(data: {
    employeeId: string;
    type: ExpenseClaim['type'];
    amount: number;
    description: string;
    category: string;
    costCenter: string;
    merchantName: string;
    merchantGstIn?: string;
    expenseDate: string;
    receiptUrl?: string;
    invoiceNumber?: string;
  }): Promise<ExpenseClaim> {
    const response = await apiClient.post<{ data: ExpenseClaim }>(
      '/api/finance/expenses/claims',
      data,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to submit claim');
    }
    return response.data!.data;
  },

  /**
   * Approve expense claim
   */
  async approveExpenseClaim(claimId: string, notes?: string): Promise<void> {
    const response = await apiClient.post(
      `/api/finance/expenses/claims/${claimId}/approve`,
      { notes },
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to approve claim');
    }
  },

  /**
   * Reject expense claim
   */
  async rejectExpenseClaim(claimId: string, reason: string): Promise<void> {
    const response = await apiClient.post(
      `/api/finance/expenses/claims/${claimId}/reject`,
      { reason },
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to reject claim');
    }
  },

  /**
   * Pay expense claim
   */
  async payExpenseClaim(
    claimId: string,
    method: 'wallet' | 'bank_transfer' | 'card'
  ): Promise<PaymentResult> {
    const response = await apiClient.post<{ data: PaymentResult }>(
      `/api/finance/expenses/claims/${claimId}/pay`,
      { method },
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to pay claim');
    }
    return response.data!.data;
  },

  // ========== Payments ==========

  /**
   * Process payment
   */
  async processPayment(data: PaymentRequest): Promise<PaymentResult> {
    const response = await apiClient.post<{ data: PaymentResult }>('/api/finance/payments', data as unknown as Record<string, unknown>, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to process payment');
    }
    return response.data!.data;
  },

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentResult | null> {
    const response = await apiClient.get<{ data: PaymentResult }>(
      `/api/finance/payments/${transactionId}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || null;
  },

  // ========== Analytics ==========

  /**
   * Get finance dashboard data
   */
  async getDashboard(): Promise<{
    wallet: {
      balance: number;
      pendingBalance: number;
      todaySpend: number;
      monthSpend: number;
    };
    cards: {
      totalCards: number;
      activeCards: number;
      totalSpent: number;
      monthSpent: number;
    };
    bnpl: {
      activePlans: number;
      totalOutstanding: number;
      overdueAmount: number;
    };
    expenses: {
      pendingClaims: number;
      pendingAmount: number;
      approvedThisMonth: number;
    };
  }> {
    const response = await apiClient.get<{
      data: {
        wallet: { balance: number; pendingBalance: number; todaySpend: number; monthSpend: number };
        cards: { totalCards: number; activeCards: number; totalSpent: number; monthSpent: number };
        bnpl: { activePlans: number; totalOutstanding: number; overdueAmount: number };
        expenses: { pendingClaims: number; pendingAmount: number; approvedThisMonth: number };
      };
    }>('/api/finance/dashboard', { headers: { 'x-company-id': getCompanyId() } });
    return (
      response.data?.data || {
        wallet: { balance: 0, pendingBalance: 0, todaySpend: 0, monthSpend: 0 },
        cards: { totalCards: 0, activeCards: 0, totalSpent: 0, monthSpent: 0 },
        bnpl: { activePlans: 0, totalOutstanding: 0, overdueAmount: 0 },
        expenses: { pendingClaims: 0, pendingAmount: 0, approvedThisMonth: 0 },
      }
    );
  },
};

export default rtmnFinanceApi;
