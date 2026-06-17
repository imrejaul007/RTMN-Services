import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { IoTStatus } from '../models/IoTStatus';
import { Asset } from '../models/Asset';

const router = Router();

// Validation schemas
const createIoTDeviceSchema = z.object({
  assetId: z.string().min(1),
  deviceType: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  firmware: z.string().optional(),
  macAddress: z.string().optional(),
  ipAddress: z.string().optional(),
  thresholds: z.object({
    temperature: z.object({ min: z.number(), max: z.number() }).optional(),
    humidity: z.object({ min: z.number(), max: z.number() }).optional(),
    voltage: z.object({ min: z.number(), max: z.number() }).optional()
  }).optional()
});

const updateMetricsSchema = z.object({
  connectionStatus: z.enum(['online', 'offline', 'degraded', 'unknown']).optional(),
  metrics: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    pressure: z.number().optional(),
    voltage: z.number().optional(),
    current: z.number().optional(),
    power: z.number().optional(),
    frequency: z.number().optional(),
    vibration: z.number().optional(),
    noise: z.number().optional(),
    flow: z.number().optional(),
    level: z.number().optional()
  }).optional(),
  operational: z.object({
    runningHours: z.number().optional(),
    cycleCount: z.number().optional(),
    throughput: z.number().optional(),
    efficiency: z.number().optional(),
    utilization: z.number().optional(),
    speed: z.number().optional()
  }).optional(),
  health: z.object({
    overallHealth: z.number().optional(),
    componentHealth: z.array(z.object({
      component: z.string(),
      health: z.number(),
      status: z.string()
    })).optional(),
    errorCount: z.number().optional(),
    warningCount: z.number().optional()
  }).optional(),
  performance: z.object({
    cpuUsage: z.number().optional(),
    memoryUsage: z.number().optional(),
    storageUsage: z.number().optional(),
    networkLatency: z.number().optional(),
    responseTime: z.number().optional()
  }).optional()
});

const updateAlertsSchema = z.object({
  level: z.enum(['none', 'info', 'warning', 'critical']),
  message: z.string().optional(),
  details: z.array(z.string()).optional()
});

// Middleware to extract tenantId
const extractTenantId = (req: Request, res: Response, next: NextFunction) => {
  req.body.tenantId = req.headers['x-tenant-id'] as string || 'default';
  next();
};

// GET /iot - List all IoT devices
router.get('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { assetId, connectionStatus, alertLevel, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = { tenantId };
    if (assetId) filter.assetId = assetId;
    if (connectionStatus) filter.connectionStatus = connectionStatus;
    if (alertLevel) filter['alerts.level'] = alertLevel;

    const devices = await IoTStatus.find(filter)
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ updatedAt: -1 });

    const total = await IoTStatus.countDocuments(filter);

    res.json({
      success: true,
      data: devices,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /iot/:id - Get single IoT device
router.get('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const device = await IoTStatus.findOne({ tenantId, _id: req.params.id })
      .populate('assetId', 'name assetType location');

    if (!device) {
      return res.status(404).json({ success: false, error: 'IoT device not found' });
    }

    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /iot/asset/:assetId - Get IoT status by asset
router.get('/asset/:assetId', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const device = await IoTStatus.findOne({ tenantId, assetId: req.params.assetId });

    if (!device) {
      return res.status(404).json({ success: false, error: 'IoT status not found for this asset' });
    }

    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /iot - Register IoT device
router.post('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = createIoTDeviceSchema.parse(req.body);

    // Check if asset exists
    const asset = await Asset.findOne({ tenantId, assetId: validatedData.assetId });
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    const iotDeviceId = `IOT-${uuidv4().substring(0, 8).toUpperCase()}`;

    const device = new IoTStatus({
      ...validatedData,
      tenantId,
      assetId: validatedData.assetId,
      iotDeviceId,
      connectionStatus: 'unknown'
    });

    await device.save();

    // Enable IoT on the asset
    await Asset.updateOne(
      { tenantId, assetId: validatedData.assetId },
      { iotEnabled: true, iotDeviceId }
    );

    res.status(201).json({ success: true, data: device });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PUT /iot/:id - Update IoT device
router.put('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = updateMetricsSchema.parse(req.body);

    const device = await IoTStatus.findOneAndUpdate(
      { tenantId, _id: req.params.id },
      validatedData,
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ success: false, error: 'IoT device not found' });
    }

    // Check thresholds and update alerts
    checkAndUpdateAlerts(device);

    res.json({ success: true, data: device });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /iot/:id/metrics - Update metrics (common endpoint for IoT devices)
router.post('/:id/metrics', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = updateMetricsSchema.parse(req.body);

    const updateData: Record<string, unknown> = {};

    // Update connection status and track timestamps
    if (validatedData.connectionStatus) {
      updateData.connectionStatus = validatedData.connectionStatus;
      if (validatedData.connectionStatus === 'online') {
        updateData.lastConnected = new Date();
      } else if (validatedData.connectionStatus === 'offline') {
        updateData.lastDisconnected = new Date();
      }
    }

    // Update metrics
    if (validatedData.metrics) {
      Object.entries(validatedData.metrics).forEach(([key, value]) => {
        updateData[`metrics.${key}`] = value;
      });
    }

    // Update operational
    if (validatedData.operational) {
      Object.entries(validatedData.operational).forEach(([key, value]) => {
        updateData[`operational.${key}`] = value;
      });
    }

    // Update health
    if (validatedData.health) {
      Object.entries(validatedData.health).forEach(([key, value]) => {
        updateData[`health.${key}`] = value;
      });
    }

    // Update performance
    if (validatedData.performance) {
      Object.entries(validatedData.performance).forEach(([key, value]) => {
        updateData[`performance.${key}`] = value;
      });
    }

    const device = await IoTStatus.findOneAndUpdate(
      { tenantId, _id: req.params.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ success: false, error: 'IoT device not found' });
    }

    // Check thresholds and update alerts
    await checkAndUpdateAlerts(device);

    res.json({ success: true, data: device });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /iot/:id/alerts - Update alerts
router.post('/:id/alerts', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = updateAlertsSchema.parse(req.body);

    const device = await IoTStatus.findOneAndUpdate(
      { tenantId, _id: req.params.id },
      {
        $set: {
          'alerts.level': validatedData.level,
          'alerts.message': validatedData.message,
          'alerts.details': validatedData.details,
          'alerts.triggeredAt': new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ success: false, error: 'IoT device not found' });
    }

    res.json({ success: true, data: device.alerts });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /iot/alerts/active - Get all active alerts
router.get('/alerts/active', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { level } = req.query;

    const filter: Record<string, unknown> = {
      tenantId,
      'alerts.level': { $ne: 'none' }
    };

    if (level) {
      filter['alerts.level'] = level;
    }

    const devices = await IoTStatus.find(filter)
      .select('iotDeviceId assetId alerts connectionStatus')
      .sort({ 'alerts.triggeredAt': -1 });

    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /iot/:id - Unregister IoT device
router.delete('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const device = await IoTStatus.findOne({ tenantId, _id: req.params.id });

    if (!device) {
      return res.status(404).json({ success: false, error: 'IoT device not found' });
    }

    await IoTStatus.deleteOne({ tenantId, _id: req.params.id });

    // Disable IoT on the asset
    await Asset.updateOne(
      { tenantId, assetId: device.assetId },
      { iotEnabled: false, iotDeviceId: null }
    );

    res.json({ success: true, message: 'IoT device unregistered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Helper function to check thresholds and update alerts
async function checkAndUpdateAlerts(device: InstanceType<typeof IoTStatus>): Promise<void> {
  if (!device.metrics || !device.thresholds) return;

  const alerts: string[] = [];
  let level: 'none' | 'info' | 'warning' | 'critical' = 'none';

  const { metrics, thresholds } = device;

  // Check temperature
  if (metrics.temperature !== undefined && thresholds.temperature) {
    if (metrics.temperature > thresholds.temperature.max) {
      alerts.push(`Temperature ${metrics.temperature}C exceeds max ${thresholds.temperature.max}C`);
      level = 'warning';
    } else if (metrics.temperature < thresholds.temperature.min) {
      alerts.push(`Temperature ${metrics.temperature}C below min ${thresholds.temperature.min}C`);
      level = 'warning';
    }
  }

  // Check humidity
  if (metrics.humidity !== undefined && thresholds.humidity) {
    if (metrics.humidity > thresholds.humidity.max) {
      alerts.push(`Humidity ${metrics.humidity}% exceeds max ${thresholds.humidity.max}%`);
      level = 'warning';
    } else if (metrics.humidity < thresholds.humidity.min) {
      alerts.push(`Humidity ${metrics.humidity}% below min ${thresholds.humidity.min}%`);
      level = 'warning';
    }
  }

  // Check for critical alerts from health metrics
  if (device.health?.errorCount && device.health.errorCount > 0) {
    level = 'critical';
  }

  if (level !== 'none') {
    await IoTStatus.updateOne(
      { _id: device._id },
      {
        $set: {
          'alerts.level': level,
          'alerts.message': alerts[0],
          'alerts.details': alerts,
          'alerts.triggeredAt': new Date()
        }
      }
    );
  }
}

export default router;
