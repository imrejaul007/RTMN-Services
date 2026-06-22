// ============================================
// HOJAI AI - Campaign Manager Service
// ============================================

import { Campaign, IEmailCampaignDocument, EmailCampaign, SocialPost } from '../models';
import {
  CampaignStatus,
  CampaignType,
  CampaignObjective,
  ICampaign,
  IEmailCampaign,
  EmailCampaignStatus
} from '../types';
import { logger } from '../utils/logger';

export interface CampaignConfig {
  autoOptimize: boolean;
  defaultBudget: number;
  defaultCurrency: string;
}

export class CampaignManagerService {
  private config: CampaignConfig;

  constructor(config?: Partial<CampaignConfig>) {
    this.config = {
      autoOptimize: config?.autoOptimize ?? false,
      defaultBudget: config?.defaultBudget || 1000,
      defaultCurrency: config?.defaultCurrency || 'USD'
    };
  }

  /**
   * Create a new campaign
   */
  async createCampaign(
    tenantId: string,
    userId: string,
    params: {
      name: string;
      type: CampaignType;
      objective: CampaignObjective;
      description?: string;
      targetAudience?: {
        demographics?: {
          age?: { min?: number; max?: number };
          gender?: 'male' | 'female' | 'all';
          locations?: string[];
          languages?: string[];
        };
        interests?: string[];
        behaviors?: string[];
      };
      budget?: {
        total: number;
        currency?: string;
      };
      startDate: string;
      endDate?: string;
      channels?: string[];
    }
  ): Promise<ICampaign> {
    logger.info('Creating campaign', { tenantId, name: params.name });

    const doc = await Campaign.create({
      tenantId,
      name: params.name,
      type: params.type,
      objective: params.objective,
      description: params.description || '',
      targetAudience: params.targetAudience || {},
      budget: {
        total: params.budget?.total || this.config.defaultBudget,
        currency: params.budget?.currency || this.config.defaultCurrency,
        spent: 0
      },
      startDate: new Date(params.startDate),
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      channels: params.channels || [],
      status: CampaignStatus.DRAFT,
      createdBy: userId
    });

    logger.info('Campaign created', { tenantId, campaignId: doc._id });
    return this.mapToICampaign(doc);
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(tenantId: string, campaignId: string): Promise<ICampaign | null> {
    const doc = await Campaign.findOne({ _id: campaignId, tenantId });
    if (!doc) return null;
    return this.mapToICampaign(doc);
  }

  /**
   * List campaigns with filters
   */
  async listCampaigns(
    tenantId: string,
    filters: {
      status?: CampaignStatus;
      type?: CampaignType;
      objective?: CampaignObjective;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: ICampaign[]; total: number }> {
    const query: Record<string, unknown> = { tenantId };

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.objective) query.objective = filters.objective;

    const [docs, total] = await Promise.all([
      Campaign.find(query)
        .sort({ createdAt: -1 })
        .skip(filters.offset || 0)
        .limit(filters.limit || 20)
        .lean(),
      Campaign.countDocuments(query)
    ]);

    return {
      items: docs.map(doc => this.mapToICampaign(doc)),
      total
    };
  }

  /**
   * Launch a campaign
   */
  async launchCampaign(
    tenantId: string,
    campaignId: string,
    immediate: boolean = true,
    startDate?: string
  ): Promise<{ success: boolean; campaign?: ICampaign; error?: string }> {
    logger.info('Launching campaign', { tenantId, campaignId, immediate });

    const doc = await Campaign.findOne({ _id: campaignId, tenantId });
    if (!doc) {
      return { success: false, error: 'Campaign not found' };
    }

    if (doc.status === CampaignStatus.LAUNCHED) {
      return { success: false, error: 'Campaign already launched' };
    }

    if (doc.status === CampaignStatus.COMPLETED) {
      return { success: false, error: 'Campaign has been completed' };
    }

    if (doc.status === CampaignStatus.CANCELLED) {
      return { success: false, error: 'Campaign has been cancelled' };
    }

    // Validate campaign is ready
    const validation = this.validateCampaign(doc);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Update campaign status
    const launchDate = immediate
      ? new Date()
      : (startDate ? new Date(startDate) : new Date());

    doc.status = CampaignStatus.LAUNCHED;
    doc.launchedAt = launchDate;
    await doc.save();

    // Create email campaign if email is a channel
    if (doc.channels.includes('email')) {
      await this.createEmailCampaign(tenantId, campaignId);
    }

    logger.info('Campaign launched', { tenantId, campaignId, launchedAt: launchDate });

    return { success: true, campaign: this.mapToICampaign(doc) };
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(
    tenantId: string,
    campaignId: string
  ): Promise<ICampaign | null> {
    const doc = await Campaign.findOneAndUpdate(
      { _id: campaignId, tenantId, status: CampaignStatus.LAUNCHED },
      { status: CampaignStatus.PAUSED },
      { new: true }
    );

    if (!doc) return null;
    logger.info('Campaign paused', { tenantId, campaignId });
    return this.mapToICampaign(doc);
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(
    tenantId: string,
    campaignId: string
  ): Promise<ICampaign | null> {
    const doc = await Campaign.findOneAndUpdate(
      { _id: campaignId, tenantId, status: CampaignStatus.PAUSED },
      { status: CampaignStatus.LAUNCHED },
      { new: true }
    );

    if (!doc) return null;
    logger.info('Campaign resumed', { tenantId, campaignId });
    return this.mapToICampaign(doc);
  }

  /**
   * Complete a campaign
   */
  async completeCampaign(
    tenantId: string,
    campaignId: string
  ): Promise<ICampaign | null> {
    const doc = await Campaign.findOneAndUpdate(
      { _id: campaignId, tenantId, status: CampaignStatus.LAUNCHED },
      {
        status: CampaignStatus.COMPLETED,
        completedAt: new Date()
      },
      { new: true }
    );

    if (!doc) return null;
    logger.info('Campaign completed', { tenantId, campaignId });
    return this.mapToICampaign(doc);
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(
    tenantId: string,
    campaignId: string
  ): Promise<ICampaign | null> {
    const doc = await Campaign.findOneAndUpdate(
      { _id: campaignId, tenantId },
      { status: CampaignStatus.CANCELLED },
      { new: true }
    );

    if (!doc) return null;
    logger.info('Campaign cancelled', { tenantId, campaignId });
    return this.mapToICampaign(doc);
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    tenantId: string,
    campaignId: string,
    updates: Partial<{
      name: string;
      description: string;
      budget: { total: number };
      endDate: string;
      targetAudience: ICampaign['targetAudience'];
    }>
  ): Promise<ICampaign | null> {
    const updateObj: Record<string, unknown> = {};

    if (updates.name) updateObj.name = updates.name;
    if (updates.description) updateObj.description = updates.description;
    if (updates.budget) updateObj.budget = updates.budget;
    if (updates.endDate) updateObj.endDate = new Date(updates.endDate);
    if (updates.targetAudience) updateObj.targetAudience = updates.targetAudience;

    const doc = await Campaign.findOneAndUpdate(
      { _id: campaignId, tenantId, status: CampaignStatus.DRAFT },
      updateObj,
      { new: true }
    );

    if (!doc) return null;
    return this.mapToICampaign(doc);
  }

  /**
   * Update campaign metrics
   */
  async updateMetrics(
    tenantId: string,
    campaignId: string,
    metrics: {
      impressions?: number;
      clicks?: number;
      conversions?: number;
      revenue?: number;
    }
  ): Promise<ICampaign | null> {
    const doc = await Campaign.findOne({ _id: campaignId, tenantId });
    if (!doc) return null;

    // Initialize metrics object if needed
    if (!doc.metrics) {
      doc.metrics = {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        ctr: 0,
        cpc: 0,
        roas: 0
      };
    }

    if (metrics.impressions !== undefined) {
      doc.metrics.impressions = metrics.impressions;
    }

    if (metrics.clicks !== undefined) {
      doc.metrics.clicks = metrics.clicks;
      if (doc.metrics.impressions && doc.metrics.impressions > 0) {
        doc.metrics.ctr = (metrics.clicks / doc.metrics.impressions) * 100;
      }
    }

    if (metrics.conversions !== undefined) {
      doc.metrics.conversions = metrics.conversions;
    }

    if (metrics.revenue !== undefined) {
      doc.metrics.revenue = metrics.revenue;
      if (doc.budget?.total && doc.budget.total > 0) {
        doc.metrics.roas = metrics.revenue / doc.budget.total;
      }
    }

    await doc.save();
    return this.mapToICampaign(doc);
  }

  /**
   * Get campaign performance summary
   */
  async getCampaignSummary(tenantId: string, campaignId: string): Promise<{
    campaign: ICampaign;
    emailStats?: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      bounced: number;
      openRate: number;
      clickRate: number;
    };
    socialStats?: {
      posts: number;
      scheduled: number;
      published: number;
      totalImpressions: number;
      avgEngagement: number;
    };
  } | null> {
    const campaign = await this.getCampaign(tenantId, campaignId);
    if (!campaign) return null;

    const result: {
      campaign: ICampaign;
      emailStats?: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        openRate: number;
        clickRate: number;
      };
      socialStats?: {
        posts: number;
        scheduled: number;
        published: number;
        totalImpressions: number;
        avgEngagement: number;
      };
    } = { campaign };

    // Get email campaign stats if email is a channel
    if (campaign.channels?.includes('email')) {
      const emailCampaigns = await EmailCampaign.find({
        tenantId,
        campaignId: campaignId
      }).lean();

      if (emailCampaigns.length > 0) {
        const sent = emailCampaigns.reduce((sum, ec) => sum + (ec.sentCount || 0), 0);
        const delivered = emailCampaigns.reduce((sum, ec) => sum + (ec.deliveredCount || 0), 0);
        const opened = emailCampaigns.reduce((sum, ec) => sum + (ec.openedCount || 0), 0);
        const clicked = emailCampaigns.reduce((sum, ec) => sum + (ec.clickedCount || 0), 0);
        const bounced = emailCampaigns.reduce((sum, ec) => sum + (ec.bouncedCount || 0), 0);

        result.emailStats = {
          sent,
          delivered,
          opened,
          clicked,
          bounced,
          openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
          clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0
        };
      }
    }

    // Get social stats if social is a channel
    if (campaign.channels?.includes('social')) {
      const socialPosts = await SocialPost.find({ tenantId }).lean();
      const campaignPosts = socialPosts.filter(p =>
        p.campaignId?.toString() === campaignId
      );

      if (campaignPosts.length > 0) {
        const publishedPosts = campaignPosts.filter(p => p.status === 'published');
        const scheduledPosts = campaignPosts.filter(p => p.status === 'scheduled');

        const totalImpressions = publishedPosts.reduce(
          (sum, p) => sum + (p.engagement?.impressions || 0),
          0
        );
        const totalEngagement = publishedPosts.reduce(
          (sum, p) => sum +
            (p.engagement?.likes || 0) +
            (p.engagement?.comments || 0) +
            (p.engagement?.shares || 0),
          0
        );

        result.socialStats = {
          posts: campaignPosts.length,
          scheduled: scheduledPosts.length,
          published: publishedPosts.length,
          totalImpressions,
          avgEngagement: publishedPosts.length > 0
            ? totalEngagement / publishedPosts.length
            : 0
        };
      }
    }

    return result;
  }

  /**
   * Create email campaign
   */
  private async createEmailCampaign(tenantId: string, campaignId: string): Promise<IEmailCampaignDocument> {
    const emailCampaign = await EmailCampaign.create({
      tenantId,
      campaignId,
      subject: 'Your email subject here',
      status: EmailCampaignStatus.DRAFT
    });

    return emailCampaign;
  }

  /**
   * Validate campaign is ready for launch
   */
  private validateCampaign(doc: { name?: string; type?: string; objective?: string }): { valid: boolean; error?: string } {
    if (!doc.name || doc.name.trim().length === 0) {
      return { valid: false, error: 'Campaign name is required' };
    }

    if (!doc.type) {
      return { valid: false, error: 'Campaign type is required' };
    }

    if (!doc.objective) {
      return { valid: false, error: 'Campaign objective is required' };
    }

    return { valid: true };
  }

  /**
   * Map document to interface
   */
  private mapToICampaign(doc: any): ICampaign {
    return {
      id: doc._id?.toString() || '',
      tenantId: doc.tenantId || '',
      name: doc.name || '',
      type: doc.type || CampaignType.CONTENT,
      objective: doc.objective || CampaignObjective.ENGAGEMENT,
      description: doc.description || '',
      targetAudience: doc.targetAudience || {},
      budget: doc.budget || { total: 0, currency: 'USD', spent: 0 },
      startDate: doc.startDate || new Date(),
      endDate: doc.endDate,
      channels: doc.channels || [],
      status: doc.status || CampaignStatus.DRAFT,
      metrics: doc.metrics || { impressions: 0, clicks: 0, conversions: 0, revenue: 0, ctr: 0, cpc: 0, roas: 0 },
      createdBy: doc.createdBy || '',
      launchedAt: doc.launchedAt,
      completedAt: doc.completedAt,
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date()
    };
  }
}

// Export singleton instance
export const campaignManager = new CampaignManagerService();
