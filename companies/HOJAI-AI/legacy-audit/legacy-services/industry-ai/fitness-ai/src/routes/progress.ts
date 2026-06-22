/**
 * Fitness AI - Progress Routes
 *
 * REST API endpoints for progress tracking
 */

import { Router, Request, Response, NextFunction } from 'express';
import { progressService } from '../services/progress.service';

const router = Router();

/**
 * GET /api/progress
 * Get member's progress history
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, startDate, endDate, limit } = req.query;
    const progress = await progressService.getMemberProgress(memberId as string, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ entries: progress, count: progress.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/progress/latest
 * Get latest progress entry
 */
router.get('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.query;
    if (!memberId) {
      res.status(400).json({ error: 'memberId is required' });
      return;
    }
    const entry = await progressService.getLatestProgress(memberId as string);
    res.json(entry || { message: 'No progress entries found' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/progress/stats
 * Get progress statistics
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.query;
    if (!memberId) {
      res.status(400).json({ error: 'memberId is required' });
      return;
    }
    const stats = await progressService.getProgressStats(memberId as string);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/progress/chart
 * Get progress chart data
 */
router.get('/chart', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, metrics, startDate, endDate } = req.query;
    if (!memberId) {
      res.status(400).json({ error: 'memberId is required' });
      return;
    }

    const chartData = await progressService.getProgressChart(
      memberId as string,
      (metrics as string || 'weight,bodyFat').split(',') as any,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json(chartData);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/progress/:progressId
 * Get progress entry by ID
 */
router.get('/:progressId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await progressService.getEntryById(req.params.progressId);
    if (!entry) {
      res.status(404).json({ error: 'Progress entry not found' });
      return;
    }
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/progress
 * Create a progress entry
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await progressService.createEntry(req.body);
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/progress/:progressId
 * Update progress entry
 */
router.patch('/:progressId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await progressService.updateEntry(req.params.progressId, req.body);
    if (!entry) {
      res.status(404).json({ error: 'Progress entry not found' });
      return;
    }
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/progress/:progressId/photo
 * Add photo to progress entry
 */
router.post('/:progressId/photo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { photoUrl } = req.body;
    const entry = await progressService.addPhoto(req.params.progressId, photoUrl);
    if (!entry) {
      res.status(404).json({ error: 'Progress entry not found' });
      return;
    }
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/progress/:progressId/goal
 * Mark goal as achieved
 */
router.post('/:progressId/goal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goal } = req.body;
    const entry = await progressService.markGoalAchieved(req.params.progressId, goal);
    if (!entry) {
      res.status(404).json({ error: 'Progress entry not found' });
      return;
    }
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/progress/:progressId
 * Delete progress entry
 */
router.delete('/:progressId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await progressService.deleteEntry(req.params.progressId);
    if (!deleted) {
      res.status(404).json({ error: 'Progress entry not found' });
      return;
    }
    res.json({ success: true, message: 'Progress entry deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;