import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Performance, PerformancePeriod, PerformanceStatus } from '../models/Performance';

const router = Router();

// Validation Schemas
const createPerformanceSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  periodStart: z.string().or(z.date()),
  periodEnd: z.string().or(z.date()),
  deliveryMetrics: z.object({
    onTimeDeliveryRate: z.number().optional(),
    averageDeliveryTime: z.number().optional(),
    deliveryAccuracy: z.number().optional(),
    fulfillmentRate: z.number().optional(),
    backorderRate: z.number().optional(),
    totalOrders: z.number().optional(),
    fulfilledOrders: z.number().optional(),
    lateOrders: z.number().optional(),
    cancelledOrders: z.number().optional(),
  }).optional(),
  qualityMetrics: z.object({
    qualityScore: z.number().optional(),
    defectRate: z.number().optional(),
    returnRate: z.number().optional(),
    customerComplaints: z.number().optional(),
    firstPassYield: z.number().optional(),
    inspectionPassRate: z.number().optional(),
  }).optional(),
  responsivenessMetrics: z.object({
    averageResponseTime: z.number().optional(),
    firstResponseTime: z.number().optional(),
    resolutionTime: z.number().optional(),
    escalationRate: z.number().optional(),
    communicationQuality: z.number().optional(),
    availabilityRate: z.number().optional(),
  }).optional(),
  costMetrics: z.object({
    averageUnitCost: z.number().optional(),
    costEfficiency: z.number().optional(),
    priceCompetitiveness: z.number().optional(),
    totalSpend: z.number().optional(),
    savingsGenerated: z.number().optional(),
    costVariance: z.number().optional(),
  }).optional(),
  complianceMetrics: z.object({
    complianceRate: z.number().optional(),
    regulatoryCompliance: z.number().optional(),
    documentationAccuracy: z.number().optional(),
    auditScore: z.number().optional(),
    certifications: z.array(z.string()).optional(),
  }).optional(),
  totalOrders: z.number().optional(),
  totalRevenue: z.number().optional(),
  slaCompliance: z.number().optional(),
  customerSatisfaction: z.number().optional(),
  netPromoterScore: z.number().optional(),
});

const updatePerformanceSchema = createPerformanceSchema.partial();

const addIncidentSchema = z.object({
  type: z.enum(['delay', 'quality_issue', 'compliance_breach', 'service_failure', 'other']),
  severity: z.enum(['minor', 'major', 'critical']),
  description: z.string().min(1),
  impact: z.object({
    ordersAffected: z.number().optional(),
    financialImpact: z.number().optional(),
    reputationalImpact: z.number().optional(),
  }).optional(),
});

// Middleware
const extractTenantId = (req: Request, res: Response, next: NextFunction) => {
  req.body.tenantId = req.headers['x-tenant-id'] as string || 'default';
  next();
};

// Calculate Overall Score
function calculateOverallScore(performance: any): { score: number; status: PerformanceStatus; riskLevel: 'low' | 'medium' | 'high' } {
  let totalWeight = 0;
  let weightedScore = 0;

  // Delivery (30%)
  if (performance.deliveryMetrics) {
    const dm = performance.deliveryMetrics;
    const deliveryScore = dm.onTimeDeliveryRate || 50;
    weightedScore += deliveryScore * 30;
    totalWeight += 30;
  }

  // Quality (25%)
  if (performance.qualityMetrics) {
    const qm = performance.qualityMetrics;
    const qualityScore = qm.qualityScore || 50;
    weightedScore += qualityScore * 25;
    totalWeight += 25;
  }

  // Responsiveness (15%)
  if (performance.responsivenessMetrics) {
    const rm = performance.responsivenessMetrics;
    // Lower response time = better, so invert and scale
    const responseScore = Math.max(0, 100 - (rm.averageResponseTime || 60) / 2);
    weightedScore += responseScore * 15;
    totalWeight += 15;
  }

  // Cost (15%)
  if (performance.costMetrics) {
    const cm = performance.costMetrics;
    const costScore = cm.costEfficiency || 50;
    weightedScore += costScore * 15;
    totalWeight += 15;
  }

  // Compliance (15%)
  if (performance.complianceMetrics) {
    const cm = performance.complianceMetrics;
    const complianceScore = cm.complianceRate || 50;
    weightedScore += complianceScore * 15;
    totalWeight += 15;
  }

  const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;

  // Determine status
  let status: PerformanceStatus = 'on_track';
  if (overallScore >= 85) status = 'exceeded';
  else if (overallScore >= 70) status = 'on_track';
  else if (overallScore >= 50) status = 'at_risk';
  else status = 'below_target';

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (overallScore < 50 || (performance.incidents?.filter((i: any) => !i.resolved).length > 5)) {
    riskLevel = 'high';
  } else if (overallScore < 70) {
    riskLevel = 'medium';
  }

  return { score: overallScore, status, riskLevel };
}

// Create Performance Record
router.post('/:partnerId', extractTenantId, async (req: Request, res: Response) => {
  try {
    const validationResult = createPerformanceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;
    const performanceId = `PERF-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Set all records as non-current first
    await Performance.updateMany(
      { partnerId: req.params.partnerId, tenantId: req.body.tenantId },
      { isCurrent: false }
    );

    const deliveryMetrics = data.deliveryMetrics || {};
    const qualityMetrics = data.qualityMetrics || {};
    const responsivenessMetrics = data.responsivenessMetrics || {};
    const costMetrics = data.costMetrics || {};
    const complianceMetrics = data.complianceMetrics || {};

    const performance = new Performance({
      performanceId,
      tenantId: req.body.tenantId,
      partnerId: req.params.partnerId,
      period: data.period,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      isCurrent: true,
      deliveryMetrics,
      qualityMetrics,
      responsivenessMetrics,
      costMetrics,
      complianceMetrics,
      totalOrders: data.totalOrders || 0,
      totalRevenue: data.totalRevenue || 0,
      slaCompliance: data.slaCompliance || 100,
      customerSatisfaction: data.customerSatisfaction,
      netPromoterScore: data.netPromoterScore,
      totalIncidents: 0,
      resolvedIncidents: 0,
    });

    // Calculate overall score
    const { score, status, riskLevel } = calculateOverallScore(performance);
    performance.overallScore = score;
    performance.status = status;
    performance.riskLevel = riskLevel;

    // Get previous score for trend
    const previous = await Performance.findOne({
      partnerId: req.params.partnerId,
      tenantId: req.body.tenantId,
      isDeleted: false,
    }).sort({ periodEnd: -1 });

    if (previous) {
      performance.previousScore = previous.overallScore;
      if (score > previous.overallScore + 5) performance.trend = 'improving';
      else if (score < previous.overallScore - 5) performance.trend = 'declining';
      else performance.trend = 'stable';
    }

    await performance.save();

    res.status(201).json({
      success: true,
      data: performance,
      message: 'Performance record created successfully',
    });
  } catch (error: any) {
    console.error('Create performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create performance record',
    });
  }
});

// Get All Performance Records
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      period,
      status,
      partnerId,
      trend,
      sortBy = 'periodEnd',
      sortOrder = 'desc',
    } = req.query;

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const query: any = { tenantId, isDeleted: false };

    if (period) query.period = period;
    if (status) query.status = status;
    if (partnerId) query.partnerId = partnerId;
    if (trend) query.trend = trend;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const sort: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [performances, total] = await Promise.all([
      Performance.find(query).sort(sort).skip(skip).limit(limitNum),
      Performance.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: performances,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get performances error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get performance records',
    });
  }
});

// Get Performance by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const performance = await Performance.findOne({
      $or: [{ performanceId: req.params.id }, { _id: req.params.id }],
      tenantId,
      isDeleted: false,
    });

    if (!performance) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found',
      });
    }

    res.json({
      success: true,
      data: performance,
    });
  } catch (error: any) {
    console.error('Get performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get performance record',
    });
  }
});

// Update Performance Record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const validationResult = updatePerformanceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const data = validationResult.data;

    if (data.periodStart) (data as any).periodStart = new Date(data.periodStart);
    if (data.periodEnd) (data as any).periodEnd = new Date(data.periodEnd);

    const existing = await Performance.findOne({
      $or: [{ performanceId: req.params.id }, { _id: req.params.id }],
      tenantId,
      isDeleted: false,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found',
      });
    }

    // Merge with existing data
    const updatedData = {
      ...existing.toObject(),
      ...data,
    };

    // Recalculate score
    const { score, status, riskLevel } = calculateOverallScore(updatedData);
    (data as any).overallScore = score;
    (data as any).status = status;
    (data as any).riskLevel = riskLevel;
    (data as any).calculatedAt = new Date();

    const performance = await Performance.findByIdAndUpdate(
      existing._id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: performance,
      message: 'Performance record updated successfully',
    });
  } catch (error: any) {
    console.error('Update performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update performance record',
    });
  }
});

// Get Performance by Partner
router.get('/partner/:partnerId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { period, current } = req.query;

    const query: any = {
      tenantId,
      partnerId: req.params.partnerId,
      isDeleted: false,
    };

    if (period) query.period = period;
    if (current === 'true') query.isCurrent = true;

    const performances = await Performance.find(query)
      .sort({ periodEnd: -1 })
      .limit(20);

    res.json({
      success: true,
      data: performances,
    });
  } catch (error: any) {
    console.error('Get partner performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get partner performance',
    });
  }
});

// Get Current Performance by Partner
router.get('/partner/:partnerId/current', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const performance = await Performance.findOne({
      tenantId,
      partnerId: req.params.partnerId,
      isCurrent: true,
      isDeleted: false,
    });

    if (!performance) {
      return res.status(404).json({
        success: false,
        error: 'No current performance record found',
      });
    }

    res.json({
      success: true,
      data: performance,
    });
  } catch (error: any) {
    console.error('Get current performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get current performance',
    });
  }
});

// Add Incident
router.post('/:id/incidents', async (req: Request, res: Response) => {
  try {
    const validationResult = addIncidentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { type, severity, description, impact } = validationResult.data;

    const performance = await Performance.findOne({
      $or: [{ performanceId: req.params.id }, { _id: req.params.id }],
      tenantId,
      isDeleted: false,
    });

    if (!performance) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found',
      });
    }

    const incident = {
      incidentId: `INC-${uuidv4().substring(0, 8).toUpperCase()}`,
      type,
      severity,
      description,
      reportedAt: new Date(),
      impact: impact || {},
      resolved: false,
    };

    performance.incidents.push(incident);
    performance.totalIncidents += 1;

    // Update risk level if critical incident
    if (severity === 'critical' && performance.riskLevel === 'low') {
      performance.riskLevel = 'medium';
    }
    if (severity === 'critical' && performance.overallScore < 70) {
      performance.riskLevel = 'high';
    }

    // Recalculate overall score
    const { score, status, riskLevel } = calculateOverallScore(performance);
    performance.overallScore = score;
    performance.status = status;
    if (riskLevel === 'high') performance.riskLevel = 'high';

    await performance.save();

    res.status(201).json({
      success: true,
      data: performance,
      message: 'Incident added successfully',
    });
  } catch (error: any) {
    console.error('Add incident error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add incident',
    });
  }
});

// Resolve Incident
router.patch('/:id/incidents/:incidentId/resolve', async (req: Request, res: Response) => {
  try {
    const { resolutionNotes } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const performance = await Performance.findOne({
      $or: [{ performanceId: req.params.id }, { _id: req.params.id }],
      tenantId,
      isDeleted: false,
    });

    if (!performance) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found',
      });
    }

    const incident = performance.incidents.find((i) => i.incidentId === req.params.incidentId);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found',
      });
    }

    incident.resolved = true;
    incident.resolutionNotes = resolutionNotes;
    incident.resolvedAt = new Date();
    incident.resolutionTime = Math.round(
      (incident.resolvedAt.getTime() - incident.reportedAt.getTime()) / 60000
    );

    performance.resolvedIncidents += 1;

    await performance.save();

    res.json({
      success: true,
      data: performance,
      message: 'Incident resolved successfully',
    });
  } catch (error: any) {
    console.error('Resolve incident error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resolve incident',
    });
  }
});

// Get Performance Stats
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const [total, byStatus, byTrend, avgScore, topPerformers] = await Promise.all([
      Performance.countDocuments({ tenantId, isDeleted: false }),
      Performance.aggregate([
        { $match: { tenantId, isDeleted: false, isCurrent: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Performance.aggregate([
        { $match: { tenantId, isDeleted: false, isCurrent: true } },
        { $group: { _id: '$trend', count: { $sum: 1 } } },
      ]),
      Performance.aggregate([
        { $match: { tenantId, isDeleted: false, isCurrent: true } },
        { $group: { _id: null, avgScore: { $avg: '$overallScore' } } },
      ]),
      Performance.find({ tenantId, isDeleted: false, isCurrent: true })
        .sort({ overallScore: -1 })
        .limit(10)
        .select('partnerId overallScore status trend deliveryMetrics.qualityMetrics'),
    ]);

    const byStatusMap = byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const byTrendMap = byTrend.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        total,
        byStatus: byStatusMap,
        byTrend: byTrendMap,
        averageScore: Math.round(avgScore[0]?.avgScore || 0),
        topPerformers,
      },
    });
  } catch (error: any) {
    console.error('Get performance stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get performance stats',
    });
  }
});

// Get Performance Comparison (for partner over time)
router.get('/compare/:partnerId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { periods = '5' } = req.query;

    const performances = await Performance.find({
      tenantId,
      partnerId: req.params.partnerId,
      isDeleted: false,
    })
      .sort({ periodEnd: -1 })
      .limit(parseInt(periods as string));

    // Calculate trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (performances.length >= 2) {
      const latest = performances[0].overallScore;
      const previous = performances[1].overallScore;
      if (latest > previous + 5) trend = 'improving';
      else if (latest < previous - 5) trend = 'declining';
    }

    // Calculate average improvement
    let avgImprovement = 0;
    if (performances.length >= 2) {
      let totalDiff = 0;
      for (let i = 1; i < performances.length; i++) {
        totalDiff += performances[i].overallScore - performances[i - 1].overallScore;
      }
      avgImprovement = Math.round(totalDiff / (performances.length - 1));
    }

    res.json({
      success: true,
      data: {
        records: performances.reverse(), // Oldest first for timeline
        trend,
        avgImprovement,
        currentScore: performances[0]?.overallScore || 0,
      },
    });
  } catch (error: any) {
    console.error('Compare performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to compare performance',
    });
  }
});

export default router;
