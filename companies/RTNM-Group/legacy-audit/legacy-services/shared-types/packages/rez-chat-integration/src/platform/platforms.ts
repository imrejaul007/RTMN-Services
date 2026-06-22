// ── Platform-Specific Chat Configurations ─────────────────────────────────────────────
// ReZ Now, Hotel QR, Restaurant, etc. have specific chat behaviors

import { IndustryCategory, CustomerContext } from '@rez/chat-ai';

// ── Platform Types ──────────────────────────────────────────────────────────────

export type ReZPlatform =
  | 'rez-now'              // Main consumer app
  | 'hotel-room-qr'        // Hotel room QR code chat
  | 'hotel-app'            // Hotel OTA consumer app
  | 'web-menu'            // Restaurant web menu
  | 'restaurant-app'        // Restaurant POS app
  | 'merchant-app'         // Merchant POS/management app
  | 'rez-admin'           // Admin dashboard
  | 'retail-app'           // Retail/shopping app
  | 'support-portal';      // Customer support portal

// ── Platform Configuration ────────────────────────────────────────────────────────

export interface PlatformConfig {
  platform: ReZPlatform;
  appType: string;
  industryCategory?: IndustryCategory;
  enableRoomService?: boolean;
  enableOrdering?: boolean;
  enableBookings?: boolean;
  enableWallet?: boolean;
  enableLoyalty?: boolean;
  availableServices?: string[];
  welcomeMessage: string;
  quickActions?: Array<{
    label: string;
    action: string;
    icon?: string;
  }>;
  tintColor?: string;
}

// ── Platform Configurations ──────────────────────────────────────────────────────

export const PLATFORM_CONFIGS: Record<ReZPlatform, PlatformConfig> = {
  'rez-now': {
    platform: 'rez-now',
    appType: 'general',
    industryCategory: undefined, // Multi-category
    enableRoomService: false,
    enableOrdering: true,
    enableBookings: true,
    enableWallet: true,
    enableLoyalty: true,
    availableServices: ['hotels', 'restaurants', 'retail', 'orders', 'bookings', 'wallet'],
    welcomeMessage: `Hello! I'm your ReZ assistant. I can help you with:

• Hotels & accommodations
• Restaurant reservations & food orders
• Shopping & deliveries
• Track your orders
• Check wallet & rewards
• General support

What can I help you with?`,
    quickActions: [
      { label: 'Book Hotel', action: 'search_hotels', icon: '🏨' },
      { label: 'Order Food', action: 'search_restaurants', icon: '🍔' },
      { label: 'Track Order', action: 'track_order', icon: '📦' },
      { label: 'Wallet', action: 'show_wallet', icon: '💰' },
    ],
    tintColor: '#6366f1',
  },

  'hotel-room-qr': {
    platform: 'hotel-room-qr',
    appType: 'hotel',
    industryCategory: 'hotel',
    enableRoomService: true,
    enableOrdering: true,
    enableBookings: false,
    enableWallet: true,
    enableLoyalty: true,
    availableServices: ['room_service', 'housekeeping', 'laundry', 'concierge', 'checkout'],
    welcomeMessage: `Welcome to your room! I'm your in-room assistant. I can help with:

• Room service (food & beverages)
• Housekeeping requests
• Laundry service
• Spa appointments
• Transport bookings
• Checkout & billing

How may I assist you today?`,
    quickActions: [
      { label: 'Order Food', action: 'room_service', icon: '🍽️' },
      { label: 'Housekeeping', action: 'housekeeping', icon: '🧹' },
      { label: 'Extra Towels', action: 'towels', icon: '🛁' },
      { label: 'Need Anything', action: 'concierge', icon: '💁' },
    ],
    tintColor: '#0ea5e9',
  },

  'hotel-app': {
    platform: 'hotel-app',
    appType: 'hotel',
    industryCategory: 'hotel',
    enableRoomService: false,
    enableOrdering: false,
    enableBookings: true,
    enableWallet: true,
    enableLoyalty: true,
    availableServices: ['hotel_search', 'booking', 'checkin', 'checkout', 'support'],
    welcomeMessage: `Hello! I'm your hotel booking assistant. I can help with:

• Search hotels & book rooms
• Check booking status
• Modify or cancel reservations
• Check-in/check-out info
• Contact support

Where would you like to stay?`,
    quickActions: [
      { label: 'Search Hotels', action: 'search_hotels', icon: '🔍' },
      { label: 'My Bookings', action: 'view_bookings', icon: '📋' },
      { label: 'Need Help', action: 'support', icon: '💬' },
    ],
    tintColor: '#0ea5e9',
  },

  'web-menu': {
    platform: 'web-menu',
    appType: 'restaurant',
    industryCategory: 'restaurant',
    enableRoomService: false,
    enableOrdering: true,
    enableBookings: true,
    enableWallet: true,
    enableLoyalty: true,
    availableServices: ['menu', 'order', 'reservations', 'dietary'],
    welcomeMessage: `Welcome! I'm here to help you order. I can:

• Show you our menu
• Recommend popular items
• Help with dietary needs
• Place orders for pickup/delivery
• Make reservations

What would you like?`,
    quickActions: [
      { label: 'View Menu', action: 'show_menu', icon: '📋' },
      { label: 'Order Now', action: 'start_order', icon: '🛒' },
      { label: 'Book Table', action: 'reserve_table', icon: '📅' },
      { label: 'Popular Items', action: 'recommend', icon: '⭐' },
    ],
    tintColor: '#f97316',
  },

  'restaurant-app': {
    platform: 'restaurant-app',
    appType: 'restaurant',
    industryCategory: 'restaurant',
    enableRoomService: true,
    enableOrdering: true,
    enableBookings: true,
    enableWallet: true,
    enableLoyalty: true,
    availableServices: ['orders', 'tables', 'kitchen', 'support'],
    welcomeMessage: `Hello! I'm here to help manage orders. I can:

• Check order status
• Modify orders
• Table reservations
• Handle customer requests
• Kitchen coordination

How can I assist you?`,
    quickActions: [
      { label: 'Active Orders', action: 'active_orders', icon: '📦' },
      { label: 'Tables', action: 'table_status', icon: '🪑' },
      { label: 'New Order', action: 'new_order', icon: '➕' },
    ],
    tintColor: '#f97316',
  },

  'merchant-app': {
    platform: 'merchant-app',
    appType: 'retail',
    industryCategory: 'fashion',
    enableRoomService: false,
    enableOrdering: true,
    enableBookings: false,
    enableWallet: false,
    enableLoyalty: true,
    availableServices: ['orders', 'inventory', 'customers', 'analytics'],
    welcomeMessage: `Welcome, merchant! I'm here to help you manage your store. I can:

• View incoming orders
• Check inventory levels
• Customer inquiries
• Performance analytics
• Support requests

What would you like to do?`,
    quickActions: [
      { label: 'New Orders', action: 'new_orders', icon: '📦' },
      { label: 'Inventory', action: 'inventory', icon: '📊' },
      { label: 'Customers', action: 'customers', icon: '👥' },
      { label: 'Chat History', action: 'chat_history', icon: '💬' },
    ],
    tintColor: '#10b981',
  },

  'rez-admin': {
    platform: 'rez-admin',
    appType: 'general',
    enableRoomService: false,
    enableOrdering: false,
    enableBookings: false,
    enableWallet: false,
    enableLoyalty: false,
    availableServices: ['users', 'merchants', 'orders', 'analytics', 'support'],
    welcomeMessage: `Admin Dashboard Assistant. I can help with:

• User management queries
• Merchant oversight
• Order analytics
• Support ticket status
• System information

How may I assist?`,
    quickActions: [
      { label: 'Active Chats', action: 'active_chats', icon: '💬' },
      { label: 'Pending Issues', action: 'pending_issues', icon: '⚠️' },
      { label: 'Stats', action: 'stats', icon: '📊' },
    ],
    tintColor: '#8b5cf6',
  },

  'retail-app': {
    platform: 'retail-app',
    appType: 'retail',
    industryCategory: 'fashion',
    enableRoomService: false,
    enableOrdering: true,
    enableBookings: false,
    enableWallet: true,
    enableLoyalty: true,
    availableServices: ['products', 'orders', 'returns', 'loyalty'],
    welcomeMessage: `Hello! I'm your shopping assistant. I can help with:

• Browse products
• Track orders
• Returns & exchanges
• Loyalty points
• Product recommendations

What are you looking for?`,
    quickActions: [
      { label: 'Shop', action: 'browse_products', icon: '🛍️' },
      { label: 'My Orders', action: 'my_orders', icon: '📦' },
      { label: 'Rewards', action: 'my_rewards', icon: '⭐' },
    ],
    tintColor: '#ec4899',
  },

  'support-portal': {
    platform: 'support-portal',
    appType: 'support',
    industryCategory: 'support',
    enableRoomService: false,
    enableOrdering: false,
    enableBookings: false,
    enableWallet: true,
    enableLoyalty: true,
    availableServices: ['tickets', 'users', 'orders', 'refunds', 'chat'],
    welcomeMessage: `Support Portal Assistant. I can help you:

• Check ticket status
• Look up user accounts
• Order/booking issues
• Process refunds
• Route to specialists

How can I help?`,
    quickActions: [
      { label: 'New Ticket', action: 'create_ticket', icon: '🎫' },
      { label: 'Search User', action: 'search_user', icon: '🔍' },
      { label: 'Active Chats', action: 'active_chats', icon: '💬' },
    ],
    tintColor: '#ef4444',
  },
};

// ── Hotel Room Service Menu ─────────────────────────────────────────────────────

export interface RoomServiceItem {
  id: string;
  name: string;
  pricePaise: number;
  category: string;
  available: boolean;
  prepTime?: string;
  dietary?: string[];
}

export const ROOM_SERVICE_MENU: Record<string, RoomServiceItem[]> = {
  beverages: [
    { id: 'tea', name: 'Masala Tea', pricePaise: 5000, category: 'beverages', available: true },
    { id: 'coffee', name: 'Coffee', pricePaise: 7500, category: 'beverages', available: true },
    { id: 'espresso', name: 'Espresso', pricePaise: 12000, category: 'beverages', available: true },
    { id: 'juice', name: 'Fresh Juice', pricePaise: 10000, category: 'beverages', available: true },
    { id: 'water', name: 'Mineral Water', pricePaise: 2000, category: 'beverages', available: true },
  ],
  snacks: [
    { id: 'samosa', name: 'Samosa (2pc)', pricePaise: 8000, category: 'snacks', available: true },
    { id: 'pakoda', name: 'Onion Pakoda', pricePaise: 7000, category: 'snacks', available: true },
    { id: 'sandwich', name: 'Sandwich', pricePaise: 12000, category: 'snacks', available: true },
    { id: 'biscuits', name: 'Biscuits Plate', pricePaise: 10000, category: 'snacks', available: true },
  ],
  meals: [
    { id: 'breakfast', name: 'Continental Breakfast', pricePaise: 35000, category: 'meals', available: true },
    { id: 'lunch', name: 'Lunch Buffet', pricePaise: 55000, category: 'meals', available: true },
    { id: 'dinner', name: 'Dinner Buffet', pricePaise: 65000, category: 'meals', available: true },
    { id: 'bowl', name: 'Rice Bowl', pricePaise: 25000, category: 'meals', available: true },
  ],
  housekeeping: [
    { id: 'room_cleaning', name: 'Room Cleaning', pricePaise: 0, category: 'housekeeping', available: true },
    { id: 'towels', name: 'Extra Towels', pricePaise: 0, category: 'housekeeping', available: true },
    { id: 'toiletries', name: 'Extra Toiletries', pricePaise: 0, category: 'housekeeping', available: true },
    { id: 'bedding', name: 'Bedding Change', pricePaise: 0, category: 'housekeeping', available: true },
    { id: 'turndown', name: 'Turndown Service', pricePaise: 0, category: 'housekeeping', available: true },
  ],
  laundry: [
    { id: 'wash_fold', name: 'Wash & Fold (per kg)', pricePaise: 15000, category: 'laundry', available: true },
    { id: 'ironing', name: 'Ironing (per piece)', pricePaise: 2000, category: 'laundry', available: true },
    { id: 'dry_clean', name: 'Dry Clean (per piece)', pricePaise: 10000, category: 'laundry', available: true },
    { id: 'express', name: 'Express Service (+50%)', pricePaise: 0, category: 'laundry', available: true },
  ],
};

// ── Hotel Room Service Intents ────────────────────────────────────────────────────

export const ROOM_SERVICE_INTENTS: Record<string, { serviceType: string; items?: string[] }> = {
  'food': { serviceType: 'room_service', items: ['breakfast', 'lunch', 'dinner', 'snacks'] },
  'order food': { serviceType: 'room_service', items: ['breakfast', 'lunch', 'dinner', 'snacks'] },
  'room service': { serviceType: 'room_service' },
  'eat': { serviceType: 'room_service', items: ['breakfast', 'lunch', 'dinner'] },
  'hungry': { serviceType: 'room_service', items: ['meals'] },
  'drink': { serviceType: 'room_service', items: ['beverages'] },
  'coffee': { serviceType: 'room_service', items: ['coffee', 'espresso'] },
  'tea': { serviceType: 'room_service', items: ['tea'] },

  'clean': { serviceType: 'housekeeping', items: ['room_cleaning'] },
  'cleaning': { serviceType: 'housekeeping', items: ['room_cleaning'] },
  'housekeeping': { serviceType: 'housekeeping' },
  'towels': { serviceType: 'housekeeping', items: ['towels'] },
  'extra towels': { serviceType: 'housekeeping', items: ['towels'] },
  'toiletries': { serviceType: 'housekeeping', items: ['toiletries'] },
  'bedding': { serviceType: 'housekeeping', items: ['bedding'] },
  'sheets': { serviceType: 'housekeeping', items: ['bedding'] },
  'turndown': { serviceType: 'housekeeping', items: ['turndown'] },

  'laundry': { serviceType: 'laundry' },
  'wash': { serviceType: 'laundry', items: ['wash_fold'] },
  'iron': { serviceType: 'laundry', items: ['ironing'] },
  'dry clean': { serviceType: 'laundry', items: ['dry_clean'] },
  'clothes': { serviceType: 'laundry' },

  'checkout': { serviceType: 'checkout' },
  'check out': { serviceType: 'checkout' },
  'bill': { serviceType: 'checkout' },
  'payment': { serviceType: 'checkout' },

  'taxi': { serviceType: 'transport' },
  'cab': { serviceType: 'transport' },
  'transport': { serviceType: 'transport' },
  'pickup': { serviceType: 'transport' },
  'airport': { serviceType: 'transport' },

  'spa': { serviceType: 'spa' },
  'massage': { serviceType: 'spa' },
  'wellness': { serviceType: 'spa' },
  'treatment': { serviceType: 'spa' },

  'concierge': { serviceType: 'concierge' },
  'help': { serviceType: 'concierge' },
  'recommendation': { serviceType: 'concierge' },
  'restaurant': { serviceType: 'concierge' },
};

// ── Platform Context Builder ─────────────────────────────────────────────────────

export function buildPlatformContext(
  platform: ReZPlatform,
  customerContext: CustomerContext,
  additionalData?: {
    hotelId?: string;
    roomId?: string;
    bookingId?: string;
    merchantId?: string;
  }
): Record<string, unknown> {
  const config = PLATFORM_CONFIGS[platform];

  return {
    platform,
    appType: config.appType,
    industryCategory: config.industryCategory,
    availableServices: config.availableServices,
    hotelId: additionalData?.hotelId,
    roomId: additionalData?.roomId,
    bookingId: additionalData?.bookingId,
    merchantId: additionalData?.merchantId,
    customer: {
      id: customerContext.customerId,
      name: customerContext.name,
      tier: customerContext.tier,
      preferences: customerContext.preferences,
    },
    capabilities: {
      roomService: config.enableRoomService,
      ordering: config.enableOrdering,
      bookings: config.enableBookings,
      wallet: config.enableWallet,
      loyalty: config.enableLoyalty,
    },
  };
}

// ── Quick Action Handlers ────────────────────────────────────────────────────────

export function getQuickActionResponse(
  action: string,
  platform: ReZPlatform
): { message: string; action?: string } {
  switch (action) {
    case 'search_hotels':
      return {
        message: 'I can help you find hotels. Where would you like to stay and when?',
        action: 'hotel_search_flow',
      };
    case 'search_restaurants':
      return {
        message: 'Let me help you find great places to eat. What cuisine or location?',
        action: 'restaurant_search_flow',
      };
    case 'track_order':
      return {
        message: 'I can track your order. Could you provide your order ID?',
        action: 'track_order_flow',
      };
    case 'show_wallet':
      return {
        message: 'Let me check your wallet balance and rewards.',
        action: 'wallet_balance_flow',
      };
    case 'room_service':
      return {
        message: 'Room service menu:\n\n🍵 Beverages: Masala Tea ₹50, Coffee ₹75, Espresso ₹120\n🥤 Snacks: Samosa ₹80, Sandwich ₹120\n🍳 Meals: Breakfast ₹350, Lunch ₹550, Dinner ₹650\n\nWhat would you like to order?',
        action: 'room_service_order',
      };
    case 'housekeeping':
      return {
        message: 'Housekeeping services:\n\n🧹 Room Cleaning (Free)\n🛁 Extra Towels (Free)\n🧴 Extra Toiletries (Free)\n🛏️ Bedding Change (Free)\n\nWhen would you like us to come?',
        action: 'housekeeping_request',
      };
    case 'towels':
      return {
        message: "I'll send extra towels to your room right away.",
        action: 'housekeeping_request',
      };
    case 'concierge':
      return {
        message: 'Concierge services available:\n\n🚕 Transport bookings\n🍽️ Restaurant reservations\n🎫 Local tour bookings\n💆 Spa appointments\n\nHow may I assist?',
        action: 'concierge_flow',
      };
    default:
      return {
        message: 'How can I help you?',
      };
  }
}
