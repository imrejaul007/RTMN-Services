/**
 * SUTAR Economy OS - Payment Service
 * Layer 10: Payment methods, processing, and refunds
 */

import { v4 as uuidv4 } from 'uuid';
import { balanceService } from './balance.service.js';

// ============================================
// Types
// ============================================

export type PaymentMethod = 'card' | 'bank_transfer' | 'wallet' | 'crypto' | 'escrow';
export type PaymentProvider = 'stripe' | 'paypal' | 'square' | 'internal';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface PaymentMethodInfo {
  methodId: string;
  entityId: string;
  type: PaymentMethod;
  provider: PaymentProvider;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  isVerified: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  paymentId: string;
  entityId: string;
  amount: number;
  currency: string;
  methodId?: string;
  methodType: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  referenceId?: string;
  referenceType?: 'invoice' | 'earning' | 'escrow' | 'manual';
  description?: string;
  providerTransactionId?: string;
  failureReason?: string;
  refundedAmount: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface RefundRecord {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt?: Date;
  createdAt: Date;
}

// ============================================
// In-Memory Storage
// ============================================

interface PaymentMethodStore {
  [methodId: string]: PaymentMethodInfo;
}

interface PaymentStore {
  [paymentId: string]: PaymentRecord;
}

interface RefundStore {
  [refundId: string]: RefundRecord;
}

const paymentMethodStore: PaymentMethodStore = {};
const paymentStore: PaymentStore = {};
const refundStore: RefundStore = {};

// ============================================
// Payment Service Class
// ============================================

export class PaymentService {
  /**
   * Add payment method
   */
  async addPaymentMethod(request: {
    entityId: string;
    type: PaymentMethod;
    provider: PaymentProvider;
    last4?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentMethodInfo> {
    const {
      entityId,
      type,
      provider,
      last4,
      expiryMonth,
      expiryYear,
      isDefault = false,
      metadata
    } = request;

    // If setting as default, unset other defaults
    if (isDefault) {
      for (const method of Object.values(paymentMethodStore)) {
        if (method.entityId === entityId && method.isDefault) {
          method.isDefault = false;
          paymentMethodStore[method.methodId] = method;
        }
      }
    }

    const method: PaymentMethodInfo = {
      methodId: uuidv4(),
      entityId,
      type,
      provider,
      last4,
      expiryMonth,
      expiryYear,
      isDefault,
      isVerified: false,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    paymentMethodStore[method.methodId] = method;
    return method;
  }

  /**
   * Get payment methods for entity
   */
  async getPaymentMethods(entityId: string): Promise<PaymentMethodInfo[]> {
    return Object.values(paymentMethodStore)
      .filter(m => m.entityId === entityId)
      .sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  /**
   * Get default payment method
   */
  async getDefaultPaymentMethod(entityId: string): Promise<PaymentMethodInfo | null> {
    return Object.values(paymentMethodStore)
      .find(m => m.entityId === entityId && m.isDefault) || null;
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(entityId: string, methodId: string): Promise<PaymentMethodInfo | null> {
    const method = paymentMethodStore[methodId];
    if (!method || method.entityId !== entityId) {
      return null;
    }

    // Unset other defaults
    for (const m of Object.values(paymentMethodStore)) {
      if (m.entityId === entityId && m.isDefault) {
        m.isDefault = false;
        paymentMethodStore[m.methodId] = m;
      }
    }

    method.isDefault = true;
    method.updatedAt = new Date();
    paymentMethodStore[methodId] = method;

    return method;
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(entityId: string, methodId: string): Promise<boolean> {
    const method = paymentMethodStore[methodId];
    if (!method || method.entityId !== entityId) {
      return false;
    }

    delete paymentMethodStore[methodId];
    return true;
  }

  /**
   * Process payment
   */
  async processPayment(request: {
    entityId: string;
    amount: number;
    currency?: string;
    methodId?: string;
    referenceId?: string;
    referenceType?: 'invoice' | 'earning' | 'escrow' | 'manual';
    description?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentRecord> {
    const {
      entityId,
      amount,
      currency = 'USD',
      methodId,
      referenceId,
      referenceType,
      description,
      metadata
    } = request;

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Get payment method info
    let methodType: PaymentMethod = 'wallet';
    let provider: PaymentProvider = 'internal';
    let method: PaymentMethodInfo | null = null;

    if (methodId) {
      method = paymentMethodStore[methodId];
      if (method) {
        methodType = method.type;
        provider = method.provider;
      }
    }

    const payment: PaymentRecord = {
      paymentId: uuidv4(),
      entityId,
      amount,
      currency,
      methodId,
      methodType,
      provider,
      status: 'pending',
      referenceId,
      referenceType,
      description,
      refundedAmount: 0,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    paymentStore[payment.paymentId] = payment;

    // Simulate payment processing
    try {
      payment.status = 'processing';
      paymentStore[payment.paymentId] = payment;

      // In production, this would call the payment provider
      // For now, simulate success
      const success = await this.simulatePaymentProvider(payment);

      if (success) {
        payment.status = 'completed';
        payment.completedAt = new Date();

        // Add funds to balance
        await balanceService.addFunds(entityId, 'user', amount, currency);
      } else {
        payment.status = 'failed';
        payment.failureReason = 'Payment provider declined';
      }
    } catch (error) {
      payment.status = 'failed';
      payment.failureReason = error instanceof Error ? error.message : 'Unknown error';
    }

    payment.updatedAt = new Date();
    paymentStore[payment.paymentId] = payment;

    return payment;
  }

  /**
   * Simulate payment provider (placeholder)
   */
  private async simulatePaymentProvider(_payment: PaymentRecord): Promise<boolean> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    // 95% success rate for simulation
    return Math.random() > 0.05;
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<PaymentRecord | null> {
    return paymentStore[paymentId] || null;
  }

  /**
   * Get payments for entity
   */
  async getPayments(
    entityId: string,
    options: {
      page?: number;
      limit?: number;
      status?: PaymentStatus;
      methodType?: PaymentMethod;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    payments: PaymentRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, status, methodType, startDate, endDate } = options;

    let payments = Object.values(paymentStore)
      .filter(p => p.entityId === entityId)
      .filter(p => !status || p.status === status)
      .filter(p => !methodType || p.methodType === methodType)
      .filter(p => !startDate || p.createdAt >= startDate)
      .filter(p => !endDate || p.createdAt <= endDate)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = payments.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    payments = payments.slice(startIndex, startIndex + limit);

    return {
      payments,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Initiate refund
   */
  async initiateRefund(request: {
    paymentId: string;
    amount?: number;
    reason: string;
  }): Promise<RefundRecord> {
    const { paymentId, amount, reason } = request;

    const payment = paymentStore[paymentId];
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new Error('Can only refund completed payments');
    }

    const refundAmount = amount || payment.amount - payment.refundedAmount;
    if (refundAmount > payment.amount - payment.refundedAmount) {
      throw new Error('Refund amount exceeds remaining refundable amount');
    }

    const refund: RefundRecord = {
      refundId: uuidv4(),
      paymentId,
      amount: refundAmount,
      currency: payment.currency,
      reason,
      status: 'pending',
      createdAt: new Date()
    };

    refundStore[refund.refundId] = refund;

    // Simulate refund processing
    try {
      const success = await this.simulateRefundProvider(refund);
      if (success) {
        refund.status = 'completed';
        refund.processedAt = new Date();

        // Update payment record
        payment.refundedAmount += refundAmount;
        if (payment.refundedAmount >= payment.amount) {
          payment.status = 'refunded';
        }
        payment.updatedAt = new Date();
        paymentStore[paymentId] = payment;

        // Deduct from balance
        await balanceService.deductFunds(payment.entityId, refundAmount, payment.currency);
      } else {
        refund.status = 'failed';
      }
    } catch (error) {
      refund.status = 'failed';
    }

    refundStore[refund.refundId] = refund;
    return refund;
  }

  /**
   * Simulate refund provider (placeholder)
   */
  private async simulateRefundProvider(_refund: RefundRecord): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return Math.random() > 0.1;
  }

  /**
   * Get refund by ID
   */
  async getRefund(refundId: string): Promise<RefundRecord | null> {
    return refundStore[refundId] || null;
  }

  /**
   * Get refunds for payment
   */
  async getRefundsForPayment(paymentId: string): Promise<RefundRecord[]> {
    return Object.values(refundStore).filter(r => r.paymentId === paymentId);
  }

  /**
   * Cancel payment
   */
  async cancelPayment(paymentId: string, reason: string): Promise<PaymentRecord | null> {
    const payment = paymentStore[paymentId];
    if (!payment) {
      return null;
    }

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      throw new Error('Can only cancel pending or processing payments');
    }

    payment.status = 'cancelled';
    payment.failureReason = reason;
    payment.updatedAt = new Date();
    paymentStore[paymentId] = payment;

    return payment;
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(
    entityId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    successfulAmount: number;
    failedPayments: number;
    refundedPayments: number;
    refundedAmount: number;
    averagePaymentAmount: number;
    byMethod: Record<PaymentMethod, { count: number; amount: number }>;
    byStatus: Record<PaymentStatus, { count: number; amount: number }>;
  }> {
    const payments = Object.values(paymentStore)
      .filter(p => p.entityId === entityId)
      .filter(p => p.createdAt >= periodStart && p.createdAt <= periodEnd);

    const stats = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      successfulPayments: payments.filter(p => p.status === 'completed').length,
      successfulAmount: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
      failedPayments: payments.filter(p => p.status === 'failed').length,
      refundedPayments: payments.filter(p => p.status === 'refunded').length,
      refundedAmount: payments.reduce((sum, p) => sum + p.refundedAmount, 0),
      averagePaymentAmount: 0,
      byMethod: {} as Record<PaymentMethod, { count: number; amount: number }>,
      byStatus: {} as Record<PaymentStatus, { count: number; amount: number }>
    };

    if (stats.successfulPayments > 0) {
      stats.averagePaymentAmount = stats.successfulAmount / stats.successfulPayments;
    }

    // By method
    const methods: PaymentMethod[] = ['card', 'bank_transfer', 'wallet', 'crypto', 'escrow'];
    for (const method of methods) {
      const methodPayments = payments.filter(p => p.methodType === method && p.status === 'completed');
      stats.byMethod[method] = {
        count: methodPayments.length,
        amount: methodPayments.reduce((sum, p) => sum + p.amount, 0)
      };
    }

    // By status
    const statuses: PaymentStatus[] = ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'];
    for (const status of statuses) {
      const statusPayments = payments.filter(p => p.status === status);
      stats.byStatus[status] = {
        count: statusPayments.length,
        amount: statusPayments.reduce((sum, p) => sum + p.amount, 0)
      };
    }

    return stats;
  }

  /**
   * Verify payment method
   */
  async verifyPaymentMethod(methodId: string, verificationData: Record<string, unknown>): Promise<boolean> {
    const method = paymentMethodStore[methodId];
    if (!method) {
      return false;
    }

    // In production, this would verify with the payment provider
    // For simulation, just mark as verified
    method.isVerified = true;
    method.metadata = {
      ...method.metadata,
      verifiedAt: new Date().toISOString(),
      verificationData
    };
    method.updatedAt = new Date();
    paymentMethodStore[methodId] = method;

    return true;
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): Array<{ type: PaymentMethod; provider: PaymentProvider; description: string }> {
    return [
      { type: 'card', provider: 'stripe', description: 'Credit/Debit Card via Stripe' },
      { type: 'card', provider: 'square', description: 'Credit/Debit Card via Square' },
      { type: 'bank_transfer', provider: 'stripe', description: 'Bank Transfer via Stripe' },
      { type: 'wallet', provider: 'internal', description: 'Platform Wallet' },
      { type: 'crypto', provider: 'internal', description: 'Cryptocurrency' },
      { type: 'escrow', provider: 'internal', description: 'Escrow Payment' }
    ];
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
