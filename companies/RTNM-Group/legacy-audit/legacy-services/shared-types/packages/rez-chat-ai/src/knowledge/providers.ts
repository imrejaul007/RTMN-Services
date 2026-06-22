// ── Knowledge Providers ─────────────────────────────────────────────────────────
// Unified + Industry-specific knowledge base architecture
// Each industry has its own knowledge base with relevant queries, policies, and responses

import { CustomerContext, KnowledgeEntry, KnowledgeProvider, KnowledgeBase, AppType, IndustryCategory } from '../types';

// ── Industry Category Mapping ─────────────────────────────────────────────────

export const INDUSTRY_CATEGORIES: Record<string, IndustryCategory[]> = {
  // Going Out - Food & Dining
  going_out: ['restaurant', 'cafe', 'bar', 'food_court', 'cloud_kitchen'],
  // Home Delivery - Shopping
  home_delivery: ['fashion', 'grocery', 'pharmacy', 'electronics', 'beauty', 'home_services'],
  // Play - Entertainment
  play: ['entertainment', 'travel', 'events', 'movies', 'gaming'],
  // Earn - Rewards
  earn: ['earn'],
  // General - Other
  general: ['financial', 'education', 'healthcare', 'fitness', 'support'],
};

// ── Global Knowledge Provider ─────────────────────────────────────────────────

const GLOBAL_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'global:refund-policy',
    type: 'policy',
    title: 'Refund Policy',
    content: 'Refunds are processed within 5-7 business days. Cancellation policies vary by merchant. Premium members get priority processing.',
  },
  {
    id: 'global:support-hours',
    type: 'info',
    title: 'Support Hours',
    content: '24/7 AI support available. Human support: 8 AM - 10 PM local time. Emergency assistance always available.',
  },
  {
    id: 'global:account-help',
    type: 'faq',
    title: 'Account Issues',
    content: 'For account problems, password resets, or login issues, provide your registered email and we will help restore access.',
  },
  {
    id: 'global:premium-benefits',
    type: 'info',
    title: 'Premium Membership Benefits',
    content: 'Priority support, exclusive offers, early access to sales, free delivery on orders over $50, and personalized recommendations.',
  },
  {
    id: 'global:coins-rewards',
    type: 'info',
    title: 'ReZ Coins & Rewards',
    content: 'Earn ReZ Coins on every purchase. Coins can be redeemed for discounts, cashback, or exclusive offers. 100 coins = $1 value.',
  },
  {
    id: 'global:order-tracking',
    type: 'faq',
    title: 'Order Tracking',
    content: 'Track your orders in real-time from the ReZ app. Estimated delivery times are updated as your order progresses.',
  },
];

export class GlobalKnowledgeProvider implements KnowledgeProvider {
  type: 'global' = 'global';
  priority: number = 1;

  async getEntries(_context: CustomerContext): Promise<KnowledgeEntry[]> {
    return GLOBAL_KNOWLEDGE;
  }
}

// ── Hotel & Travel Knowledge ────────────────────────────────────────────────

const HOTEL_TRAVEL_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'hotel:check-in',
    type: 'service',
    title: 'Check-in Process',
    content: 'Standard check-in: 3:00 PM. Early check-in available based on availability. Valid ID and credit card required. Express check-in available for loyalty members.',
  },
  {
    id: 'hotel:check-out',
    type: 'service',
    title: 'Check-out Process',
    content: 'Standard check-out: 11:00 AM. Late check-out available until 2:00 PM upon request. Express check-out available. Bill review available via chat.',
  },
  {
    id: 'hotel:amenities',
    type: 'service',
    title: 'Hotel Amenities',
    content: 'Free WiFi, pool access, fitness center, business center, room service (24h), concierge, laundry service, airport shuttle, valet parking.',
  },
  {
    id: 'hotel:room-service',
    type: 'service',
    title: 'Room Service',
    content: '24-hour room service available. Menu includes local and international cuisine. Vegetarian, vegan, and allergen-free options available. Minibar restocked daily.',
  },
  {
    id: 'hotel:housekeeping',
    type: 'service',
    title: 'Housekeeping Services',
    content: 'Daily housekeeping 9 AM - 4 PM. Turndown service available 6 PM - 9 PM. Extra towels, toiletries, and amenities available on request.',
  },
  {
    id: 'hotel:concierge',
    type: 'service',
    title: 'Concierge Services',
    content: 'Restaurant reservations, tour bookings, transportation arrangements, local recommendations, event tickets, flower arrangements.',
  },
  {
    id: 'hotel:spa',
    type: 'service',
    title: 'Spa & Wellness',
    content: 'Full-service spa with massage, facial, body treatments. Open 9 AM - 8 PM. Advance booking recommended. Spa packages available for couples.',
  },
  {
    id: 'travel:booking',
    type: 'service',
    title: 'Travel Booking',
    content: 'Book hotels, flights, and experiences through ReZ. Earn coins on every booking. Best price guaranteed.',
  },
  {
    id: 'travel:cancellation',
    type: 'policy',
    title: 'Cancellation Policy',
    content: 'Free cancellation up to 24 hours before check-in. Late cancellations may incur one night charge. Premium members get extended cancellation windows.',
  },
  {
    id: 'travel:loyalty',
    type: 'offer',
    title: 'Travel Rewards',
    content: 'Earn 5% back in coins on all hotel bookings. Silver members earn 7%, Gold members earn 10%, Platinum members earn 15%.',
  },
];

// ── Restaurant & Food Knowledge ────────────────────────────────────────────

const RESTAURANT_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'restaurant:menu',
    type: 'product',
    title: 'Menu Information',
    content: 'Our menu features local ingredients with seasonal specials. Vegan, vegetarian, and allergen-free options clearly labeled. Chef recommendations change weekly.',
  },
  {
    id: 'restaurant:reservations',
    type: 'service',
    title: 'Reservations',
    content: 'Reservations recommended for dinner (6 PM - 9 PM). Walk-ins welcome based on availability. Large party bookings (8+) require 48h advance notice.',
  },
  {
    id: 'restaurant:hours',
    type: 'info',
    title: 'Operating Hours',
    content: 'Breakfast: 7 AM - 10:30 AM. Lunch: 11:30 AM - 2:30 PM. Dinner: 6 PM - 10 PM. Happy Hour: 4 PM - 7 PM. Bar: until 12 AM.',
  },
  {
    id: 'restaurant:delivery',
    type: 'service',
    title: 'Delivery & Takeout',
    content: 'Delivery within 5 mile radius. Minimum order $25. Free delivery over $50. Estimated delivery time: 30-45 min. Contactless delivery available.',
  },
  {
    id: 'restaurant:allergies',
    type: 'info',
    title: 'Allergen Information',
    content: 'All allergens clearly marked on menu. Kitchen can accommodate most dietary restrictions. Inform staff of severe allergies for special preparation.',
  },
  {
    id: 'restaurant:loyalty',
    type: 'offer',
    title: 'Loyalty Program',
    content: 'Earn points with every order. 100 points = $5 credit. Birthday rewards: free dessert. Anniversary bonus: 2x points. VIP perks after 1000 points.',
  },
  {
    id: 'restaurant:special-events',
    type: 'info',
    title: 'Special Events',
    content: 'Live music Fridays & Saturdays. Wine tasting monthly. Chef table experiences available. Private dining room for events up to 20 guests.',
  },
  {
    id: 'cafe:quick-service',
    type: 'service',
    title: 'Quick Service',
    content: 'Order ahead to skip the line. Earn rewards on every purchase. Mobile ordering available.',
  },
];

// ── Fashion & Beauty Knowledge ─────────────────────────────────────────────

const FASHION_BEAUTY_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'fashion:size-guide',
    type: 'info',
    title: 'Size Guide',
    content: 'Size charts available on product pages. Free returns on first exchange. Staff available for personal styling consultations by appointment.',
  },
  {
    id: 'fashion:return-policy',
    type: 'policy',
    title: 'Return Policy',
    content: '30-day returns with receipt. Items must be unworn/unused with tags attached. Exchanges available for different size/color. Final sale items non-returnable.',
  },
  {
    id: 'fashion:loyalty',
    type: 'offer',
    title: 'Fashion Rewards',
    content: 'Earn 2 coins per $1 spent. Birthday bonus: 500 coins. Early access to sales for Gold members. Style consultations free for Platinum.',
  },
  {
    id: 'fashion:shipping',
    type: 'service',
    title: 'Shipping Options',
    content: 'Free standard shipping over $75. Express: 2-3 days. Next day delivery available. In-store pickup available.',
  },
  {
    id: 'beauty:consultation',
    type: 'service',
    title: 'Beauty Consultation',
    content: 'Free virtual consultations with beauty experts. Book appointments for in-store makeovers and skincare analysis.',
  },
  {
    id: 'beauty:products',
    type: 'product',
    title: 'Product Range',
    content: 'Skincare, makeup, haircare, fragrances, and beauty tools. Vegan and cruelty-free options available.',
  },
];

// ── Grocery & Essentials Knowledge ────────────────────────────────────────

const GROCERY_ESSENTIALS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'grocery:delivery',
    type: 'service',
    title: 'Delivery Service',
    content: 'Same-day delivery available. Minimum order $30. Delivery fee starts at $3.99. Free delivery for orders over $75.',
  },
  {
    id: 'grocery:fresh-guarantee',
    type: 'policy',
    title: 'Fresh Guarantee',
    content: 'Not satisfied with freshness? Full refund or replacement on perishable items. Contact us within 24 hours of delivery.',
  },
  {
    id: 'grocery:subscriptions',
    type: 'offer',
    title: 'Subscription Service',
    content: 'Subscribe to your favorites for automatic delivery. 10% off all subscription items. Cancel anytime.',
  },
  {
    id: 'grocery:bulk',
    type: 'service',
    title: 'Bulk Orders',
    content: 'Planning a party or stocking up? Bulk pricing available on select items. Contact us for custom quotes.',
  },
  {
    id: 'essentials:quick-delivery',
    type: 'service',
    title: 'Quick Delivery',
    content: 'Need it now? Express delivery in under 60 minutes available in select areas.',
  },
];

// ── Pharmacy & Healthcare Knowledge ─────────────────────────────────────────

const PHARMACY_HEALTHCARE_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'pharmacy:prescription',
    type: 'service',
    title: 'Prescription Services',
    content: 'Upload your prescription and we\'ll have it ready. Automatic refills available. Text alerts when ready for pickup.',
  },
  {
    id: 'pharmacy:consultation',
    type: 'service',
    title: 'Health Consultation',
    content: 'Free consultations with pharmacists. Virtual consultations available. Ask about medication interactions and side effects.',
  },
  {
    id: 'healthcare:appointments',
    type: 'service',
    title: 'Book Appointments',
    content: 'Book appointments with healthcare providers. Same-day appointments available. Telemedicine options.',
  },
  {
    id: 'healthcare:insurance',
    type: 'info',
    title: 'Insurance & Payment',
    content: 'We accept most insurance plans. Flexible payment options available. HSA/FSA cards accepted.',
  },
];

// ── Electronics Knowledge ─────────────────────────────────────────────────

const ELECTRONICS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'electronics:warranty',
    type: 'policy',
    title: 'Warranty Information',
    content: 'All electronics come with manufacturer warranty. Extended warranty available at checkout. 30-day price protection.',
  },
  {
    id: 'electronics:tech-support',
    type: 'service',
    title: 'Tech Support',
    content: 'Free tech support for all purchases. Setup assistance available. Data transfer services at select locations.',
  },
  {
    id: 'electronics:trade-in',
    type: 'offer',
    title: 'Trade-In Program',
    content: 'Trade in your old devices for credit toward new purchases. Get an instant quote online. Data wiped securely.',
  },
];

// ── Entertainment & Events Knowledge ─────────────────────────────────────

const ENTERTAINMENT_EVENTS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'entertainment:tickets',
    type: 'service',
    title: 'Ticket Booking',
    content: 'Book tickets for movies, concerts, sports, and events. Earn coins on every booking. Early access for members.',
  },
  {
    id: 'entertainment:vip-packages',
    type: 'offer',
    title: 'VIP Packages',
    content: 'Premium seating, backstage access, meet & greets. Upgrade your experience with VIP packages.',
  },
  {
    id: 'events:private-booking',
    type: 'service',
    title: 'Private Events',
    content: 'Book venues for private events. Corporate packages available. Custom catering options.',
  },
  {
    id: 'movies:screening',
    type: 'info',
    title: 'Movie Screenings',
    content: 'IMAX, 3D, and standard screenings. Special events: anime nights, classic films. Discounted matinee pricing.',
  },
  {
    id: 'gaming:tournaments',
    type: 'info',
    title: 'Gaming Tournaments',
    content: 'Weekly gaming tournaments. Prize pools up to $10,000. All skill levels welcome. Register online.',
  },
];

// ── Travel & Experiences Knowledge ─────────────────────────────────────────

const TRAVEL_EXPERIENCES_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'travel:deals',
    type: 'offer',
    title: 'Travel Deals',
    content: 'Exclusive deals on hotels, flights, and experiences. Flash sales every Friday. Best price guarantee.',
  },
  {
    id: 'travel:bundles',
    type: 'offer',
    title: 'Travel Bundles',
    content: 'Save up to 30% with hotel + flight bundles. Package deals include activities and transfers.',
  },
  {
    id: 'experiences:local',
    type: 'info',
    title: 'Local Experiences',
    content: 'Discover hidden gems with local experts. Food tours, adventure activities, cultural experiences.',
  },
  {
    id: 'experiences:gift-cards',
    type: 'offer',
    title: 'Gift Cards',
    content: 'Give the gift of travel. Digital and physical gift cards available. No expiration date.',
  },
];

// ── Home Services Knowledge ───────────────────────────────────────────────

const HOME_SERVICES_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'home:services-booking',
    type: 'service',
    title: 'Book Home Services',
    content: 'Cleaning, plumbing, electrical, painting, and more. Background-checked professionals. Insured services.',
  },
  {
    id: 'home:warranty',
    type: 'policy',
    title: 'Service Warranty',
    content: '90-day warranty on all repairs. Satisfaction guaranteed. Free follow-up if issue persists.',
  },
  {
    id: 'home:maintenance',
    type: 'service',
    title: 'Maintenance Plans',
    content: 'Monthly maintenance plans available. Discounted rates for annual plans. Priority scheduling.',
  },
];

// ── Fitness & Sports Knowledge ────────────────────────────────────────────

const FITNESS_SPORTS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'fitness:classes',
    type: 'service',
    title: 'Fitness Classes',
    content: 'Yoga, pilates, HIIT, spinning, and more. All levels welcome. Virtual and in-person options.',
  },
  {
    id: 'fitness:membership',
    type: 'offer',
    title: 'Membership Plans',
    content: 'Flexible membership options. Month-to-month available. Student and senior discounts.',
  },
  {
    id: 'sports:equipment',
    type: 'product',
    title: 'Sports Equipment',
    content: 'Wide range of sports equipment and apparel. Expert advice available. Equipment rental options.',
  },
];

// ── Education & Learning Knowledge ──────────────────────────────────────────

const EDUCATION_LEARNING_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'education:courses',
    type: 'service',
    title: 'Online Courses',
    content: 'Learn new skills with our curated courses. Certifications available. Lifetime access to materials.',
  },
  {
    id: 'education:tutoring',
    type: 'service',
    title: 'Tutoring Services',
    content: 'One-on-one tutoring available. All subjects and levels. Online and in-person options.',
  },
  {
    id: 'education:workshops',
    type: 'info',
    title: 'Workshops & Events',
    content: 'Hands-on workshops every month. Photography, cooking, art, and more. Materials included.',
  },
];

// ── Financial Services Knowledge ────────────────────────────────────────────

const FINANCIAL_SERVICES_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'financial:coins',
    type: 'info',
    title: 'ReZ Coins',
    content: 'Earn coins on every purchase across the ReZ ecosystem. 100 coins = $1. Coins never expire.',
  },
  {
    id: 'financial:wallet',
    type: 'service',
    title: 'ReZ Wallet',
    content: 'Load money into your wallet for faster checkout. Secure and encrypted. Instant transfers.',
  },
  {
    id: 'financial:rewards',
    type: 'offer',
    title: 'Financial Rewards',
    content: 'Earn up to 5% cashback on select categories. No annual fees. Instant rewards credited.',
  },
];

// ── Retail General Knowledge ────────────────────────────────────────────────

const RETAIL_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'retail:return-policy',
    type: 'policy',
    title: 'Return Policy',
    content: '30-day returns with receipt. Items must be unworn/unused with tags attached. Exchanges available for different size/color.',
  },
  {
    id: 'retail:shipping',
    type: 'service',
    title: 'Shipping Information',
    content: 'Standard shipping: 5-7 days, free over $75. Express: 2-3 days. Next day delivery available.',
  },
  {
    id: 'retail:loyalty',
    type: 'offer',
    title: 'Rewards Program',
    content: 'Earn 1 point per $1 spent. 500 points = $25 coupon. Birthday bonus: 2x points. Member-only sales.',
  },
  {
    id: 'retail:inventory',
    type: 'info',
    title: 'Product Availability',
    content: 'Real-time inventory shown. In-store availability may differ. Ship-from-store option for out-of-stock items.',
  },
];

// ── General/Support Knowledge ─────────────────────────────────────────────

const GENERAL_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'general:contact',
    type: 'info',
    title: 'Contact Us',
    content: 'Chat support available 24/7. Email: support@rez.app. Phone: 1-800-REZ-HELP. Response time: chat instant, email 2-4 hours.',
  },
  {
    id: 'general:app-features',
    type: 'info',
    title: 'App Features',
    content: 'ReZ app provides unified access to all services: hotels, restaurants, retail shopping, orders, reservations, loyalty points, and support in one place.',
  },
  {
    id: 'general:notifications',
    type: 'info',
    title: 'Notification Preferences',
    content: 'Manage notifications in Settings. Options: order updates, promotions, reservations reminders, chat messages, recommendations.',
  },
];

// ── Knowledge Base Mapping ─────────────────────────────────────────────────

const KNOWLEDGE_BY_CATEGORY: Record<string, KnowledgeEntry[]> = {
  // Hotel & Travel
  hotel: HOTEL_TRAVEL_KNOWLEDGE,
  hotel_restaurant: RESTAURANT_KNOWLEDGE,
  hotel_spa: HOTEL_TRAVEL_KNOWLEDGE,
  travel: TRAVEL_EXPERIENCES_KNOWLEDGE,
  travel_experiences: TRAVEL_EXPERIENCES_KNOWLEDGE,

  // Food & Dining
  restaurant: RESTAURANT_KNOWLEDGE,
  cafe: RESTAURANT_KNOWLEDGE,
  bar: RESTAURANT_KNOWLEDGE,
  food_court: RESTAURANT_KNOWLEDGE,
  cloud_kitchen: RESTAURANT_KNOWLEDGE,

  // Shopping
  fashion: FASHION_BEAUTY_KNOWLEDGE,
  beauty: FASHION_BEAUTY_KNOWLEDGE,
  beauty_wellness: FASHION_BEAUTY_KNOWLEDGE,
  grocery: GROCERY_ESSENTIALS_KNOWLEDGE,
  grocery_essentials: GROCERY_ESSENTIALS_KNOWLEDGE,
  pharmacy: PHARMACY_HEALTHCARE_KNOWLEDGE,
  electronics: ELECTRONICS_KNOWLEDGE,

  // Home Services
  home_services: HOME_SERVICES_KNOWLEDGE,

  // Healthcare & Fitness
  healthcare: PHARMACY_HEALTHCARE_KNOWLEDGE,
  fitness: FITNESS_SPORTS_KNOWLEDGE,
  sports: FITNESS_SPORTS_KNOWLEDGE,

  // Education
  education: EDUCATION_LEARNING_KNOWLEDGE,
  education_learning: EDUCATION_LEARNING_KNOWLEDGE,

  // Entertainment
  entertainment: ENTERTAINMENT_EVENTS_KNOWLEDGE,
  events: ENTERTAINMENT_EVENTS_KNOWLEDGE,
  movies: ENTERTAINMENT_EVENTS_KNOWLEDGE,
  gaming: ENTERTAINMENT_EVENTS_KNOWLEDGE,

  // Financial
  financial: FINANCIAL_SERVICES_KNOWLEDGE,

  // Earn
  earn: FINANCIAL_SERVICES_KNOWLEDGE,

  // Retail
  retail: RETAIL_KNOWLEDGE,

  // Support
  support: GENERAL_KNOWLEDGE,
  general: GENERAL_KNOWLEDGE,
};

// ── Industry Knowledge Provider ─────────────────────────────────────────────

export class IndustryKnowledgeProvider implements KnowledgeProvider {
  type: 'industry' = 'industry';
  priority: number = 2;

  constructor(
    private appType: AppType,
    private industryCategory?: IndustryCategory
  ) {}

  async getEntries(_context: CustomerContext): Promise<KnowledgeEntry[]> {
    // First try industry-specific category
    if (this.industryCategory && KNOWLEDGE_BY_CATEGORY[this.industryCategory]) {
      return KNOWLEDGE_BY_CATEGORY[this.industryCategory];
    }

    // Fall back to app type
    if (KNOWLEDGE_BY_CATEGORY[this.appType]) {
      return KNOWLEDGE_BY_CATEGORY[this.appType];
    }

    // Default to general
    return GENERAL_KNOWLEDGE;
  }

  get knowledge(): KnowledgeBase {
    const entries = this.industryCategory && KNOWLEDGE_BY_CATEGORY[this.industryCategory]
      ? KNOWLEDGE_BY_CATEGORY[this.industryCategory]
      : KNOWLEDGE_BY_CATEGORY[this.appType] || GENERAL_KNOWLEDGE;

    return {
      appType: this.appType as any,
      entries,
      lastUpdated: new Date(),
    };
  }
}

// ── Legacy App Knowledge Provider (backward compatible) ────────────────────

export class AppKnowledgeProvider implements KnowledgeProvider {
  type: 'app' = 'app';
  priority: number = 2;

  constructor(private appType: AppType) {}

  async getEntries(_context: CustomerContext): Promise<KnowledgeEntry[]> {
    return KNOWLEDGE_BY_CATEGORY[this.appType] || GENERAL_KNOWLEDGE;
  }

  get appKnowledge(): KnowledgeBase {
    return {
      appType: this.appType as any,
      entries: KNOWLEDGE_BY_CATEGORY[this.appType] || GENERAL_KNOWLEDGE,
      lastUpdated: new Date(),
    };
  }
}

// ── Merchant Knowledge Provider ──────────────────────────────────────────────

export interface MerchantKnowledgeData {
  merchantId: string;
  name: string;
  industry?: IndustryCategory;
  description?: string;
  products?: KnowledgeEntry[];
  services?: KnowledgeEntry[];
  offers?: KnowledgeEntry[];
  policies?: KnowledgeEntry[];
}

export class MerchantKnowledgeProvider implements KnowledgeProvider {
  type: 'merchant' = 'merchant';
  priority: number = 3;

  constructor(private merchantData: MerchantKnowledgeData) {}

  async getEntries(_context: CustomerContext): Promise<KnowledgeEntry[]> {
    const entries: KnowledgeEntry[] = [];

    if (this.merchantData.description) {
      entries.push({
        id: `merchant:${this.merchantData.merchantId}:about`,
        type: 'info',
        title: `About ${this.merchantData.name}`,
        content: this.merchantData.description,
      });
    }

    entries.push(...(this.merchantData.products || []));
    entries.push(...(this.merchantData.services || []));
    entries.push(...(this.merchantData.offers || []));
    entries.push(...(this.merchantData.policies || []));

    // Also include industry-specific knowledge
    if (this.merchantData.industry) {
      const industryKnowledge = KNOWLEDGE_BY_CATEGORY[this.merchantData.industry];
      if (industryKnowledge) {
        entries.push(...industryKnowledge);
      }
    }

    return entries;
  }

  get merchantKnowledge(): KnowledgeBase {
    return {
      appType: 'general',
      merchantId: this.merchantData.merchantId,
      entries: this.merchantData.products || [],
      lastUpdated: new Date(),
    };
  }
}

// ── Customer Knowledge Provider ─────────────────────────────────────────────

export class CustomerKnowledgeProvider implements KnowledgeProvider {
  type: 'customer' = 'customer';
  priority: number = 4;

  constructor(private customerContext: CustomerContext) {}

  async getEntries(_context: CustomerContext): Promise<KnowledgeEntry[]> {
    const entries: KnowledgeEntry[] = [];

    if (this.customerContext.tier) {
      entries.push({
        id: `customer:${this.customerContext.customerId}:tier`,
        type: 'info',
        title: 'Membership Tier',
        content: `This customer is a ${this.customerContext.tier} member. ${this.getTierBenefits(this.customerContext.tier)}`,
      });
    }

    if (this.customerContext.preferences) {
      const prefs = this.customerContext.preferences;
      if (prefs.dietaryRestrictions) {
        entries.push({
          id: `customer:${this.customerContext.customerId}:dietary`,
          type: 'info',
          title: 'Dietary Preferences',
          content: `Dietary preferences: ${Array.isArray(prefs.dietaryRestrictions) ? prefs.dietaryRestrictions.join(', ') : prefs.dietaryRestrictions}`,
        });
      }
    }

    if (this.customerContext.recentOrders && this.customerContext.recentOrders.length > 0) {
      const orderSummary = this.customerContext.recentOrders.slice(0, 3).map(o =>
        `${o.type.replace('_', ' ')} - ${o.status} - $${o.total.toFixed(2)}`
      ).join('; ');
      entries.push({
        id: `customer:${this.customerContext.customerId}:orders`,
        type: 'info',
        title: 'Recent Orders',
        content: `Recent orders: ${orderSummary}`,
      });
    }

    if (this.customerContext.totalSpent !== undefined) {
      entries.push({
        id: `customer:${this.customerContext.customerId}:spending`,
        type: 'info',
        title: 'Total Spending',
        content: `Total lifetime spending: $${this.customerContext.totalSpent.toFixed(2)} over ${this.customerContext.visitCount || 0} visits`,
      });
    }

    return entries;
  }

  private getTierBenefits(tier: string): string {
    const benefits: Record<string, string> = {
      bronze: 'Standard benefits including basic support and occasional promotions.',
      silver: 'Priority support, 5% discount on orders, free shipping over $50.',
      gold: 'Priority support, 10% discount, free shipping, early access to sales, birthday reward.',
      platinum: 'VIP support, 15% discount, free express shipping, exclusive events, personalized recommendations.',
      vip: 'All platinum benefits plus personal concierge, complimentary upgrades, and bespoke services.',
    };
    return benefits[tier.toLowerCase()] || 'Standard membership benefits.';
  }
}

// ── Unified Knowledge Base ──────────────────────────────────────────────────

export class UnifiedKnowledgeBase {
  private providers: KnowledgeProvider[];

  constructor(
    globalProvider: GlobalKnowledgeProvider,
    industryProvider: IndustryKnowledgeProvider,
    merchantProviders: MerchantKnowledgeProvider[] = [],
    customerProvider?: CustomerKnowledgeProvider
  ) {
    this.providers = [
      globalProvider,
      industryProvider,
      ...merchantProviders,
    ];
    if (customerProvider) {
      this.providers.push(customerProvider);
    }
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  async getAllEntries(context: CustomerContext): Promise<KnowledgeEntry[]> {
    const allEntries: KnowledgeEntry[] = [];
    for (const provider of this.providers) {
      const entries = await provider.getEntries(context);
      allEntries.push(...entries);
    }
    return this.deduplicateEntries(allEntries);
  }

  async getRelevantEntries(context: CustomerContext, query: string): Promise<KnowledgeEntry[]> {
    const allEntries = await this.getAllEntries(context);
    const queryLower = query.toLowerCase();

    const scored = allEntries.map(entry => {
      let score = 0;
      const titleLower = entry.title.toLowerCase();
      const contentLower = entry.content.toLowerCase();

      if (titleLower.includes(queryLower)) score += 10;
      if (contentLower.includes(queryLower)) score += 5;
      if (entry.type.toLowerCase().includes(queryLower)) score += 3;
      if (entry.metadata) {
        const metaStr = JSON.stringify(entry.metadata).toLowerCase();
        if (metaStr.includes(queryLower)) score += 2;
      }

      return { entry, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.entry);
  }

  private deduplicateEntries(entries: KnowledgeEntry[]): KnowledgeEntry[] {
    const seen = new Set<string>();
    return entries.filter(entry => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  }
}

// ── Knowledge Base Factory ──────────────────────────────────────────────────

export function createKnowledgeBase(
  appType: AppType,
  merchantData?: MerchantKnowledgeData,
  customerContext?: CustomerContext,
  industryCategory?: IndustryCategory
): UnifiedKnowledgeBase {
  const globalProvider = new GlobalKnowledgeProvider();
  const industryProvider = new IndustryKnowledgeProvider(appType, industryCategory);
  const merchantProviders: MerchantKnowledgeProvider[] = [];

  if (merchantData) {
    merchantProviders.push(new MerchantKnowledgeProvider(merchantData));
  }

  let customerProvider: CustomerKnowledgeProvider | undefined;
  if (customerContext) {
    customerProvider = new CustomerKnowledgeProvider(customerContext);
  }

  return new UnifiedKnowledgeBase(globalProvider, industryProvider, merchantProviders, customerProvider);
}

// ── Helper Functions ────────────────────────────────────────────────────────

export function getKnowledgeForIndustry(industry: IndustryCategory): KnowledgeEntry[] {
  return KNOWLEDGE_BY_CATEGORY[industry] || GENERAL_KNOWLEDGE;
}

export function getKnowledgeForAppType(appType: AppType): KnowledgeEntry[] {
  // Map old app types to new industry categories
  const mapping: Record<string, string[]> = {
    hotel: ['hotel', 'travel'],
    restaurant: ['restaurant', 'cafe', 'bar'],
    retail: ['fashion', 'beauty', 'grocery', 'electronics'],
    support: ['general', 'support'],
  };

  const industries = mapping[appType] || [appType];
  const allKnowledge: KnowledgeEntry[] = [];

  for (const industry of industries) {
    const knowledge = KNOWLEDGE_BY_CATEGORY[industry];
    if (knowledge) {
      allKnowledge.push(...knowledge);
    }
  }

  return allKnowledge.length > 0 ? allKnowledge : GENERAL_KNOWLEDGE;
}
