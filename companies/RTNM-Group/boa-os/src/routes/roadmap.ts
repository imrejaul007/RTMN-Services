// ============================================================================
// Roadmap Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { roadmapService, CreateRoadmapInput } from '../services/roadmapService';
import { validateRoadmap } from '../validators/strategyValidator';
import { NotFoundError } from '../utils/errors';
import { eventBus } from '../utils/eventBus';

const router = Router();

/**
 * Create roadmap
 * POST /api/v1/roadmap
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateRoadmap(req.body);
    const input: CreateRoadmapInput = req.body;
    const roadmap = roadmapService.create(input);
    await eventBus.publish('boa.roadmap.created', { roadmapId: roadmap.id, milestoneCount: roadmap.milestones.length });
    res.status(201).json({ success: true, data: roadmap, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get roadmap by ID
 * GET /api/v1/roadmap/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roadmap = roadmapService.getById(req.params.id);
    res.json({ success: true, data: roadmap, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * List roadmaps
 * GET /api/v1/roadmap
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { strategyId, status } = req.query;
    const roadmaps = roadmapService.getAll({ strategyId, status } as any);
    res.json({ success: true, data: roadmaps, count: roadmaps.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Update milestone
 * PATCH /api/v1/roadmap/:roadmapId/milestone/:milestoneId
 */
router.patch('/:roadmapId/milestone/:milestoneId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const milestone = roadmapService.updateMilestone(req.params.roadmapId, req.params.milestoneId, req.body);
    await eventBus.publish('boa.milestone.updated', { roadmapId: req.params.roadmapId, milestoneId: milestone.id, status: milestone.status });
    res.json({ success: true, data: milestone, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get roadmap timeline
 * GET /api/v1/roadmap/:id/timeline
 */
router.get('/:id/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timeline = roadmapService.getTimeline(req.params.id);
    res.json({ success: true, data: timeline, count: timeline.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Delete roadmap
 * DELETE /api/v1/roadmap/:id
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = roadmapService.delete(req.params.id);
    if (!deleted) throw new NotFoundError(`Roadmap ${req.params.id}`);
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
