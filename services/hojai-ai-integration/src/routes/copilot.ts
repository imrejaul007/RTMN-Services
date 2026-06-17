import { Router, Request, Response } from 'express';
import { hojaiProfileModel, HojaiProduct, SupportContext } from '../models/HojaiProfile';
import { getBridge } from '../services/customerOpsBridge';
import { getTwinSync } from '../services/twinSync';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const router = Router();

router.post('/profiles', async (req: Request, res: Response) => {
  try {
    const { tenantId, hojaiUserId, products, preferences } = req.body;

    if (!tenantId || !hojaiUserId) {
      return res.status(400).json({ error: 'tenantId and hojaiUserId are required' });
    }

    const existing = hojaiProfileModel.getProfileByTenantAndUser(tenantId, hojaiUserId);
    if (existing) {
      return res.status(409).json({ error: 'Profile already exists', profile: existing });
    }

    const profile = hojaiProfileModel.createProfile({
      tenantId,
      hojaiUserId,
      products: products || [HojaiProduct.COPILOT],
      preferences
    });

    const bridge = getBridge();
    const twinSync = getTwinSync();

    bridge.syncUserToCustomerTwin(profile).catch(err =>
      logger.error('Customer Twin sync failed', { error: err.message })
    );

    twinSync.syncProfileToAgentTwin(profile).catch(err =>
      logger.error('Agent Twin sync failed', { error: err.message })
    );

    res.status(201).json({ profile });
  } catch (error: any) {
    logger.error('Create copilot profile error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/support/context', async (req: Request, res: Response) => {
  try {
    const { tenantId, customerId, issueType, priority, summary, suggestedActions } = req.body;

    if (!tenantId || !customerId) {
      return res.status(400).json({ error: 'tenantId and customerId are required' });
    }

    const context: SupportContext = {
      tenantId,
      customerId,
      issueType,
      priority: priority || 'medium',
      summary,
      suggestedActions
    };

    const bridge = getBridge();
    const result = await bridge.createSupportContext(context);

    res.status(201).json({
      context,
      result
    });
  } catch (error: any) {
    logger.error('Create support context error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/assist', async (req: Request, res: Response) => {
  try {
    const { tenantId, customerId, query, context, priority } = req.body;

    if (!tenantId || !customerId || !query) {
      return res.status(400).json({ error: 'tenantId, customerId, and query are required' });
    }

    const bridge = getBridge();
    const twinSync = getTwinSync();

    const customerContext = await bridge.getCustomerContext(tenantId, customerId).catch(() => null);

    const supportContext: SupportContext = {
      tenantId,
      customerId,
      issueType: 'copilot-query',
      priority: priority || 'medium',
      summary: query,
      suggestedActions: []
    };

    const result = await bridge.createSupportContext(supportContext);

    if (customerContext?.twinId) {
      twinSync.getTwinStatus(tenantId, customerContext.twinId, 'buyer').catch(err =>
        logger.error('Twin status check failed', { error: err.message })
      );
    }

    res.json({
      response: {
        answer: `Copilot processing query: "${query}"`,
        context: customerContext,
        supportContext: supportContext,
        suggestions: [
          'Review customer history',
          'Check related tickets',
          'Escalate if needed'
        ]
      },
      syncResult: result
    });
  } catch (error: any) {
    logger.error('Copilot assist error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    const { tenantId, customerId, recommendationsFor } = req.body;

    if (!tenantId || !customerId) {
      return res.status(400).json({ error: 'tenantId and customerId are required' });
    }

    const bridge = getBridge();
    const customerContext = await bridge.getCustomerContext(tenantId, customerId).catch(() => null);

    const recommendations: Record<string, string[]> = {
      products: [],
      actions: [],
      outreach: []
    };

    if (customerContext?.trustLevel) {
      recommendations.products.push(`${customerContext.trustLevel} tier products available`);
    }

    if (customerContext?.buyingHistory?.length > 0) {
      recommendations.products.push('Complementary products based on purchase history');
    }

    recommendations.actions.push('Send personalized email');
    recommendations.actions.push('Schedule follow-up call');
    recommendations.outreach.push('Thank you message');
    recommendations.outreach.push('Product update notification');

    res.json({
      customerId,
      recommendationsFor: recommendationsFor || 'general',
      recommendations,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Generate recommendations error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/analytics/sync', async (req: Request, res: Response) => {
  try {
    const { tenantId, customerId, analyticsData } = req.body;

    if (!tenantId || !customerId) {
      return res.status(400).json({ error: 'tenantId and customerId are required' });
    }

    const bridge = getBridge();
    const twinSync = getTwinSync();

    const trustLevel = hojaiProfileModel.getProfileByTenantAndUser(tenantId, customerId)?.trustLevel;

    if (trustLevel) {
      await bridge.syncTrustToTrustIntelligence(
        tenantId,
        customerId,
        trustLevel,
        analyticsData
      );
    }

    res.json({
      synced: true,
      tenantId,
      customerId,
      analyticsData,
      syncedAt: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Analytics sync error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/profiles/:profileId', async (req: Request, res: Response) => {
  try {
    const profile = hojaiProfileModel.getProfile(req.params.profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({ profile });
  } catch (error: any) {
    logger.error('Get copilot profile error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/profiles', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const profiles = tenantId
      ? hojaiProfileModel.getProfilesByTenant(tenantId as string)
      : hojaiProfileModel.getAllProfiles();
    res.json({ profiles, count: profiles.length });
  } catch (error: any) {
    logger.error('List copilot profiles error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/integrate/:profileId', async (req: Request, res: Response) => {
  try {
    const { externalId } = req.body;

    const profile = hojaiProfileModel.activateIntegration(
      req.params.profileId,
      HojaiProduct.COPILOT,
      externalId
    );

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const bridge = getBridge();
    const twinSync = getTwinSync();

    bridge.syncUserToCustomerTwin(profile).catch(err =>
      logger.error('Customer Twin sync failed', { error: err.message })
    );

    twinSync.syncProfileToBuyerTwin(profile, { copilotEnabled: true }).catch(err =>
      logger.error('Buyer Twin sync failed', { error: err.message })
    );

    res.json({ profile, integrationActivated: 'copilot' });
  } catch (error: any) {
    logger.error('Copilot integration error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/health', async (req: Request, res: Response) => {
  try {
    const bridge = getBridge();
    const twinSync = getTwinSync();

    const [bridgeHealth, twinHealth] = await Promise.all([
      bridge.healthCheck(),
      twinSync.healthCheck()
    ]);

    const allHealthy = bridgeHealth.status === 'healthy' && twinHealth.status === 'healthy';

    res.json({
      service: 'hojai-copilot',
      status: allHealthy ? 'healthy' : 'degraded',
      bridge: bridgeHealth,
      twinSync: twinHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      service: 'hojai-copilot',
      status: 'error',
      error: error.message
    });
  }
});

export default router;
