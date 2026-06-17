import { Router, Request, Response } from 'express';
import { Alert } from '../models/Alert';
import { ApiResponse } from '../types';

const router = Router();

/**
 * GET /api/executive/alerts
 * Get all alerts with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      type,
      severity,
      read,
      acknowledged,
      actionRequired,
      startDate,
      endDate,
      page = '1',
      limit = '50'
    } = req.query;

    const query: Record<string, unknown> = {};

    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (read !== undefined) query.read = read === 'true';
    if (acknowledged !== undefined) query.acknowledged = acknowledged === 'true';
    if (actionRequired !== undefined) query.actionRequired = actionRequired === 'true';

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        (query.timestamp as Record<string, Date>).$gte = new Date(startDate as string);
      }
      if (endDate) {
        (query.timestamp as Record<string, Date>).$lte = new Date(endDate as string);
      }
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .sort({ severity: 1, timestamp: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .exec();

    res.json({
      success: true,
      data: alerts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/alerts/unread
 * Get unread alerts count and list
 */
router.get('/unread', async (_req: Request, res: Response) => {
  try {
    const count = await Alert.countDocuments({ read: false });
    const alerts = await Alert.find({ read: false })
      .sort({ severity: 1, timestamp: -1 })
      .limit(20)
      .exec();

    res.json({
      success: true,
      data: {
        count,
        alerts
      }
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread alerts',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/alerts/action-required
 * Get alerts requiring action
 */
router.get('/action-required', async (_req: Request, res: Response) => {
  try {
    const alerts = await Alert.find({
      actionRequired: true,
      acknowledged: false
    })
      .sort({ severity: 1, timestamp: -1 })
      .exec();

    const count = alerts.length;
    const critical = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');

    res.json({
      success: true,
      data: {
        count,
        criticalCount: critical.length,
        alerts
      }
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch action-required alerts',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/alerts/stats
 * Get alert statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      total,
      unread,
      actionRequired,
      byType,
      bySeverity
    ] = await Promise.all([
      Alert.countDocuments(),
      Alert.countDocuments({ read: false }),
      Alert.countDocuments({ actionRequired: true, acknowledged: false }),
      Alert.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Alert.aggregate([
        { $match: { severity: { $ne: undefined } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total,
        unread,
        actionRequired,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        bySeverity: bySeverity.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert stats',
      message: err.message
    });
  }
});

/**
 * POST /api/executive/alerts/:id/read
 * Mark alert as read
 */
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findOneAndUpdate(
      { id },
      { read: true },
      { new: true }
    );

    if (!alert) {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
      return;
    }

    res.json({
      success: true,
      data: alert,
      message: 'Alert marked as read'
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to update alert',
      message: err.message
    });
  }
});

/**
 * POST /api/executive/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actionTaken, acknowledgedBy } = req.body;

    const alert = await Alert.findOneAndUpdate(
      { id },
      {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: acknowledgedBy || 'executive-copilot',
        actionTaken: actionTaken || '',
        read: true
      },
      { new: true }
    );

    if (!alert) {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
      return;
    }

    res.json({
      success: true,
      data: alert,
      message: 'Alert acknowledged'
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
      message: err.message
    });
  }
});

/**
 * POST /api/executive/alerts/mark-all-read
 * Mark all alerts as read
 */
router.post('/mark-all-read', async (_req: Request, res: Response) => {
  try {
    const result = await Alert.updateMany(
      { read: false },
      { read: true }
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} alerts as read`
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to mark all alerts as read',
      message: err.message
    });
  }
});

export default router;
