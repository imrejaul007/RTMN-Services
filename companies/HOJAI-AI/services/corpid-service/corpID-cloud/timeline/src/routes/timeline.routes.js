/**
 * CorpID Cloud - Identity Timeline Routes
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../shared/middleware/error-handler.js';
import {
  timelineEvents,
  TIMELINE_CATEGORIES,
  EVENT_TYPES,
  recordEvent,
  getUserTimeline,
  getEventById,
  getTimelineStats,
  getRecentActivity,
  searchTimeline
} from '../models/timeline.model.js';

const router = express.Router();

/**
 * Get available event types
 * GET /api/timeline/types
 */
router.get('/types',
  requireAuth(),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      categories: TIMELINE_CATEGORIES,
      eventTypes: EVENT_TYPES
    });
  })
);

/**
 * Get my timeline
 * GET /api/timeline/me
 */
router.get('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { category, type, startDate, endDate, limit = 50 } = req.query;
    const events = getUserTimeline(req.user.id, {
      category, type, startDate, endDate, limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: events.length,
      events
    });
  })
);

/**
 * Get recent activity
 * GET /api/timeline/me/recent
 */
router.get('/me/recent',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const events = getRecentActivity(req.user.id, parseInt(limit));

    res.json({
      success: true,
      count: events.length,
      events
    });
  })
);

/**
 * Get my timeline stats
 * GET /api/timeline/me/stats
 */
router.get('/me/stats',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const stats = getTimelineStats(req.user.id, { startDate, endDate });

    res.json({ success: true, stats });
  })
);

/**
 * Search my timeline
 * GET /api/timeline/me/search
 */
router.get('/me/search',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { q, category, limit = 50 } = req.query;
    const events = searchTimeline(req.user.id, q, { category })
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      count: events.length,
      events
    });
  })
);

/**
 * Get specific event
 * GET /api/timeline/me/events/:id
 */
router.get('/me/events/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const event = getEventById(req.params.id);
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    if (event.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    res.json({ success: true, event });
  })
);

/**
 * Record timeline event (internal use)
 * POST /api/timeline/me/events
 */
router.post('/me/events',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const event = recordEvent({
      ...req.body,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Event recorded',
      event
    });
  })
);

/**
 * Get user timeline (admin only)
 * GET /api/timeline/user/:userId
 */
router.get('/user/:userId',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { category, type, limit = 50 } = req.query;
    const events = getUserTimeline(req.params.userId, {
      category, type, limit: parseInt(limit)
    });

    res.json({
      success: true,
      userId: req.params.userId,
      count: events.length,
      events
    });
  })
);

/**
 * Get timeline stats (admin only)
 * GET /api/timeline/stats
 */
router.get('/stats',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const events = timelineEvents;
    const byCategory = {};
    const byType = {};

    for (const event of events) {
      byCategory[event.category] = (byCategory[event.category] || 0) + 1;
      byType[event.type] = (byType[event.type] || 0) + 1;
    }

    res.json({
      success: true,
      stats: {
        totalEvents: events.length,
        byCategory,
        byType,
        uniqueUsers: new Set(events.map(e => e.userId)).size
      }
    });
  })
);

export default router;
