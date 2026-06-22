// ── Comprehensive Tool Handlers ──────────────────────────────────────────────────
// All tools the AI can use to help customers

import crypto from 'crypto';
import {
  CustomerContext,
  ToolHandler,
  ToolResult,
} from '../types';

// ── Product/Service Search ──────────────────────────────────────────────────────

export interface ProductSearchParams {
  query: string;
  category?: string;
  filters?: {
    priceMin?: number;
    priceMax?: number;
    rating?: number;
    inStock?: boolean;
  };
  limit?: number;
}

export interface ProductSearchResult {
  success: boolean;
  data?: {
    products: Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      category: string;
      rating?: number;
      inStock: boolean;
      image?: string;
    }>;
    total: number;
  };
  error?: string;
}

export interface ServiceSearchParams {
  query: string;
  category?: string;
  location?: string;
  rating?: number;
  limit?: number;
}

export interface ServiceSearchResult {
  success: boolean;
  data?: {
    services: Array<{
      id: string;
      name: string;
      description: string;
      provider: string;
      price: string;
      rating?: number;
      available: boolean;
    }>;
    total: number;
  };
  error?: string;
}

// ── Order Management ────────────────────────────────────────────────────────────

export interface OrderParams {
  productId: string;
  quantity: number;
  deliveryAddress?: string;
  specialInstructions?: string;
}

export interface OrderResult {
  success: boolean;
  data?: {
    orderId: string;
    status: string;
    estimatedDelivery?: string;
    total: number;
    items: string[];
  };
  error?: string;
}

export interface OrderStatusParams {
  orderId: string;
}

export interface OrderStatusResult {
  success: boolean;
  data?: {
    orderId: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
    statusText: string;
    estimatedDelivery?: string;
    tracking?: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  };
  error?: string;
}

export interface CancelOrderParams {
  orderId: string;
  reason?: string;
}

// ── Booking Management ─────────────────────────────────────────────────────────

export interface HotelBookingParams {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  guests: number;
  specialRequests?: string;
}

export interface RestaurantReservationParams {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  seatingPreference?: 'indoor' | 'outdoor' | 'private';
  occasion?: string;
  specialRequests?: string;
}

export interface ServiceBookingParams {
  serviceId: string;
  providerId: string;
  date: string;
  time: string;
  duration?: number;
  notes?: string;
}

// ── Support & Escalation ──────────────────────────────────────────────────────

export interface EscalateParams {
  reason: string;
  department?: 'sales' | 'support' | 'billing' | 'technical' | 'management';
  priority?: 'normal' | 'high' | 'urgent';
  conversationHistory?: string[];
}

export interface EscalateResult {
  success: boolean;
  data?: {
    ticketId: string;
    estimatedWait?: string;
    department: string;
    message: string;
  };
  error?: string;
}

// ── Account & Profile ───────────────────────────────────────────────────────────

export interface ProfileParams {
  userId: string;
}

export interface ProfileResult {
  success: boolean;
  data?: {
    name: string;
    email: string;
    phone?: string;
    tier: string;
    totalOrders: number;
    totalSpent: number;
    coins: number;
    joinedDate: string;
  };
  error?: string;
}

// ── Complaint & Refund ─────────────────────────────────────────────────────────

export interface ComplaintParams {
  orderId: string;
  type: 'missing_item' | 'wrong_item' | 'damaged' | 'quality_issue' | 'late_delivery' | 'other';
  description: string;
  evidence?: string[];
}

export interface RefundParams {
  orderId: string;
  reason: string;
  amount?: number;
}

// ── Tool Registry ──────────────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'search' | 'order' | 'booking' | 'account' | 'support';
  parameters: Record<string, { type: string; description: string; required: boolean }>;
  execute: (params: Record<string, unknown>, context: CustomerContext) => Promise<ToolResult>;
}

// ── Intent Graph Tools ────────────────────────────────────────────────────────

export const getUserIntentsToolDef: ToolDefinition = {
  name: 'get_user_intents',
  description: 'Get a user\'s active shopping/travel/dining intents for personalization',
  category: 'search',
  parameters: {
    userId: { type: 'string', description: 'User ID', required: true },
  },
  execute: async (params, _context) => {
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
          activeIntents: enriched.activeIntents.map((i) => ({
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
    } catch {
      return { success: false, error: 'Failed to fetch intents' };
    }
  },
};

export const triggerNudgeToolDef: ToolDefinition = {
  name: 'trigger_nudge',
  description: 'Trigger a nudge for a dormant user intent to encourage conversion',
  category: 'search',
  parameters: {
    userId: { type: 'string', description: 'User ID', required: true },
    intentKey: { type: 'string', description: 'The intent key to revive', required: true },
    triggerType: { type: 'string', description: 'Trigger type: price_drop, return_user, seasonality, offer_match, manual', required: false },
  },
  execute: async (params, _context) => {
    try {
      // Note: Full nudge triggering requires access to dormantIntentService
      // This is a simplified version that just logs the intent
      const { emitIntentRevived } = await import('../intent-graph');
      emitIntentRevived(
        String(params.userId),
        String(params.intentKey),
        String(params.triggerType || 'manual')
      );
      return { success: true, data: { message: 'Revival event emitted' } };
    } catch {
      return { success: false, error: 'Failed to trigger revival' };
    }
  },
};

export const TOOL_REGISTRY: ToolDefinition[] = [
  // ── Search Tools ────────────────────────────────────────────────────────────
  {
    name: 'search_products',
    description: 'Search for products in the catalog',
    category: 'search',
    parameters: {
      query: { type: 'string', description: 'Product search query', required: true },
      category: { type: 'string', description: 'Product category filter', required: false },
      priceMax: { type: 'number', description: 'Maximum price', required: false },
      limit: { type: 'number', description: 'Number of results (default 10)', required: false },
    },
    execute: async (params, _context) => {
      // Simulate product search - replace with actual API call
      return {
        success: true,
        data: {
          products: [
            {
              id: `prod_${Date.now()}`,
              name: params.query as string,
              description: 'High-quality product matching your search',
              price: Math.floor(Math.random() * 100) + 10,
              category: (params.category as string) || 'general',
              rating: 4.0 + Math.random(),
              inStock: true,
            }
          ],
          total: 1,
        },
      };
    },
  },
  {
    name: 'search_services',
    description: 'Search for services (restaurants, salons, repairs, etc.)',
    category: 'search',
    parameters: {
      query: { type: 'string', description: 'Service search query', required: true },
      category: { type: 'string', description: 'Service category', required: false },
      location: { type: 'string', description: 'Location/area', required: false },
      limit: { type: 'number', description: 'Number of results', required: false },
    },
    execute: async (params, _context) => {
      return {
        success: true,
        data: {
          services: [
            {
              id: `svc_${Date.now()}`,
              name: params.query as string,
              description: 'Professional service provider',
              provider: 'Local Business',
              price: 'Contact for quote',
              rating: 4.0 + Math.random(),
              available: true,
            }
          ],
          total: 1,
        },
      };
    },
  },
  {
    name: 'search_restaurants',
    description: 'Search for restaurants and food places',
    category: 'search',
    parameters: {
      query: { type: 'string', description: 'Cuisine or restaurant name', required: true },
      location: { type: 'string', description: 'Area/neighborhood', required: false },
      cuisine: { type: 'string', description: 'Type of cuisine', required: false },
      limit: { type: 'number', description: 'Number of results', required: false },
    },
    execute: async (params, _context) => {
      return {
        success: true,
        data: {
          restaurants: [
            {
              id: `rest_${Date.now()}`,
              name: params.query as string,
              cuisine: (params.cuisine as string) || 'Various',
              rating: 4.0 + Math.random(),
              priceRange: '$$',
              deliveryTime: '30-45 min',
              available: true,
            }
          ],
          total: 1,
        },
      };
    },
  },

  // ── Order Tools ─────────────────────────────────────────────────────────────
  {
    name: 'place_order',
    description: 'Place an order for products',
    category: 'order',
    parameters: {
      productId: { type: 'string', description: 'Product ID to order', required: true },
      quantity: { type: 'number', description: 'Number of items', required: true },
      deliveryAddress: { type: 'string', description: 'Delivery address', required: false },
      specialInstructions: { type: 'string', description: 'Special instructions', required: false },
    },
    execute: async (params, context) => {
      return {
        success: true,
        data: {
          orderId: `ORD${Date.now()}`,
          status: 'confirmed',
          estimatedDelivery: '30-45 minutes',
          total: Math.floor(Math.random() * 100) + 20,
          items: ['Product'],
          message: `Order placed successfully for ${context.name || 'customer'}`,
        },
      };
    },
  },
  {
    name: 'get_order_status',
    description: 'Check the status of an existing order',
    category: 'order',
    parameters: {
      orderId: { type: 'string', description: 'Order ID to check', required: true },
    },
    execute: async (params, _context) => {
      const statuses = ['pending', 'confirmed', 'preparing', 'shipped', 'out_for_delivery', 'delivered'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      return {
        success: true,
        data: {
          orderId: params.orderId as string,
          status: randomStatus,
          statusText: `Your order is ${randomStatus.replace('_', ' ')}`,
          estimatedDelivery: randomStatus === 'delivered' ? 'Delivered' : '30-45 minutes',
          items: [{ name: 'Item 1', quantity: 1, price: 25.99 }],
        },
      };
    },
  },
  {
    name: 'cancel_order',
    description: 'Cancel an existing order',
    category: 'order',
    parameters: {
      orderId: { type: 'string', description: 'Order ID to cancel', required: true },
      reason: { type: 'string', description: 'Reason for cancellation', required: false },
    },
    execute: async (params, _context) => {
      return {
        success: true,
        data: {
          orderId: params.orderId,
          status: 'cancelled',
          refundStatus: 'processing',
          refundTime: '5-7 business days',
          message: 'Order cancelled. Refund will be processed within 5-7 business days.',
        },
      };
    },
  },

  // ── Booking Tools ───────────────────────────────────────────────────────────
  {
    name: 'book_hotel',
    description: 'Book a hotel room',
    category: 'booking',
    parameters: {
      hotelId: { type: 'string', description: 'Hotel ID', required: true },
      checkIn: { type: 'string', description: 'Check-in date (YYYY-MM-DD)', required: true },
      checkOut: { type: 'string', description: 'Check-out date (YYYY-MM-DD)', required: true },
      roomType: { type: 'string', description: 'Room type preference', required: false },
      guests: { type: 'number', description: 'Number of guests', required: true },
      specialRequests: { type: 'string', description: 'Special requests', required: false },
    },
    execute: async (params, context) => {
      return {
        success: true,
        data: {
          bookingId: `HBK${Date.now()}`,
          status: 'confirmed',
          hotelId: params.hotelId,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          guests: params.guests,
          roomType: params.roomType || 'Standard',
          message: `Hotel booked for ${context.name || 'guest'} from ${params.checkIn} to ${params.checkOut}`,
        },
      };
    },
  },
  {
    name: 'book_restaurant',
    description: 'Make a restaurant reservation',
    category: 'booking',
    parameters: {
      restaurantId: { type: 'string', description: 'Restaurant ID', required: true },
      date: { type: 'string', description: 'Reservation date (YYYY-MM-DD)', required: true },
      time: { type: 'string', description: 'Reservation time (HH:MM)', required: true },
      partySize: { type: 'number', description: 'Number of guests', required: true },
      occasion: { type: 'string', description: 'Special occasion', required: false },
    },
    execute: async (params, context) => {
      return {
        success: true,
        data: {
          reservationId: `RES${Date.now()}`,
          status: 'confirmed',
          restaurantId: params.restaurantId,
          date: params.date,
          time: params.time,
          partySize: params.partySize,
          message: `Table reserved for ${context.name || 'guest'} on ${params.date} at ${params.time} for ${params.partySize} guests`,
        },
      };
    },
  },
  {
    name: 'book_service',
    description: 'Book an appointment for a service',
    category: 'booking',
    parameters: {
      serviceId: { type: 'string', description: 'Service ID', required: true },
      providerId: { type: 'string', description: 'Service provider ID', required: true },
      date: { type: 'string', description: 'Appointment date (YYYY-MM-DD)', required: true },
      time: { type: 'string', description: 'Appointment time (HH:MM)', required: true },
      notes: { type: 'string', description: 'Additional notes', required: false },
    },
    execute: async (params, context) => {
      return {
        success: true,
        data: {
          appointmentId: `APT${Date.now()}`,
          status: 'confirmed',
          serviceId: params.serviceId,
          date: params.date,
          time: params.time,
          message: `Appointment booked for ${context.name || 'customer'} on ${params.date} at ${params.time}`,
        },
      };
    },
  },

  // ── Account Tools ─────────────────────────────────────────────────────────
  {
    name: 'get_profile',
    description: 'Get customer profile information',
    category: 'account',
    parameters: {},
    execute: async (_params, context) => {
      return {
        success: true,
        data: {
          name: context.name || 'Customer',
          email: context.email || 'email@example.com',
          phone: context.phone || 'Not provided',
          tier: context.tier || 'basic',
          totalOrders: context.recentOrders?.length || 0,
          totalSpent: context.totalSpent || 0,
          coins: Math.floor((context.totalSpent || 0) / 100),
          visitCount: context.visitCount || 0,
        },
      };
    },
  },
  {
    name: 'get_order_history',
    description: 'Get customer order history',
    category: 'account',
    parameters: {
      limit: { type: 'number', description: 'Number of orders to return', required: false },
    },
    execute: async (_params, context) => {
      return {
        success: true,
        data: {
          orders: context.recentOrders?.map(o => ({
            orderId: o.orderId,
            type: o.type,
            status: o.status,
            total: o.total,
            date: o.date,
          })) || [],
          total: context.recentOrders?.length || 0,
        },
      };
    },
  },

  // ── Support Tools ─────────────────────────────────────────────────────────
  {
    name: 'escalate_to_support',
    description: 'Transfer conversation to human support agent',
    category: 'support',
    parameters: {
      reason: { type: 'string', description: 'Reason for escalation', required: true },
      department: { type: 'string', description: 'Department: sales, support, billing, technical, management', required: false },
      priority: { type: 'string', description: 'Priority: normal, high, urgent', required: false },
    },
    execute: async (params, _context) => {
      return {
        success: true,
        data: {
          ticketId: `TKT${Date.now()}`,
          department: (params.department as string) || 'support',
          priority: (params.priority as string) || 'normal',
          estimatedWait: '5-10 minutes',
          message: 'Connecting you with a support agent. Please hold...',
        },
      };
    },
  },
  {
    name: 'file_complaint',
    description: 'File a complaint about an order or service',
    category: 'support',
    parameters: {
      orderId: { type: 'string', description: 'Order ID related to complaint', required: true },
      type: { type: 'string', description: 'Complaint type', required: true },
      description: { type: 'string', description: 'Detailed description', required: true },
    },
    execute: async (params, _context) => {
      return {
        success: true,
        data: {
          complaintId: `CMP${Date.now()}`,
          orderId: params.orderId,
          status: 'submitted',
          message: 'Your complaint has been submitted. We will review and respond within 24 hours.',
        },
      };
    },
  },
  {
    name: 'request_refund',
    description: 'Request a refund for an order',
    category: 'support',
    parameters: {
      orderId: { type: 'string', description: 'Order ID for refund', required: true },
      reason: { type: 'string', description: 'Reason for refund', required: true },
      amount: { type: 'number', description: 'Specific amount (optional, for partial refunds)', required: false },
    },
    execute: async (params, _context) => {
      return {
        success: true,
        data: {
          refundId: `REF${Date.now()}`,
          orderId: params.orderId,
          status: 'processing',
          estimatedProcessing: '5-7 business days',
          message: 'Refund request submitted. You will receive confirmation via email.',
        },
      };
    },
  },
  {
    name: 'get_support_topics',
    description: 'Get common support topics and FAQs',
    category: 'support',
    parameters: {},
    execute: async () => {
      return {
        success: true,
        data: {
          topics: [
            { id: 'orders', title: 'Track or cancel order', icon: '📦' },
            { id: 'refunds', title: 'Refunds & Returns', icon: '💰' },
            { id: 'account', title: 'Account settings', icon: '👤' },
            { id: 'payment', title: 'Payment issues', icon: '💳' },
            { id: 'booking', title: 'Booking changes', icon: '📅' },
            { id: 'technical', title: 'Technical support', icon: '🔧' },
          ],
        },
      };
    },
  },

  // ── Intent Graph Tools ───────────────────────────────────────────────────────
  getUserIntentsToolDef,
  triggerNudgeToolDef,
];

// ── Tool Execution Helper ──────────────────────────────────────────────────────

export async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  context: CustomerContext
): Promise<ToolResult> {
  const tool = TOOL_REGISTRY.find(t => t.name === toolName);

  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    };
  }

  try {
    return await tool.execute(params, context);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
}

export function getToolsByCategory(category: ToolDefinition['category']): ToolDefinition[] {
  return TOOL_REGISTRY.filter(t => t.category === category);
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find(t => t.name === name);
}
