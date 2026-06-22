/**
 * Models Router
 * API routes for model registry and model comparison
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ModelRegistry, ModelListQuery, ModelCompareRequest } from '../models/Model';

const router = Router();
const modelRegistry = new ModelRegistry();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

// List models
router.get(
  '/',
  [
    query('status').optional().isIn(['training', 'ready', 'deployed', 'archived', 'failed']),
    query('type').optional().isIn(['classifier', 'regressor', 'clusterer', 'transformer']),
    query('name').optional().isString(),
    query('experimentId').optional().isString(),
    query('tags').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 }),
    query('sortBy').optional().isIn(['createdAt', 'name', 'metrics.accuracy', 'metrics.f1Score']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tags = req.query.tags
        ? (req.query.tags as string).split(',').map(t => t.trim())
        : undefined;

      const queryParams: ModelListQuery = {
        status: req.query.status as ModelListQuery['status'],
        type: req.query.type as ModelListQuery['type'],
        name: req.query.name as string | undefined,
        experimentId: req.query.experimentId as string | undefined,
        tags,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
        sortBy: req.query.sortBy as ModelListQuery['sortBy'],
        sortOrder: req.query.sortOrder as ModelListQuery['sortOrder']
      };

      const models = await modelRegistry.findAll(queryParams);
      const total = await modelRegistry.count(queryParams);

      res.json({
        models,
        total,
        limit: queryParams.limit || 100,
        offset: queryParams.offset || 0
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list models';
      res.status(500).json({ error: message });
    }
  }
);

// Get model by ID
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const model = await modelRegistry.findById(req.params.id);

      if (!model) {
        res.status(404).json({ error: 'Model not found' });
        return;
      }

      res.json(model);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get model';
      res.status(500).json({ error: message });
    }
  }
);

// Update model
router.patch(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('status').optional().isIn(['training', 'ready', 'deployed', 'archived', 'failed']),
    body('metrics').optional().isObject(),
    body('description').optional().isString(),
    body('tags').optional().isArray()
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const model = await modelRegistry.update(req.params.id, req.body);

      if (!model) {
        res.status(404).json({ error: 'Model not found' });
        return;
      }

      res.json(model);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update model';
      res.status(500).json({ error: message });
    }
  }
);

// Delete model
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const deleted = await modelRegistry.delete(req.params.id);

      if (!deleted) {
        res.status(404).json({ error: 'Model not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete model';
      res.status(500).json({ error: message });
    }
  }
);

// Get model versions
router.get(
  '/:id/versions',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const model = await modelRegistry.findById(req.params.id);

      if (!model) {
        res.status(404).json({ error: 'Model not found' });
        return;
      }

      const versions = await modelRegistry.findByName(model.name);

      res.json({
        modelName: model.name,
        versions: versions.map(v => ({
          id: v.id,
          version: v.version,
          status: v.status,
          metrics: v.metrics,
          createdAt: v.createdAt
        }))
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get model versions';
      res.status(500).json({ error: message });
    }
  }
);

// Compare models
router.post(
  '/compare',
  [
    body('modelIds').isArray({ min: 2 }).withMessage('At least 2 model IDs required'),
    body('modelIds.*').isString(),
    body('metrics').optional().isArray()
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { modelIds, metrics } = req.body as ModelCompareRequest;

      // Verify all models exist
      for (const id of modelIds) {
        const model = await modelRegistry.findById(id);
        if (!model) {
          res.status(404).json({ error: `Model ${id} not found` });
          return;
        }
      }

      const comparisons = await modelRegistry.compare(modelIds, metrics);

      // Get model details for response
      const models = await Promise.all(
        modelIds.map(id => modelRegistry.findById(id))
      );

      res.json({
        models: models.filter((m): m is NonNullable<typeof m> => m !== null),
        comparisons
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to compare models';
      res.status(500).json({ error: message });
    }
  }
);

// Get best model for experiment
router.get(
  '/best',
  [
    query('experimentId').optional().isString(),
    query('type').optional().isIn(['classifier', 'regressor', 'clusterer', 'transformer']),
    query('metric').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { experimentId, type, metric } = req.query;

      // Get all models matching criteria
      const queryParams: ModelListQuery = {
        status: 'ready',
        type: type as ModelListQuery['type'],
        experimentId: experimentId as string | undefined
      };

      const models = await modelRegistry.findAll(queryParams);

      if (models.length === 0) {
        res.status(404).json({ error: 'No models found matching criteria' });
        return;
      }

      // Find best model by specified metric
      const metricKey = (metric || 'accuracy') as keyof typeof models[0]['metrics'];
      const bestModel = models.reduce((best, current) => {
        const bestScore = (best.metrics[metricKey] as number) || 0;
        const currentScore = (current.metrics[metricKey] as number) || 0;
        return currentScore > bestScore ? current : best;
      });

      res.json({
        bestModel,
        metric: metricKey,
        score: bestModel.metrics[metricKey]
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get best model';
      res.status(500).json({ error: message });
    }
  }
);

// Get model leaderboard
router.get(
  '/leaderboard',
  [
    query('type').optional().isIn(['classifier', 'regressor', 'clusterer', 'transformer']),
    query('metric').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const type = req.query.type as 'classifier' | 'regressor' | 'clusterer' | 'transformer' | undefined;
      const metric = (req.query.metric as string) || 'accuracy';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const models = await modelRegistry.findAll({
        status: 'ready',
        type,
        sortBy: 'metrics.accuracy',
        sortOrder: 'desc',
        limit: limit * 2 // Get more to filter properly
      });

      // Sort by specified metric
      const metricKey = metric as keyof typeof models[0]['metrics'];
      const sortedModels = models
        .filter(m => m.metrics[metricKey] !== undefined)
        .sort((a, b) => {
          const aScore = (a.metrics[metricKey] as number) || 0;
          const bScore = (b.metrics[metricKey] as number) || 0;
          return bScore - aScore;
        })
        .slice(0, limit)
        .map((m, index) => ({
          rank: index + 1,
          modelId: m.id,
          name: m.name,
          version: m.version,
          score: m.metrics[metricKey],
          type: m.type,
          algorithm: m.metadata.algorithm,
          createdAt: m.createdAt
        }));

      res.json({
        leaderboard: sortedModels,
        metric,
        total: sortedModels.length
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get leaderboard';
      res.status(500).json({ error: message });
    }
  }
);

// Download model
router.get(
  '/:id/download',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const model = await modelRegistry.findById(req.params.id);

      if (!model) {
        res.status(404).json({ error: 'Model not found' });
        return;
      }

      if (model.status !== 'ready' && model.status !== 'deployed') {
        res.status(400).json({ error: 'Model is not ready for download' });
        return;
      }

      // In a real implementation, this would stream the model file
      res.json({
        message: 'Model download endpoint',
        modelId: model.id,
        filePath: model.filePath,
        downloadUrl: `/api/models/${model.id}/file`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download model';
      res.status(500).json({ error: message });
    }
  }
);

export default router;
