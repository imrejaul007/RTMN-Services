/**
 * Fitness AI - Workout Routes
 *
 * REST API endpoints for workout plan management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { workoutService } from '../services/workout.service';
import { WorkoutDifficulty } from '../models';

const router = Router();

/**
 * GET /api/workouts
 * List member's workout plans
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, activeOnly } = req.query;
    const plans = await workoutService.getMemberPlans(
      memberId as string,
      activeOnly === 'true'
    );
    res.json({ plans, count: plans.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workouts/:planId
 * Get workout plan by ID
 */
router.get('/:planId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await workoutService.getPlanById(req.params.planId);
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workouts/:planId/progress
 * Get plan progress
 */
router.get('/:planId/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const progress = await workoutService.getPlanProgress(req.params.planId);
    if (!progress) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }
    res.json(progress);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workouts
 * Create a new workout plan
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await workoutService.createPlan(req.body);
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/workouts/:planId
 * Update workout plan
 */
router.patch('/:planId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await workoutService.updatePlan(req.params.planId, req.body);
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workouts/:planId/activate
 * Activate workout plan
 */
router.post('/:planId/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await workoutService.activatePlan(req.params.planId);
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workouts/:planId/complete
 * Complete a workout session
 */
router.post('/:planId/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dayNumber } = req.body;
    const plan = await workoutService.completeSession(req.params.planId, dayNumber || 1);
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workouts/:planId
 * Delete workout plan
 */
router.delete('/:planId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await workoutService.deletePlan(req.params.planId);
    if (!deleted) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }
    res.json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workouts/templates
 * Get workout templates
 */
router.get('/templates/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = workoutService.getWorkoutTemplates();
    res.json({ templates, count: templates.length });
  } catch (error) {
    next(error);
  }
});

export default router;