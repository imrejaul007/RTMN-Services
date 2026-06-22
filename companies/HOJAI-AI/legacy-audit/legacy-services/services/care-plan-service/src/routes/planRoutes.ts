import { Router, Request, Response, NextFunction } from 'express';
import { planService, CreatePlanInput, UpdatePlanInput, AddGoalInput, UpdateGoalInput, AddInterventionInput, AddNoteInput, AddReviewInput } from '../services/planService';
import { goalTrackingService, ProgressUpdate } from '../services/goalTrackingService';
import { aiInsightService } from '../services/aiInsightService';
import { notificationService } from '../services/notificationService';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

// Error handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================================================
// CARE PLAN ROUTES
// ============================================================================

/**
 * POST /plans - Create a new care plan
 */
router.post(
  '/plans',
  validateRequest('createPlan'),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /plans - Creating new care plan', { body: req.body });

    const input: CreatePlanInput = {
      patientId: req.body.patientId,
      patientName: req.body.patientName,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      priority: req.body.priority,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      createdBy: req.body.createdBy,
      riskFactors: req.body.riskFactors,
      allergies: req.body.allergies,
      medications: req.body.medications,
      tags: req.body.tags,
      metadata: req.body.metadata,
    };

    const plan = await planService.createPlan(input);

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Care plan created successfully',
    });
  })
);

/**
 * GET /plans - List all care plans (with pagination and filters)
 */
router.get(
  '/plans',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('GET /plans - Listing care plans', { query: req.query });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const patientId = req.query.patientId as string;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (patientId) query.patientId = patientId;

    const { CarePlan } = await import('../models/carePlan');
    const skip = (page - 1) * limit;

    const [plans, total] = await Promise.all([
      CarePlan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CarePlan.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: plans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * GET /plans/patient/:patientId - Get all plans for a patient
 */
router.get(
  '/plans/patient/:patientId',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId } = req.params;
    logger.info('GET /plans/patient/:patientId - Fetching patient plans', { patientId });

    const { active } = req.query;
    let plans;

    if (active === 'true') {
      plans = await planService.getActivePlans(patientId);
    } else {
      plans = await planService.getPlansByPatient(patientId);
    }

    res.json({
      success: true,
      data: plans,
      count: plans.length,
    });
  })
);

/**
 * GET /plans/:planId - Get a specific care plan
 */
router.get(
  '/plans/:planId',
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    logger.info('GET /plans/:planId - Fetching care plan', { planId });

    const plan = await planService.getPlan(planId);

    if (!plan) {
      res.status(404).json({
        success: false,
        error: 'Care plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
    });
  })
);

/**
 * PUT /plans/:planId - Update a care plan
 */
router.put(
  '/plans/:planId',
  validateRequest('updatePlan'),
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    logger.info('PUT /plans/:planId - Updating care plan', { planId, body: req.body });

    const updates: UpdatePlanInput = {
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      nextReviewDate: req.body.nextReviewDate ? new Date(req.body.nextReviewDate) : undefined,
      updatedBy: req.body.updatedBy,
      riskFactors: req.body.riskFactors,
      allergies: req.body.allergies,
      tags: req.body.tags,
      metadata: req.body.metadata,
    };

    const plan = await planService.updatePlan(planId, updates);

    if (!plan) {
      res.status(404).json({
        success: false,
        error: 'Care plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
      message: 'Care plan updated successfully',
    });
  })
);

/**
 * PUT /plans/:planId/archive - Archive a care plan
 */
router.put(
  '/plans/:planId/archive',
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    logger.info('PUT /plans/:planId/archive - Archiving care plan', { planId });

    const plan = await planService.archivePlan(planId);

    if (!plan) {
      res.status(404).json({
        success: false,
        error: 'Care plan not found',
      });
      return;
    }

    // Send archive notification
    await notificationService.notifyOnPlanArchived(planId);

    res.json({
      success: true,
      data: plan,
      message: 'Care plan archived successfully',
    });
  })
);

/**
 * DELETE /plans/:planId - Delete a care plan
 */
router.delete(
  '/plans/:planId',
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    logger.info('DELETE /plans/:planId - Deleting care plan', { planId });

    const deleted = await planService.deletePlan(planId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Care plan not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Care plan deleted successfully',
    });
  })
);

// ============================================================================
// GOAL ROUTES
// ============================================================================

/**
 * POST /plans/:planId/goals - Add a goal to a care plan
 */
router.post(
  '/plans/:planId/goals',
  validateRequest('addGoal'),
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    logger.info('POST /plans/:planId/goals - Adding goal', { planId, body: req.body });

    const goalInput: AddGoalInput = {
      type: req.body.type,
      description: req.body.description,
      priority: req.body.priority,
      targetDate: new Date(req.body.targetDate),
      startDate: new Date(req.body.startDate),
      milestones: req.body.milestones,
      measurements: req.body.measurements,
      barriers: req.body.barriers,
      facilitators: req.body.facilitators,
      notes: req.body.notes,
    };

    const goal = await planService.addGoal(planId, goalInput);

    if (!goal) {
      res.status(404).json({
        success: false,
        error: 'Care plan not found',
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: goal,
      message: 'Goal added successfully',
    });
  })
);

/**
 * PUT /plans/:planId/goals/:goalId - Update a goal
 */
router.put(
  '/plans/:planId/goals/:goalId',
  validateRequest('updateGoal'),
  asyncHandler(async (req: Request, res: Response) => {
    const { planId, goalId } = req.params;
    logger.info('PUT /plans/:planId/goals/:goalId - Updating goal', { planId, goalId, body: req.body });

    const previousGoal = await planService.getGoal(planId, goalId);
    const previousProgress = previousGoal?.completionPercentage || 0;

    const updates: UpdateGoalInput = {
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority,
      targetDate: req.body.targetDate ? new Date(req.body.targetDate) : undefined,
      completionPercentage: req.body.completionPercentage,
      milestones: req.body.milestones,
      measurements: req.body.measurements,
      barriers: req.body.barriers,
      facilitators: req.body.facilitators,
      notes: req.body.notes,
    };

    const goal = await planService.updateGoal(planId, goalId, updates);

    if (!goal) {
      res.status(404).json({
        success: false,
        error: 'Goal not found',
      });
      return;
    }

    // Send notification for significant progress changes
    if (req.body.completionPercentage && Math.abs(req.body.completionPercentage - previousProgress) >= 10) {
      await notificationService.notifyOnGoalUpdate(planId, goal, previousProgress, req.body.updatedBy || 'system');
    }

    // Check if goal was achieved
    if (goal.status === 'achieved' && previousGoal?.status !== 'achieved') {
      await notificationService.notifyOnGoalComplete(goalId);
    }

    res.json({
      success: true,
      data: goal,
      message: 'Goal updated successfully',
    });
  })
);

/**
 * POST /plans/:planId/goals/:goalId/progress - Track goal progress
 */
router.post(
  '/plans/:planId/goals/:goalId/progress',
  validateRequest('trackProgress'),
  asyncHandler(async (req: Request, res: Response) => {
    const { planId, goalId } = req.params;
    logger.info('POST /plans/:planId/goals/:goalId/progress - Tracking progress', { planId, goalId, body: req.body });

    const update: ProgressUpdate = {
      value: req.body.value,
      note: req.body.note,
      updatedBy: req.body.updatedBy || 'system',
      timestamp: new Date(),
    };

    const previousGoal = await planService.getGoal(planId, goalId);
    const previousProgress = previousGoal?.completionPercentage || 0;

    const goal = await goalTrackingService.trackGoalProgress(planId, goalId, update);

    if (!goal) {
      res.status(404).json({
        success: false,
        error: 'Goal not found',
      });
      return;
    }

    // Send notification for progress updates
    await notificationService.notifyOnGoalUpdate(planId, goal, previousProgress, update.updatedBy);

    // Check for milestone achievements
    if (previousGoal) {
      for (const milestone of goal.milestones) {
        const prevMilestone = previousGoal.milestones.find((m: any) => m.title === milestone.title);
        if (milestone.completed && (!prevMilestone || !prevMilestone.completed)) {
          await notificationService.notifyMilestoneAchieved(planId, goalId, milestone.title);
        }
      }
    }

    res.json({
      success: true,
      data: goal,
      message: 'Progress tracked successfully',
    });
  })
);

/**
 * GET /plans/:planId/goals/:goalId/timeline - Get goal progress timeline
 */
router.get(
  '/plans/:planId/goals/:goalId/timeline',
  asyncHandler(async (req: Request, res: Response) => {
    const { planId, goalId } = req.params;
    logger.info('GET /plans/:planId/goals/:goalId/timeline - Fetching timeline', { planId, goalId });

    const timeline = await goalTrackingService.getGoalProgressTimeline(goalId);

    if (!timeline) {
      res.status(404).json({
        success: false,
        error: 'Goal not found',
      });
      return;
    }

    res.json({
      success: true,
      data: timeline,
    });
  })
);

/**
 * GET /plans/:planId/goals/:goalId/completion - Get goal completion metrics
 */
router.get(
  '/plans/:planId/goals/:goalId/completion',
  asyncHandler(async (req: Request, res: Response) => {
    const { goalId } = req.params;
    logger.info('GET /plans/:planId/goals/:goalId/completion - Fetching completion metrics', { goalId });

    const completion = await goalTrackingService.calculateGoalCompletion(goalId);

    if (!completion) {
      res.status(404).json({
        success: false,
        error: 'Goal not found',
      });
      return;
    }

    res.json({
      success: true,
      data: completion,
    });
  })
);

// ============================================================================
// INTERVENTION ROUTES
// ============================================================================

/**
 * POST /plans/:planId/interventions - Add an intervention
 */
router.post(
  '/plans/:planId/interventions',
  validateRequest('addIntervention'),
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    logger.info('POST /plans/:planId/interventions - Adding intervention', { planId, body: req.body });

    const interventionInput: AddInterventionInput = {
      type: req.body.type,
      description: req.body.description,
      frequency: req.body.frequency,
      duration: req.body.duration,
      assignedTo: req.body.assignedTo,
      assignedToRole: req.body.assignedToRole,
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      resources: req.body.resources,
      instructions: req.body.instructions,
      expectedOutcome: req.body.expectedOutcome,
      reminders: req.body.reminders,
    };

    const intervention = await planService.addIntervention(planId, interventionInput);

    if (!intervention) {
      res.status(404).json({
        success: false,
        error: 'Care plan not found',
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: intervention,
      message: 'Intervention added successfully',
    });
  })
);

/**
 * PUT /plans/:planId/interventions/:interventionId - Update an intervention
 */
router.put(
  '/plans/:planId/interventions/:interventionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { planId, interventionId } = req.params;
    logger.info('PUT /plans/:planId/interventions/:interventionId - Updating intervention', { planId, interventionId, body: req.body });

    const intervention = await planService.updateIntervention(planId, interventionId, req.body);

    if (!intervention) {
      res.status(404).json({
        success: false,
        error: 'Intervention not found',
      });
      return;
    }

    res.json({
      success: true,
      data: intervention,
      message: 'Intervention updated successfully',
    });
  })
);

// ============================================================================
// NOTE ROUTES
// ============================================================================

/**
 * POST /plans/:planId/notes - Add a note
 */
router.post(
  '/plans/:planId/notes',
  validateRequest('addNote'),
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    logger.info('POST /plans/:planId/notes - Adding note', { planId, body: req.body });

    const noteInput: AddNoteInput = {
      authorId: req.body.authorId,
      authorName: req.body.authorName,
      authorRole: req.body.authorRole,
      content: req.body.content,
      type: req.body.type,
      isPrivate: req.body.isPrivate,
      attachments: req.body.attachments,
      relatedGoalIds: req.body.relatedGoalIds,
      relatedInterventionIds: req.body.relatedInterventionIds,
      tags: req.body.tags,
    };

    const note = await planService.addNote(planId, noteInput);

    if (!note) {
      res.status(404).json({
        success: false,
        error: 'Care plan not found',
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: note,
      message: 'Note added successfully',
    });
  })
);

// ============================================================================
// REVIEW ROUTES
// ============================================================================

/**
 * POST /plans/:planId/reviews - Add a review
 */
router.post(
  '/plans/:planId/reviews',
  validateRequest('addReview'),
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    logger.info('POST /plans/:planId/reviews - Adding review', { planId, body: req.body });

    const reviewInput: AddReviewInput = {
      reviewerId: req.body.reviewerId,
      reviewerName: req.body.reviewerName,
      reviewerRole: req.body.reviewerRole,
      date: new Date(req.body.date),
      type: req.body.type,
      notes: req.body.notes,
      outcome: req.body.outcome,
      goalStatuses: req.body.goalStatuses,
      interventionStatuses: req.body.interventionStatuses,
      recommendations: req.body.recommendations,
      nextReviewDate: req.body.nextReviewDate ? new Date(req.body.nextReviewDate) : undefined,
      attachments: req.body.attachments,
    };

    const review = await planService.reviewPlan(planId, reviewInput);

    if (!review) {
      res.status(404).json({
        success: false,
        error: 'Care plan not found',
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: review,
      message: 'Review added successfully',
    });
  })
);

// ============================================================================
// AI INSIGHTS ROUTES
// ============================================================================

/**
 * GET /plans/:planId/insights - Get AI-generated insights
 */
router.get(
  '/plans/:planId/insights',
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    logger.info('GET /plans/:planId/insights - Generating AI insights', { planId });

    const insights = await aiInsightService.generatePlanInsights(planId);

    res.json({
      success: true,
      data: insights,
    });
  })
);

/**
 * POST /plans/:planId/insights/adjustments - Get AI-suggested adjustments
 */
router.post(
  '/plans/:planId/insights/adjustments',
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    logger.info('POST /plans/:planId/insights/adjustments - Getting AI adjustments', { planId });

    const adjustments = await goalTrackingService.aiSuggestAdjustments(planId);

    res.json({
      success: true,
      data: adjustments,
    });
  })
);

/**
 * GET /plans/:planId/insights/predictions/:goalId - Get outcome prediction for a goal
 */
router.get(
  '/plans/:planId/insights/predictions/:goalId',
  asyncHandler(async (req: Request, res: Response) => {
    const { goalId } = req.params;
    logger.info('GET /plans/:planId/insights/predictions/:goalId - Getting prediction', { goalId });

    const prediction = await aiInsightService.predictOutcome(goalId);

    if (!prediction) {
      res.status(404).json({
        success: false,
        error: 'Goal not found',
      });
      return;
    }

    res.json({
      success: true,
      data: prediction,
    });
  })
);

/**
 * GET /plans/:planId/insights/drift/:goalId - Detect goal drift
 */
router.get(
  '/plans/:planId/insights/drift/:goalId',
  asyncHandler(async (req: Request, res: Response) => {
    const { goalId } = req.params;
    logger.info('GET /plans/:planId/insights/drift/:goalId - Detecting drift', { goalId });

    const drift = await aiInsightService.detectGoalDrift(goalId);

    if (!drift) {
      res.status(404).json({
        success: false,
        error: 'Goal not found',
      });
      return;
    }

    res.json({
      success: true,
      data: drift,
    });
  })
);

/**
 * POST /suggest-goals - Suggest goals based on patient context
 */
router.post(
  '/suggest-goals',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /suggest-goals - Generating goal suggestions', { body: req.body });

    const suggestions = await aiInsightService.suggestGoals({
      patientId: req.body.patientId,
      conditions: req.body.conditions,
      previousGoals: req.body.previousGoals,
      category: req.body.category,
      constraints: req.body.constraints,
    });

    res.json({
      success: true,
      data: suggestions,
    });
  })
);

// ============================================================================
// STATISTICS & ANALYTICS ROUTES
// ============================================================================

/**
 * GET /patient/:patientId/statistics - Get patient goal statistics
 */
router.get(
  '/patient/:patientId/statistics',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId } = req.params;
    logger.info('GET /patient/:patientId/statistics - Fetching statistics', { patientId });

    const stats = await goalTrackingService.getGoalStatistics(patientId);

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /patient/:patientId/overdue - Get overdue goals for a patient
 */
router.get(
  '/patient/:patientId/overdue',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId } = req.params;
    logger.info('GET /patient/:patientId/overdue - Fetching overdue goals', { patientId });

    const overdueGoals = await goalTrackingService.getOverdueGoals(patientId);

    res.json({
      success: true,
      data: overdueGoals,
      count: overdueGoals.length,
    });
  })
);

/**
 * GET /reviews/due - Get plans due for review
 */
router.get(
  '/reviews/due',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('GET /reviews/due - Fetching plans due for review');

    const plans = await planService.getPlansDueForReview();

    res.json({
      success: true,
      data: plans,
      count: plans.length,
    });
  })
);

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /health - Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'care-plan-service',
    timestamp: new Date().toISOString(),
  });
});

export default router;
