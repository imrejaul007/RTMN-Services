/**
 * HOJAI Merchant Bridge - Order Service
 * Order creation and management
 */
import axios from 'axios';
import type { Order, OrderItem, OrderStatus } from './types.js';

const ORDER_API_URL = process.env.REZ_ORDER_URL || 'http://localhost:4006';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

export interface CreateOrderInput {
  merchantId: string;
  customerId: string;
  customerPhone: string;
  type: 'delivery' | 'pickup' | 'dinein' | 'table';
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
    variants?: { name: string; price: number }[];
    addons?: { name: string; price: number }[];
    notes?: string;
  }[];
  paymentMethod: 'upi' | 'card' | 'cash' | 'wallet' | 'cod';
  notes?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    pincode: string;
  };
}

export class OrderBridgeService {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = baseUrl || ORDER_API_URL;
    this.token = token || INTERNAL_TOKEN || '';
  }

  private headers() {
    return {
      'X-Internal-Token': this.token,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create new order
   */
  async create(input: CreateOrderInput): Promise<Order | null> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/api/orders`,
        {
          ...input,
          status: 'pending',
          paymentStatus: 'pending'
        },
        { headers: this.headers() }
      );
      return this.transformOrder(res.data);
    } catch (error) {
      console.error('[OrderBridge] Failed to create order:', error);
      return null;
    }
  }

  /**
   * Get order by ID
   */
  async get(orderId: string): Promise<Order | null> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/orders/${orderId}`,
        { headers: this.headers() }
      );
      return this.transformOrder(res.data);
    } catch (error) {
      console.error('[OrderBridge] Failed to get order:', error);
      return null;
    }
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    try {
      await axios.patch(
        `${this.baseUrl}/api/orders/${orderId}/status`,
        { status },
        { headers: this.headers() }
      );
      return true;
    } catch (error) {
      console.error('[OrderBridge] Failed to update status:', error);
      return false;
    }
  }

  /**
   * Get orders by merchant
   */
  async getByMerchant(merchantId: string, date?: string): Promise<Order[]> {
    try {
      const params = date ? `?date=${date}` : '';
      const res = await axios.get(
        `${this.baseUrl}/api/orders/merchant/${merchantId}${params}`,
        { headers: this.headers() }
      );
      return (res.data.orders || []).map(this.transformOrder);
    } catch (error) {
      console.error('[OrderBridge] Failed to get orders:', error);
      return [];
    }
  }

  /**
   * Get orders by customer
   */
  async getByCustomer(customerId: string): Promise<Order[]> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/orders/customer/${customerId}`,
        { headers: this.headers() }
      );
      return (res.data.orders || []).map(this.transformOrder);
    } catch (error) {
      console.error('[OrderBridge] Failed to get customer orders:', error);
      return [];
    }
  }

  /**
   * Cancel order
   */
  async cancel(orderId: string, reason?: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/api/orders/${orderId}/cancel`,
        { reason },
        { headers: this.headers() }
      );
      return true;
    } catch (error) {
      console.error('[OrderBridge] Failed to cancel order:', error);
      return false;
    }
  }

  /**
   * Process payment
   */
  async processPayment(orderId: string, paymentData: {
    method: string;
    transactionId?: string;
  }): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/api/orders/${orderId}/pay`,
        paymentData,
        { headers: this.headers() }
      );
      return true;
    } catch (error) {
      console.error('[OrderBridge] Failed to process payment:', error);
      return false;
    }
  }

  private transformOrder(data: any): Order | null {
    if (!data) return null;
    return {
      id: data._id?.toString() || data.id,
      merchantId: data.merchantId,
      customerId: data.customerId,
      type: data.type,
      status: data.status,
      items: data.items || [],
      subtotal: data.subtotal || 0,
      tax: data.tax || 0,
      deliveryFee: data.deliveryFee || 0,
      discount: data.discount || 0,
      total: data.total || 0,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus || 'pending',
      notes: data.notes,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      estimatedTime: data.estimatedTime ? new Date(data.estimatedTime) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined
    };
  }
}

export const orderBridge = new OrderBridgeService();
