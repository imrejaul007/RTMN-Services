import { Router, Request, Response, NextFunction } from 'express';
import { feedbackService } from '../services/feedbackService';
import { validateFeedback } from '../validators/syncValidator';
import { NotFoundError } from '../utils/errors';

const router = Router();

/**
 * Submit feedback
 * POST /api/v1/feedback
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateFeedback(req.body);
    const fb = feedbackService.capture(req.body);
    res.status(201).json({ success: true, data: fb, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get feedback for an objective
 * GET /api/v1/feedback/objective/:boaObjectiveId
 */
router.get('/objective/:boaObjectiveId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feedbacks = feedbackService.getForObjective(req.params.boaObjectiveId);
    res.json({ success: true, data: feedbacks, count: feedbacks.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get unprocessed feedback
 * GET /api/v1/feedback/unprocessed
 */
router.get('/unprocessed', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const feedbacks = feedbackService.getUnprocessed();
    res.json({ success: true, data: feedbacks, count: feedbacks.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get by severity
 * GET /api/v1/feedback/severity/:severity
 */
router.get('/severity/:severity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feedbacks = feedbackService.getBySeverity(req.params.severity as any);
    res.json({ success: true, data: feedbacks, count: feedbacks.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Mark feedback as processed
 * POST /api/v1/feedback/:id/process
 */
router.post('/:id/process', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const success = feedbackService.markProcessed(req.params.id);
    if (!success) throw new NotFoundError(`Feedback ${req.params.id}`);
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get feedback stats
 * GET /api/v1/feedback/stats/summary
 */
router.get('/stats/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = feedbackService.getStats();
    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
