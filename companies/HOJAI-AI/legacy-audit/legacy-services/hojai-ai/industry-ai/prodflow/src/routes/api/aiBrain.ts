/**
 * PRODFLOW AI BRAIN ROUTES
 * Advanced AI-powered manufacturing intelligence endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { aiBrain } from '../../services/aiBrain';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { Product, Order, Inventory, QCReport } from '../../models';

const router = Router();

// ============================================
// AI BRAIN STATUS
// ============================================

/**
 * GET /api/ai/brain/status
 * Get AI Brain status and capabilities
 */
router.get('/brain/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'PRODFLOW AI Brain',
    version: '1.0.0',
    capabilities: {
      productionPlanning: {
        enabled: true,
        features: [
          'Intelligent order scheduling',
          'Resource optimization',
          'Bottleneck detection',
          'Capacity planning',
          'Machine assignment'
        ]
      },
      qualityControl: {
        enabled: true,
        features: [
          'Defect prediction',
          'Quality scoring',
          'Risk assessment',
          'Historical analysis',
          'Root cause identification'
        ]
      },
      inventoryOptimization: {
        enabled: true,
        features: [
          'EOQ calculation',
          'Reorder point optimization',
          'Stock level analysis',
          'Turnover analysis',
          'Capital optimization'
        ]
      },
      demandForecasting: {
        enabled: true,
        features: [
          'Time series analysis',
          'Seasonality detection',
          'Trend analysis',
          'Confidence intervals',
          'Multi-period forecasting'
        ]
      },
      maintenancePrediction: {
        enabled: true,
        features: [
          'Failure probability',
          'Remaining life estimation',
          'Risk assessment',
          'Cost estimation',
          'Action recommendations'
        ]
      }
    },
    endpoints: {
      productionPlan: 'POST /api/ai/brain/production/plan',
      qualityPrediction: 'POST /api/ai/brain/quality/predict',
      inventoryOptimization: 'POST /api/ai/brain/inventory/optimize',
      demandForecast: 'POST /api/ai/brain/demand/forecast',
      maintenancePrediction: 'POST /api/ai/brain/maintenance/predict',
      insights: 'GET /api/ai/brain/insights'
    }
  });
});

// ============================================
// PRODUCTION PLANNING
// ============================================

/**
 * POST /api/ai/brain/production/plan
 * Generate optimized production schedule
 */
router.post('/brain/production/plan', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { orders, constraints } = req.body;

    logger.info('Generating AI production plan', {
      orderCount: orders?.length || 'all pending',
      userId: req.userId
    });

    const plan = await aiBrain.generateProductionPlan({ orders, constraints });

    res.json({
      success: true,
      aiAgent: 'Production Planner',
      generatedAt: new Date().toISOString(),
      plan
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/brain/production/metrics
 * Get real-time production metrics
 */
router.get('/brain/production/metrics', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [pendingOrders, inProgressOrders, completedToday, qcPassRate] = await Promise.all([
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'in-production' }),
      Order.countDocuments({
        status: 'completed',
        completedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      getQCPassRate()
    ]);

    res.json({
      success: true,
      metrics: {
        pendingOrders,
        inProgressOrders,
        completedToday,
        qcPassRate,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// QUALITY CONTROL PREDICTIONS
// ============================================

/**
 * POST /api/ai/brain/quality/predict
 * Predict quality outcomes for a product
 */
router.post('/brain/quality/predict', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required'
      });
    }

    logger.info('Generating quality prediction', { productId, userId: req.userId });

    const prediction = await aiBrain.predictQuality(productId);

    res.json({
      success: true,
      aiAgent: 'Quality Predictor',
      generatedAt: new Date().toISOString(),
      prediction
    });
  } catch (error: any) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    next(error);
  }
});

/**
 * POST /api/ai/brain/quality/batch-predict
 * Batch quality predictions for multiple products
 */
router.post('/brain/quality/batch-predict', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        error: 'productIds array is required'
      });
    }

    const predictions = await Promise.all(
      productIds.map(async (productId: string) => {
        try {
          return await aiBrain.predictQuality(productId);
        } catch (error) {
          return { productId, error: 'Prediction failed' };
        }
      })
    );

    res.json({
      success: true,
      aiAgent: 'Quality Predictor',
      generatedAt: new Date().toISOString(),
      predictions
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// INVENTORY OPTIMIZATION
// ============================================

/**
 * POST /api/ai/brain/inventory/optimize
 * Generate inventory optimization recommendations
 */
router.post('/brain/inventory/optimize', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    logger.info('Generating inventory optimization', { userId: req.userId });

    const optimization = await aiBrain.optimizeInventory();

    res.json({
      success: true,
      aiAgent: 'Inventory Optimizer',
      generatedAt: new Date().toISOString(),
      optimization
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/brain/inventory/alerts
 * Get urgent inventory alerts
 */
router.get('/brain/inventory/alerts', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [criticalStock, outOfStock, overstocked] = await Promise.all([
      Inventory.find({ $expr: { $lte: ['$quantity', { $multiply: ['$minStock', 0.5] }] } })
        .populate('productId')
        .limit(20),
      Inventory.find({ quantity: 0 }).populate('productId'),
      Inventory.find({
        $expr: { $gt: ['$quantity', { $multiply: ['$maxStock', 1.2] }] }
      })
        .populate('productId')
        .limit(10)
    ]);

    const alerts = [
      ...criticalStock.map(i => ({
        type: 'critical',
        productId: (i.productId as any)?._id,
        productName: (i.productId as any)?.name,
        currentStock: i.quantity,
        message: `Critical stock level: ${i.quantity} units`
      })),
      ...outOfStock.map(i => ({
        type: 'out-of-stock',
        productId: (i.productId as any)?._id,
        productName: (i.productId as any)?.name,
        currentStock: 0,
        message: 'Product is out of stock'
      })),
      ...overstocked.map(i => ({
        type: 'overstocked',
        productId: (i.productId as any)?._id,
        productName: (i.productId as any)?.name,
        currentStock: i.quantity,
        message: `Excess inventory: ${i.quantity} units`
      }))
    ];

    res.json({
      success: true,
      alerts,
      summary: {
        critical: criticalStock.length,
        outOfStock: outOfStock.length,
        overstocked: overstocked.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DEMAND FORECASTING
// ============================================

/**
 * POST /api/ai/brain/demand/forecast
 * Generate demand forecast for a product
 */
router.post('/brain/demand/forecast', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { productId, periods = 12 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required'
      });
    }

    logger.info('Generating demand forecast', { productId, periods, userId: req.userId });

    const forecast = await aiBrain.forecastDemand(productId, periods);

    res.json({
      success: true,
      aiAgent: 'Demand Forecaster',
      generatedAt: new Date().toISOString(),
      forecast
    });
  } catch (error: any) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    next(error);
  }
});

/**
 * POST /api/ai/brain/demand/batch-forecast
 * Batch demand forecasts for multiple products
 */
router.post('/brain/demand/batch-forecast', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { productIds, periods = 6 } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        error: 'productIds array is required'
      });
    }

    const forecasts = await Promise.all(
      productIds.slice(0, 10).map(async (productId: string) => {
        try {
          return await aiBrain.forecastDemand(productId, periods);
        } catch (error) {
          return { productId, error: 'Forecast failed' };
        }
      })
    );

    res.json({
      success: true,
      aiAgent: 'Demand Forecaster',
      generatedAt: new Date().toISOString(),
      forecasts
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// MAINTENANCE PREDICTION
// ============================================

/**
 * POST /api/ai/brain/maintenance/predict
 * Predict equipment maintenance needs
 */
router.post('/brain/maintenance/predict', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { equipmentId } = req.body;

    if (!equipmentId) {
      return res.status(400).json({
        success: false,
        error: 'equipmentId is required'
      });
    }

    logger.info('Generating maintenance prediction', { equipmentId, userId: req.userId });

    const prediction = await aiBrain.predictMaintenance(equipmentId);

    res.json({
      success: true,
      aiAgent: 'Maintenance Predictor',
      generatedAt: new Date().toISOString(),
      prediction
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/brain/maintenance/equipment
 * Get list of equipment with maintenance status
 */
router.get('/brain/maintenance/equipment', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Simulate equipment list
    const equipment = [
      { id: 'EQ-001', name: 'CNC Machine A', status: 'operational', risk: 'low' },
      { id: 'EQ-002', name: 'CNC Machine B', status: 'operational', risk: 'medium' },
      { id: 'EQ-003', name: 'Assembly Line 1', status: 'maintenance', risk: 'high' },
      { id: 'EQ-004', name: 'Packaging Machine', status: 'operational', risk: 'low' },
      { id: 'EQ-005', name: 'Quality Scanner', status: 'operational', risk: 'medium' }
    ];

    res.json({
      success: true,
      equipment
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// COMPREHENSIVE INSIGHTS
// ============================================

/**
 * GET /api/ai/brain/insights
 * Get comprehensive AI insights for the facility
 */
router.get('/brain/insights', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    logger.info('Generating comprehensive AI insights', { userId: req.userId });

    const insights = await aiBrain.generateInsights();

    res.json({
      success: true,
      aiAgent: 'Insights Generator',
      generatedAt: new Date().toISOString(),
      insights
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/brain/dashboard
 * Get AI dashboard summary
 */
router.get('/brain/dashboard', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [pendingOrders, activeOrders, completedToday, lowStockCount, qcRecent] = await Promise.all([
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'in-production' }),
      Order.countDocuments({
        status: 'completed',
        completedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      Inventory.countDocuments({
        $expr: { $lte: ['$quantity', '$minStock'] }
      }),
      QCReport.find()
        .sort('-inspectedAt')
        .limit(5)
        .populate('orderId productId')
    ]);

    // Calculate QC metrics
    const passRate = await getQCPassRate();
    const recentFailures = qcRecent.filter((r: any) => r.result === 'fail').length;

    res.json({
      success: true,
      dashboard: {
        production: {
          pendingOrders,
          activeOrders,
          completedToday
        },
        inventory: {
          lowStockAlerts: lowStockCount
        },
        quality: {
          passRate: passRate.toFixed(1) + '%',
          recentFailures
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getQCPassRate(): Promise<number> {
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [total, passed] = await Promise.all([
    QCReport.countDocuments({ inspectedAt: { $gte: last30Days } }),
    QCReport.countDocuments({ inspectedAt: { $gte: last30Days }, result: 'pass' })
  ]);

  return total > 0 ? (passed / total) * 100 : 100;
}

export default router;
