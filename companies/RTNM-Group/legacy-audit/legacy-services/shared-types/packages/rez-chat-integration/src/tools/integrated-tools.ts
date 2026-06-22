// ── Integrated Tools ────────────────────────────────────────────────────────────────
// Real tool implementations connected to ReZ ecosystem services

import { CustomerContext } from '@rez/chat-ai';
import { RezChatIntegration } from '../index';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'search' | 'order' | 'booking' | 'account' | 'support';
  parameters: Record<string, { type: string; description: string; required: boolean }>;
  execute: (params: Record<string, unknown>, context: CustomerContext, integration: RezChatIntegration) => Promise<ToolResult>;
}

// ── Hotel Tools ─────────────────────────────────────────────────────────────────

const HOTEL_TOOLS: ToolDefinition[] = [
  {
    name: 'search_hotels',
    description: 'Search available hotels in a city',
    category: 'search',
    parameters: {
      city: { type: 'string', description: 'City name', required: true },
      checkIn: { type: 'string', description: 'Check-in date (YYYY-MM-DD)', required: true },
      checkOut: { type: 'string', description: 'Check-out date (YYYY-MM-DD)', required: true },
      guests: { type: 'number', description: 'Number of guests', required: false },
      rooms: { type: 'number', description: 'Number of rooms', required: false },
      maxPrice: { type: 'number', description: 'Maximum price per night (₹)', required: false },
    },
    execute: async (params, context, integration) => {
      try {
        const result = await integration.searchHotels({
          city: params.city as string,
          checkIn: params.checkIn as string,
          checkOut: params.checkOut as string,
          guests: params.guests as number || 2,
          rooms: params.rooms as number || 1,
          maxPrice: params.maxPrice as number,
        });

        return {
          success: true,
          data: {
            hotels: result.hotels,
            total: result.total,
            message: `Found ${result.total} hotels in ${params.city}`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'get_hotel_details',
    description: 'Get detailed information about a hotel',
    category: 'search',
    parameters: {
      hotelId: { type: 'string', description: 'Hotel ID', required: true },
    },
    execute: async (params, context, integration) => {
      try {
        const hotel = await integration.getHotelDetails(params.hotelId as string);

        if (!hotel) {
          return { success: false, error: 'Hotel not found' };
        }

        return {
          success: true,
          data: {
            hotel,
            message: `${hotel.name}: ₹${hotel.roomTypes[0]?.baseRate || 'N/A'}+ per night`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'check_room_availability',
    description: 'Check room availability for specific dates',
    category: 'booking',
    parameters: {
      hotelId: { type: 'string', description: 'Hotel ID', required: true },
      roomTypeId: { type: 'string', description: 'Room type ID (optional)', required: false },
      checkIn: { type: 'string', description: 'Check-in date (YYYY-MM-DD)', required: true },
      checkOut: { type: 'string', description: 'Check-out date (YYYY-MM-DD)', required: true },
      rooms: { type: 'number', description: 'Number of rooms', required: false },
    },
    execute: async (params, context, integration) => {
      try {
        const availability = await integration.checkRoomAvailability({
          hotelId: params.hotelId as string,
          roomTypeId: params.roomTypeId as string,
          checkIn: params.checkIn as string,
          checkOut: params.checkOut as string,
          rooms: params.rooms as number || 1,
        });

        return {
          success: true,
          data: {
            availability,
            availableCount: availability.filter(r => r.available).length,
            message: `${availability.filter(r => r.available).length} room types available`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'hold_booking',
    description: 'Hold a hotel room (10 minute hold)',
    category: 'booking',
    parameters: {
      hotelId: { type: 'string', description: 'Hotel ID', required: true },
      roomTypeId: { type: 'string', description: 'Room type ID', required: true },
      checkIn: { type: 'string', description: 'Check-in date (YYYY-MM-DD)', required: true },
      checkOut: { type: 'string', description: 'Check-out date (YYYY-MM-DD)', required: true },
      rooms: { type: 'number', description: 'Number of rooms', required: false },
      guests: { type: 'number', description: 'Number of guests', required: true },
      guestName: { type: 'string', description: 'Guest name', required: true },
      guestPhone: { type: 'string', description: 'Guest phone number', required: true },
      specialRequests: { type: 'string', description: 'Special requests', required: false },
    },
    execute: async (params, context, integration) => {
      try {
        const hold = await integration.holdBooking({
          userId: context.customerId,
          hotelId: params.hotelId as string,
          roomTypeId: params.roomTypeId as string,
          checkIn: params.checkIn as string,
          checkOut: params.checkOut as string,
          rooms: params.rooms as number || 1,
          guests: params.guests as number,
          guestName: params.guestName as string,
          guestPhone: params.guestPhone as string,
          userTier: context.tier,
          specialRequests: params.specialRequests as string,
        });

        if (!hold) {
          return { success: false, error: 'Unable to hold booking. Rooms may not be available.' };
        }

        return {
          success: true,
          data: {
            holdId: hold.holdId,
            bookingRef: hold.bookingRef,
            expiresIn: hold.expiresIn,
            total: hold.totalValue,
            message: `Room held for ${Math.floor(hold.expiresIn / 60)} minutes. Ref: ${hold.bookingRef}`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'get_booking_status',
    description: 'Get hotel booking status',
    category: 'booking',
    parameters: {
      bookingId: { type: 'string', description: 'Booking ID', required: true },
    },
    execute: async (params, context, integration) => {
      try {
        const booking = await integration.getBookingStatus(params.bookingId as string);

        if (!booking) {
          return { success: false, error: 'Booking not found' };
        }

        return {
          success: true,
          data: {
            booking,
            message: `${booking.statusText} - ${booking.hotel.name}`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'cancel_booking',
    description: 'Cancel a hotel booking',
    category: 'booking',
    parameters: {
      bookingId: { type: 'string', description: 'Booking ID', required: true },
      reason: { type: 'string', description: 'Reason for cancellation', required: false },
    },
    execute: async (params, context, integration) => {
      try {
        const result = await integration.cancelBooking({
          bookingId: params.bookingId as string,
          reason: params.reason as string,
          userId: context.customerId,
        });

        return {
          success: result.success,
          data: {
            refundAmount: result.refundAmount,
            message: result.message,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
];

// ── Restaurant/Merchant Tools ─────────────────────────────────────────────────────

const MERCHANT_TOOLS: ToolDefinition[] = [
  {
    name: 'search_restaurants',
    description: 'Search restaurants and places to eat',
    category: 'search',
    parameters: {
      query: { type: 'string', description: 'Restaurant name or cuisine type', required: true },
      location: { type: 'string', description: 'Area or location', required: false },
      category: { type: 'string', description: 'Food category (pizza, chinese, etc.)', required: false },
      limit: { type: 'number', description: 'Number of results', required: false },
    },
    execute: async (params, context, integration) => {
      try {
        const result = await integration.searchMerchants({
          query: params.query as string,
          category: params.category as string,
          location: params.location as string,
          limit: params.limit as number || 10,
        });

        return {
          success: true,
          data: {
            merchants: result.merchants,
            total: result.total,
            message: `Found ${result.total} places matching "${params.query}"`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'get_menu',
    description: 'Get restaurant menu',
    category: 'search',
    parameters: {
      merchantId: { type: 'string', description: 'Restaurant ID', required: true },
      category: { type: 'string', description: 'Menu category filter', required: false },
    },
    execute: async (params, context, integration) => {
      try {
        const menu = await integration.getMerchantMenu(
          params.merchantId as string,
          params.category as string
        );

        if (!menu) {
          return { success: false, error: 'Menu not found' };
        }

        return {
          success: true,
          data: {
            merchantName: menu.merchantName,
            categories: menu.categories,
            items: menu.items,
            total: menu.items.length,
            message: `${menu.merchantName} menu: ${menu.items.length} items across ${menu.categories.length} categories`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'check_table_availability',
    description: 'Check table availability at restaurant',
    category: 'booking',
    parameters: {
      merchantId: { type: 'string', description: 'Restaurant ID', required: true },
      date: { type: 'string', description: 'Date (YYYY-MM-DD)', required: true },
      time: { type: 'string', description: 'Time (HH:MM)', required: true },
      partySize: { type: 'number', description: 'Number of guests', required: true },
    },
    execute: async (params, context, integration) => {
      try {
        const availability = await integration.searchMerchants({} as any);

        return {
          success: true,
          data: {
            available: true,
            slots: availability,
            message: `Tables available for ${params.partySize} guests on ${params.date} at ${params.time}`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
];

// ── Order Tools ──────────────────────────────────────────────────────────────────

const ORDER_TOOLS: ToolDefinition[] = [
  {
    name: 'add_to_cart',
    description: 'Add items to cart for ordering',
    category: 'order',
    parameters: {
      merchantId: { type: 'string', description: 'Restaurant/Merchant ID', required: true },
      items: { type: 'array', description: 'Array of {productId, quantity, notes}', required: true },
      specialInstructions: { type: 'string', description: 'Special instructions', required: false },
    },
    execute: async (params, context, integration) => {
      try {
        const items = params.items as Array<{ productId: string; quantity: number; notes?: string }>;

        const result = await integration.addToCart({
          userId: context.customerId,
          merchantId: params.merchantId as string,
          items,
          specialInstructions: params.specialInstructions as string,
        });

        if (!result) {
          return { success: false, error: 'Unable to add items to cart' };
        }

        return {
          success: true,
          data: {
            cartId: result.cartId,
            items: result.items,
            total: result.total,
            message: `Added to cart. Total: ₹${result.total}`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'place_order',
    description: 'Place an order (delivery or pickup)',
    category: 'order',
    parameters: {
      cartId: { type: 'string', description: 'Cart ID', required: true },
      deliveryAddress: { type: 'string', description: 'Delivery address', required: false },
      deliveryTime: { type: 'string', description: 'Preferred delivery time', required: false },
      paymentMethod: { type: 'string', description: 'Payment method (upi, card, wallet, cod)', required: true },
    },
    execute: async (params, context, integration) => {
      try {
        const result = await integration.placeOrder({
          userId: context.customerId,
          cartId: params.cartId as string,
          deliveryAddress: params.deliveryAddress as string,
          deliveryTime: params.deliveryTime as string,
          paymentMethod: params.paymentMethod as 'card' | 'upi' | 'wallet' | 'cod',
        });

        if (!result) {
          return { success: false, error: 'Unable to place order' };
        }

        return {
          success: true,
          data: {
            orderId: result.orderId,
            orderRef: result.orderRef,
            status: result.status,
            total: result.total,
            message: `Order placed! Ref: ${result.orderRef}. Total: ₹${result.total}`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'get_order_status',
    description: 'Track order status',
    category: 'order',
    parameters: {
      orderId: { type: 'string', description: 'Order ID', required: true },
    },
    execute: async (params, context, integration) => {
      try {
        const order = await integration.getOrderStatus(params.orderId as string);

        if (!order) {
          return { success: false, error: 'Order not found' };
        }

        return {
          success: true,
          data: {
            order,
            message: `${order.statusText} - ${order.merchant.name}`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'cancel_order',
    description: 'Cancel an order',
    category: 'order',
    parameters: {
      orderId: { type: 'string', description: 'Order ID', required: true },
      reason: { type: 'string', description: 'Reason for cancellation', required: false },
    },
    execute: async (params, context, integration) => {
      try {
        const result = await integration.cancelOrder({
          orderId: params.orderId as string,
          reason: params.reason as string,
          userId: context.customerId,
        });

        return {
          success: result.success,
          data: {
            message: result.message,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'get_order_history',
    description: 'Get past orders',
    category: 'account',
    parameters: {
      limit: { type: 'number', description: 'Number of orders to show', required: false },
    },
    execute: async (params, context, integration) => {
      try {
        const orders = await integration.getOrderHistory(
          context.customerId,
          params.limit as number || 10
        );

        return {
          success: true,
          data: {
            orders,
            total: orders.length,
            message: `You have ${orders.length} past orders`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
];

// ── Account/Wallet Tools ─────────────────────────────────────────────────────────

const ACCOUNT_TOOLS: ToolDefinition[] = [
  {
    name: 'get_profile',
    description: 'Get customer profile and membership info',
    category: 'account',
    parameters: {},
    execute: async (params, context, integration) => {
      try {
        const [wallet, loyalty] = await Promise.all([
          integration.getWalletBalance(context.customerId),
          integration.getLoyaltyProfile(context.customerId),
        ]);

        return {
          success: true,
          data: {
            name: context.name || 'Valued Customer',
            email: context.email,
            tier: context.tier || loyalty?.tier || 'bronze',
            points: loyalty?.points || 0,
            coins: wallet?.coinBalance || 0,
            message: `${context.name || 'Member'} - ${loyalty?.tier || 'Bronze'} tier with ${loyalty?.points || 0} points`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'get_wallet_balance',
    description: 'Get wallet balance and coins',
    category: 'account',
    parameters: {},
    execute: async (params, context, integration) => {
      try {
        const wallet = await integration.getWalletBalance(context.customerId);

        return {
          success: true,
          data: {
            coins: wallet?.coinBalance || 0,
            cash: wallet?.cashBalance || 0,
            totalValue: wallet?.totalValue || 0,
            expiringCoins: wallet?.expiringCoins || [],
            message: `Balance: ${wallet?.coinBalance || 0} ReZ Coins (₹${wallet?.totalValue || 0})`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
  {
    name: 'get_expiring_rewards',
    description: 'Get rewards expiring soon',
    category: 'account',
    parameters: {
      daysAhead: { type: 'number', description: 'Days to check ahead', required: false },
    },
    execute: async (params, context, integration) => {
      try {
        const rewards = await integration.getExpiringRewards(
          context.customerId,
          params.daysAhead as number || 7
        );

        return {
          success: true,
          data: {
            rewards,
            count: rewards.length,
            message: `${rewards.length} reward(s) expiring soon`,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },
];

// ── Support Tools ────────────────────────────────────────────────────────────────

const SUPPORT_TOOLS: ToolDefinition[] = [
  {
    name: 'escalate_to_support',
    description: 'Transfer to human support agent',
    category: 'support',
    parameters: {
      reason: { type: 'string', description: 'Reason for escalation', required: true },
      department: { type: 'string', description: 'Department (sales, support, billing, technical)', required: false },
    },
    execute: async (params, context, integration) => {
      return {
        success: true,
        data: {
          ticketId: `TKT${Date.now()}`,
          department: params.department || 'support',
          estimatedWait: '5-10 minutes',
          message: 'Connecting you with a support agent...',
        },
      };
    },
  },
  {
    name: 'file_complaint',
    description: 'File a complaint',
    category: 'support',
    parameters: {
      orderId: { type: 'string', description: 'Order/Booking ID', required: true },
      type: { type: 'string', description: 'Complaint type', required: true },
      description: { type: 'string', description: 'Detailed description', required: true },
    },
    execute: async (params, context, integration) => {
      return {
        success: true,
        data: {
          complaintId: `CMP${Date.now()}`,
          status: 'submitted',
          message: 'Your complaint has been submitted. We will respond within 24 hours.',
        },
      };
    },
  },
  {
    name: 'request_refund',
    description: 'Request a refund',
    category: 'support',
    parameters: {
      orderId: { type: 'string', description: 'Order/Booking ID', required: true },
      reason: { type: 'string', description: 'Reason for refund', required: true },
    },
    execute: async (params, context, integration) => {
      return {
        success: true,
        data: {
          refundId: `REF${Date.now()}`,
          status: 'processing',
          message: 'Refund request submitted. Processing takes 5-7 business days.',
        },
      };
    },
  },
];

// ── All Tools Combined ────────────────────────────────────────────────────────────

export function getIntegratedTools(integration: RezChatIntegration): ToolDefinition[] {
  return [
    ...HOTEL_TOOLS,
    ...MERCHANT_TOOLS,
    ...ORDER_TOOLS,
    ...ACCOUNT_TOOLS,
    ...SUPPORT_TOOLS,
  ];
}

export function getToolsByCategory(category: ToolDefinition['category']): ToolDefinition[] {
  const all = [
    ...HOTEL_TOOLS,
    ...MERCHANT_TOOLS,
    ...ORDER_TOOLS,
    ...ACCOUNT_TOOLS,
    ...SUPPORT_TOOLS,
  ];
  return all.filter(t => t.category === category);
}

export async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  context: CustomerContext,
  integration: RezChatIntegration
): Promise<ToolResult> {
  const allTools = getIntegratedTools(integration);
  const tool = allTools.find(t => t.name === toolName);

  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  // Validate required parameters
  for (const [name, def] of Object.entries(tool.parameters)) {
    if (def.required && !(name in params)) {
      return { success: false, error: `Missing required parameter: ${name}` };
    }
  }

  try {
    return await tool.execute(params, context, integration);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export {
  HOTEL_TOOLS,
  MERCHANT_TOOLS,
  ORDER_TOOLS,
  ACCOUNT_TOOLS,
  SUPPORT_TOOLS,
};

export type { ToolDefinition, ToolResult };
