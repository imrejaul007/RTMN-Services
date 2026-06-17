/**
 * SUTAR Escrow Payment Service
 * Secure payments for Exhibition OS
 */

import axios, { AxiosInstance } from 'axios';

// ============================================
// CONFIGURATION
// ============================================

const SUTAR_URL = process.env.EXPO_PUBLIC_SUTAR_ESCROW_URL || 'http://localhost:4149';
const EXHIBITION_GATEWAY = process.env.EXPO_PUBLIC_EXHIBITION_GATEWAY_URL || 'http://localhost:5040';

// ============================================
// TYPES
// ============================================

export interface PaymentIntent {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  payment_method: 'upi' | 'card' | 'netbanking' | 'wallet';
  created_at: string;
}

export interface EscrowHold {
  id: string;
  exhibitor_id: string;
  amount: number;
  status: 'held' | 'released' | 'refunded';
  held_at: string;
  released_at?: string;
}

export interface Refund {
  id: string;
  original_payment_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  type: 'upi' | 'card' | 'netbanking' | 'wallet';
  name: string;
  icon: string;
  enabled: boolean;
}

// ============================================
// PAYMENT CLIENT
// ============================================

class SUTARPayment {
  private client: AxiosInstance;
  private gatewayClient: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: SUTAR_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.gatewayClient = axios.create({
      baseURL: EXHIBITION_GATEWAY,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ============================================
  // PAYMENT INTENT
  // ============================================

  async createPaymentIntent(params: {
    exhibition_id: string;
    ticket_type: 'general' | 'vip' | 'press';
    amount: number;
    currency?: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    metadata?: Record<string, string>;
  }): Promise<{
    payment_id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
    checkout_url?: string;
    upi_qr?: string;
    expires_at: string;
  }> {
    const { data } = await this.gatewayClient.post('/api/payments/intent', {
      type: 'ticket',
      exhibition_id: params.exhibition_id,
      payer_id: params.customer_email,
      amount: params.amount,
      currency: params.currency || 'INR',
      metadata: {
        ticket_type: params.ticket_type,
        customer_name: params.customer_name,
        customer_email: params.customer_email,
        customer_phone: params.customer_phone,
        ...params.metadata,
      },
    });

    return {
      payment_id: data.payment_id,
      order_id: data.razorpay?.order_id || data.payment_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      checkout_url: data.razorpay?.checkout_url,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  // ============================================
  // PAYMENT CONFIRMATION
  // ============================================

  async confirmPayment(paymentId: string, confirmation: {
    gateway_txn_id: string;
    utr?: string;
    payment_method: string;
  }): Promise<{
    success: boolean;
    ticket: {
      id: string;
      ticket_id: string;
      qr_data: string;
    };
  }> {
    const { data } = await this.gatewayClient.post(`/api/payments/${paymentId}/confirm`, {
      gateway_txn_id: confirmation.gateway_txn_id,
      utr: confirmation.utr,
      method: confirmation.payment_method,
    });

    return {
      success: data.status === 'completed',
      ticket: data.entity_id ? {
        id: data.entity_id,
        ticket_id: `TKT-${data.entity_id}`,
        qr_data: JSON.stringify({
          ticket_id: data.entity_id,
          timestamp: new Date().toISOString(),
        }),
      } : null,
    };
  }

  // ============================================
  // UPI PAYMENTS
  // ============================================

  async initiateUPIPayment(params: {
    exhibition_id: string;
    amount: number;
    customer_phone: string;
    customer_name: string;
  }): Promise<{
    upi_id: string;
    amount: number;
    qr_data?: string;
    deep_link?: string;
    expires_in: number;
  }> {
    // Generate UPI payment request
    const upiId = `exhibition@rtmn`;
    const amount = params.amount;

    return {
      upi_id: upiId,
      amount,
      qr_data: `upi://pay?pa=${upiId}&pn=Exhibition%20OS&am=${amount}&cu=INR`,
      deep_link: `upi://pay?pa=${upiId}&pn=Exhibition%20OS&am=${amount}&cu=INR`,
      expires_in: 30 * 60, // 30 minutes
    };
  }

  async verifyUPIPayment(utr: string): Promise<{
    valid: boolean;
    status: 'pending' | 'success' | 'failed';
    amount?: number;
    timestamp?: string;
  }> {
    // In production, verify with UPI gateway
    // For now, simulate verification
    return {
      valid: true,
      status: 'success',
      amount: 499,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // EXHIBITOR FEES (ESCROW)
  // ============================================

  async createExhibitorFeePayment(params: {
    exhibition_id: string;
    exhibitor_id: string;
    booth_size: 'small' | 'medium' | 'large' | 'premium';
    amount: number;
  }): Promise<{
    payment_id: string;
    escrow_hold_id: string;
    amount: number;
    status: string;
  }> {
    const { data } = await this.gatewayClient.post('/api/payments/intent', {
      type: 'exhibitor_fee',
      exhibition_id: params.exhibition_id,
      entity_id: params.exhibitor_id,
      payer_id: params.exhibitor_id,
      amount: params.amount,
      metadata: {
        booth_size: params.booth_size,
      },
    });

    return {
      payment_id: data.payment_id,
      escrow_hold_id: `ESC-${data.payment_id}`,
      amount: data.amount,
      status: data.status,
    };
  }

  async getEscrowStatus(exhibitorId: string): Promise<{
    holds: EscrowHold[];
    total_held: number;
    total_released: number;
  }> {
    const { data } = await this.gatewayClient.get(`/api/escrow/${exhibitorId}`);
    return data;
  }

  async releaseEscrow(holdId: string, params?: {
    released_to?: string;
    reason?: string;
  }): Promise<EscrowHold> {
    const { data } = await this.gatewayClient.post(`/api/escrow/${holdId}/release`, params || {});
    return data;
  }

  // ============================================
  // REFUNDS
  // ============================================

  async initiateRefund(params: {
    payment_id: string;
    amount?: number;
    reason: string;
  }): Promise<{
    refund_id: string;
    status: 'pending' | 'processing';
    estimated_completion: string;
  }> {
    const { data } = await this.gatewayClient.post(`/api/payments/${params.payment_id}/refund`, {
      amount: params.amount,
      reason: params.reason,
    });

    return {
      refund_id: data.refund?.id || `REF-${params.payment_id}`,
      status: 'processing',
      estimated_completion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async getRefundStatus(refundId: string): Promise<Refund> {
    const { data } = await this.gatewayClient.get(`/api/refunds/${refundId}`);
    return data;
  }

  // ============================================
  // PAYMENT HISTORY
  // ============================================

  async getPaymentHistory(params?: {
    exhibition_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    payments: PaymentIntent[];
    total: number;
    page: number;
    has_more: boolean;
  }> {
    const { data } = await this.gatewayClient.get('/api/payments', { params });
    return data;
  }

  async getPayment(paymentId: string): Promise<PaymentIntent> {
    const { data } = await this.gatewayClient.get(`/api/payments/${paymentId}`);
    return data;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  getAvailablePaymentMethods(): PaymentMethod[] {
    return [
      { id: 'upi', type: 'upi', name: 'UPI', icon: '💳', enabled: true },
      { id: 'card', type: 'card', name: 'Credit/Debit Card', icon: '💳', enabled: true },
      { id: 'netbanking', type: 'netbanking', name: 'Net Banking', icon: '🏦', enabled: true },
      { id: 'wallet', type: 'wallet', name: 'Wallet', icon: '👛', enabled: false },
    ];
  }

  formatAmount(amount: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // ============================================
  // HEALTH
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      await this.gatewayClient.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton
export const sutARPayment = new SUTARPayment();
export default sutARPayment;
