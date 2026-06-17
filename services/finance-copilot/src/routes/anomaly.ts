/**
 * Anomaly Detection Routes
 */

import { Router, Request, Response } from 'express';
import { anomalyDetectionService } from '../services/anomalyDetection';
import { Transaction, AnomalySeverity } from '../types';

const router = Router();

/**
 * GET /api/finance/anomaly
 * Get all anomaly alerts
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { severity, type, resolved, startDate, endDate } = req.query;

    const filters = {
      severity: severity as AnomalySeverity | undefined,
      type: type as string | undefined,
      resolved: resolved !== undefined ? resolved === 'true' : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const alerts = await anomalyDetectionService.getAlerts(filters);

    res.json({
      success: true,
      data: alerts,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching anomaly alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch anomaly alerts',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/anomaly/stats
 * Get anomaly statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await anomalyDetectionService.getAnomalyStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching anomaly stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch anomaly statistics',
      timestamp: new Date(),
    });
  }
});

/**
 * POST /api/finance/anomaly/detect
 * Detect anomalies in a transaction
 */
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const transaction: Transaction = req.body;

    if (!transaction.id || !transaction.amount) {
      res.status(400).json({
        success: false,
        error: 'Transaction ID and amount are required',
        timestamp: new Date(),
      });
      return;
    }

    const anomaly = await anomalyDetectionService.detectTransactionAnomaly(transaction);

    res.json({
      success: true,
      data: {
        hasAnomaly: !!anomaly,
        anomaly: anomaly || null,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error detecting anomaly:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect anomaly',
      timestamp: new Date(),
    });
  }
});

/**
 * PUT /api/finance/anomaly/:id/resolve
 * Resolve an anomaly alert
 */
router.put('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      res.status(400).json({
        success: false,
        error: 'Resolution is required',
        timestamp: new Date(),
      });
      return;
    }

    const success = await anomalyDetectionService.resolveAlert(id, resolution);

    res.json({
      success,
      data: { alertId: id, resolved: success },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      timestamp: new Date(),
    });
  }
});

export default router;
