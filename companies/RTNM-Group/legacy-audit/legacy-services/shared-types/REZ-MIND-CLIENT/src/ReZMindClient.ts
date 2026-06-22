/**
 * REZ Mind Integration Client
 * Connect apps to ReZ Mind event platform
 *
 * Usage:
 *   import { rezMind } from './ReZMindClient';
 *   rezMind.sendInventoryEvent({ merchant_id, item_id, current_stock });
 */

import axios from 'axios';

// Event Platform URL (update this after deployment)
const EVENT_PLATFORM_URL = process.env.EXPO_PUBLIC_EVENT_PLATFORM_URL ||
  (__DEV__ ? 'http://localhost:4008' : 'https://rez-event-platform.onrender.com');

// Merchant App Webhooks
const WEBHOOKS = {
  INVENTORY: '/webhook/merchant/inventory',
  ORDER: '/webhook/merchant/order',
  PAYMENT: '/webhook/merchant/payment',
  CUSTOMER: '/webhook/merchant/customer',
};

// Consumer App Webhooks
const CONSUMER_WEBHOOKS = {
  ORDER: '/webhook/consumer/order',
  SEARCH: '/webhook/consumer/search',
  VIEW: '/webhook/consumer/view',
  BOOKING: '/webhook/consumer/booking',
};

/**
 * Send event to ReZ Mind
 */
async function sendEvent(endpoint: string, data: any): Promise<{ success: boolean; correlation_id?: string }> {
  try {
    const response = await axios.post(`${EVENT_PLATFORM_URL}${endpoint}`, {
      ...data,
      source: 'merchant_app',
      timestamp: new Date().toISOString(),
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Handle both camelCase and snake_case response formats
    return {
      success: response.data.success !== false,
      correlation_id: response.data.correlationId || response.data.correlation_id,
    };
  } catch (error: any) {
    console.error('[ReZ Mind] Event failed:', error.message);
    return { success: false };
  }
}

/**
 * ReZ Mind for Merchant Apps
 */
export const rezMindMerchant = {
  /**
   * Send inventory low event
   * Call when stock falls below threshold
   */
  async sendInventoryLow(data: {
    merchant_id: string;
    item_id: string;
    item_name?: string;
    current_stock: number;
    threshold: number;
    avg_daily_sales?: number;
    recent_orders?: number;
    unit_price?: number;
  }) {
    return sendEvent(WEBHOOKS.INVENTORY, {
      merchant_id: data.merchant_id,
      item_id: data.item_id,
      item_name: data.item_name,
      current_stock: data.current_stock,
      threshold: data.threshold,
      avg_daily_sales: data.avg_daily_sales,
      recent_orders: data.recent_orders,
    });
  },

  /**
   * Send order completed event
   * Call when order is completed
   */
  async sendOrderCompleted(data: {
    merchant_id: string;
    order_id: string;
    customer_id: string;
    items: Array<{ item_id: string; quantity: number; price: number; name?: string }>;
    total_amount: number;
    payment_method: string;
  }) {
    return sendEvent(WEBHOOKS.ORDER, {
      merchant_id: data.merchant_id,
      order_id: data.order_id,
      customer_id: data.customer_id,
      items: data.items,
      total_amount: data.total_amount,
      payment_method: data.payment_method,
    });
  },

  /**
   * Send payment success event
   * Call when payment is confirmed
   */
  async sendPaymentSuccess(data: {
    merchant_id: string;
    transaction_id: string;
    amount: number;
    order_id?: string;
  }) {
    return sendEvent(WEBHOOKS.PAYMENT, {
      merchant_id: data.merchant_id,
      transaction_id: data.transaction_id,
      amount: data.amount,
      order_id: data.order_id,
    });
  },

  /**
   * Send customer event
   * Call when customer behavior is detected
   */
  async sendCustomerEvent(data: {
    merchant_id: string;
    customer_id: string;
    event_type: 'visit' | 'loyal' | 'new' | 'returning';
    order_count?: number;
    total_spent?: number;
  }) {
    return sendEvent(WEBHOOKS.CUSTOMER, {
      merchant_id: data.merchant_id,
      customer_id: data.customer_id,
      event_type: data.event_type,
      order_count: data.order_count,
      total_spent: data.total_spent,
    });
  },
};

/**
 * ReZ Mind for Consumer Apps
 */
export const rezMindConsumer = {
  /**
   * Send order placed event
   */
  async sendOrder(data: {
    user_id: string;
    order_id: string;
    merchant_id: string;
    items: Array<{ item_id: string; quantity: number; price: number; name?: string }>;
    total_amount: number;
  }) {
    return sendEvent(CONSUMER_WEBHOOKS.ORDER, {
      user_id: data.user_id,
      order_id: data.order_id,
      merchant_id: data.merchant_id,
      items: data.items,
      total_amount: data.total_amount,
    });
  },

  /**
   * Send search event
   */
  async sendSearch(data: {
    user_id: string;
    query: string;
    results_count?: number;
    clicked_item?: string;
  }) {
    return sendEvent(CONSUMER_WEBHOOKS.SEARCH, {
      user_id: data.user_id,
      query: data.query,
      results_count: data.results_count,
      clicked_item: data.clicked_item,
    });
  },

  /**
   * Send item view event
   */
  async sendView(data: {
    user_id: string;
    item_id: string;
    item_name?: string;
    merchant_id?: string;
    duration_seconds?: number;
  }) {
    return sendEvent(CONSUMER_WEBHOOKS.VIEW, {
      user_id: data.user_id,
      item_id: data.item_id,
      item_name: data.item_name,
      merchant_id: data.merchant_id,
      duration_seconds: data.duration_seconds,
    });
  },

  /**
   * Send booking event
   */
  async sendBooking(data: {
    user_id: string;
    booking_id: string;
    service_type: string;
    merchant_id?: string;
    amount?: number;
  }) {
    return sendEvent(CONSUMER_WEBHOOKS.BOOKING, {
      user_id: data.user_id,
      booking_id: data.booking_id,
      service_type: data.service_type,
      merchant_id: data.merchant_id,
      amount: data.amount,
    });
  },
};

// Default export
export const rezMind = {
  merchant: rezMindMerchant,
  consumer: rezMindConsumer,
};

export default rezMind;
