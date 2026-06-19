/**
 * CorpID Cloud - Universal Profile Routes
 */

import express from 'express';
import { requireAuth } from '../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../shared/utils/logger.js';
import {
  universalProfiles,
  BADGES,
  buildUniversalProfile,
  getUniversalProfile,
  refreshProfile,
  updatePrivacy,
  addBadge,
  updateConnectionCount
} from '../models/universal.model.js';

const router = express.Router();

/**
 * Get available badges
 * GET /api/universal/badges
 */
router.get('/badges',
  requireAuth(),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      badges: BADGES
    });
  })
);

/**
 * Get my universal profile
 * GET /api/universal/me
 */
router.get('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const profile = getUniversalProfile(req.user.id);
    res.json({ success: true, profile });
  })
);

/**
 * Refresh my universal profile
 * POST /api/universal/me/refresh
 */
router.post('/me/refresh',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const existing = universalProfiles.get(req.user.id) || buildUniversalProfile(req.user.id);
    const refreshed = refreshProfile(existing);

    dataAudit('universal.profile_refreshed', req, 'universal_profile', req.user.id);

    res.json({
      success: true,
      message: 'Profile refreshed',
      profile: refreshed
    });
  })
);

/**
 * Get universal profile by user ID
 * GET /api/universal/user/:userId
 */
router.get('/user/:userId',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const profile = getUniversalProfile(req.params.userId);

    if (!profile) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    // Filter based on privacy settings
    const filtered = filterByPrivacy(profile, profile.privacy);

    res.json({ success: true, profile: filtered });
  })
);

/**
 * Update privacy settings
 * PUT /api/universal/me/privacy
 */
router.put('/me/privacy',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const updated = updatePrivacy(req.user.id, req.body);

    dataAudit('universal.privacy_updated', req, 'universal_profile', req.user.id);

    res.json({
      success: true,
      message: 'Privacy settings updated',
      privacy: updated.privacy
    });
  })
);

/**
 * Add badge (admin only)
 * POST /api/universal/user/:userId/badges
 */
router.post('/user/:userId/badges',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { type } = req.body;

    if (!type || !BADGES[type]) {
      throw new AppError('Invalid badge type', 400, 'INVALID_BADGE');
    }

    const updated = addBadge(req.params.userId, type);

    dataAudit('universal.badge_added', req, 'universal_profile', req.params.userId, { badge: type });

    res.json({
      success: true,
      message: 'Badge added',
      badges: updated.badges
    });
  })
);

/**
 * Update connection count
 * PUT /api/universal/me/connections
 */
router.put('/me/connections',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { type, count } = req.body;

    if (!type || typeof count !== 'number') {
      throw new AppError('Type and count are required', 400, 'VALIDATION_ERROR');
    }

    const updated = updateConnectionCount(req.user.id, type, count);

    res.json({
      success: true,
      connections: updated.connections
    });
  })
);

/**
 * Get profile stats
 * GET /api/universal/me/stats
 */
router.get('/me/stats',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const profile = getUniversalProfile(req.user.id);

    res.json({
      success: true,
      stats: {
        ...profile.aggregatedStats,
        ...profile.connections,
        platformCount: Object.values(profile.platformProfiles).filter(Boolean).length,
        badgeCount: profile.badges.length,
        lastAggregatedAt: profile.lastAggregatedAt
      }
    });
  })
);

// ============ HELPER ============

function filterByPrivacy(profile, privacy) {
  const filtered = { ...profile };

  if (!privacy.showEmail) {
    filtered.contact.primaryEmail = null;
  }
  if (!privacy.showPhone) {
    filtered.contact.phones = [];
  }
  if (!privacy.showStats) {
    filtered.aggregatedStats = {};
  }
  if (!privacy.showActivity) {
    delete filtered.platformProfiles;
  }

  return filtered;
}

export default router;
