import mongoose, { Schema, Model } from 'mongoose';
import crypto from 'crypto';

// ============================================================================
// SUBSCRIPTION MODEL
// ============================================================================

export interface Subscription {
  id: string;
  tenantId: string;
  merchantId: string;
  plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';

  // Payment
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;

  // Billing
  currentPeriodStart: Date;
  currentPeriodEnd: Date;

  // Limits
  limits: {
    conversations: number;
    messages: number;
    aiCalls: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  merchantId: { type: String, required: true, index: true },
  plan: {
    type: String,
    enum: ['trial', 'starter', 'professional', 'enterprise'],
    default: 'trial'
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'past_due'],
    default: 'active'
  },
  razorpaySubscriptionId: String,
  razorpayCustomerId: String,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  limits: {
    conversations: { type: Number, default: 100 },
    messages: { type: Number, default: 1000 },
    aiCalls: { type: Number, default: 500 }
  }
}, { timestamps: true });

SubscriptionSchema.index({ merchantId: 1, status: 1 });

export const SubscriptionModel: Model<Subscription> = mongoose.model('Subscription', SubscriptionSchema);

// ============================================================================
// PAYMENT SERVICE
// ============================================================================

export class PaymentService {
  private razorpay: any;

  constructor() {
    // Initialize Razorpay if credentials available
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = {
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      };
    }
  }

  /**
   * Plan pricing (in INR)
   */
  private readonly plans = {
    trial: { amount: 0, period: 14, name: '14-Day Trial' },
    starter: { amount: 999, period: 30, name: 'Starter' },
    professional: { amount: 2499, period: 30, name: 'Professional' },
    enterprise: { amount: 9999, period: 30, name: 'Enterprise' }
  };

  /**
   * Create subscription for merchant
   */
  async createSubscription(params: {
    tenantId: string;
    merchantId: string;
    plan: 'trial' | 'starter' | 'professional' | 'enterprise';
    customerEmail: string;
    customerPhone: string;
  }): Promise<{
    subscriptionId: string;
    clientId: string;
    checkoutUrl?: string;
  }> {
    const { tenantId, merchantId, plan, customerEmail, customerPhone } = params;
    const planDetails = this.plans[plan];

    // Check if Razorpay is configured
    if (!this.razorpay) {
      // Demo mode - create mock subscription
      const mockSubscription = {
        id: `sub_${crypto.randomBytes(8).toString('hex')}`,
        tenantId,
        merchantId,
        plan,
        status: plan === 'trial' ? 'active' : 'pending',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + planDetails.period * 24 * 60 * 60 * 1000),
        limits: this.getLimits(plan)
      };

      await SubscriptionModel.create(mockSubscription);

      return {
        subscriptionId: mockSubscription.id,
        clientId: 'demo_mode',
        checkoutUrl: undefined
      };
    }

    // Real Razorpay integration
    const subscription = await this.createRazorpaySubscription({
      tenantId,
      merchantId,
      plan: planDetails,
      customerEmail,
      customerPhone
    });

    return subscription;
  }

  /**
   * Create Razorpay subscription
   */
  private async createRazorpaySubscription(params: {
    tenantId: string;
    merchantId: string;
    plan: { amount: number; period: number; name: string };
    customerEmail: string;
    customerPhone: string;
  }): Promise<{ subscriptionId: string; clientId: string; checkoutUrl: string }> {
    // In production, use razorpay npm package:
    // const Razorpay = require('razorpay');
    // const razorpay = new Razorpay({ ... });

    // For now, return mock response
    const subscriptionId = `sub_${crypto.randomBytes(8).toString('hex')}`;

    return {
      subscriptionId,
      clientId: process.env.RAZORPAY_KEY_ID || '',
      checkoutUrl: `https://checkout.razorpay.com/v1/checkout.js`
    };
  }

  /**
   * Get subscription
   */
  async getSubscription(tenantId: string): Promise<Subscription | null> {
    const subscription = await SubscriptionModel.findOne({ tenantId });
    return subscription as Subscription | null;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(tenantId: string): Promise<boolean> {
    const result = await SubscriptionModel.updateOne(
      { tenantId },
      { $set: { status: 'cancelled' } }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Check if merchant has active subscription
   */
  async hasActiveSubscription(tenantId: string): Promise<boolean> {
    const subscription = await SubscriptionModel.findOne({
      tenantId,
      status: 'active'
    });

    if (!subscription) return false;

    // Check if expired
    if (subscription.currentPeriodEnd < new Date()) {
      await SubscriptionModel.updateOne(
        { tenantId },
        { $set: { status: 'expired' } }
      );
      return false;
    }

    return true;
  }

  /**
   * Check usage limits
   */
  async checkLimits(tenantId: string, type: 'conversations' | 'messages' | 'aiCalls'): Promise<boolean> {
    const subscription = await SubscriptionModel.findOne({
      tenantId,
      status: 'active'
    });

    if (!subscription) return false;

    // For demo, always allow
    return true;
  }

  /**
   * Increment usage
   */
  async incrementUsage(tenantId: string, type: 'conversations' | 'messages' | 'aiCalls'): Promise<void> {
    // In production, track actual usage
    // For demo, just log
    console.log(`[Payment] Usage: ${tenantId} - ${type}`);
  }

  /**
   * Get limits for plan
   */
  private getLimits(plan: string): Subscription['limits'] {
    const limits: Record<string, Subscription['limits']> = {
      trial: { conversations: 50, messages: 500, aiCalls: 100 },
      starter: { conversations: 500, messages: 5000, aiCalls: 1000 },
      professional: { conversations: 2000, messages: 20000, aiCalls: 5000 },
      enterprise: { conversations: 10000, messages: 100000, aiCalls: 25000 }
    };
    return limits[plan] || limits.trial;
  }

  /**
   * Handle payment webhook from Razorpay
   */
  async handleWebhook(event: string, payload: any): Promise<void> {
    switch (event) {
      case 'subscription.activated':
        await SubscriptionModel.updateOne(
          { razorpaySubscriptionId: payload.subscription_id },
          { $set: { status: 'active' } }
        );
        break;

      case 'subscription.cancelled':
        await SubscriptionModel.updateOne(
          { razorpaySubscriptionId: payload.subscription_id },
          { $set: { status: 'cancelled' } }
        );
        break;

      case 'subscription.expired':
        await SubscriptionModel.updateOne(
          { razorpaySubscriptionId: payload.subscription_id },
          { $set: { status: 'expired' } }
        );
        break;

      case 'subscription.past_due':
        await SubscriptionModel.updateOne(
          { razorpaySubscriptionId: payload.subscription_id },
          { $set: { status: 'past_due' } }
        );
        break;
    }
  }
}

export const paymentService = new PaymentService();
