import { Router, Request, Response } from 'express';
import { ROICalculatorService } from '../services/roiCalculator.js';
import { InvestmentStorageService } from '../services/investmentStorage.js';
import { SimulationOSClient } from '../services/simulationOSClient.js';
import { EconomyOSClient } from '../services/economyOSClient.js';
import { validateBody, asyncHandler } from '../middleware/validation.js';
import {
  roiCalculationSchema,
  costBenefitSchema,
  breakEvenSchema,
  profitMarginSchema,
  projectionSchema,
  createInvestmentSchema,
  updateInvestmentSchema,
  performanceRequestSchema,
  recordReturnSchema,
  simulationROISchema,
} from '../validators/roiValidators.js';

const router = Router();

// Initialize clients
const simulationOS = new SimulationOSClient();
const economyOS = new EconomyOSClient();

/**
 * POST /api/v1/calculate/roi
 * Calculate ROI for an investment
 */
router.post(
  '/calculate/roi',
  validateBody(roiCalculationSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = ROICalculatorService.calculateROI(req.body);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/v1/calculate/cost-benefit
 * Perform cost-benefit analysis
 */
router.post(
  '/calculate/cost-benefit',
  validateBody(costBenefitSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = ROICalculatorService.calculateCostBenefit(req.body);

    // If investmentId is provided, sync with EconomyOS
    if (req.body.investmentId) {
      const investment = InvestmentStorageService.getInvestment(req.body.investmentId);
      if (investment) {
        try {
          await economyOS.syncCosts(investment.costs.map((c) => ({
            name: c.name,
            amount: c.amount,
            currency: investment.currency,
          })));
          await economyOS.syncBenefits(investment.benefits.map((b) => ({
            name: b.name,
            amount: b.amount,
            currency: investment.currency,
          })));
        } catch (error) {
          console.warn('Failed to sync with EconomyOS:', error);
        }
      }
    }

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/v1/calculate/break-even
 * Calculate break-even point
 */
router.post(
  '/calculate/break-even',
  validateBody(breakEvenSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = ROICalculatorService.calculateBreakEven(req.body);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/v1/calculate/profit-margin
 * Calculate profit margins
 */
router.post(
  '/calculate/profit-margin',
  validateBody(profitMarginSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = ROICalculatorService.calculateProfitMargin(req.body);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/v1/calculate/projection
 * Generate investment projections
 */
router.post(
  '/calculate/projection',
  validateBody(projectionSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = ROICalculatorService.generateProjection(req.body);

    // Run simulation with SimulationOS if available
    let simulationResults = null;
    try {
      simulationResults = await simulationOS.runROISimulation({
        initialInvestment: req.body.initialInvestment,
        expectedReturn: req.body.expectedAnnualReturn,
        volatility: req.body.volatility || 0,
        years: req.body.years,
      });
    } catch (error) {
      console.warn('SimulationOS simulation failed:', error);
    }

    res.json({
      success: true,
      data: {
        ...result,
        simulation: simulationResults,
      },
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/v1/investments
 * List all investments
 */
router.get(
  '/investments',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const investments = InvestmentStorageService.getAllInvestments();

    res.json({
      success: true,
      data: investments,
      count: investments.length,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/v1/investments/:id
 * Get investment details
 */
router.get(
  '/investments/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const investment = InvestmentStorageService.getInvestment(req.params.id);

    if (!investment) {
      res.status(404).json({
        success: false,
        error: 'Investment not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: investment,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/v1/investments
 * Create a new investment
 */
router.post(
  '/investments',
  validateBody(createInvestmentSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const investment = InvestmentStorageService.createInvestment(req.body);

    // Sync with EconomyOS
    try {
      await economyOS.recordTransaction({
        type: 'investment',
        amount: investment.initialInvestment,
        currency: investment.currency,
        category: 'investment',
        metadata: {
          investmentId: investment.id,
          name: investment.name,
        },
      });
    } catch (error) {
      console.warn('Failed to sync investment with EconomyOS:', error);
    }

    res.status(201).json({
      success: true,
      data: investment,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * PUT /api/v1/investments/:id
 * Update an investment
 */
router.put(
  '/investments/:id',
  validateBody(updateInvestmentSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const investment = InvestmentStorageService.updateInvestment(req.params.id, req.body);

    if (!investment) {
      res.status(404).json({
        success: false,
        error: 'Investment not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: investment,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * DELETE /api/v1/investments/:id
 * Delete an investment
 */
router.delete(
  '/investments/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const deleted = InvestmentStorageService.deleteInvestment(req.params.id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Investment not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/v1/investments/:id/roi
 * Get historical ROI for an investment
 */
router.get(
  '/investments/:id/roi',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const historicalROI = InvestmentStorageService.getHistoricalROI(req.params.id);

    if (!historicalROI) {
      res.status(404).json({
        success: false,
        error: 'Investment not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: historicalROI,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/v1/investments/:id/returns
 * Record a return for an investment
 */
router.post(
  '/investments/:id/returns',
  validateBody(recordReturnSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const investment = InvestmentStorageService.recordReturn(req.params.id, req.body.returnAmount);

    if (!investment) {
      res.status(404).json({
        success: false,
        error: 'Investment not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Sync with EconomyOS
    try {
      await economyOS.recordTransaction({
        type: 'return',
        amount: req.body.returnAmount,
        currency: investment.currency,
        category: 'investment',
        metadata: {
          investmentId: investment.id,
        },
      });
    } catch (error) {
      console.warn('Failed to sync return with EconomyOS:', error);
    }

    res.json({
      success: true,
      data: investment,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/v1/investments/:id/performance
 * Get performance metrics for an investment
 */
router.get(
  '/investments/:id/performance',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const benchmarkValue = req.query.benchmarkValue ? parseFloat(req.query.benchmarkValue as string) : undefined;
    const riskFreeRate = req.query.riskFreeRate ? parseFloat(req.query.riskFreeRate as string) : undefined;

    const metrics = InvestmentStorageService.getPerformanceMetrics(
      req.params.id,
      benchmarkValue,
      riskFreeRate
    );

    if (!metrics) {
      res.status(404).json({
        success: false,
        error: 'Investment not found or insufficient data',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/v1/investments/:id/costs
 * Add a cost to an investment
 */
router.post(
  '/investments/:id/costs',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, amount, type, date, recurring, frequency } = req.body;

    const cost = InvestmentStorageService.addCost(req.params.id, {
      name,
      amount,
      type,
      date,
      recurring,
      frequency,
    });

    if (!cost) {
      res.status(404).json({
        success: false,
        error: 'Investment not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: cost,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/v1/investments/:id/benefits
 * Add a benefit to an investment
 */
router.post(
  '/investments/:id/benefits',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, amount, type, date, recurring, frequency } = req.body;

    const benefit = InvestmentStorageService.addBenefit(req.params.id, {
      name,
      amount,
      type,
      date,
      recurring,
      frequency,
    });

    if (!benefit) {
      res.status(404).json({
        success: false,
        error: 'Investment not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: benefit,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/v1/simulate/roi
 * Run ROI simulation with SimulationOS
 */
router.post(
  '/simulate/roi',
  validateBody(simulationROISchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const simulationResults = await simulationOS.runROISimulation(req.body);

    res.json({
      success: true,
      data: simulationResults,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/v1/metrics/external
 * Get external economic metrics from EconomyOS
 */
router.get(
  '/metrics/external',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const metrics = await economyOS.getEconomicMetrics();

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
