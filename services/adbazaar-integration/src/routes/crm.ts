import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { TwinSync } from '../services/twinSync';
import { AdBazaarProfile } from '../models/AdBazaarProfile';

export default function crmRoutes(
  customerOpsBridge: CustomerOpsBridge,
  twinSync: TwinSync,
  logger: any
): Router {
  const router = Router();

  /**
   * POST /api/crm/profiles
   * Create or update a CRM profile
   */
  router.post('/profiles', async (req: Request, res: Response) => {
    try {
      const profile: AdBazaarProfile = {
        ...req.body,
        id: req.body.id || uuidv4(),
        createdAt: req.body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Sync to Lead Twin
      const leadTwinResult = await twinSync.syncToLeadTwin({
        sourceId: profile.id,
        source: 'crm-hub',
        profile: {
          id: profile.id,
          name: profile.name || `${profile.firstName} ${profile.lastName}`,
          email: profile.email,
          phone: profile.phone,
          company: profile.company,
          leadScore: profile.leadScore,
          lifecycleStage: profile.lifecycleStage,
          engagementScore: profile.engagementScore,
          lastActivityDate: profile.lastActivityDate
        }
      });

      // Send to Customer Operations
      await customerOpsBridge.syncProfileToCustomerOps({
        source: 'crm-hub',
        profile: {
          externalId: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          company: profile.company,
          tags: profile.tags,
          customFields: profile.customFields
        }
      });

      logger.info('CRM profile synced', {
        profileId: profile.id,
        leadTwinId: leadTwinResult?.id
      });

      res.status(201).json({
        success: true,
        profile: {
          id: profile.id,
          leadTwinId: leadTwinResult?.id
        },
        message: 'Profile synced to Lead Twin and Customer Operations'
      });
    } catch (error) {
      logger.error('Failed to sync CRM profile', { error, body: req.body });
      res.status(500).json({
        success: false,
        error: 'Failed to sync profile'
      });
    }
  });

  /**
   * GET /api/crm/profiles/:id
   * Get a CRM profile by ID
   */
  router.get('/profiles/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get from Lead Twin
      const leadTwin = await twinSync.getLeadTwinBySourceId(id, 'crm-hub');

      res.json({
        success: true,
        profile: {
          id,
          leadTwin
        }
      });
    } catch (error) {
      logger.error('Failed to get CRM profile', { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to get profile'
      });
    }
  });

  /**
   * PATCH /api/crm/profiles/:id
   * Update a CRM profile
   */
  router.patch('/profiles/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = {
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      // Sync updates to Lead Twin
      await twinSync.syncToLeadTwin({
        sourceId: id,
        source: 'crm-hub',
        profile: {
          id,
          ...updates
        }
      });

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('profile.updated', {
        source: 'crm-hub',
        profileId: id,
        updates
      });

      logger.info('CRM profile updated', { profileId: id });

      res.json({
        success: true,
        message: 'Profile updated',
        profileId: id
      });
    } catch (error) {
      logger.error('Failed to update CRM profile', { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  });

  /**
   * POST /api/crm/profiles/:id/activity
   * Record profile activity
   */
  router.post('/profiles/:id/activity', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { activityType, metadata } = req.body;

      // Update Lead Twin with activity
      await twinSync.syncToLeadTwin({
        sourceId: id,
        source: 'crm-hub',
        profile: {
          id,
          lastActivityDate: new Date().toISOString()
        }
      });

      // Send activity to Customer Operations
      await customerOpsBridge.sendActivityToCustomerOps({
        profileId: id,
        source: 'crm-hub',
        activityType,
        metadata,
        timestamp: new Date().toISOString()
      });

      logger.info('CRM profile activity recorded', {
        profileId: id,
        activityType
      });

      res.json({
        success: true,
        message: 'Activity recorded'
      });
    } catch (error) {
      logger.error('Failed to record CRM profile activity', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to record activity'
      });
    }
  });

  /**
   * GET /api/crm/profiles/:id/engagement
   * Get engagement data for a profile
   */
  router.get('/profiles/:id/engagement', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get engagement from Customer Operations
      const engagement = await customerOpsBridge.getEngagementFromCustomerOps(id);

      res.json({
        success: true,
        profileId: id,
        engagement
      });
    } catch (error) {
      logger.error('Failed to get CRM profile engagement', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get engagement data'
      });
    }
  });

  /**
   * POST /api/crm/segments
   * Create a segment
   */
  router.post('/segments', async (req: Request, res: Response) => {
    try {
      const segment = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString()
      };

      // Sync segment to Customer Operations
      await customerOpsBridge.syncSegmentToCustomerOps({
        segmentId: segment.id,
        name: segment.name,
        criteria: segment.criteria,
        profileCount: 0
      });

      res.status(201).json({
        success: true,
        segment
      });
    } catch (error) {
      logger.error('Failed to create CRM segment', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create segment'
      });
    }
  });

  /**
   * GET /api/crm/segments/:id/profiles
   * Get profiles in a segment
   */
  router.get('/segments/:id/profiles', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Query Lead Twin for segment profiles
      const profiles = await twinSync.getLeadTwinsBySegment(id);

      res.json({
        success: true,
        segmentId: id,
        profiles,
        count: profiles.length
      });
    } catch (error) {
      logger.error('Failed to get CRM segment profiles', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get segment profiles'
      });
    }
  });

  /**
   * POST /api/crm/bulk-sync
   * Bulk sync profiles
   */
  router.post('/bulk-sync', async (req: Request, res: Response) => {
    try {
      const { profiles } = req.body;

      const results = await Promise.all(
        profiles.map(async (profile: any) => {
          try {
            const leadTwin = await twinSync.syncToLeadTwin({
              sourceId: profile.id,
              source: 'crm-hub',
              profile
            });
            return { id: profile.id, success: true, twinId: leadTwin?.id };
          } catch (err) {
            return { id: profile.id, success: false, error: String(err) };
          }
        })
      );

      logger.info('CRM bulk sync completed', {
        total: profiles.length,
        successful: results.filter((r: any) => r.success).length
      });

      res.json({
        success: true,
        results,
        summary: {
          total: profiles.length,
          successful: results.filter((r: any) => r.success).length,
          failed: results.filter((r: any) => !r.success).length
        }
      });
    } catch (error) {
      logger.error('Failed to bulk sync CRM profiles', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to bulk sync profiles'
      });
    }
  });

  return router;
}
