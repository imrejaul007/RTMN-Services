/**
 * API Routes for HOJAI AI Churn Model Service
 */

import { Router, Request, Response } from 'express';
import { churnModelService } from '../services/modelService.js';
import {
  churnPredictionRequestSchema,
  batchTrainRequestSchema,
  modelIdSchema,
  ChurnPredictionRequestInput,
  BatchTrainRequestInput,
  ModelIdInput,
} from '../utils/validation.js';
import type {
  ChurnPredictionRequest,
  ChurnPredictionResponse,
  TrainResponse,
  ModelInfo,
  HealthCheckResponse,
  ApiError,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Track service start time
const startTime = Date.now();

/**
 * POST /api/predict
 * Predict churn probability for a customer
 */
router.post('/predict', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const parseResult = churnPredictionRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      const error: ApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        },
      };
      logger.warn('Prediction validation failed', { errors: parseResult.error.errors });
      return res.status(400).json(error);
    }

    const input = parseResult.data as ChurnPredictionRequestInput;

    // Make prediction
    const prediction = churnModelService.predict(input as ChurnPredictionRequest);

    const response = res.status(200).json(prediction);
    logger.info('Prediction successful', { customerId: input.customerId });
    return response;
  } catch (error) {
    logger.error('Prediction failed', { error });
    const errorResponse: ApiError = {
      error: {
        code: 'PREDICTION_ERROR',
        message: 'Failed to make prediction',
        details: error instanceof Error ? { message: error.message } : undefined,
      },
    };
    return res.status(500).json(errorResponse);
  }
});

/**
 * POST /api/train
 * Train the model with new data
 */
router.post('/train', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const parseResult = batchTrainRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      const error: ApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        },
      };
      logger.warn('Training validation failed', { errors: parseResult.error.errors });
      return res.status(400).json(error);
    }

    const input = parseResult.data as BatchTrainRequestInput;

    // Train model
    const result = await churnModelService.train(input.samples);

    const response = res.status(200).json(result);
    logger.info('Training successful', {
      modelId: result.modelId,
      samples: input.samples.length,
    });
    return response;
  } catch (error) {
    logger.error('Training failed', { error });
    const errorResponse: ApiError = {
      error: {
        code: 'TRAINING_ERROR',
        message: 'Failed to train model',
        details: error instanceof Error ? { message: error.message } : undefined,
      },
    };
    return res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/model/:id
 * Get model information
 */
router.get('/model/:id', (req: Request, res: Response) => {
  try {
    // Validate model ID
    const parseResult = modelIdSchema.safeParse(req.params);

    if (!parseResult.success) {
      const error: ApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid model ID',
          details: parseResult.error.flatten(),
        },
      };
      return res.status(400).json(error);
    }

    const { id } = parseResult.data as ModelIdInput;

    // Get model info
    const modelInfo = churnModelService.getModelInfo(id);

    return res.status(200).json(modelInfo);
  } catch (error) {
    logger.error('Get model info failed', { error });
    const errorResponse: ApiError = {
      error: {
        code: 'MODEL_ERROR',
        message: 'Failed to get model information',
        details: error instanceof Error ? { message: error.message } : undefined,
      },
    };
    return res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const health: HealthCheckResponse = {
    status: 'healthy',
    service: 'hojai-churn-model',
    version: churnModelService.getModelVersion(),
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    checks: {
      memory: true, // Would check process memory in production
      model: true,  // Model is always available
    },
  };

  return res.status(200).json(health);
});

export default router;
