/**
 * CorpID Cloud - Audit Routes
 * Express routes for audit log querying
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../shared/middleware/error-handler.js';
import {
  queryAuditEvents,
  getAuditEventById,
  getUserAuditTrail,
  getResourceAuditTrail,
  getAuditStats,
  createAuditExport,
  getExportById
} from '../models/audit.model.js';

const router = express.Router();

/**
 * Query audit events
 * GET /api/audit/events
 */
router.get('/events',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const {
      actorId,
      actorEmail,
      organizationId,
      action,
      category,
      resourceType,
      resourceId,
      result,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const events = queryAuditEvents({
      actorId,
      actorEmail,
      organizationId: organizationId || req.user.organizationId,
      action,
      category,
      resourceType,
      resourceId,
      result,
      startDate,
      endDate
    });

    const start = (page - 1) * limit;
    const paginatedEvents = events.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      count: events.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(events.length / limit),
      events: paginatedEvents
    });
  })
);

/**
 * Get audit event by ID
 * GET /api/audit/events/:id
 */
router.get('/events/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const event = getAuditEventById(req.params.id);

    if (!event) {
      throw new AppError('Audit event not found', 404, 'EVENT_NOT_FOUND');
    }

    res.json({
      success: true,
      event
    });
  })
);

/**
 * Get user's audit trail
 * GET /api/audit/user/:userId
 */
router.get('/user/:userId',
  requireAuth(),
  asyncHandler(async (req, res) => {
    // Users can only see their own trail unless admin
    if (req.user.id !== req.params.userId && req.user.role !== 'superadmin' && req.user.role !== 'org-admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const { limit = 50, startDate, endDate } = req.query;
    const events = getUserAuditTrail(req.params.userId, { startDate, endDate })
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      userId: req.params.userId,
      count: events.length,
      events
    });
  })
);

/**
 * Get resource audit trail
 * GET /api/audit/resource/:type/:id
 */
router.get('/resource/:type/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;
    const events = getResourceAuditTrail(req.params.type, req.params.id)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      resourceType: req.params.type,
      resourceId: req.params.id,
      count: events.length,
      events
    });
  })
);

/**
 * Get audit statistics
 * GET /api/audit/stats
 */
router.get('/stats',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { organizationId, startDate, endDate } = req.query;
    const stats = getAuditStats({
      organizationId: organizationId || req.user.organizationId,
      startDate,
      endDate
    });

    res.json({
      success: true,
      stats
    });
  })
);

/**
 * Export audit events
 * POST /api/audit/export
 */
router.post('/export',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { filters, format } = req.body;

    const result = createAuditExport({
      requestedBy: req.user.id,
      filters: {
        ...filters,
        organizationId: filters?.organizationId || req.user.organizationId
      },
      format: format || 'json'
    });

    res.status(201).json({
      success: true,
      message: 'Audit export created',
      export: result.export,
      events: result.events.slice(0, 100) // Return first 100 for preview
    });
  })
);

/**
 * Get export by ID
 * GET /api/audit/export/:id
 */
router.get('/export/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const exportRecord = getExportById(req.params.id);

    if (!exportRecord) {
      throw new AppError('Export not found', 404, 'EXPORT_NOT_FOUND');
    }

    res.json({
      success: true,
      export: exportRecord
    });
  })
);

export default router;
