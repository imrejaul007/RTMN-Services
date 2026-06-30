/**
 * HOJAI Twin Bridge
 *
 * Bridges scraped web data to TwinOS Hub (port 4705)
 *
 * REUSES: TwinOS Hub (4705) - DO NOT build new twin registry
 *
 * This service syncs scraped entities (companies, products, restaurants)
 * to TwinOS as digital twins for persistent tracking.
 */

import axios from 'axios';

const TWIN_OS_URL = process.env.TWIN_OS_URL || 'http://localhost:4705';
const ENTITY_RESOLUTION_URL = process.env.ENTITY_RESOLUTION_URL || 'http://localhost:4752';

export interface TwinEntity {
  id?: string;
  type: 'company' | 'product' | 'restaurant' | 'person' | 'location' | 'supplier';
  name: string;
  attributes: Record<string, any>;
  identity?: {
    corpid?: string;
    category?: string;
    website?: string;
    source?: string;
  };
  metadata?: {
    source: string;
    sourceUrl: string;
    scrapedAt: string;
    actorId: string;
  };
}

export interface SyncResult {
  success: boolean;
  twinId?: string;
  isNew: boolean;
  changes: string[];
  error?: string;
}

export class TwinBridge {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.INTERNAL_SERVICE_TOKEN || 'twin-bridge';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Sync scraped company data to TwinOS
   */
  async syncCompany(data: {
    name: string;
    website?: string;
    phone?: string;
    address?: string;
    rating?: number;
    reviews?: number;
    industry?: string;
    source: string;
    url: string;
    actorId: string;
  }): Promise<SyncResult> {
    try {
      // First, check if twin already exists
      const existing = await this.findTwinByName(data.name, 'company');

      const twinData: TwinEntity = {
        type: 'company',
        name: data.name,
        attributes: {
          website: data.website,
          phone: data.phone,
          address: data.address,
          rating: data.rating,
          reviewCount: data.reviews,
          industry: data.industry,
          lastScraped: new Date().toISOString(),
          scraper: data.actorId,
        },
        identity: {
          website: data.website,
          category: 'company',
          source: data.source,
        },
        metadata: {
          source: data.source,
          sourceUrl: data.url,
          scrapedAt: new Date().toISOString(),
          actorId: data.actorId,
        },
      };

      if (existing) {
        // Update existing twin
        const response = await axios.put(
          `${TWIN_OS_URL}/api/twins/${existing.id}`,
          twinData,
          { headers: this.headers }
        );

        return {
          success: true,
          twinId: existing.id,
          isNew: false,
          changes: ['updated'],
        };
      } else {
        // Create new twin
        const response = await axios.post(
          `${TWIN_OS_URL}/api/twins`,
          twinData,
          { headers: this.headers }
        );

        return {
          success: true,
          twinId: response.data.id,
          isNew: true,
          changes: ['created'],
        };
      }
    } catch (error) {
      console.error('Failed to sync company:', error);
      return {
        success: false,
        isNew: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync scraped restaurant data to TwinOS
   */
  async syncRestaurant(data: {
    name: string;
    cuisine?: string;
    address?: string;
    rating?: number;
    priceRange?: string;
    phone?: string;
    hours?: string;
    source: string;
    url: string;
    actorId: string;
  }): Promise<SyncResult> {
    try {
      const existing = await this.findTwinByName(data.name, 'restaurant');

      const twinData: TwinEntity = {
        type: 'restaurant',
        name: data.name,
        attributes: {
          cuisine: data.cuisine,
          address: data.address,
          rating: data.rating,
          priceRange: data.priceRange,
          phone: data.phone,
          hours: data.hours,
          lastScraped: new Date().toISOString(),
          scraper: data.actorId,
        },
        metadata: {
          source: data.source,
          sourceUrl: data.url,
          scrapedAt: new Date().toISOString(),
          actorId: data.actorId,
        },
      };

      if (existing) {
        await axios.put(
          `${TWIN_OS_URL}/api/twins/${existing.id}`,
          twinData,
          { headers: this.headers }
        );
        return { success: true, twinId: existing.id, isNew: false, changes: ['updated'] };
      } else {
        const response = await axios.post(
          `${TWIN_OS_URL}/api/twins`,
          twinData,
          { headers: this.headers }
        );
        return { success: true, twinId: response.data.id, isNew: true, changes: ['created'] };
      }
    } catch (error) {
      return {
        success: false,
        isNew: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync scraped product data to TwinOS
   */
  async syncProduct(data: {
    name: string;
    brand?: string;
    price?: number;
    currency?: string;
    category?: string;
    source: string;
    url: string;
    actorId: string;
  }): Promise<SyncResult> {
    try {
      const existing = await this.findTwinByName(data.name, 'product');

      const twinData: TwinEntity = {
        type: 'product',
        name: data.name,
        attributes: {
          brand: data.brand,
          price: data.price,
          currency: data.currency || 'USD',
          category: data.category,
          lastScraped: new Date().toISOString(),
          scraper: data.actorId,
        },
        metadata: {
          source: data.source,
          sourceUrl: data.url,
          scrapedAt: new Date().toISOString(),
          actorId: data.actorId,
        },
      };

      if (existing) {
        await axios.put(
          `${TWIN_OS_URL}/api/twins/${existing.id}`,
          twinData,
          { headers: this.headers }
        );
        return { success: true, twinId: existing.id, isNew: false, changes: ['updated'] };
      } else {
        const response = await axios.post(
          `${TWIN_OS_URL}/api/twins`,
          twinData,
          { headers: this.headers }
        );
        return { success: true, twinId: response.data.id, isNew: true, changes: ['created'] };
      }
    } catch (error) {
      return {
        success: false,
        isNew: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync scraped supplier data to TwinOS
   */
  async syncSupplier(data: {
    name: string;
    category?: string;
    rating?: number;
    certifications?: string[];
    contact?: string;
    source: string;
    url: string;
    actorId: string;
  }): Promise<SyncResult> {
    try {
      const existing = await this.findTwinByName(data.name, 'supplier');

      const twinData: TwinEntity = {
        type: 'supplier',
        name: data.name,
        attributes: {
          category: data.category,
          rating: data.rating,
          certifications: data.certifications,
          contact: data.contact,
          lastScraped: new Date().toISOString(),
          scraper: data.actorId,
        },
        metadata: {
          source: data.source,
          sourceUrl: data.url,
          scrapedAt: new Date().toISOString(),
          actorId: data.actorId,
        },
      };

      if (existing) {
        await axios.put(
          `${TWIN_OS_URL}/api/twins/${existing.id}`,
          twinData,
          { headers: this.headers }
        );
        return { success: true, twinId: existing.id, isNew: false, changes: ['updated'] };
      } else {
        const response = await axios.post(
          `${TWIN_OS_URL}/api/twins`,
          twinData,
          { headers: this.headers }
        );
        return { success: true, twinId: response.data.id, isNew: true, changes: ['created'] };
      }
    } catch (error) {
      return {
        success: false,
        isNew: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find existing twin by name and type
   */
  async findTwinByName(name: string, type: string): Promise<{ id: string; name: string } | null> {
    try {
      const response = await axios.get(`${TWIN_OS_URL}/api/twins/search`, {
        params: { query: name, type },
        headers: this.headers,
      });

      const twins = response.data.twins || [];
      return twins.length > 0 ? twins[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get twin by ID
   */
  async getTwin(twinId: string): Promise<any> {
    try {
      const response = await axios.get(`${TWIN_OS_URL}/api/twins/${twinId}`, {
        headers: this.headers,
      });
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Create relationship between twins
   */
  async createRelationship(
    fromTwinId: string,
    toTwinId: string,
    kind: 'competitor' | 'supplier' | 'customer' | 'partner' | 'sibling'
  ): Promise<boolean> {
    try {
      await axios.post(
        `${TWIN_OS_URL}/api/relationships`,
        {
          fromTwinId,
          toTwinId,
          kind,
          metadata: {
            source: 'twin-bridge',
            createdAt: new Date().toISOString(),
          },
        },
        { headers: this.headers }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Batch sync multiple entities
   */
  async batchSync(
    entities: Array<{
      type: 'company' | 'product' | 'restaurant' | 'supplier';
      data: any;
    }>
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const entity of entities) {
      switch (entity.type) {
        case 'company':
          results.push(await this.syncCompany(entity.data));
          break;
        case 'restaurant':
          results.push(await this.syncRestaurant(entity.data));
          break;
        case 'product':
          results.push(await this.syncProduct(entity.data));
          break;
        case 'supplier':
          results.push(await this.syncSupplier(entity.data));
          break;
      }
    }

    return results;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${TWIN_OS_URL}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let instance: TwinBridge | null = null;

export function getTwinBridge(token?: string): TwinBridge {
  if (!instance) {
    instance = new TwinBridge(token);
  }
  return instance;
}

export const twinBridge = new TwinBridge();
export default twinBridge;
