import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

interface TwinSyncResult {
  success: boolean;
  twinId?: string;
  error?: string;
}

interface MentionSyncData {
  mentionId: string;
  brandId: string;
  source: string;
  content: string;
  sentiment: number;
  sentimentLabel: string;
  author: {
    name: string;
    followers?: number;
    verified?: boolean;
  };
  engagement: {
    likes?: number;
    shares?: number;
    comments?: number;
    reach?: number;
  };
  tags: string[];
  isCrisis: boolean;
  publishedAt: Date;
}

interface CampaignSyncData {
  campaignId: string;
  brandId: string;
  name: string;
  status: string;
  hashtags: string[];
  keywords: string[];
  performance: {
    reach: number;
    impressions: number;
    engagement: number;
    mentions: number;
    sentiment: {
      score: number;
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  trending: {
    direction: 'rising' | 'falling' | 'stable';
    velocity: number;
  };
  lastSynced: Date;
}

interface HealthSyncData {
  brandId: string;
  brandName: string;
  healthScore: number;
  trend: 'up' | 'down' | 'stable';
  components: {
    sentiment: number;
    engagement: number;
    reach: number;
    growth: number;
    crisis: number;
  };
  factors: {
    positive: string[];
    negative: string[];
    recommendations: string[];
  };
  lastUpdated: Date;
}

export class TwinSyncService {
  private twinHubUrl: string;
  private campaignTwinUrl: string;
  private journeyTwinUrl: string;
  private timeout: number;

  constructor() {
    this.twinHubUrl = process.env.TWIN_HUB_URL || 'http://localhost:4705';
    this.campaignTwinUrl = process.env.CAMPAIGN_TWIN_URL || 'http://localhost:4705';
    this.journeyTwinUrl = process.env.JOURNEY_TWIN_URL || 'http://localhost:4705';
    this.timeout = 10000;
  }

  // Sync mention to Journey Twin
  async syncMentionToJourney(brandId: string, mention: any): Promise<TwinSyncResult> {
    try {
      const syncData: MentionSyncData = {
        mentionId: mention.mentionId,
        brandId,
        source: mention.source,
        content: mention.content,
        sentiment: mention.sentiment?.score || 0,
        sentimentLabel: mention.sentiment?.label || 'neutral',
        author: {
          name: mention.author?.name || 'Anonymous',
          followers: mention.author?.followers,
          verified: mention.author?.verified
        },
        engagement: {
          likes: mention.engagement?.likes,
          shares: mention.engagement?.shares,
          comments: mention.engagement?.comments,
          reach: mention.engagement?.reach
        },
        tags: mention.tags || [],
        isCrisis: mention.isCrisis || false,
        publishedAt: mention.publishedAt
      };

      // Send to Journey Twin via TwinOS Hub
      await axios.post(
        `${this.twinHubUrl}/api/twins/journey/mentions`,
        syncData,
        { timeout: this.timeout }
      ).catch(() => {
        // Fallback: try direct journey endpoint
        return axios.post(
          `${this.journeyTwinUrl}/api/journey/brand-mentions`,
          syncData,
          { timeout: this.timeout }
        );
      });

      logger.debug('Mention synced to Journey Twin', { mentionId: mention.mentionId });
      return { success: true, twinId: `journey-${mention.mentionId}` };
    } catch (error) {
      logger.error('Failed to sync mention to Journey Twin:', error);
      return { success: false, error: 'Journey Twin sync failed' };
    }
  }

  // Sync campaign to Campaign Twin
  async syncCampaignToTwin(campaign: any): Promise<TwinSyncResult> {
    try {
      const syncData: CampaignSyncData = {
        campaignId: campaign.campaignId,
        brandId: campaign.brandId,
        name: campaign.name,
        status: campaign.status,
        hashtags: campaign.hashtags,
        keywords: campaign.keywords,
        performance: campaign.performance,
        trending: campaign.trending,
        lastSynced: new Date()
      };

      await axios.post(
        `${this.twinHubUrl}/api/twins/campaign/sync`,
        syncData,
        { timeout: this.timeout }
      ).catch(() => {
        // Fallback: try direct campaign twin endpoint
        return axios.post(
          `${this.campaignTwinUrl}/api/campaign-twin/sync`,
          syncData,
          { timeout: this.timeout }
        );
      });

      logger.info('Campaign synced to Campaign Twin', { campaignId: campaign.campaignId });
      return { success: true, twinId: `campaign-${campaign.campaignId}` };
    } catch (error) {
      logger.error('Failed to sync campaign to Campaign Twin:', error);
      return { success: false, error: 'Campaign Twin sync failed' };
    }
  }

  // Sync brand health to Executive Dashboard
  async syncHealthToDashboard(brandId: string, health: any): Promise<TwinSyncResult> {
    try {
      const syncData: HealthSyncData = {
        brandId,
        brandName: health.brandName || brandId,
        healthScore: health.overall,
        trend: health.trend,
        components: health.components,
        factors: health.factors,
        lastUpdated: new Date()
      };

      await axios.post(
        `${this.twinHubUrl}/api/twins/dashboard/health`,
        syncData,
        { timeout: this.timeout }
      ).catch(() => null);

      logger.debug('Health synced to Dashboard', { brandId, healthScore: health.overall });
      return { success: true, twinId: `dashboard-${brandId}` };
    } catch (error) {
      logger.error('Failed to sync health to Dashboard:', error);
      return { success: false, error: 'Dashboard sync failed' };
    }
  }

  // Bulk sync mentions to Journey Twin
  async bulkSyncMentions(brandId: string, mentions: any[]): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    for (const mention of mentions) {
      const result = await this.syncMentionToJourney(brandId, mention);
      if (result.success) synced++;
      else failed++;
    }

    logger.info('Bulk mention sync completed', { brandId, synced, failed });
    return { synced, failed };
  }

  // Get Campaign Twin data
  async getCampaignTwin(campaignId: string): Promise<any | null> {
    try {
      const response = await axios.get(
        `${this.twinHubUrl}/api/twins/campaign/${campaignId}`,
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      logger.warn('Failed to get Campaign Twin data');
      return null;
    }
  }

  // Get Journey Twin mentions for brand
  async getJourneyTwinMentions(brandId: string, limit: number = 100): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.twinHubUrl}/api/twins/journey/brand/${brandId}/mentions`,
        {
          params: { limit },
          timeout: this.timeout
        }
      );
      return response.data.mentions || [];
    } catch (error) {
      logger.warn('Failed to get Journey Twin mentions');
      return [];
    }
  }

  // Sync sentiment data to Trust Twin
  async syncTrustTwin(brandId: string, sentimentData: any): Promise<TwinSyncResult> {
    try {
      await axios.post(
        `${this.twinHubUrl}/api/twins/trust/sentiment`,
        {
          brandId,
          ...sentimentData,
          lastSynced: new Date()
        },
        { timeout: this.timeout }
      ).catch(() => null);

      return { success: true, twinId: `trust-${brandId}` };
    } catch (error) {
      logger.error('Failed to sync to Trust Twin:', error);
      return { success: false, error: 'Trust Twin sync failed' };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.twinHubUrl}/health`, { timeout: 5000 });
      return true;
    } catch (error) {
      logger.warn('TwinOS Hub health check failed');
      return false;
    }
  }
}
