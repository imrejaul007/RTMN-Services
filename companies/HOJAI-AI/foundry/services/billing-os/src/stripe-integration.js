/**
 * Stripe Integration for BillingOS
 * Real payment processing with Stripe API
 */

import axios from 'axios';
import crypto from 'crypto';

// Stripe API configuration
const STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_demo',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_demo',
  apiVersion: '2023-10-16',
  baseUrl: 'https://api.stripe.com'
};

/**
 * Stripe API Client
 */
class StripeClient {
  constructor() {
    this.client = axios.create({
      baseURL: STRIPE_CONFIG.baseUrl,
      auth: {
        username: STRIPE_CONFIG.secretKey,
        password: ''
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': STRIPE_CONFIG.apiVersion
      }
    });
  }

  /**
   * Create a Payment Intent
   */
  async createPaymentIntent(params) {
    const { amount, currency = 'usd', customer, metadata = {} } = params;

    const data = new URLSearchParams({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      ...(customer && { customer }),
      ...Object.entries(metadata).reduce((acc, [k, v]) => {
        acc[`metadata[${k}]`] = String(v);
        return acc;
      }, {})
    });

    try {
      const response = await this.client.post('/v1/payment_intents', data);
      return response.data;
    } catch (error) {
      console.error('Stripe createPaymentIntent error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Payment intent creation failed');
    }
  }

  /**
   * Confirm Payment Intent
   */
  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    const data = new URLSearchParams({
      payment_method: paymentMethodId
    });

    try {
      const response = await this.client.post(`/v1/payment_intents/${paymentIntentId}/confirm`, data);
      return response.data;
    } catch (error) {
      console.error('Stripe confirmPaymentIntent error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Payment confirmation failed');
    }
  }

  /**
   * Get Payment Intent
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const response = await this.client.get(`/v1/payment_intents/${paymentIntentId}`);
      return response.data;
    } catch (error) {
      console.error('Stripe getPaymentIntent error:', error.response?.data);
      throw new Error('Failed to retrieve payment intent');
    }
  }

  /**
   * Cancel Payment Intent
   */
  async cancelPaymentIntent(paymentIntentId) {
    try {
      const response = await this.client.post(`/v1/payment_intents/${paymentIntentId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Stripe cancelPaymentIntent error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Payment cancellation failed');
    }
  }

  /**
   * Create Customer
   */
  async createCustomer(params) {
    const { email, name, metadata = {} } = params;

    const data = new URLSearchParams({
      ...(email && { email }),
      ...(name && { name }),
      ...Object.entries(metadata).reduce((acc, [k, v]) => {
        acc[`metadata[${k}]`] = String(v);
        return acc;
      }, {})
    });

    try {
      const response = await this.client.post('/v1/customers', data);
      return response.data;
    } catch (error) {
      console.error('Stripe createCustomer error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Customer creation failed');
    }
  }

  /**
   * Get Customer
   */
  async getCustomer(customerId) {
    try {
      const response = await this.client.get(`/v1/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Stripe getCustomer error:', error.response?.data);
      throw new Error('Failed to retrieve customer');
    }
  }

  /**
   * Update Customer
   */
  async updateCustomer(customerId, params) {
    const data = new URLSearchParams({
      ...Object.entries(params).reduce((acc, [k, v]) => {
        if (v !== undefined) acc[k] = String(v);
        return acc;
      }, {})
    });

    try {
      const response = await this.client.post(`/v1/customers/${customerId}`, data);
      return response.data;
    } catch (error) {
      console.error('Stripe updateCustomer error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Customer update failed');
    }
  }

  /**
   * Create Subscription
   */
  async createSubscription(params) {
    const { customerId, priceId, trialDays = 0, defaultPaymentMethod, metadata = {} } = params;

    const data = new URLSearchParams({
      customer: customerId,
      items: `[{"price": "${priceId}"}]`,
      ...(trialDays > 0 && { 'trial_period_days': String(trialDays) }),
      ...(defaultPaymentMethod && { 'default_payment_method': defaultPaymentMethod }),
      ...Object.entries(metadata).reduce((acc, [k, v]) => {
        acc[`metadata[${k}]`] = String(v);
        return acc;
      }, {})
    });

    try {
      const response = await this.client.post('/v1/subscriptions', data);
      return response.data;
    } catch (error) {
      console.error('Stripe createSubscription error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Subscription creation failed');
    }
  }

  /**
   * Get Subscription
   */
  async getSubscription(subscriptionId) {
    try {
      const response = await this.client.get(`/v1/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      console.error('Stripe getSubscription error:', error.response?.data);
      throw new Error('Failed to retrieve subscription');
    }
  }

  /**
   * Update Subscription
   */
  async updateSubscription(subscriptionId, params) {
    const { priceId, quantity = 1, metadata = {} } = params;

    const data = new URLSearchParams({
      items: `[{"price": "${priceId}", "quantity": ${quantity}}]`,
      proration_behavior: 'create_prorations',
      ...Object.entries(metadata).reduce((acc, [k, v]) => {
        acc[`metadata[${k}]`] = String(v);
        return acc;
      }, {})
    });

    try {
      const response = await this.client.post(`/v1/subscriptions/${subscriptionId}`, data);
      return response.data;
    } catch (error) {
      console.error('Stripe updateSubscription error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Subscription update failed');
    }
  }

  /**
   * Cancel Subscription
   */
  async cancelSubscription(subscriptionId, params = {}) {
    const { cancelAtPeriodEnd = false } = params;

    try {
      if (cancelAtPeriodEnd) {
        // Mark for cancellation at period end
        const data = new URLSearchParams({
          cancel_at_period_end: 'true'
        });
        const response = await this.client.post(`/v1/subscriptions/${subscriptionId}`, data);
        return response.data;
      } else {
        // Cancel immediately
        const response = await this.client.delete(`/v1/subscriptions/${subscriptionId}`);
        return response.data;
      }
    } catch (error) {
      console.error('Stripe cancelSubscription error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Subscription cancellation failed');
    }
  }

  /**
   * Pause Subscription (requires Stripe Billing Portal)
   */
  async pauseSubscription(subscriptionId) {
    const data = new URLSearchParams({
      pause_collection: '{"behavior": "void"}'
    });

    try {
      const response = await this.client.post(`/v1/subscriptions/${subscriptionId}`, data);
      return response.data;
    } catch (error) {
      console.error('Stripe pauseSubscription error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Subscription pause failed');
    }
  }

  /**
   * Resume Subscription
   */
  async resumeSubscription(subscriptionId) {
    const data = new URLSearchParams({
      pause_collection: ''
    });

    try {
      const response = await this.client.post(`/v1/subscriptions/${subscriptionId}`, data);
      return response.data;
    } catch (error) {
      console.error('Stripe resumeSubscription error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Subscription resume failed');
    }
  }

  /**
   * Create Invoice
   */
  async createInvoice(params) {
    const { customerId, description, dueDate, items = [], autoAdvance = true } = params;

    // First create invoice
    const data = new URLSearchParams({
      customer: customerId,
      auto_advance: autoAdvance ? 'true' : 'false',
      ...(description && { description }),
      ...(dueDate && { due_date: String(Math.floor(new Date(dueDate).getTime() / 1000)) })
    });

    try {
      let invoice = (await this.client.post('/v1/invoices', data)).data;

      // Add line items
      for (const item of items) {
        const lineData = new URLSearchParams({
          customer: customerId,
          invoice: invoice.id,
          amount: String(Math.round(item.amount * 100)),
          currency: item.currency || 'usd',
          description: item.description,
          quantity: String(item.quantity || 1)
        });
        await this.client.post('/v1/invoiceitems', lineData);
      }

      // Finalize invoice
      invoice = (await this.client.post(`/v1/invoices/${invoice.id}/finalize`)).data;

      return invoice;
    } catch (error) {
      console.error('Stripe createInvoice error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Invoice creation failed');
    }
  }

  /**
   * Send Invoice
   */
  async sendInvoice(invoiceId) {
    try {
      const response = await this.client.post(`/v1/invoices/${invoiceId}/send`);
      return response.data;
    } catch (error) {
      console.error('Stripe sendInvoice error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Invoice send failed');
    }
  }

  /**
   * Void Invoice
   */
  async voidInvoice(invoiceId) {
    try {
      const response = await this.client.post(`/v1/invoices/${invoiceId}/void`);
      return response.data;
    } catch (error) {
      console.error('Stripe voidInvoice error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Invoice void failed');
    }
  }

  /**
   * Create Refund
   */
  async createRefund(params) {
    const { paymentIntentId, amount, reason } = params;

    const data = new URLSearchParams({
      payment_intent: paymentIntentId,
      ...(amount && { amount: String(Math.round(amount * 100)) }),
      ...(reason && { reason })
    });

    try {
      const response = await this.client.post('/v1/refunds', data);
      return response.data;
    } catch (error) {
      console.error('Stripe createRefund error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Refund creation failed');
    }
  }

  /**
   * Create Product
   */
  async createProduct(name, params = {}) {
    const data = new URLSearchParams({
      name,
      ...Object.entries(params).reduce((acc, [k, v]) => {
        if (v !== undefined) acc[k] = String(v);
        return acc;
      }, {})
    });

    try {
      const response = await this.client.post('/v1/products', data);
      return response.data;
    } catch (error) {
      console.error('Stripe createProduct error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Product creation failed');
    }
  }

  /**
   * Create Price (for subscription)
   */
  async createPrice(params) {
    const { productId, unitAmount, currency = 'usd', interval, intervalCount = 1, nickname } = params;

    const data = new URLSearchParams({
      product: productId,
      unit_amount: String(Math.round(unitAmount * 100)),
      currency,
      ...(interval && { 'recurring[interval]': interval }),
      ...(intervalCount > 1 && { 'recurring[interval_count]': String(intervalCount) }),
      ...(nickname && { nickname })
    });

    try {
      const response = await this.client.post('/v1/prices', data);
      return response.data;
    } catch (error) {
      console.error('Stripe createPrice error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Price creation failed');
    }
  }

  /**
   * Create Checkout Session
   */
  async createCheckoutSession(params) {
    const { customerId, lineItems, mode = 'subscription', successUrl, cancelUrl, customerEmail, metadata = {} } = params;

    const data = new URLSearchParams({
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(customerId && { customer: customerId }),
      ...(customerEmail && { customer_email: customerEmail }),
      ...Object.entries(metadata).reduce((acc, [k, v]) => {
        acc[`metadata[${k}]`] = String(v);
        return acc;
      }, {})
    });

    // Add line items
    if (lineItems && lineItems.length > 0) {
      lineItems.forEach((item, i) => {
        data.append(`line_items[${i}][price]`, item.priceId);
        data.append(`line_items[${i}][quantity]`, String(item.quantity || 1));
      });
    }

    try {
      const response = await this.client.post('/v1/checkout/sessions', data);
      return response.data;
    } catch (error) {
      console.error('Stripe createCheckoutSession error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Checkout session creation failed');
    }
  }

  /**
   * Create Customer Portal Session
   */
  async createPortalSession(customerId, returnUrl) {
    const data = new URLSearchParams({
      customer: customerId,
      return_url: returnUrl
    });

    try {
      const response = await this.client.post('/v1/billing_portal/sessions', data);
      return response.data;
    } catch (error) {
      console.error('Stripe createPortalSession error:', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Portal session creation failed');
    }
  }

  /**
   * Get Balance
   */
  async getBalance() {
    try {
      const response = await this.client.get('/v1/balance');
      return response.data;
    } catch (error) {
      console.error('Stripe getBalance error:', error.response?.data);
      throw new Error('Failed to retrieve balance');
    }
  }

  /**
   * List Transactions
   */
  async listTransactions(params = {}) {
    try {
      const response = await this.client.get('/v1/balance_transactions', { params });
      return response.data;
    } catch (error) {
      console.error('Stripe listTransactions error:', error.response?.data);
      throw new Error('Failed to list transactions');
    }
  }

  /**
   * Verify Webhook Signature
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const parts = signature.split(',');
      const sig = parts.find(p => p.startsWith('t='))?.split('=')[1];
      const timestamp = parts.find(p => p.startsWith('v1='))?.split('=')[1];

      if (!sig || !timestamp) {
        throw new Error('Invalid signature format');
      }

      const signedPayload = `${timestamp}.${payload}`;
      const expectedSig = crypto
        .createHmac('sha256', STRIPE_CONFIG.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
        return true;
      }

      throw new Error('Signature verification failed');
    } catch (error) {
      console.error('Webhook signature verification failed:', error.message);
      return false;
    }
  }

  /**
   * Parse Webhook Event
   */
  parseWebhookEvent(payload, signature) {
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    return JSON.parse(payload);
  }
}

/**
 * Webhook Event Handlers
 */
export const WebhookHandlers = {
  'payment_intent.succeeded': async (event, db) => {
    const paymentIntent = event.data.object;
    console.log(`Payment succeeded: ${paymentIntent.id}`);
    // Update order/payment status in database
    return { processed: true, action: 'payment_captured' };
  },

  'payment_intent.payment_failed': async (event, db) => {
    const paymentIntent = event.data.object;
    console.log(`Payment failed: ${paymentIntent.id}`);
    // Handle failed payment
    return { processed: true, action: 'payment_failed', reason: paymentIntent.last_payment_error?.message };
  },

  'customer.subscription.created': async (event, db) => {
    const subscription = event.data.object;
    console.log(`Subscription created: ${subscription.id}`);
    // Create subscription record in database
    return { processed: true, action: 'subscription_created', subscriptionId: subscription.id };
  },

  'customer.subscription.updated': async (event, db) => {
    const subscription = event.data.object;
    console.log(`Subscription updated: ${subscription.id}`);
    // Update subscription record
    return { processed: true, action: 'subscription_updated' };
  },

  'customer.subscription.deleted': async (event, db) => {
    const subscription = event.data.object;
    console.log(`Subscription cancelled: ${subscription.id}`);
    // Mark subscription as cancelled
    return { processed: true, action: 'subscription_cancelled' };
  },

  'invoice.paid': async (event, db) => {
    const invoice = event.data.object;
    console.log(`Invoice paid: ${invoice.id}`);
    // Record payment
    return { processed: true, action: 'invoice_paid', invoiceId: invoice.id };
  },

  'invoice.payment_failed': async (event, db) => {
    const invoice = event.data.object;
    console.log(`Invoice payment failed: ${invoice.id}`);
    // Handle failed invoice payment
    return { processed: true, action: 'invoice_payment_failed' };
  },

  'charge.refunded': async (event, db) => {
    const charge = event.data.object;
    console.log(`Charge refunded: ${charge.id}`);
    // Update refund status
    return { processed: true, action: 'charge_refunded' };
  },

  'customer.created': async (event, db) => {
    const customer = event.data.object;
    console.log(`Customer created: ${customer.id}`);
    // Sync customer to database
    return { processed: true, action: 'customer_created' };
  },

  'customer.updated': async (event, db) => {
    const customer = event.data.object;
    console.log(`Customer updated: ${customer.id}`);
    // Sync customer updates
    return { processed: true, action: 'customer_updated' };
  }
};

/**
 * Process Webhook
 */
export async function processWebhook(event, db = null) {
  const handler = WebhookHandlers[event.type];

  if (handler) {
    try {
      return await handler(event, db);
    } catch (error) {
      console.error(`Webhook handler error for ${event.type}:`, error);
      return { processed: false, error: error.message };
    }
  }

  console.log(`Unhandled webhook event: ${event.type}`);
  return { processed: false, action: 'unhandled' };
}

// Singleton instance
let stripeInstance = null;

export function getStripeClient() {
  if (!stripeInstance) {
    stripeInstance = new StripeClient();
  }
  return stripeInstance;
}

export default {
  StripeClient,
  getStripeClient,
  WebhookHandlers,
  processWebhook
};
