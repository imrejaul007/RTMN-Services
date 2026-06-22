/**
 * Voice Order Service
 *
 * Handles voice-initiated orders
 */

import { v4 as uuidv4 } from 'uuid';
import { VoiceOrder, VoiceOrderItem, VoiceCart } from '../types.js';

// In-memory storage (replace with MongoDB)
const orders = new Map<string, VoiceOrder>();
const carts = new Map<string, VoiceCart>();

export class OrderService {

  /**
   * Create cart from voice command
   */
  async createCart(data: {
    customerId: string;
    customerPhone: string;
    channel: 'voice' | 'whatsapp' | 'chat';
  }): Promise<VoiceCart> {
    const cartId = uuidv4();

    const cart: VoiceCart = {
      cartId,
      customerId: data.customerId,
      customerPhone: data.customerPhone,
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      status: 'active',
      channel: data.channel
    };

    carts.set(cartId, cart);
    return cart;
  }

  /**
   * Add item to cart
   */
  async addItem(cartId: string, item: VoiceOrderItem): Promise<VoiceCart | null> {
    const cart = carts.get(cartId);
    if (!cart) return null;

    cart.items.push(item);
    cart.subtotal = cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    cart.total = cart.subtotal - cart.discount;

    carts.set(cartId, cart);
    return cart;
  }

  /**
   * Get cart
   */
  async getCart(cartId: string): Promise<VoiceCart | null> {
    return carts.get(cartId) || null;
  }

  /**
   * Checkout cart
   */
  async checkout(cartId: string, paymentMethod: 'upi' | 'cod' | 'card'): Promise<VoiceOrder | null> {
    const cart = carts.get(cartId);
    if (!cart || cart.items.length === 0) return null;

    const orderId = uuidv4();
    const orderNumber = `VO-${Date.now().toString(36).toUpperCase()}`;

    const order: VoiceOrder = {
      orderId,
      customerId: cart.customerId,
      customerPhone: cart.customerPhone,
      items: cart.items,
      total: cart.total,
      paymentMethod,
      paymentStatus: 'pending',
      status: 'pending',
      channel: cart.channel,
      createdAt: new Date()
    };

    orders.set(orderId, order);
    cart.status = 'checked_out';
    carts.set(cartId, cart);

    return order;
  }

  /**
   * Confirm payment
   */
  async confirmPayment(orderId: string, transactionId: string): Promise<boolean> {
    const order = orders.get(orderId);
    if (!order) return false;

    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    orders.set(orderId, order);

    return true;
  }

  /**
   * Get order
   */
  async getOrder(orderId: string): Promise<VoiceOrder | null> {
    return orders.get(orderId) || null;
  }

  /**
   * Get customer orders
   */
  async getCustomerOrders(customerId: string): Promise<VoiceOrder[]> {
    return Array.from(orders.values()).filter(o => o.customerId === customerId);
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: string, status: VoiceOrder['status']): Promise<boolean> {
    const order = orders.get(orderId);
    if (!order) return false;

    order.status = status;
    orders.set(orderId, order);
    return true;
  }

  /**
   * Get analytics
   */
  async getAnalytics(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
    averageOrderValue: number;
    byChannel: Record<string, number>;
  }> {
    const allOrders = Array.from(orders.values());

    const totalOrders = allOrders.length;
    const totalRevenue = allOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
    const completedOrders = allOrders.filter(o => o.status === 'delivered').length;

    const byChannel: Record<string, number> = {};
    allOrders.forEach(o => {
      byChannel[o.channel] = (byChannel[o.channel] || 0) + 1;
    });

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      byChannel
    };
  }
}

export const orderService = new OrderService();
