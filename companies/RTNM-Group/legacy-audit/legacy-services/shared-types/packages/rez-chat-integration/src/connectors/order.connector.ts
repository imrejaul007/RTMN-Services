// ── Order Connector ──────────────────────────────────────────────────────────────────
// Connects to rez-order-service

import axios, { AxiosInstance } from 'axios';

export interface CartItem {
  productId: string;
  quantity: number;
  notes?: string;
  variantId?: string;
  addOns?: string[];
}

export interface AddToCartResult {
  cartId: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  merchantName: string;
}

export interface PlaceOrderParams {
  userId: string;
  cartId: string;
  deliveryAddress?: string;
  deliveryTime?: string;
  paymentMethod: 'card' | 'upi' | 'wallet' | 'cod';
  couponCode?: string;
}

export interface OrderResult {
  orderId: string;
  orderRef: string;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentStatus: string;
  estimatedDelivery?: string;
}

export interface OrderDetails {
  orderId: string;
  orderRef: string;
  status: string;
  statusText: string;
  merchant: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  delivery?: {
    address: string;
    type: 'delivery' | 'pickup';
    estimatedTime?: string;
    driverName?: string;
    driverPhone?: string;
  };
  pricing: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    discount: number;
    total: number;
  };
  payment: {
    method: string;
    status: string;
    transactionId?: string;
  };
  timeline: Array<{
    status: string;
    timestamp: string;
    message: string;
  }>;
}

export interface OrderHistoryItem {
  orderId: string;
  orderRef: string;
  date: string;
  merchantName: string;
  status: string;
  total: number;
  items: number;
}

export class OrderConnector {
  private client: AxiosInstance;

  constructor(config?: { baseUrl?: string; apiKey?: string }) {
    const baseURL = config?.baseUrl || process.env.ORDER_SERVICE_URL || 'https://rez-order-service.onrender.com';
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config?.apiKey && { 'x-api-key': config.apiKey }),
      },
    });
  }

  /**
   * Add items to cart
   */
  async addToCart(params: {
    userId: string;
    merchantId: string;
    items: CartItem[];
    specialInstructions?: string;
  }): Promise<AddToCartResult | null> {
    try {
      const response = await this.client.post('/v1/cart/add', {
        userId: params.userId,
        merchantId: params.merchantId,
        items: params.items,
        instructions: params.specialInstructions,
      });

      const data = response.data;

      return {
        cartId: data.cartId || data.id,
        items: (data.items || []).map((item: any) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        total: data.total || 0,
        merchantName: data.merchantName || 'Restaurant',
      };
    } catch (error: any) {
      console.error('[OrderConnector] Add to cart error:', error.message);
      return null;
    }
  }

  /**
   * Get cart
   */
  async getCart(userId: string): Promise<AddToCartResult | null> {
    try {
      const response = await this.client.get('/v1/cart', {
        params: { userId },
      });

      const data = response.data;

      return {
        cartId: data.cartId || data.id,
        items: (data.items || []).map((item: any) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        total: data.total || 0,
        merchantName: data.merchantName || '',
      };
    } catch (error: any) {
      console.error('[OrderConnector] Get cart error:', error.message);
      return null;
    }
  }

  /**
   * Place order
   */
  async placeOrder(params: PlaceOrderParams): Promise<OrderResult | null> {
    try {
      const response = await this.client.post('/v1/orders/place', {
        userId: params.userId,
        cartId: params.cartId,
        deliveryAddress: params.deliveryAddress,
        deliveryTime: params.deliveryTime,
        paymentMethod: params.paymentMethod,
        couponCode: params.couponCode,
        source: 'rez-chat',
      });

      const data = response.data;

      return {
        orderId: data.id || data.orderId,
        orderRef: data.orderRef || data.orderNumber,
        status: data.status,
        items: (data.items || []).map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        deliveryFee: data.deliveryFee || 0,
        discount: data.discount || 0,
        total: data.total || 0,
        paymentStatus: data.paymentStatus || 'pending',
        estimatedDelivery: data.estimatedDelivery,
      };
    } catch (error: any) {
      console.error('[OrderConnector] Place order error:', error.message);
      return null;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<OrderDetails | null> {
    try {
      const response = await this.client.get(`/v1/orders/${orderId}`);
      const data = response.data;

      return {
        orderId: data.id,
        orderRef: data.orderRef || data.orderNumber,
        status: data.status,
        statusText: this.getStatusText(data.status),
        merchant: {
          id: data.merchant?._id || data.merchantId,
          name: data.merchant?.name || 'Restaurant',
          address: data.merchant?.address || '',
          phone: data.merchant?.phone || '',
        },
        items: (data.items || []).map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        })),
        delivery: data.delivery ? {
          address: data.delivery.address || data.deliveryAddress,
          type: data.delivery.type || 'delivery',
          estimatedTime: data.delivery.estimatedTime,
          driverName: data.delivery.driverName,
          driverPhone: data.delivery.driverPhone,
        } : undefined,
        pricing: {
          subtotal: data.subtotal || 0,
          tax: data.tax || 0,
          deliveryFee: data.deliveryFee || 0,
          discount: data.discount || 0,
          total: data.total || 0,
        },
        payment: {
          method: data.paymentMethod || data.payment?.method || 'unknown',
          status: data.paymentStatus || 'pending',
          transactionId: data.transactionId,
        },
        timeline: (data.timeline || data.statusHistory || []).map((t: any) => ({
          status: t.status,
          timestamp: t.timestamp || t.createdAt,
          message: t.message || this.getStatusText(t.status),
        })),
      };
    } catch (error: any) {
      console.error('[OrderConnector] Get order status error:', error.message);
      return null;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; message: string; refundAmount?: number }> {
    try {
      const response = await this.client.post(`/v1/orders/${orderId}/cancel`, {
        reason,
        cancelledBy: 'user',
      });

      const data = response.data;

      return {
        success: true,
        message: data.message || 'Order cancelled',
        refundAmount: data.refundAmount,
      };
    } catch (error: any) {
      console.error('[OrderConnector] Cancel order error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Unable to cancel order',
      };
    }
  }

  /**
   * Get order history
   */
  async getOrderHistory(userId: string, limit?: number): Promise<OrderHistoryItem[]> {
    try {
      const response = await this.client.get('/v1/orders/history', {
        params: { userId, limit: limit || 20 },
      });

      const orders = response.data.orders || response.data || [];

      return orders.map((o: any) => ({
        orderId: o.id,
        orderRef: o.orderRef || o.orderNumber,
        date: o.createdAt || o.date,
        merchantName: o.merchant?.name || o.merchantName || 'Restaurant',
        status: o.status,
        total: o.total || 0,
        items: o.items?.length || 0,
      }));
    } catch (error: any) {
      console.error('[OrderConnector] Get order history error:', error.message);
      return [];
    }
  }

  /**
   * Reorder from previous order
   */
  async reorder(userId: string, orderId: string, deliveryAddress?: string): Promise<OrderResult | null> {
    try {
      const response = await this.client.post('/v1/orders/reorder', {
        userId,
        orderId,
        deliveryAddress,
        source: 'rez-chat',
      });

      const data = response.data;

      return {
        orderId: data.id || data.orderId,
        orderRef: data.orderRef || data.orderNumber,
        status: data.status,
        items: (data.items || []).map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        deliveryFee: data.deliveryFee || 0,
        discount: data.discount || 0,
        total: data.total || 0,
        paymentStatus: data.paymentStatus || 'pending',
        estimatedDelivery: data.estimatedDelivery,
      };
    } catch (error: any) {
      console.error('[OrderConnector] Reorder error:', error.message);
      return null;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      placed: 'Order placed',
      confirmed: 'Order confirmed',
      preparing: 'Being prepared',
      ready: 'Ready for pickup',
      dispatched: 'Out for delivery',
      out_for_delivery: 'Out for delivery',
      delivered: 'Delivered',
      cancelling: 'Cancellation requested',
      cancelled: 'Cancelled',
      return_requested: 'Return requested',
      returned: 'Returned',
      refunded: 'Refunded',
      partially_refunded: 'Partially refunded',
    };
    return statusMap[status] || status;
  }
}
