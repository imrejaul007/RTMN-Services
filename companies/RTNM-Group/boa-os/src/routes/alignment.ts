// ============================================================================
// Alignment Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { strategicAlignmentService, AlignmentInput } from '../services/strategicAlignment';
import { swotAnalyzerService } from '../services/swotAnalyzer';
import { objectiveService } from '../services/objectiveService';
import { ValidationError } from '../utils/errors';

const router = Router();

/**
 * Assess strategic alignment
 * POST /api/v1/alignment/assess
 */
router.post('/assess', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.businessUnit) throw new ValidationError('businessUnit is required');
    if (!req.body.strategyId) throw new ValidationError('strategyId is required');

    // Use provided objectives or fetch from service
    let objectives = req.body.objectives || [];
    if (objectives.length === 0) {
      objectives = objectiveService.getAll({ strategyId: req.body.strategyId });
    }
    const input: AlignmentInput = { businessUnit: req.body.businessUnit, strategyId: req.body.strategyId, objectives };
    const report = strategicAlignmentService.assess(input);
    res.status(201).json({ success: true, data: report, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get alignment reports for a business unit
 * GET /api/v1/alignment/unit/:businessUnit
 */
router.get('/unit/:businessUnit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = strategicAlignmentService.getReportsForUnit(req.params.businessUnit);
    res.json({ success: true, data: reports, count: reports.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get alignment scores
 * GET /api/v1/alignment/scores
 */
router.get('/scores', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessUnit } = req.query;
    const scores = strategicAlignmentService.getScores(businessUnit as string);
    res.json({ success: true, data: scores, count: scores.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get aggregate alignment across units
 * GET /api/v1/alignment/aggregate
 */
router.get('/aggregate', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const aggregate = strategicAlignmentService.getAggregateAlignment();
    res.json({ success: true, data: aggregate, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Generate SWOT analysis
 * POST /api/v1/alignment/swot
 */
router.post('/swot', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.context) throw new ValidationError('context is required');
    const analysis = swotAnalyzerService.generate(req.body.context, req.body.options);
    res.status(201).json({ success: true, data: analysis, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get SWOT analysis by ID
 * GET /api/v1/alignment/swot/:id
 */
router.get('/swot/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analysis = swotAnalyzerService.getById(req.params.id);
    res.json({ success: true, data: analysis, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get all SWOT analyses
 * GET /api/v1/alignment/swot
 */
router.get('/swot', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const analyses = swotAnalyzerService.getAll();
    res.json({ success: true, data: analyses, count: analyses.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
