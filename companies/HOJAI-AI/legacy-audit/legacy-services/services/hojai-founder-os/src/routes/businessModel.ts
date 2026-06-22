/**
 * HOJAI FounderOS - Business Model Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { businessModelService } from '../services/businessModelService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateBusinessModelSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  segments: z.object({
    keyPartners: z.array(z.string()).optional(),
    keyActivities: z.array(z.string()).optional(),
    keyResources: z.array(z.string()).optional(),
    valuePropositions: z.array(z.string()).optional(),
    customerRelationships: z.array(z.string()).optional(),
    channels: z.array(z.string()).optional(),
    customerSegments: z.array(z.string()).optional(),
    costStructure: z.array(z.string()).optional(),
    revenueStreams: z.array(z.string()).optional()
  }).optional()
});

const UpdateBusinessModelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  segments: z.object({
    keyPartners: z.array(z.string()).optional(),
    keyActivities: z.array(z.string()).optional(),
    keyResources: z.array(z.string()).optional(),
    valuePropositions: z.array(z.string()).optional(),
    customerRelationships: z.array(z.string()).optional(),
    channels: z.array(z.string()).optional(),
    customerSegments: z.array(z.string()).optional(),
    costStructure: z.array(z.string()).optional(),
    revenueStreams: z.array(z.string()).optional()
  }).optional()
});

const GenerateBusinessModelSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters')
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/business-model
 * List all business models
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const models = await businessModelService.list(tenantId, limit, offset);
    res.json(createResponse({ models }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-model
 * Create a new business model
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = CreateBusinessModelSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const model = await businessModelService.create(tenantId, {
      ...validation.data,
      createdBy: req.tenantContext?.userId
    });

    res.status(201).json(createResponse({ model }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-model/generate
 * Generate AI business model from description
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = GenerateBusinessModelSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const model = await businessModelService.generateFromDescription(
      tenantId,
      validation.data.description,
      req.tenantContext?.userId
    );

    res.status(201).json(createResponse({ model }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-model/:id
 * Get business model by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const model = await businessModelService.getById(tenantId, id);

    if (!model) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Business model not found')
      );
    }

    res.json(createResponse({ model }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/business-model/:id
 * Update business model
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;
    const validation = UpdateBusinessModelSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const model = await businessModelService.update(tenantId, id, validation.data);

    if (!model) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Business model not found')
      );
    }

    res.json(createResponse({ model }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/business-model/:id
 * Delete business model
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const deleted = await businessModelService.delete(tenantId, id);

    if (!deleted) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Business model not found')
      );
    }

    res.json(createResponse({ success: true }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-model/:id/analyze
 * Analyze business model gaps
 */
router.get('/:id/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const analysis = await businessModelService.analyzeGaps(tenantId, id);

    if (!analysis) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Business model not found')
      );
    }

    res.json(createResponse({ analysis }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-model/suggest/revenue-streams
 * Suggest revenue streams for industry
 */
router.get('/suggest/revenue-streams', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { industry } = req.query;
    const suggestions = businessModelService.suggestRevenueStreams(
      typeof industry === 'string' ? industry : 'default'
    );
    res.json(createResponse({ suggestions }));
  } catch (error) {
    next(error);
  }
});

export default router;