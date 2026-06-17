/**
 * AdBazaar Connector
 * Connects to AdBazaar services (CRM, Ads, Campaigns, Loyalty)
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export interface AdbazaarProfile {
  profileId: string;
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
  demographics?: {
    age?: number;
    gender?: string;
    location?: string;
    interests: string[];
  };
  engagement?: {
    adsViewed: number;
    adsClicked: number;
    conversions: number;
    campaignsJoined: string[];
  };
  loyalty?: {
    points: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    referralCode: string;
  };
  devices?: Array<{
    type: 'mobile' | 'desktop' | 'tablet';
    id: string;
    lastSeen: Date;
  }>;
}

export interface AdbazaarCampaign {
  campaignId: string;
  name: string;
  type: 'awareness' | 'engagement' | 'conversion' | 'retention';
  status: 'active' | 'paused' | 'completed' | 'draft';
  targetAudience?: {
    ageRange?: [number, number];
    interests?: string[];
    locations?: string[];
  };
  metrics?: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  };
}

export interface AdbazaarOffer {
  offerId: string;
  campaignId: string;
  title: string;
  description: string;
  value: {
    type: 'discount' | 'cashback' | 'points' | 'voucher';
    amount?: number;
    percentage?: number;
    points?: number;
  };
  validUntil: Date;
  redemptionCount: number;
  maxRedemptions?: number;
}

export interface AdbazaarAdEvent {
  profileId: string;
  adId: string;
  campaignId: string;
  type: 'impression' | 'click' | 'conversion' | 'share';
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

class AdbazaarConnector {
  private apiClient: AxiosInstance;
  private crmClient: AxiosInstance;
  private adsClient: AxiosInstance;

  constructor() {
    const apiUrl = process.env.ADBazaar_API_URL || 'http://localhost:4056';
    const crmUrl = process.env.ADBazaar_CRM_URL || 'http://localhost:4056';
    const adsUrl = process.env.ADBazaar_ADS_URL || 'http://localhost:5000';

    this.apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.crmClient = axios.create({
      baseURL: crmUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.adsClient = axios.create({
      baseURL: adsUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ==================== Profile Methods ====================

  /**
   * Get AdBazaar profile by ID
   */
  async getProfile(profileId: string, token?: string): Promise<AdbazaarProfile | null> {
    try {
      const response = await this.apiClient.get(`/api/profiles/${profileId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`AdBazaar getProfile failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Find profile by email or phone
   */
  async findProfileByIdentifier(identifier: string, type: 'email' | 'phone'): Promise<AdbazaarProfile | null> {
    try {
      const response = await this.apiClient.get('/api/profiles/find', {
        params: { [type]: identifier },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`AdBazaar findProfileByIdentifier failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Create or update profile
   */
  async upsertProfile(profileData: Partial<AdbazaarProfile>, token?: string): Promise<AdbazaarProfile | null> {
    try {
      const response = await this.apiClient.post('/api/profiles', profileData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      return response.data;
    } catch (error: any) {
      logger.warn(`AdBazaar upsertProfile failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get profile engagement metrics
   */
  async getProfileEngagement(profileId: string): Promise<{
    adsViewed: number;
    adsClicked: number;
    clickRate: number;
    conversions: number;
    conversionRate: number;
    lastActivity?: Date;
  } | null> {
    try {
      const response = await this.crmClient.get(`/api/crm/${profileId}/engagement`);
      return response.data;
    } catch (error: any) {
      logger.warn(`AdBazaar getProfileEngagement failed: ${error.message}`);
      return null;
    }
  }

  // ==================== Campaign Methods ====================

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(): Promise<AdbazaarCampaign[]> {
    try {
      const response = await this.adsClient.get('/api/campaigns', {
        params: { status: 'active' },
      });
      return response.data.campaigns || [];
    } catch (error: any) {
      logger.warn(`AdBazaar getActiveCampaigns failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<AdbazaarCampaign | null> {
    try {
      const response = await this.adsClient.get(`/api/campaigns/${campaignId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`AdBazaar getCampaign failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get campaigns for profile
   */
  async getProfileCampaigns(profileId: string): Promise<{
    active: AdbazaarCampaign[];
    completed: AdbazaarCampaign[];
    upcoming: AdbazaarCampaign[];
  }> {
    try {
      const response = await this.adsClient.get(`/api/campaigns/profile/${profileId}`);
      return response.data;
    } catch (error: any) {
      logger.warn(`AdBazaar getProfileCampaigns failed: ${error.message}`);
      return { active: [], completed: [], upcoming: [] };
    }
  }

  // ==================== Offer Methods ====================

  /**
   * Get available offers for profile
   */
  async getAvailableOffers(profileId: string, limit: number = 10): Promise<AdbazaarOffer[]> {
    try {
      const response = await this.apiClient.get('/api/offers/available', {
        params: { profileId, limit },
      });
      return response.data.offers || [];
    } catch (error: any) {
      logger.warn(`AdBazaar getAvailableOffers failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get offer details
   */
  async getOffer(offerId: string): Promise<AdbazaarOffer | null> {
    try {
      const response = await this.apiClient.get(`/api/offers/${offerId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`AdBazaar getOffer failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Redeem offer
   */
  async redeemOffer(profileId: string, offerId: string, token?: string): Promise<{
    success: boolean;
    voucherCode?: string;
    message?: string;
  }> {
    try {
      const response = await this.apiClient.post(
        '/api/offers/redeem',
        { profileId, offerId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return response.data;
    } catch (error: any) {
      logger.warn(`AdBazaar redeemOffer failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  // ==================== Event Tracking ====================

  /**
   * Track ad event
   */
  async trackEvent(event: AdbazaarAdEvent, token?: string): Promise<boolean> {
    try {
      await this.adsClient.post(
        '/api/events/track',
        event,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`AdBazaar trackEvent failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Record conversion
   */
  async recordConversion(
    profileId: string,
    campaignId: string,
    value: number,
    metadata?: Record<string, unknown>,
    token?: string
  ): Promise<boolean> {
    try {
      await this.adsClient.post(
        '/api/conversions/record',
        { profileId, campaignId, value, metadata },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`AdBazaar recordConversion failed: ${error.message}`);
      return false;
    }
  }

  // ==================== Loyalty ====================

  /**
   * Get profile loyalty info
   */
  async getLoyalty(profileId: string): Promise<{
    points: number;
    tier: string;
    referralCode: string;
    referralCount: number;
    tierProgress?: number;
  } | null> {
    try {
      const response = await this.crmClient.get(`/api/crm/${profileId}/loyalty`);
      return response.data;
    } catch (error: any) {
      logger.warn(`AdBazaar getLoyalty failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Award points to profile
   */
  async awardPoints(profileId: string, points: number, reason: string, token?: string): Promise<boolean> {
    try {
      await this.crmClient.post(
        '/api/crm/points/award',
        { profileId, points, reason },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`AdBazaar awardPoints failed: ${error.message}`);
      return false;
    }
  }

  // ==================== Targeting ====================

  /**
   * Check if profile matches campaign targeting
   */
  async checkTargetingMatch(profileId: string, campaignId: string): Promise<boolean> {
    try {
      const response = await this.adsClient.get('/api/targeting/check', {
        params: { profileId, campaignId },
      });
      return response.data.matches || false;
    } catch (error: any) {
      logger.warn(`AdBazaar checkTargetingMatch failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get profile segments
   */
  async getProfileSegments(profileId: string): Promise<string[]> {
    try {
      const response = await this.crmClient.get(`/api/crm/${profileId}/segments`);
      return response.data.segments || [];
    } catch (error: any) {
      logger.warn(`AdBazaar getProfileSegments failed: ${error.message}`);
      return [];
    }
  }

  // ==================== Status ====================

  /**
   * Get AdBazaar services status
   */
  async getServicesStatus(): Promise<Record<string, 'up' | 'down' | 'unknown'>> {
    const status: Record<string, 'up' | 'down' | 'unknown'> = {};
    const services = [
      { name: 'adbazaar-api', url: '/health' },
      { name: 'adbazaar-crm', url: '/health' },
      { name: 'adbazaar-ads', url: '/health' },
    ];

    const bases = [
      process.env.ADBazaar_API_URL || 'http://localhost:4056',
      process.env.ADBazaar_CRM_URL || 'http://localhost:4056',
      process.env.ADBazaar_ADS_URL || 'http://localhost:5000',
    ];

    for (let i = 0; i < services.length; i++) {
      try {
        const client = axios.create({ baseURL: bases[i], timeout: 5000 });
        await client.get(services[i].url);
        status[services[i].name] = 'up';
      } catch {
        status[services[i].name] = 'down';
      }
    }

    return status;
  }

  /**
   * Link AdBazaar profile to ecosystem profile
   */
  async linkToEcosystem(
    adbazaarProfileId: string,
    ecosystemProfileId: string,
    token?: string
  ): Promise<boolean> {
    try {
      await this.apiClient.post(
        `/api/profiles/${adbazaarProfileId}/link`,
        { ecosystemProfileId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`AdBazaar linkToEcosystem failed: ${error.message}`);
      return false;
    }
  }
}

// Singleton instance
export const adbazaarConnector = new AdbazaarConnector();
export default adbazaarConnector;
