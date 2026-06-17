import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { SLA, SLAMetricType, SLAStatus } from '../models/SLA';

const router = Router();

// Validation Schemas
const createSLASchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['active', 'breached', 'at_risk', 'paused', 'terminated']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  effectiveDate: z.string().or(z.date()),
  expirationDate: z.string().or(z.date()).optional(),
  metrics: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(['uptime', 'response_time', 'resolution_time', 'delivery_time', 'quality_score', 'accuracy', 'availability', 'custom']),
    description: z.string().optional(),
    target: z.object({
      operator: z.enum(['gte', 'lte', 'eq', 'gt', 'lt']),
      value: z.number(),
      unit: z.string().optional(),
    }),
    warning: z.object({
      operator: z.enum(['gte', 'lte', 'eq', 'gt', 'lt']),
      value: z.number(),
      unit: z.string().optional(),
    }).optional(),
    weight: z.number().optional(),
    measurementPeriod: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'per_incident']).optional(),
    dataSource: z.string().optional(),
  })).min(1),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateSLASchema = createSLASchema.partial();

const updateMetricActualSchema = z.object({
  metricName: z.string().min(1),
  value: z.number(),
  unit: z.string().optional(),
  timestamp: z.string().or(z.date()).optional(),
});

// Middleware
const extractTenantId = (req: Request, res: Response, next: NextFunction) => {
  req.body.tenantId = req.headers['x-tenant-id'] as string || 'default';
  next();
};

// Create SLA
router.post('/:partnerId', extractTenantId, async (req: Request, res: Response) => {
  try {
    const validationResult = createSLASchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;
    const slaId = `SLA-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Initialize actuals for each metric
    const actuals = data.metrics.map((metric) => ({
      metricName: metric.name,
      currentValue: 0,
      unit: metric.target.unit,
      lastUpdated: new Date(),
      dataPoints: [],
    }));

    const sla = new SLA({
      ...data,
      slaId,
      tenantId: req.body.tenantId,
      partnerId: req.params.partnerId,
      effectiveDate: new Date(data.effectiveDate),
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      status: data.status || 'active',
      priority: data.priority || 'medium',
      metrics: data.metrics.map((m) => ({
        ...m,
        weight: m.weight || 1,
        measurementPeriod: m.measurementPeriod || 'monthly',
      })),
      actuals,
      overallCompliance: 100,
    });

    await sla.save();

    res.status(201).json({
      success: true,
      data: sla,
      message: 'SLA created successfully',
    });
  } catch (error: any) {
    console.error('Create SLA error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create SLA',
    });
  }
});

// Get All SLAs
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      priority,
      partnerId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const query: any = { tenantId, isDeleted: false };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (partnerId) query.partnerId = partnerId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slaId: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const sort: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [slas, total] = await Promise.all([
      SLA.find(query).sort(sort).skip(skip).limit(limitNum),
      SLA.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: slas,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get SLAs error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get SLAs',
    });
  }
});

// Get SLA by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const sla = await SLA.findOne({
      $or: [{ slaId: req.params.id }, { _id: req.params.id }],
      tenantId,
      isDeleted: false,
    });

    if (!sla) {
      return res.status(404).json({
        success: false,
        error: 'SLA not found',
      });
    }

    res.json({
      success: true,
      data: sla,
    });
  } catch (error: any) {
    console.error('Get SLA error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get SLA',
    });
  }
});

// Update SLA
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const validationResult = updateSLASchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const data = validationResult.data;

    if (data.effectiveDate) {
      (data as any).effectiveDate = new Date(data.effectiveDate);
    }
    if (data.expirationDate) {
      (data as any).expirationDate = new Date(data.expirationDate);
    }

    const sla = await SLA.findOneAndUpdate(
      {
        $or: [{ slaId: req.params.id }, { _id: req.params.id }],
        tenantId,
        isDeleted: false,
      },
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!sla) {
      return res.status(404).json({
        success: false,
        error: 'SLA not found',
      });
    }

    res.json({
      success: true,
      data: sla,
      message: 'SLA updated successfully',
    });
  } catch (error: any) {
    console.error('Update SLA error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update SLA',
    });
  }
});

// Delete SLA (Soft Delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const sla = await SLA.findOneAndUpdate(
      {
        $or: [{ slaId: req.params.id }, { _id: req.params.id }],
        tenantId,
        isDeleted: false,
      },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!sla) {
      return res.status(404).json({
        success: false,
        error: 'SLA not found',
      });
    }

    res.json({
      success: true,
      message: 'SLA deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete SLA error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete SLA',
    });
  }
});

// Get SLAs by Partner
router.get('/partner/:partnerId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { page = '1', limit = '20', status } = req.query;

    const query: any = {
      tenantId,
      partnerId: req.params.partnerId,
      isDeleted: false,
    };

    if (status) query.status = status;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [slas, total] = await Promise.all([
      SLA.find(query).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      SLA.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: slas,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get partner SLAs error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get partner SLAs',
    });
  }
});

// Update Metric Actual
router.patch('/:id/metrics/actual', async (req: Request, res: Response) => {
  try {
    const validationResult = updateMetricActualSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { metricName, value, unit, timestamp } = validationResult.data;

    const sla = await SLA.findOne({
      $or: [{ slaId: req.params.id }, { _id: req.params.id }],
      tenantId,
      isDeleted: false,
    });

    if (!sla) {
      return res.status(404).json({
        success: false,
        error: 'SLA not found',
      });
    }

    // Find and update the metric actual
    const actualIndex = sla.actuals.findIndex((a) => a.metricName === metricName);
    const timestampDate = timestamp ? new Date(timestamp) : new Date();

    if (actualIndex === -1) {
      return res.status(400).json({
        success: false,
        error: `Metric '${metricName}' not found in SLA`,
      });
    }

    // Add data point
    sla.actuals[actualIndex].dataPoints.push({
      timestamp: timestampDate,
      value,
    });

    // Keep only last 100 data points
    if (sla.actuals[actualIndex].dataPoints.length > 100) {
      sla.actuals[actualIndex].dataPoints = sla.actuals[actualIndex].dataPoints.slice(-100);
    }

    // Update current value
    sla.actuals[actualIndex].currentValue = value;
    sla.actuals[actualIndex].lastUpdated = timestampDate;

    // Recalculate overall compliance
    await recalculateCompliance(sla);

    await sla.save();

    res.json({
      success: true,
      data: sla,
      message: 'Metric updated successfully',
    });
  } catch (error: any) {
    console.error('Update metric error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update metric',
    });
  }
});

// Record Breach
router.post('/:id/breaches', async (req: Request, res: Response) => {
  try {
    const { metricName, expectedValue, actualValue, severity, startTime, endTime, penalty } = req.body;

    if (!metricName || expectedValue === undefined || actualValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'metricName, expectedValue, and actualValue are required',
      });
    }

    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const sla = await SLA.findOne({
      $or: [{ slaId: req.params.id }, { _id: req.params.id }],
      tenantId,
      isDeleted: false,
    });

    if (!sla) {
      return res.status(404).json({
        success: false,
        error: 'SLA not found',
      });
    }

    const breach = {
      breachId: `BR-${uuidv4().substring(0, 8).toUpperCase()}`,
      metricName,
      expectedValue,
      actualValue,
      severity: severity || 'minor',
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : undefined,
      duration: endTime && startTime
        ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
        : undefined,
      resolved: false,
      penalty,
    };

    sla.breaches.push(breach);
    sla.totalBreaches += 1;
    sla.openBreaches += 1;

    // Update status based on breach severity
    if (sla.status === 'active') {
      if (severity === 'critical' || severity === 'major') {
        sla.status = 'breached';
      } else {
        sla.status = 'at_risk';
      }
    }

    await sla.save();

    res.status(201).json({
      success: true,
      data: sla,
      message: 'Breach recorded successfully',
    });
  } catch (error: any) {
    console.error('Record breach error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record breach',
    });
  }
});

// Resolve Breach
router.patch('/:id/breaches/:breachId/resolve', async (req: Request, res: Response) => {
  try {
    const { resolutionNotes } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const sla = await SLA.findOne({
      $or: [{ slaId: req.params.id }, { _id: req.params.id }],
      tenantId,
      isDeleted: false,
    });

    if (!sla) {
      return res.status(404).json({
        success: false,
        error: 'SLA not found',
      });
    }

    const breach = sla.breaches.find((b) => b.breachId === req.params.breachId);
    if (!breach) {
      return res.status(404).json({
        success: false,
        error: 'Breach not found',
      });
    }

    breach.resolved = true;
    breach.resolutionNotes = resolutionNotes;
    breach.endTime = new Date();
    if (breach.startTime) {
      breach.duration = Math.round((breach.endTime.getTime() - breach.startTime.getTime()) / 60000);
    }

    sla.openBreaches = Math.max(0, sla.openBreaches - 1);

    // Reset status if no open breaches
    if (sla.openBreaches === 0 && sla.status !== 'terminated' && sla.status !== 'paused') {
      sla.status = 'active';
    }

    await sla.save();

    res.json({
      success: true,
      data: sla,
      message: 'Breach resolved successfully',
    });
  } catch (error: any) {
    console.error('Resolve breach error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resolve breach',
    });
  }
});

// Calculate Compliance Helper
async function recalculateCompliance(sla: any) {
  let totalWeight = 0;
  let weightedCompliance = 0;

  for (const metric of sla.metrics) {
    const actual = sla.actuals.find((a: any) => a.metricName === metric.name);
    if (!actual) continue;

    const weight = metric.weight || 1;
    totalWeight += weight;

    // Calculate if metric meets target
    let meetsTarget = false;
    const target = metric.target;

    switch (target.operator) {
      case 'gte':
        meetsTarget = actual.currentValue >= target.value;
        break;
      case 'lte':
        meetsTarget = actual.currentValue <= target.value;
        break;
      case 'eq':
        meetsTarget = actual.currentValue === target.value;
        break;
      case 'gt':
        meetsTarget = actual.currentValue > target.value;
        break;
      case 'lt':
        meetsTarget = actual.currentValue < target.value;
        break;
    }

    const metricCompliance = meetsTarget ? 100 : 0;
    weightedCompliance += metricCompliance * weight;
  }

  if (totalWeight > 0) {
    sla.overallCompliance = Math.round(weightedCompliance / totalWeight);
    sla.lastCalculatedAt = new Date();
  }
}

// Get SLA Stats
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const [total, byStatus, byPriority, avgCompliance, breachStats] = await Promise.all([
      SLA.countDocuments({ tenantId, isDeleted: false }),
      SLA.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      SLA.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      SLA.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: null, avgCompliance: { $avg: '$overallCompliance' } } },
      ]),
      SLA.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: null, totalBreaches: { $sum: '$totalBreaches' }, openBreaches: { $sum: '$openBreaches' } } },
      ]),
    ]);

    const byStatusMap = byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const byPriorityMap = byPriority.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        total,
        byStatus: byStatusMap,
        byPriority: byPriorityMap,
        averageCompliance: Math.round(avgCompliance[0]?.avgCompliance || 0),
        totalBreaches: breachStats[0]?.totalBreaches || 0,
        openBreaches: breachStats[0]?.openBreaches || 0,
      },
    });
  } catch (error: any) {
    console.error('Get SLA stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get SLA stats',
    });
  }
});

export default router;
