# ReZ Agent OS - Architecture Document

## The Vision

ReZ Agent OS is NOT a chat widget. It's an **ecosystem-wide intelligence layer** that provides:

- Cross-app orchestration
- Shared memory across all apps
- Proactive value delivery
- Unified user understanding

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ReZ Agent OS                                   │
│                   (Ecosystem Intelligence Layer)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│   │ Consumer    │  │ Merchant    │  │ Hospitality │  │ Finance     │ │
│   │ Agents     │  │ Agents      │  │ Agents      │  │ Agents      │ │
│   ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤ │
│   │ • Booking   │  │ • Ops       │  │ • Concierge │  │ • Wallet    │ │
│   │ • Dining    │  │ • Campaign  │  │ • Room      │  │ • Payments  │ │
│   │ • Loyalty   │  │ • Inventory │  │ • Housekeep │  │ • Lending   │ │
│   │ • Social    │  │ • Analytics │  │ • Dining    │  │ • Rewards   │ │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│          │                 │                 │                 │        │
│          └─────────────────┼─────────────────┼─────────────────┘        │
│                            │                 │                           │
│                    ┌───────▼────────┐ ┌──────▼────────┐                │
│                    │  Coordinator    │ │  Shared        │                │
│                    │  Agent         │ │  Memory        │                │
│                    │                 │ │  (User Graph)  │                │
│                    └─────────────────┘ └────────────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

                          │                    │
        ┌─────────────────┼────────────────────┼─────────────────┐
        │                 │                    │                 │
        ▼                 ▼                    ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   Consumer    │ │   Merchant    │ │  Hospitality  │ │   Finance     │
│   Graph       │ │   Graph       │ │   Graph       │ │   Graph       │
│               │ │               │ │               │ │               │
│ • Bookings    │ │ • Orders      │ │ • Guests      │ │ • Coins       │
│ • Spend       │ │ • Inventory   │ │ • Rooms       │ │ • Payments    │
│ • Rewards     │ │ • Campaigns   │ │ • Services    │ │ • Loans       │
│ • Preferences  │ │ • Customers   │ │ • Events      │ │ • Rewards     │
│ • Social      │ │ • Staff       │ │ • Dining      │ │ • Cashback    │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

## Stack Architecture

| Layer | Purpose | Technologies |
|-------|---------|--------------|
| **Apps** | Interface layer | React Native, Next.js, Web |
| **Agent OS** | Intelligence layer | LLMs, Tool calling, Memory |
| **Merchant OS** | Operational layer | POS, Inventory, CRM |
| **APIs** | Transaction layer | REST, GraphQL |
| **Coins/Wallet** | Value layer | Blockchain-adjacent ledger |

## Three Data Graphs

### 1. Consumer Graph (Most Personal)

```typescript
interface ConsumerProfile {
  userId: string;

  // Demographics
  demographics: {
    age?: number;
    location: string;
    language: string;
  };

  // Behavior
  preferences: {
    cuisines: string[];          // "Italian", "Thai"
    priceRange: string;          // "budget" | "mid" | "premium"
    dietary: string[];          // "vegetarian", "gluten-free"
    atmosphere: string[];        // "romantic", "family", "quiet"
    datePreferences?: string[];  // "rooftop", "candlelight"
  };

  // History
  history: {
    bookings: Booking[];
    orders: Order[];
    spend: SpendSummary;
    visits: number;
    lifetimeValue: number;
  };

  // Social
  social: {
    rendezMatches?: Match[];
    karmaTier: string;
    referrals: string[];
    socialConnections: string[];
  };

  // Cross-app signals
  signals: {
    intents: Intent[];           // "looking for anniversary dinner"
    sentiment: Sentiment[];
    churnRisk: number;
    engagementScore: number;
  };
}
```

### 2. Merchant Graph (Most Operational)

```typescript
interface MerchantProfile {
  merchantId: string;
  storeId: string;

  // Business
  business: {
    type: string;              // "restaurant", "salon", "clinic"
    size: string;              // "small", "medium", "enterprise"
    location: GeoPoint;
    hours: OperatingHours;
  };

  // Operations
  operations: {
    inventory: InventorySummary;
    staff: StaffSummary;
    tables?: TableLayout;
    capacity: CapacityMetrics;
  };

  // Performance
  performance: {
    orders: OrderMetrics;
    revenue: RevenueMetrics;
    customers: CustomerMetrics;
    trends: TrendAnalysis;
  };

  // Marketing
  marketing: {
    campaigns: Campaign[];
    adSpend: AdMetrics;
    loyaltyMembers: number;
    coupons: Coupon[];
  };

  // Financial
  financial: {
    workingCapital: CapitalStatus;
    payouts: PayoutSummary;
    coinBalance: number;
    pendingLoans: Loan[];
  };
}
```

### 3. Intent Graph (Most Valuable - Proprietary)

```typescript
interface IntentGraph {
  // What users are looking for (aggregated, anonymized)
  intentSignals: {
    timestamp: Date;
    userId: string;
    platform: Platform;
    intent: {
      category: string;        // "dining", "hotel", "date"
      specific: string;         // "rooftop restaurant anniversary"
      confidence: number;
      context: Record<string, unknown>;
    };
    outcome?: {
      converted: boolean;
      appUsed: string;
      value: number;
    };
  }[];

  // Aggregated insights (no PII)
  marketInsights: {
    trendingIntents: TrendingIntent[];
    seasonalPatterns: SeasonalPattern[];
    unmetNeeds: UnmetNeed[];     // "users searching X but no results"
    conversionFunnels: Funnel[];
  };
}
```

## Cross-App Orchestration Flows

### Flow 1: "Plan a Date Night" (Rendez → ReZ)

```typescript
// User says in Rendez: "Plan a date night for Saturday"

interface DateNightOrchestration {
  steps: [
    {
      agent: "dining-agent",
      action: "search_restaurants",
      params: {
        location: user.location,
        date: "Saturday",
        preferences: ["rooftop", "candlelight", user.cuisinePreferences],
        priceRange: "mid-premium",
        distance: "within 10km"
      },
      result: Restaurant[]
    },
    {
      agent: "booking-agent",
      action: "reserve_table",
      params: {
        restaurant: selectedRestaurant.id,
        dateTime: user.preferredTime,
        partySize: user.partySize,
        specialRequests: ["anniversary setup"]
      }
    },
    {
      agent: "wallet-agent",
      action: "apply_cashback",
      params: {
        amount: estimatedTotal * 0.05,
        source: "karma_coins"
      }
    },
    {
      agent: "transport-agent",
      action: "offer_cab",
      params: {
        pickup: user.location,
        destination: restaurant.location,
        time: reservationTime - 15min
      }
    },
    {
      agent: "notification-agent",
      action: "send_confirmation",
      params: {
        channels: ["push", "sms"],
        content: dateNightSummary
      }
    }
  ]
}
```

### Flow 2: "Sales are down" (Merchant → AdBazaar → Inventory)

```typescript
// Merchant says in Merchant OS: "Sales dropped 20% this week"

interface MerchantCopilotOrchestration {
  diagnosis: {
    agent: "analytics-agent",
    action: "analyze_trend",
    params: { merchantId, period: "7d" },
    findings: {
      orderCount: -20,
      avgOrderValue: -5,
      newCustomers: -30,
      returningCustomers: +5,
      competitorActivity: "high"
    }
  },

  recommendations: [
    {
      agent: "campaign-agent",
      action: "create_promotion",
      params: {
        type: "first_order_discount",
        discount: 15,
        targetAudience: "lapsed_customers",
        budget: 5000
      }
    },
    {
      agent: "ad-agent",  // AdBazaar
      action: "launch_campaign",
      params: {
        objective: "drive_footfall",
        targeting: {
          location: merchant.location,
          radius: "5km",
          interests: merchant.businessType,
          lookalike: merchant.topCustomers
        },
        budget: 2000
      }
    },
    {
      agent: "inventory-agent",
      action: "check_popular_items",
      params: { merchantId },
      recommendation: "Consider adding trending items from nearby successful merchants"
    },
    {
      agent: "capital-agent",
      action: "offer_working_capital",
      params: {
        merchantId,
        amount: merchant.avgWeeklyRevenue * 0.25,
        purpose: "stock_inventory",
        terms: "repay over 12 weeks"
      }
    }
  ]
}
```

## Agent Architecture

### Specialized Agents

```
┌────────────────────────────────────────────────────────────────┐
│                      Coordinator Agent                          │
│                   (Routes & Orchestrates)                      │
│                                                                │
│  Understands user intent → routes to specialized agents         │
│  Maintains conversation context across agents                   │
│  Handles multi-step orchestrations                             │
└────────────────────────────────────────────────────────────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Booking   │  │   Dining    │  │   Loyalty   │  │   Wallet    │
│   Agent     │  │   Agent     │  │   Agent     │  │   Agent     │
├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤
│ • Hotels    │  │ • Search    │  │ • Points    │  │ • Balance   │
│ • Flights   │  │ • Reserve   │  │ • Redeem    │  │ • Send      │
│ • Trains    │  │ • Order     │  │ • Earn      │  │ • Receive   │
│ • Events    │  │ • Recommend │  │ • Tier      │  │ • Pay       │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Social    │  │   Merchant  │  │   Ad        │  │   Finance   │
│   Agent     │  │   Ops Agent │  │   Agent     │  │   Agent     │
├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤
│ • Rendez    │  │ • Orders    │  │ • Campaign  │  │ • Loans     │
│ • Karma     │  │ • Inventory │  │ • Target    │  │ • Payouts   │
│ • Matches   │  │ • Staff     │  │ • Budget    │  │ • Coins     │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

### Agent Tool Definitions

```typescript
// Example: Booking Agent tools

const bookingAgentTools = [
  {
    name: "search_hotels",
    description: "Search for hotels based on location, dates, preferences",
    parameters: {
      location: "string",
      checkIn: "date",
      checkOut: "date",
      guests: "number",
      preferences: {
        priceRange: "budget|mid|premium",
        amenities: "string[]",
        rating: "number",
        type: "hotel|resort|homestay"
      }
    },
    returns: "Hotel[]"
  },
  {
    name: "book_hotel",
    description: "Create a hotel booking with payment",
    parameters: {
      hotelId: "string",
      roomType: "string",
      guests: "Guest[]",
      paymentMethod: "coin|wallet|card",
      applyCashback: "boolean"
    },
    returns: "BookingConfirmation"
  },
  {
    name: "modify_booking",
    description: "Update booking dates, room type, or guest info",
    parameters: {
      bookingId: "string",
      changes: "Partial<Booking>"
    },
    returns: "ModifiedBooking"
  },
  {
    name: "cancel_booking",
    description: "Cancel a booking and process refund",
    parameters: {
      bookingId: "string",
      reason: "string",
      refundMethod: "original|coin"
    },
    returns: "CancellationConfirmation"
  }
];
```

## Shared Memory Architecture

```typescript
// Central memory store - synced across all apps

interface SharedMemory {
  // User's explicit preferences
  preferences: {
    [userId: string]: {
      dining: DiningPreferences;
      travel: TravelPreferences;
      social: SocialPreferences;
      notifications: NotificationPrefs;
    }
  };

  // Conversation context (last 24 hours)
  recentContext: {
    [userId: string]: {
      conversations: ConversationSummary[];
      intents: Intent[];
      pendingActions: Action[];
    }
  };

  // Cross-app signals
  signals: {
    [userId: string]: {
      lastActive: Date;
      engagementScore: number;
      satisfactionScore: number;
      lifetimeValue: number;
    }
  };
}

// Example: Preference propagation
// User tells Rendez: "I prefer rooftop restaurants"

async function updatePreference(userId: string, preference: Preference) {
  // 1. Store in shared memory
  await memory.store(`preferences:${userId}`, preference);

  // 2. Propagate to all relevant agents
  await diningAgent.learn(userId, preference);
  await rendezAgent.learn(userId, preference);
  await merchantAgent.learnLocation(preference.location);

  // 3. Log to intent graph (anonymized)
  await intentGraph.log({
    type: "preference_expressed",
    category: preference.category,
    value: preference.value
  });
}
```

## Event-Driven Triggers

```typescript
// Agent-initiated value delivery

const eventTriggers: EventTrigger[] = [
  {
    event: "coin_balance_high",
    condition: (user) => user.coins > 10000 && user.coinsUnusedDays > 14,
    action: "suggest_redeem",
    message: "You have {coins} coins sitting idle! Let me find places to use them."
  },
  {
    event: "booking_checkout_tomorrow",
    condition: (user) => user.bookings.some(b =>
      b.checkOut === tomorrow && !b.reviewed
    ),
    action: "prompt_review",
    message: "Your stay at {hotel} ends tomorrow. Share your experience?"
  },
  {
    event: "dining_intent_no_results",
    condition: (user, context) =>
      context.intent === "dining" && context.results.length === 0,
    action: "expand_search",
    message: "No results for {query}. Want me to try nearby areas?"
  },
  {
    event: "karma_tier_upgrade",
    condition: (user) => user.tier !== user.previousTier,
    action: "celebrate_tier",
    message: "Congratulations! You're now {tier}! Enjoy {benefits}."
  },
  {
    event: "merchant_slow_day",
    condition: (merchant) => merchant.ordersToday < merchant.avgDailyOrders * 0.5,
    action: "suggest_promotion",
    message: "Sales are slower today. Want me to suggest a quick promotion?"
  }
];
```

## Implementation Roadmap

### Phase 1: Foundation (Current)
- [x] Unified socket handler
- [x] Platform configs
- [x] Basic action handlers
- [x] AIFloatingChat UI

### Phase 2: Intelligence (Next)
- [ ] Connect to LLM (Anthropic)
- [ ] Tool definitions for all agents
- [ ] Basic memory layer
- [ ] Cross-app context

### Phase 3: Orchestration
- [ ] Coordinator agent
- [ ] Multi-step flows
- [ ] Shared preferences
- [ ] Intent graph

### Phase 4: Proactive
- [ ] Event triggers
- [ ] Push-initiated conversations
- [ ] Predictive recommendations

### Phase 5: Scale
- [ ] Agent marketplace
- [ ] Third-party integrations
- [ ] Analytics dashboard
- [ ] A/B testing framework

## Monetization Opportunities

### 1. Agent OS as SaaS
Sell the agent infrastructure to:
- Hotels (concierge automation)
- Restaurants (ordering + marketing)
- Salons (booking + retention)
- Clinics (patient engagement)

### 2. Intent Data
- Aggregated, anonymized market insights
- "50% of users in this area search for X but can't find it"

### 3. Premium Agents
- Financial advisor agent
- Marketing strategist agent
- Inventory optimization agent

### 4. White-label
- License Agent OS to other platforms
