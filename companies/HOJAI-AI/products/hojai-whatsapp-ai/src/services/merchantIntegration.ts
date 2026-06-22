/**
 * HOJAI WhatsApp AI - REZ Merchant Integration
 * Connects WhatsApp AI to REZ Merchant platform
 */
import { merchantBridge, orderBridge, bookingBridge, inventoryBridge } from '../../hojai-merchant-bridge/src/index.js';
import type { Merchant, Customer, MenuItem, Order, Booking, TimeSlot } from '../../hojai-merchant-bridge/src/types.js';

export interface AIContext {
  merchant: Merchant;
  customer?: Customer;
  menu: MenuItem[];
  orders: Order[];
  availability: {
    tables: any[];
    slots: TimeSlot[];
  };
  message: string;
  intent: string;
}

export class MerchantIntegration {
  /**
   * Get complete context for AI processing
   */
  async getContext(merchantId: string, customerPhone: string): Promise<AIContext | null> {
    try {
      const [merchant, customer, menu] = await Promise.all([
        merchantBridge.getMerchant(merchantId),
        merchantBridge.getCustomerByPhone(merchantId, customerPhone),
        merchantBridge.getMenu(merchantId)
      ]);

      if (!merchant) {
        console.error('[MerchantIntegration] Merchant not found:', merchantId);
        return null;
      }

      // Get customer's recent orders if customer exists
      let orders: Order[] = [];
      if (customer) {
        orders = await merchantBridge.getCustomerOrders(merchantId, customer.id);
      }

      // Get availability for booking-type businesses
      let slots: TimeSlot[] = [];
      if (merchant.features.booking) {
        const today = new Date().toISOString().split('T')[0];
        slots = await bookingBridge.getAvailableSlots(merchantId, today, 2, merchant.businessType);
      }

      return {
        merchant,
        customer: customer || undefined,
        menu,
        orders,
        availability: {
          tables: [],
          slots
        },
        message: '',
        intent: ''
      };
    } catch (error) {
      console.error('[MerchantIntegration] Failed to get context:', error);
      return null;
    }
  }

  /**
   * Process order from WhatsApp
   */
  async processOrder(params: {
    merchantId: string;
    customerPhone: string;
    items: { menuItemId: string; name: string; quantity: number; price: number }[];
    type: 'delivery' | 'pickup' | 'dinein' | 'table';
    notes?: string;
  }): Promise<Order | null> {
    try {
      // Find or create customer
      const customer = await merchantBridge.findOrCreateCustomer(
        params.merchantId,
        params.customerPhone
      );

      if (!customer) {
        console.error('[MerchantIntegration] Failed to get customer');
        return null;
      }

      // Create order
      const order = await orderBridge.create({
        merchantId: params.merchantId,
        customerId: customer.id,
        customerPhone: params.customerPhone,
        type: params.type,
        items: params.items,
        paymentMethod: 'upi',
        notes: params.notes
      });

      if (order) {
        // Emit event
        console.log('[MerchantIntegration] Order created:', order.id);
      }

      return order;
    } catch (error) {
      console.error('[MerchantIntegration] Failed to create order:', error);
      return null;
    }
  }

  /**
   * Process booking from WhatsApp
   */
  async processBooking(params: {
    merchantId: string;
    customerName: string;
    customerPhone: string;
    date: string;
    time: string;
    guests: number;
    type: 'salon' | 'restaurant' | 'clinic' | 'hotel';
    service?: string;
    notes?: string;
  }): Promise<Booking | null> {
    try {
      const booking = await bookingBridge.create(params);

      if (booking) {
        console.log('[MerchantIntegration] Booking created:', booking.id);
      }

      return booking;
    } catch (error) {
      console.error('[MerchantIntegration] Failed to create booking:', error);
      return null;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    return orderBridge.updateStatus(orderId, status);
  }

  /**
   * Get available time slots
   */
  async getAvailableSlots(merchantId: string, date: string, guests: number, type: string): Promise<TimeSlot[]> {
    return bookingBridge.getAvailableSlots(merchantId, date, guests, type);
  }

  /**
   * Search menu items
   */
  async searchMenu(merchantId: string, query: string): Promise<MenuItem[]> {
    return merchantBridge.searchMenu(merchantId, query);
  }

  /**
   * Add loyalty points
   */
  async addLoyaltyPoints(merchantId: string, customerId: string, points: number): Promise<boolean> {
    return merchantBridge.updateCustomerLoyalty(merchantId, customerId, points);
  }

  /**
   * Format order for WhatsApp message
   */
  formatOrderMessage(order: Order): string {
    let message = `*Order Confirmed!*\n\n`;
    message += `Order ID: ${order.id.slice(-6).toUpperCase()}\n`;
    message += `Type: ${order.type}\n\n`;

    message += `*Items:*\n`;
    for (const item of order.items) {
      message += `• ${item.quantity}x ${item.name} - ₹${item.price * item.quantity}\n`;
    }

    message += `\n*Total: ₹${order.total}*\n`;
    message += `Status: ${order.status}\n`;

    if (order.estimatedTime) {
      message += `ETA: ${new Date(order.estimatedTime).toLocaleTimeString()}`;
    }

    return message;
  }

  /**
   * Format booking for WhatsApp message
   */
  formatBookingMessage(booking: Booking): string {
    let message = `*Booking Confirmed!*\n\n`;
    message += `Date: ${booking.date}\n`;
    message += `Time: ${booking.time}\n`;
    message += `Guests: ${booking.guests}\n`;

    if (booking.service) {
      message += `Service: ${booking.service}\n`;
    }

    message += `\nSee you soon! 🙏`;

    return message;
  }
}

export const merchantIntegration = new MerchantIntegration();
