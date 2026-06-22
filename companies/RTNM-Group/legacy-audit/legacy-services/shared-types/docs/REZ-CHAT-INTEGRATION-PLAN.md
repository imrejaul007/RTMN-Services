# ReZ Conversational OS - Integration Execution Plan

## Current State Analysis

### Connected Systems
```
┌─────────────────────────────────────────────────────────────────────┐
│ ReZ Ecosystem │
├─────────────────────────────────────────────────────────────────────┤
│ │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ │ Hotel OTA │ │ rez-merchant │ │ rez-order │
│ │ │ │ │-service │ │ -service │
│ │ - HotelService │ │ - Products │ │ - Orders │
│ │ - BookingService│ │ - Tables │ │ - Cart │
│ │ - Inventory │ │ - Menu │ │ - Wallet │
│ │ - Pricing │ │ - POS │ │ │
│ │ - PMS │ │ │ │
│ └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
│ │ │ │
│ └────────┼────────┴─────────┼─────────┴─────────┼────────┘
│ │ │
│ ┌────────▼────────────────────────────────────────▼───────┐
│ │ rez-api-gateway │ (Central routing) │
│ └────────────────────────────────────────────────────────┘
│ │
│ ┌─────────────────┐
│ │ rez-chat-ai │ ← NEW (Neural layer)
│ │ - AI Handler │
│ │ - Tools Registry│
│ │ - Knowledge Base│
│ │ - Learning │
│ └─────────────────┘
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Integration Layer (Week 1-2)

### 1.1 Create ReZ Chat Integration Service

```typescript
// packages/rez-chat-integration/src/index.ts
// Central hub connecting chat AI to all ReZ services

export class RezChatIntegration {
  private hotelOTA: HotelOTAConnector;
  private merchantService: MerchantConnector;
  private orderService: OrderConnector;
  private walletService: WalletConnector;
  private notificationService: NotificationConnector;

  // Tool handlers call these connectors
  async searchHotels(params: SearchParams): Promise<HotelSearchResult>
  async getHotelDetails(hotelId: string): Promise<Hotel>
  async checkAvailability(hotelId, roomTypeId, dates): Promise<Availability>
  async holdBooking(params: BookingHoldParams): Promise<BookingHold>
  async confirmBooking(holdId, payment): Promise<Booking>

  async searchProducts(merchantId, query): Promise<Product[]>
  async getMenu(merchantId): Promise<Menu>
  async placeOrder(params: OrderParams): Promise<Order>

  async getWallet(userId): Promise<WalletBalance>
  async burnCoins(userId, amount): Promise<BurnResult>
  async getLoyaltyPoints(userId): Promise<LoyaltyPoints>
}
```

### 1.2 Service Connectors

| Connector | Source | Methods |
|-----------|--------|---------|
| HotelOTAConnector | Hotel OTA services | searchHotels, getHotel, checkAvailability, holdBooking, confirmBooking, getGuestOrders |
| MerchantConnector | rez-merchant-service | searchProducts, getMenu, getMerchantProfile, getTables |
| OrderConnector | rez-order-service | placeOrder, getOrderStatus, cancelOrder, getOrderHistory |
| WalletConnector | rez-wallet-service | getBalance, burnCoins, addCoins, getTransactions |
| LoyaltyConnector | rez-karma-service | getPoints, getRewards, getTier, getBenefits |
| NotificationConnector | rez-notification | sendPush, sendSMS, sendEmail |

### 1.3 Files to Create

```
packages/rez-chat-integration/
├── src/
│   ├── index.ts                    # Main integration class
│   ├── connectors/
│   │   ├── hotel.connector.ts      # Hotel OTA integration
│   │   ├── merchant.connector.ts   # Merchant service integration
│   │   ├── order.connector.ts      # Order service integration
│   │   ├── wallet.connector.ts     # Wallet integration
│   │   ├── loyalty.connector.ts    # Karma/loyalty integration
│   │   └── notification.connector.ts
│   ├── adapters/
│   │   ├── hotel.adapter.ts        # Transform Hotel OTA → Chat format
│   │   ├── product.adapter.ts      # Transform Products → Chat format
│   │   └── order.adapter.ts        # Transform Orders → Chat format
│   └── tools/
│       └── integrated-tools.ts      # Real tool implementations
├── package.json
└── tsconfig.json
```

---

## Phase 2: Real Tool Implementations (Week 2-3)

### 2.1 Hotel Tools (Connected to Hotel OTA)

```typescript
// Integrated Hotel Tools
const HOTEL_TOOLS = [
  {
    name: 'search_hotels',
    description: 'Search available hotels',
    category: 'booking',
    parameters: {
      city: { type: 'string', required: true },
      checkIn: { type: 'string', required: true },
      checkOut: { type: 'string', required: true },
      guests: { type: 'number', required: false },
      minPrice: { type: 'number', required: false },
      maxPrice: { type: 'number', required: false },
    },
    execute: async (params, context) => {
      const connector = new HotelOTAConnector();
      return connector.searchHotels({
        city: params.city,
        checkin: params.checkIn,
        checkout: params.checkOut,
        guests: params.guests || 2,
        minRate: params.minPrice,
        maxRate: params.maxPrice,
      });
    }
  },
  {
    name: 'check_room_availability',
    description: 'Check room availability for specific hotel',
    category: 'booking',
    parameters: {
      hotelId: { type: 'string', required: true },
      roomType: { type: 'string', required: false },
      checkIn: { type: 'string', required: true },
      checkOut: { type: 'string', required: true },
      rooms: { type: 'number', required: false },
    },
    execute: async (params, context) => {
      const connector = new HotelOTAConnector();
      return connector.checkAvailability(params);
    }
  },
  {
    name: 'hold_booking',
    description: 'Hold a room booking (10 min hold)',
    category: 'booking',
    parameters: {
      hotelId: { type: 'string', required: true },
      roomTypeId: { type: 'string', required: true },
      checkIn: { type: 'string', required: true },
      checkOut: { type: 'string', required: true },
      rooms: { type: 'number', required: false },
      guestName: { type: 'string', required: true },
      guestPhone: { type: 'string', required: true },
    },
    execute: async (params, context) => {
      const connector = new HotelOTAConnector();
      return connector.holdBooking({
        ...params,
        userId: context.customerId,
        userTier: context.tier || 'basic',
        channelSource: 'rechat',
      });
    }
  },
  {
    name: 'confirm_booking',
    description: 'Confirm a held booking with payment',
    category: 'booking',
    parameters: {
      holdId: { type: 'string', required: true },
      paymentMethod: { type: 'string', required: true },
      coinBurnPaise: { type: 'number', required: false },
    },
    execute: async (params, context) => {
      const connector = new HotelOTAConnector();
      return connector.confirmBooking(params);
    }
  },
  {
    name: 'get_booking_status',
    description: 'Get booking status and details',
    category: 'booking',
    parameters: {
      bookingId: { type: 'string', required: true },
    },
    execute: async (params, context) => {
      const connector = new HotelOTAConnector();
      return connector.getBooking(params.bookingId);
    }
  },
  {
    name: 'cancel_booking',
    description: 'Cancel a hotel booking',
    category: 'booking',
    parameters: {
      bookingId: { type: 'string', required: true },
      reason: { type: 'string', required: false },
    },
    execute: async (params, context) => {
      const connector = new HotelOTAConnector();
      return connector.cancelBooking(params);
    }
  },
  {
    name: 'get_guest_history',
    description: 'Get guest booking history',
    category: 'account',
    parameters: {
      limit: { type: 'number', required: false },
    },
    execute: async (params, context) => {
      const connector = new HotelOTAConnector();
      return connector.getGuestOrders(context.customerId, params.limit);
    }
  },
];
```

### 2.2 Merchant/Restaurant Tools (Connected to rez-merchant-service)

```typescript
// Merchant & Restaurant Tools
const MERCHANT_TOOLS = [
  {
    name: 'search_merchants',
    description: 'Search restaurants, shops, services nearby',
    category: 'search',
    parameters: {
      query: { type: 'string', required: true },
      category: { type: 'string', required: false },
      location: { type: 'string', required: false },
      maxDistance: { type: 'number', required: false },
    },
    execute: async (params, context) => {
      const connector = new MerchantConnector();
      return connector.searchMerchants(params);
    }
  },
  {
    name: 'get_merchant_menu',
    description: 'Get restaurant/shop menu',
    category: 'search',
    parameters: {
      merchantId: { type: 'string', required: true },
      category: { type: 'string', required: false },
    },
    execute: async (params, context) => {
      const connector = new MerchantConnector();
      return connector.getMenu(params.merchantId, params.category);
    }
  },
  {
    name: 'get_product_details',
    description: 'Get product details',
    category: 'search',
    parameters: {
      productId: { type: 'string', required: true },
    },
    execute: async (params, context) => {
      const connector = new MerchantConnector();
      return connector.getProduct(params.productId);
    }
  },
  {
    name: 'check_product_availability',
    description: 'Check if product is in stock',
    category: 'search',
    parameters: {
      merchantId: { type: 'string', required: true },
      productId: { type: 'string', required: true },
      quantity: { type: 'number', required: false },
    },
    execute: async (params, context) => {
      const connector = new MerchantConnector();
      return connector.checkStock(params);
    }
  },
  {
    name: 'get_table_availability',
    description: 'Check table availability at restaurant',
    category: 'booking',
    parameters: {
      merchantId: { type: 'string', required: true },
      date: { type: 'string', required: true },
      time: { type: 'string', required: true },
      partySize: { type: 'number', required: true },
    },
    execute: async (params, context) => {
      const connector = new MerchantConnector();
      return connector.checkTableAvailability(params);
    }
  },
];
```

### 2.3 Order Tools (Connected to rez-order-service)

```typescript
// Order Tools
const ORDER_TOOLS = [
  {
    name: 'add_to_cart',
    description: 'Add items to cart',
    category: 'order',
    parameters: {
      merchantId: { type: 'string', required: true },
      items: { type: 'array', required: true },
      specialInstructions: { type: 'string', required: false },
    },
    execute: async (params, context) => {
      const connector = new OrderConnector();
      return connector.addToCart(context.customerId, params);
    }
  },
  {
    name: 'place_order',
    description: 'Place order (delivery or pickup)',
    category: 'order',
    parameters: {
      cartId: { type: 'string', required: true },
      deliveryAddress: { type: 'string', required: false },
      deliveryTime: { type: 'string', required: false },
      paymentMethod: { type: 'string', required: true },
    },
    execute: async (params, context) => {
      const connector = new OrderConnector();
      return connector.placeOrder(context.customerId, params);
    }
  },
  {
    name: 'get_order_status',
    description: 'Track order status',
    category: 'order',
    parameters: {
      orderId: { type: 'string', required: true },
    },
    execute: async (params, context) => {
      const connector = new OrderConnector();
      return connector.getOrderStatus(params.orderId);
    }
  },
  {
    name: 'cancel_order',
    description: 'Cancel an order',
    category: 'order',
    parameters: {
      orderId: { type: 'string', required: true },
      reason: { type: 'string', required: false },
    },
    execute: async (params, context) => {
      const connector = new OrderConnector();
      return connector.cancelOrder(params.orderId, params.reason);
    }
  },
  {
    name: 'reorder',
    description: 'Reorder from previous order',
    category: 'order',
    parameters: {
      orderId: { type: 'string', required: true },
      deliveryAddress: { type: 'string', required: false },
    },
    execute: async (params, context) => {
      const connector = new OrderConnector();
      return connector.reorder(context.customerId, params.orderId, params.deliveryAddress);
    }
  },
];
```

### 2.4 Wallet & Loyalty Tools

```typescript
// Wallet & Loyalty Tools
const WALLET_LOYALTY_TOOLS = [
  {
    name: 'get_wallet_balance',
    description: 'Get ReZ Coins and cash balance',
    category: 'account',
    parameters: {},
    execute: async (params, context) => {
      const connector = new WalletConnector();
      return connector.getBalance(context.customerId);
    }
  },
  {
    name: 'get_loyalty_points',
    description: 'Get loyalty points and tier',
    category: 'account',
    parameters: {},
    execute: async (params, context) => {
      const connector = new LoyaltyConnector();
      return connector.getPointsAndTier(context.customerId);
    }
  },
  {
    name: 'get_expiring_rewards',
    description: 'Get rewards expiring soon',
    category: 'account',
    parameters: {
      daysAhead: { type: 'number', required: false },
    },
    execute: async (params, context) => {
      const connector = new LoyaltyConnector();
      return connector.getExpiringRewards(context.customerId, params.daysAhead || 7);
    }
  },
  {
    name: 'calculate_checkout',
    description: 'Calculate total with applicable rewards',
    category: 'order',
    parameters: {
      orderValuePaise: { type: 'number', required: true },
      useCoins: { type: 'boolean', required: false },
      useRewards: { type: 'boolean', required: false },
    },
    execute: async (params, context) => {
      const walletConnector = new WalletConnector();
      const loyaltyConnector = new LoyaltyConnector();
      return {
        ...calculateCheckout(params),
        coinsAvailable: await walletConnector.getBalance(context.customerId),
        rewardsAvailable: await loyaltyConnector.getUsableRewards(context.customerId, params.orderValuePaise),
      };
    }
  },
];
```

---

## Phase 3: Knowledge Base Integration (Week 3-4)

### 3.1 Dynamic Knowledge from Services

```typescript
// Create knowledge bases from live service data

class DynamicKnowledgeProvider {
  async getHotelKnowledge(hotelId: string): Promise<KnowledgeEntry[]> {
    const hotelService = new HotelOTAConnector();
    const hotel = await hotelService.getHotel(hotelId);
    const rooms = await hotelService.getRoomTypes(hotelId);
    const policies = await hotelService.getPolicies(hotelId);
    const amenities = await hotelService.getAmenities(hotelId);

    return [
      {
        id: `${hotelId}:basic`,
        type: 'info',
        title: `${hotel.name} Overview`,
        content: hotel.description,
      },
      {
        id: `${hotelId}:rooms`,
        type: 'product',
        title: 'Available Room Types',
        content: rooms.map(r =>
          `${r.name}: ₹${r.baseRate} - ${r.maxOccupancy} guests, ${r.bedType}`
        ).join('\n'),
      },
      {
        id: `${hotelId}:policies`,
        type: 'policy',
        title: 'Hotel Policies',
        content: policies.map(p => `${p.title}: ${p.description}`).join('\n'),
      },
      {
        id: `${hotelId}:amenities`,
        type: 'info',
        title: 'Amenities',
        content: amenities.map(a => a.name).join(', '),
      },
    ];
  }

  async getMerchantKnowledge(merchantId: string): Promise<KnowledgeEntry[]> {
    const merchantService = new MerchantConnector();
    const merchant = await merchantService.getMerchant(merchantId);
    const menu = await merchantService.getMenu(merchantId);
    const hours = await merchantService.getHours(merchantId);

    return [
      {
        id: `${merchantId}:info`,
        type: 'info',
        title: merchant.name,
        content: `${merchant.description}\nLocation: ${merchant.address}\nPhone: ${merchant.phone}`,
      },
      {
        id: `${merchantId}:menu`,
        type: 'product',
        title: 'Menu',
        content: this.formatMenu(menu),
      },
      {
        id: `${merchantId}:hours`,
        type: 'info',
        title: 'Hours',
        content: hours.map(h => `${h.day}: ${h.open} - ${h.close}`).join('\n'),
      },
    ];
  }

  async getPersonalizedKnowledge(customerId: string): Promise<KnowledgeEntry[]> {
    const orderConnector = new OrderConnector();
    const loyaltyConnector = new LoyaltyConnector();

    const [orders, loyalty, wallet] = await Promise.all([
      orderConnector.getRecentOrders(customerId, 5),
      loyaltyConnector.getCustomerProfile(customerId),
      new WalletConnector().getBalance(customerId),
    ]);

    return [
      {
        id: `${customerId}:preferences`,
        type: 'info',
        title: 'Your Preferences',
        content: `Favorite merchants: ${loyalty.favoriteMerchants.join(', ') || 'Building profile'}\nDietary: ${loyalty.dietaryPrefs.join(', ') || 'None noted'}`,
      },
      {
        id: `${customerId}:recent`,
        type: 'info',
        title: 'Recent Orders',
        content: orders.map(o => `${o.date}: ${o.merchantName} - ₹${o.total}`).join('\n') || 'No recent orders',
      },
      {
        id: `${customerId}:rewards`,
        type: 'offer',
        title: 'Your Rewards Status',
        content: `Tier: ${loyalty.tier}\nPoints: ${loyalty.points}\nCoins: ${wallet.rezCoins}\nExpiring soon: ${wallet.expiringCoins} coins`,
      },
    ];
  }
}
```

### 3.2 Priority-Based Knowledge Retrieval

```typescript
// Knowledge retrieval priority for hotel booking
const HOTEL_KNOWLEDGE_PRIORITY = [
  { source: 'personalized', weight: 1.0, ttl: 300 },  // User's history
  { source: 'merchant', weight: 0.9, ttl: 60 },       // Hotel-specific
  { source: 'industry', weight: 0.7, ttl: 3600 },     // Hotel industry
  { source: 'unified', weight: 0.5, ttl: 3600 },      // General
];

// Knowledge retrieval priority for restaurant
const RESTAURANT_KNOWLEDGE_PRIORITY = [
  { source: 'personalized', weight: 1.0, ttl: 300 },
  { source: 'merchant', weight: 0.9, ttl: 60 },
  { source: 'industry', weight: 0.7, ttl: 3600 },
  { source: 'unified', weight: 0.5, ttl: 3600 },
];
```

---

## Phase 4: Conversation Context & Memory (Week 4-5)

### 4.1 Customer Profile Memory

```typescript
// Extend CustomerContext with rich profile

interface RichCustomerContext {
  customerId: string;
  name?: string;
  email?: string;
  phone?: string;

  // Tier & Loyalty
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints: number;
  rezCoins: number;

  // Preferences (learned over time)
  preferences: {
    favoriteCuisines: string[];
    dietaryRestrictions: string[];
    favoriteMerchants: string[];
    preferredPriceRange: 'budget' | 'mid' | 'premium';
    paymentPreferred: 'card' | 'upi' | 'wallet';
  };

  // Behavioral signals
  behavior: {
    avgOrderValue: number;
    orderFrequency: 'daily' | 'weekly' | 'monthly';
    bookingLeadTime: number; // days in advance
    lastInteraction: Date;
    interactionCount: number;
  };

  // Active context (current session)
  session: {
    browsingHotels?: { hotelIds: string[]; dates?: DateRange };
    browsingMerchants?: { merchantIds: string[] };
    cart?: { cartId: string; items: number; total: number };
    pendingBooking?: { hotelId: string; holdId: string };
  };
}
```

### 4.2 Session State Machine

```typescript
// Track conversation state for better context

enum ConversationState {
  IDLE,
  BROWSING_HOTELS,
  COMPARING_OPTIONS,
  BOOKING_IN_PROGRESS,
  PAYMENT_PENDING,
  ORDERING_FOOD,
  ORDER_REVIEW,
  COMPLAINT_FILED,
  ESCALATED,
}

interface ConversationContext {
  state: ConversationState;
  history: ConversationState[];
  entities: {
    hotels?: Hotel[];
    merchants?: Merchant[];
    products?: Product[];
    booking?: Partial<Booking>;
    order?: Partial<Order>;
  };
  pendingActions: string[];  // Actions waiting for confirmation
  lastEntityMentioned?: { type: string; id: string };
}
```

---

## Phase 5: Resolution Rate Optimization (Week 5-7)

### 5.1 Intent Resolution Tracking

```typescript
// Track and improve resolution rates

interface ResolutionMetrics {
  intent: string;
  total: number;
  resolved: number;
  escalated: number;
  abandoned: number;

  // Breakdowns
  byIndustry: Record<string, number>;
  byMerchantTier: Record<string, number>;
  byCustomerTier: Record<string, number>;

  // Time metrics
  avgResponseTime: number;
  avgTurnsToResolve: number;

  // Quality
  avgConfidence: number;
  helpfulRatings: number;
  notHelpfulRatings: number;
}

// Dashboard metrics
const RESOLUTION_TARGETS = {
  overall: 0.85,           // 85% resolution rate
  hotel: 0.90,            // 90% for hotels
  restaurant: 0.85,        // 85% for restaurants
  retail: 0.80,            // 80% for retail
  support: 0.75,           // 75% for support (more complex)
};
```

### 5.2 Auto-Improvement Triggers

```typescript
// Automatic improvement based on patterns

const IMPROVEMENT_RULES = [
  {
    condition: { intent: '*', resolutionRate: '< 0.7', sampleSize: '>= 50' },
    action: 'flag_for_review',
    notify: 'product_team',
  },
  {
    condition: { intent: '*', avgConfidence: '< 0.5', sampleSize: '>= 20' },
    action: 'add_to_knowledge_gaps',
    notify: 'ai_team',
  },
  {
    condition: { pattern: 'similar_unresolved', count: '>= 5' },
    action: 'suggest_knowledge_entry',
    autoApply: false,
  },
  {
    condition: { toolFailures: '>= 3', tool: '*' },
    action: 'alert_integration_team',
    severity: 'high',
  },
];
```

---

## Phase 6: Analytics Dashboard (Week 6-8)

### 6.1 Chat Analytics Dashboard

```typescript
// Dashboard metrics and KPIs

interface ChatAnalyticsDashboard {
  // Overview
  overview: {
    totalConversations: number;
    activeConversations: number;
    avgConversationLength: number;
    resolutionRate: number;
    nps: number;
  };

  // Volume trends
  volume: {
    byHour: number[];
    byDay: number[];
    byWeek: number[];
    byMonth: number[];
  };

  // Intent breakdown
  intents: Array<{
    intent: string;
    count: number;
    resolutionRate: number;
    avgConfidence: number;
    trending: 'up' | 'down' | 'stable';
  }>;

  // Merchant performance
  merchants: Array<{
    merchantId: string;
    merchantName: string;
    conversations: number;
    resolutionRate: number;
    avgSentiment: number;
    topComplaints: string[];
  }>;

  // AI Performance
  aiMetrics: {
    avgResponseTime: number;
    avgConfidence: number;
    toolUsageRate: number;
    escalationRate: number;
    selfServiceRate: number;  // % resolved without escalation
  };

  // Revenue attribution
  revenue: {
    chatAttributedBookings: number;
    chatAttributedOrders: number;
    chatAttributedGMV: number;
    costPerResolution: number;
    roi: number;
  };

  // Knowledge gaps
  gaps: Array<{
    category: string;
    query: string;
    count: number;
    resolutionRate: number;
    suggestedAction: string;
  }>;
}
```

### 6.2 Real-time Monitoring

```typescript
// Real-time alerts and monitoring

const ALERT_THRESHOLDS = {
  resolutionRate: { warning: 0.75, critical: 0.60 },
  responseTime: { warning: 5000, critical: 10000 },  // ms
  errorRate: { warning: 0.05, critical: 0.10 },
  queueDepth: { warning: 100, critical: 500 },
  sentiment: { warning: 3.5, critical: 3.0 },  // 1-5 scale
};
```

---

## Phase 7: Voice Layer (Future - Week 12+)

### 7.1 Voice Architecture

```typescript
// Voice processing pipeline

interface VoiceConfig {
  stt: {
    provider: 'deepgram' | 'assemblyai' | 'whisper';
    language: 'en-IN' | 'hi' | 'en';
    codeMixing: boolean;
  };
  nlu: {
    // Same intent detection as text
  };
  tts: {
    provider: 'google' | 'azure';
    voice: 'male' | 'female';
    language: 'en-IN' | 'hi';
  };
}

// Pipeline
// Speech → STT → Intent Detection → Tool Execution → Response → TTS → Speech
```

---

## Implementation Timeline

```
Week 1-2: Integration Layer
├── Create rez-chat-integration package
├── Build HotelOTAConnector
├── Build MerchantConnector
├── Build OrderConnector
└── Setup dev environment

Week 2-3: Real Tools
├── Implement Hotel tools (6 tools)
├── Implement Merchant tools (5 tools)
├── Implement Order tools (5 tools)
├── Implement Wallet/Loyalty tools (4 tools)
└── End-to-end testing

Week 3-4: Knowledge Integration
├── Dynamic knowledge from services
├── Personalized knowledge provider
├── Knowledge priority system
└── Knowledge freshness TTL

Week 4-5: Memory & Context
├── Rich customer profiles
├── Conversation state machine
├── Session memory
└── Preference learning

Week 5-7: Resolution Optimization
├── Intent tracking
├── Resolution rate monitoring
├── Auto-improvement rules
└── Human review loop

Week 6-8: Analytics Dashboard
├── Real-time metrics
├── Historical trends
├── Merchant performance
├── Revenue attribution
└── Alert system
```

---

## Success Metrics

| Metric | Week 4 Target | Week 8 Target | Week 12 Target |
|--------|---------------|---------------|----------------|
| Resolution Rate | 70% | 85% | 90% |
| Avg Response Time | 3s | 2s | 1s |
| Self-Service Rate | 60% | 80% | 90% |
| Customer Satisfaction | 4.0 | 4.3 | 4.5 |
| Bookings via Chat | 5% | 15% | 30% |
| Orders via Chat | 3% | 10% | 20% |

---

## Key Files to Create/Modify

### New Packages
```
packages/
├── rez-chat-integration/          # NEW
│   ├── src/
│   │   ├── index.ts
│   │   ├── connectors/
│   │   │   ├── hotel.connector.ts
│   │   │   ├── merchant.connector.ts
│   │   │   ├── order.connector.ts
│   │   │   ├── wallet.connector.ts
│   │   │   └── loyalty.connector.ts
│   │   ├── adapters/
│   │   │   └── *.adapter.ts
│   │   └── tools/
│   │       └── integrated-tools.ts
│   └── package.json
│
├── rez-chat-analytics/             # NEW
│   ├── src/
│   │   ├── dashboard/
│   │   ├── alerts/
│   │   └── reports/
│   └── package.json
│
├── rez-chat-admin/                 # NEW (Merchant Admin Panel)
│   ├── src/
│   │   ├── ai-settings/
│   │   ├── knowledge-base-editor/
│   │   └── performance-dashboard/
│   └── package.json
```

### Modifications
```
Hotel OTA/apps/api/src/
├── socket/unifiedAISocket.ts       # MODIFY - Connect to integration service
└── services/ai-integration.service.ts  # NEW - Bridge to chat AI

packages/rez-chat-ai/src/
├── tools/index.ts                  # MODIFY - Replace with real tools
├── knowledge/providers.ts          # MODIFY - Add dynamic knowledge
└── types/index.ts                  # MODIFY - Add RichCustomerContext
```

---

## Priority Order

1. **Hotel OTA Integration** (Highest priority - clear ROI)
   - Search hotels → Check availability → Hold booking → Confirm

2. **Order Integration** (High priority)
   - Search menu → Add to cart → Place order → Track

3. **Wallet Integration** (Medium priority)
   - Check balance → Calculate checkout → Burn coins

4. **Loyalty Integration** (Medium priority)
   - Get tier benefits → Check expiring rewards → Apply offers

5. **Analytics Dashboard** (High priority for iteration)
   - Measure everything → Improve based on data

---

## Next Action

**Start with Hotel OTA integration:**

1. Create `rez-chat-integration` package
2. Build `HotelOTAConnector` class
3. Implement 6 hotel tools (search, availability, hold, confirm, status, cancel)
4. Connect to existing `unifiedAISocket.ts`
5. Test end-to-end hotel booking via chat

**Time estimate:** 2 weeks for working prototype
