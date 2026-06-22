/**
 * Insurance Service - All insurance products
 * Integrates with RABTUL: Auth (OTP), Payment (premiums), Notify (SMS/WhatsApp), Wallet (coins)
 */

import axios from 'axios';

// RABTUL Service URLs
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';
const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4001';
const WALLET_URL = process.env.WALLET_SERVICE_URL || 'http://localhost:4004';
const NOTIFY_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4011';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-token';

const headers = { 'X-Internal-Token': INTERNAL_TOKEN, 'Content-Type': 'application/json' };

export class InsuranceService {
  /**
   * Send OTP for KYC verification
   */
  async sendOTP(phone: string): Promise<{ success: boolean }> {
    try {
      const { data } = await axios.post(`${AUTH_URL}/api/auth/otp/send`, { phone, type: 'insurance_kyc' }, { headers, timeout: 10000 });
      return { success: data.success };
    } catch { return { success: false }; }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(phone: string, otp: string): Promise<{ success: boolean; user?: any }> {
    try {
      const { data } = await axios.post(`${AUTH_URL}/api/auth/otp/verify`, { phone, otp }, { headers, timeout: 10000 });
      return { success: data.success, user: data.user };
    } catch { return { success: false }; }
  }

  /**
   * Collect premium via RABTUL Payment
   */
  async collectPremium(params: { userId: string; phone: string; amount: number; policyId: string }): Promise<{ success: boolean; orderId?: string; paymentUrl?: string }> {
    try {
      const { data } = await axios.post(`${PAYMENT_URL}/api/payments/create-order`, {
        userId: params.userId,
        amount: params.amount,
        currency: 'INR',
        productInfo: `Insurance Premium: ${params.policyId}`,
        customerPhone: params.phone,
      }, { headers, timeout: 15000 });
      return { success: data.success, orderId: data.orderId, paymentUrl: data.paymentUrl };
    } catch { return { success: false }; }
  }

  /**
   * Award REZ coins on purchase (5% cashback)
   */
  async awardCoins(userId: string, amount: number, policyId: string): Promise<boolean> {
    try {
      const coins = Math.floor(amount * 0.05);
      await axios.post(`${WALLET_URL}/api/wallet/coins/add`, {
        userId,
        coins,
        source: 'insurance_purchase',
        reason: `Policy: ${policyId}`,
      }, { headers });
      return true;
    } catch { return false; }
  }

  /**
   * Send notification via RABTUL Notify
   */
  async notify(params: { channel: 'sms' | 'whatsapp' | 'email' | 'push'; phone?: string; email?: string; userId?: string; template: string; variables?: Record<string, string> }): Promise<boolean> {
    try {
      await axios.post(`${NOTIFY_URL}/api/notifications/send`, params, { headers });
      return true;
    } catch { return false; }
  }

  /**
   * Quick SMS notification
   */
  async sms(phone: string, message: string): Promise<boolean> {
    return this.notify({ channel: 'sms', phone, template: 'custom', variables: { message } });
  }

  /**
   * Quick WhatsApp notification
   */
  async whatsapp(phone: string, template: string, vars: Record<string, string>): Promise<boolean> {
    return this.notify({ channel: 'whatsapp', phone, template, variables: vars });
  }
}

export const insuranceService = new InsuranceService();
