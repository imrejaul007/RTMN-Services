/**
 * Training Router
 * API routes for managing training jobs
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { trainingService, TrainingStatistics } from '../services/trainingService';
import { TrainingJobListQuery, CreateTrainingJobRequest } from '../models/TrainingJob';

const router = Router();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

// Start training job
router.post(
  '/start',
  [
    body('name').isString().notEmpty().withMessage('Job name is required'),
    body('config').isObject().withMessage('Training config is required'),
    body('config.targetColumn').isString().notEmpty().withMessage('Target column is required'),
    body('experimentId').optional().isString(),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('maxRetries').optional().isInt({ min: 0, max: 10 }),
    body('tags').optional().isArray(),
    body('userId').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const request: CreateTrainingJobRequest = {
        name: req.body.name,
        config: req.body.config,
        experimentId: req.body.experimentId,
        priority: req.body.priority,
        maxRetries: req.body.maxRetries,
        tags: req.body.tags,
        userId: req.body.userId
      };

      const job = await trainingService.createJob(request);

      res.status(201).json({
        message: 'Training job created and queued',
        job
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start training job';
      res.status(500).json({ error: message });
    }
  }
);

// List training jobs
router.get(
  '/',
  [
    query('status').optional().isIn(['queued', 'running', 'completed', 'failed', 'cancelled']),
    query('experimentId').optional().isString(),
    query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 }),
    query('sortBy').optional().isIn(['createdAt', 'priority', 'status']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const queryParams: TrainingJobListQuery = {
        status: req.query.status as TrainingJobListQuery['status'],
        experimentId: req.query.experimentId as string | undefined,
        priority: req.query.priority as TrainingJobListQuery['priority'],
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
        sortBy: req.query.sortBy as TrainingJobListQuery['sortBy'],
        sortOrder: req.query.sortOrder as TrainingJobListQuery['sortOrder']
      };

      const jobs = await trainingService.getJobs(queryParams);
      res.json({ jobs });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list training jobs';
      res.status(500).json({ error: message });
    }
  }
);

// Get training job status
router.get(
  '/:jobId/status',
  [param('jobId').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const job = await trainingService.getJob(req.params.jobId);

      if (!job) {
        res.status(404).json({ error: 'Training job not found' });
        return;
      }

      res.json({
        jobId: job.id,
        name: job.name,
        status: job.status,
        progress: job.progress,
        progressMessage: job.progressMessage,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        actualDuration: job.actualDuration,
        error: job.error,
        retryCount: job.retryCount
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get training job status';
      res.status(500).json({ error: message });
    }
  }
);

// Get training job details
router.get(
  '/:jobId',
  [param('jobId').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const job = await trainingService.getJob(req.params.jobId);

      if (!job) {
        res.status(404).json({ error: 'Training job not found' });
        return;
      }

      res.json(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get training job';
      res.status(500).json({ error: message });
    }
  }
);

// Cancel training job
router.post(
  '/:jobId/cancel',
  [param('jobId').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const job = await trainingService.cancelJob(req.params.jobId);

      if (!job) {
        res.status(404).json({ error: 'Training job not found' });
        return;
      }

      res.json({
        message: 'Training job cancelled',
        job
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel training job';
      res.status(500).json({ error: message });
    }
  }
);

// Retry training job
router.post(
  '/:jobId/retry',
  [param('jobId').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const job = await trainingService.retryJob(req.params.jobId);

      if (!job) {
        res.status(404).json({ error: 'Training job not found' });
        return;
      }

      res.json({
        message: 'Training job queued for retry',
        job
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retry training job';
      res.status(500).json({ error: message });
    }
  }
);

// Get training job result
router.get(
  '/:jobId/result',
  [param('jobId').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const job = await trainingService.getJob(req.params.jobId);

      if (!job) {
        res.status(404).json({ error: 'Training job not found' });
        return;
      }

      if (job.status !== 'completed') {
        res.status(400).json({
          error: 'Job has not completed yet',
          status: job.status
        });
        return;
      }

      if (!job.result) {
        res.status(404).json({ error: 'No result available for this job' });
        return;
      }

      res.json({
        jobId: job.id,
        result: job.result
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get training job result';
      res.status(500).json({ error: message });
    }
  }
);

// Get training statistics
router.get(
  '/stats/summary',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const stats: TrainingStatistics = await trainingService.getStatistics();
      res.json(stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get training statistics';
      res.status(500).json({ error: message });
    }
  }
);

// Trigger queue processing
router.post(
  '/queue/process',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      await trainingService.processQueue();
      res.json({ message: 'Queue processing triggered' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process queue';
      res.status(500).json({ error: message });
    }
  }
);

export default router;
