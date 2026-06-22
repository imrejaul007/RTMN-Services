// ── Dynamic Knowledge Provider ─────────────────────────────────────────────────────
// Provides real-time knowledge from ReZ services

import { KnowledgeEntry } from '@rez/chat-ai';
import { RezChatIntegration } from '../index';

export interface KnowledgeSource {
  source: 'personalized' | 'merchant' | 'hotel' | 'loyalty' | 'unified';
  weight: number;
  ttl: number; // seconds
}

const KNOWLEDGE_SOURCES: Record<string, KnowledgeSource> = {
  personalized: { source: 'personalized', weight: 1.0, ttl: 300 },   // 5 min
  merchant: { source: 'merchant', weight: 0.9, ttl: 60 },            // 1 min
  hotel: { source: 'hotel', weight: 0.9, ttl: 60 },               // 1 min
  loyalty: { source: 'loyalty', weight: 0.8, ttl: 300 },           // 5 min
  unified: { source: 'unified', weight: 0.5, ttl: 3600 },         // 1 hour
};

// Cache for knowledge entries
const knowledgeCache = new Map<string, { data: KnowledgeEntry[]; timestamp: number }>();

export class DynamicKnowledgeProvider {
  private integration: RezChatIntegration;

  constructor(integration: RezChatIntegration) {
    this.integration = integration;
  }

  /**
   * Get hotel knowledge with caching
   */
  async getHotelKnowledge(hotelId: string): Promise<KnowledgeEntry[]> {
    const cacheKey = `hotel:${hotelId}`;
    const cached = this.getFromCache(cacheKey, KNOWLEDGE_SOURCES.hotel.ttl);

    if (cached) {
      return cached;
    }

    try {
      const [hotel, _] = await Promise.all([
        this.integration.getHotelDetails(hotelId),
        this.integration.checkRoomAvailability({
          hotelId,
          checkIn: new Date().toISOString().split('T')[0],
          checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        }),
      ]);

      if (!hotel) {
        return [];
      }

      const entries: KnowledgeEntry[] = [
        {
          id: `${hotelId}:basic`,
          type: 'info',
          title: `${hotel.name} Overview`,
          content: hotel.description || `${hotel.category} hotel in ${hotel.city}`,
          relevanceScore: 0.9,
        },
        {
          id: `${hotelId}:rooms`,
          type: 'product',
          title: 'Available Room Types',
          content: hotel.roomTypes
            .map(r => `• ${r.name}: ₹${r.baseRate}/night (up to ${r.maxOccupancy} guests, ${r.bedType})`)
            .join('\n'),
          relevanceScore: 0.95,
        },
        {
          id: `${hotelId}:amenities`,
          type: 'info',
          title: 'Amenities',
          content: hotel.amenities.join(', '),
          relevanceScore: 0.7,
        },
        {
          id: `${hotelId}:policies`,
          type: 'policy',
          title: 'Hotel Policies',
          content: `Check-in: ${hotel.checkInTime}\nCheck-out: ${hotel.checkOutTime}`,
          relevanceScore: 0.8,
        },
        {
          id: `${hotelId}:contact`,
          type: 'info',
          title: 'Contact Information',
          content: `Phone: ${hotel.phone}\nEmail: ${hotel.email}\nAddress: ${hotel.address}, ${hotel.city}`,
          relevanceScore: 0.6,
        },
      ];

      this.setCache(cacheKey, entries);
      return entries;
    } catch (error) {
      console.error('[DynamicKnowledgeProvider] Get hotel knowledge error:', error);
      return [];
    }
  }

  /**
   * Get merchant/restaurant knowledge with caching
   */
  async getMerchantKnowledge(merchantId: string): Promise<KnowledgeEntry[]> {
    const cacheKey = `merchant:${merchantId}`;
    const cached = this.getFromCache(cacheKey, KNOWLEDGE_SOURCES.merchant.ttl);

    if (cached) {
      return cached;
    }

    try {
      const [merchant, menu] = await Promise.all([
        this.integration.getMerchantInfo(merchantId),
        this.integration.getMerchantMenu(merchantId),
      ]);

      if (!merchant) {
        return [];
      }

      const entries: KnowledgeEntry[] = [
        {
          id: `${merchantId}:basic`,
          type: 'info',
          title: merchant.name,
          content: `${merchant.description || merchant.category} at ${merchant.address}`,
          relevanceScore: 0.9,
        },
        {
          id: `${merchantId}:hours`,
          type: 'info',
          title: 'Operating Hours',
          content: Array.isArray(merchant.hours)
            ? merchant.hours.map(h => `${h.day}: ${h.isOpen ? `${h.open} - ${h.close}` : 'Closed'}`).join('\n')
            : String(merchant.hours),
          relevanceScore: 0.8,
        },
      ];

      if (menu && menu.items.length > 0) {
        // Best sellers
        const bestSellers = menu.items.filter(i => i.isBestSeller);
        if (bestSellers.length > 0) {
          entries.push({
            id: `${merchantId}:bestsellers`,
            type: 'product',
            title: 'Best Sellers',
            content: bestSellers
              .map(b => `• ${b.name}: ₹${b.price}${b.isVeg ? ' (🥬)' : ''}`)
              .join('\n'),
            relevanceScore: 0.95,
          });
        }

        // Popular items
        entries.push({
          id: `${merchantId}:menu`,
          type: 'product',
          title: 'Popular Items',
          content: menu.items.slice(0, 10)
            .map(m => `• ${m.name}: ₹${m.price}${m.isVeg ? ' (🥬)' : ''}`)
            .join('\n'),
          relevanceScore: 0.85,
        });

        // Categories
        entries.push({
          id: `${merchantId}:categories`,
          type: 'info',
          title: 'Menu Categories',
          content: menu.categories.join(', '),
          relevanceScore: 0.6,
        });
      }

      this.setCache(cacheKey, entries);
      return entries;
    } catch (error) {
      console.error('[DynamicKnowledgeProvider] Get merchant knowledge error:', error);
      return [];
    }
  }

  /**
   * Get personalized customer knowledge
   */
  async getPersonalizedKnowledge(userId: string): Promise<KnowledgeEntry[]> {
    const cacheKey = `user:${userId}`;
    const cached = this.getFromCache(cacheKey, KNOWLEDGE_SOURCES.personalized.ttl);

    if (cached) {
      return cached;
    }

    try {
      const [wallet, loyalty, orders] = await Promise.all([
        this.integration.getWalletBalance(userId),
        this.integration.getLoyaltyProfile(userId),
        this.integration.getOrderHistory(userId, 5),
      ]);

      const entries: KnowledgeEntry[] = [
        {
          id: `${userId}:profile`,
          type: 'info',
          title: 'Your Account',
          content: `Tier: ${loyalty?.tier || 'Bronze'}\nPoints: ${loyalty?.points || 0}\nMember since: ${loyalty?.memberSince?.split('T')[0] || 'N/A'}`,
          relevanceScore: 1.0,
        },
        {
          id: `${userId}:wallet`,
          type: 'info',
          title: 'Your Wallet',
          content: `ReZ Coins: ${wallet?.coinBalance || 0} (₹${wallet?.coinValueInRupee || 0.25} each)\nCash: ₹${wallet?.cashBalance || 0}`,
          relevanceScore: 0.95,
        },
      ];

      // Expiring coins
      if (wallet?.expiringCoins && wallet.expiringCoins.length > 0) {
        entries.push({
          id: `${userId}:expiring`,
          type: 'offer',
          title: 'Expiring Soon',
          content: wallet.expiringCoins
            .map(c => `• ${c.amount} coins expire in ${c.daysUntilExpiry} days`)
            .join('\n'),
          relevanceScore: 1.0,
        });
      }

      // Recent orders
      if (orders.length > 0) {
        entries.push({
          id: `${userId}:recent`,
          type: 'info',
          title: 'Recent Orders',
          content: orders
            .map(o => `• ${o.merchantName} - ₹${o.total} (${o.status})`)
            .join('\n'),
          relevanceScore: 0.8,
        });
      }

      // Tier benefits
      if (loyalty?.benefits) {
        entries.push({
          id: `${userId}:benefits`,
          type: 'info',
          title: 'Your Benefits',
          content: loyalty.benefits.join('\n• '),
          relevanceScore: 0.75,
        });
      }

      this.setCache(cacheKey, entries);
      return entries;
    } catch (error) {
      console.error('[DynamicKnowledgeProvider] Get personalized knowledge error:', error);
      return [];
    }
  }

  /**
   * Get unified/general knowledge
   */
  async getUnifiedKnowledge(): Promise<KnowledgeEntry[]> {
    const cacheKey = 'unified:general';
    const cached = this.getFromCache(cacheKey, KNOWLEDGE_SOURCES.unified.ttl);

    if (cached) {
      return cached;
    }

    const entries: KnowledgeEntry[] = [
      {
        id: 'unified:contact',
        type: 'info',
        title: 'Contact Us',
        content: 'For help, type "I need help" or "Talk to support". Our team is available 24/7.',
        relevanceScore: 0.7,
      },
      {
        id: 'unified:faq',
        type: 'faq',
        title: 'Quick Help',
        content: `Common things I can help with:
• Search hotels and book rooms
• Order food from restaurants
• Track your orders
• Check wallet balance
• File complaints or request refunds
• Update your profile`,
        relevanceScore: 0.8,
      },
    ];

    this.setCache(cacheKey, entries);
    return entries;
  }

  /**
   * Get knowledge by category with weighted priority
   */
  async getKnowledge(
    userId: string,
    options: {
      hotelId?: string;
      merchantId?: string;
      industryCategory?: string;
    }
  ): Promise<KnowledgeEntry[]> {
    const entries: KnowledgeEntry[] = [];

    // Always add personalized knowledge (highest priority)
    if (userId) {
      const personalized = await this.getPersonalizedKnowledge(userId);
      entries.push(...personalized.map(e => ({ ...e, relevanceScore: e.relevanceScore || 1 })));
    }

    // Add hotel knowledge
    if (options.hotelId) {
      const hotelKnowledge = await this.getHotelKnowledge(options.hotelId);
      entries.push(...hotelKnowledge.map(e => ({ ...e, relevanceScore: (e.relevanceScore || 0.9) * 0.9 })));
    }

    // Add merchant knowledge
    if (options.merchantId) {
      const merchantKnowledge = await this.getMerchantKnowledge(options.merchantId);
      entries.push(...merchantKnowledge.map(e => ({ ...e, relevanceScore: (e.relevanceScore || 0.9) * 0.9 })));
    }

    // Add unified knowledge (lowest priority)
    const unified = await this.getUnifiedKnowledge();
    entries.push(...unified.map(e => ({ ...e, relevanceScore: (e.relevanceScore || 0.5) * 0.5 })));

    // Sort by relevance score
    return entries.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  // ── Cache Helpers ─────────────────────────────────────────────────────────────

  private getFromCache(key: string, ttl: number): KnowledgeEntry[] | null {
    const cached = knowledgeCache.get(key);
    if (!cached) return null;

    const age = (Date.now() - cached.timestamp) / 1000;
    if (age > ttl) {
      knowledgeCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: KnowledgeEntry[]): void {
    // Limit cache size
    if (knowledgeCache.size > 100) {
      const oldestKey = [...knowledgeCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      knowledgeCache.delete(oldestKey);
    }

    knowledgeCache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    knowledgeCache.clear();
  }
}
