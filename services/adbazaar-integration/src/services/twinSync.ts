import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * TwinSync - Service for syncing AdBazaar data to Digital Twins
 * Connects to: Lead Twin (3017), Customer Twin (4705), Campaign Twin (3018)
 */
export class TwinSync {
  private httpClient: AxiosInstance;
  private leadTwinUrl: string;
  private customerTwinUrl: string;
  private campaignTwinUrl: string;
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
    this.leadTwinUrl = process.env.LEAD_TWIN_URL || 'http://localhost:3017';
    this.customerTwinUrl = process.env.CUSTOMER_TWIN_URL || 'http://localhost:4705';
    this.campaignTwinUrl = process.env.CAMPAIGN_TWIN_URL || 'http://localhost:3018';

    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service': 'adbazaar-integration'
      }
    });
  }

  /**
   * Sync profile to Lead Twin
   * Source: CRM Hub or Lead Intelligence
   */
  async syncToLeadTwin(data: {
    sourceId: string;
    source: string;
    profile: {
      id?: string;
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      jobTitle?: string;
      industry?: string;
      leadScore?: number;
      leadStatus?: string;
      lifecycleStage?: string;
      engagementScore?: number;
      temperature?: string;
      priority?: string;
      tags?: string[];
      metadata?: Record<string, any>;
      lastActivityDate?: string;
      [key: string]: any;
    };
  }): Promise<any> {
    try {
      // Check if twin already exists
      const existing = await this.getLeadTwinBySourceId(data.sourceId, data.source);

      const twinData = {
        id: existing?.id || uuidv4(),
        sourceId: data.sourceId,
        source: data.source,
        name: data.profile.name,
        email: data.profile.email,
        phone: data.profile.phone,
        company: data.profile.company,
        jobTitle: data.profile.jobTitle,
        industry: data.profile.industry,
        leadScore: data.profile.leadScore,
        leadStatus: data.profile.leadStatus || 'new',
        lifecycleStage: data.profile.lifecycleStage,
        engagementScore: data.profile.engagementScore,
        temperature: data.profile.temperature,
        priority: data.profile.priority,
        tags: data.profile.tags,
        metadata: {
          ...data.profile.metadata,
          lastSyncedFrom: data.source,
          lastSyncedAt: new Date().toISOString()
        },
        lastActivityDate: data.profile.lastActivityDate,
        updatedAt: new Date().toISOString()
      };

      if (existing) {
        // Update existing twin
        const response = await axios.put(
          `${this.leadTwinUrl}/api/twins/${existing.id}`,
          twinData
        );
        this.logger.info('Lead Twin updated', { twinId: existing.id, sourceId: data.sourceId });
        return response.data;
      } else {
        // Create new twin
        twinData.createdAt = new Date().toISOString();
        const response = await axios.post(
          `${this.leadTwinUrl}/api/twins`,
          twinData
        );
        this.logger.info('Lead Twin created', { twinId: response.data.id, sourceId: data.sourceId });
        return response.data;
      }
    } catch (error) {
      this.logger.error('Failed to sync to Lead Twin', { error, data });
      throw error;
    }
  }

  /**
   * Get Lead Twin by source ID
   */
  async getLeadTwinBySourceId(sourceId: string, source: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.leadTwinUrl}/api/twins`,
        {
          params: { sourceId, source }
        }
      );
      return response.data.twins?.[0] || null;
    } catch (error) {
      this.logger.error('Failed to get Lead Twin', { error, sourceId, source });
      return null;
    }
  }

  /**
   * Search Lead Twins
   */
  async searchLeadTwins(params: {
    query?: string;
    status?: string;
    minScore?: number;
    company?: string;
    industry?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.leadTwinUrl}/api/twins/search`,
        { params }
      );
      return response.data.twins || [];
    } catch (error) {
      this.logger.error('Failed to search Lead Twins', { error, params });
      return [];
    }
  }

  /**
   * Get Lead Twins by segment
   */
  async getLeadTwinsBySegment(segmentId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.leadTwinUrl}/api/twins/segment/${segmentId}`
      );
      return response.data.twins || [];
    } catch (error) {
      this.logger.error('Failed to get Lead Twins by segment', { error, segmentId });
      return [];
    }
  }

  /**
   * Get Lead Twin statistics
   */
  async getLeadTwinStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.leadTwinUrl}/api/twins/stats`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get Lead Twin stats', { error });
      return {
        total: 0,
        byStatus: {},
        byScore: {},
        averageScore: 0
      };
    }
  }

  /**
   * Sync to Customer Twin
   * Source: WhatsApp, CRM, Lead Conversion
   */
  async syncToCustomerTwin(data: {
    sourceId: string;
    source: string;
    customer: {
      id?: string;
      name?: string;
      email?: string;
      phone?: string;
      whatsappNumber?: string;
      whatsappOptIn?: boolean;
      whatsappConsentDate?: string;
      whatsappLastMessage?: string;
      whatsappLastMessageDate?: string;
      doohExposureCount?: number;
      lastDOOHLocation?: string;
      campaignIds?: string[];
      [key: string]: any;
    };
  }): Promise<any> {
    try {
      // Check if twin already exists
      const existing = await this.findCustomerTwinByPhone(data.customer.whatsappNumber || data.customer.phone);

      const twinData = {
        id: existing?.id || data.customer.id || uuidv4(),
        sourceId: data.sourceId,
        source: data.source,
        name: data.customer.name,
        email: data.customer.email,
        phone: data.customer.phone,
        whatsapp: {
          number: data.customer.whatsappNumber,
          optIn: data.customer.whatsappOptIn,
          consentDate: data.customer.whatsappConsentDate,
          lastMessage: data.customer.whatsappLastMessage,
          lastMessageDate: data.customer.whatsappLastMessageDate
        },
        dooh: {
          exposureCount: data.customer.doohExposureCount,
          lastLocation: data.customer.lastDOOHLocation
        },
        campaignIds: data.customer.campaignIds,
        metadata: {
          lastSyncedFrom: data.source,
          lastSyncedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };

      if (existing) {
        // Update existing twin
        const response = await axios.put(
          `${this.customerTwinUrl}/api/twins/${existing.id}`,
          twinData
        );
        this.logger.info('Customer Twin updated', { twinId: existing.id, sourceId: data.sourceId });
        return response.data;
      } else {
        // Create new twin
        twinData.createdAt = new Date().toISOString();
        const response = await axios.post(
          `${this.customerTwinUrl}/api/twins`,
          twinData
        );
        this.logger.info('Customer Twin created', { twinId: response.data.id, sourceId: data.sourceId });
        return response.data;
      }
    } catch (error) {
      this.logger.error('Failed to sync to Customer Twin', { error, data });
      throw error;
    }
  }

  /**
   * Find Customer Twin by phone
   */
  async findCustomerTwinByPhone(phone: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.customerTwinUrl}/api/twins`,
        {
          params: { phone }
        }
      );
      return response.data.twins?.[0] || null;
    } catch (error) {
      this.logger.error('Failed to find Customer Twin by phone', { error, phone });
      return null;
    }
  }

  /**
   * Sync DOOH journey event
   */
  async syncDOOHJourney(data: {
    adId: string;
    audienceId?: string;
    location: string;
    timestamp: string;
    impressions: number;
  }): Promise<any> {
    try {
      const journeyEvent = {
        id: uuidv4(),
        type: 'dooh_exposure',
        source: 'adbazaar-dooh',
        adId: data.adId,
        audienceId: data.audienceId,
        location: data.location,
        timestamp: data.timestamp,
        impressions: data.impressions,
        journeyStage: 'awareness',
        touchpoint: 'digital_out_of_home',
        createdAt: new Date().toISOString()
      };

      // Send to Customer Twin Hub
      const response = await axios.post(
        `${this.customerTwinUrl}/api/journey`,
        journeyEvent
      );

      this.logger.info('DOOH journey synced', { journeyEventId: journeyEvent.id, adId: data.adId });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to sync DOOH journey', { error, data });
      throw error;
    }
  }

  /**
   * Sync campaign to Campaign Twin
   */
  async syncToCampaignTwin(data: {
    sourceId: string;
    source: string;
    campaign: {
      id?: string;
      name?: string;
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      budget?: number;
      channels?: string[];
      metrics?: Record<string, any>;
      audienceIds?: string[];
      launchedAt?: string;
      pausedAt?: string;
      completedAt?: string;
      [key: string]: any;
    };
  }): Promise<any> {
    try {
      // Check if twin already exists
      const existing = await this.getCampaignTwinBySourceId(data.sourceId, data.source);

      const twinData = {
        id: existing?.id || data.campaign.id || uuidv4(),
        sourceId: data.sourceId,
        source: data.source,
        name: data.campaign.name,
        type: data.campaign.type || 'multi-channel',
        status: data.campaign.status || 'draft',
        startDate: data.campaign.startDate,
        endDate: data.campaign.endDate,
        budget: data.campaign.budget,
        spent: existing?.spent || 0,
        channels: data.campaign.channels,
        metrics: {
          ...existing?.metrics,
          ...data.campaign.metrics
        },
        audienceIds: data.campaign.audienceIds,
        launchedAt: data.campaign.launchedAt,
        pausedAt: data.campaign.pausedAt,
        completedAt: data.campaign.completedAt,
        metadata: {
          lastSyncedFrom: data.source,
          lastSyncedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };

      if (existing) {
        // Update existing twin
        const response = await axios.put(
          `${this.campaignTwinUrl}/api/twins/${existing.id}`,
          twinData
        );
        this.logger.info('Campaign Twin updated', { twinId: existing.id, sourceId: data.sourceId });
        return response.data;
      } else {
        // Create new twin
        twinData.createdAt = new Date().toISOString();
        const response = await axios.post(
          `${this.campaignTwinUrl}/api/twins`,
          twinData
        );
        this.logger.info('Campaign Twin created', { twinId: response.data.id, sourceId: data.sourceId });
        return response.data;
      }
    } catch (error) {
      this.logger.error('Failed to sync to Campaign Twin', { error, data });
      throw error;
    }
  }

  /**
   * Get Campaign Twin by source ID
   */
  async getCampaignTwinBySourceId(sourceId: string, source: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.campaignTwinUrl}/api/twins`,
        {
          params: { sourceId, source }
        }
      );
      return response.data.twins?.[0] || null;
    } catch (error) {
      this.logger.error('Failed to get Campaign Twin', { error, sourceId, source });
      return null;
    }
  }

  /**
   * List Campaign Twins
   */
  async listCampaignTwins(params: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.campaignTwinUrl}/api/twins`,
        { params }
      );
      return response.data.twins || [];
    } catch (error) {
      this.logger.error('Failed to list Campaign Twins', { error, params });
      return [];
    }
  }

  /**
   * Get Campaign Twin statistics
   */
  async getCampaignTwinStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.campaignTwinUrl}/api/twins/stats`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get Campaign Twin stats', { error });
      return {
        total: 0,
        byStatus: {},
        byType: {},
        totalBudget: 0,
        totalSpent: 0
      };
    }
  }

  /**
   * Check Twin health
   */
  async checkTwinHealth(twinType: 'lead' | 'customer' | 'campaign'): Promise<any> {
    const urls = {
      lead: this.leadTwinUrl,
      customer: this.customerTwinUrl,
      campaign: this.campaignTwinUrl
    };

    try {
      const response = await axios.get(`${urls[twinType]}/health`, { timeout: 3000 });
      return { status: 'healthy', twinType, response: response.data };
    } catch (error) {
      return { status: 'unhealthy', twinType, error: String(error) };
    }
  }
}
