import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { BrandOpsBridge } from '../services/brandOpsBridge';
import { TwinSyncService } from '../services/twinSync';
import { TrustSyncService } from '../services/trustSync';
import { BrandMention, BrandSentiment, BrandCampaign } from '../models/BrandSync';

export default function webhookRoutes(
  brandOpsBridge: BrandOpsBridge,
  twinSyncService: TwinSyncService,
  trustSyncService: TrustSyncService,
  logger: any
) {
  const router = Router();

  // Verify webhook signature
  const verifySignature = (req: Request, secret: string): boolean => {
    const signature = req.headers['x-webhook-signature'] as string;
    if (!signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  };

  // POST /webhooks/social - Social media platform webhooks
  router.post('/social', async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const webhookSecret = process.env.WEBHOOK_SECRET || '';

    try {
      // Verify webhook signature
      if (webhookSecret && !verifySignature(req, webhookSecret)) {
        logger.warn('Invalid webhook signature', { requestId });
        return res.status(401).json({
          error: 'Invalid signature'
        });
      }

      const { platform, event, data } = req.body;

      logger.info('Received social webhook', { requestId, platform, event });

      // Process based on event type
      switch (event) {
        case 'mention':
          await handleSocialMention(platform, data);
          break;

        case 'trend':
          await handleSocialTrend(platform, data);
          break;

        case 'engagement':
          await handleSocialEngagement(platform, data);
          break;

        case 'crisis':
          await handleSocialCrisis(platform, data);
          break;

        default:
          logger.info('Unhandled social event type', { requestId, event });
      }

      // Always acknowledge receipt
      res.json({
        success: true,
        received: true,
        requestId
      });
    } catch (error: any) {
      logger.error('Social webhook processing failed', {
        requestId,
        error: error.message
      });

      // Still return 200 to prevent webhook retries for processing errors
      res.json({
        success: false,
        received: true,
        error: error.message
      });
    }
  });

  // Handle social mention events
  async function handleSocialMention(platform: string, data: any) {
    const mention: BrandMention = {
      id: data.id || data.mention_id,
      brandId: data.brand_id,
      platform: platform,
      authorId: data.author_id,
      authorName: data.author_name,
      content: data.content,
      sentiment: data.sentiment || 'neutral',
      sentimentScore: data.sentiment_score || 0,
      reach: data.reach || 0,
      impressions: data.impressions || 0,
      engagement: {
        likes: data.likes || 0,
        shares: data.shares || 0,
        comments: data.comments || 0,
        replies: data.replies || 0
      },
      hashtags: data.hashtags || [],
      mentions: data.mentions || [],
      url: data.url,
      createdAt: new Date(data.created_at || Date.now())
    };

    // Sync to Journey Twin
    await twinSyncService.syncBrandMentions([mention]);

    // Process in Customer Operations
    await brandOpsBridge.processBrandMentions([mention]);

    // Update Trust Intelligence
    await trustSyncService.syncFromMentions([mention]);

    logger.info('Social mention processed', {
      mentionId: mention.id,
      platform,
      sentiment: mention.sentiment
    });
  }

  // Handle social trend events
  async function handleSocialTrend(platform: string, data: any) {
    const { brand_id, trend_type, volume, sentiment, keywords } = data;

    const sentimentData: BrandSentiment = {
      brandId: brand_id,
      platform,
      score: sentiment?.score || 0,
      positive: sentiment?.positive || 0,
      negative: sentiment?.negative || 0,
      neutral: sentiment?.neutral || 0,
      volume: volume,
      trending: data.trending || 'stable',
      keywords: keywords || [],
      timestamp: new Date()
    };

    // Sync to Trust Intelligence
    await trustSyncService.syncSentiment(sentimentData);

    // Update Customer Operations with trend alert
    await brandOpsBridge.processTrendAlert(brand_id, {
      platform,
      trendType: trend_type,
      volume,
      sentiment: sentimentData
    });

    logger.info('Social trend processed', {
      brandId: brand_id,
      platform,
      trendType: trend_type,
      volume
    });
  }

  // Handle social engagement events
  async function handleSocialEngagement(platform: string, data: any) {
    const { brand_id, campaign_id, engagement } = data;

    // Update Customer Operations with engagement data
    await brandOpsBridge.processEngagementData(brand_id, {
      platform,
      campaignId: campaign_id,
      ...engagement
    });

    // Sync to Campaign Twin
    await twinSyncService.updateCampaignEngagement(campaign_id, engagement);

    logger.info('Social engagement processed', {
      brandId: brand_id,
      campaignId: campaign_id,
      platform,
      engagement
    });
  }

  // Handle social crisis events
  async function handleSocialCrisis(platform: string, data: any) {
    const { brand_id, crisis_type, severity, affected_content, metrics } = data;

    // Process crisis in Customer Operations
    await brandOpsBridge.processCrisisAlert(brand_id, {
      platform,
      crisisType: crisis_type,
      severity,
      affectedContent: affected_content,
      metrics
    });

    // Update Trust Intelligence with crisis signal
    await trustSyncService.syncCrisisSignal(brand_id, {
      platform,
      crisisType: crisis_type,
      severity,
      metrics
    });

    // Update Campaign Twin if applicable
    if (data.campaign_ids && Array.isArray(data.campaign_ids)) {
      await twinSyncService.pauseCampaigns(data.campaign_ids, 'crisis');
    }

    logger.warn('Social crisis detected and processed', {
      brandId: brand_id,
      platform,
      crisisType: crisis_type,
      severity
    });
  }

  // POST /webhooks/brandpulse - BrandPulse platform events
  router.post('/brandpulse', async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;

    try {
      const { event, data, timestamp } = req.body;

      logger.info('Received BrandPulse webhook', { requestId, event });

      switch (event) {
        case 'campaign.created':
        case 'campaign.updated':
        case 'campaign.completed':
          await handleCampaignEvent(event, data);
          break;

        case 'sentiment.updated':
          await handleSentimentEvent(data);
          break;

        case 'brand.created':
        case 'brand.updated':
          await handleBrandEvent(event, data);
          break;

        case 'alert.triggered':
          await handleAlertEvent(data);
          break;

        case 'report.ready':
          await handleReportEvent(data);
          break;

        default:
          logger.info('Unhandled BrandPulse event', { requestId, event });
      }

      res.json({
        success: true,
        received: true,
        requestId,
        event
      });
    } catch (error: any) {
      logger.error('BrandPulse webhook processing failed', {
        requestId,
        error: error.message
      });

      res.json({
        success: false,
        received: true,
        error: error.message
      });
    }
  });

  // Handle campaign events from BrandPulse
  async function handleCampaignEvent(event: string, data: any) {
    const campaign: BrandCampaign = {
      id: data.id,
      brandId: data.brand_id,
      name: data.name,
      description: data.description || '',
      objective: data.objective || 'awareness',
      status: data.status,
      platforms: data.platforms || [],
      budget: {
        total: data.budget?.total || 0,
        spent: data.budget?.spent || 0,
        currency: data.budget?.currency || 'USD'
      },
      targetAudience: data.target_audience || {},
      creativeAssets: data.creative_assets || [],
      metrics: data.metrics || {
        impressions: 0,
        reach: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        roas: 0,
        engagement: 0,
        sentiment: { positive: 0, negative: 0, neutral: 0 }
      },
      startDate: new Date(data.start_date),
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at || Date.now())
    };

    // Sync to Campaign Twin
    await twinSyncService.syncCampaigns([campaign]);

    // Update Customer Operations
    await brandOpsBridge.syncCampaignMetrics([campaign]);

    // Update dashboard if campaign is completed
    if (event === 'campaign.completed') {
      await brandOpsBridge.updateBrandHealthKPIs(campaign.brandId, [campaign]);
    }

    logger.info('Campaign event processed', {
      event,
      campaignId: campaign.id,
      brandId: campaign.brandId
    });
  }

  // Handle sentiment events from BrandPulse
  async function handleSentimentEvent(data: any) {
    const sentiment: BrandSentiment = {
      brandId: data.brand_id,
      platform: data.platform || 'aggregated',
      score: data.score,
      positive: data.positive,
      negative: data.negative,
      neutral: data.neutral,
      volume: data.volume,
      trending: data.trending || 'stable',
      keywords: data.keywords || [],
      timestamp: new Date(data.timestamp || Date.now())
    };

    // Sync to Trust Intelligence
    await trustSyncService.syncSentiment(sentiment);

    // Update dashboard KPIs
    await brandOpsBridge.updateSentimentKPIs(data.brand_id, sentiment);

    logger.info('Sentiment event processed', {
      brandId: sentiment.brandId,
      score: sentiment.score
    });
  }

  // Handle brand events from BrandPulse
  async function handleBrandEvent(event: string, data: any) {
    // Sync brand data to all twins
    await twinSyncService.syncBrandProfile({
      id: data.id,
      name: data.name,
      industry: data.industry,
      verticals: data.verticals || [],
      keywords: data.keywords || [],
      competitors: data.competitors || []
    });

    logger.info('Brand event processed', {
      event,
      brandId: data.id,
      name: data.name
    });
  }

  // Handle alert events from BrandPulse
  async function handleAlertEvent(data: any) {
    const { brand_id, alert_type, severity, message, details } = data;

    // Process alert in Customer Operations
    await brandOpsBridge.processBrandAlert(brand_id, {
      type: alert_type,
      severity,
      message,
      details
    });

    // If critical, update Trust Intelligence
    if (severity === 'critical' || severity === 'high') {
      await trustSyncService.syncAlertSignal(brand_id, {
        type: alert_type,
        severity,
        message,
        details
      });
    }

    logger.warn('Alert event processed', {
      brandId: brand_id,
      alertType: alert_type,
      severity
    });
  }

  // Handle report ready events from BrandPulse
  async function handleReportEvent(data: any) {
    const { brand_id, report_type, report_url, period } = data;

    // Notify Customer Operations of new report
    await brandOpsBridge.processReportReady(brand_id, {
      type: report_type,
      url: report_url,
      period
    });

    logger.info('Report event processed', {
      brandId: brand_id,
      reportType: report_type
    });
  }

  // POST /webhooks/test - Test webhook endpoint
  router.post('/test', (req: Request, res: Response) => {
    logger.info('Test webhook received', { body: req.body });

    res.json({
      success: true,
      message: 'Test webhook received',
      received: req.body
    });
  });

  return router;
}
