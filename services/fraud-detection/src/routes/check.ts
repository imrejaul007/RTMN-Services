import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TransactionCheckRequest, TransactionCheckResponse, TransactionStatus } from '../models/Transaction';
import { RiskLevel, BlockAction } from '../models/Fraud';

const router = Router();

/**
 * POST /api/check/transaction
 * Perform real-time fraud check on a transaction
 */
router.post('/transaction', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const fraudDetector = req.app.get('fraudDetector');
  const riskScorer = req.app.get('riskScorer');
  const twinSync = req.app.get('twinSync');
  const customerOpsBridge = req.app.get('customerOpsBridge');

  const startTime = Date.now();

  try {
    const checkRequest: TransactionCheckRequest = req.body;

    // Validate required fields
    if (!checkRequest.transactionId || !checkRequest.customerId || !checkRequest.merchantId) {
      return res.status(400).json({
        error: 'Missing required fields: transactionId, customerId, merchantId'
      });
    }

    if (!checkRequest.amount || checkRequest.amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount: must be positive number'
      });
    }

    if (!checkRequest.currency) {
      return res.status(400).json({
        error: 'Missing currency'
      });
    }

    logger.info('Processing fraud check', {
      transactionId: checkRequest.transactionId,
      customerId: checkRequest.customerId,
      amount: checkRequest.amount
    });

    // Perform fraud detection
    const fraudResult = await fraudDetector.check(checkRequest);

    // Calculate risk score
    const riskAssessment = await riskScorer.assess(checkRequest, fraudResult.matchedPatterns);

    // Determine action based on thresholds
    const autoBlockEnabled = process.env.AUTO_BLOCK_ENABLED === 'true';
    const autoBlockThreshold = parseInt(process.env.AUTO_BLOCK_THRESHOLD || '90');

    let allowed = true;
    let status = TransactionStatus.APPROVED;
    let blockAction = BlockAction.NONE;

    if (riskAssessment.score >= autoBlockThreshold && autoBlockEnabled) {
      allowed = false;
      status = TransactionStatus.BLOCKED;
      blockAction = BlockAction.AUTO_BLOCK;
    } else if (riskAssessment.score >= 75) {
      status = TransactionStatus.UNDER_REVIEW;
      blockAction = BlockAction.REVIEW;
    } else if (riskAssessment.score >= 50) {
      status = TransactionStatus.FLAGGED;
      blockAction = BlockAction.FLAG;
    }

    const processingTimeMs = Date.now() - startTime;

    // Build response
    const response: TransactionCheckResponse = {
      transactionId: checkRequest.transactionId,
      allowed,
      status,
      riskAssessment,
      processingTimeMs,
      timestamp: new Date(),
      actions: buildActions(riskAssessment, blockAction)
    };

    // Sync to Trust Twin if high risk
    if (riskAssessment.score >= 50) {
      twinSync.syncRiskScore(checkRequest.customerId, riskAssessment.score, {
        transactionId: checkRequest.transactionId,
        merchantId: checkRequest.merchantId,
        amount: checkRequest.amount
      });
    }

    // Notify Customer Operations if critical
    if (riskAssessment.score >= autoBlockThreshold) {
      customerOpsBridge.notifyHighRisk({
        customerId: checkRequest.customerId,
        transactionId: checkRequest.transactionId,
        riskScore: riskAssessment.score,
        amount: checkRequest.amount,
        reason: fraudResult.matchedPatterns.map(p => p.patternName).join(', ')
      });
    }

    logger.info('Fraud check completed', {
      transactionId: checkRequest.transactionId,
      riskScore: riskAssessment.score,
      allowed,
      processingTimeMs
    });

    res.json(response);
  } catch (error) {
    logger.error('Fraud check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      transactionId: req.body.transactionId
    });

    res.status(500).json({
      error: 'Fraud check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/check/batch
 * Batch fraud check for multiple transactions
 */
router.post('/batch', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const fraudDetector = req.app.get('fraudDetector');
  const riskScorer = req.app.get('riskScorer');

  try {
    const { transactions }: { transactions: TransactionCheckRequest[] } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        error: 'transactions array is required'
      });
    }

    if (transactions.length > 100) {
      return res.status(400).json({
        error: 'Maximum 100 transactions per batch'
      });
    }

    logger.info('Processing batch fraud check', {
      count: transactions.length
    });

    const results: TransactionCheckResponse[] = [];
    const startTime = Date.now();

    for (const tx of transactions) {
      try {
        const fraudResult = await fraudDetector.check(tx);
        const riskAssessment = await riskScorer.assess(tx, fraudResult.matchedPatterns);

        let allowed = riskAssessment.score < 75;
        let status = allowed ? TransactionStatus.APPROVED : TransactionStatus.BLOCKED;
        if (riskAssessment.score >= 50 && riskAssessment.score < 75) {
          status = TransactionStatus.FLAGGED;
        }

        results.push({
          transactionId: tx.transactionId,
          allowed,
          status,
          riskAssessment,
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date()
        });
      } catch (error) {
        results.push({
          transactionId: tx.transactionId,
          allowed: true, // Fail open for batch
          status: TransactionStatus.UNDER_REVIEW,
          riskAssessment: {
            score: 0,
            level: RiskLevel.LOW,
            blockAction: BlockAction.NONE,
            factors: [],
            matchedPatterns: [],
            recommendations: ['Batch processing error - manual review recommended'],
            assessedAt: new Date(),
            processingTimeMs: 0
          },
          processingTimeMs: 0,
          timestamp: new Date()
        });
      }
    }

    logger.info('Batch fraud check completed', {
      count: transactions.length,
      processingTimeMs: Date.now() - startTime
    });

    res.json({
      results,
      summary: {
        total: results.length,
        allowed: results.filter(r => r.allowed).length,
        blocked: results.filter(r => !r.allowed).length,
        processingTimeMs: Date.now() - startTime
      }
    });
  } catch (error) {
    logger.error('Batch fraud check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Batch fraud check failed'
    });
  }
});

/**
 * GET /api/check/history/:customerId
 * Get fraud check history for a customer
 */
router.get('/history/:customerId', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const fraudDetector = req.app.get('fraudDetector');

  const { customerId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const history = fraudDetector.getHistory(customerId, limit);

    res.json({
      customerId,
      count: history.length,
      history
    });
  } catch (error) {
    logger.error('Failed to get history', {
      customerId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to retrieve history'
    });
  }
});

/**
 * GET /api/check/stats
 * Get fraud check statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  const fraudDetector = req.app.get('fraudDetector');
  const riskScorer = req.app.get('riskScorer');

  res.json({
    detector: fraudDetector.getStats(),
    riskScorer: riskScorer.getStats()
  });
});

function buildActions(
  riskAssessment: { score: number; level: RiskLevel; factors: { reason: string }[] },
  blockAction: BlockAction
): TransactionCheckResponse['actions'] {
  const actions: TransactionCheckResponse['actions'] = [];

  if (blockAction === BlockAction.AUTO_BLOCK || blockAction === BlockAction.BLOCK) {
    actions.push({
      type: 'block',
      reason: 'Risk score exceeds threshold',
      severity: riskAssessment.score >= 90 ? 'critical' : 'high'
    });
  }

  if (riskAssessment.score >= 50) {
    actions.push({
      type: 'notify',
      reason: 'High risk transaction detected',
      severity: 'medium'
    });
  }

  if (riskAssessment.level === RiskLevel.HIGH || riskAssessment.level === RiskLevel.CRITICAL) {
    actions.push({
      type: 'challenge',
      reason: 'Additional verification required',
      severity: riskAssessment.level === RiskLevel.CRITICAL ? 'critical' : 'high'
    });
  }

  return actions;
}

export default router;
