import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { feedbackService, FeedbackInput } from '../services/feedbackService';
import logger from '../utils/logger';

const log = logger.child({ service: 'FeedbackRoutes' });
const router = Router();

// Validation schemas
const feedbackInputSchema = Joi.object({
  userId: Joi.string().required(),
  itemId: Joi.string().required(),
  itemType: Joi.string().required(),
  eventType: Joi.string()
    .valid('impression', 'click', 'view', 'conversion', 'purchase', 'dismiss')
    .required(),
  experimentId: Joi.string().optional(),
  variantId: Joi.string().optional(),
  position: Joi.number().integer().min(0).optional(),
  score: Joi.number().min(0).max(1).optional(),
  context: Joi.object({
    location: Joi.string().optional(),
    device: Joi.string().optional(),
    timeOfDay: Joi.string().optional(),
    sessionId: Joi.string().optional(),
    referrer: Joi.string().optional()
  }).optional(),
  metadata: Joi.object({
    duration: Joi.number().min(0).optional(),
    scrollDepth: Joi.number().min(0).max(1).optional(),
    revenue: Joi.number().min(0).optional(),
    quantity: Joi.number().integer().min(0).optional(),
    rating: Joi.number().min(0).max(5).optional()
  }).optional()
});

const batchFeedbackSchema = Joi.object({
  feedback: Joi.array().items(feedbackInputSchema).min(1).max(100).required()
});

// POST /rank/feedback - Log click/conversion feedback
router.post('/rank/feedback', async (req: Request, res: Response) => {
  try {
    const { error, value } = feedbackInputSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const input: FeedbackInput = value;
    const feedback = await feedbackService.logFeedback(input);

    log.info('Feedback logged via API', {
      feedbackId: feedback.feedbackId,
      userId: input.userId,
      itemId: input.itemId,
      eventType: input.eventType
    });

    res.status(201).json({
      success: true,
      data: {
        feedbackId: feedback.feedbackId,
        timestamp: feedback.timestamp
      }
    });
  } catch (error) {
    log.error('Log feedback failed', { error, body: req.body });
    res.status(500).json({
      error: 'Failed to log feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /rank/feedback/batch - Log batch feedback
router.post('/rank/feedback/batch', async (req: Request, res: Response) => {
  try {
    const { error, value } = batchFeedbackSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const inputs: FeedbackInput[] = value.feedback;
    const results = await feedbackService.logBatchFeedback(inputs);

    log.info('Batch feedback logged via API', { count: results.length });

    res.status(201).json({
      success: true,
      data: {
        count: results.length,
        feedbackIds: results.map(f => f.feedbackId)
      }
    });
  } catch (error) {
    log.error('Log batch feedback failed', { error });
    res.status(500).json({
      error: 'Failed to log batch feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /feedback/user/:userId - Get feedback for a user
router.get('/feedback/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const options = {
      itemType: req.query.itemType as string | undefined,
      eventType: req.query.eventType as string | undefined,
      limit: parseInt(req.query.limit as string) || 100,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const feedback = await feedbackService.getFeedbackForUser(userId, options);

    res.json({
      success: true,
      data: feedback,
      meta: {
        count: feedback.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('Get user feedback failed', { error, userId: req.params.userId });
    res.status(500).json({
      error: 'Failed to get user feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /feedback/item/:itemId - Get feedback for an item
router.get('/feedback/item/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const options = {
      eventType: req.query.eventType as string | undefined,
      limit: parseInt(req.query.limit as string) || 100,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const feedback = await feedbackService.getFeedbackForItem(itemId, options);

    res.json({
      success: true,
      data: feedback,
      meta: {
        count: feedback.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('Get item feedback failed', { error, itemId: req.params.itemId });
    res.status(500).json({
      error: 'Failed to get item feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /feedback/item/:itemId/stats - Get stats for an item
router.get('/feedback/item/:itemId/stats', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const stats = await feedbackService.getStatsForItem(itemId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    log.error('Get item stats failed', { error, itemId: req.params.itemId });
    res.status(500).json({
      error: 'Failed to get item stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /feedback/item/:itemId/positions - Get click positions for an item
router.get('/feedback/item/:itemId/positions', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const positions = await feedbackService.getClickPositions(itemId);

    res.json({
      success: true,
      data: {
        itemId,
        positions,
        count: positions.length,
        avgPosition: positions.length > 0
          ? positions.reduce((a, b) => a + b, 0) / positions.length
          : null
      }
    });
  } catch (error) {
    log.error('Get positions failed', { error, itemId: req.params.itemId });
    res.status(500).json({
      error: 'Failed to get positions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /feedback/activity - Get recent activity
router.get('/feedback/activity', async (req: Request, res: Response) => {
  try {
    const options = {
      limit: Math.min(parseInt(req.query.limit as string) || 100, 500),
      eventTypes: req.query.eventTypes
        ? (req.query.eventTypes as string).split(',')
        : undefined
    };

    const activity = await feedbackService.getRecentActivity(options);

    res.json({
      success: true,
      data: activity,
      meta: {
        count: activity.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('Get activity failed', { error });
    res.status(500).json({
      error: 'Failed to get activity',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
