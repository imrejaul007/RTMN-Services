import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { extractionService } from '../services/extractionService';
import { schedulerService } from '../services/schedulerService';
import { proactiveService } from '../services/proactiveService';
import { reminderService } from '../services/reminderService';
import { trackingService, StepFilters } from '../services/trackingService';
import { StepStatus, StepPriority, StepType, ReminderChannel, ReminderFrequency } from '../models/nextStep';
import { logger } from '../utils/logger';

const router = Router();

// ============================================
// REQUEST VALIDATION SCHEMAS
// ============================================

const extractSchema = z.object({
  text: z.string().min(1).max(50000).optional(),
  transcript: z.string().min(1).max(50000).optional(),
  summary: z.string().min(1).max(10000).optional(),
  issue: z.object({
    title: z.string(),
    description: z.string(),
    status: z.string().optional(),
    priority: z.string().optional(),
    conversation: z.string().optional()
  }).optional(),
  customerId: z.string().min(1),
  tenantId: z.string().min(1),
  conversationId: z.string().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional()
});

const createStepSchema = z.object({
  customerId: z.string().min(1),
  tenantId: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  stepType: z.nativeEnum(StepType),
  priority: z.nativeEnum(StepPriority).optional(),
  dueDate: z.string().datetime().or(z.date()).optional(),
  schedule: z.object({
    type: z.nativeEnum(ReminderFrequency).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    timezone: z.string().optional(),
    startDate: z.string().datetime().or(z.date()).optional(),
    endDate: z.string().datetime().or(z.date()).optional(),
    customDays: z.array(z.number().min(0).max(6)).optional(),
    customInterval: z.number().positive().optional(),
    snoozeDuration: z.number().min(1).max(1440).optional()
  }).optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  sourceService: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  reminderChannels: z.array(z.nativeEnum(ReminderChannel)).optional()
});

const updateStepSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  stepType: z.nativeEnum(StepType).optional(),
  priority: z.nativeEnum(StepPriority).optional(),
  status: z.nativeEnum(StepStatus).optional(),
  dueDate: z.string().datetime().or(z.date()).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional()
});

const completeStepSchema = z.object({
  completedBy: z.string().optional(),
  completionMethod: z.enum(['manual', 'automated', 'ai_suggested']),
  notes: z.string().max(2000).optional(),
  attachments: z.array(z.string()).optional(),
  feedback: z.object({
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().max(500).optional()
  }).optional()
});

const snoozeStepSchema = z.object({
  newTime: z.string().datetime().or(z.date()),
  reason: z.string().max(500).optional()
});

const filtersSchema = z.object({
  status: z.string().transform(s => s.split(',')).pipe(z.array(z.nativeEnum(StepStatus))).optional(),
  priority: z.string().transform(s => s.split(',')).pipe(z.array(z.nativeEnum(StepPriority))).optional(),
  stepType: z.string().transform(s => s.split(',')).pipe(z.array(z.nativeEnum(StepType))).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  relatedEntityType: z.string().optional(),
  tags: z.string().transform(s => s.split(',')).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  skip: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const proactiveEventSchema = z.object({
  eventType: z.enum(['appointment', 'renewal', 'payment_due', 'follow_up', 'check_in', 'custom']),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  relatedEntityId: z.string().optional(),
  relatedEntityType: z.string().optional(),
  triggerHoursBefore: z.number().positive().optional(),
  metadata: z.record(z.unknown()).optional()
});

const batchScheduleSchema = z.object({
  stepIds: z.array(z.string()).min(1).max(100)
});

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
        return;
      }
      next(error);
    }
  };
};

// ============================================
// ROUTES
// ============================================

/**
 * POST /nextstep/extract
 * Extract next steps from text/transcript/summary/issue
 */
router.post(
  '/extract',
  validateRequest(extractSchema),
  async (req: Request, res: Response) => {
    try {
      const { text, transcript, summary, issue, customerId, tenantId, conversationId, relatedEntityType, relatedEntityId } = req.body;

      let result;
      const context = { customerId, tenantId, conversationId, relatedEntityType, relatedEntityId };

      if (text) {
        result = await extractionService.extractFromText(text, context);
      } else if (transcript) {
        result = await extractionService.extractFromTranscript(transcript, context);
      } else if (summary) {
        result = await extractionService.extractFromSummary(summary, context);
      } else if (issue) {
        result = await extractionService.extractFromIssue({ ...issue, customerId }, context);
      } else {
        res.status(400).json({ success: false, error: 'Must provide text, transcript, summary, or issue' });
        return;
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in extract endpoint', { error });
      res.status(500).json({ success: false, error: 'Failed to extract steps' });
    }
  }
);

/**
 * POST /nextstep/create
 * Create a new next step manually
 */
router.post(
  '/create',
  validateRequest(createStepSchema),
  async (req: Request, res: Response) => {
    try {
      const input = {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined
      };

      const step = await trackingService.trackStep(input);

      // Schedule reminder if due date is set
      if (step.dueDate) {
        await schedulerService.scheduleReminder(step);
      }

      res.status(201).json({
        success: true,
        data: step
      });
    } catch (error) {
      logger.error('Error creating step', { error });
      res.status(500).json({ success: false, error: 'Failed to create step' });
    }
  }
);

/**
 * GET /nextstep/:customerId
 * Get all steps for a customer
 */
router.get('/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const queryFilters = filtersSchema.parse(req.query);

    const filters: StepFilters = {
      status: queryFilters.status,
      priority: queryFilters.priority,
      stepType: queryFilters.stepType,
      fromDate: queryFilters.fromDate ? new Date(queryFilters.fromDate) : undefined,
      toDate: queryFilters.toDate ? new Date(queryFilters.toDate) : undefined,
      relatedEntityType: queryFilters.relatedEntityType,
      tags: queryFilters.tags,
      limit: queryFilters.limit,
      skip: queryFilters.skip,
      sortBy: queryFilters.sortBy,
      sortOrder: queryFilters.sortOrder
    };

    const { steps, total } = await trackingService.getCustomerSteps(customerId, filters);

    res.json({
      success: true,
      data: {
        steps,
        total,
        limit: filters.limit || 50,
        skip: filters.skip || 0
      }
    });
  } catch (error) {
    logger.error('Error getting customer steps', { error });
    res.status(500).json({ success: false, error: 'Failed to get steps' });
  }
});

/**
 * GET /nextstep/detail/:stepId
 * Get a specific step by ID
 */
router.get('/detail/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    const step = await trackingService.getStep(stepId);

    if (!step) {
      res.status(404).json({ success: false, error: 'Step not found' });
      return;
    }

    res.json({
      success: true,
      data: step
    });
  } catch (error) {
    logger.error('Error getting step', { error });
    res.status(500).json({ success: false, error: 'Failed to get step' });
  }
});

/**
 * PUT /nextstep/:stepId
 * Update a step
 */
router.put(
  '/:stepId',
  validateRequest(updateStepSchema),
  async (req: Request, res: Response) => {
    try {
      const { stepId } = req.params;
      const updates = {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : req.body.dueDate
      };

      const result = await trackingService.updateStep(stepId, updates);

      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }

      // Reschedule reminder if due date changed
      if (updates.dueDate && result.step) {
        await schedulerService.scheduleReminder(result.step);
      }

      res.json({
        success: true,
        data: result.step
      });
    } catch (error) {
      logger.error('Error updating step', { error });
      res.status(500).json({ success: false, error: 'Failed to update step' });
    }
  }
);

/**
 * PUT /nextstep/:stepId/complete
 * Mark a step as complete
 */
router.put(
  '/:stepId/complete',
  validateRequest(completeStepSchema),
  async (req: Request, res: Response) => {
    try {
      const { stepId } = req.params;
      const result = await trackingService.completeStep(stepId, req.body);

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      // Cancel scheduled reminders
      await schedulerService.cancelReminder(stepId);

      res.json({
        success: true,
        data: result.step
      });
    } catch (error) {
      logger.error('Error completing step', { error });
      res.status(500).json({ success: false, error: 'Failed to complete step' });
    }
  }
);

/**
 * PUT /nextstep/:stepId/snooze
 * Snooze a step
 */
router.put(
  '/:stepId/snooze',
  validateRequest(snoozeStepSchema),
  async (req: Request, res: Response) => {
    try {
      const { stepId } = req.params;
      const { newTime, reason } = req.body;

      const result = await schedulerService.snoozeReminder(stepId, new Date(newTime), reason);

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      // Reschedule the reminder
      const step = await trackingService.getStep(stepId);
      if (step) {
        await schedulerService.scheduleReminder(step);
      }

      res.json({
        success: true,
        data: { newReminderAt: result.newReminderAt }
      });
    } catch (error) {
      logger.error('Error snoozing step', { error });
      res.status(500).json({ success: false, error: 'Failed to snooze step' });
    }
  }
);

/**
 * DELETE /nextstep/:stepId
 * Delete a step
 */
router.delete('/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;

    // Cancel any scheduled reminders first
    await schedulerService.cancelReminder(stepId);

    const result = await trackingService.deleteStep(stepId);

    if (!result.success) {
      res.status(404).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      message: 'Step deleted'
    });
  } catch (error) {
    logger.error('Error deleting step', { error });
    res.status(500).json({ success: false, error: 'Failed to delete step' });
  }
});

/**
 * GET /nextstep/:customerId/upcoming
 * Get upcoming reminders for a customer
 */
router.get('/:customerId/upcoming', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const hoursAhead = parseInt(req.query.hoursAhead as string) || 24;

    const reminders = await schedulerService.getUpcomingReminders(customerId, hoursAhead);

    res.json({
      success: true,
      data: {
        reminders,
        hoursAhead,
        count: reminders.length
      }
    });
  } catch (error) {
    logger.error('Error getting upcoming reminders', { error });
    res.status(500).json({ success: false, error: 'Failed to get upcoming reminders' });
  }
});

/**
 * GET /nextstep/:customerId/overdue
 * Get overdue items for a customer
 */
router.get('/:customerId/overdue', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    const overdue = await schedulerService.getOverdueReminders(customerId);

    res.json({
      success: true,
      data: {
        overdue,
        count: overdue.length
      }
    });
  } catch (error) {
    logger.error('Error getting overdue reminders', { error });
    res.status(500).json({ success: false, error: 'Failed to get overdue items' });
  }
});

/**
 * POST /nextstep/:customerId/proactive
 * Trigger proactive alert for a customer
 */
router.post(
  '/:customerId/proactive',
  validateRequest(proactiveEventSchema),
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;

      const result = await proactiveService.generateProactiveAlert(customerId, req.body);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error generating proactive alert', { error });
      res.status(500).json({ success: false, error: 'Failed to generate proactive alert' });
    }
  }
);

/**
 * GET /nextstep/:customerId/analytics
 * Get step analytics for a customer
 */
router.get('/:customerId/analytics', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const [analytics, summary] = await Promise.all([
      trackingService.getStepAnalytics(customerId, days),
      trackingService.getStepSummary(customerId)
    ]);

    res.json({
      success: true,
      data: {
        analytics,
        summary
      }
    });
  } catch (error) {
    logger.error('Error getting analytics', { error });
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
});

/**
 * POST /nextstep/schedule
 * Schedule batch reminders
 */
router.post(
  '/schedule',
  validateRequest(batchScheduleSchema),
  async (req: Request, res: Response) => {
    try {
      const { stepIds } = req.body;

      const result = await schedulerService.scheduleBatchReminders(stepIds);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error scheduling batch reminders', { error });
      res.status(500).json({ success: false, error: 'Failed to schedule reminders' });
    }
  }
);

/**
 * POST /nextstep/:customerId/analyze
 * Get proactive analysis for a customer
 */
router.get('/:customerId/analyze', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    const analysis = await proactiveService.analyzeUpcoming(customerId);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error analyzing customer', { error });
    res.status(500).json({ success: false, error: 'Failed to analyze customer' });
  }
});

/**
 * POST /nextstep/:customerId/followup/:stepId
 * Send follow-up for a specific action
 */
router.post('/:customerId/followup/:stepId', async (req: Request, res: Response) => {
  try {
    const { customerId, stepId } = req.params;
    const { customMessage } = req.body;

    const result = await proactiveService.sendFollowUp(customerId, stepId, customMessage);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      data: { alertId: result.alertId }
    });
  } catch (error) {
    logger.error('Error sending follow-up', { error });
    res.status(500).json({ success: false, error: 'Failed to send follow-up' });
  }
});

/**
 * POST /nextstep/:stepId/trigger
 * Manually trigger reminder for a step
 */
router.post('/:stepId/trigger', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;

    const result = await schedulerService.triggerReminder(stepId);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      message: 'Reminder triggered'
    });
  } catch (error) {
    logger.error('Error triggering reminder', { error });
    res.status(500).json({ success: false, error: 'Failed to trigger reminder' });
  }
});

/**
 * GET /nextstep/:customerId/summary
 * Get step summary for a customer
 */
router.get('/:customerId/summary', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    const summary = await trackingService.getStepSummary(customerId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error getting summary', { error });
    res.status(500).json({ success: false, error: 'Failed to get summary' });
  }
});

/**
 * POST /nextstep/bulk
 * Bulk create steps
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { steps } = req.body;

    if (!Array.isArray(steps) || steps.length === 0) {
      res.status(400).json({ success: false, error: 'Must provide array of steps' });
      return;
    }

    if (steps.length > 100) {
      res.status(400).json({ success: false, error: 'Maximum 100 steps per request' });
      return;
    }

    const result = await trackingService.bulkTrackSteps(steps);

    res.status(201).json({
      success: true,
      data: {
        created: result.created,
        failed: result.failed,
        steps: result.steps
      }
    });
  } catch (error) {
    logger.error('Error bulk creating steps', { error });
    res.status(500).json({ success: false, error: 'Failed to create steps' });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'next-step-intelligence-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
