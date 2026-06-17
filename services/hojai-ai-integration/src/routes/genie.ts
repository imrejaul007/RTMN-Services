import { Router, Request, Response } from 'express';
import { hojaiProfileModel, HojaiProduct, ConversationMemory } from '../models/HojaiProfile';
import { getBridge } from '../services/customerOpsBridge';
import { getTwinSync } from '../services/twinSync';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

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
      products: products || [HojaiProduct.GENIE],
      preferences
    });

    const bridge = getBridge();
    const twinSync = getTwinSync();

    bridge.syncUserToCustomerTwin(profile).catch(err =>
      logger.error('Background sync failed', { error: err.message })
    );

    twinSync.syncProfileToAgentTwin(profile).catch(err =>
      logger.error('Agent Twin sync failed', { error: err.message })
    );

    res.status(201).json({ profile });
  } catch (error: any) {
    logger.error('Create profile error', { error: error.message });
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
    logger.error('Get profile error', { error: error.message });
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
    logger.error('List profiles error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/profiles/:profileId', async (req: Request, res: Response) => {
  try {
    const { products, trustLevel, preferences } = req.body;
    const updated = hojaiProfileModel.updateProfile(req.params.profileId, {
      products,
      trustLevel,
      preferences
    });

    if (!updated) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (trustLevel) {
      const bridge = getBridge();
      bridge.syncTrustToTrustIntelligence(
        updated.tenantId,
        updated.hojaiUserId,
        trustLevel
      ).catch(err => logger.error('Trust sync failed', { error: err.message }));
    }

    res.json({ profile: updated });
  } catch (error: any) {
    logger.error('Update profile error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const { tenantId, conversationId, initialMessage } = req.body;

    if (!tenantId || !conversationId) {
      return res.status(400).json({ error: 'tenantId and conversationId are required' });
    }

    const conversation = hojaiProfileModel.createConversation(tenantId, conversationId, initialMessage);

    const bridge = getBridge();
    const twinSync = getTwinSync();

    if (initialMessage) {
      bridge.syncConversationToMemory(tenantId, conversationId, [{
        role: 'user',
        content: initialMessage,
        timestamp: new Date()
      }]).catch(err => logger.error('Memory sync failed', { error: err.message }));
    }

    twinSync.syncConversationToAreaTwin(tenantId, conversation).catch(err =>
      logger.error('Area Twin sync failed', { error: err.message })
    );

    res.status(201).json({ conversation });
  } catch (error: any) {
    logger.error('Create conversation error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/conversations/:conversationId', async (req: Request, res: Response) => {
  try {
    const conversation = hojaiProfileModel.getConversation(req.params.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation });
  } catch (error: any) {
    logger.error('Get conversation error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/conversations/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const { role, content, metadata } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: 'role and content are required' });
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return res.status(400).json({ error: 'role must be user, assistant, or system' });
    }

    const conversation = hojaiProfileModel.addMessage(
      req.params.conversationId,
      role,
      content,
      metadata
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const bridge = getBridge();
    bridge.syncConversationToMemory(
      conversation.tenantId,
      conversation.conversationId,
      conversation.messages.slice(-5)
    ).catch(err => logger.error('Memory sync failed', { error: err.message }));

    res.status(201).json({
      message: conversation.messages[conversation.messages.length - 1],
      conversationId: conversation.id
    });
  } catch (error: any) {
    logger.error('Add message error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/conversations/:conversationId/context', async (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    const conversation = hojaiProfileModel.getConversation(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.context = { ...conversation.context, ...context };
    conversation.updatedAt = new Date();

    res.json({ conversation });
  } catch (error: any) {
    logger.error('Update context error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/integrate/:profileId', async (req: Request, res: Response) => {
  try {
    const { product, externalId } = req.body;

    if (!product) {
      return res.status(400).json({ error: 'product is required' });
    }

    const profile = hojaiProfileModel.activateIntegration(
      req.params.profileId,
      product as HojaiProduct,
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

    twinSync.syncProfileToAgentTwin(profile).catch(err =>
      logger.error('Agent Twin sync failed', { error: err.message })
    );

    res.json({ profile, integrationActivated: product });
  } catch (error: any) {
    logger.error('Integration activation error', { error: error.message });
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
      service: 'hojai-genie',
      status: allHealthy ? 'healthy' : 'degraded',
      bridge: bridgeHealth,
      twinSync: twinHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      service: 'hojai-genie',
      status: 'error',
      error: error.message
    });
  }
});

export default router;
