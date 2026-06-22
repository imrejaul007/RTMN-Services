/**
 * HOJAI Research Assistant - Research Routes
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: API routes for research operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  SearchQuerySchema,
  CompetitorAnalysisSchema,
  ReportGenerationSchema,
  TrendsQuerySchema,
  SummarizeSchema,
  ErrorResponse,
} from '../types.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as researchService from '../services/researchService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('research-routes');
const router = Router();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate request ID for response
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create API response object
 */
function createResponse<T>(success: boolean, data?: T, error?: ErrorResponse['error'], meta?: Record<string, unknown>) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...meta,
    },
  };
}

/**
 * Async route handler wrapper
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Middleware
// ============================================================================

// Apply tenant middleware to all routes
router.use(tenantMiddleware());

// ============================================================================
// POST /api/research/search - Search web
// ============================================================================

router.post(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    // Validate request body
    const parseResult = SearchQuerySchema.safeParse(req.body);
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

    const input = parseResult.data;

    logger.info('search_request', { userId, tenantId, query: input.query });

    const results = await researchService.search(input);

    res.json(createResponse(true, results, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/research/competitor - Competitor analysis
// ============================================================================

router.post(
  '/competitor',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    // Validate request body
    const parseResult = CompetitorAnalysisSchema.safeParse(req.body);
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

    const input = parseResult.data;

    logger.info('competitor_analysis_request', { userId, tenantId, company: input.company });

    const analysis = await researchService.analyzeCompetitors(input);

    res.json(createResponse(true, analysis, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/research/report - Generate report
// ============================================================================

router.post(
  '/report',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    // Validate request body
    const parseResult = ReportGenerationSchema.safeParse(req.body);
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

    const input = parseResult.data;

    logger.info('report_generation_request', { userId, tenantId, topic: input.topic });

    const report = await researchService.generateReport(input);

    res.status(201).json(createResponse(true, report, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/research/trends - Get trends
// ============================================================================

router.get(
  '/trends',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    // Parse query parameters
    const parseResult = TrendsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'INVALID_QUERY',
          message: 'Invalid query parameters',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const { category, limit, timeframe } = parseResult.data;

    logger.info('trends_request', { userId, tenantId, category, limit, timeframe });

    const trends = await researchService.getTrends(category, limit);

    res.json(createResponse(true, trends, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/research/trends/:category - Get trends by category
// ============================================================================

router.get(
  '/trends/:category',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;
    const category = req.params.category as 'technology' | 'market' | 'consumer' | 'industry' | 'competitive';

    // Validate category
    const validCategories = ['technology', 'market', 'consumer', 'industry', 'competitive'];
    if (!validCategories.includes(category)) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'INVALID_CATEGORY',
          message: `Category must be one of: ${validCategories.join(', ')}`,
        })
      );
      return;
    }

    logger.info('trends_by_category_request', { userId, tenantId, category });

    const trends = await researchService.getTrendsByCategory(category);

    res.json(createResponse(true, trends, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/research/summarize - Summarize content
// ============================================================================

router.post(
  '/summarize',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    // Validate request body
    const parseResult = SummarizeSchema.safeParse(req.body);
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

    const input = parseResult.data;

    logger.info('summarize_request', {
      userId,
      tenantId,
      contentType: input.contentType,
      style: input.style,
      originalLength: input.content.length,
    });

    const summary = await researchService.summarize(input);

    res.json(createResponse(true, summary, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/research/history - Get search history
// ============================================================================

router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    const limit = parseInt(req.query.limit as string) || 20;

    logger.info('history_request', { userId, tenantId, limit });

    const history = await researchService.getSearchHistory(userId, limit);

    res.json(createResponse(true, history, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/research/trends/search - Search trends
// ============================================================================

router.get(
  '/trends/search',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    const keyword = req.query.keyword as string;
    if (!keyword) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'MISSING_KEYWORD',
          message: 'Query parameter "keyword" is required',
        })
      );
      return;
    }

    logger.info('trends_search_request', { userId, tenantId, keyword });

    const trends = await researchService.searchTrends(keyword);

    res.json(createResponse(true, trends, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/research/trends/analytics - Get trend analytics
// ============================================================================

router.get(
  '/trends/analytics',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    logger.info('trend_analytics_request', { userId, tenantId });

    const analytics = await researchService.getTrendAnalytics();

    res.json(createResponse(true, analytics, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/research/comprehensive - Comprehensive research
// ============================================================================

router.post(
  '/comprehensive',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    const { topic, includeReport, includeTrends, includeCompetitors } = req.body;

    if (!topic || typeof topic !== 'string') {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Topic is required',
        })
      );
      return;
    }

    logger.info('comprehensive_research_request', {
      userId,
      tenantId,
      topic,
      includeReport,
      includeTrends,
      includeCompetitors,
    });

    const results = await researchService.comprehensiveResearch(
      topic,
      includeReport ?? true,
      includeTrends ?? true,
      includeCompetitors ?? false
    );

    res.json(createResponse(true, results, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/research/entities - Extract entities
// ============================================================================

router.post(
  '/entities',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Content is required',
        })
      );
      return;
    }

    logger.info('entities_request', { userId, tenantId, contentLength: content.length });

    const entities = await researchService.extractEntities(content);

    res.json(createResponse(true, entities, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/research/compare - Compare summaries
// ============================================================================

router.post(
  '/compare',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    const { summaries } = req.body;

    if (!Array.isArray(summaries) || summaries.length < 2) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'At least 2 summaries are required for comparison',
        })
      );
      return;
    }

    logger.info('compare_request', { userId, tenantId, count: summaries.length });

    const comparison = await researchService.compareSummaries(summaries);

    res.json(createResponse(true, comparison, undefined, { tenantId }));
  })
);

export default router;
