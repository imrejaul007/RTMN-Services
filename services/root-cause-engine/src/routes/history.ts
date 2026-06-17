import { Router, Request, Response } from 'express';
import { Analysis } from '../models';
import { RootCauseAnalyzer } from '../services/analyzer';
import { ApiResponse, PaginatedResponse, RootCauseAnalysis } from '../types';

const router = Router();
const analyzer = new RootCauseAnalyzer();

/**
 * GET /api/history
 * Get analysis history for a tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const status = req.query.status as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId query parameter is required'
      } as ApiResponse<null>);
    }

    const { items, total } = await analyzer.getAnalysisHistory(tenantId, page, pageSize);

    // Filter by status if provided
    const filteredItems = status
      ? items.filter(a => a.status === status)
      : items;

    const response: ApiResponse<PaginatedResponse<RootCauseAnalysis>> = {
      success: true,
      data: {
        items: filteredItems,
        total: status ? filteredItems.length : total,
        page,
        pageSize,
        totalPages: Math.ceil((status ? filteredItems.length : total) / pageSize)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('History error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to retrieve history',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/history/:analysisId
 * Get detailed analysis by ID
 */
router.get('/:analysisId', async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;

    const analysis = await analyzer.getAnalysis(analysisId);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      } as ApiResponse<null>);
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
 * GET /api/history/stats/summary
 * Get summary statistics for tenant analyses
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId query parameter is required'
      } as ApiResponse<null>);
    }

    const analyses = await Analysis.find({ tenantId });

    const stats = {
      totalAnalyses: analyses.length,
      completed: analyses.filter(a => a.status === 'completed').length,
      inProgress: analyses.filter(a => a.status === 'in_progress').length,
      failed: analyses.filter(a => a.status === 'failed').length,
      totalAffectedUsers: analyses.reduce((sum, a) => sum + a.totalAffectedUsers, 0),
      totalRevenueImpact: analyses.reduce((sum, a) => sum + a.totalRevenueImpact, 0),
      byImpact: {
        severe: analyses.filter(a => a.impact === 'severe').length,
        significant: analyses.filter(a => a.impact === 'significant').length,
        moderate: analyses.filter(a => a.impact === 'moderate').length,
        minimal: analyses.filter(a => a.impact === 'minimal').length
      },
      byConfidence: {
        high: analyses.filter(a => a.confidence === 'high').length,
        medium: analyses.filter(a => a.confidence === 'medium').length,
        low: analyses.filter(a => a.confidence === 'low').length
      },
      recentAnalyses: analyses
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(a => ({
          analysisId: a.analysisId,
          summary: a.summary.substring(0, 100),
          primaryRootCause: a.primaryRootCause,
          status: a.status,
          createdAt: a.createdAt
        }))
    };

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Stats error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to retrieve statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/history/search
 * Search analyses by root cause or keyword
 */
router.get('/search/query', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId query parameter is required'
      } as ApiResponse<null>);
    }

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required'
      } as ApiResponse<null>);
    }

    const analyses = await Analysis.find({
      tenantId,
      $or: [
        { primaryRootCause: { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    const response: ApiResponse<typeof analyses> = {
      success: true,
      data: analyses
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Search error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/history/:analysisId
 * Delete an analysis
 */
router.delete('/:analysisId', async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId query parameter is required'
      } as ApiResponse<null>);
    }

    const result = await Analysis.deleteOne({ analysisId, tenantId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found or not authorized'
      } as ApiResponse<null>);
    }

    const response: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true },
      message: 'Analysis deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to delete analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

export default router;
