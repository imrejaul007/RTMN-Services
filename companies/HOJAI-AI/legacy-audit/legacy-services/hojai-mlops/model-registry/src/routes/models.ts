/**
 * Hojai Model Registry - Model Routes
 */

import { Router, Response, NextFunction } from 'express';
import { modelRegistryService } from '../services/registry';
import {
  registerModelSchema,
  updateStageSchema,
  modelNameParamSchema,
  versionParamSchema,
} from '../validators';
import { ZodError } from 'zod';
import { ApiError } from '../types';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/models - Register a new model version
 */
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = registerModelSchema.parse(req.body);

    const result = await modelRegistryService.registerModel(validatedData);

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({
        error: 'Validation Error',
        message: messages,
        statusCode: 400,
        timestamp: new Date().toISOString(),
      } as ApiError);
      return;
    }
    next(error);
  }
});

/**
 * GET /api/models - List all registered models
 */
router.get('/', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await modelRegistryService.listModels();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/models/:name - Get all versions of a model
 */
router.get('/:name', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = modelNameParamSchema.parse(req.params);
    const result = await modelRegistryService.getModelVersions(name);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid model name format',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      } as ApiError);
      return;
    }
    next(error);
  }
});

/**
 * GET /api/models/:name/latest - Get the latest version of a model
 */
router.get('/:name/latest', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = modelNameParamSchema.parse(req.params);
    const result = await modelRegistryService.getLatestVersion(name);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid model name format',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      } as ApiError);
      return;
    }
    next(error);
  }
});

/**
 * GET /api/models/:name/:version - Get a specific version
 */
router.get('/:name/:version', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, version } = versionParamSchema.parse(req.params);
    const result = await modelRegistryService.getVersion(name, version);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid model name or version format',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      } as ApiError);
      return;
    }
    next(error);
  }
});

/**
 * PUT /api/models/:name/:version/stage - Update model stage
 */
router.put('/:name/:version/stage', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, version } = versionParamSchema.parse(req.params);
    const { stage } = updateStageSchema.parse(req.body);

    const result = await modelRegistryService.updateStage(name, version, stage);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({
        error: 'Validation Error',
        message: messages,
        statusCode: 400,
        timestamp: new Date().toISOString(),
      } as ApiError);
      return;
    }
    next(error);
  }
});

/**
 * DELETE /api/models/:name/:version - Delete a specific version
 */
router.delete('/:name/:version', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, version } = versionParamSchema.parse(req.params);
    const result = await modelRegistryService.deleteVersion(name, version);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid model name or version format',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      } as ApiError);
      return;
    }
    next(error);
  }
});

export default router;
