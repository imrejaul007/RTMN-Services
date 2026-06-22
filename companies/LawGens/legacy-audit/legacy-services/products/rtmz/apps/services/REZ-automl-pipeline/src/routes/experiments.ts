/**
 * Experiments Router
 * API routes for managing AutoML experiments
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ExperimentModel, CreateExperimentRequest, ExperimentListQuery, ExperimentUpdate } from '../models/Experiment';
import { experimentTracker, ExperimentSummary } from '../services/experimentTracker';

const router = Router();
const experimentModel = new ExperimentModel();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

// Create experiment
router.post(
  '/',
  [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('config').isObject().withMessage('Config is required'),
    body('config.taskType').isIn(['classification', 'regression', 'clustering']).withMessage('Invalid task type'),
    body('config.targetColumn').isString().notEmpty().withMessage('Target column is required'),
    body('description').optional().isString(),
    body('tags').optional().isArray(),
    body('userId').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const request: CreateExperimentRequest = {
        name: req.body.name,
        description: req.body.description,
        config: req.body.config,
        tags: req.body.tags,
        userId: req.body.userId
      };

      const experiment = await experimentModel.create(request);
      res.status(201).json(experiment);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create experiment';
      res.status(500).json({ error: message });
    }
  }
);

// List experiments
router.get(
  '/',
  [
    query('status').optional().isIn(['pending', 'running', 'completed', 'failed', 'cancelled']),
    query('taskType').optional().isIn(['classification', 'regression', 'clustering']),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 }),
    query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'name']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const queryParams: ExperimentListQuery = {
        status: req.query.status as ExperimentListQuery['status'],
        taskType: req.query.taskType as ExperimentListQuery['taskType'],
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
        sortBy: req.query.sortBy as ExperimentListQuery['sortBy'],
        sortOrder: req.query.sortOrder as ExperimentListQuery['sortOrder']
      };

      const experiments = await experimentModel.findAll(queryParams);
      const total = await experimentModel.count(queryParams);

      res.json({
        experiments,
        total,
        limit: queryParams.limit || 100,
        offset: queryParams.offset || 0
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list experiments';
      res.status(500).json({ error: message });
    }
  }
);

// Get experiment by ID
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const experiment = await experimentModel.findById(req.params.id);

      if (!experiment) {
        res.status(404).json({ error: 'Experiment not found' });
        return;
      }

      res.json(experiment);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get experiment';
      res.status(500).json({ error: message });
    }
  }
);

// Update experiment
router.patch(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('status').optional().isIn(['pending', 'running', 'completed', 'failed', 'cancelled']),
    body('result').optional().isObject(),
    body('error').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updateData: ExperimentUpdate = {
        status: req.body.status,
        result: req.body.result,
        error: req.body.error
      };

      const experiment = await experimentModel.update(req.params.id, updateData);

      if (!experiment) {
        res.status(404).json({ error: 'Experiment not found' });
        return;
      }

      res.json(experiment);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update experiment';
      res.status(500).json({ error: message });
    }
  }
);

// Delete experiment
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const deleted = await experimentModel.delete(req.params.id);

      if (!deleted) {
        res.status(404).json({ error: 'Experiment not found' });
        return;
      }

      // Clean up experiment tracker data
      await experimentTracker.deleteExperimentHistory(req.params.id);

      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete experiment';
      res.status(500).json({ error: message });
    }
  }
);

// Get experiment results
router.get(
  '/:id/results',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const experiment = await experimentModel.findById(req.params.id);

      if (!experiment) {
        res.status(404).json({ error: 'Experiment not found' });
        return;
      }

      if (!experiment.result) {
        res.status(404).json({ error: 'Experiment has no results yet' });
        return;
      }

      // Get additional metrics from tracker
      let summary: ExperimentSummary | null = null;
      try {
        summary = await experimentTracker.generateSummary(req.params.id);
      } catch {
        // Summary not available
      }

      res.json({
        experimentId: experiment.id,
        name: experiment.name,
        status: experiment.status,
        result: experiment.result,
        summary: summary || undefined,
        createdAt: experiment.createdAt,
        completedAt: experiment.completedAt
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get experiment results';
      res.status(500).json({ error: message });
    }
  }
);

// Get experiment metrics history
router.get(
  '/:id/metrics',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const metricName = req.query.metric as string | undefined;
      const jobId = req.query.jobId as string | undefined;

      if (metricName) {
        const history = await experimentTracker.getMetricHistory(req.params.id, metricName, jobId);
        res.json({ experimentId: req.params.id, metric: metricName, history });
      } else {
        const bestMetrics = await experimentTracker.getBestMetrics(req.params.id);
        res.json({ experimentId: req.params.id, bestMetrics });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get experiment metrics';
      res.status(500).json({ error: message });
    }
  }
);

// Compare experiments
router.post(
  '/compare',
  [
    body('experimentIds').isArray({ min: 2 }).withMessage('At least 2 experiment IDs required'),
    body('experimentIds.*').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { experimentIds } = req.body;

      // Verify all experiments exist
      for (const id of experimentIds) {
        const exp = await experimentModel.findById(id);
        if (!exp) {
          res.status(404).json({ error: `Experiment ${id} not found` });
          return;
        }
      }

      const comparison = await experimentTracker.compareExperiments(experimentIds);
      res.json(comparison);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to compare experiments';
      res.status(500).json({ error: message });
    }
  }
);

// Export experiment metrics
router.get(
  '/:id/export',
  [
    param('id').isString().notEmpty(),
    query('format').optional().isIn(['json', 'csv'])
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const metrics = await experimentTracker.exportMetrics(req.params.id, format);

      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}_metrics.${format}"`);
      res.send(metrics);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export metrics';
      res.status(500).json({ error: message });
    }
  }
);

export default router;
