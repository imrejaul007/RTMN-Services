import { Router, Request, Response, NextFunction } from 'express';
import { alignmentChecker } from '../services/alignmentChecker';
import { ValidationError } from '../utils/errors';

const router = Router();

/**
 * Check alignment for a strategy
 * POST /api/v1/alignment/check
 */
router.post('/check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.strategyId) throw new ValidationError('strategyId is required');
    const record = await alignmentChecker.checkStrategyAlignment(req.body.strategyId, req.body.businessUnit);
    res.json({ success: true, data: record, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get alignment trend
 * GET /api/v1/alignment/trend/:strategyId
 */
router.get('/trend/:strategyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const businessUnit = req.query.businessUnit as string || 'default';
    const trend = alignmentChecker.getAlignmentTrend(req.params.strategyId, businessUnit);
    res.json({ success: true, data: trend, count: trend.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get aggregate alignment
 * GET /api/v1/alignment/aggregate
 */
router.get('/aggregate', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const aggregate = alignmentChecker.getAggregateAlignment();
    res.json({ success: true, data: aggregate, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get all alignment records
 * GET /api/v1/alignment
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const records = alignmentChecker.getAllRecords();
    res.json({ success: true, data: records, count: records.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get alignment record by ID
 * GET /api/v1/alignment/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = alignmentChecker.getRecord(req.params.id);
    if (!record) throw new ValidationError('Record not found');
    res.json({ success: true, data: record, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
