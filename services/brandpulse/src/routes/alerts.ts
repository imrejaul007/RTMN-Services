import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory alert store (in production, use database)
const alerts: Map<string, any[]> = new Map();

// Alert types
interface Alert {
  alertId: string;
  brandId: string;
  type: 'crisis' | 'sentiment' | 'volume' | 'competitor' | 'campaign' | 'mention';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data?: any;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  createdAt: Date;
}

// Create alert
router.post('/', async (req: Request, res: Response) => {
  try {
    const alertId = `ALERT-${uuidv4().slice(0, 8).toUpperCase()}`;

    const alert: Alert = {
      alertId,
      ...req.body,
      acknowledged: false,
      createdAt: new Date()
    };

    if (!alerts.has(alert.brandId)) {
      alerts.set(alert.brandId, []);
    }
    alerts.get(alert.brandId)!.push(alert);

    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Get alerts for brand
router.get('/brand/:brandId', async (req: Request, res: Response) => {
  try {
    const { severity, type, acknowledged, limit = 50 } = req.query;
    let brandAlerts = alerts.get(req.params.brandId) || [];

    if (severity) {
      brandAlerts = brandAlerts.filter(a => a.severity === severity);
    }
    if (type) {
      brandAlerts = brandAlerts.filter(a => a.type === type);
    }
    if (acknowledged !== undefined) {
      brandAlerts = brandAlerts.filter(a => a.acknowledged === (acknowledged === 'true'));
    }

    // Sort by createdAt descending and limit
    brandAlerts = brandAlerts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, Number(limit));

    res.json(brandAlerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get unacknowledged count
router.get('/brand/:brandId/count', async (req: Request, res: Response) => {
  try {
    const brandAlerts = alerts.get(req.params.brandId) || [];
    const unacknowledged = brandAlerts.filter(a => !a.acknowledged);
    const critical = unacknowledged.filter(a => a.severity === 'critical');

    res.json({
      total: brandAlerts.length,
      unacknowledged: unacknowledged.length,
      critical: critical.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alert count' });
  }
});

// Get alert by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    for (const [, brandAlerts] of alerts) {
      const alert = brandAlerts.find(a => a.alertId === req.params.id);
      if (alert) {
        return res.json(alert);
      }
    }
    res.status(404).json({ error: 'Alert not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

// Acknowledge alert
router.patch('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { acknowledgedBy } = req.body;

    for (const [brandId, brandAlerts] of alerts) {
      const alertIndex = brandAlerts.findIndex(a => a.alertId === req.params.id);
      if (alertIndex !== -1) {
        brandAlerts[alertIndex].acknowledged = true;
        brandAlerts[alertIndex].acknowledgedAt = new Date();
        brandAlerts[alertIndex].acknowledgedBy = acknowledgedBy;
        return res.json(brandAlerts[alertIndex]);
      }
    }

    res.status(404).json({ error: 'Alert not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Acknowledge multiple alerts
router.post('/bulk/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertIds, acknowledgedBy } = req.body;
    const acknowledged: Alert[] = [];

    for (const [brandId, brandAlerts] of alerts) {
      alertIds.forEach((alertId: string) => {
        const alertIndex = brandAlerts.findIndex(a => a.alertId === alertId);
        if (alertIndex !== -1) {
          brandAlerts[alertIndex].acknowledged = true;
          brandAlerts[alertIndex].acknowledgedAt = new Date();
          brandAlerts[alertIndex].acknowledgedBy = acknowledgedBy;
          acknowledged.push(brandAlerts[alertIndex]);
        }
      });
    }

    res.json({ acknowledged: acknowledged.length, alerts: acknowledged });
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge alerts' });
  }
});

// Delete alert
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    for (const [brandId, brandAlerts] of alerts) {
      const alertIndex = brandAlerts.findIndex(a => a.alertId === req.params.id);
      if (alertIndex !== -1) {
        brandAlerts.splice(alertIndex, 1);
        return res.json({ message: 'Alert deleted successfully' });
      }
    }
    res.status(404).json({ error: 'Alert not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// Get alert history (last 24 hours)
router.get('/brand/:brandId/history', async (req: Request, res: Response) => {
  try {
    const brandAlerts = alerts.get(req.params.brandId) || [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const history = brandAlerts
      .filter(a => new Date(a.createdAt) >= oneDayAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Group by hour
    const grouped = history.reduce((acc: any, a) => {
      const hour = new Date(a.createdAt).toISOString().slice(0, 13);
      if (!acc[hour]) acc[hour] = { critical: 0, warning: 0, info: 0 };
      acc[hour][a.severity]++;
      return acc;
    }, {});

    res.json({
      total: history.length,
      byHour: Object.entries(grouped).map(([hour, counts]: [any, any]) => ({
        hour,
        ...counts
      })),
      alerts: history.slice(0, 100)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alert history' });
  }
});

// Create crisis alert (special endpoint)
router.post('/crisis', async (req: Request, res: Response) => {
  try {
    const { brandId, mentionId, source, sentiment, volume } = req.body;

    const alertId = `CRISIS-${uuidv4().slice(0, 8).toUpperCase()}`;

    const alert: Alert = {
      alertId,
      brandId,
      type: 'crisis',
      severity: 'critical',
      title: 'Crisis Alert Detected',
      message: `Unusual activity detected: ${volume || 'high'} negative mentions detected on ${source}. Sentiment score dropped to ${sentiment || 'low'}.`,
      data: { mentionId, source, sentiment, volume },
      acknowledged: false,
      createdAt: new Date()
    };

    if (!alerts.has(brandId)) {
      alerts.set(brandId, []);
    }
    alerts.get(brandId)!.push(alert);

    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create crisis alert' });
  }
});

// Create sentiment alert
router.post('/sentiment', async (req: Request, res: Response) => {
  try {
    const { brandId, currentScore, previousScore, threshold } = req.body;

    const change = currentScore - previousScore;
    const severity = Math.abs(change) > 0.5 ? 'critical' : Math.abs(change) > 0.2 ? 'warning' : 'info';

    const alertId = `SENT-${uuidv4().slice(0, 8).toUpperCase()}`;

    const alert: Alert = {
      alertId,
      brandId,
      type: 'sentiment',
      severity,
      title: 'Sentiment Shift Detected',
      message: `Brand sentiment changed by ${change.toFixed(2)} (from ${previousScore.toFixed(2)} to ${currentScore.toFixed(2)})`,
      data: { currentScore, previousScore, change, threshold },
      acknowledged: false,
      createdAt: new Date()
    };

    if (!alerts.has(brandId)) {
      alerts.set(brandId, []);
    }
    alerts.get(brandId)!.push(alert);

    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create sentiment alert' });
  }
});

// Create volume alert
router.post('/volume', async (req: Request, res: Response) => {
  try {
    const { brandId, currentVolume, averageVolume, threshold } = req.body;

    const changePercent = ((currentVolume - averageVolume) / averageVolume) * 100;
    const severity = changePercent > 200 ? 'critical' : changePercent > 100 ? 'warning' : 'info';

    const alertId = `VOL-${uuidv4().slice(0, 8).toUpperCase()}`;

    const alert: Alert = {
      alertId,
      brandId,
      type: 'volume',
      severity,
      title: 'Volume Spike Detected',
      message: `Mention volume is ${changePercent.toFixed(0)}% higher than average (${currentVolume} vs ${averageVolume.toFixed(0)} avg)`,
      data: { currentVolume, averageVolume, changePercent, threshold },
      acknowledged: false,
      createdAt: new Date()
    };

    if (!alerts.has(brandId)) {
      alerts.set(brandId, []);
    }
    alerts.get(brandId)!.push(alert);

    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create volume alert' });
  }
});

export default router;
