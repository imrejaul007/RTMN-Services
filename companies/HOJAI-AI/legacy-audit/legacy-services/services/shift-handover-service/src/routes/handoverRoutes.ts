import { Router, Request, Response, NextFunction } from 'express';
import { handoverService } from '../services/handoverService';
import { templateService } from '../services/templateService';
import { archiveService } from '../services/archiveService';
import { notificationService } from '../services/notificationService';
import { validateRequest, validateHandoverInput, validatePatientInput, validateTaskInput, validateAlertInput } from '../middleware/validation';
import { logger } from '../utils/logger';
import { HandoverStatus, AlertType } from '../models/handover';

const router = Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Resource not found',
    path: req.path
  });
};

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error in handover routes:`, err);

  if (err.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: err.message
    });
  }

  if (err.message.includes('already') || err.message.includes('Cannot')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// ============================================================================
// HANDOVER ROUTES
// ============================================================================

/**
 * POST /handovers
 * Create a new handover
 */
router.post(
  '/handovers',
  validateHandoverInput,
  asyncHandler(async (req: Request, res: Response) => {
    const handover = await handoverService.createHandover(req.body);

    // Notify incoming staff if assigned
    if (handover.incomingStaffId) {
      await notificationService.notifyIncomingStaff(handover.handoverId);
    }

    res.status(201).json({
      success: true,
      data: handover
    });
  })
);

/**
 * GET /handovers/:handoverId
 * Get a handover by ID
 */
router.get(
  '/handovers/:handoverId',
  asyncHandler(async (req: Request, res: Response) => {
    const { handoverId } = req.params;
    const handover = await handoverService.getHandover(handoverId);

    if (!handover) {
      return res.status(404).json({
        success: false,
        error: `Handover not found: ${handoverId}`
      });
    }

    res.json({
      success: true,
      data: handover
    });
  })
);

/**
 * GET /handovers/date/:date
 * Get handovers by date
 */
router.get(
  '/handovers/date/:date',
  asyncHandler(async (req: Request, res: Response) => {
    const dateStr = req.params.date;
    const { facilityId, departmentId } = req.query;

    // Parse date string (supports YYYY-MM-DD format)
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const handovers = await handoverService.getHandoversByDate(
      date,
      facilityId as string | undefined,
      departmentId as string | undefined
    );

    res.json({
      success: true,
      data: handovers,
      count: handovers.length
    });
  })
);

/**
 * GET /handovers/pending/:userId
 * Get pending handovers for a user
 */
router.get(
  '/handovers/pending/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const handovers = await handoverService.getPendingHandover(userId);

    res.json({
      success: true,
      data: handovers,
      count: handovers.length
    });
  })
);

/**
 * PUT /handovers/:handoverId/patient
 * Add a patient update to a handover
 */
router.put(
  '/handovers/:handoverId/patient',
  validatePatientInput,
  asyncHandler(async (req: Request, res: Response) => {
    const { handoverId } = req.params;
    const patient = await handoverService.addPatientUpdate(handoverId, req.body);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: `Handover not found: ${handoverId}`
      });
    }

    res.json({
      success: true,
      data: patient
    });
  })
);

/**
 * PUT /handovers/:handoverId/task
 * Add a task to a handover
 */
router.put(
  '/handovers/:handoverId/task',
  validateTaskInput,
  asyncHandler(async (req: Request, res: Response) => {
    const { handoverId } = req.params;
    const task = await handoverService.addTask(handoverId, req.body);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Handover not found: ${handoverId}`
      });
    }

    res.json({
      success: true,
      data: task
    });
  })
);

/**
 * PUT /handovers/:handoverId/alert
 * Add an alert to a handover
 */
router.put(
  '/handovers/:handoverId/alert',
  validateAlertInput,
  asyncHandler(async (req: Request, res: Response) => {
    const { handoverId } = req.params;
    const alert = await handoverService.addAlert(handoverId, req.body);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: `Handover not found: ${handoverId}`
      });
    }

    // Send critical alert notification if needed
    if (alert.type === AlertType.CRITICAL || alert.type === AlertType.URGENT) {
      await notificationService.alertOnCriticalAlert(handoverId, alert);
    }

    res.json({
      success: true,
      data: alert
    });
  })
);

/**
 * PUT /handovers/:handoverId/acknowledge
 * Acknowledge a handover
 */
router.put(
  '/handovers/:handoverId/acknowledge',
  asyncHandler(async (req: Request, res: Response) => {
    const { handoverId } = req.params;
    const { userId, userName, role, comments, signature } = req.body;

    if (!userId || !userName || !role) {
      return res.status(400).json({
        success: false,
        error: 'userId, userName, and role are required'
      });
    }

    const acknowledgment = await handoverService.acknowledgeHandover(
      handoverId,
      { userId, userName, role, comments, signature }
    );

    if (!acknowledgment) {
      return res.status(404).json({
        success: false,
        error: `Handover not found: ${handoverId}`
      });
    }

    res.json({
      success: true,
      data: acknowledgment
    });
  })
);

/**
 * PUT /handovers/:handoverId/complete
 * Complete a handover
 */
router.put(
  '/handovers/:handoverId/complete',
  asyncHandler(async (req: Request, res: Response) => {
    const { handoverId } = req.params;
    const handover = await handoverService.completeHandover(handoverId);

    if (!handover) {
      return res.status(404).json({
        success: false,
        error: `Handover not found: ${handoverId}`
      });
    }

    // Notify completion
    await notificationService.notifyHandoverCompleted(handoverId);

    res.json({
      success: true,
      data: handover
    });
  })
);

/**
 * PUT /handovers/:handoverId/notes
 * Update handover notes
 */
router.put(
  '/handovers/:handoverId/notes',
  asyncHandler(async (req: Request, res: Response) => {
    const { handoverId } = req.params;
    const { notes } = req.body;

    if (typeof notes !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Notes must be a string'
      });
    }

    const handover = await handoverService.updateNotes(handoverId, notes);

    if (!handover) {
      return res.status(404).json({
        success: false,
        error: `Handover not found: ${handoverId}`
      });
    }

    res.json({
      success: true,
      data: handover
    });
  })
);

/**
 * PUT /handovers/:handoverId/task/:taskId/status
 * Update task status
 */
router.put(
  '/handovers/:handoverId/task/:taskId/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { handoverId, taskId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'in_progress', 'completed', 'delegated', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const task = await handoverService.updateTaskStatus(handoverId, taskId, status);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task not found: ${taskId}`
      });
    }

    res.json({
      success: true,
      data: task
    });
  })
);

/**
 * PUT /handovers/:handoverId/alert/:alertId/resolve
 * Resolve an alert
 */
router.put(
  '/handovers/:handoverId/alert/:alertId/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    const { handoverId, alertId } = req.params;
    const { actionTaken, resolvedBy } = req.body;

    if (!actionTaken || !resolvedBy) {
      return res.status(400).json({
        success: false,
        error: 'actionTaken and resolvedBy are required'
      });
    }

    const alert = await handoverService.resolveAlert(handoverId, alertId, actionTaken, resolvedBy);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: `Alert not found: ${alertId}`
      });
    }

    res.json({
      success: true,
      data: alert
    });
  })
);

/**
 * GET /handovers/search
 * Search handovers (including archived)
 */
router.get(
  '/handovers/search',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      facilityId,
      departmentId,
      startDate,
      endDate,
      status,
      outgoingStaffId,
      incomingStaffId,
      keyword,
      archived
    } = req.query;

    const query = {
      facilityId: facilityId as string | undefined,
      departmentId: departmentId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      status: status as HandoverStatus | undefined,
      outgoingStaffId: outgoingStaffId as string | undefined,
      incomingStaffId: incomingStaffId as string | undefined,
      keyword: keyword as string | undefined
    };

    // Search archived if specified
    if (archived === 'true') {
      const results = await archiveService.searchHandovers(query);
      return res.json({
        success: true,
        data: results,
        count: results.length,
        archived: true
      });
    }

    // Search active handovers
    const { ShiftHandover } = await import('../models/handover');
    const mongoQuery: Record<string, unknown> = {};

    if (facilityId) mongoQuery.facilityId = facilityId;
    if (departmentId) mongoQuery.departmentId = departmentId;
    if (startDate || endDate) {
      mongoQuery.shiftDate = {};
      if (startDate) (mongoQuery.shiftDate as Record<string, Date>).$gte = new Date(startDate as string);
      if (endDate) (mongoQuery.shiftDate as Record<string, Date>).$lte = new Date(endDate as string);
    }
    if (status) mongoQuery.status = status;
    if (outgoingStaffId) mongoQuery.outgoingStaffId = outgoingStaffId;
    if (incomingStaffId) mongoQuery.incomingStaffId = incomingStaffId;
    if (keyword) mongoQuery.$text = { $search: keyword as string };

    const results = await ShiftHandover.find(mongoQuery)
      .sort({ shiftDate: -1 })
      .limit(100)
      .exec();

    res.json({
      success: true,
      data: results,
      count: results.length,
      archived: false
    });
  })
);

/**
 * GET /handovers/:handoverId/stats
 * Get handover statistics
 */
router.get(
  '/handovers/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const { facilityId, startDate, endDate } = req.query;

    if (!facilityId) {
      return res.status(400).json({
        success: false,
        error: 'facilityId is required'
      });
    }

    const stats = await handoverService.getHandoverStats(
      facilityId as string,
      startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate as string) : new Date()
    );

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * DELETE /handovers/:handoverId
 * Cancel a handover
 */
router.delete(
  '/handovers/:handoverId',
  asyncHandler(async (req: Request, res: Response) => {
    const { handoverId } = req.params;
    const { reason } = req.body;

    const handover = await handoverService.cancelHandover(
      handoverId,
      reason || 'Cancelled by user'
    );

    if (!handover) {
      return res.status(404).json({
        success: false,
        error: `Handover not found: ${handoverId}`
      });
    }

    res.json({
      success: true,
      data: handover
    });
  })
);

// ============================================================================
// TEMPLATE ROUTES
// ============================================================================

/**
 * POST /templates
 * Create a new template
 */
router.post(
  '/templates',
  asyncHandler(async (req: Request, res: Response) => {
    const template = await templateService.createTemplate(req.body);

    res.status(201).json({
      success: true,
      data: template
    });
  })
);

/**
 * GET /templates/:templateId
 * Get a template by ID
 */
router.get(
  '/templates/:templateId',
  asyncHandler(async (req: Request, res: Response) => {
    const { templateId } = req.params;
    const template = await templateService.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Template not found: ${templateId}`
      });
    }

    res.json({
      success: true,
      data: template
    });
  })
);

/**
 * GET /templates/facility/:facilityId
 * Get templates by facility
 */
router.get(
  '/templates/facility/:facilityId',
  asyncHandler(async (req: Request, res: Response) => {
    const { facilityId } = req.params;
    const { includeInactive } = req.query;

    const templates = await templateService.getTemplatesByFacility(
      facilityId,
      includeInactive === 'true'
    );

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  })
);

/**
 * GET /templates/department/:departmentId
 * Get templates by department
 */
router.get(
  '/templates/department/:departmentId',
  asyncHandler(async (req: Request, res: Response) => {
    const { departmentId } = req.params;
    const { facilityId } = req.query;

    const templates = await templateService.getTemplatesByDepartment(
      departmentId,
      facilityId as string | undefined
    );

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  })
);

/**
 * PUT /templates/:templateId
 * Update a template
 */
router.put(
  '/templates/:templateId',
  asyncHandler(async (req: Request, res: Response) => {
    const { templateId } = req.params;
    const template = await templateService.updateTemplate(templateId, req.body);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Template not found: ${templateId}`
      });
    }

    res.json({
      success: true,
      data: template
    });
  })
);

/**
 * POST /templates/:templateId/apply/:handoverId
 * Apply a template to a handover
 */
router.post(
  '/templates/:templateId/apply/:handoverId',
  asyncHandler(async (req: Request, res: Response) => {
    const { templateId, handoverId } = req.params;
    const result = await templateService.applyTemplate(handoverId, templateId);

    res.json({
      success: true,
      ...result
    });
  })
);

/**
 * POST /templates/:templateId/duplicate
 * Duplicate a template
 */
router.post(
  '/templates/:templateId/duplicate',
  asyncHandler(async (req: Request, res: Response) => {
    const { templateId } = req.params;
    const { newName, createdBy } = req.body;

    if (!newName || !createdBy) {
      return res.status(400).json({
        success: false,
        error: 'newName and createdBy are required'
      });
    }

    const template = await templateService.duplicateTemplate(templateId, newName, createdBy);

    res.status(201).json({
      success: true,
      data: template
    });
  })
);

/**
 * DELETE /templates/:templateId
 * Delete a template
 */
router.delete(
  '/templates/:templateId',
  asyncHandler(async (req: Request, res: Response) => {
    const { templateId } = req.params;
    await templateService.deleteTemplate(templateId);

    res.json({
      success: true,
      message: `Template ${templateId} deleted`
    });
  })
);

// ============================================================================
// ARCHIVE ROUTES
// ============================================================================

/**
 * POST /archive/:handoverId
 * Archive a handover
 */
router.post(
  '/archive/:handoverId',
  asyncHandler(async (req: Request, res: Response) => {
    const { handoverId } = req.params;
    const { archivedBy, reason } = req.body;

    if (!archivedBy) {
      return res.status(400).json({
        success: false,
        error: 'archivedBy is required'
      });
    }

    const archived = await archiveService.archiveHandover(handoverId, archivedBy, reason);

    if (!archived) {
      return res.status(404).json({
        success: false,
        error: `Handover not found: ${handoverId}`
      });
    }

    res.json({
      success: true,
      data: archived
    });
  })
);

/**
 * GET /archive/:archiveId
 * Get archived handover
 */
router.get(
  '/archive/:archiveId',
  asyncHandler(async (req: Request, res: Response) => {
    const { archiveId } = req.params;
    const archived = await archiveService.getArchivedHandover(archiveId);

    if (!archived) {
      return res.status(404).json({
        success: false,
        error: `Archived handover not found: ${archiveId}`
      });
    }

    res.json({
      success: true,
      data: archived
    });
  })
);

/**
 * POST /archive/:archiveId/restore
 * Restore an archived handover
 */
router.post(
  '/archive/:archiveId/restore',
  asyncHandler(async (req: Request, res: Response) => {
    const { archiveId } = req.params;
    const restored = await archiveService.restoreArchivedHandover(archiveId);

    if (!restored) {
      return res.status(404).json({
        success: false,
        error: `Archived handover not found: ${archiveId}`
      });
    }

    res.status(201).json({
      success: true,
      data: restored
    });
  })
);

/**
 * GET /reports/shift
 * Generate shift report
 */
router.get(
  '/reports/shift',
  asyncHandler(async (req: Request, res: Response) => {
    const { facilityId, startDate, endDate, departmentId } = req.query;

    if (!facilityId) {
      return res.status(400).json({
        success: false,
        error: 'facilityId is required'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const report = await archiveService.generateShiftReport(
      facilityId as string,
      new Date(startDate as string),
      new Date(endDate as string),
      departmentId as string | undefined
    );

    res.json({
      success: true,
      data: report
    });
  })
);

/**
 * POST /archive/auto-cleanup
 * Auto-archive old handovers
 */
router.post(
  '/archive/auto-cleanup',
  asyncHandler(async (req: Request, res: Response) => {
    const { facilityId, olderThanDays, archivedBy } = req.body;

    if (!facilityId) {
      return res.status(400).json({
        success: false,
        error: 'facilityId is required'
      });
    }

    const count = await archiveService.autoArchiveOldHandovers(
      facilityId,
      olderThanDays || 90,
      archivedBy || 'system'
    );

    res.json({
      success: true,
      data: {
        archivedCount: count
      }
    });
  })
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

router.use(notFoundHandler);
router.use(errorHandler);

export default router;
