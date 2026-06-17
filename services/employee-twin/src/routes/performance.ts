import { Router, Request, Response } from 'express';
import { Performance } from '../models/Performance';
import { PerformanceValidationSchema } from '../models/Performance';

const router = Router();

// Middleware to extract tenant ID
const extractTenantId = (req: Request): string => {
  return req.headers['x-tenant-id'] as string || 'default';
};

// Create performance record
router.post('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { employeeId } = req.params;

    // Validate input
    const validatedData = PerformanceValidationSchema.parse({
      tenantId,
      employeeId,
      ...req.body
    });

    const performance = new Performance(validatedData);
    await performance.save();

    res.status(201).json({
      success: true,
      data: performance,
      message: 'Performance record created successfully'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all performance records for employee
router.get('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { period, startDate, endDate, limit = 12 } = req.query;

    const filter: any = { tenantId, employeeId: req.params.employeeId };

    if (period) filter.period = period;
    if (startDate || endDate) {
      filter.periodStart = {};
      if (startDate) filter.periodStart.$gte = new Date(startDate as string);
      if (endDate) filter.periodStart.$lte = new Date(endDate as string);
    }

    const records = await Performance.find(filter)
      .sort({ periodStart: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get latest performance record
router.get('/:employeeId/latest', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);

    const record = await Performance.findOne({
      tenantId,
      employeeId: req.params.employeeId
    }).sort({ periodStart: -1 });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'No performance records found'
      });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get performance trends
router.get('/:employeeId/trends', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { months = 6 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Number(months));

    const records = await Performance.find({
      tenantId,
      employeeId: req.params.employeeId,
      periodStart: { $gte: startDate }
    }).sort({ periodStart: 1 });

    const trends = {
      csat: records.map(r => ({ date: r.periodStart, value: r.csat })),
      resolutionTime: records.map(r => ({ date: r.periodStart, value: r.averageResolutionTime })),
      ticketsHandled: records.map(r => ({ date: r.periodStart, value: r.ticketsHandled })),
      overallScore: records.map(r => ({ date: r.periodStart, value: r.overallScore })),
      qualityScore: records.map(r => ({ date: r.periodStart, value: r.qualityScore }))
    };

    res.json({
      success: true,
      data: {
        records,
        trends
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get performance statistics
router.get('/:employeeId/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { period = 'monthly', months = 6 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Number(months));

    const records = await Performance.find({
      tenantId,
      employeeId: req.params.employeeId,
      period: period as string,
      periodStart: { $gte: startDate }
    });

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No performance records found'
      });
    }

    const stats = {
      averageCsat: 0,
      averageResolutionTime: 0,
      totalTicketsHandled: 0,
      totalTicketsResolved: 0,
      averageOverallScore: 0,
      averageQualityScore: 0,
      averageProductivityIndex: 0,
      averageAttendanceRate: 0,
      bestCsat: 0,
      worstResolutionTime: 0
    };

    const csatRecords = records.filter(r => r.csat !== undefined);
    const resolutionRecords = records.filter(r => r.averageResolutionTime !== undefined);
    const overallRecords = records.filter(r => r.overallScore !== undefined);
    const qualityRecords = records.filter(r => r.qualityScore !== undefined);
    const productivityRecords = records.filter(r => r.productivityIndex !== undefined);
    const attendanceRecords = records.filter(r => r.attendanceRate !== undefined);

    if (csatRecords.length > 0) {
      stats.averageCsat = csatRecords.reduce((sum, r) => sum + (r.csat || 0), 0) / csatRecords.length;
      stats.bestCsat = Math.max(...csatRecords.map(r => r.csat || 0));
    }

    if (resolutionRecords.length > 0) {
      stats.averageResolutionTime = resolutionRecords.reduce((sum, r) => sum + (r.averageResolutionTime || 0), 0) / resolutionRecords.length;
      stats.worstResolutionTime = Math.max(...resolutionRecords.map(r => r.averageResolutionTime || 0));
    }

    stats.totalTicketsHandled = records.reduce((sum, r) => sum + r.ticketsHandled, 0);
    stats.totalTicketsResolved = records.reduce((sum, r) => sum + r.ticketsResolved, 0);

    if (overallRecords.length > 0) {
      stats.averageOverallScore = overallRecords.reduce((sum, r) => sum + (r.overallScore || 0), 0) / overallRecords.length;
    }

    if (qualityRecords.length > 0) {
      stats.averageQualityScore = qualityRecords.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / qualityRecords.length;
    }

    if (productivityRecords.length > 0) {
      stats.averageProductivityIndex = productivityRecords.reduce((sum, r) => sum + (r.productivityIndex || 0), 0) / productivityRecords.length;
    }

    if (attendanceRecords.length > 0) {
      stats.averageAttendanceRate = attendanceRecords.reduce((sum, r) => sum + (r.attendanceRate || 0), 0) / attendanceRecords.length;
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update performance record
router.put('/record/:recordId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const record = await Performance.findOneAndUpdate(
      { tenantId, _id: req.params.recordId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    res.json({
      success: true,
      data: record,
      message: 'Performance record updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Compare employees' performance
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { employeeIds, metric, period = 'monthly' } = req.body;

    if (!employeeIds || employeeIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 employee IDs required for comparison'
      });
    }

    const records = await Performance.find({
      tenantId,
      employeeId: { $in: employeeIds },
      period
    }).sort({ employeeId: 1, periodStart: -1 });

    // Get latest record for each employee
    const latestByEmployee: Record<string, any> = {};
    for (const record of records) {
      if (!latestByEmployee[record.employeeId]) {
        latestByEmployee[record.employeeId] = record;
      }
    }

    const comparison = employeeIds.map(id => ({
      employeeId: id,
      record: latestByEmployee[id] || null,
      metricValue: latestByEmployee[id]?.[metric] || null
    }));

    res.json({
      success: true,
      data: {
        metric,
        period,
        comparison
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get department performance summary
router.get('/department/:department/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { period = 'monthly', startDate, endDate } = req.query;

    // This would require joining with Employee collection
    // For now, we'll filter by employee IDs that would be in the department
    // In a real implementation, you'd query the Employee collection first

    const filter: any = { tenantId, period };

    if (startDate || endDate) {
      filter.periodStart = {};
      if (startDate) filter.periodStart.$gte = new Date(startDate as string);
      if (endDate) filter.periodStart.$lte = new Date(endDate as string);
    }

    const records = await Performance.find(filter);

    const summary = {
      totalEmployees: new Set(records.map(r => r.employeeId)).size,
      totalTicketsHandled: records.reduce((sum, r) => sum + r.ticketsHandled, 0),
      totalTicketsResolved: records.reduce((sum, r) => sum + r.ticketsResolved, 0),
      averageCsat: 0,
      averageResolutionTime: 0,
      averageOverallScore: 0,
      averageQualityScore: 0
    };

    const csatRecords = records.filter(r => r.csat !== undefined);
    const resolutionRecords = records.filter(r => r.averageResolutionTime !== undefined);
    const overallRecords = records.filter(r => r.overallScore !== undefined);
    const qualityRecords = records.filter(r => r.qualityScore !== undefined);

    if (csatRecords.length > 0) {
      summary.averageCsat = csatRecords.reduce((sum, r) => sum + (r.csat || 0), 0) / csatRecords.length;
    }

    if (resolutionRecords.length > 0) {
      summary.averageResolutionTime = resolutionRecords.reduce((sum, r) => sum + (r.averageResolutionTime || 0), 0) / resolutionRecords.length;
    }

    if (overallRecords.length > 0) {
      summary.averageOverallScore = overallRecords.reduce((sum, r) => sum + (r.overallScore || 0), 0) / overallRecords.length;
    }

    if (qualityRecords.length > 0) {
      summary.averageQualityScore = qualityRecords.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / qualityRecords.length;
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete performance record
router.delete('/record/:recordId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const result = await Performance.deleteOne({
      tenantId,
      _id: req.params.recordId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    res.json({
      success: true,
      message: 'Performance record deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
