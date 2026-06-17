/**
 * Fraud Detection Routes
 */

import { Router, Request, Response } from 'express';
import { fraudDetectionService } from '../services/fraudDetection';

const router = Router();

/**
 * GET /api/finance/fraud/risk
 * Calculate fraud risk score for an entity
 */
router.get('/risk', async (req: Request, res: Response) => {
  try {
    const { entityId, entityType } = req.query;

    if (!entityId || !entityType) {
      res.status(400).json({
        success: false,
        error: 'entityId and entityType are required',
        timestamp: new Date(),
      });
      return;
    }

    const validTypes = ['customer', 'vendor', 'account'];
    if (!validTypes.includes(entityType as string)) {
      res.status(400).json({
        success: false,
        error: `entityType must be one of: ${validTypes.join(', ')}`,
        timestamp: new Date(),
      });
      return;
    }

    const riskScore = await fraudDetectionService.calculateRiskScore(
      entityId as string,
      entityType as 'customer' | 'vendor' | 'account'
    );

    res.json({
      success: true,
      data: riskScore,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error calculating fraud risk:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate fraud risk score',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/fraud/summary
 * Get fraud risk summary
 */
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const summary = await fraudDetectionService.getFraudSummary();

    res.json({
      success: true,
      data: summary,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching fraud summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fraud summary',
      timestamp: new Date(),
    });
  }
});

/**
 * POST /api/finance/fraud/check
 * Check a transaction for fraud
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { transactionId, amount, customerId, merchantId } = req.body;

    if (!transactionId || !amount || !customerId) {
      res.status(400).json({
        success: false,
        error: 'transactionId, amount, and customerId are required',
        timestamp: new Date(),
      });
      return;
    }

    const result = await fraudDetectionService.checkTransaction(
      transactionId,
      parseFloat(amount),
      customerId,
      merchantId
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error checking transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check transaction for fraud',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/fraud/risk/:entityType/:entityId
 * Get risk score for specific entity
 */
router.get('/risk/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;

    const validTypes = ['customer', 'vendor', 'account'];
    if (!validTypes.includes(entityType)) {
      res.status(400).json({
        success: false,
        error: `entityType must be one of: ${validTypes.join(', ')}`,
        timestamp: new Date(),
      });
      return;
    }

    const riskScore = await fraudDetectionService.calculateRiskScore(
      entityId,
      entityType as 'customer' | 'vendor' | 'account'
    );

    res.json({
      success: true,
      data: riskScore,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching risk score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch risk score',
      timestamp: new Date(),
    });
  }
});

export default router;
