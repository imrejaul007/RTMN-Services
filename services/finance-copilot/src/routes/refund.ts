/**
 * Refund Analysis Routes
 */

import { Router, Request, Response } from 'express';
import { refundAnalysisService } from '../services/refundAnalysis';

const router = Router();

/**
 * GET /api/finance/refund/analysis
 * Analyze a refund request
 */
router.get('/analysis', async (req: Request, res: Response) => {
  try {
    const { refundId, transactionId, amount, reason, customerId } = req.query;

    if (!refundId || !transactionId || !amount || !reason || !customerId) {
      res.status(400).json({
        success: false,
        error: 'refundId, transactionId, amount, reason, and customerId are required',
        timestamp: new Date(),
      });
      return;
    }

    const analysis = await refundAnalysisService.analyzeRefund(
      refundId as string,
      transactionId as string,
      parseFloat(amount as string),
      reason as string,
      customerId as string
    );

    res.json({
      success: true,
      data: analysis,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error analyzing refund:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze refund',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/refund/:id
 * Get refund analysis by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const analysis = await refundAnalysisService.getRefundAnalysis(id);

    if (!analysis) {
      res.status(404).json({
        success: false,
        error: 'Refund analysis not found',
        timestamp: new Date(),
      });
      return;
    }

    res.json({
      success: true,
      data: analysis,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching refund analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch refund analysis',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/refund/stats
 * Get refund statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await refundAnalysisService.getRefundStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching refund stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch refund statistics',
      timestamp: new Date(),
    });
  }
});

/**
 * POST /api/finance/refund/batch
 * Batch analyze multiple refunds
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { refunds } = req.body;

    if (!Array.isArray(refunds) || refunds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Array of refunds is required',
        timestamp: new Date(),
      });
      return;
    }

    const analyses = await refundAnalysisService.batchAnalyzeRefunds(refunds);

    res.json({
      success: true,
      data: {
        count: analyses.length,
        analyses,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error batch analyzing refunds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch analyze refunds',
      timestamp: new Date(),
    });
  }
});

export default router;
