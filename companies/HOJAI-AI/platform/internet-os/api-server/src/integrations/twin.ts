/**
 * TwinOS Integration
 *
 * REUSES: TwinOS Hub (port 4705)
 * DO NOT build new twin registry - use this bridge
 */

import axios from 'axios';
import { config } from '../config.js';

const TWIN_OS_URL = config.services.twinOs;

export interface TwinEntity {
  type: 'company' | 'product' | 'restaurant' | 'person' | 'location';
  name: string;
  attributes?: Record<string, any>;
  identity?: {
    corpid?: string;
    category?: string;
    website?: string;
  };
}

export class TwinIntegration {
  private token: string;

  constructor(token?: string) {
    this.token = token || config.auth.internalToken;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a twin from scraped data
   */
  async createTwin(entity: TwinEntity): Promise<any> {
    try {
      const response = await axios.post(
        `${TWIN_OS_URL}/api/twins`,
        {
          type: entity.type,
          name: entity.name,
          attributes: {
            ...entity.attributes,
            source: 'internet-os',
            createdAt: new Date().toISOString(),
          },
          identity: entity.identity || {
            category: entity.type,
            source: 'internet-os',
          },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create twin:', error);
      throw error;
    }
  }

  /**
   * Update twin state
   */
  async updateTwinState(twinId: string, state: Record<string, any>): Promise<any> {
    try {
      const response = await axios.put(
        `${TWIN_OS_URL}/api/twins/${twinId}/state`,
        {
          ...state,
          lastUpdated: new Date().toISOString(),
          source: 'internet-os',
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update twin ${twinId}:`, error);
      throw error;
    }
  }

  /**
   * Get twin
   */
  async getTwin(twinId: string): Promise<any> {
    try {
      const response = await axios.get(`${TWIN_OS_URL}/api/twins/${twinId}`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to get twin ${twinId}:`, error);
      throw error;
    }
  }

  /**
   * Get twin state
   */
  async getTwinState(twinId: string): Promise<any> {
    try {
      const response = await axios.get(`${TWIN_OS_URL}/api/twins/${twinId}/state`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to get twin state ${twinId}:`, error);
      throw error;
    }
  }

  /**
   * Create relationship between twins
   */
  async createRelationship(
    fromTwinId: string,
    toTwinId: string,
    kind: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${TWIN_OS_URL}/api/relationships`,
        {
          fromTwinId,
          toTwinId,
          kind,
          metadata: {
            source: 'internet-os',
            createdAt: new Date().toISOString(),
          },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create relationship:', error);
      throw error;
    }
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
    source: string;
    url: string;
  }): Promise<any> {
    // Create or update company twin
    return this.createTwin({
      type: 'company',
      name: data.name,
      attributes: {
        website: data.website,
        phone: data.phone,
        address: data.address,
        rating: data.rating,
        reviewCount: data.reviews,
        lastScraped: new Date().toISOString(),
        source,
        sourceUrl: data.url,
      },
      identity: {
        website: data.website,
        category: 'company',
      },
    });
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
    source: string;
    url: string;
  }): Promise<any> {
    return this.createTwin({
      type: 'restaurant',
      name: data.name,
      attributes: {
        cuisine: data.cuisine,
        address: data.address,
        rating: data.rating,
        priceRange: data.priceRange,
        lastScraped: new Date().toISOString(),
        source,
        sourceUrl: data.url,
      },
    });
  }

  /**
   * Search twins
   */
  async searchTwins(query: string, type?: string): Promise<any[]> {
    try {
      const params: Record<string, string> = { query };
      if (type) params.type = type;

      const response = await axios.get(`${TWIN_OS_URL}/api/twins/search`, {
        params,
        headers: this.headers,
      });
      return response.data.twins || [];
    } catch (error) {
      console.error('Failed to search twins:', error);
      return [];
    }
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
let instance: TwinIntegration | null = null;

export function getTwinIntegration(token?: string): TwinIntegration {
  if (!instance) {
    instance = new TwinIntegration(token);
  }
  return instance;
}

export const twinIntegration = new TwinIntegration();
export default twinIntegration;
