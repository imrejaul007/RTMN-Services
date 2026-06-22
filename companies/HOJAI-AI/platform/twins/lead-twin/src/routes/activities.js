/**
 * RTMN Lead Twin - Activities Router v2.0
 * Activity tracking with security fixes and pagination
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  sanitizeObject,
  preventPrototypePollution,
  sanitizeSearchInput,
  logger,
  publishAsync
} from '@rtmn/twinos-shared';
import { PAGINATION } from '@rtmn/twinos-shared';
import { activities, leads } from '../services/store.js';

const router = Router();

// ============ CONSTANTS ============

// Allowed activity types
const VALID_ACTIVITY_TYPES = [
  'email',
  'call',
  'meeting',
  'note',
  'task',
  'demo',
  'proposal',
  'contract',
  'payment',
  'support',
  'other'
];

// Allowed fields for activity creation
const ALLOWED_CREATE_FIELDS = [
  'leadId',
  'type',
  'description',
  'outcome',
  'duration',
  'participants',
  'metadata'
];

// ============ HELPER FUNCTIONS ============

/**
 * Get pagination parameters
 */
function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(Math.max(1, parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT), PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Check if activity belongs to a lead owned by user's business
 */
function isActivityAccessible(activity, user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'superadmin') return true;

  // Get the lead to check business scope
  const lead = leads.get(activity.leadId);
  if (!lead) return true; // Allow if lead doesn't exist (might be orphaned)

  if (!lead.businessId) return true; // No business assigned, allow access
  return lead.businessId === user.businessId;
}

// ============ ROUTES ============

/**
 * GET /activities - List activities with filtering and pagination
 */
router.get('/', (req, res, next) => {
  try {
    const { leadId, type, page, limit, sortOrder } = req.query;

    // Get pagination
    const { page: currentPage, limit: pageLimit, skip } = getPagination(req.query);

    // Sort direction
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    let results = Array.from(activities.values());

    // Filter by leadId
    if (leadId) {
      results = results.filter(a => a.leadId === leadId);
    }

    // Filter by type
    if (type) {
      if (!VALID_ACTIVITY_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid activity type. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`
          }
        });
      }
      results = results.filter(a => a.type === type);
    }

    // Sort by timestamp descending (newest first) by default
    results.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return (dateB - dateA) * sortDir;
    });

    // Calculate pagination
    const total = results.length;
    const totalPages = Math.ceil(total / pageLimit);
    const paginatedResults = results.slice(skip, skip + pageLimit);

    logger.info('Activities listed', {
      userId: req.user?.id,
      filters: { leadId, type },
      pagination: { page: currentPage, limit: pageLimit },
      total,
      requestId: req.id
    });

    res.json({
      success: true,
      data: paginatedResults,
      twin: {
        activities: paginatedResults,
        pagination: {
          page: currentPage,
          limit: pageLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1
        }
      },
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /activities/:id - Get single activity
 */
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const activity = activities.get(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Activity not found'
        }
      });
    }

    // Check access
    if (!isActivityAccessible(activity, req.user)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BUSINESS_SCOPE',
          message: 'Access denied to this activity'
        }
      });
    }

    logger.info('Activity retrieved', {
      activityId: id,
      userId: req.user?.id,
      requestId: req.id
    });

    res.json({
      success: true,
      twin: activity,
      data: activity
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /activities - Create new activity
 */
router.post('/', async (req, res, next) => {
  try {
    // Prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);

    // Whitelist allowed fields
    const { leadId, type, description, outcome, duration, participants, metadata } = sanitizeObject(sanitizedBody, ALLOWED_CREATE_FIELDS);

    // Validate required fields
    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'leadId is required'
        }
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'type is required'
        }
      });
    }

    // Validate type
    if (!VALID_ACTIVITY_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid activity type. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`
        }
      });
    }

    // Validate duration if provided
    if (duration !== undefined) {
      const durationNum = parseInt(duration);
      if (isNaN(durationNum) || durationNum < 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Duration must be a positive number (in minutes)'
          }
        });
      }
    }

    // Validate participants if provided
    if (participants !== undefined && !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Participants must be an array'
        }
      });
    }

    // Sanitize description
    const sanitizedDescription = description ? sanitizeSearchInput(description) : null;

    const id = `act_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const activity = {
      id,
      leadId,
      type,
      description: sanitizedDescription,
      outcome: outcome || null,
      duration: duration ? parseInt(duration) : null,
      participants: Array.isArray(participants) ? participants : [],
      metadata: typeof metadata === 'object' ? metadata : {},
      businessId: req.user?.businessId || null,
      createdBy: req.user?.id || null,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await activities.set(id, activity);

    // Platform integration: publish activity-created event
    publishAsync('lead.activity.created', { id, leadId, type: activity.type });

    logger.info('Activity created', {
      activityId: id,
      leadId,
      userId: req.user?.id,
      businessId: req.user?.businessId,
      requestId: req.id
    });

    res.status(201).json({
      success: true,
      twin: activity,
      data: activity
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /activities/lead/:leadId - Get all activities for a lead
 */
router.get('/lead/:leadId', (req, res, next) => {
  try {
    const { leadId } = req.params;
    const { page, limit, sortOrder } = req.query;

    // Get pagination
    const { page: currentPage, limit: pageLimit, skip } = getPagination(req.query);

    // Sort direction
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    let results = Array.from(activities.values()).filter(a => a.leadId === leadId);

    // Sort by timestamp
    results.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return (dateB - dateA) * sortDir;
    });

    // Calculate pagination
    const total = results.length;
    const totalPages = Math.ceil(total / pageLimit);
    const paginatedResults = results.slice(skip, skip + pageLimit);

    logger.info('Lead activities retrieved', {
      leadId,
      userId: req.user?.id,
      pagination: { page: currentPage, limit: pageLimit },
      total,
      requestId: req.id
    });

    res.json({
      success: true,
      data: paginatedResults,
      twin: {
        activities: paginatedResults,
        pagination: {
          page: currentPage,
          limit: pageLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1
        }
      },
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /activities/stats/summary - Get activity statistics
 */
router.get('/stats/summary', (req, res, next) => {
  try {
    const { leadId, startDate, endDate } = req.query;

    let results = Array.from(activities.values());

    // Filter by leadId if provided
    if (leadId) {
      results = results.filter(a => a.leadId === leadId);
    }

    // Filter by date range if provided
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        results = results.filter(a => new Date(a.timestamp) >= start);
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        results = results.filter(a => new Date(a.timestamp) <= end);
      }
    }

    // Calculate statistics
    const stats = {
      total: results.length,
      byType: {},
      recentActivity: [],
      totalDuration: 0
    };

    // Count by type
    results.forEach(a => {
      stats.byType[a.type] = (stats.byType[a.type] || 0) + 1;
      if (a.duration) {
        stats.totalDuration += a.duration;
      }
    });

    // Get 5 most recent activities
    stats.recentActivity = [...results]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        leadId: a.leadId,
        type: a.type,
        timestamp: a.timestamp
      }));

    logger.info('Activity stats retrieved', {
      userId: req.user?.id,
      filters: { leadId, startDate, endDate },
      total: results.length,
      requestId: req.id
    });

    res.json({
      success: true,
      twin: { statistics: stats },
      data: { statistics: stats }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
