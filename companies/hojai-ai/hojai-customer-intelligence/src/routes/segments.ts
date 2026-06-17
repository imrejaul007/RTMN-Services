import { Router, Request, Response } from 'express';
import { Customer } from '../models/Customer';
import { segmentationService, SegmentCondition } from '../services/segmentation';
import { asyncHandler } from '../utils/helpers';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/segments
 * Get all segment rules
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const rules = segmentationService.getSegmentRules();

  res.json({
    success: true,
    data: rules
  });
}));

/**
 * GET /api/segments/summaries
 * Get segment summaries with customer counts
 */
router.get('/summaries', asyncHandler(async (_req: Request, res: Response) => {
  const summaries = await segmentationService.getAllSegmentSummaries();

  res.json({
    success: true,
    data: summaries
  });
}));

/**
 * GET /api/segments/distribution
 * Get segment distribution for charts
 */
router.get('/distribution', asyncHandler(async (_req: Request, res: Response) => {
  const distribution = await segmentationService.getSegmentDistribution();

  res.json({
    success: true,
    data: distribution
  });
}));

/**
 * GET /api/segments/:id
 * Get segment by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const summary = await segmentationService.getSegmentSummary(req.params.id);

  if (!summary) {
    res.status(404).json({
      success: false,
      error: 'Segment not found'
    });
    return;
  }

  res.json({
    success: true,
    data: summary
  });
}));

/**
 * GET /api/segments/:id/customers
 * Get customers in a segment
 */
router.get('/:id/customers', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const allCustomers = await segmentationService.getCustomersInSegment(req.params.id);
  const total = allCustomers.length;
  const customers = allCustomers.slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    data: customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

/**
 * POST /api/segments/query
 * Query customers with custom conditions
 */
router.post('/query', asyncHandler(async (req: Request, res: Response) => {
  const { conditions, operator } = req.body as {
    conditions: SegmentCondition[];
    operator: 'AND' | 'OR';
  };

  const customers = await segmentationService.queryCustomers(conditions, operator);

  res.json({
    success: true,
    data: customers,
    count: customers.length
  });
}));

/**
 * POST /api/segments/:id/assign
 * Assign segment to a customer
 */
router.post('/:id/assign', asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.body;

  if (!customerId) {
    res.status(400).json({
      success: false,
      error: 'customerId is required'
    });
    return;
  }

  const assignments = await segmentationService.assignSegmentsToCustomer(customerId);

  res.json({
    success: true,
    data: assignments
  });
}));

/**
 * POST /api/segments/refresh
 * Refresh all customer segments
 */
router.post('/refresh', asyncHandler(async (_req: Request, res: Response) => {
  logger.info('Starting segment refresh');

  const result = await segmentationService.assignSegmentsToAllCustomers();

  logger.info('Segment refresh complete', result);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * POST /api/segments/refresh/:customerId
 * Refresh segments for a single customer
 */
router.post('/refresh/:customerId', asyncHandler(async (req: Request, res: Response) => {
  const assignments = await segmentationService.assignSegmentsToCustomer(req.params.customerId);

  res.json({
    success: true,
    data: assignments
  });
}));

export default router;
