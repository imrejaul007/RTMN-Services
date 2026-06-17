import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { TwinSync } from '../services/twinSync';
import { AdBazaarCampaign } from '../models/AdBazaarProfile';

export default function campaignsRoutes(
  customerOpsBridge: CustomerOpsBridge,
  twinSync: TwinSync,
  logger: any
): Router {
  const router = Router();

  /**
   * POST /api/campaigns
   * Create a new campaign
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const campaign: AdBazaarCampaign = {
        ...req.body,
        id: req.body.id || uuidv4(),
        createdAt: req.body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Sync to Campaign Twin
      const campaignTwin = await twinSync.syncToCampaignTwin({
        sourceId: campaign.id,
        source: 'adbazaar',
        campaign: {
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          budget: campaign.budget,
          channels: campaign.channels,
          metrics: campaign.metrics
        }
      });

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('campaign.created', {
        source: 'adbazaar',
        campaign: {
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          channels: campaign.channels,
          audienceCount: campaign.targetAudience?.count
        }
      });

      logger.info('Campaign created', {
        campaignId: campaign.id,
        campaignTwinId: campaignTwin?.id
      });

      res.status(201).json({
        success: true,
        campaign: {
          id: campaign.id,
          campaignTwinId: campaignTwin?.id
        },
        message: 'Campaign synced to Campaign Twin'
      });
    } catch (error) {
      logger.error('Failed to create campaign', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create campaign'
      });
    }
  });

  /**
   * GET /api/campaigns/:id
   * Get campaign by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get from Campaign Twin
      const campaignTwin = await twinSync.getCampaignTwinBySourceId(id, 'adbazaar');

      res.json({
        success: true,
        campaign: {
          id,
          campaignTwin
        }
      });
    } catch (error) {
      logger.error('Failed to get campaign', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get campaign'
      });
    }
  });

  /**
   * PATCH /api/campaigns/:id
   * Update campaign
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = {
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      // Sync updates to Campaign Twin
      await twinSync.syncToCampaignTwin({
        sourceId: id,
        source: 'adbazaar',
        campaign: {
          id,
          ...updates
        }
      });

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('campaign.updated', {
        source: 'adbazaar',
        campaignId: id,
        updates
      });

      logger.info('Campaign updated', { campaignId: id });

      res.json({
        success: true,
        campaignId: id
      });
    } catch (error) {
      logger.error('Failed to update campaign', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update campaign'
      });
    }
  });

  /**
   * POST /api/campaigns/:id/metrics
   * Update campaign metrics
   */
  router.post('/:id/metrics', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { metrics } = req.body;

      // Update Campaign Twin with metrics
      await twinSync.syncToCampaignTwin({
        sourceId: id,
        source: 'adbazaar',
        campaign: {
          id,
          metrics
        }
      });

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('campaign.metricsUpdated', {
        source: 'adbazaar',
        campaignId: id,
        metrics
      });

      logger.info('Campaign metrics updated', { campaignId: id, metrics });

      res.json({
        success: true,
        campaignId: id,
        metrics
      });
    } catch (error) {
      logger.error('Failed to update campaign metrics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update metrics'
      });
    }
  });

  /**
   * POST /api/campaigns/:id/audience
   * Set campaign audience
   */
  router.post('/:id/audience', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { audienceIds, segmentId } = req.body;

      // Update Campaign Twin
      await twinSync.syncToCampaignTwin({
        sourceId: id,
        source: 'adbazaar',
        campaign: {
          id,
          audienceIds
        }
      });

      // Sync audience to Customer Operations
      await customerOpsBridge.syncCampaignAudience({
        campaignId: id,
        audienceIds,
        segmentId
      });

      logger.info('Campaign audience set', {
        campaignId: id,
        audienceCount: audienceIds?.length
      });

      res.json({
        success: true,
        campaignId: id,
        audienceCount: audienceIds?.length
      });
    } catch (error) {
      logger.error('Failed to set campaign audience', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to set audience'
      });
    }
  });

  /**
   * POST /api/campaigns/:id/launch
   * Launch a campaign
   */
  router.post('/:id/launch', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Update Campaign Twin
      await twinSync.syncToCampaignTwin({
        sourceId: id,
        source: 'adbazaar',
        campaign: {
          id,
          status: 'active',
          launchedAt: new Date().toISOString()
        }
      });

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('campaign.launched', {
        source: 'adbazaar',
        campaignId: id,
        launchedAt: new Date().toISOString()
      });

      logger.info('Campaign launched', { campaignId: id });

      res.json({
        success: true,
        campaignId: id,
        status: 'active'
      });
    } catch (error) {
      logger.error('Failed to launch campaign', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to launch campaign'
      });
    }
  });

  /**
   * POST /api/campaigns/:id/pause
   * Pause a campaign
   */
  router.post('/:id/pause', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Update Campaign Twin
      await twinSync.syncToCampaignTwin({
        sourceId: id,
        source: 'adbazaar',
        campaign: {
          id,
          status: 'paused',
          pausedAt: new Date().toISOString(),
          pauseReason: reason
        }
      });

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('campaign.paused', {
        source: 'adbazaar',
        campaignId: id,
        reason
      });

      logger.info('Campaign paused', { campaignId: id, reason });

      res.json({
        success: true,
        campaignId: id,
        status: 'paused'
      });
    } catch (error) {
      logger.error('Failed to pause campaign', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to pause campaign'
      });
    }
  });

  /**
   * POST /api/campaigns/:id/complete
   * Complete a campaign
   */
  router.post('/:id/complete', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { finalMetrics } = req.body;

      // Update Campaign Twin
      await twinSync.syncToCampaignTwin({
        sourceId: id,
        source: 'adbazaar',
        campaign: {
          id,
          status: 'completed',
          completedAt: new Date().toISOString(),
          metrics: finalMetrics
        }
      });

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('campaign.completed', {
        source: 'adbazaar',
        campaignId: id,
        finalMetrics,
        completedAt: new Date().toISOString()
      });

      logger.info('Campaign completed', { campaignId: id });

      res.json({
        success: true,
        campaignId: id,
        status: 'completed'
      });
    } catch (error) {
      logger.error('Failed to complete campaign', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to complete campaign'
      });
    }
  });

  /**
   * GET /api/campaigns/stats/summary
   * Get campaign statistics
   */
  router.get('/stats/summary', async (req: Request, res: Response) => {
    try {
      const stats = await twinSync.getCampaignTwinStats();

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Failed to get campaign stats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get campaign statistics'
      });
    }
  });

  /**
   * GET /api/campaigns
   * List campaigns
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { status, type, limit = 50, offset = 0 } = req.query;

      const campaigns = await twinSync.listCampaignTwins({
        status: status as string,
        type: type as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        campaigns,
        count: campaigns.length,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      logger.error('Failed to list campaigns', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list campaigns'
      });
    }
  });

  /**
   * POST /api/campaigns/:id/track/:eventType
   * Track campaign event
   */
  router.post('/:id/track/:eventType', async (req: Request, res: Response) => {
    try {
      const { id, eventType } = req.params;
      const { profileId, metadata } = req.body;

      // Track event via Customer Operations
      await customerOpsBridge.trackCampaignEvent({
        campaignId: id,
        eventType,
        profileId,
        metadata,
        timestamp: new Date().toISOString()
      });

      // Update Campaign Twin metrics
      const metricUpdate: any = {};
      switch (eventType) {
        case 'impression':
          metricUpdate.impressions = (await twinSync.getCampaignTwinBySourceId(id, 'adbazaar'))?.metrics?.impressions || 0 + 1;
          break;
        case 'click':
          metricUpdate.clicks = (await twinSync.getCampaignTwinBySourceId(id, 'adbazaar'))?.metrics?.clicks || 0 + 1;
          break;
        case 'conversion':
          metricUpdate.conversions = (await twinSync.getCampaignTwinBySourceId(id, 'adbazaar'))?.metrics?.conversions || 0 + 1;
          break;
      }

      if (Object.keys(metricUpdate).length > 0) {
        await twinSync.syncToCampaignTwin({
          sourceId: id,
          source: 'adbazaar',
          campaign: { id, metrics: metricUpdate }
        });
      }

      logger.info('Campaign event tracked', { campaignId: id, eventType, profileId });

      res.json({
        success: true,
        campaignId: id,
        eventType
      });
    } catch (error) {
      logger.error('Failed to track campaign event', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to track event'
      });
    }
  });

  return router;
}
