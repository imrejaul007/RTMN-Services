/**
 * CorpID Cloud - Consumer Identity Routes
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../../shared/utils/logger.js';
import {
  consumers,
  consumerWallets,
  consumerSubscriptions,
  consumerActivity,
  createConsumer,
  getConsumerById,
  getConsumerByUserId,
  getConsumerByEmail,
  getConsumerWallet,
  getConsumerSubscriptions,
  updateConsumer,
  updatePreferences,
  connectAccount,
  disconnectAccount,
  recordActivity,
  requestDataExport,
  requestDeletion
} from '../models/consumer.model.js';

const router = express.Router();

/**
 * Create consumer profile
 * POST /api/consumers
 */
router.post('/',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const existing = getConsumerByUserId(req.user.id);
    if (existing) {
      throw new AppError('Consumer profile already exists', 409, 'CONSUMER_EXISTS');
    }

    const consumer = createConsumer({
      ...req.body,
      userId: req.user.id,
      email: req.user.email
    });

    dataAudit('consumer.created', req, 'consumer', consumer.id);

    res.status(201).json({
      success: true,
      message: 'Consumer profile created',
      consumer
    });
  })
);

/**
 * Get current consumer profile
 * GET /api/consumers/me
 */
router.get('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer) {
      throw new AppError('Consumer profile not found', 404, 'CONSUMER_NOT_FOUND');
    }

    const wallet = getConsumerWallet(consumer.id);
    const subscriptions = getConsumerSubscriptions(consumer.id);

    res.json({
      success: true,
      consumer,
      wallet,
      subscriptions
    });
  })
);

/**
 * Get consumer by ID
 * GET /api/consumers/:id
 *
 * SECURITY FIX (C-9): Added ownership check. Consumers can only view
 * their own profile unless they are admin/superadmin.
 */
router.get('/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerById(req.params.id);
    if (!consumer) {
      throw new AppError('Consumer not found', 404, 'CONSUMER_NOT_FOUND');
    }

    // Ownership check: a consumer can only read their own profile.
    // Admins/superadmins can read any.
    const isAdmin = req.user.role === 'superadmin' ||
                    req.user.role === 'admin' ||
                    req.user.role === 'org-admin' ||
                    req.user.role === 'org-owner';
    if (!isAdmin && consumer.userId !== req.user.id) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    res.json({ success: true, consumer });
  })
);

/**
 * Update consumer profile
 * PUT /api/consumers/me
 */
router.put('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer) {
      throw new AppError('Consumer profile not found', 404, 'CONSUMER_NOT_FOUND');
    }

    const updated = updateConsumer(consumer.id, req.body);

    dataAudit('consumer.updated', req, 'consumer', consumer.id);

    res.json({
      success: true,
      message: 'Consumer profile updated',
      consumer: updated
    });
  })
);

/**
 * Update preferences
 * PUT /api/consumers/me/preferences
 */
router.put('/me/preferences',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer) {
      throw new AppError('Consumer profile not found', 404, 'CONSUMER_NOT_FOUND');
    }

    const updated = updatePreferences(consumer.id, req.body);

    dataAudit('consumer.preferences_updated', req, 'consumer', consumer.id);

    res.json({
      success: true,
      message: 'Preferences updated',
      preferences: updated.preferences
    });
  })
);

/**
 * Connect external account
 * POST /api/consumers/me/accounts
 */
router.post('/me/accounts',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { provider, providerId, permissions } = req.body;
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer) {
      throw new AppError('Consumer profile not found', 404, 'CONSUMER_NOT_FOUND');
    }

    if (!provider || !providerId) {
      throw new AppError('Provider and providerId are required', 400, 'VALIDATION_ERROR');
    }

    const updated = connectAccount(consumer.id, provider, providerId, permissions);

    dataAudit('consumer.account_connected', req, 'consumer', consumer.id, { provider });

    res.json({
      success: true,
      message: 'Account connected',
      connectedAccounts: updated.connectedAccounts
    });
  })
);

/**
 * Disconnect account
 * DELETE /api/consumers/me/accounts/:provider
 */
router.delete('/me/accounts/:provider',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer) {
      throw new AppError('Consumer profile not found', 404, 'CONSUMER_NOT_FOUND');
    }

    const updated = disconnectAccount(consumer.id, req.params.provider);

    dataAudit('consumer.account_disconnected', req, 'consumer', consumer.id, { provider: req.params.provider });

    res.json({
      success: true,
      message: 'Account disconnected',
      connectedAccounts: updated.connectedAccounts
    });
  })
);

/**
 * Enable Genie
 * POST /api/consumers/me/genie/enable
 */
router.post('/me/genie/enable',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer) {
      throw new AppError('Consumer profile not found', 404, 'CONSUMER_NOT_FOUND');
    }

    consumer.genieProfile = {
      voiceEnabled: true,
      wakeWord: req.body.wakeWord || 'Hey Genie',
      listeningMode: req.body.listeningMode || 'smart',
      accent: req.body.accent || consumer.preferences.language || 'en-IN',
      language: req.body.language || consumer.preferences.language || 'en',
      voiceId: req.body.voiceId || null,
      personalitiesEnabled: req.body.personalitiesEnabled || []
    };
    consumer.updatedAt = new Date().toISOString();
    consumers.set(consumer.id, consumer);

    dataAudit('consumer.genie_enabled', req, 'consumer', consumer.id);

    res.json({
      success: true,
      message: 'Genie enabled',
      genieProfile: consumer.genieProfile
    });
  })
);

/**
 * Update Genie settings
 * PUT /api/consumers/me/genie
 */
router.put('/me/genie',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer || !consumer.genieProfile) {
      throw new AppError('Genie not enabled', 404, 'GENIE_NOT_ENABLED');
    }

    consumer.genieProfile = { ...consumer.genieProfile, ...req.body };
    consumer.updatedAt = new Date().toISOString();
    consumers.set(consumer.id, consumer);

    res.json({
      success: true,
      message: 'Genie settings updated',
      genieProfile: consumer.genieProfile
    });
  })
);

/**
 * Link REZ profile
 * POST /api/consumers/me/rez/link
 */
router.post('/me/rez/link',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer) {
      throw new AppError('Consumer profile not found', 404, 'CONSUMER_NOT_FOUND');
    }

    consumer.rezProfile = {
      customerId: req.body.customerId || `rez-${Date.now()}`,
      tier: req.body.tier || 'bronze',
      points: req.body.points || 0,
      lifetimeValue: req.body.lifetimeValue || 0,
      joinedAt: new Date().toISOString(),
      referralCode: consumer.rezProfile?.referralCode || Math.random().toString(36).substring(2, 10).toUpperCase(),
      referredBy: req.body.referredBy || null
    };
    consumer.updatedAt = new Date().toISOString();
    consumers.set(consumer.id, consumer);

    dataAudit('consumer.rez_linked', req, 'consumer', consumer.id);

    res.json({
      success: true,
      message: 'REZ profile linked',
      rezProfile: consumer.rezProfile
    });
  })
);

/**
 * Record activity (for tracking)
 * POST /api/consumers/me/activity
 */
router.post('/me/activity',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer) {
      throw new AppError('Consumer profile not found', 404, 'CONSUMER_NOT_FOUND');
    }

    const entry = recordActivity(consumer.id, req.body);

    res.json({
      success: true,
      message: 'Activity recorded',
      activity: entry
    });
  })
);

/**
 * Get activity timeline
 * GET /api/consumers/me/activity
 */
router.get('/me/activity',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer) {
      throw new AppError('Consumer profile not found', 404, 'CONSUMER_NOT_FOUND');
    }

    const { limit = 50, type } = req.query;
    let activities = consumerActivity
      .filter(a => a.consumerId === consumer.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (type) {
      activities = activities.filter(a => a.type === type);
    }

    activities = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      count: activities.length,
      activities
    });
  })
);

/**
 * Request data export (GDPR)
 * POST /api/consumers/me/export
 */
router.post('/me/export',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer) {
      throw new AppError('Consumer profile not found', 404, 'CONSUMER_NOT_FOUND');
    }

    const result = requestDataExport(consumer.id);

    dataAudit('consumer.data_export_requested', req, 'consumer', consumer.id);

    res.json({
      success: true,
      ...result
    });
  })
);

/**
 * Request account deletion (GDPR)
 * POST /api/consumers/me/delete
 */
router.post('/me/delete',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consumer = getConsumerByUserId(req.user.id);
    if (!consumer) {
      throw new AppError('Consumer profile not found', 404, 'CONSUMER_NOT_FOUND');
    }

    const result = requestDeletion(consumer.id);

    dataAudit('consumer.deletion_requested', req, 'consumer', consumer.id);

    res.json({
      success: true,
      ...result
    });
  })
);

/**
 * List all consumers (admin only)
 * GET /api/consumers
 */
router.get('/',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { status, tier, segment, page = 1, limit = 20 } = req.query;
    let allConsumers = Array.from(consumers.values());

    if (status) allConsumers = allConsumers.filter(c => c.status === status);
    if (tier) allConsumers = allConsumers.filter(c => c.rezProfile?.tier === tier);
    if (segment) allConsumers = allConsumers.filter(c => c.segments.includes(segment));

    const start = (page - 1) * limit;
    const paginated = allConsumers.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      count: allConsumers.length,
      page: parseInt(page),
      limit: parseInt(limit),
      consumers: paginated.map(c => ({
        id: c.id,
        displayName: c.displayName,
        email: c.email,
        tier: c.rezProfile?.tier,
        status: c.status,
        createdAt: c.createdAt
      }))
    });
  })
);

export default router;
