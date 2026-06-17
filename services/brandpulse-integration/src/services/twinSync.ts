import axios, { AxiosInstance } from 'axios';
import { BrandCampaign, BrandMention, BrandTouchpoint } from '../models/BrandSync';

export class TwinSyncService {
  private campaignTwinClient: AxiosInstance;
  private journeyTwinClient: AxiosInstance;
  private twinHubClient: AxiosInstance;
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;

    // Initialize Campaign Twin client
    this.campaignTwinClient = axios.create({
      baseURL: process.env.CAMPAIGN_TWIN_URL || 'http://localhost:4705/api/campaigns',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CAMPAIGN_TWIN_API_KEY || ''
      }
    });

    // Initialize Journey Twin client
    this.journeyTwinClient = axios.create({
      baseURL: process.env.JOURNEY_TWIN_URL || 'http://localhost:4705/api/journeys',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.JOURNEY_TWIN_API_KEY || ''
      }
    });

    // Initialize TwinOS Hub client (for brand profiles)
    this.twinHubClient = axios.create({
      baseURL: process.env.TWIN_HUB_URL || 'http://localhost:4705',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.TWIN_HUB_API_KEY || ''
      }
    });

    // Add response interceptors
    this.setupInterceptors();
  }

  private setupInterceptors() {
    const logResponse = (clientName: string) => ({
      onFulfilled: (response: any) => {
        this.logger.debug(`${clientName} API response`, {
          status: response.status,
          path: response.config.url
        });
        return response;
      },
      onRejected: (error: any) => {
        this.logger.error(`${clientName} API error`, {
          status: error.response?.status,
          path: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    });

    this.campaignTwinClient.interceptors.response.use(
      logResponse('Campaign Twin').onFulfilled,
      logResponse('Campaign Twin').onRejected
    );

    this.journeyTwinClient.interceptors.response.use(
      logResponse('Journey Twin').onFulfilled,
      logResponse('Journey Twin').onRejected
    );
  }

  /**
   * Sync campaigns to Campaign Twin
   */
  async syncCampaigns(campaigns: BrandCampaign[]): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors?: string[];
  }> {
    const result = { success: true, synced: 0, failed: 0, errors: [] as string[] };

    for (const campaign of campaigns) {
      try {
        const twinData = this.transformToCampaignTwin(campaign);

        await this.campaignTwinClient.post('/', twinData);

        result.synced++;
        this.logger.debug('Campaign synced to Campaign Twin', { campaignId: campaign.id });
      } catch (error: any) {
        result.failed++;
        result.errors?.push(`${campaign.id}: ${error.message}`);
        result.success = false;
        this.logger.error('Failed to sync campaign to Campaign Twin', {
          campaignId: campaign.id,
          error: error.message
        });
      }
    }

    return result;
  }

  /**
   * Update campaign engagement in Campaign Twin
   */
  async updateCampaignEngagement(
    campaignId: string,
    engagement: {
      likes?: number;
      shares?: number;
      comments?: number;
      views?: number;
      clicks?: number;
    }
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    try {
      await this.campaignTwinClient.patch(`/${campaignId}/engagement`, {
        likes: engagement.likes || 0,
        shares: engagement.shares || 0,
        comments: engagement.comments || 0,
        views: engagement.views || 0,
        clicks: engagement.clicks || 0,
        updatedAt: new Date()
      });

      return { success: true, synced: 1, failed: 0 };
    } catch (error: any) {
      this.logger.error('Failed to update campaign engagement', {
        campaignId,
        error: error.message
      });
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Pause campaigns in Campaign Twin (e.g., during crisis)
   */
  async pauseCampaigns(
    campaignIds: string[],
    reason: string
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    for (const campaignId of campaignIds) {
      try {
        await this.campaignTwinClient.patch(`/${campaignId}/status`, {
          status: 'paused',
          pauseReason: reason,
          pausedAt: new Date()
        });
        synced++;
      } catch {
        failed++;
      }
    }

    return { success: failed === 0, synced, failed };
  }

  /**
   * Sync brand mentions to Journey Twin as touchpoints
   */
  async syncBrandMentions(mentions: BrandMention[]): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors?: string[];
  }> {
    const result = { success: true, synced: 0, failed: 0, errors: [] as string[] };

    for (const mention of mentions) {
      try {
        const touchpoint = this.transformToTouchpoint(mention);

        await this.journeyTwinClient.post('/touchpoints', touchpoint);

        result.synced++;
        this.logger.debug('Mention synced to Journey Twin', {
          mentionId: mention.id,
          touchpointId: touchpoint.id
        });
      } catch (error: any) {
        result.failed++;
        result.errors?.push(`${mention.id}: ${error.message}`);
        result.success = false;
        this.logger.error('Failed to sync mention to Journey Twin', {
          mentionId: mention.id,
          error: error.message
        });
      }
    }

    return result;
  }

  /**
   * Sync brand profile to TwinOS Hub
   */
  async syncBrandProfile(profile: {
    id: string;
    name: string;
    industry: string;
    verticals?: string[];
    keywords?: string[];
    competitors?: string[];
  }): Promise<{ success: boolean; synced: number; failed: number }> {
    try {
      await this.twinHubClient.post('/api/brands', {
        id: profile.id,
        name: profile.name,
        industry: profile.industry,
        verticals: profile.verticals || [],
        keywords: profile.keywords || [],
        competitors: profile.competitors || [],
        source: 'brandpulse',
        syncedAt: new Date()
      });

      return { success: true, synced: 1, failed: 0 };
    } catch (error: any) {
      this.logger.error('Failed to sync brand profile to TwinOS Hub', {
        brandId: profile.id,
        error: error.message
      });
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Get campaign data from Campaign Twin
   */
  async getCampaign(campaignId: string): Promise<any | null> {
    try {
      const response = await this.campaignTwinClient.get(`/${campaignId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get touchpoints for a brand from Journey Twin
   */
  async getBrandTouchpoints(
    brandId: string,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      type?: string;
    }
  ): Promise<BrandTouchpoint[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.startDate) params.append('startDate', options.startDate.toISOString());
      if (options?.endDate) params.append('endDate', options.endDate.toISOString());
      if (options?.type) params.append('type', options.type);

      const response = await this.journeyTwinClient.get(`/touchpoints?brandId=${brandId}&${params.toString()}`);
      return response.data.touchpoints || [];
    } catch {
      return [];
    }
  }

  /**
   * Get journey analytics from Journey Twin
   */
  async getJourneyAnalytics(brandId: string): Promise<any | null> {
    try {
      const response = await this.journeyTwinClient.get(`/analytics?brandId=${brandId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Transform BrandCampaign to Campaign Twin format
   */
  private transformToCampaignTwin(campaign: BrandCampaign): any {
    return {
      twinId: `campaign-twin-${campaign.id}`,
      externalId: campaign.id,
      brandId: campaign.brandId,
      name: campaign.name,
      description: campaign.description,
      objective: campaign.objective,
      status: campaign.status,
      platforms: campaign.platforms,
      budget: campaign.budget,
      targetAudience: campaign.targetAudience,
      creativeAssets: campaign.creativeAssets,
      metrics: {
        impressions: campaign.metrics.impressions,
        reach: campaign.metrics.reach,
        clicks: campaign.metrics.clicks,
        conversions: campaign.metrics.conversions,
        ctr: campaign.metrics.ctr,
        roas: campaign.metrics.roas,
        engagement: campaign.metrics.engagement
      },
      sentiment: campaign.metrics.sentiment,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      source: 'brandpulse',
      syncedAt: new Date(),
      createdAt: campaign.createdAt,
      updatedAt: new Date()
    };
  }

  /**
   * Transform BrandMention to Journey Twin touchpoint format
   */
  private transformToTouchpoint(mention: BrandMention): BrandTouchpoint {
    return {
      id: `touchpoint-${mention.id}`,
      brandId: mention.brandId,
      type: 'social_mention',
      source: mention.platform,
      channel: mention.platform,
      content: mention.content,
      sentiment: mention.sentimentScore,
      engagement: {
        views: mention.impressions,
        clicks: mention.engagement.shares, // approximate
        shares: mention.engagement.shares,
        comments: mention.engagement.comments
      },
      metadata: {
        mentionId: mention.id,
        authorId: mention.authorId,
        authorName: mention.authorName,
        hashtags: mention.hashtags,
        url: mention.url,
        platformSentiment: mention.sentiment
      },
      timestamp: mention.createdAt
    };
  }

  /**
   * Get Campaign Twin health status
   */
  async getCampaignTwinHealth(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();

    try {
      const response = await this.campaignTwinClient.get('/health', { timeout: 5000 });
      return {
        healthy: response.status === 200,
        latency: Date.now() - start
      };
    } catch {
      return {
        healthy: false,
        latency: Date.now() - start
      };
    }
  }

  /**
   * Get Journey Twin health status
   */
  async getJourneyTwinHealth(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();

    try {
      const response = await this.journeyTwinClient.get('/health', { timeout: 5000 });
      return {
        healthy: response.status === 200,
        latency: Date.now() - start
      };
    } catch {
      return {
        healthy: false,
        latency: Date.now() - start
      };
    }
  }

  /**
   * Batch sync campaigns with retry logic
   */
  async syncCampaignsWithRetry(
    campaigns: BrandCampaign[],
    maxRetries: number = 3
  ): Promise<{ success: boolean; synced: number; failed: number; retried: number }> {
    let result = { success: false, synced: 0, failed: 0, retried: 0 };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const batchResult = await this.syncCampaigns(campaigns);

      if (batchResult.failed === 0) {
        result = { ...batchResult, retried: attempt - 1 };
        break;
      }

      result.retried = attempt;

      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }

      result.synced += batchResult.synced;
      result.failed = batchResult.failed;
    }

    result.success = result.failed === 0;
    return result;
  }

  /**
   * Sync mentions to Journey Twin with batch optimization
   */
  async syncBrandMentionsBatch(
    mentions: BrandMention[],
    batchSize: number = 50
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    let totalSynced = 0;
    let totalFailed = 0;

    // Process in batches
    for (let i = 0; i < mentions.length; i += batchSize) {
      const batch = mentions.slice(i, i + batchSize);
      const result = await this.syncBrandMentions(batch);
      totalSynced += result.synced;
      totalFailed += result.failed;
    }

    return {
      success: totalFailed === 0,
      synced: totalSynced,
      failed: totalFailed
    };
  }
}
