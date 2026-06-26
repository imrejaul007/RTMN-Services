/**
 * Stripe API Client - Real Stripe integration
 */

import axios from 'axios';
import crypto from 'crypto';

/**
 * Create Stripe API client
 */
export function createStripeClient(apiKey) {
  const baseURL = apiKey.startsWith('sk_live_')
    ? 'https://api.stripe.com'
    : 'https://api.stripe.com';

  const client = axios.create({
    baseURL,
    auth: {
      username: apiKey,
      password: ''
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return {
    // ================== PAYMENTS ==================

    /**
     * Create a payment intent
     */
    async createPaymentIntent(params) {
      const data = new URLSearchParams({
        amount: params.amount,
        currency: params.currency || 'usd',
        ...(params.customer && { customer: params.customer }),
        ...(params.metadata && Object.entries(params.metadata).reduce((acc, [k, v]) => {
          acc[`metadata[${k}]`] = v;
          return acc;
        }, {}))
      });

      const response = await client.post('/v1/payment_intents', data);
      return response.data;
    },

    /**
     * Retrieve payment intent
     */
    async getPaymentIntent(paymentIntentId) {
      const response = await client.get(`/v1/payment_intents/${paymentIntentId}`);
      return response.data;
    },

    /**
     * Confirm payment intent
     */
    async confirmPaymentIntent(paymentIntentId, params = {}) {
      const data = new URLSearchParams({
        ...(params.payment_method && { payment_method: params.payment_method }),
        ...(params.return_url && { return_url: params.return_url })
      });

      const response = await client.post(`/v1/payment_intents/${paymentIntentId}/confirm`, data);
      return response.data;
    },

    /**
     * Cancel payment intent
     */
    async cancelPaymentIntent(paymentIntentId) {
      const response = await client.post(`/v1/payment_intents/${paymentIntentId}/cancel`);
      return response.data;
    },

    /**
     * List payment intents
     */
    async listPaymentIntents(params = {}) {
      const response = await client.get('/v1/payment_intents', { params });
      return response.data;
    },

    /**
     * Create refund
     */
    async createRefund(params) {
      const data = new URLSearchParams({
        ...(params.payment_intent && { payment_intent: params.payment_intent }),
        ...(params.charge && { charge: params.charge }),
        ...(params.amount && { amount: params.amount }),
        ...(params.reason && { reason: params.reason }),
        ...(params.metadata && Object.entries(params.metadata).reduce((acc, [k, v]) => {
          acc[`metadata[${k}]`] = v;
          return acc;
        }, {}))
      });

      const response = await client.post('/v1/refunds', data);
      return response.data;
    },

    /**
     * List refunds
     */
    async listRefunds(params = {}) {
      const response = await client.get('/v1/refunds', { params });
      return response.data;
    },

    // ================== CUSTOMERS ==================

    /**
     * Create customer
     */
    async createCustomer(params) {
      const data = new URLSearchParams({
        ...(params.email && { email: params.email }),
        ...(params.name && { name: params.name }),
        ...(params.phone && { phone: params.phone }),
        ...(params.description && { description: params.description }),
        ...(params.metadata && Object.entries(params.metadata).reduce((acc, [k, v]) => {
          acc[`metadata[${k}]`] = v;
          return acc;
        }, {}))
      });

      const response = await client.post('/v1/customers', data);
      return response.data;
    },

    /**
     * Retrieve customer
     */
    async getCustomer(customerId) {
      const response = await client.get(`/v1/customers/${customerId}`);
      return response.data;
    },

    /**
     * Update customer
     */
    async updateCustomer(customerId, params) {
      const data = new URLSearchParams({
        ...(params.email && { email: params.email }),
        ...(params.name && { name: params.name }),
        ...(params.phone && { phone: params.phone }),
        ...(params.description && { description: params.description }),
        ...(params.metadata && Object.entries(params.metadata).reduce((acc, [k, v]) => {
          acc[`metadata[${k}]`] = v;
          return acc;
        }, {}))
      });

      const response = await client.post(`/v1/customers/${customerId}`, data);
      return response.data;
    },

    /**
     * List customers
     */
    async listCustomers(params = {}) {
      const response = await client.get('/v1/customers', { params });
      return response.data;
    },

    /**
     * Delete customer
     */
    async deleteCustomer(customerId) {
      const response = await client.delete(`/v1/customers/${customerId}`);
      return response.data;
    },

    // ================== SUBSCRIPTIONS ==================

    /**
     * Create subscription
     */
    async createSubscription(params) {
      const data = new URLSearchParams({
        customer: params.customerId,
        items: params.items.map(item => `[0][price]=${item.priceId}`).join('&') +
               (params.items[0].quantity ? `&items[0][quantity]=${params.items[0].quantity}` : ''),
        ...(params.default_payment_method && { 'default_payment_method': params.default_payment_method }),
        ...(params.trial_period_days && { 'trial_period_days': params.trial_period_days }),
        ...(params.metadata && Object.entries(params.metadata).reduce((acc, [k, v]) => {
          acc[`metadata[${k}]`] = v;
          return acc;
        }, {}))
      });

      const response = await client.post('/v1/subscriptions', data);
      return response.data;
    },

    /**
     * Get subscription
     */
    async getSubscription(subscriptionId) {
      const response = await client.get(`/v1/subscriptions/${subscriptionId}`);
      return response.data;
    },

    /**
     * Update subscription
     */
    async updateSubscription(subscriptionId, params) {
      const data = new URLSearchParams({
        ...(params.items && params.items.map((item, i) =>
          `[items][${i}][id]=${item.id}&items[${i}][price]=${item.priceId}`
        ).join('&')),
        ...(params.default_payment_method && { 'default_payment_method': params.default_payment_method }),
        ...(params.metadata && Object.entries(params.metadata).reduce((acc, [k, v]) => {
          acc[`metadata[${k}]`] = v;
          return acc;
        }, {}))
      });

      const response = await client.post(`/v1/subscriptions/${subscriptionId}`, data);
      return response.data;
    },

    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId, params = {}) {
      const data = new URLSearchParams({
        ...(params.cancel_at_period_end && { cancel_at_period_end: 'true' }),
        ...(params.cancellation_reason && { cancellation_reason: params.cancellation_reason })
      });

      const response = await client.post(`/v1/subscriptions/${subscriptionId}`, data);
      return response.data;
    },

    /**
     * List subscriptions
     */
    async listSubscriptions(params = {}) {
      const response = await client.get('/v1/subscriptions', { params });
      return response.data;
    },

    // ================== PRICES & PRODUCTS ==================

    /**
     * Create product
     */
    async createProduct(params) {
      const data = new URLSearchParams({
        name: params.name,
        ...(params.description && { description: params.description }),
        ...(params.metadata && Object.entries(params.metadata).reduce((acc, [k, v]) => {
          acc[`metadata[${k}]`] = v;
          return acc;
        }, {}))
      });

      const response = await client.post('/v1/products', data);
      return response.data;
    },

    /**
     * Create price
     */
    async createPrice(params) {
      const data = new URLSearchParams({
        product: params.productId,
        unit_amount: params.amount,
        currency: params.currency || 'usd',
        ...(params.recurring && {
          'recurring[interval]': params.recurring.interval,
          'recurring[interval_count]': params.recurring.interval_count || 1
        }),
        ...(params.metadata && Object.entries(params.metadata).reduce((acc, [k, v]) => {
          acc[`metadata[${k}]`] = v;
          return acc;
        }, {}))
      });

      const response = await client.post('/v1/prices', data);
      return response.data;
    },

    // ================== INVOICES ==================

    /**
     * Create invoice
     */
    async createInvoice(params) {
      const data = new URLSearchParams({
        customer: params.customerId,
        ...(params.auto_advance && { auto_advance: params.auto_advance }),
        ...(params.collection_method && { collection_method: params.collection_method }),
        ...(params.due_date && { due_date: params.due_date }),
        ...(params.description && { description: params.description })
      });

      // Add line items
      if (params.items) {
        params.items.forEach((item, i) => {
          data.append(`lines[${i}][price]`, item.priceId);
          if (item.quantity) data.append(`lines[${i}][quantity]`, item.quantity);
        });
      }

      const response = await client.post('/v1/invoices', data);
      return response.data;
    },

    /**
     * Finalize invoice
     */
    async finalizeInvoice(invoiceId) {
      const response = await client.post(`/v1/invoices/${invoiceId}/finalize`);
      return response.data;
    },

    /**
     * Send invoice
     */
    async sendInvoice(invoiceId) {
      const response = await client.post(`/v1/invoices/${invoiceId}/send`);
      return response.data;
    },

    /**
     * List invoices
     */
    async listInvoices(params = {}) {
      const response = await client.get('/v1/invoices', { params });
      return response.data;
    },

    // ================== CHECKOUT ==================

    /**
     * Create checkout session
     */
    async createCheckoutSession(params) {
      const data = new URLSearchParams({
        mode: params.mode || 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        ...(params.customer && { customer: params.customer }),
        ...(params.customer_email && { customer_email: params.customer_email }),
        ...(params.line_items && params.line_items.map((item, i) =>
          `line_items[${i}][price]=${item.price}&line_items[${i}][quantity]=${item.quantity || 1}`
        ).join('&')),
        ...(params.metadata && Object.entries(params.metadata).reduce((acc, [k, v]) => {
          acc[`metadata[${k}]`] = v;
          return acc;
        }, {}))
      });

      const response = await client.post('/v1/checkout/sessions', data);
      return response.data;
    },

    /**
     * Retrieve checkout session
     */
    async getCheckoutSession(sessionId) {
      const response = await client.get(`/v1/checkout/sessions/${sessionId}`);
      return response.data;
    },

    // ================== BALANCE ==================

    /**
     * Get balance
     */
    async getBalance() {
      const response = await client.get('/v1/balance');
      return response.data;
    },

    /**
     * Get balance transactions
     */
    async getBalanceTransactions(params = {}) {
      const response = await client.get('/v1/balance_transactions', { params });
      return response.data;
    },

    // ================== CONNECT (Marketplace) ==================

    /**
     * Create connected account
     */
    async createConnectAccount(params) {
      const data = new URLSearchParams({
        type: params.type || 'express',
        country: params.country || 'US',
        ...(params.email && { email: params.email }),
        ...(params.business_type && { 'business_type': params.business_type }),
        ...(params.metadata && Object.entries(params.metadata).reduce((acc, [k, v]) => {
          acc[`metadata[${k}]`] = v;
          return acc;
        }, {}))
      });

      const response = await client.post('/v1/accounts', data);
      return response.data;
    },

    /**
     * Create account link (onboarding)
     */
    async createAccountLink(accountId, params) {
      const data = new URLSearchParams({
        account: accountId,
        refresh_url: params.refreshUrl,
        return_url: params.returnUrl,
        type: 'account_onboarding'
      });

      const response = await client.post('/v1/account_links', data);
      return response.data;
    },

    /**
     * Create transfer to connected account
     */
    async createTransfer(params) {
      const data = new URLSearchParams({
        amount: params.amount,
        currency: params.currency || 'usd',
        destination: params.destinationAccountId,
        ...(params.source_transaction && { 'source_transaction': params.source_transaction }),
        ...(params.metadata && Object.entries(params.metadata).reduce((acc, [k, v]) => {
          acc[`metadata[${k}]`] = v;
          return acc;
        }, {}))
      });

      const response = await client.post('/v1/transfers', data);
      return response.data;
    },

    /**
     * Create payout
     */
    async createPayout(params) {
      const data = new URLSearchParams({
        amount: params.amount,
        currency: params.currency || 'usd',
        ...(params.method && { method: params.method }),
        ...(params.destination && { destination: params.destination })
      });

      const response = await client.post('/v1/payouts', data);
      return response.data;
    }
  };
}

// Export a factory function for creating clients
export default { createStripeClient };
