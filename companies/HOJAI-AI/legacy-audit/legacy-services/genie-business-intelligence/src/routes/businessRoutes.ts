/**
 * GENIE Business Intelligence Service - Routes
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateReportSchema,
  BusinessQuerySchema,
  ErrorResponse,
} from '../types.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as businessService from '../services/businessIntelligenceService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('business-routes');
const router = Router();

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createResponse<T>(success: boolean, data?: T, error?: ErrorResponse['error']) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
  };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.use(tenantMiddleware());

// ============================================================================
// GET /api/business/:merchantId/summary - Business overview
// ============================================================================

router.get(
  '/:merchantId/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { start_date, end_date } = req.query;

    logger.info('get_business_summary', { merchantId, start_date, end_date });

    const summary = await businessService.getBusinessSummary(
      merchantId,
      start_date as string,
      end_date as string
    );

    res.json(createResponse(true, summary));
  })
);

// ============================================================================
// GET /api/business/:merchantId/sales - Sales data
// ============================================================================

router.get(
  '/:merchantId/sales',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { start_date, end_date } = req.query;

    logger.info('get_sales_data', { merchantId, start_date, end_date });

    const sales = await businessService.getSalesData(
      merchantId,
      start_date as string,
      end_date as string
    );

    res.json(createResponse(true, sales));
  })
);

// ============================================================================
// GET /api/business/:merchantId/customers - Customer analytics
// ============================================================================

router.get(
  '/:merchantId/customers',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { start_date, end_date } = req.query;

    logger.info('get_customer_analytics', { merchantId, start_date, end_date });

    const customers = await businessService.getCustomerAnalytics(
      merchantId,
      start_date as string,
      end_date as string
    );

    res.json(createResponse(true, customers));
  })
);

// ============================================================================
// GET /api/business/:merchantId/orders - Order insights
// ============================================================================

router.get(
  '/:merchantId/orders',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { start_date, end_date } = req.query;

    logger.info('get_order_insights', { merchantId, start_date, end_date });

    const orders = await businessService.getOrderInsights(
      merchantId,
      start_date as string,
      end_date as string
    );

    res.json(createResponse(true, orders));
  })
);

// ============================================================================
// GET /api/business/:merchantId/peak-hours - Peak hours
// ============================================================================

router.get(
  '/:merchantId/peak-hours',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;

    logger.info('get_peak_hours', { merchantId });

    const peakHours = await businessService.getPeakHours(merchantId);

    res.json(createResponse(true, { peak_hours: peakHours }));
  })
);

// ============================================================================
// GET /api/business/:merchantId/top-items - Top items
// ============================================================================

router.get(
  '/:merchantId/top-items',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    logger.info('get_top_items', { merchantId, limit });

    const topItems = await businessService.getTopItems(merchantId, limit);

    res.json(createResponse(true, { top_items: topItems }));
  })
);

// ============================================================================
// GET /api/business/:merchantId/report - Generate report
// ============================================================================

router.get(
  '/:merchantId/report',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { type, start_date, end_date, format } = req.query;

    logger.info('generate_report', { merchantId, type, start_date, end_date, format });

    const report = await businessService.generateReport(
      merchantId,
      (type as 'daily' | 'weekly' | 'monthly' | 'custom' | 'comparison') || 'daily',
      (start_date as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      (end_date as string) || new Date().toISOString(),
      (format as 'json' | 'pdf') || 'json'
    );

    res.json(createResponse(true, report));
  })
);

// ============================================================================
// POST /api/business/:merchantId/query - Natural language query
// ============================================================================

router.post(
  '/:merchantId/query',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;

    const parseResult = BusinessQuerySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const { query } = parseResult.data;

    logger.info('process_query', { merchantId, query });

    const result = await businessService.processQuery(merchantId, query);

    res.json(createResponse(true, result));
  })
);

// ============================================================================
// GET /api/business/:merchantId/trends - Trend analysis
// ============================================================================

router.get(
  '/:merchantId/trends',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;

    logger.info('get_trends', { merchantId });

    const summary = await businessService.getBusinessSummary(merchantId);

    res.json(createResponse(true, { trends: summary.trends }));
  })
);

export default router;
