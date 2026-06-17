/**
 * Customer Operations Bridge Service
 * Connects Axom community intelligence to customer operations
 */

import axios, { AxiosInstance } from 'axios';
import { AxomProfile } from '../models/AxomProfile';
import { logger } from '../index';

interface CustomerOpsPayload {
  profileId: string;
  customerId?: string;
  segment: string;
  tier?: string;
  lifetimeValue?: number;
  engagementScore: number;
  location: {
    areaId: string;
    city: string;
    region: string;
  };
  interests: string[];
  activity: {
    posts: number;
    eventsHosted: number;
    eventsAttended: number;
    connections: number;
  };
  lastActive: Date;
  syncedAt: Date;
}

interface CustomerOpsResponse {
  success: boolean;
  customerId?: string;
  message?: string;
}

class CustomerOpsBridge {
  private client: AxiosInstance;
  private retryCount: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    const baseURL = process.env.CUSTOMER_OPS_BRIDGE_URL || 'http://localhost:4399/api/customer-ops';

    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service': 'axom-integration',
        'X-Version': '1.0.0'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`CustomerOpsBridge: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('CustomerOpsBridge request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`CustomerOpsBridge: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error(`CustomerOpsBridge error: ${error.message}`, {
          url: error.config?.url,
          status: error.response?.status
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Sync Axom profile to customer operations
   */
  async syncProfile(profile: AxomProfile): Promise<CustomerOpsResponse> {
    const payload: CustomerOpsPayload = {
      profileId: profile.profileId,
      customerId: profile.profileId, // Map to customer ID
      segment: profile.customerSegment || 'passive_community',
      tier: profile.engagementTier,
      lifetimeValue: profile.lifetimeValue,
      engagementScore: profile.stats.engagementRate,
      location: {
        areaId: profile.primaryLocation.areaId,
        city: profile.primaryLocation.city,
        region: profile.primaryLocation.region
      },
      interests: profile.interests.map((i) => i.tag),
      activity: {
        posts: profile.stats.postsCount,
        eventsHosted: profile.stats.eventsHosted,
        eventsAttended: profile.stats.eventsAttended,
        connections: profile.connectedBusinesses.length
      },
      lastActive: profile.updatedAt,
      syncedAt: new Date()
    };

    return this.sendWithRetry('POST', '/profiles/sync', payload);
  }

  /**
   * Update customer segment based on engagement
   */
  async updateSegment(
    profileId: string,
    newSegment: string,
    engagementScore: number
  ): Promise<CustomerOpsResponse> {
    return this.sendWithRetry('PUT', `/profiles/${profileId}/segment`, {
      segment: newSegment,
      engagementScore,
      updatedAt: new Date()
    });
  }

  /**
   * Record engagement event
   */
  async recordEngagement(
    profileId: string,
    eventType: 'post' | 'like' | 'comment' | 'share' | 'event_rsvp' | 'checkin',
    metadata?: Record<string, unknown>
  ): Promise<CustomerOpsResponse> {
    return this.sendWithRetry('POST', '/events/record', {
      profileId,
      eventType,
      source: 'axom',
      timestamp: new Date(),
      metadata
    });
  }

  /**
   * Get customer journey for profile
   */
  async getCustomerJourney(profileId: string): Promise<{
    success: boolean;
    journey?: {
      stages: Array<{ name: string; enteredAt: Date; exitedAt?: Date }>;
      currentStage: string;
      health: number;
    };
  }> {
    try {
      const response = await this.client.get(`/profiles/${profileId}/journey`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get customer journey for ${profileId}:`, error);
      return { success: false };
    }
  }

  /**
   * Calculate and update lifetime value
   */
  async updateLifetimeValue(profileId: string): Promise<CustomerOpsResponse> {
    const profile = this.findProfile(profileId);
    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    // Simple LTV calculation based on engagement
    const ltv = calculateLTV(profile);

    return this.sendWithRetry('PUT', `/profiles/${profileId}/ltv`, {
      lifetimeValue: ltv,
      calculatedAt: new Date()
    });
  }

  /**
   * Send to journey twin
   */
  async syncToJourneyTwin(profile: AxomProfile): Promise<boolean> {
    try {
      const journeyTwinUrl = process.env.JOURNEY_TWIN_URL || 'http://localhost:3012';

      await axios.post(`${journeyTwinUrl}/api/journeys/sync`, {
        customerId: profile.profileId,
        source: 'axom',
        engagement: {
          score: profile.stats.engagementRate,
          posts: profile.stats.postsCount,
          events: profile.stats.eventsAttended
        },
        interests: profile.interests,
        location: profile.primaryLocation,
        updatedAt: new Date()
      });

      logger.info(`Synced profile ${profile.profileId} to Journey Twin`);
      return true;
    } catch (error) {
      logger.error(`Failed to sync to Journey Twin: ${error}`);
      return false;
    }
  }

  /**
   * Send to customer twin
   */
  async syncToCustomerTwin(profile: AxomProfile): Promise<boolean> {
    try {
      const customerTwinUrl = process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017';

      await axios.post(`${customerTwinUrl}/api/customers/sync`, {
        customerId: profile.profileId,
        name: profile.displayName,
        segment: profile.customerSegment,
        tier: profile.engagementTier,
        location: profile.primaryLocation,
        interests: profile.interests.map((i) => i.tag),
        stats: profile.stats,
        syncedFrom: 'axom',
        syncedAt: new Date()
      });

      logger.info(`Synced profile ${profile.profileId} to Customer Twin`);
      return true;
    } catch (error) {
      logger.error(`Failed to sync to Customer Twin: ${error}`);
      return false;
    }
  }

  /**
   * Batch sync all profiles
   */
  async batchSync(profiles: AxomProfile[]): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    for (const profile of profiles) {
      try {
        const result = await this.syncProfile(profile);
        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        logger.error(`Batch sync failed for ${profile.profileId}:`, error);
      }
    }

    return { synced, failed };
  }

  private findProfile(profileId: string): AxomProfile | undefined {
    // Import the store
    const { axomProfileStore } = require('../models/AxomProfile');
    return axomProfileStore.get(profileId);
  }

  private async sendWithRetry(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown
  ): Promise<CustomerOpsResponse> {
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const response = await this.client.request({
          method,
          url: endpoint,
          data
        });
        return response.data;
      } catch (error) {
        if (attempt === this.retryCount) {
          logger.error(`CustomerOpsBridge ${method} ${endpoint} failed after ${this.retryCount} attempts`);
          return { success: false, message: 'Max retries exceeded' };
        }
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
    return { success: false, message: 'Unexpected error' };
  }
}

/**
 * Calculate Lifetime Value based on engagement
 */
function calculateLTV(profile: AxomProfile): number {
  // Base LTV by segment
  const segmentMultipliers: Record<string, number> = {
    influencer: 5.0,
    active_community: 2.0,
    passive_community: 1.0,
    local_business: 3.0
  };

  // Base value
  let ltv = 100;

  // Apply segment multiplier
  const segment = profile.customerSegment || 'passive_community';
  ltv *= segmentMultipliers[segment] || 1;

  // Engagement multiplier
  const engagementFactor = 1 + profile.stats.engagementRate / 100;
  ltv *= engagementFactor;

  // Tier bonus
  const tierBonuses: Record<string, number> = {
    platinum: 50,
    gold: 30,
    silver: 15,
    bronze: 0
  };
  ltv += tierBonuses[profile.engagementTier || 'bronze'] || 0;

  return Math.round(ltv * 100) / 100;
}

// Export singleton instance
export const customerOpsBridge = new CustomerOpsBridge();
export default customerOpsBridge;
