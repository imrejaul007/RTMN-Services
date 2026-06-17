import { Router, Request, Response } from 'express';
import { BrandOpsBridge } from '../services/brandOpsBridge';
import { TwinSyncService } from '../services/twinSync';
import { TrustSyncService } from '../services/trustSync';
import {
  BrandCampaign,
  BrandMention,
  BrandSentiment,
  createSyncRecord,
  completeSyncRecord,
  syncStore,
  SyncType,
  SyncStatus
} from '../models/BrandSync';

export default function syncRoutes(
  brandOpsBridge: BrandOpsBridge,
  twinSyncService: TwinSyncService,
  trustSyncService: TrustSyncService,
  logger: any
) {
  const router = Router();

  // POST /api/sync/campaigns - Sync brand campaigns
  router.post('/campaigns', async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const startTime = Date.now();

    try {
      const { campaigns, brandId } = req.body;

      if (!campaigns || !Array.isArray(campaigns)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'campaigns array is required'
        });
      }

      logger.info('Starting campaign sync', { requestId, brandId, count: campaigns.length });

      // Create sync record
      const syncRecord = createSyncRecord(
        SyncType.CAMPAIGN,
        'campaign-twin',
        { campaigns, brandId }
      );
      await syncStore.save(syncRecord);

      const results = {
        campaignTwin: { success: false, synced: 0, failed: 0 },
        customerOps: { success: false, synced: 0, failed: 0 },
        dashboard: { success: false, synced: 0, failed: 0 }
      };

      // Sync to Campaign Twin
      try {
        const twinResult = await twinSyncService.syncCampaigns(campaigns);
        results.campaignTwin = twinResult;
      } catch (error: any) {
        logger.error('Campaign Twin sync failed', { requestId, error: error.message });
      }

      // Sync to Customer Operations OS
      try {
        const opsResult = await brandOpsBridge.syncCampaignMetrics(campaigns);
        results.customerOps = opsResult;
      } catch (error: any) {
        logger.error('Customer Operations sync failed', { requestId, error: error.message });
      }

      // Update dashboard KPIs
      try {
        const dashResult = await brandOpsBridge.updateBrandHealthKPIs(brandId, campaigns);
        results.dashboard = dashResult;
      } catch (error: any) {
        logger.error('Dashboard update failed', { requestId, error: error.message });
      }

      // Complete sync record
      const totalSynced = results.campaignTwin.synced + results.customerOps.synced + results.dashboard.synced;
      const totalFailed = results.campaignTwin.failed + results.customerOps.failed + results.dashboard.failed;
      const updatedRecord = completeSyncRecord(syncRecord, {
        success: totalFailed === 0,
        message: `Synced ${totalSynced} campaigns, ${totalFailed} failed`,
        recordsProcessed: campaigns.length,
        recordsFailed: totalFailed,
        duration: Date.now() - startTime
      });
      await syncStore.save(updatedRecord);

      logger.info('Campaign sync completed', {
        requestId,
        synced: totalSynced,
        failed: totalFailed,
        duration: Date.now() - startTime
      });

      res.json({
        success: totalFailed === 0,
        syncId: syncRecord.id,
        results,
        duration: Date.now() - startTime
      });
    } catch (error: any) {
      logger.error('Campaign sync failed', { requestId, error: error.message });
      res.status(500).json({
        error: 'Sync failed',
        message: error.message
      });
    }
  });

  // POST /api/sync/mentions - Sync brand mentions
  router.post('/mentions', async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const startTime = Date.now();

    try {
      const { mentions, brandId } = req.body;

      if (!mentions || !Array.isArray(mentions)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'mentions array is required'
        });
      }

      logger.info('Starting mentions sync', { requestId, brandId, count: mentions.length });

      // Create sync record
      const syncRecord = createSyncRecord(
        SyncType.MENTION,
        'journey-twin',
        { mentions, brandId }
      );
      await syncStore.save(syncRecord);

      const results = {
        journeyTwin: { success: false, synced: 0, failed: 0 },
        customerOps: { success: false, synced: 0, failed: 0 },
        trustIntelligence: { success: false, synced: 0, failed: 0 }
      };

      // Sync to Journey Twin (brand mentions as touchpoints)
      try {
        const twinResult = await twinSyncService.syncBrandMentions(mentions);
        results.journeyTwin = twinResult;
      } catch (error: any) {
        logger.error('Journey Twin sync failed', { requestId, error: error.message });
      }

      // Sync to Customer Operations
      try {
        const opsResult = await brandOpsBridge.processBrandMentions(mentions);
        results.customerOps = opsResult;
      } catch (error: any) {
        logger.error('Customer Operations sync failed', { requestId, error: error.message });
      }

      // Sync sentiment to Trust Intelligence
      try {
        const trustResult = await trustSyncService.syncFromMentions(mentions);
        results.trustIntelligence = trustResult;
      } catch (error: any) {
        logger.error('Trust Intelligence sync failed', { requestId, error: error.message });
      }

      // Complete sync record
      const totalSynced = results.journeyTwin.synced + results.customerOps.synced + results.trustIntelligence.synced;
      const totalFailed = results.journeyTwin.failed + results.customerOps.failed + results.trustIntelligence.failed;
      const updatedRecord = completeSyncRecord(syncRecord, {
        success: totalFailed === 0,
        message: `Synced ${totalSynced} mentions, ${totalFailed} failed`,
        recordsProcessed: mentions.length,
        recordsFailed: totalFailed,
        duration: Date.now() - startTime
      });
      await syncStore.save(updatedRecord);

      logger.info('Mentions sync completed', {
        requestId,
        synced: totalSynced,
        failed: totalFailed,
        duration: Date.now() - startTime
      });

      res.json({
        success: totalFailed === 0,
        syncId: syncRecord.id,
        results,
        duration: Date.now() - startTime
      });
    } catch (error: any) {
      logger.error('Mentions sync failed', { requestId, error: error.message });
      res.status(500).json({
        error: 'Sync failed',
        message: error.message
      });
    }
  });

  // POST /api/sync/sentiment - Sync sentiment scores
  router.post('/sentiment', async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const startTime = Date.now();

    try {
      const { sentiment, brandId } = req.body;

      if (!sentiment) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'sentiment data is required'
        });
      }

      logger.info('Starting sentiment sync', { requestId, brandId });

      // Create sync record
      const syncRecord = createSyncRecord(
        SyncType.SENTIMENT,
        'trust-intelligence',
        { sentiment, brandId }
      );
      await syncStore.save(syncRecord);

      const results = {
        trustIntelligence: { success: false, synced: 0, failed: 0 },
        dashboard: { success: false, synced: 0, failed: 0 },
        customerOps: { success: false, synced: 0, failed: 0 }
      };

      // Sync sentiment to Trust Intelligence
      try {
        const trustResult = await trustSyncService.syncSentiment(sentiment);
        results.trustIntelligence = trustResult;
      } catch (error: any) {
        logger.error('Trust Intelligence sync failed', { requestId, error: error.message });
      }

      // Update dashboard KPIs
      try {
        const dashResult = await brandOpsBridge.updateSentimentKPIs(brandId, sentiment);
        results.dashboard = dashResult;
      } catch (error: any) {
        logger.error('Dashboard update failed', { requestId, error: error.message });
      }

      // Notify Customer Operations of sentiment changes
      try {
        const opsResult = await brandOpsBridge.notifySentimentChange(brandId, sentiment);
        results.customerOps = opsResult;
      } catch (error: any) {
        logger.error('Customer Operations notification failed', { requestId, error: error.message });
      }

      // Complete sync record
      const totalSynced = results.trustIntelligence.synced + results.dashboard.synced + results.customerOps.synced;
      const totalFailed = results.trustIntelligence.failed + results.dashboard.failed + results.customerOps.failed;
      const updatedRecord = completeSyncRecord(syncRecord, {
        success: totalFailed === 0,
        message: `Sentiment synced successfully`,
        recordsProcessed: 1,
        recordsFailed: totalFailed,
        duration: Date.now() - startTime
      });
      await syncStore.save(updatedRecord);

      logger.info('Sentiment sync completed', {
        requestId,
        duration: Date.now() - startTime
      });

      res.json({
        success: totalFailed === 0,
        syncId: syncRecord.id,
        results,
        duration: Date.now() - startTime
      });
    } catch (error: any) {
      logger.error('Sentiment sync failed', { requestId, error: error.message });
      res.status(500).json({
        error: 'Sync failed',
        message: error.message
      });
    }
  });

  // POST /api/sync/full - Full brand sync
  router.post('/full', async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const startTime = Date.now();

    try {
      const { brandId, campaigns, mentions, sentiment } = req.body;

      if (!brandId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'brandId is required'
        });
      }

      logger.info('Starting full brand sync', { requestId, brandId });

      // Create sync record
      const syncRecord = createSyncRecord(
        SyncType.FULL,
        'all-services',
        { brandId, campaigns, mentions, sentiment }
      );
      await syncStore.save(syncRecord);

      // Execute all syncs
      const results: Record<string, any> = {};

      // 1. Sync campaigns
      if (campaigns && campaigns.length > 0) {
        try {
          results.campaigns = {
            campaignTwin: await twinSyncService.syncCampaigns(campaigns),
            customerOps: await brandOpsBridge.syncCampaignMetrics(campaigns),
            dashboard: await brandOpsBridge.updateBrandHealthKPIs(brandId, campaigns)
          };
        } catch (error: any) {
          results.campaigns = { error: error.message };
        }
      }

      // 2. Sync mentions
      if (mentions && mentions.length > 0) {
        try {
          results.mentions = {
            journeyTwin: await twinSyncService.syncBrandMentions(mentions),
            customerOps: await brandOpsBridge.processBrandMentions(mentions),
            trustIntelligence: await trustSyncService.syncFromMentions(mentions)
          };
        } catch (error: any) {
          results.mentions = { error: error.message };
        }
      }

      // 3. Sync sentiment
      if (sentiment) {
        try {
          results.sentiment = {
            trustIntelligence: await trustSyncService.syncSentiment(sentiment),
            dashboard: await brandOpsBridge.updateSentimentKPIs(brandId, sentiment),
            customerOps: await brandOpsBridge.notifySentimentChange(brandId, sentiment)
          };
        } catch (error: any) {
          results.sentiment = { error: error.message };
        }
      }

      // Complete sync record
      const updatedRecord = completeSyncRecord(syncRecord, {
        success: true,
        message: 'Full brand sync completed',
        recordsProcessed: (campaigns?.length || 0) + (mentions?.length || 0) + (sentiment ? 1 : 0),
        recordsFailed: 0,
        duration: Date.now() - startTime
      });
      await syncStore.save(updatedRecord);

      logger.info('Full brand sync completed', {
        requestId,
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        syncId: syncRecord.id,
        results,
        duration: Date.now() - startTime
      });
    } catch (error: any) {
      logger.error('Full brand sync failed', { requestId, error: error.message });
      res.status(500).json({
        error: 'Sync failed',
        message: error.message
      });
    }
  });

  // GET /api/sync/status/:syncId - Get sync status
  router.get('/status/:syncId', async (req: Request, res: Response) => {
    const { syncId } = req.params;

    try {
      const record = await syncStore.get(syncId);

      if (!record) {
        return res.status(404).json({
          error: 'Not found',
          message: `Sync record ${syncId} not found`
        });
      }

      res.json(record);
    } catch (error: any) {
      logger.error('Failed to get sync status', { syncId, error: error.message });
      res.status(500).json({
        error: 'Failed to get sync status',
        message: error.message
      });
    }
  });

  // GET /api/sync/history - Get sync history
  router.get('/history', async (req: Request, res: Response) => {
    const { type, status, limit } = req.query;

    try {
      let records = await syncStore.getRecent(Number(limit) || 100);

      if (type) {
        records = records.filter(r => r.type === type);
      }

      if (status) {
        records = records.filter(r => r.status === status);
      }

      res.json({
        count: records.length,
        records
      });
    } catch (error: any) {
      logger.error('Failed to get sync history', { error: error.message });
      res.status(500).json({
        error: 'Failed to get sync history',
        message: error.message
      });
    }
  });

  return router;
}
