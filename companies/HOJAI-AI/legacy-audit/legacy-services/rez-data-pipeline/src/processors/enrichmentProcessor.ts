/**
 * Enrichment Processor
 * Enriches events with additional data (geo, time features, customer data, etc.)
 */

import { OrderEvent, EnrichedOrderEvent } from '../collectors/orderCollector';
import { CustomerEvent, EnrichedCustomerEvent } from '../collectors/customerCollector';
import { BehaviorEvent, EnrichedBehaviorEvent } from '../collectors/behaviorCollector';

export type Event = OrderEvent | CustomerEvent | BehaviorEvent;
export type EnrichedEvent = EnrichedOrderEvent | EnrichedCustomerEvent | EnrichedBehaviorEvent;

// Simulated data stores (replace with actual database calls in production)
interface CustomerData {
  customerId: string;
  tier: 'new' | 'regular' | 'vip';
  lifetimeValue: number;
  firstPurchaseDate: Date;
  totalOrders: number;
}

interface ItemData {
  itemId: string;
  name: string;
  category: string;
  price: number;
  merchantId: string;
  merchantName: string;
}

interface MerchantData {
  merchantId: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    city?: string;
    region?: string;
  };
}

const customerCache = new Map<string, CustomerData>();
const itemCache = new Map<string, ItemData>();
const merchantCache = new Map<string, MerchantData>();

export class EnrichmentProcessor {
  private geoServiceUrl?: string;
  private cacheEnabled: boolean;

  constructor(options: { geoServiceUrl?: string; cacheEnabled?: boolean } = {}) {
    this.geoServiceUrl = options.geoServiceUrl;
    this.cacheEnabled = options.cacheEnabled ?? true;
  }

  /**
   * Enrich an order event with additional data
   */
  async enrichOrderEvent(event: OrderEvent): Promise<EnrichedOrderEvent> {
    const enriched: EnrichedOrderEvent = { ...event };

    // Enrich with customer data
    const customerData = await this.getCustomerData(event.customerId);
    if (customerData) {
      enriched.customerTier = customerData.tier;
      enriched.customerLifetimeValue = customerData.lifetimeValue;
    }

    // Enrich with item details and prices
    enriched.itemsWithPrices = await Promise.all(
      event.items.map(async (itemId) => {
        const itemData = await this.getItemData(itemId);
        return {
          itemId,
          name: itemData?.name || 'Unknown Item',
          price: itemData?.price || 0,
          quantity: 1
        };
      })
    );

    // Enrich with merchant info
    const merchantData = await this.getMerchantData(event.merchantId);
    if (merchantData) {
      enriched.merchantName = merchantData.name;
      enriched.geoLocation = merchantData.location;
    }

    // Enrich with time features
    enriched.timeFeatures = this.extractTimeFeatures(event.timestamp);

    return enriched;
  }

  /**
   * Enrich a customer event with additional data
   */
  async enrichCustomerEvent(event: CustomerEvent): Promise<EnrichedCustomerEvent> {
    const enriched: EnrichedCustomerEvent = { ...event };

    // Enrich with customer data
    const customerData = await this.getCustomerData(event.customerId);
    if (customerData) {
      enriched.customerTier = customerData.tier;
    }

    // Enrich item details if itemId is present
    if (event.itemId) {
      const itemData = await this.getItemData(event.itemId);
      if (itemData) {
        const merchantData = await this.getMerchantData(itemData.merchantId);
        enriched.itemDetails = {
          name: itemData.name,
          category: itemData.category,
          price: itemData.price,
          merchantName: merchantData?.name
        };
      }
    }

    // Enrich with time features
    enriched.timeFeatures = this.extractTimeFeatures(event.timestamp);

    // Add search context if search event
    if (event.eventType === 'search' && event.query) {
      enriched.searchContext = {
        category: this.extractCategoryFromQuery(event.query),
        resultsCount: Math.floor(Math.random() * 50) + 1 // Simulated
      };
    }

    return enriched;
  }

  /**
   * Enrich a behavior event with additional data
   */
  async enrichBehaviorEvent(event: BehaviorEvent): Promise<EnrichedBehaviorEvent> {
    const enriched: EnrichedBehaviorEvent = { ...event };

    // Enrich with customer data
    const customerData = await this.getCustomerData(event.customerId);
    if (customerData) {
      enriched.customerTier = customerData.tier;
    }

    // Extract page context from properties
    if (event.properties?.page) {
      enriched.pageContext = {
        path: event.properties.page.path,
        title: event.properties.page.title,
        category: event.properties.page.category
      };
    }

    // Extract interaction context
    if (event.properties?.element) {
      enriched.interactionContext = {
        elementId: event.properties.element.id,
        elementType: event.properties.element.type,
        action: event.properties.element.action
      };
    }

    return enriched;
  }

  /**
   * Enrich any event with geo data
   */
  async enrichWithGeo(event: Event): Promise<EnrichedEvent> {
    if (this.geoServiceUrl) {
      // Call external geo service
      // This would make an HTTP call to get geo data based on IP or other identifiers
      // For now, we return the event as-is
    }

    // Default implementation - add placeholder geo data
    const enriched = { ...event } as any;
    enriched.geoLocation = {
      latitude: 0,
      longitude: 0
    };

    return enriched;
  }

  /**
   * Enrich any event with time-based features
   */
  enrichWithTimeFeatures<T extends Event>(event: T): T {
    const features = this.extractTimeFeatures(event.timestamp);

    return {
      ...event,
      timeFeatures: features
    } as T;
  }

  /**
   * Extract time-based features from a timestamp
   */
  private extractTimeFeatures(timestamp: Date): {
    hourOfDay: number;
    dayOfWeek: string;
    isWeekend: boolean;
    isRushHour: boolean;
  } {
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.toLocaleDateString('en-US', { weekday: 'long' });
    const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';

    // Rush hours: 11-14 (lunch) and 18-21 (dinner)
    const isRushHour = (hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21);

    return {
      hourOfDay: hour,
      dayOfWeek,
      isWeekend,
      isRushHour
    };
  }

  /**
   * Get customer data (with caching)
   */
  private async getCustomerData(customerId: string): Promise<CustomerData | null> {
    if (this.cacheEnabled && customerCache.has(customerId)) {
      return customerCache.get(customerId)!;
    }

    // In production, this would query a database
    // Simulated data for demo
    const data: CustomerData = {
      customerId,
      tier: Math.random() > 0.7 ? 'vip' : Math.random() > 0.5 ? 'regular' : 'new',
      lifetimeValue: Math.floor(Math.random() * 5000) + 100,
      firstPurchaseDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      totalOrders: Math.floor(Math.random() * 50) + 1
    };

    customerCache.set(customerId, data);
    return data;
  }

  /**
   * Get item data (with caching)
   */
  private async getItemData(itemId: string): Promise<ItemData | null> {
    if (this.cacheEnabled && itemCache.has(itemId)) {
      return itemCache.get(itemId)!;
    }

    // Simulated data
    const data: ItemData = {
      itemId,
      name: `Item ${itemId}`,
      category: ['Food', 'Beverage', 'Dessert'][Math.floor(Math.random() * 3)],
      price: Math.floor(Math.random() * 100) + 5,
      merchantId: `merchant_${itemId.charAt(0)}`,
      merchantName: `Restaurant ${itemId.charAt(0)}`
    };

    itemCache.set(itemId, data);
    return data;
  }

  /**
   * Get merchant data (with caching)
   */
  private async getMerchantData(merchantId: string): Promise<MerchantData | null> {
    if (this.cacheEnabled && merchantCache.has(merchantId)) {
      return merchantCache.get(merchantId)!;
    }

    // Simulated data
    const data: MerchantData = {
      merchantId,
      name: `Restaurant ${merchantId}`,
      location: {
        latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
        longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
        city: 'San Francisco',
        region: 'CA'
      }
    };

    merchantCache.set(merchantId, data);
    return data;
  }

  /**
   * Extract category from search query
   */
  private extractCategoryFromQuery(query: string): string | undefined {
    const categories = ['Italian', 'Chinese', 'Mexican', 'Japanese', 'Indian', 'American'];
    const lowerQuery = query.toLowerCase();

    for (const category of categories) {
      if (lowerQuery.includes(category.toLowerCase())) {
        return category;
      }
    }
    return undefined;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    customerCache.clear();
    itemCache.clear();
    merchantCache.clear();
  }
}

export const enrichmentProcessor = new EnrichmentProcessor();
