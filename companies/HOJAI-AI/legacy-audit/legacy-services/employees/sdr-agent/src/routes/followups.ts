// ============================================
// HOJAI AI - SDR Agent Follow-up Routes
// ============================================

import { Router, Request, Response } from 'express';
import { followupManager } from '../services/followupManager';
import { requireInternalAuth, extractTenant } from '../middleware/auth';
import {
  validateBody,
  FollowupBatchSchema,
  successResponse,
  errorResponse,
  paginatedResponse
} from '../utils/validation';
import { logger } from '../utils/logger';

const router = Router();

// Apply middleware
router.use(extractTenant);
router.use(requireInternalAuth);

/**
 * POST /api/followups/schedule
 * Schedule follow-ups for a lead
 */
router.post('/schedule',
  async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = req;
      const { leadId, followups } = req.body;

      if (!leadId) {
        return res.status(400).json(errorResponse(
          'VALIDATION_ERROR',
          'leadId is required'
        ));
      }

      if (!followups || !Array.isArray(followups) || followups.length === 0) {
        return res.status(400).json(errorResponse(
          'VALIDATION_ERROR',
          'At least one followup is required'
        ));
      }

      const result = await followupManager.scheduleFollowups(
        tenantId!,
        leadId,
        followups,
        userId
      );

      if (!result.success) {
        return res.status(400).json(errorResponse(
          'FOLLOWUP_SCHEDULE_FAILED',
          result.error || 'Failed to schedule follow-ups'
        ));
      }

      res.status(201).json(successResponse({
        followups: result.followups,
        count: result.followups.length
      }, `${result.followups.length} follow-up(s) scheduled`));
    } catch (error) {
      logger.error('Failed to schedule follow-ups', { error, tenantId: req.tenantId });
      res.status(500).json(errorResponse(
        'FOLLOWUP_SCHEDULE_FAILED',
        'Failed to schedule follow-ups',
        error instanceof Error ? error.message : undefined
      ));
    }
  }
);

/**
 * POST /api/followups/sequence
 * Schedule follow-ups using a predefined sequence
 */
router.post('/sequence', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { leadId, sequenceId, startDate } = req.body;

    if (!leadId) {
      return res.status(400).json(errorResponse(
        'VALIDATION_ERROR',
        'leadId is required'
      ));
    }

    const result = await followupManager.scheduleSequence(
      tenantId!,
      leadId,
      sequenceId,
      startDate,
      userId
    );

    res.status(201).json(successResponse({
      followups: result.followups,
      count: result.followups.length,
      sequence: result.sequence
    }, `${result.followups.length} follow-up(s) scheduled using ${result.sequence} sequence`));
  } catch (error) {
    logger.error('Failed to schedule sequence', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'FOLLOWUP_SEQUENCE_FAILED',
      'Failed to schedule follow-up sequence',
      error instanceof Error ? error.message : undefined
    ));
  }
});

/**
 * GET /api/followups/pending
 * Get pending follow-ups
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;

    const options = {
      channel: req.query.channel as any,
      before: req.query.before ? new Date(req.query.before as string) : undefined,
      after: req.query.after ? new Date(req.query.after as string) : undefined,
      limit: Math.min(parseInt(req.query.limit as string) || 50, 100),
      offset: parseInt(req.query.offset as string) || 0
    };

    const result = await followupManager.getPendingFollowups(tenantId!, options);

    res.json(paginatedResponse(result.followups, result.total, options.limit, options.offset));
  } catch (error) {
    logger.error('Failed to get pending follow-ups', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'FOLLOWUP_LIST_FAILED',
      'Failed to get pending follow-ups'
    ));
  }
});

/**
 * GET /api/followups/lead/:leadId
 * Get all follow-ups for a lead
 */
router.get('/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;
    const { leadId } = req.params;

    const { Followup } = require('../models');
    const followups = await Followup.find({ tenantId, leadId })
      .sort({ scheduledFor: -1 })
      .lean();

    res.json(successResponse({
      followups: followups.map(f => ({
        id: f._id.toString(),
        tenantId: f.tenantId,
        leadId: f.leadId.toString(),
        channel: f.channel,
        status: f.status,
        scheduledFor: f.scheduledFor,
        message: f.message,
        sentAt: f.sentAt,
        completedAt: f.completedAt,
        skippedReason: f.skippedReason,
        createdAt: f.createdAt
      }))
    }));
  } catch (error) {
    logger.error('Failed to get lead follow-ups', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'FOLLOWUP_LIST_FAILED',
      'Failed to get lead follow-ups'
    ));
  }
});

/**
 * POST /api/followups/:id/complete
 * Mark a follow-up as completed
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { id } = req.params;
    const { outreachId, skipped, skipReason } = req.body;

    const completed = await followupManager.completeFollowup(
      tenantId!,
      id,
      { outreachId, skipped, skipReason },
      userId
    );

    if (!completed) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Follow-up not found'));
    }

    res.json(successResponse({
      followup: completed
    }, skipped ? 'Follow-up skipped' : 'Follow-up completed'));
  } catch (error) {
    logger.error('Failed to complete follow-up', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'FOLLOWUP_COMPLETE_FAILED',
      'Failed to complete follow-up'
    ));
  }
});

/**
 * PUT /api/followups/:id/reschedule
 * Reschedule a follow-up
 */
router.put('/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { id } = req.params;
    const { newScheduledAt } = req.body;

    if (!newScheduledAt) {
      return res.status(400).json(errorResponse(
        'VALIDATION_ERROR',
        'newScheduledAt is required'
      ));
    }

    const rescheduled = await followupManager.rescheduleFollowup(
      tenantId!,
      id,
      newScheduledAt,
      userId
    );

    if (!rescheduled) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Follow-up not found'));
    }

    res.json(successResponse({
      followup: rescheduled
    }, 'Follow-up rescheduled'));
  } catch (error) {
    logger.error('Failed to reschedule follow-up', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'FOLLOWUP_RESCHEDULE_FAILED',
      'Failed to reschedule follow-up'
    ));
  }
});

/**
 * DELETE /api/followups/lead/:leadId
 * Cancel all pending follow-ups for a lead
 */
router.delete('/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { leadId } = req.params;
    const { reason } = req.body;

    const cancelled = await followupManager.cancelFollowups(
      tenantId!,
      leadId,
      reason,
      userId
    );

    res.json(successResponse({
      cancelledCount: cancelled
    }, `${cancelled} follow-up(s) cancelled`));
  } catch (error) {
    logger.error('Failed to cancel follow-ups', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'FOLLOWUP_CANCEL_FAILED',
      'Failed to cancel follow-ups'
    ));
  }
});

/**
 * GET /api/followups/stats
 * Get follow-up statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;

    const dateRange = req.query.start && req.query.end
      ? {
          start: new Date(req.query.start as string),
          end: new Date(req.query.end as string)
        }
      : undefined;

    const stats = await followupManager.getFollowupStats(tenantId!, dateRange);

    res.json(successResponse(stats));
  } catch (error) {
    logger.error('Failed to get follow-up stats', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'FOLLOWUP_STATS_FAILED',
      'Failed to get follow-up statistics'
    ));
  }
});

/**
 * GET /api/followups/sequences
 * Get available follow-up sequences
 */
router.get('/sequences', async (req: Request, res: Response) => {
  try {
    // Return available sequences
    const sequences = [
      {
        id: 'default-nurture',
        name: 'Default Nurture Sequence',
        description: 'Standard 4-step nurture sequence for cold leads',
        steps: 4,
        estimatedDays: 11
      },
      {
        id: 'hot-lead-fast',
        name: 'Hot Lead Fast Track',
        description: 'Quick 3-step sequence for high-intent leads',
        steps: 3,
        estimatedDays: 3
      }
    ];

    res.json(successResponse({ sequences }));
  } catch (error) {
    logger.error('Failed to get sequences', { error });
    res.status(500).json(errorResponse(
      'SEQUENCES_FAILED',
      'Failed to get follow-up sequences'
    ));
  }
});

export { router as followupRoutes };
