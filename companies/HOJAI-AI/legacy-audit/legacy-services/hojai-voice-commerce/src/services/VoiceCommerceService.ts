/**
 * Voice Commerce Service
 *
 * Main service that orchestrates voice commerce
 */

import { v4 as uuidv4 } from 'uuid';
import { orderService } from './OrderService';
import { bookingService } from './BookingService';
import type { VoiceIntent, VoiceCart } from '../types.js';

// Product catalog (simplified)
const CATALOG: Record<string, { name: string; price: number; category: string }> = {
  'margherita_pizza': { name: 'Margherita Pizza', price: 299, category: 'food' },
  'pepperoni_pizza': { name: 'Pepperoni Pizza', price: 399, category: 'food' },
  'pasta': { name: 'Pasta', price: 249, category: 'food' },
  'salad': { name: 'Caesar Salad', price: 199, category: 'food' },
  'coke': { name: 'Coke', price: 49, category: 'beverage' },
  'coffee': { name: 'Coffee', price: 99, category: 'beverage' },
  'haircut': { name: 'Haircut', price: 299, category: 'salon' },
  'massage': { name: 'Massage', price: 799, category: 'salon' },
  'consultation': { name: 'Doctor Consultation', price: 499, category: 'clinic' },
  'checkup': { name: 'Health Checkup', price: 1499, category: 'clinic' }
};

// Sessions
const sessions = new Map<string, {
  customerId: string;
  customerPhone: string;
  cartId?: string;
  intent?: VoiceIntent;
  context: Record<string, any>;
}>();

export class VoiceCommerceService {

  /**
   * Start voice session
   */
  async startSession(customerId: string, customerPhone: string): Promise<string> {
    const sessionId = uuidv4();
    sessions.set(sessionId, {
      customerId,
      customerPhone,
      context: {}
    });

    // Create cart
    const cart = await orderService.createCart({
      customerId,
      customerPhone,
      channel: 'voice'
    });

    sessions.get(sessionId)!.cartId = cart.cartId;
    return sessionId;
  }

  /**
   * Process voice command
   */
  async processCommand(sessionId: string, text: string): Promise<{
    response: string;
    action?: string;
    data?: any;
  }> {
    const session = sessions.get(sessionId);
    if (!session) {
      return { response: 'Session not found. Please start again.' };
    }

    const lower = text.toLowerCase();

    // Intent detection (simplified)
    if (lower.includes('order') || lower.includes('want') || lower.includes('get')) {
      return this.handleOrder(session, text);
    }

    if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) {
      return this.handleBooking(session, text);
    }

    if (lower.includes('pay') || lower.includes('checkout')) {
      return this.handleCheckout(session);
    }

    if (lower.includes('cancel')) {
      return this.handleCancel(session);
    }

    if (lower.includes('status') || lower.includes('where')) {
      return this.handleStatus(session);
    }

    if (lower.includes('help')) {
      return {
        response: 'I can help you with:\n• Ordering food\n• Booking appointments\n• Checking status\n• Making payments\n\nWhat would you like to do?'
      };
    }

    // Default - try to add to cart
    return this.handleAddToCart(session, text);
  }

  /**
   * Handle order intent
   */
  private async handleOrder(session: any, text: string): Promise<any> {
    // Parse items from text
    const items = this.parseItems(text);

    if (items.length === 0) {
      return {
        response: 'What would you like to order? We have pizzas, pasta, drinks, and more!'
      };
    }

    // Add to cart
    for (const item of items) {
      await orderService.addItem(session.cartId!, item);
    }

    const cart = await orderService.getCart(session.cartId!);
    const itemList = cart!.items.map(i => `${i.name} (₹${i.price})`).join(', ');

    return {
      response: `Added to your order: ${itemList}\n\nTotal: ₹${cart!.total}\n\nWould you like to checkout or add more items?`,
      action: 'order_added',
      data: { items: cart!.items }
    };
  }

  /**
   * Handle add to cart
   */
  private async handleAddToCart(session: any, text: string): Promise<any> {
    const items = this.parseItems(text);

    if (items.length === 0) {
      return {
        response: "I didn't understand that. Would you like to order something?"
      };
    }

    for (const item of items) {
      await orderService.addItem(session.cartId!, item);
    }

    const cart = await orderService.getCart(session.cartId!);

    return {
      response: `Added ${items.map(i => i.name).join(', ')} to your cart.\n\nSubtotal: ₹${cart!.subtotal}\n\nCheckout?`,
      action: 'item_added',
      data: { cart }
    };
  }

  /**
   * Handle booking intent
   */
  private async handleBooking(session: any, text: string): Promise<any> {
    const lower = text.toLowerCase();

    let service: any = 'clinic';
    if (lower.includes('salon') || lower.includes('haircut')) service = 'salon';
    if (lower.includes('hotel')) service = 'hotel';
    if (lower.includes('ride') || lower.includes('cab')) service = 'ride';

    const booking = await bookingService.createBooking({
      customerId: session.customerId,
      customerPhone: session.customerPhone,
      service,
      details: { source: 'voice', originalText: text },
      datetime: new Date(Date.now() + 86400000), // Tomorrow
      channel: 'voice'
    });

    await bookingService.confirm(booking.bookingId);

    return {
      response: `Your ${service} appointment is confirmed for tomorrow. You'll receive a confirmation message shortly.`,
      action: 'booking_confirmed',
      data: { booking }
    };
  }

  /**
   * Handle checkout
   */
  private async handleCheckout(session: any): Promise<any> {
    const cart = await orderService.getCart(session.cartId!);
    if (!cart || cart.items.length === 0) {
      return { response: 'Your cart is empty. Would you like to order something?' };
    }

    const order = await orderService.checkout(session.cartId!, 'upi');

    return {
      response: `Order #${order!.orderId.slice(0, 8)} placed!\n\nTotal: ₹${order!.total}\n\nI'll send you a payment link. Would you like to pay now?`,
      action: 'checkout_initiated',
      data: { order }
    };
  }

  /**
   * Handle cancel
   */
  private async handleCancel(session: any): Promise<any> {
    if (session.cartId) {
      const cart = await orderService.getCart(session.cartId!);
      if (cart && cart.status === 'active') {
        cart.status = 'abandoned';
        return { response: 'Your order has been cancelled.' };
      }
    }

    return { response: "I couldn't find an active order to cancel." };
  }

  /**
   * Handle status check
   */
  private async handleStatus(session: any): Promise<any> {
    const orders = await orderService.getCustomerOrders(session.customerId);
    const latest = orders[orders.length - 1];

    if (!latest) {
      return { response: "You don't have any orders yet." };
    }

    return {
      response: `Your latest order #${latest.orderId.slice(0, 8)} is ${latest.status}. Total: ₹${latest.total}`
    };
  }

  /**
   * Parse items from text
   */
  private parseItems(text: string): any[] {
    const items: any[] = [];
    const lower = text.toLowerCase();

    // Check catalog
    for (const [id, product] of Object.entries(CATALOG)) {
      if (lower.includes(id.replace('_', ' ')) || lower.includes(product.name.toLowerCase())) {
        items.push({
          productId: id,
          name: product.name,
          price: product.price,
          quantity: 1
        });
      }
    }

    // Handle quantities
    const qtyMatch = lower.match(/(\d+)\s*(pizza|item|order)/);
    if (qtyMatch && items.length > 0) {
      items[0].quantity = parseInt(qtyMatch[1]);
    }

    return items;
  }

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<void> {
    sessions.delete(sessionId);
  }

  /**
   * Get analytics
   */
  async getAnalytics() {
    return {
      orders: await orderService.getAnalytics(),
      bookings: await bookingService.getAnalytics()
    };
  }
}

export const voiceCommerceService = new VoiceCommerceService();
