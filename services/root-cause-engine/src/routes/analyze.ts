import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { RootCauseAnalyzer } from '../services/analyzer';
import { AnalysisRequest, ApiResponse, AnalysisResponse } from '../types';

const router = Router();
const analyzer = new RootCauseAnalyzer();

// Validation schema for analysis request
const analyzeRequestSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  complaints: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    category: z.string().min(1, 'Category is required'),
    subcategory: z.string().optional(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    affectedUsers: z.number().int().min(0),
    revenueImpact: z.number().optional(),
    timestamp: z.string().datetime().or(z.date()).transform(v =>
      typeof v === 'string' ? new Date(v) : v
    ),
    metadata: z.record(z.unknown()).optional()
  })),
  options: z.object({
    depth: z.number().int().min(1).max(5).optional(),
    includeHistorical: z.boolean().optional(),
    similarityThreshold: z.number().min(0).max(100).optional()
  }).optional()
});

/**
 * POST /api/analyze
 * Analyze complaints to find root causes
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = analyzeRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Validation failed',
        message: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
      return res.status(400).json(response);
    }

    const { tenantId, complaints, options } = validationResult.data;

    // Perform analysis
    const result = await analyzer.analyze(tenantId, complaints, options);

    const response: ApiResponse<AnalysisResponse> = {
      success: true,
      data: result,
      message: 'Analysis completed successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Analysis error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/analyze/:analysisId
 * Get a specific analysis by ID
 */
router.get('/:analysisId', async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;

    const analysis = await analyzer.getAnalysis(analysisId);

    if (!analysis) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Analysis not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<typeof analysis> = {
      success: true,
      data: analysis
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get analysis error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to retrieve analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/analyze/batch
 * Batch analyze multiple complaint sets
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { tenantId, analyses } = req.body;

    if (!tenantId || !analyses || !Array.isArray(analyses)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: tenantId and analyses array required'
      });
    }

    const results = await Promise.all(
      analyses.map(async (analysis) => {
        try {
          const result = await analyzer.analyze(tenantId, analysis.complaints, analysis.options);
          return { success: true, result };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    res.status(200).json({
      success: true,
      data: results,
      message: `Completed ${results.filter(r => r.success).length}/${results.length} analyses`
    });
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
