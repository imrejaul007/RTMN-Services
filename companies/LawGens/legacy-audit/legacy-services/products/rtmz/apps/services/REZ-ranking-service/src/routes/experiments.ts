import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { experimentService, CreateExperimentInput } from '../services/experimentService';
import logger from '../utils/logger';

const log = logger.child({ service: 'ExperimentRoutes' });
const router = Router();

// Validation schemas
const variantConfigSchema = Joi.object({
  weights: Joi.object().pattern(Joi.string(), Joi.number()).required(),
  diversityWeight: Joi.number().min(0).max(1).default(0.3),
  personalizationWeight: Joi.number().min(0).max(1).default(0.5),
  modelVersion: Joi.string().optional()
});

const variantSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  config: variantConfigSchema.required(),
  traffic: Joi.number().min(0).max(100).required()
});

const createExperimentSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().max(500).optional(),
  variants: Joi.array().items(variantSchema).min(2).max(10).required(),
  targeting: Joi.object({
    userSegments: Joi.array().items(Joi.string()).optional(),
    countries: Joi.array().items(Joi.string()).optional(),
    platforms: Joi.array().items(Joi.string()).optional(),
    minImpressions: Joi.number().integer().min(0).optional()
  }).optional()
});

const updateTrafficSchema = Joi.object({
  traffic: Joi.object().pattern(Joi.string(), Joi.number()).required()
});

// POST /experiments - Create A/B experiment
router.post('/experiments', async (req: Request, res: Response) => {
  try {
    const { error, value } = createExperimentSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const input: CreateExperimentInput = {
      name: value.name,
      description: value.description,
      variants: value.variants.map((v: any) => ({
        name: v.name,
        description: v.description,
        config: v.config,
        traffic: v.traffic
      })),
      targeting: value.targeting
    };

    const experiment = await experimentService.createExperiment(input);

    log.info('Experiment created via API', { experimentId: experiment.experimentId });

    res.status(201).json({
      success: true,
      data: {
        experimentId: experiment.experimentId,
        name: experiment.name,
        status: experiment.status,
        variants: experiment.variants.map(v => ({
          id: v.id,
          name: v.name,
          traffic: v.traffic
        })),
        createdAt: experiment.createdAt
      }
    });
  } catch (error) {
    log.error('Create experiment failed', { error, body: req.body });
    res.status(500).json({
      error: 'Failed to create experiment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /experiments - List experiments
router.get('/experiments', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const experiments = await experimentService.listExperiments(status);

    res.json({
      success: true,
      data: experiments.map(exp => ({
        experimentId: exp.experimentId,
        name: exp.name,
        status: exp.status,
        variantCount: exp.variants.length,
        totalImpressions: exp.variants.reduce((sum, v) => sum + v.metrics.impressions, 0),
        totalClicks: exp.variants.reduce((sum, v) => sum + v.metrics.clicks, 0),
        startDate: exp.startDate,
        createdAt: exp.createdAt
      })),
      meta: {
        count: experiments.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('List experiments failed', { error });
    res.status(500).json({
      error: 'Failed to list experiments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /experiments/:id - Get experiment details
router.get('/experiments/:id', async (req: Request, res: Response) => {
  try {
    const experiment = await experimentService.getExperiment(req.params.id);

    if (!experiment) {
      return res.status(404).json({
        error: 'Experiment not found',
        experimentId: req.params.id
      });
    }

    res.json({
      success: true,
      data: experiment
    });
  } catch (error) {
    log.error('Get experiment failed', { error, experimentId: req.params.id });
    res.status(500).json({
      error: 'Failed to get experiment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /experiments/:id/stats - Get experiment stats
router.get('/experiments/:id/stats', async (req: Request, res: Response) => {
  try {
    const stats = await experimentService.getStats(req.params.id);

    if (!stats) {
      return res.status(404).json({
        error: 'Experiment not found',
        experimentId: req.params.id
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    log.error('Get experiment stats failed', { error, experimentId: req.params.id });
    res.status(500).json({
      error: 'Failed to get experiment stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /experiments/:id/start - Start experiment
router.post('/experiments/:id/start', async (req: Request, res: Response) => {
  try {
    const experiment = await experimentService.startExperiment(req.params.id);

    log.info('Experiment started via API', { experimentId: req.params.id });

    res.json({
      success: true,
      data: {
        experimentId: experiment.experimentId,
        status: experiment.status,
        startDate: experiment.startDate
      }
    });
  } catch (error) {
    log.error('Start experiment failed', { error, experimentId: req.params.id });
    res.status(400).json({
      error: 'Failed to start experiment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /experiments/:id/pause - Pause experiment
router.post('/experiments/:id/pause', async (req: Request, res: Response) => {
  try {
    const experiment = await experimentService.pauseExperiment(req.params.id);

    log.info('Experiment paused via API', { experimentId: req.params.id });

    res.json({
      success: true,
      data: {
        experimentId: experiment.experimentId,
        status: experiment.status
      }
    });
  } catch (error) {
    log.error('Pause experiment failed', { error, experimentId: req.params.id });
    res.status(400).json({
      error: 'Failed to pause experiment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /experiments/:id/complete - Complete experiment
router.post('/experiments/:id/complete', async (req: Request, res: Response) => {
  try {
    const experiment = await experimentService.completeExperiment(req.params.id);

    log.info('Experiment completed via API', { experimentId: req.params.id });

    res.json({
      success: true,
      data: {
        experimentId: experiment.experimentId,
        status: experiment.status,
        endDate: experiment.endDate
      }
    });
  } catch (error) {
    log.error('Complete experiment failed', { error, experimentId: req.params.id });
    res.status(400).json({
      error: 'Failed to complete experiment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /experiments/:id/reallocate - Adaptive traffic reallocation
router.post('/experiments/:id/reallocate', async (req: Request, res: Response) => {
  try {
    await experimentService.adaptiveTrafficAllocation(req.params.id);
    const experiment = await experimentService.getExperiment(req.params.id);

    log.info('Traffic reallocated via API', { experimentId: req.params.id });

    res.json({
      success: true,
      data: {
        experimentId: experiment?.experimentId,
        variants: experiment?.variants.map(v => ({
          id: v.id,
          name: v.name,
          traffic: v.traffic,
          ctr: v.metrics.impressions > 0
            ? v.metrics.clicks / v.metrics.impressions
            : 0
        }))
      }
    });
  } catch (error) {
    log.error('Traffic reallocation failed', { error, experimentId: req.params.id });
    res.status(500).json({
      error: 'Failed to reallocate traffic',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
