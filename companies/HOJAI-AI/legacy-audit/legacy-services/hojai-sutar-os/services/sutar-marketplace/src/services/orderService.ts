// ============================================================================
// SUTAR Marketplace - Order Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { storage, COLLECTIONS } from './storage';
import { economyOS } from './economyOS';
import { serviceCatalog } from './serviceCatalog';
import { pricingPlans } from './pricingService';
import {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Address,
} from './types';

export interface CreateOrderInput {
  userId: string;
  userEmail: string;
  items: {
    serviceId: string;
    planId: string;
    quantity?: number;
  }[];
  billingAddress?: Address;
  shippingAddress?: Address;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export class OrderService {
  // Create a new order
  public async createOrder(input: CreateOrderInput): Promise<Order> {
    const items: OrderItem[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      const service = serviceCatalog.getService(item.serviceId);
      const plan = pricingPlans.getPlan(item.planId);

      if (!service) {
        throw new Error(`Service not found: ${item.serviceId}`);
      }

      if (!plan) {
        throw new Error(`Plan not found: ${item.planId}`);
      }

      const quantity = item.quantity || 1;
      const unitPrice = plan.price;
      const totalPrice = unitPrice * quantity;

      items.push({
        id: `item-${uuidv4()}`,
        serviceId: service.id,
        serviceName: service.name,
        planId: plan.id,
        planName: plan.name,
        quantity,
        unitPrice,
        totalPrice,
        status: 'active',
        metadata: {},
      });

      subtotal += totalPrice;
    }

    // Calculate tax (18% GST for India)
    const taxRate = 0.18;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const discount = 0;
    const total = subtotal + tax - discount;

    const order: Order = {
      id: `order-${uuidv4()}`,
      orderNumber: this.generateOrderNumber(),
      userId: input.userId,
      userEmail: input.userEmail,
      items,
      subtotal,
      tax,
      discount,
      total,
      currency: 'INR',
      status: 'pending',
      paymentStatus: 'pending',
      billingAddress: input.billingAddress,
      shippingAddress: input.shippingAddress,
      notes: input.notes,
      metadata: input.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.create(COLLECTIONS.ORDERS, order);
    console.log(`[ORDER] Created order: ${order.id} - ${order.orderNumber}`);

    return order;
  }

  // Get order by ID
  public getOrder(id: string): Order | undefined {
    return storage.get<Order>(COLLECTIONS.ORDERS, id);
  }

  // Get order by order number
  public getOrderByNumber(orderNumber: string): Order | undefined {
    return storage.findOne<Order>(
      COLLECTIONS.ORDERS,
      o => o.orderNumber === orderNumber
    );
  }

  // Update order
  public updateOrder(id: string, updates: Partial<Order>): Order | undefined {
    const order = this.getOrder(id);
    if (!order) return undefined;

    const updated: Order = {
      ...order,
      ...updates,
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      updatedAt: new Date().toISOString(),
    };

    storage.update(COLLECTIONS.ORDERS, id, updated);
    console.log(`[ORDER] Updated order: ${id}`);

    return updated;
  }

  // Update order status
  public updateOrderStatus(id: string, status: OrderStatus): Order | undefined {
    const updates: Partial<Order> = { status };

    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
    } else if (status === 'cancelled') {
      updates.cancelledAt = new Date().toISOString();
    }

    return this.updateOrder(id, updates);
  }

  // Update payment status
  public updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Order | undefined {
    return this.updateOrder(id, { paymentStatus });
  }

  // Cancel order
  public async cancelOrder(id: string, reason?: string): Promise<Order | undefined> {
    const order = this.getOrder(id);
    if (!order) return undefined;

    if (order.status === 'completed') {
      throw new Error('Cannot cancel a completed order');
    }

    if (order.status === 'cancelled') {
      throw new Error('Order is already cancelled');
    }

    // Refund if payment was made
    if (order.paymentStatus === 'completed' && order.total > 0) {
      const refundResult = await economyOS.processRefund(
        order.userId,
        order.total,
        order.id,
        reason || 'Order cancelled by user'
      );

      if (!refundResult.success) {
        console.error(`[ORDER] Refund failed for order ${id}:`, refundResult.error);
      }
    }

    // Cancel all items
    const cancelledItems = order.items.map(item => ({
      ...item,
      status: 'cancelled' as const,
    }));

    return this.updateOrder(id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      items: cancelledItems,
      notes: order.notes ? `${order.notes}\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`,
    });
  }

  // Get orders by user
  public getOrdersByUser(userId: string, params: {
    status?: OrderStatus;
    limit?: number;
    offset?: number;
  } = {}): { orders: Order[]; total: number } {
    const { status, limit = 50, offset = 0 } = params;
    let orders = storage.find<Order>(
      COLLECTIONS.ORDERS,
      o => o.userId === userId
    );

    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    // Sort by created date descending
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      orders: orders.slice(offset, offset + limit),
      total: orders.length,
    };
  }

  // Get orders by service
  public getOrdersByService(serviceId: string, params: {
    status?: OrderStatus;
    limit?: number;
    offset?: number;
  } = {}): { orders: Order[]; total: number } {
    const { status, limit = 50, offset = 0 } = params;
    let orders = storage.find<Order>(
      COLLECTIONS.ORDERS,
      o => o.items.some(item => item.serviceId === serviceId)
    );

    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      orders: orders.slice(offset, offset + limit),
      total: orders.length,
    };
  }

  // Get all orders (admin)
  public getAllOrders(params: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): { orders: Order[]; total: number } {
    const { status, paymentStatus, startDate, endDate, limit = 100, offset = 0 } = params;
    let orders = storage.getAll<Order>(COLLECTIONS.ORDERS);

    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    if (paymentStatus) {
      orders = orders.filter(o => o.paymentStatus === paymentStatus);
    }

    if (startDate) {
      orders = orders.filter(o => new Date(o.createdAt) >= new Date(startDate));
    }

    if (endDate) {
      orders = orders.filter(o => new Date(o.createdAt) <= new Date(endDate));
    }

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      orders: orders.slice(offset, offset + limit),
      total: orders.length,
    };
  }

  // Add item to order
  public addItem(orderId: string, item: {
    serviceId: string;
    planId: string;
    quantity?: number;
  }): Order | undefined {
    const order = this.getOrder(orderId);
    if (!order) return undefined;

    if (order.status !== 'pending') {
      throw new Error('Can only add items to pending orders');
    }

    const service = serviceCatalog.getService(item.serviceId);
    const plan = pricingPlans.getPlan(item.planId);

    if (!service || !plan) {
      throw new Error('Invalid service or plan');
    }

    const quantity = item.quantity || 1;
    const unitPrice = plan.price;
    const totalPrice = unitPrice * quantity;

    const newItem: OrderItem = {
      id: `item-${uuidv4()}`,
      serviceId: service.id,
      serviceName: service.name,
      planId: plan.id,
      planName: plan.name,
      quantity,
      unitPrice,
      totalPrice,
      status: 'active',
      metadata: {},
    };

    const newItems = [...order.items, newItem];
    const newSubtotal = newItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const newTax = Math.round(newSubtotal * 0.18 * 100) / 100;
    const newTotal = newSubtotal + newTax - order.discount;

    return this.updateOrder(orderId, {
      items: newItems,
      subtotal: newSubtotal,
      tax: newTax,
      total: newTotal,
    });
  }

  // Remove item from order
  public removeItem(orderId: string, itemId: string): Order | undefined {
    const order = this.getOrder(orderId);
    if (!order) return undefined;

    if (order.status !== 'pending') {
      throw new Error('Can only remove items from pending orders');
    }

    const newItems = order.items.filter(i => i.id !== itemId);
    const newSubtotal = newItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const newTax = Math.round(newSubtotal * 0.18 * 100) / 100;
    const newTotal = newSubtotal + newTax - order.discount;

    return this.updateOrder(orderId, {
      items: newItems,
      subtotal: newSubtotal,
      tax: newTax,
      total: newTotal,
    });
  }

  // Apply discount
  public applyDiscount(orderId: string, discountAmount: number, code?: string): Order | undefined {
    const order = this.getOrder(orderId);
    if (!order) return undefined;

    const newDiscount = order.discount + discountAmount;
    const newTotal = order.subtotal + order.tax - newDiscount;

    return this.updateOrder(orderId, {
      discount: newDiscount,
      total: newTotal,
      metadata: {
        ...order.metadata,
        discountCode: code,
      },
    });
  }

  // Complete order
  public completeOrder(id: string): Order | undefined {
    return this.updateOrder(id, {
      status: 'completed',
      paymentStatus: 'completed',
      completedAt: new Date().toISOString(),
    });
  }

  // Get order statistics
  public getOrderStatistics(params: {
    startDate?: string;
    endDate?: string;
  } = {}): {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  } {
    let orders = storage.getAll<Order>(COLLECTIONS.ORDERS);

    if (params.startDate) {
      orders = orders.filter(o => new Date(o.createdAt) >= new Date(params.startDate!));
    }

    if (params.endDate) {
      orders = orders.filter(o => new Date(o.createdAt) <= new Date(params.endDate!));
    }

    const completedOrders = orders.filter(o => o.status === 'completed');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const averageOrderValue = completedOrders.length > 0
      ? totalRevenue / completedOrders.length
      : 0;

    return {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalRevenue,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    };
  }

  // Generate order number
  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `ORD${year}${month}${day}${random}`;
  }

  // Validate order
  public validateOrder(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.userId) {
      errors.push('User ID is required');
    }

    if (!data.userEmail) {
      errors.push('User email is required');
    }

    if (!data.items || data.items.length === 0) {
      errors.push('At least one item is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
export const orderService = new OrderService();