/**
 * HOJAI FounderOS - Market Analysis Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { marketAnalysisService } from '../services/marketAnalysisService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const TrendSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  impact: z.enum(['positive', 'negative', 'neutral']).optional()
});

const CompetitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  marketShare: z.number().min(0).max(100).optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  website: z.string().url().optional()
});

const MarketSizeSchema = z.object({
  value: z.number().positive().optional(),
  currency: z.string().optional(),
  unit: z.string().optional()
});

const CreateMarketAnalysisSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  marketSize: MarketSizeSchema.optional(),
  tam: z.number().positive().optional(),
  sam: z.number().positive().optional(),
  som: z.number().positive().optional(),
  trends: z.array(TrendSchema).optional(),
  competitors: z.array(CompetitorSchema).optional(),
  opportunities: z.array(z.string()).optional(),
  threats: z.array(z.string()).optional()
});

const UpdateMarketAnalysisSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  marketSize: MarketSizeSchema.optional(),
  tam: z.number().positive().optional(),
  sam: z.number().positive().optional(),
  som: z.number().positive().optional(),
  trends: z.array(TrendSchema).optional(),
  competitors: z.array(CompetitorSchema).optional(),
  opportunities: z.array(z.string()).optional(),
  threats: z.array(z.string()).optional()
});

const AddCompetitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  marketShare: z.number().min(0).max(100).optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  website: z.string().url().optional()
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/market-analysis
 * List all market analyses
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const analyses = await marketAnalysisService.list(tenantId, limit, offset);
    res.json(createResponse({ analyses }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/market-analysis
 * Create a new market analysis
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = CreateMarketAnalysisSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const analysis = await marketAnalysisService.create(tenantId, {
      ...validation.data,
      createdBy: req.tenantContext?.userId
    });

    res.status(201).json(createResponse({ analysis }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/market-analysis/:id
 * Get market analysis by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const analysis = await marketAnalysisService.getById(tenantId, id);

    if (!analysis) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Market analysis not found')
      );
    }

    res.json(createResponse({ analysis }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/market-analysis/:id
 * Update market analysis
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;
    const validation = UpdateMarketAnalysisSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const analysis = await marketAnalysisService.update(tenantId, id, validation.data);

    if (!analysis) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Market analysis not found')
      );
    }

    res.json(createResponse({ analysis }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/market-analysis/:id
 * Delete market analysis
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const deleted = await marketAnalysisService.delete(tenantId, id);

    if (!deleted) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Market analysis not found')
      );
    }

    res.json(createResponse({ success: true }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/market-analysis/:id/competitors
 * Add competitor to market analysis
 */
router.post('/:id/competitors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;
    const validation = AddCompetitorSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues })
      );
    }

    const analysis = await marketAnalysisService.addCompetitor(tenantId, id, validation.data);

    if (!analysis) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Market analysis not found')
      );
    }

    res.status(201).json(createResponse({ analysis }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/market-analysis/:id/competition
 * Analyze competitive landscape
 */
router.get('/:id/competition', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const analysis = await marketAnalysisService.analyzeCompetition(tenantId, id);

    if (!analysis) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Market analysis not found')
      );
    }

    res.json(createResponse({ analysis }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/market-analysis/estimates
 * Generate TAM/SAM/SOM estimates
 */
router.get('/estimates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { industry, region } = req.query;

    if (!industry || typeof industry !== 'string') {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Industry parameter is required')
      );
    }

    const estimates = await marketAnalysisService.generateMarketEstimates(
      tenantId,
      industry,
      typeof region === 'string' ? region : 'global'
    );

    res.json(createResponse({ estimates }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;