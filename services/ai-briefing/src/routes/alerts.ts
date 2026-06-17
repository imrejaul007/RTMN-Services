import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AlertModel } from '../models/Alert';
import { Alert, AlertType, AlertCategory, ApiResponse } from '../types';

const router = Router();

// Get all alerts for a tenant
router.get('/tenant/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const {
      limit = '50',
      skip = '0',
      severity,
      type,
      category,
      acknowledged,
      startDate,
      endDate
    } = req.query;

    const query: Record<string, unknown> = { tenantId };

    if (severity) query.severity = severity;
    if (type) query.type = type;
    if (category) query.category = category;
    if (acknowledged !== undefined) query.acknowledged = acknowledged === 'true';
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
      if (endDate) (query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);
    }

    const alerts = await AlertModel.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await AlertModel.countDocuments(query);

    const response: ApiResponse<{ alerts: Alert[]; total: number }> = {
      success: true,
      data: { alerts: alerts as unknown as Alert[], total }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

// Get single alert by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const alert = await AlertModel.findOne({ id: req.params.id });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    const response: ApiResponse<Alert> = {
      success: true,
      data: alert as unknown as Alert
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert'
    });
  }
});

// Get alert summary for a tenant
router.get('/tenant/:tenantId/summary', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { hours = '24' } = req.query;

    const startTime = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    const alerts = await AlertModel.find({
      tenantId,
      createdAt: { $gte: startTime }
    });

    const summary = {
      total: alerts.length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length
      },
      byCategory: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      unacknowledged: alerts.filter(a => !a.acknowledged).length,
      recentCritical: alerts
        .filter(a => a.severity === 'critical' && !a.acknowledged)
        .slice(0, 5)
        .map(a => ({ id: a.id, title: a.title, createdAt: a.createdAt }))
    };

    alerts.forEach(a => {
      summary.byCategory[a.category] = (summary.byCategory[a.category] || 0) + 1;
      summary.byType[a.type] = (summary.byType[a.type] || 0) + 1;
    });

    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching alert summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert summary'
    });
  }
});

// Create new alert
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, type, severity, title, message, category, relatedEntity, metadata } = req.body;

    if (!tenantId || !type || !severity || !title || !message || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tenantId, type, severity, title, message, category'
      });
    }

    const alert = new AlertModel({
      id: uuidv4(),
      tenantId,
      type,
      severity,
      title,
      message,
      category,
      relatedEntity,
      metadata: metadata || {},
      acknowledged: false,
      createdAt: new Date()
    });

    await alert.save();

    const response: ApiResponse<Alert> = {
      success: true,
      data: alert as unknown as Alert,
      message: 'Alert created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert'
    });
  }
});

// Acknowledge alert
router.patch('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;

    const alert = await AlertModel.findOneAndUpdate(
      { id },
      {
        acknowledged: true,
        acknowledgedBy: acknowledgedBy || 'system',
        acknowledgedAt: new Date()
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    const response: ApiResponse<Alert> = {
      success: true,
      data: alert as unknown as Alert,
      message: 'Alert acknowledged successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

// Acknowledge multiple alerts
router.post('/bulk-acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertIds, acknowledgedBy } = req.body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'alertIds array is required'
      });
    }

    const result = await AlertModel.updateMany(
      { id: { $in: alertIds } },
      {
        acknowledged: true,
        acknowledgedBy: acknowledgedBy || 'system',
        acknowledgedAt: new Date()
      }
    );

    const response: ApiResponse<{ modifiedCount: number }> = {
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: `${result.modifiedCount} alerts acknowledged successfully`
    };

    res.json(response);
  } catch (error) {
    console.error('Error acknowledging alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alerts'
    });
  }
});

// Delete alert
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await AlertModel.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    const response: ApiResponse<{ id: string }> = {
      success: true,
      message: 'Alert deleted successfully',
      data: { id }
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert'
    });
  }
});

// Get at-risk customers alerts
router.get('/tenant/:tenantId/at-risk', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { hours = '168' } = req.query; // Default 7 days

    const startTime = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    const alerts = await AlertModel.find({
      tenantId,
      type: 'customer_at_risk',
      createdAt: { $gte: startTime }
    }).sort({ createdAt: -1 });

    const response: ApiResponse<{ alerts: Alert[]; count: number }> = {
      success: true,
      data: { alerts: alerts as unknown as Alert[], count: alerts.length }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching at-risk alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch at-risk alerts'
    });
  }
});

// Get product issue alerts
router.get('/tenant/:tenantId/product-issues', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { hours = '168' } = req.query; // Default 7 days

    const startTime = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    const alerts = await AlertModel.find({
      tenantId,
      type: 'product_issue',
      createdAt: { $gte: startTime }
    }).sort({ createdAt: -1 });

    const response: ApiResponse<{ alerts: Alert[]; count: number }> = {
      success: true,
      data: { alerts: alerts as unknown as Alert[], count: alerts.length }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching product issue alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product issue alerts'
    });
  }
});

export default router;
