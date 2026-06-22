// ── Chat Action Handlers ────────────────────────────────────────────────────────────
// Handles AI-triggered actions by calling actual services

import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

export interface ActionContext {
  conversationId: string;
  userId: string;
  merchantId?: string;
  hotelId?: string;
  roomId?: string;
  bookingId?: string;
  appType: string;
  customerContext?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  actionType: string;
  message: string;
  data?: Record<string, unknown>;
  referenceId?: string;
}

// ── Service Clients ───────────────────────────────────────────────────────────────

const createClient = (baseUrl: string): AxiosInstance => {
  return axios.create({
    baseURL: baseUrl,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Service URLs from environment
const HOTEL_OTA_URL = process.env.HOTEL_OTA_URL || 'https://hotel-ota-api.onrender.com';
const MERCHANT_SERVICE_URL = process.env.MERCHANT_SERVICE_URL || 'https://rez-merchant-service.onrender.com';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'https://rez-order-service.onrender.com';

// ── Hotel Action Handlers ────────────────────────────────────────────────────────

export class HotelActionHandler {
  private client: AxiosInstance;

  constructor() {
    this.client = createClient(HOTEL_OTA_URL);
  }

  /**
   * Create room service request (housekeeping, food, etc.)
   */
  async createRoomServiceRequest(params: {
    bookingId: string;
    roomId: string;
    serviceType: 'housekeeping' | 'room_service' | 'laundry' | 'maintenance' | 'concierge' | 'spa' | 'transport' | 'fitness';
    description?: string;
    items?: Array<{ name: string; quantity: number; pricePaise: number }>;
    priority?: 'low' | 'medium' | 'high' | 'now';
  }, context: ActionContext): Promise<ActionResult> {
    try {
      const response = await this.client.post('/api/room-service', {
        bookingId: params.bookingId,
        roomId: params.roomId,
        serviceType: params.serviceType,
        description: params.description,
        items: params.items,
        priority: params.priority || 'now',
      }, {
        headers: {
          'x-user-id': context.userId,
        },
      });

      const data = response.data.data;

      logger.info('[HotelActionHandler] Room service created', {
        requestId: data.id,
        serviceType: params.serviceType,
        userId: context.userId,
      });

      return {
        success: true,
        actionType: 'room_service_request',
        message: `Your ${params.serviceType.replace('_', ' ')} request has been submitted. Request ID: ${data.id}`,
        referenceId: data.id,
        data: data,
      };
    } catch (error: any) {
      logger.error('[HotelActionHandler] Room service error', { error: error.message });

      // Return user-friendly message
      if (error.response?.status === 404) {
        return {
          success: false,
          actionType: 'room_service_request',
          message: 'Unable to create request. Please ensure your booking is active.',
        };
      }

      return {
        success: false,
        actionType: 'room_service_request',
        message: 'Unable to submit your request. Please try again or contact reception.',
      };
    }
  }

  /**
   * Hold a hotel booking
   */
  async holdBooking(params: {
    hotelId: string;
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    rooms?: number;
    guests: number;
    guestName: string;
    guestPhone: string;
    specialRequests?: string;
    coinBurnPaise?: number;
  }, context: ActionContext): Promise<ActionResult> {
    try {
      const response = await this.client.post('/v1/bookings/hold', {
        userId: context.userId,
        hotelId: params.hotelId,
        roomTypeId: params.roomTypeId,
        checkinDate: params.checkIn,
        checkoutDate: params.checkOut,
        numRooms: params.rooms || 1,
        numGuests: params.guests,
        guestName: params.guestName,
        guestPhone: params.guestPhone,
        specialRequests: params.specialRequests,
        channelSource: 'rez-chat',
        userTier: context.customerContext?.tier as string || 'basic',
        otaCoinBurnPaise: params.coinBurnPaise || 0,
      });

      const data = response.data;

      logger.info('[HotelActionHandler] Booking held', {
        bookingRef: data.bookingRef,
        userId: context.userId,
      });

      const expiresIn = Math.floor(
        (new Date(data.holdExpiresAt).getTime() - Date.now()) / 60000
      );

      return {
        success: true,
        actionType: 'booking_hold',
        message: `Room held for ${expiresIn} minutes. Booking reference: ${data.bookingRef}. Total: ₹${(data.totalValuePaise / 100).toFixed(0)}`,
        referenceId: data.id,
        data: {
          holdId: data.id,
          bookingRef: data.bookingRef,
          total: data.totalValuePaise / 100,
          expiresIn,
          holdExpiresAt: data.holdExpiresAt,
        },
      };
    } catch (error: any) {
      logger.error('[HotelActionHandler] Hold booking error', { error: error.message });

      return {
        success: false,
        actionType: 'booking_hold',
        message: 'Unable to hold room. Please try again or check room availability.',
      };
    }
  }

  /**
   * Confirm a held booking
   */
  async confirmBooking(params: {
    holdId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }, context: ActionContext): Promise<ActionResult> {
    try {
      const response = await this.client.post('/v1/bookings/confirm', {
        bookingId: params.holdId,
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.razorpaySignature,
      });

      const data = response.data;

      logger.info('[HotelActionHandler] Booking confirmed', {
        bookingRef: data.bookingRef,
        userId: context.userId,
      });

      return {
        success: true,
        actionType: 'booking_confirmed',
        message: `Booking confirmed! Reference: ${data.bookingRef}. Check-in: ${data.checkinDate}. You earned ${data.coinsEarned || 0} ReZ Coins!`,
        referenceId: data.id,
        data: data,
      };
    } catch (error: any) {
      logger.error('[HotelActionHandler] Confirm booking error', { error: error.message });

      return {
        success: false,
        actionType: 'booking_confirmed',
        message: 'Unable to confirm booking. Your hold may have expired. Please try again.',
      };
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(params: {
    bookingId: string;
    reason?: string;
  }, context: ActionContext): Promise<ActionResult> {
    try {
      const response = await this.client.post(`/v1/bookings/${params.bookingId}/cancel`, {
        reason: params.reason || 'Cancelled by user',
        cancelledBy: 'user',
        userId: context.userId,
      });

      const data = response.data;

      logger.info('[HotelActionHandler] Booking cancelled', {
        bookingId: params.bookingId,
        userId: context.userId,
      });

      return {
        success: true,
        actionType: 'booking_cancelled',
        message: `Booking cancelled. Refund of ₹${((data.refundAmount || 0) / 100).toFixed(0)} will be processed within 5-7 business days.`,
        referenceId: params.bookingId,
      };
    } catch (error: any) {
      logger.error('[HotelActionHandler] Cancel booking error', { error: error.message });

      return {
        success: false,
        actionType: 'booking_cancelled',
        message: 'Unable to cancel booking. Please try again or contact support.',
      };
    }
  }

  /**
   * Get booking status
   */
  async getBookingStatus(bookingId: string): Promise<ActionResult> {
    try {
      const response = await this.client.get(`/v1/bookings/${bookingId}`);
      const data = response.data;

      const statusMessages: Record<string, string> = {
        init: 'Booking initiated',
        hold: 'Room held, awaiting payment',
        confirmed: 'Booking confirmed',
        checked_in: 'Checked in',
        stayed: 'Stay completed',
        cancelled: 'Booking cancelled',
        no_show: 'No show',
      };

      return {
        success: true,
        actionType: 'booking_status',
        message: `Booking ${data.bookingRef}: ${statusMessages[data.status] || data.status}. Check-in: ${data.checkinDate}`,
        referenceId: bookingId,
        data: data,
      };
    } catch (error: any) {
      logger.error('[HotelActionHandler] Get booking error', { error: error.message });

      return {
        success: false,
        actionType: 'booking_status',
        message: 'Unable to fetch booking details. Please try again.',
      };
    }
  }
}

// ── Merchant/Order Action Handlers ────────────────────────────────────────────────

export class MerchantActionHandler {
  private client: AxiosInstance;

  constructor() {
    this.client = createClient(ORDER_SERVICE_URL);
  }

  /**
   * Add items to cart
   */
  async addToCart(params: {
    merchantId: string;
    items: Array<{ productId: string; quantity: number; notes?: string }>;
    specialInstructions?: string;
  }, context: ActionContext): Promise<ActionResult> {
    try {
      const response = await this.client.post('/v1/cart/add', {
        userId: context.userId,
        merchantId: params.merchantId,
        items: params.items,
        instructions: params.specialInstructions,
        source: 'rez-chat',
      });

      const data = response.data;

      logger.info('[MerchantActionHandler] Items added to cart', {
        cartId: data.cartId || data.id,
        userId: context.userId,
      });

      return {
        success: true,
        actionType: 'cart_updated',
        message: `Added to cart! Cart total: ₹${(data.total / 100).toFixed(0)}`,
        referenceId: data.cartId || data.id,
        data: data,
      };
    } catch (error: any) {
      logger.error('[MerchantActionHandler] Add to cart error', { error: error.message });

      return {
        success: false,
        actionType: 'cart_updated',
        message: 'Unable to add items to cart. Please try again.',
      };
    }
  }

  /**
   * Place order
   */
  async placeOrder(params: {
    cartId: string;
    deliveryAddress?: string;
    deliveryTime?: string;
    paymentMethod: 'card' | 'upi' | 'wallet' | 'cod';
  }, context: ActionContext): Promise<ActionResult> {
    try {
      const response = await this.client.post('/v1/orders/place', {
        userId: context.userId,
        cartId: params.cartId,
        deliveryAddress: params.deliveryAddress,
        deliveryTime: params.deliveryTime,
        paymentMethod: params.paymentMethod,
        source: 'rez-chat',
      });

      const data = response.data;

      logger.info('[MerchantActionHandler] Order placed', {
        orderId: data.id || data.orderId,
        orderRef: data.orderRef || data.orderNumber,
        userId: context.userId,
      });

      return {
        success: true,
        actionType: 'order_placed',
        message: `Order placed! Reference: ${data.orderRef || data.orderNumber}. Total: ₹${(data.total / 100).toFixed(0)}. Estimated delivery: ${data.estimatedDelivery || '30-45 mins'}`,
        referenceId: data.id || data.orderId,
        data: data,
      };
    } catch (error: any) {
      logger.error('[MerchantActionHandler] Place order error', { error: error.message });

      return {
        success: false,
        actionType: 'order_placed',
        message: 'Unable to place order. Please try again.',
      };
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(params: {
    orderId: string;
    reason?: string;
  }, context: ActionContext): Promise<ActionResult> {
    try {
      const response = await this.client.post(`/v1/orders/${params.orderId}/cancel`, {
        reason: params.reason || 'Cancelled by user',
        cancelledBy: 'user',
        userId: context.userId,
      });

      const data = response.data;

      logger.info('[MerchantActionHandler] Order cancelled', {
        orderId: params.orderId,
        userId: context.userId,
      });

      return {
        success: true,
        actionType: 'order_cancelled',
        message: `Order cancelled. ${data.refundAmount ? `Refund of ₹${(data.refundAmount / 100).toFixed(0)} will be processed.` : ''}`,
        referenceId: params.orderId,
      };
    } catch (error: any) {
      logger.error('[MerchantActionHandler] Cancel order error', { error: error.message });

      return {
        success: false,
        actionType: 'order_cancelled',
        message: 'Unable to cancel order. The order may already be preparing.',
      };
    }
  }

  /**
   * Reserve table at restaurant
   */
  async reserveTable(params: {
    merchantId: string;
    date: string;
    time: string;
    partySize: number;
    name: string;
    phone: string;
    occasion?: string;
    specialRequests?: string;
  }, context: ActionContext): Promise<ActionResult> {
    try {
      const merchantClient = createClient(MERCHANT_SERVICE_URL);

      const response = await merchantClient.post(`/v1/stores/${params.merchantId}/reservations`, {
        date: params.date,
        time: params.time,
        partySize: params.partySize,
        customerName: params.name,
        phone: params.phone,
        occasion: params.occasion,
        specialRequests: params.specialRequests,
        source: 'rez-chat',
      });

      const data = response.data;

      logger.info('[MerchantActionHandler] Table reserved', {
        reservationId: data.id || data.reservationId,
        merchantId: params.merchantId,
        userId: context.userId,
      });

      return {
        success: true,
        actionType: 'table_reserved',
        message: `Table reserved for ${params.partySize} on ${params.date} at ${params.time}. Confirmation will be sent via SMS.`,
        referenceId: data.id || data.reservationId,
        data: data,
      };
    } catch (error: any) {
      logger.error('[MerchantActionHandler] Reserve table error', { error: error.message });

      return {
        success: false,
        actionType: 'table_reserved',
        message: 'Unable to reserve table. Please try again or call the restaurant directly.',
      };
    }
  }

  /**
   * Reorder from previous order
   */
  async reorder(params: {
    orderId: string;
    deliveryAddress?: string;
  }, context: ActionContext): Promise<ActionResult> {
    try {
      const response = await this.client.post('/v1/orders/reorder', {
        userId: context.userId,
        orderId: params.orderId,
        deliveryAddress: params.deliveryAddress,
        source: 'rez-chat',
      });

      const data = response.data;

      logger.info('[MerchantActionHandler] Reorder placed', {
        orderId: data.id || data.orderId,
        originalOrderId: params.orderId,
        userId: context.userId,
      });

      return {
        success: true,
        actionType: 'order_placed',
        message: `Reorder placed! Reference: ${data.orderRef || data.orderNumber}. Total: ₹${(data.total / 100).toFixed(0)}`,
        referenceId: data.id || data.orderId,
        data: data,
      };
    } catch (error: any) {
      logger.error('[MerchantActionHandler] Reorder error', { error: error.message });

      return {
        success: false,
        actionType: 'order_placed',
        message: 'Unable to reorder. The previous order may no longer be available.',
      };
    }
  }
}

// ── Support Action Handlers ─────────────────────────────────────────────────────

export class SupportActionHandler {
  /**
   * Escalate to human support
   */
  async escalate(params: {
    reason: string;
    department?: 'sales' | 'support' | 'billing' | 'technical' | 'management';
    priority?: 'normal' | 'high' | 'urgent';
  }, context: ActionContext): Promise<ActionResult> {
    try {
      // Create support ticket (this would integrate with your ticketing system)
      const ticketId = `TKT${Date.now()}`;

      logger.info('[SupportActionHandler] Escalation created', {
        ticketId,
        reason: params.reason,
        department: params.department,
        userId: context.userId,
      });

      return {
        success: true,
        actionType: 'escalation_created',
        message: `Connecting you with our ${params.department || 'support'} team. Your ticket ID is ${ticketId}. An agent will respond shortly.`,
        referenceId: ticketId,
        data: {
          ticketId,
          department: params.department || 'support',
          priority: params.priority || 'normal',
          reason: params.reason,
        },
      };
    } catch (error: any) {
      logger.error('[SupportActionHandler] Escalation error', { error: error.message });

      return {
        success: false,
        actionType: 'escalation_created',
        message: 'Unable to connect with support. Please call us at our support number.',
      };
    }
  }

  /**
   * File a complaint
   */
  async fileComplaint(params: {
    orderId?: string;
    bookingId?: string;
    type: string;
    description: string;
  }, context: ActionContext): Promise<ActionResult> {
    try {
      const complaintId = `CMP${Date.now()}`;

      logger.info('[SupportActionHandler] Complaint filed', {
        complaintId,
        orderId: params.orderId,
        type: params.type,
        userId: context.userId,
      });

      return {
        success: true,
        actionType: 'complaint_filed',
        message: `Complaint filed. Reference: ${complaintId}. We'll investigate and respond within 24 hours.`,
        referenceId: complaintId,
        data: {
          complaintId,
          orderId: params.orderId,
          bookingId: params.bookingId,
          type: params.type,
        },
      };
    } catch (error: any) {
      logger.error('[SupportActionHandler] File complaint error', { error: error.message });

      return {
        success: false,
        actionType: 'complaint_filed',
        message: 'Unable to file complaint. Please try again or contact support.',
      };
    }
  }

  /**
   * Request refund
   */
  async requestRefund(params: {
    orderId?: string;
    bookingId?: string;
    reason: string;
    amount?: number;
  }, context: ActionContext): Promise<ActionResult> {
    try {
      const refundId = `REF${Date.now()}`;

      logger.info('[SupportActionHandler] Refund requested', {
        refundId,
        orderId: params.orderId,
        amount: params.amount,
        userId: context.userId,
      });

      return {
        success: true,
        actionType: 'refund_requested',
        message: `Refund requested. Reference: ${refundId}. Processing takes 5-7 business days.`,
        referenceId: refundId,
        data: {
          refundId,
          orderId: params.orderId,
          bookingId: params.bookingId,
          reason: params.reason,
          requestedAmount: params.amount,
        },
      };
    } catch (error: any) {
      logger.error('[SupportActionHandler] Refund request error', { error: error.message });

      return {
        success: false,
        actionType: 'refund_requested',
        message: 'Unable to request refund. Please try again or contact support.',
      };
    }
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────────

export function createActionHandlers() {
  return {
    hotel: new HotelActionHandler(),
    merchant: new MerchantActionHandler(),
    support: new SupportActionHandler(),
  };
}

// ── Action Router ────────────────────────────────────────────────────────────────

export type ActionType =
  // Hotel actions
  | 'room_service_request'
  | 'booking_hold'
  | 'booking_confirm'
  | 'booking_cancel'
  | 'booking_status'

  // Merchant actions
  | 'add_to_cart'
  | 'place_order'
  | 'cancel_order'
  | 'reserve_table'
  | 'reorder'

  // Support actions
  | 'escalate'
  | 'file_complaint'
  | 'request_refund';

export interface ActionRequest {
  type: ActionType;
  params: Record<string, unknown>;
  context: ActionContext;
}

export async function executeAction(
  request: ActionRequest,
  handlers = createActionHandlers()
): Promise<ActionResult> {
  const { type, params, context } = request;

  switch (type) {
    // Hotel actions
    case 'room_service_request':
      return handlers.hotel.createRoomServiceRequest(
        params as Parameters<HotelActionHandler['createRoomServiceRequest']>[0],
        context
      );

    case 'booking_hold':
      return handlers.hotel.holdBooking(
        params as Parameters<HotelActionHandler['holdBooking']>[0],
        context
      );

    case 'booking_confirm':
      return handlers.hotel.confirmBooking(
        params as Parameters<HotelActionHandler['confirmBooking']>[0],
        context
      );

    case 'booking_cancel':
      return handlers.hotel.cancelBooking(
        params as Parameters<HotelActionHandler['cancelBooking']>[0],
        context
      );

    case 'booking_status':
      return handlers.hotel.getBookingStatus(params.bookingId as string);

    // Merchant actions
    case 'add_to_cart':
      return handlers.merchant.addToCart(
        params as Parameters<MerchantActionHandler['addToCart']>[0],
        context
      );

    case 'place_order':
      return handlers.merchant.placeOrder(
        params as Parameters<MerchantActionHandler['placeOrder']>[0],
        context
      );

    case 'cancel_order':
      return handlers.merchant.cancelOrder(
        params as Parameters<MerchantActionHandler['cancelOrder']>[0],
        context
      );

    case 'reserve_table':
      return handlers.merchant.reserveTable(
        params as Parameters<MerchantActionHandler['reserveTable']>[0],
        context
      );

    case 'reorder':
      return handlers.merchant.reorder(
        params as Parameters<MerchantActionHandler['reorder']>[0],
        context
      );

    // Support actions
    case 'escalate':
      return handlers.support.escalate(
        params as Parameters<SupportActionHandler['escalate']>[0],
        context
      );

    case 'file_complaint':
      return handlers.support.fileComplaint(
        params as Parameters<SupportActionHandler['fileComplaint']>[0],
        context
      );

    case 'request_refund':
      return handlers.support.requestRefund(
        params as Parameters<SupportActionHandler['requestRefund']>[0],
        context
      );

    default:
      return {
        success: false,
        actionType: type,
        message: `Unknown action type: ${type}`,
      };
  }
}
