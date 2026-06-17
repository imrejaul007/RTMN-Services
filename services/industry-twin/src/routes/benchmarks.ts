import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Benchmark } from '../models/Benchmark';
import { IndustryType } from '../models/IndustryProfile';

const router = Router();

// Validation schemas
const createBenchmarkSchema = z.object({
  industryType: z.enum(['restaurant', 'hotel', 'healthcare', 'retail', 'manufacturing', 'fintech']),
  businessSize: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
  region: z.string().optional(),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  year: z.number().min(2020).max(2030),
  benchmarks: z.array(z.object({
    metricName: z.string(),
    value: z.number(),
    unit: z.string(),
    percentile: z.number().optional(),
    sampleSize: z.number().optional(),
    period: z.string().optional()
  })).optional(),
  performanceComparisons: z.array(z.object({
    metricName: z.string(),
    yourValue: z.number(),
    industryAverage: z.number(),
    top25Percentile: z.number(),
    top10Percentile: z.number(),
    unit: z.string(),
    trend: z.enum(['improving', 'stable', 'declining']).optional(),
    gap: z.number().optional()
  })).optional(),
  topPerformers: z.array(z.object({
    metricName: z.string(),
    value: z.number(),
    practices: z.array(z.string()).optional()
  })).optional(),
  improvementAreas: z.array(z.object({
    metricName: z.string(),
    gap: z.number(),
    recommendations: z.array(z.string()).optional()
  })).optional()
});

// Get latest benchmark
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType } = req.query;

    if (!industryType) {
      return res.status(400).json({
        success: false,
        error: 'industryType query parameter is required'
      });
    }

    const benchmark = await Benchmark.getLatest(tenantId, industryType as IndustryType);

    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: 'No benchmark data found'
      });
    }

    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error fetching latest benchmark:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get historical benchmarks
router.get('/history', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType, limit } = req.query;

    if (!industryType) {
      return res.status(400).json({
        success: false,
        error: 'industryType query parameter is required'
      });
    }

    const benchmarks = await Benchmark.getHistorical(
      tenantId,
      industryType as IndustryType,
      limit ? parseInt(limit as string) : 4
    );

    res.json({
      success: true,
      data: benchmarks,
      count: benchmarks.length
    });
  } catch (error) {
    console.error('Error fetching historical benchmarks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all benchmarks for tenant
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType, year } = req.query;

    let query: any = { tenantId };

    if (industryType) {
      query.industryType = industryType;
    }

    if (year) {
      query.year = parseInt(year as string);
    }

    const benchmarks = await Benchmark.find(query).sort({ year: -1, quarter: -1 });

    res.json({
      success: true,
      data: benchmarks,
      count: benchmarks.length
    });
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get specific benchmark
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { id } = req.params;

    const benchmark = await Benchmark.findOne({ _id: id, tenantId });

    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: 'Benchmark not found'
      });
    }

    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error fetching benchmark:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create benchmark
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const validationResult = createBenchmarkSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const benchmark = new Benchmark({
      tenantId,
      ...validationResult.data
    });

    await benchmark.save();

    res.status(201).json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error creating benchmark:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update benchmark
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { id } = req.params;

    const validationResult = createBenchmarkSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const benchmark = await Benchmark.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: validationResult.data },
      { new: true, runValidators: true }
    );

    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: 'Benchmark not found'
      });
    }

    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error updating benchmark:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get performance tier
router.get('/:id/tier', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { id } = req.params;

    const benchmark = await Benchmark.findOne({ _id: id, tenantId });

    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: 'Benchmark not found'
      });
    }

    const tier = benchmark.getTier(benchmark.overallScore);

    res.json({
      success: true,
      data: {
        score: benchmark.overallScore,
        tier,
        scoreChange: benchmark.scoreChange,
        competitorsAverage: benchmark.competitorsAverage
      }
    });
  } catch (error) {
    console.error('Error fetching performance tier:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get metric performance comparison
router.get('/:id/metric/:metricName', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { id, metricName } = req.params;

    const benchmark = await Benchmark.findOne({ _id: id, tenantId });

    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: 'Benchmark not found'
      });
    }

    const comparison = benchmark.getMetricPerformance(metricName);

    if (!comparison) {
      return res.status(404).json({
        success: false,
        error: 'Metric not found in benchmark'
      });
    }

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error fetching metric performance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get industry benchmark templates
router.get('/meta/benchmarks/:industryType', (req: Request, res: Response) => {
  const { industryType } = req.params;

  const templates: Record<string, any[]> = {
    restaurant: [
      { metricName: 'foodCostPercentage', unit: 'percentage', description: 'Food cost as percentage of revenue' },
      { metricName: 'laborCostPercentage', unit: 'percentage', description: 'Labor cost as percentage of revenue' },
      { metricName: 'tableTurnoverRate', unit: 'count', description: 'Average table turns per day' },
      { metricName: 'averageCheckAmount', unit: 'currency', description: 'Average customer check value' },
      { metricName: 'customerSatisfaction', unit: 'percentage', description: 'Customer satisfaction score' }
    ],
    hotel: [
      { metricName: 'occupancyRate', unit: 'percentage', description: 'Room occupancy percentage' },
      { metricName: 'adr', unit: 'currency', description: 'Average Daily Rate' },
      { metricName: 'revpar', unit: 'currency', description: 'Revenue Per Available Room' },
      { metricName: 'guestSatisfaction', unit: 'percentage', description: 'Guest satisfaction score' },
      { metricName: 'cancellationRate', unit: 'percentage', description: 'Booking cancellation rate' }
    ],
    healthcare: [
      { metricName: 'patientSatisfaction', unit: 'percentage', description: 'Patient satisfaction score' },
      { metricName: 'averageWaitTime', unit: 'minutes', description: 'Average patient wait time' },
      { metricName: 'bedOccupancyRate', unit: 'percentage', description: 'Bed occupancy rate' },
      { metricName: 'readmissionRate', unit: 'percentage', description: 'Hospital readmission rate' }
    ],
    retail: [
      { metricName: 'conversionRate', unit: 'percentage', description: 'Visitor to customer conversion' },
      { metricName: 'averageOrderValue', unit: 'currency', description: 'Average order value' },
      { metricName: 'customerRetention', unit: 'percentage', description: 'Customer retention rate' },
      { metricName: 'inventoryTurnover', unit: 'count', description: 'Inventory turnover ratio' }
    ],
    manufacturing: [
      { metricName: 'oee', unit: 'percentage', description: 'Overall Equipment Effectiveness' },
      { metricName: 'defectRate', unit: 'percentage', description: 'Product defect rate' },
      { metricName: 'onTimeDelivery', unit: 'percentage', description: 'On-time delivery rate' },
      { metricName: 'productionYield', unit: 'percentage', description: 'Production yield rate' }
    ],
    fintech: [
      { metricName: 'transactionSuccessRate', unit: 'percentage', description: 'Transaction success rate' },
      { metricName: 'fraudRate', unit: 'percentage', description: 'Fraud detection rate' },
      { metricName: 'customerAcquisitionCost', unit: 'currency', description: 'Cost to acquire customer' },
      { metricName: 'churnRate', unit: 'percentage', description: 'Customer churn rate' }
    ]
  };

  const metrics = templates[industryType] || [];

  res.json({
    success: true,
    data: metrics,
    count: metrics.length
  });
});

export default router;
