/**
 * HOJAI Marketing Intelligence - Campaign Service
 */

import { v4 as uuid } from 'uuid';
import { CampaignModel, CampaignEventModel, MarketingAnalyticsModel } from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('campaign');

export class CampaignService {
  /**
   * Create campaign
   */
  async createCampaign(tenantId: string, data: Record<string, unknown>): Promise<any> {
    const campaign = new CampaignModel({
      campaignId: uuid(),
      tenantId,
      ...data,
      metrics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        unsubscribed: 0,
        bounced: 0
      }
    });
    await campaign.save();
    logger.info('campaign_created', { tenantId, campaignId: campaign.campaignId });
    return campaign;
  }

  /**
   * Get campaign
   */
  async getCampaign(tenantId: string, campaignId: string): Promise<any> {
    return CampaignModel.findOne({ tenantId, campaignId });
  }

  /**
   * List campaigns
   */
  async listCampaigns(tenantId: string, filters?: { status?: string; type?: string }): Promise<any[]> {
    const query: Record<string, unknown> = { tenantId };
    if (filters?.status) query.status = filters.status;
    if (filters?.type) query.type = filters.type;
    return CampaignModel.find(query).sort({ createdAt: -1 });
  }

  /**
   * Update campaign
   */
  async updateCampaign(tenantId: string, campaignId: string, updates: Record<string, unknown>): Promise<any> {
    return CampaignModel.findOneAndUpdate({ tenantId, campaignId }, { $set: updates }, { new: true });
  }

  /**
   * Record campaign event
   */
  async recordEvent(tenantId: string, campaignId: string, userId: string, type: string, metadata?: Record<string, unknown>): Promise<void> {
    await CampaignEventModel.create({
      eventId: uuid(),
      tenantId,
      campaignId,
      userId,
      type,
      timestamp: new Date(),
      metadata
    });

    // Update campaign metrics
    const metricUpdate: Record<string, number> = {};
    switch (type) {
      case 'sent': metricUpdate['metrics.sent'] = 1; break;
      case 'delivered': metricUpdate['metrics.delivered'] = 1; break;
      case 'opened': metricUpdate['metrics.opened'] = 1; break;
      case 'clicked': metricUpdate['metrics.clicked'] = 1; break;
      case 'converted': metricUpdate['metrics.converted'] = 1; break;
      case 'unsubscribed': metricUpdate['metrics.unsubscribed'] = 1; break;
      case 'bounced': metricUpdate['metrics.bounced'] = 1; break;
    }

    if (Object.keys(metricUpdate).length > 0) {
      await CampaignModel.findOneAndUpdate({ tenantId, campaignId }, { $inc: metricUpdate });
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(tenantId: string, campaignId: string): Promise<any> {
    const campaign = await CampaignModel.findOne({ tenantId, campaignId });
    if (!campaign) return null;

    const { metrics } = campaign;
    const rates = {
      deliveryRate: metrics.sent > 0 ? (metrics.delivered / metrics.sent) * 100 : 0,
      openRate: metrics.delivered > 0 ? (metrics.opened / metrics.delivered) * 100 : 0,
      clickRate: metrics.opened > 0 ? (metrics.clicked / metrics.opened) * 100 : 0,
      conversionRate: metrics.clicked > 0 ? (metrics.converted / metrics.clicked) * 100 : 0
    };

    return { campaignId, metrics, rates };
  }

  /**
   * Get overall marketing analytics
   */
  async getAnalytics(tenantId: string, period: string, startDate: Date, endDate: Date): Promise<any> {
    const cached = await MarketingAnalyticsModel.findOne({ tenantId, period, startDate, endDate });
    if (cached) return cached;

    // Aggregate from campaigns
    const campaigns = await CampaignModel.find({
      tenantId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    let totalSent = 0, totalDelivered = 0, totalOpened = 0, totalClicked = 0, totalConverted = 0;

    for (const c of campaigns) {
      totalSent += c.metrics.sent;
      totalDelivered += c.metrics.delivered;
      totalOpened += c.metrics.opened;
      totalClicked += c.metrics.clicked;
      totalConverted += c.metrics.converted;
    }

    const analytics = await MarketingAnalyticsModel.create({
      tenantId,
      period,
      startDate,
      endDate,
      overview: {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'running').length,
        totalSent,
        totalRevenue: 0,
        totalConversions: totalConverted
      },
      rates: {
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        conversionRate: totalClicked > 0 ? (totalConverted / totalClicked) * 100 : 0,
        unsubscribeRate: 0,
        bounceRate: 0
      },
      revenue: { email: 0, sms: 0, push: 0, social: 0, total: 0 },
      roi: { email: 0, sms: 0, push: 0, social: 0, overall: 0 },
      computedAt: new Date()
    });

    return analytics;
  }
}

export const campaignService = new CampaignService();
export default campaignService;
