import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  FraudAlert,
  AlertStatus,
  AlertSeverity,
  FraudStore,
  DEFAULT_PATTERNS
} from '../models/Fraud';

const router = Router();

// In-memory store (in production, use a database)
const alertStore = new FraudStore();

// Initialize with default patterns
function initializePatterns(): void {
  for (const patternDef of DEFAULT_PATTERNS) {
    const pattern = {
      ...patternDef,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    alertStore.addPattern(pattern);
  }
}

initializePatterns();

/**
 * GET /api/alerts
 * List all alerts with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');

  try {
    const {
      status,
      customerId,
      merchantId,
      severity,
      limit = '100',
      offset = '0'
    } = req.query;

    let alerts = alertStore.getAllAlerts();

    // Apply filters
    if (status) {
      alerts = alerts.filter(a => a.status === status);
    }
    if (customerId) {
      alerts = alerts.filter(a => a.customerId === customerId);
    }
    if (merchantId) {
      alerts = alerts.filter(a => a.merchantId === merchantId);
    }
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    // Sort by creation date (newest first)
    alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedAlerts = alerts.slice(offsetNum, offsetNum + limitNum);

    res.json({
      alerts: paginatedAlerts,
      pagination: {
        total: alerts.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < alerts.length
      }
    });
  } catch (error) {
    logger.error('Failed to list alerts', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to list alerts'
    });
  }
});

/**
 * GET /api/alerts/:id
 * Get a specific alert
 */
router.get('/:id', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');

  try {
    const alert = alertStore.getAlert(req.params.id);

    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found'
      });
    }

    res.json(alert);
  } catch (error) {
    logger.error('Failed to get alert', {
      alertId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get alert'
    });
  }
});

/**
 * POST /api/alerts
 * Create a new alert manually
 */
router.post('/', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const twinSync = req.app.get('twinSync');
  const customerOpsBridge = req.app.get('customerOpsBridge');

  try {
    const alertData = req.body;

    if (!alertData.transactionId || !alertData.customerId || !alertData.description) {
      return res.status(400).json({
        error: 'Missing required fields: transactionId, customerId, description'
      });
    }

    const alert: FraudAlert = {
      id: uuidv4(),
      transactionId: alertData.transactionId,
      patternId: alertData.patternId || 'manual',
      patternName: alertData.patternName || 'Manual Alert',
      severity: alertData.severity || AlertSeverity.WARNING,
      status: AlertStatus.PENDING,
      riskScore: alertData.riskScore || 50,
      riskLevel: alertData.riskLevel || 'medium',
      blockAction: alertData.blockAction || 'flag',
      customerId: alertData.customerId,
      merchantId: alertData.merchantId || '',
      amount: alertData.amount || 0,
      currency: alertData.currency || 'USD',
      description: alertData.description,
      details: alertData.details || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    alertStore.addAlert(alert);

    // Sync to twin
    twinSync.syncAlert(alert);

    // Notify customer ops
    customerOpsBridge.notifyAlert(alert);

    logger.info('Alert created', {
      alertId: alert.id,
      customerId: alert.customerId
    });

    res.status(201).json(alert);
  } catch (error) {
    logger.error('Failed to create alert', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to create alert'
    });
  }
});

/**
 * PATCH /api/alerts/:id
 * Update alert status/details
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const twinSync = req.app.get('twinSync');

  try {
    const existingAlert = alertStore.getAlert(req.params.id);

    if (!existingAlert) {
      return res.status(404).json({
        error: 'Alert not found'
      });
    }

    const {
      status,
      severity,
      blockAction,
      resolvedBy,
      notes
    } = req.body;

    const updates: Partial<FraudAlert> = {};

    if (status && Object.values(AlertStatus).includes(status)) {
      updates.status = status;
      if (status === AlertStatus.RESOLVED) {
        updates.resolvedAt = new Date();
      }
    }

    if (severity && Object.values(AlertSeverity).includes(severity)) {
      updates.severity = severity;
    }

    if (blockAction) {
      updates.blockAction = blockAction;
    }

    if (resolvedBy) {
      updates.resolvedBy = resolvedBy;
    }

    if (notes) {
      updates.notes = notes;
    }

    const updatedAlert = alertStore.updateAlert(req.params.id, updates);

    // Sync updated alert to twin
    if (updatedAlert) {
      twinSync.syncAlert(updatedAlert);
    }

    logger.info('Alert updated', {
      alertId: req.params.id,
      updates: Object.keys(updates)
    });

    res.json(updatedAlert);
  } catch (error) {
    logger.error('Failed to update alert', {
      alertId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to update alert'
    });
  }
});

/**
 * POST /api/alerts/:id/resolve
 * Quick resolve endpoint
 */
router.post('/:id/resolve', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const twinSync = req.app.get('twinSync');
  const customerOpsBridge = req.app.get('customerOpsBridge');

  try {
    const { resolution, notes, resolvedBy } = req.body;

    if (!resolution || !['confirmed', 'false_positive'].includes(resolution)) {
      return res.status(400).json({
        error: 'resolution must be "confirmed" or "false_positive"'
      });
    }

    const existingAlert = alertStore.getAlert(req.params.id);

    if (!existingAlert) {
      return res.status(404).json({
        error: 'Alert not found'
      });
    }

    const status = resolution === 'confirmed' ? AlertStatus.CONFIRMED : AlertStatus.FALSE_POSITIVE;

    const updatedAlert = alertStore.updateAlert(req.params.id, {
      status,
      resolvedAt: new Date(),
      resolvedBy: resolvedBy || 'system',
      notes: notes || ''
    });

    // Sync resolution to twin
    if (updatedAlert) {
      twinSync.syncAlertResolution(updatedAlert);
    }

    // Notify resolution
    customerOpsBridge.notifyResolution(updatedAlert);

    logger.info('Alert resolved', {
      alertId: req.params.id,
      resolution
    });

    res.json(updatedAlert);
  } catch (error) {
    logger.error('Failed to resolve alert', {
      alertId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to resolve alert'
    });
  }
});

/**
 * GET /api/alerts/stats
 * Get alert statistics
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  const stats = alertStore.getStats();

  res.json({
    ...stats,
    timestamp: new Date()
  });
});

/**
 * GET /api/alerts/export
 * Export alerts (for compliance/reporting)
 */
router.get('/export', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');

  try {
    const { format = 'json', startDate, endDate } = req.query;

    let alerts = alertStore.getAllAlerts();

    // Date filtering
    if (startDate) {
      const start = new Date(startDate as string);
      alerts = alerts.filter(a => a.createdAt >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      alerts = alerts.filter(a => a.createdAt <= end);
    }

    if (format === 'csv') {
      const csvHeader = 'id,transactionId,customerId,riskScore,status,severity,createdAt,resolvedAt\n';
      const csvRows = alerts.map(a =>
        `${a.id},${a.transactionId},${a.customerId},${a.riskScore},${a.status},${a.severity},${a.createdAt.toISOString()},${a.resolvedAt?.toISOString() || ''}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=fraud-alerts.csv');
      res.send(csvHeader + csvRows);
    } else {
      res.json({
        alerts,
        exportDate: new Date(),
        count: alerts.length
      });
    }
  } catch (error) {
    logger.error('Failed to export alerts', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to export alerts'
    });
  }
});

export default router;
