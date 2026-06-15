// ============================================================================
// Objective Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { objectiveService, CreateObjectiveInput, UpdateObjectiveInput } from '../services/objectiveService';
import { validateObjective } from '../validators/strategyValidator';
import { NotFoundError, ValidationError } from '../utils/errors';
import { eventBus } from '../utils/eventBus';

const router = Router();

/**
 * Create new objective
 * POST /api/v1/objective
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateObjective(req.body);
    const input: CreateObjectiveInput = req.body;
    const objective = objectiveService.create(input);
    await eventBus.publish('boa.objective.created', { objectiveId: objective.id, title: objective.title });
    res.status(201).json({ success: true, data: objective, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get objective by ID
 * GET /api/v1/objective/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const objective = objectiveService.getById(req.params.id);
    res.json({ success: true, data: objective, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * List objectives with filters
 * GET /api/v1/objective
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { strategyId, owner, status } = req.query;
    const objectives = objectiveService.getAll({ strategyId, owner, status } as any);
    res.json({ success: true, data: objectives, count: objectives.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Update objective
 * PATCH /api/v1/objective/:id
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: UpdateObjectiveInput = req.body;
    const objective = objectiveService.update(req.params.id, input);
    await eventBus.publish('boa.objective.updated', { objectiveId: objective.id, status: objective.status });
    res.json({ success: true, data: objective, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Update key result progress
 * POST /api/v1/objective/:id/keyresult/:krId/progress
 */
router.post('/:id/keyresult/:krId/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value } = req.body;
    if (typeof value !== 'number') throw new ValidationError('value must be a number');
    const objective = objectiveService.updateProgress(req.params.id, req.params.krId, value);
    await eventBus.publish('boa.keyresult.progress', { objectiveId: objective.id, progress: objective.progress });
    res.json({ success: true, data: objective, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Delete objective
 * DELETE /api/v1/objective/:id
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = objectiveService.delete(req.params.id);
    if (!deleted) throw new NotFoundError(`Objective ${req.params.id}`);
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get progress summary
 * GET /api/v1/objective/summary/all
 */
router.get('/summary/all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = objectiveService.getProgressSummary();
    res.json({ success: true, data: summary, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
