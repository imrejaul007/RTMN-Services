// ============================================================================
// SUTAR Marketplace - Payment Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { storage, COLLECTIONS } from './storage';
import { economyOS } from './economyOS';
import { orderService } from './orderService';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentMethodInfo,
} from './types';

export interface ProcessPaymentInput {
  orderId: string;
  userId: string;
  method: PaymentMethod;
  provider?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundInput {
  paymentId: string;
  amount?: number;
  reason: string;
}

export class PaymentService {
  // Process payment for an order
  public async processPayment(input: ProcessPaymentInput): Promise<{
    success: boolean;
    payment?: Payment;
    error?: string;
  }> {
    const order = orderService.getOrder(input.orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.paymentStatus === 'completed') {
      return { success: false, error: 'Order is already paid' };
    }

    if (order.status === 'cancelled') {
      return { success: false, error: 'Order is cancelled' };
    }

    // Update order status
    orderService.updateOrderStatus(order.id, 'processing');
    orderService.updatePaymentStatus(order.id, 'processing');

    // Create payment record
    const payment: Payment = {
      id: `pay-${uuidv4()}`,
      orderId: order.id,
      transactionId: `txn-${uuidv4()}`,
      userId: input.userId,
      amount: order.total,
      currency: order.currency,
      method: input.method,
      status: 'processing',
      provider: input.provider || this.getProviderForMethod(input.method),
      metadata: input.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.create(COLLECTIONS.PAYMENTS, payment);

    try {
      // Process payment through Economy OS
      const result = await economyOS.processPayment(
        input.userId,
        order.total,
        order.id,
        `Payment for order ${order.orderNumber}`
      );

      if (result.success) {
        // Update payment record
        this.updatePayment(payment.id, {
          status: 'completed',
          providerTransactionId: result.transactionId,
          completedAt: new Date().toISOString(),
        });

        // Update order
        orderService.updatePaymentStatus(order.id, 'completed');
        orderService.updateOrderStatus(order.id, 'completed');

        console.log(`[PAYMENT] Payment completed: ${payment.id} for order ${order.id}`);
        return { success: true, payment: this.getPayment(payment.id) };
      } else {
        // Payment failed
        this.updatePayment(payment.id, {
          status: 'failed',
          failureReason: result.error,
        });

        orderService.updatePaymentStatus(order.id, 'failed');
        orderService.updateOrderStatus(order.id, 'pending');

        console.log(`[PAYMENT] Payment failed: ${payment.id} - ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      // Handle error
      this.updatePayment(payment.id, {
        status: 'failed',
        failureReason: (error as Error).message,
      });

      orderService.updatePaymentStatus(order.id, 'failed');
      orderService.updateOrderStatus(order.id, 'pending');

      console.error(`[PAYMENT] Payment error: ${payment.id} -`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Get payment by ID
  public getPayment(id: string): Payment | undefined {
    return storage.get<Payment>(COLLECTIONS.PAYMENTS, id);
  }

  // Get payment by transaction ID
  public getPaymentByTransaction(transactionId: string): Payment | undefined {
    return storage.findOne<Payment>(
      COLLECTIONS.PAYMENTS,
      p => p.transactionId === transactionId
    );
  }

  // Get payments for order
  public getPaymentsForOrder(orderId: string): Payment[] {
    return storage.find<Payment>(
      COLLECTIONS.PAYMENTS,
      p => p.orderId === orderId
    );
  }

  // Get payments by user
  public getPaymentsByUser(userId: string, params: {
    status?: PaymentStatus;
    limit?: number;
    offset?: number;
  } = {}): { payments: Payment[]; total: number } {
    const { status, limit = 50, offset = 0 } = params;
    let payments = storage.find<Payment>(
      COLLECTIONS.PAYMENTS,
      p => p.userId === userId
    );

    if (status) {
      payments = payments.filter(p => p.status === status);
    }

    payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      payments: payments.slice(offset, offset + limit),
      total: payments.length,
    };
  }

  // Update payment
  public updatePayment(id: string, updates: Partial<Payment>): Payment | undefined {
    const payment = this.getPayment(id);
    if (!payment) return undefined;

    const updated: Payment = {
      ...payment,
      ...updates,
      id: payment.id,
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      createdAt: payment.createdAt,
      updatedAt: new Date().toISOString(),
    };

    storage.update(COLLECTIONS.PAYMENTS, id, updated);
    return updated;
  }

  // Process refund
  public async processRefund(input: RefundInput): Promise<{
    success: boolean;
    payment?: Payment;
    error?: string;
  }> {
    const payment = this.getPayment(input.paymentId);
    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    if (payment.status !== 'completed') {
      return { success: false, error: 'Can only refund completed payments' };
    }

    const refundAmount = input.amount || payment.amount;

    if (refundAmount > payment.amount - (payment.refundAmount || 0)) {
      return { success: false, error: 'Refund amount exceeds available balance' };
    }

    try {
      const result = await economyOS.processRefund(
        payment.userId,
        refundAmount,
        payment.orderId,
        input.reason
      );

      if (result.success) {
        const newRefundAmount = (payment.refundAmount || 0) + refundAmount;
        const isFullyRefunded = newRefundAmount >= payment.amount;

        this.updatePayment(payment.id, {
          status: isFullyRefunded ? 'refunded' : 'partially_refunded',
          refundAmount: newRefundAmount,
          refundReason: input.reason,
          providerResponse: { refundTransactionId: result.transactionId },
        });

        // Update order
        const order = orderService.getOrder(payment.orderId);
        if (order) {
          orderService.updatePaymentStatus(order.id, isFullyRefunded ? 'refunded' : 'partially_refunded');
        }

        console.log(`[PAYMENT] Refund processed: ${refundAmount} for payment ${payment.id}`);
        return { success: true, payment: this.getPayment(payment.id) };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`[PAYMENT] Refund error:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Verify payment
  public async verifyPayment(transactionId: string): Promise<{
    valid: boolean;
    payment?: Payment;
  }> {
    const payment = this.getPaymentByTransaction(transactionId);
    if (!payment) {
      return { valid: false };
    }

    const result = await economyOS.verifyPayment(transactionId);
    return {
      valid: result.valid,
      payment,
    };
  }

  // Get payment statistics
  public getPaymentStatistics(params: {
    startDate?: string;
    endDate?: string;
  } = {}): {
    totalPayments: number;
    completedPayments: number;
    failedPayments: number;
    refundedPayments: number;
    totalVolume: number;
    averagePaymentValue: number;
  } {
    let payments = storage.getAll<Payment>(COLLECTIONS.PAYMENTS);

    if (params.startDate) {
      payments = payments.filter(p => new Date(p.createdAt) >= new Date(params.startDate!));
    }

    if (params.endDate) {
      payments = payments.filter(p => new Date(p.createdAt) <= new Date(params.endDate!));
    }

    const completedPayments = payments.filter(p => p.status === 'completed');
    const failedPayments = payments.filter(p => p.status === 'failed');
    const refundedPayments = payments.filter(p => p.status === 'refunded' || p.status === 'partially_refunded');
    const totalVolume = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const averagePaymentValue = completedPayments.length > 0
      ? totalVolume / completedPayments.length
      : 0;

    return {
      totalPayments: payments.length,
      completedPayments: completedPayments.length,
      failedPayments: failedPayments.length,
      refundedPayments: refundedPayments.length,
      totalVolume,
      averagePaymentValue: Math.round(averagePaymentValue * 100) / 100,
    };
  }

  // Get payment methods
  public getAvailablePaymentMethods(): {
    method: PaymentMethod;
    name: string;
    icon: string;
    enabled: boolean;
  }[] {
    return [
      { method: 'card', name: 'Credit/Debit Card', icon: 'credit-card', enabled: true },
      { method: 'upi', name: 'UPI', icon: 'smartphone', enabled: true },
      { method: 'netbanking', name: 'Net Banking', icon: 'globe', enabled: true },
      { method: 'wallet', name: 'Digital Wallet', icon: 'wallet', enabled: true },
      { method: 'bank_transfer', name: 'Bank Transfer', icon: 'building', enabled: true },
      { method: 'crypto', name: 'Cryptocurrency', icon: 'bitcoin', enabled: false },
    ];
  }

  // Get provider for payment method
  private getProviderForMethod(method: PaymentMethod): string {
    const providers: Record<PaymentMethod, string> = {
      card: 'Razorpay',
      upi: 'Razorpay',
      netbanking: 'Razorpay',
      wallet: 'Razorpay',
      bank_transfer: 'Bank',
      crypto: 'Crypto',
    };
    return providers[method] || 'Unknown';
  }

  // Store payment method for user
  public storePaymentMethod(userId: string, methodInfo: PaymentMethodInfo): PaymentMethodInfo {
    const key = `payment_method_${userId}_${methodInfo.type}`;
    storage.create(key, { ...methodInfo, userId, storedAt: new Date().toISOString() });
    return methodInfo;
  }

  // Get stored payment methods for user
  public getStoredPaymentMethods(userId: string): PaymentMethodInfo[] {
    const keys = Array.from(storage.getAll<any>(COLLECTIONS.PAYMENTS))
      .filter(p => p.userId === userId && p.storedAt)
      .map(p => ({
        type: p.type,
        last4: p.last4,
        brand: p.brand,
        expiryMonth: p.expiryMonth,
        expiryYear: p.expiryYear,
        bankName: p.bankName,
        walletName: p.walletName,
      }));

    // Deduplicate
    const unique = new Map<string, PaymentMethodInfo>();
    keys.forEach(m => unique.set(m.type, m));
    return Array.from(unique.values());
  }

  // Validate payment
  public validatePayment(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.orderId) {
      errors.push('Order ID is required');
    }

    if (!data.userId) {
      errors.push('User ID is required');
    }

    if (!data.method) {
      errors.push('Payment method is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
export const paymentService = new PaymentService();