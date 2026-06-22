// ── ReZ Agent OS - Tool Definitions ──────────────────────────────────────────────
// All tools available to the AI agent, with real API integrations

import axios, { AxiosInstance } from 'axios';
import { CustomerContext, ToolHandlerConfig, ToolResult } from '../types';
import { logger } from '../logger';

// ── API Clients ─────────────────────────────────────────────────────────────────

interface APIClients {
  merchantAPI?: AxiosInstance;    // rez-merchant-service
  hotelAPI?: AxiosInstance;        // Hotel OTA
  walletAPI?: AxiosInstance;       // rez-wallet-service
  orderAPI?: AxiosInstance;        // rez-order-service
  loyaltyAPI?: AxiosInstance;      // rez-karma-service
  searchAPI?: AxiosInstance;       // rez-search-service
}

const clients: APIClients = {};

export function initializeAPIClients(config: {
  merchantServiceUrl?: string;
  hotelServiceUrl?: string;
  walletServiceUrl?: string;
  orderServiceUrl?: string;
  loyaltyServiceUrl?: string;
  searchServiceUrl?: string;
}) {
  if (config.merchantServiceUrl) {
    clients.merchantAPI = axios.create({ baseURL: config.merchantServiceUrl, timeout: 10000 });
  }
  if (config.hotelServiceUrl) {
    clients.hotelAPI = axios.create({ baseURL: config.hotelServiceUrl, timeout: 10000 });
  }
  if (config.walletServiceUrl) {
    clients.walletAPI = axios.create({ baseURL: config.walletServiceUrl, timeout: 10000 });
  }
  if (config.orderServiceUrl) {
    clients.orderAPI = axios.create({ baseURL: config.orderServiceUrl, timeout: 10000 });
  }
  if (config.loyaltyServiceUrl) {
    clients.loyaltyAPI = axios.create({ baseURL: config.loyaltyServiceUrl, timeout: 10000 });
  }
  if (config.searchServiceUrl) {
    clients.searchAPI = axios.create({ baseURL: config.searchServiceUrl, timeout: 10000 });
  }
}

// ── Tool: Search Hotels ─────────────────────────────────────────────────────────

export const searchHotelsTool: ToolHandlerConfig = {
  name: 'search_hotels',
  description: 'Search for hotels based on location, dates, and preferences',
  parameters: {
    location: { type: 'string', description: 'City or area to search', required: true },
    checkIn: { type: 'string', description: 'Check-in date (YYYY-MM-DD)', required: true },
    checkOut: { type: 'string', description: 'Check-out date (YYYY-MM-DD)', required: true },
    guests: { type: 'number', description: 'Number of guests', required: true },
    rooms: { type: 'number', description: 'Number of rooms', required: false },
    priceRange: { type: 'string', description: 'Price range: budget, mid, premium', required: false },
    amenities: { type: 'string', description: 'Required amenities (comma-separated)', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      const amenitiesValue = params.amenities as string | undefined;
      // Hotel OTA /hotel/search endpoint
      const response = await clients.hotelAPI?.get('/hotel/search', {
        params: {
          location: params.location,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          guests: params.guests,
          rooms: params.rooms || 1,
          priceRange: params.priceRange,
          amenities: amenitiesValue?.split(',').map((s: string) => s.trim()),
        }
      });

      const hotels = response?.data?.hotels || response?.data || [];

      if (!hotels || hotels.length === 0) {
        return {
          success: true,
          data: {
            hotels: [],
            message: `No hotels found in ${params.location} for your dates. Try different dates or location.`
          }
        };
      }

      return {
        success: true,
        data: {
          hotels: hotels.slice(0, 5).map((h: any) => ({
            id: h.id || h.hotel_id,
            name: h.name,
            location: h.location || h.area,
            price: h.pricePerNight || h.price,
            rating: h.rating,
            amenities: h.topAmenities || h.amenities,
          })),
          total: hotels.length,
          message: `Found ${hotels.length} hotels in ${params.location}`
        }
      };
    } catch (error: any) {
      logger.error('search_hotels failed', { error: error.message });
      return { success: false, error: 'Unable to search hotels. Please try again.' };
    }
  }
};

// ── Tool: Create Hotel Booking ──────────────────────────────────────────────────

export const createHotelBookingTool: ToolHandlerConfig = {
  name: 'create_hotel_booking',
  description: 'Create a hotel room reservation (hold then confirm)',
  parameters: {
    hotelId: { type: 'string', description: 'Hotel ID', required: true },
    roomType: { type: 'string', description: 'Room type code', required: true },
    checkIn: { type: 'string', description: 'Check-in date (YYYY-MM-DD)', required: true },
    checkOut: { type: 'string', description: 'Check-out date (YYYY-MM-DD)', required: true },
    guests: { type: 'number', description: 'Number of guests', required: true },
    guestDetails: { type: 'object', description: 'Guest information', required: false },
    paymentMethod: { type: 'string', description: 'Payment: wallet, card, coins', required: false },
    applyCashback: { type: 'boolean', description: 'Apply ReZ coins as discount', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      const guestDetailsParam = params.guestDetails as Record<string, unknown> | undefined;

      // Step 1: Hold booking - Hotel OTA /booking/hold
      const holdResponse = await clients.hotelAPI?.post('/booking/hold', {
        hotelId: params.hotelId,
        roomType: params.roomType,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        guests: params.guests,
        guestDetails: {
          name: context.name,
          email: context.email,
          phone: context.phone,
          ...guestDetailsParam,
        },
        paymentMethod: params.paymentMethod || 'wallet',
        applyCashback: params.applyCashback,
        userId: context.customerId,
      });

      const holdResult = holdResponse?.data;

      if (!holdResult?.booking_id) {
        return { success: false, error: holdResult?.message || 'Unable to hold booking.' };
      }

      // Step 2: Confirm booking - Hotel OTA /booking/confirm
      const confirmResponse = await clients.hotelAPI?.post('/booking/confirm', {
        bookingId: holdResult.booking_id,
        paymentMethod: params.paymentMethod || 'wallet',
        applyCashback: params.applyCashback,
      });

      const booking = confirmResponse?.data;

      return {
        success: true,
        data: {
          bookingId: booking?.id || holdResult.booking_id,
          confirmationCode: booking?.confirmationCode || holdResult?.confirmationCode,
          status: booking?.status || 'confirmed',
          total: booking?.totalAmount || holdResult?.totalAmount,
          message: `Booking confirmed! Your confirmation code is ${booking?.confirmationCode || holdResult?.confirmationCode}. Check-in at ${params.checkIn}, check-out at ${params.checkOut}.`
        }
      };
    } catch (error: any) {
      logger.error('create_hotel_booking failed', { error: error.message });
      return { success: false, error: error.message || 'Booking failed. Please try again.' };
    }
  }
};

// ── Tool: Search Restaurants ─────────────────────────────────────────────────────

export const searchRestaurantsTool: ToolHandlerConfig = {
  name: 'search_restaurants',
  description: 'Search for restaurants by location, cuisine, or name',
  parameters: {
    query: { type: 'string', description: 'Search query (name, cuisine, or location)', required: true },
    location: { type: 'string', description: 'Area or landmark', required: false },
    cuisine: { type: 'string', description: 'Cuisine type', required: false },
    priceRange: { type: 'string', description: 'Price range: budget, mid, premium', required: false },
    rating: { type: 'number', description: 'Minimum rating (1-5)', required: false },
    delivery: { type: 'boolean', description: 'Only show restaurants with delivery', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      const response = await clients.merchantAPI?.post('/v1/restaurants/search', {
        query: params.query,
        location: params.location,
        cuisine: params.cuisine,
        priceRange: params.priceRange,
        minRating: params.rating,
        deliveryAvailable: params.delivery,
      });

      const restaurants = response?.data?.restaurants || [];

      return {
        success: true,
        data: {
          restaurants: restaurants.slice(0, 5).map((r: any) => ({
            id: r.id,
            name: r.name,
            location: r.area,
            cuisine: r.cuisine,
            rating: r.rating,
            priceRange: r.priceRange,
            deliveryTime: r.deliveryTime,
            minimumOrder: r.minimumOrder,
          })),
          total: restaurants.length,
        }
      };
    } catch (error: any) {
      logger.error('search_restaurants failed', { error: error.message });
      return { success: false, error: 'Unable to search restaurants. Please try again.' };
    }
  }
};

// ── Tool: Place Order ─────────────────────────────────────────────────────────

export const placeOrderTool: ToolHandlerConfig = {
  name: 'place_order',
  description: 'Place a food or product order',
  parameters: {
    storeId: { type: 'string', description: 'Store or restaurant ID', required: true },
    items: { type: 'array', description: 'Array of {itemId, quantity, notes}', required: true },
    orderType: { type: 'string', description: 'dine_in, delivery, takeout', required: true },
    deliveryAddress: { type: 'string', description: 'Full delivery address', required: false },
    tableNumber: { type: 'string', description: 'Table number for dine-in', required: false },
    specialInstructions: { type: 'string', description: 'Special instructions', required: false },
    applyCashback: { type: 'boolean', description: 'Use ReZ coins for discount', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      // rez-order-service /orders endpoint
      const itemsParam = params.items as Array<{itemId?: string; product?: string; quantity: number; price?: number; name?: string}>;
      const response = await clients.orderAPI?.post('/orders', {
        storeId: params.storeId,
        items: itemsParam.map(item => ({
          product: item.itemId || item.product,
          quantity: item.quantity,
          price: item.price || 0,
          name: item.name,
        })),
        delivery: {
          type: params.orderType,
          address: params.deliveryAddress ? { full: params.deliveryAddress } : undefined,
        },
        deliveryAddress: params.deliveryAddress,
        specialInstructions: params.specialInstructions,
      }, {
        headers: {
          'x-user-id': context.customerId,
        }
      });

      const order = response?.data?.data || response?.data;

      return {
        success: true,
        data: {
          orderId: order?._id || order?.id,
          orderNumber: order?.orderNumber,
          status: order?.status,
          total: order?.totals?.total || order?.total,
          message: `Order ${order?.orderNumber || 'placed'} successfully!`
        }
      };
    } catch (error: any) {
      logger.error('place_order failed', { error: error.message });
      return { success: false, error: error.message || 'Order failed. Please try again.' };
    }
  }
};

// ── Tool: Reserve Table ───────────────────────────────────────────────────────

export const reserveTableTool: ToolHandlerConfig = {
  name: 'reserve_table',
  description: 'Make a restaurant table reservation',
  parameters: {
    storeId: { type: 'string', description: 'Restaurant ID', required: true },
    date: { type: 'string', description: 'Reservation date (YYYY-MM-DD)', required: true },
    time: { type: 'string', description: 'Reservation time (HH:MM)', required: true },
    partySize: { type: 'number', description: 'Number of guests', required: true },
    occasion: { type: 'string', description: 'Special occasion (birthday, anniversary, etc.)', required: false },
    seatingPreference: { type: 'string', description: 'indoor, outdoor, window, private', required: false },
    specialRequests: { type: 'string', description: 'Additional requests', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      const response = await clients.merchantAPI?.post('/v1/reservations/create', {
        storeId: params.storeId,
        date: params.date,
        time: params.time,
        partySize: params.partySize,
        occasion: params.occasion,
        seatingPreference: params.seatingPreference,
        specialRequests: params.specialRequests,
        customerId: context.customerId,
        customerName: context.name,
        customerPhone: context.phone,
      });

      const reservation = response?.data;

      return {
        success: true,
        data: {
          reservationId: reservation.id,
          confirmationCode: reservation.confirmationCode,
          status: reservation.status,
          date: params.date,
          time: params.time,
          partySize: params.partySize,
          message: `Table reserved for ${params.partySize} on ${params.date} at ${params.time}. Confirmation: ${reservation.confirmationCode}`
        }
      };
    } catch (error: any) {
      logger.error('reserve_table failed', { error: error.message });
      return { success: false, error: error.message || 'Reservation failed. Please try again.' };
    }
  }
};

// ── Tool: Room Service ─────────────────────────────────────────────────────────

export const roomServiceTool: ToolHandlerConfig = {
  name: 'request_room_service',
  description: 'Order room service in a hotel',
  parameters: {
    hotelId: { type: 'string', description: 'Hotel ID', required: true },
    roomNumber: { type: 'string', description: 'Room number', required: true },
    items: { type: 'array', description: 'Array of {itemId, quantity}', required: true },
    deliveryTime: { type: 'string', description: 'asap or specific time (HH:MM)', required: false },
    specialRequests: { type: 'string', description: 'Special instructions', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      // Hotel OTA /room-service
      const response = await clients.hotelAPI?.post('/room-service', {
        hotelId: params.hotelId,
        roomNumber: params.roomNumber,
        items: params.items,
        deliveryTime: params.deliveryTime || 'asap',
        specialRequests: params.specialRequests,
        guestId: context.customerId,
        guestName: context.name,
      }, {
        headers: { 'x-user-id': context.customerId }
      });

      const request = response?.data;

      return {
        success: true,
        data: {
          requestId: request?.id || request?.requestId,
          status: request?.status || 'pending',
          estimatedDelivery: request?.estimatedDelivery || request?.estimated_time,
          message: `Room service order confirmed! Room ${params.roomNumber}. Estimated delivery: ${request?.estimatedDelivery || request?.estimated_time || '30-45 minutes'}`
        }
      };
    } catch (error: any) {
      logger.error('request_room_service failed', { error: error.message });
      return { success: false, error: error.message || 'Room service order failed.' };
    }
  }
};

// ── Tool: Housekeeping Request ────────────────────────────────────────────────

export const housekeepingTool: ToolHandlerConfig = {
  name: 'request_housekeeping',
  description: 'Request housekeeping service in a hotel',
  parameters: {
    hotelId: { type: 'string', description: 'Hotel ID', required: true },
    roomNumber: { type: 'string', description: 'Room number', required: true },
    serviceType: { type: 'string', description: 'regular_clean, deep_clean, towels, toiletries, bedding, turndown', required: true },
    preferredTime: { type: 'string', description: 'asap or specific time (HH:MM)', required: false },
    notes: { type: 'string', description: 'Additional notes', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      const response = await clients.hotelAPI?.post('/v1/housekeeping/request', {
        hotelId: params.hotelId,
        roomNumber: params.roomNumber,
        serviceType: params.serviceType,
        preferredTime: params.preferredTime || 'asap',
        notes: params.notes,
        guestId: context.customerId,
      });

      const request = response?.data;

      const serviceTypeStr = params.serviceType as string;
      return {
        success: true,
        data: {
          requestId: request.id,
          status: request.status,
          scheduledTime: request.scheduledTime,
          message: `Housekeeping request submitted! ${serviceTypeStr.replace('_', ' ')} for Room ${params.roomNumber}. ${request.scheduledTime !== 'asap' ? `Scheduled for ${request.scheduledTime}` : 'Will arrive shortly.'}`
        }
      };
    } catch (error: any) {
      logger.error('request_housekeeping failed', { error: error.message });
      return { success: false, error: error.message || 'Housekeeping request failed.' };
    }
  }
};

// ── Tool: Get Wallet Balance ───────────────────────────────────────────────────

export const getWalletBalanceTool: ToolHandlerConfig = {
  name: 'get_wallet_balance',
  description: 'Check user wallet balance and ReZ coins',
  parameters: {
    userId: { type: 'string', description: 'User ID', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      const userId = String(params.userId || context.customerId || 'anonymous');
      // rez-wallet-service /api/wallet/balance endpoint
      const response = await clients.walletAPI?.get('/api/wallet/balance', {
        headers: { 'x-user-id': userId }
      });

      const wallet = response?.data;

      return {
        success: true,
        data: {
          balance: wallet?.balance || 0,
          coins: wallet?.coins || wallet?.coinBalance || 0,
          currency: 'INR',
          message: `Your wallet balance: ₹${((wallet?.balance || 0) / 100).toFixed(2)}. ReZ Coins: ${(wallet?.coins || wallet?.coinBalance || 0).toLocaleString()}`
        }
      };
    } catch (error: any) {
      logger.error('get_wallet_balance failed', { error: error.message });
      return { success: false, error: 'Unable to fetch wallet balance.' };
    }
  }
};

// ── Tool: Get Loyalty Points ──────────────────────────────────────────────────

export const getLoyaltyPointsTool: ToolHandlerConfig = {
  name: 'get_loyalty_points',
  description: 'Check user loyalty points and tier status',
  parameters: {
    userId: { type: 'string', description: 'User ID', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      const userId = String(params.userId || context.customerId || 'anonymous');
      // rez-karma-service - try common karma endpoints
      let loyalty = null;

      // Try /api/karma/summary first
      try {
        const response = await clients.loyaltyAPI?.get('/api/karma/summary', {
          headers: { 'x-user-id': userId }
        });
        loyalty = response?.data;
      } catch {
        // Fallback to /api/karma/status
        try {
          const response2 = await clients.loyaltyAPI?.get('/api/karma/status', {
            headers: { 'x-user-id': userId }
          });
          loyalty = response2?.data;
        } catch {
          // Return mock data if service not available
          loyalty = { points: 0, tier: 'bronze', pointsToNextTier: 100 };
        }
      }

      return {
        success: true,
        data: {
          points: loyalty?.points || loyalty?.karmaPoints || 0,
          tier: loyalty?.tier || loyalty?.karmaTier || 'bronze',
          tierBenefits: loyalty?.benefits,
          pointsToNextTier: loyalty?.pointsToNextTier || loyalty?.points_to_next_tier || 100,
          message: `You have ${(loyalty?.points || loyalty?.karmaPoints || 0).toLocaleString()} karma points! ${(loyalty?.tier || loyalty?.karmaTier || 'bronze').charAt(0).toUpperCase() + (loyalty?.tier || loyalty?.karmaTier || 'bronze').slice(1)} tier.`
        }
      };
    } catch (error: any) {
      logger.error('get_loyalty_points failed', { error: error.message });
      return { success: false, error: 'Unable to fetch loyalty status.' };
    }
  }
};

// ── Tool: Get Order Status ────────────────────────────────────────────────────

export const getOrderStatusTool: ToolHandlerConfig = {
  name: 'get_order_status',
  description: 'Check the status of an order or delivery',
  parameters: {
    orderId: { type: 'string', description: 'Order ID or order number', required: true },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      // rez-order-service /orders/:id endpoint
      const response = await clients.orderAPI?.get(`/orders/${params.orderId}`, {
        headers: { 'x-user-id': context.customerId }
      });

      const order = response?.data?.data || response?.data;

      if (!order) {
        return { success: false, error: 'Order not found.' };
      }

      return {
        success: true,
        data: {
          orderId: order._id || order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          statusMessage: getStatusMessage(order.status),
          estimatedTime: order.estimatedDeliveryTime,
          driver: order.driverName,
          driverPhone: order.driverPhone,
          message: `Order ${order.orderNumber}: ${getStatusMessage(order.status)}.`
        }
      };
    } catch (error: any) {
      logger.error('get_order_status failed', { error: error.message });
      return { success: false, error: 'Unable to fetch order status.' };
    }
  }
};

// ── Tool: Get Booking Details ──────────────────────────────────────────────────

export const getBookingDetailsTool: ToolHandlerConfig = {
  name: 'get_booking_details',
  description: 'Get details of a hotel or service booking',
  parameters: {
    bookingId: { type: 'string', description: 'Booking ID or confirmation code', required: true },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      // Hotel OTA /booking/:booking_id
      const response = await clients.hotelAPI?.get(`/booking/${params.bookingId}`, {
        headers: { 'x-user-id': context.customerId }
      });

      const booking = response?.data;

      if (!booking) {
        return { success: false, error: 'Booking not found.' };
      }

      return {
        success: true,
        data: {
          bookingId: booking.id || booking.booking_id,
          confirmationCode: booking.confirmationCode,
          hotelName: booking.hotelName || booking.hotel?.name,
          roomType: booking.roomType,
          checkIn: booking.checkIn || booking.check_in,
          checkOut: booking.checkOut || booking.check_out,
          status: booking.status,
          total: booking.totalAmount || booking.total,
          message: `Booking ${booking.confirmationCode}: ${booking.hotelName || booking.hotel?.name}, ${booking.roomType}. Check-in: ${booking.checkIn || booking.check_in}, Check-out: ${booking.checkOut || booking.check_out}.`
        }
      };
    } catch (error: any) {
      logger.error('get_booking_details failed', { error: error.message });
      return { success: false, error: 'Unable to fetch booking details.' };
    }
  }
};

// ── Tool: Cancel Booking ───────────────────────────────────────────────────────

export const cancelBookingTool: ToolHandlerConfig = {
  name: 'cancel_booking',
  description: 'Cancel a hotel booking or reservation',
  parameters: {
    bookingId: { type: 'string', description: 'Booking ID to cancel', required: true },
    reason: { type: 'string', description: 'Reason for cancellation', required: false },
    refundMethod: { type: 'string', description: 'Refund to: original, wallet, coins', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      // Hotel OTA /booking/:booking_id/cancel
      const response = await clients.hotelAPI?.post(`/booking/${params.bookingId}/cancel`, {
        reason: params.reason,
        refundMethod: params.refundMethod || 'original',
        userId: context.customerId,
      });

      const result = response?.data;

      return {
        success: true,
        data: {
          bookingId: params.bookingId,
          status: 'cancelled',
          refundAmount: result?.refundAmount,
          refundMethod: result?.refundMethod || params.refundMethod,
          refundTimeline: result?.refundTimeline,
          message: `Booking cancelled. ${result?.refundAmount ? `Refund of ₹${(result.refundAmount / 100).toFixed(2)} will be processed to ${result.refundMethod}.` : 'No refund applicable.'}`
        }
      };
    } catch (error: any) {
      logger.error('cancel_booking failed', { error: error.message });
      return { success: false, error: error.message || 'Cancellation failed.' };
    }
  }
};

// ── Tool: Escalate to Staff ────────────────────────────────────────────────────

export const escalateToStaffTool: ToolHandlerConfig = {
  name: 'escalate_to_staff',
  description: 'Transfer conversation to human staff member',
  parameters: {
    reason: { type: 'string', description: 'Reason for escalation', required: true },
    department: { type: 'string', description: 'Department: front_desk, concierge, support, guest_relations', required: false },
    priority: { type: 'string', description: 'Priority: normal, high, urgent', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    const departmentStr = (params.department as string | undefined) || 'support';
    // This just returns success - actual routing happens in socket handler
    return {
      success: true,
      data: {
        escalated: true,
        reason: params.reason,
        department: departmentStr,
        priority: params.priority || 'normal',
        message: `I'm connecting you with our ${departmentStr.replace('_', ' ')} team. Please hold for a moment.`,
      }
    };
  }
};

// ── Tool: Search Products ──────────────────────────────────────────────────────

export const searchProductsTool: ToolHandlerConfig = {
  name: 'search_products',
  description: 'Search for products in the ReZ marketplace',
  parameters: {
    query: { type: 'string', description: 'Search query', required: true },
    category: { type: 'string', description: 'Product category', required: false },
    priceRange: { type: 'string', description: 'Price range: budget, mid, premium', required: false },
    location: { type: 'string', description: 'Delivery location', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      const response = await clients.searchAPI?.post('/v1/products/search', {
        query: params.query,
        category: params.category,
        priceRange: params.priceRange,
        location: params.location || context.preferences?.defaultAddress,
      });

      const products = response?.data?.products || [];

      return {
        success: true,
        data: {
          products: products.slice(0, 5).map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            seller: p.sellerName,
            rating: p.rating,
          })),
          total: products.length,
        }
      };
    } catch (error: any) {
      logger.error('search_products failed', { error: error.message });
      return { success: false, error: 'Unable to search products.' };
    }
  }
};

// ── All Tools Export ───────────────────────────────────────────────────────────

// ── Intent Graph Tools ─────────────────────────────────────────────────────────

export const getUserIntentsTool: ToolHandlerConfig = {
  name: 'get_user_intents',
  description: 'Get a user\'s active shopping/travel/dining intents for personalization',
  parameters: {
    userId: { type: 'string', description: 'User ID', required: true },
  },
  execute: async (params: Record<string, unknown>, _context: CustomerContext): Promise<ToolResult> => {
    try {
      // Use dependency injection to get intent graph provider
      const { getIntentGraphProvider } = await import('../intent-graph');
      const provider = getIntentGraphProvider();
      const enriched = await provider.getEnrichedContext(String(params.userId));

      if (!enriched) {
        return {
          success: true,
          data: {
            activeIntents: [],
            dormantIntents: [],
            affinities: {},
          },
        };
      }

      return {
        success: true,
        data: {
          activeIntents: enriched.activeIntents.map(i => ({
            key: i.key,
            category: i.category,
            confidence: i.confidence,
            lastSeen: i.lastSeen,
          })),
          dormantIntents: enriched.dormantIntents.slice(0, 5),
          affinities: enriched.profile
            ? {
                travel: enriched.profile.travelAffinity,
                dining: enriched.profile.diningAffinity,
                retail: enriched.profile.retailAffinity,
              }
            : {},
        },
      };
    } catch (err) {
      logger.error('get_user_intents failed', { error: (err as Error).message });
      return { success: false, error: 'Failed to fetch intents' };
    }
  },
};

export const triggerNudgeTool: ToolHandlerConfig = {
  name: 'trigger_nudge',
  description: 'Trigger a nudge for a dormant user intent to encourage conversion',
  parameters: {
    userId: { type: 'string', description: 'User ID', required: true },
    intentKey: { type: 'string', description: 'The intent key to revive', required: true },
    triggerType: { type: 'string', description: 'Trigger type: price_drop, return_user, seasonality, offer_match, manual', required: false },
  },
  execute: async (params: Record<string, unknown>, _context: CustomerContext): Promise<ToolResult> => {
    try {
      // Use event-based communication for nudge triggering
      const { emitIntentRevived } = await import('../intent-graph');
      emitIntentRevived(
        String(params.userId),
        String(params.intentKey),
        String(params.triggerType || 'manual')
      );
      return { success: true, data: { message: 'Revival event emitted' } };
    } catch (err) {
      logger.error('trigger_nudge failed', { error: (err as Error).message });
      return { success: false, error: 'Failed to trigger revival' };
    }
  },
};

export const ALL_REZ_TOOLS: ToolHandlerConfig[] = [
  // Hotel tools
  searchHotelsTool,
  createHotelBookingTool,
  getBookingDetailsTool,
  cancelBookingTool,

  // Restaurant tools
  searchRestaurantsTool,
  placeOrderTool,
  reserveTableTool,
  getOrderStatusTool,

  // Room service tools
  roomServiceTool,
  housekeepingTool,

  // Financial tools
  getWalletBalanceTool,
  getLoyaltyPointsTool,

  // Search
  searchProductsTool,

  // Intent graph tools
  getUserIntentsTool,
  triggerNudgeTool,

  // Support
  escalateToStaffTool,
];

// ── Helper Functions ─────────────────────────────────────────────────────────────

function getNextTier(currentTier: string): string {
  const tiers = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = tiers.indexOf(currentTier.toLowerCase());
  return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : 'max';
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    pending: 'Order received',
    confirmed: 'Order confirmed',
    preparing: 'Being prepared',
    ready: 'Ready for pickup',
    out_for_delivery: 'On the way',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  return messages[status.toLowerCase()] || status;
}

export default ALL_REZ_TOOLS;
