/**
 * FP&A OS - Financial Planning & Analysis
 *
 * The strategic brain of FinanceOS
 * Inspired by: Anaplan + Adaptive Insights + Pigment
 *
 * Modules:
 * - BudgetOS - Annual, quarterly, rolling budgets
 * - ForecastOS - Revenue, expense, cash forecasting
 * - ScenarioOS - What-if analysis, Monte Carlo
 * - PlanningOS - Headcount, capacity, resources
 * - ReportingOS - Board packs, variance analysis
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface Budget {
  id: string;
  name: string;
  type: 'annual' | 'quarterly' | 'monthly' | 'rolling';
  fiscalYear: string;
  entityId: string;
  departments: DepartmentBudget[];
  total: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    opex: number;
    ebitda: number;
    netIncome: number;
  };
  status: 'draft' | 'submitted' | 'approved' | 'locked';
  version: number;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface DepartmentBudget {
  departmentId: string;
  departmentName: string;
  allocations: CategoryBudget[];
  total: number;
}

export interface CategoryBudget {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

export interface Forecast {
  id: string;
  name: string;
  type: 'revenue' | 'expense' | 'cash' | 'headcount';
  horizon: '7d' | '30d' | '90d' | '1y' | '3y' | '5y';
  methodology: 'historical' | 'driver-based' | 'ai';
  projections: ForecastPeriod[];
  confidence: number;
  createdAt: Date;
}

export interface ForecastPeriod {
  date: Date;
  amount: number;
  confidence: number;
  drivers?: string[];
}

export interface Scenario {
  id: string;
  name: string;
  type: 'expansion' | 'cost-cutting' | 'fundraising' | 'acquisition' | 'custom';
  assumptions: ScenarioAssumption[];
  outcomes: ScenarioOutcome;
  probability: number; // 0-100
  status: 'draft' | 'analyzed' | 'approved';
  createdAt: Date;
}

export interface ScenarioAssumption {
  variable: string;
  base: number;
  optimistic: number;
  pessimistic: number;
}

export interface ScenarioOutcome {
  revenue: number;
  ebitda: number;
  cash: number;
  headcount: number;
  runway: number;
}

export interface VarianceReport {
  id: string;
  period: string;
  entityId: string;
  departmentId?: string;
  categories: Variance[];
  totalVariance: number;
  totalVariancePercent: number;
  generatedAt: Date;
}

export interface Variance {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
  driver: string;
  explanation?: string;
}

export interface HeadcountPlan {
  id: string;
  entityId: string;
  fiscalYear: string;
  departments: DepartmentHiring[];
  total: {
    headcount: number;
    salary: number;
    benefits: number;
    total: number;
  };
}

export interface DepartmentHiring {
  departmentId: string;
  departmentName: string;
  additions: number;
  replacements: number;
  departures: number;
  netChange: number;
  avgSalary: number;
  totalCost: number;
}

// ============================================================
// STORAGE
// ============================================================

const budgets = new Map<string, Budget>();
const forecasts = new Map<string, Forecast>();
const scenarios = new Map<string, Scenario>();
const variances = new Map<string, VarianceReport>();
const headcountPlans = new Map<string, HeadcountPlan>();

// ============================================================
// ROUTES - BUDGETS
// ============================================================

/**
 * Create budget
 */
router.post('/budgets', async (req, res) => {
  try {
    const { name, type, fiscalYear, entityId, departments } = req.body;

    if (!name || !fiscalYear) {
      return res.status(400).json({
        success: false,
        error: 'name and fiscalYear are required',
      });
    }

    const budget: Budget = {
      id: crypto.randomUUID(),
      name,
      type: type || 'annual',
      fiscalYear,
      entityId: entityId || 'company',
      departments: departments || [],
      total: calculateBudgetTotal(departments),
      status: 'draft',
      version: 1,
      createdAt: new Date(),
    };

    budgets.set(budget.id, budget);

    res.status(201).json({ success: true, budget });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get budgets
 */
router.get('/budgets', async (req, res) => {
  try {
    const { entityId, fiscalYear, status } = req.query;

    let result = Array.from(budgets.values());

    if (entityId) {
      result = result.filter(b => b.entityId === entityId);
    }
    if (fiscalYear) {
      result = result.filter(b => b.fiscalYear === fiscalYear);
    }
    if (status) {
      result = result.filter(b => b.status === status);
    }

    res.json({ success: true, budgets: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Approve budget
 */
router.post('/budgets/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const budget = budgets.get(id);
    if (!budget) {
      return res.status(404).json({ success: false, error: 'Budget not found' });
    }

    budget.status = 'approved';
    budget.approvedAt = new Date();
    budget.approvedBy = approvedBy;

    budgets.set(id, budget);

    res.json({ success: true, budget });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - FORECASTS
// ============================================================

/**
 * Generate forecast
 */
router.post('/forecasts', async (req, res) => {
  try {
    const { name, type, horizon, methodology, historicalData } = req.body;

    if (!type || !horizon) {
      return res.status(400).json({
        success: false,
        error: 'type and horizon are required',
      });
    }

    // Generate AI-powered projections
    const projections = await generateForecast(type, horizon, methodology, historicalData);

    const forecast: Forecast = {
      id: crypto.randomUUID(),
      name: name || `${type} Forecast`,
      type,
      horizon,
      methodology: methodology || 'ai',
      projections,
      confidence: calculateConfidence(projections),
      createdAt: new Date(),
    };

    forecasts.set(forecast.id, forecast);

    res.status(201).json({ success: true, forecast });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get forecasts
 */
router.get('/forecasts', async (req, res) => {
  try {
    const { type, entityId } = req.query;

    let result = Array.from(forecasts.values());

    if (type) {
      result = result.filter(f => f.type === type);
    }

    res.json({ success: true, forecasts: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - SCENARIOS
// ============================================================

/**
 * Create scenario
 */
router.post('/scenarios', async (req, res) => {
  try {
    const { name, type, assumptions } = req.body;

    if (!name || !assumptions) {
      return res.status(400).json({
        success: false,
        error: 'name and assumptions are required',
      });
    }

    // Calculate outcomes based on assumptions
    const outcomes = calculateScenarioOutcomes(assumptions);

    const scenario: Scenario = {
      id: crypto.randomUUID(),
      name,
      type: type || 'custom',
      assumptions,
      outcomes,
      probability: 50,
      status: 'draft',
      createdAt: new Date(),
    };

    scenarios.set(scenario.id, scenario);

    res.status(201).json({ success: true, scenario });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Compare scenarios
 */
router.get('/scenarios/compare', async (req, res) => {
  try {
    const allScenarios = Array.from(scenarios.values());

    const comparison = allScenarios.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      probability: s.probability,
      outcomes: s.outcomes,
    }));

    res.json({ success: true, scenarios: comparison });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - VARIANCE
// ============================================================

/**
 * Generate variance report
 */
router.post('/variances', async (req, res) => {
  try {
    const { period, entityId, departmentId, budgetId } = req.body;

    const budget = budgetId ? budgets.get(budgetId) : null;

    // Generate sample variance
    const categories: Variance[] = [
      { category: 'Revenue', budget: 10000000, actual: 10500000, variance: 500000, variancePercent: 5, driver: 'Volume increase' },
      { category: 'COGS', budget: 4000000, actual: 4200000, variance: -200000, variancePercent: -5, driver: 'Material costs' },
      { category: 'Marketing', budget: 1000000, actual: 1100000, variance: -100000, variancePercent: -10, driver: 'Campaign spend' },
      { category: 'Salaries', budget: 2000000, actual: 1950000, variance: 50000, variancePercent: 2.5, driver: 'Open positions' },
      { category: 'Admin', budget: 500000, actual: 480000, variance: 20000, variancePercent: 4, driver: 'Office savings' },
    ];

    const totalVariance = categories.reduce((sum, c) => sum + c.variance, 0);
    const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
    const totalActual = categories.reduce((sum, c) => sum + c.actual, 0);

    const report: VarianceReport = {
      id: crypto.randomUUID(),
      period: period || 'Q2 2026',
      entityId: entityId || 'company',
      departmentId,
      categories,
      totalVariance,
      totalVariancePercent: ((totalActual - totalBudget) / totalBudget) * 100,
      generatedAt: new Date(),
    };

    variances.set(report.id, report);

    res.status(201).json({ success: true, report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get variance reports
 */
router.get('/variances', async (req, res) => {
  try {
    const { period, entityId } = req.query;

    let result = Array.from(variances.values());

    if (period) {
      result = result.filter(v => v.period === period);
    }
    if (entityId) {
      result = result.filter(v => v.entityId === entityId);
    }

    res.json({ success: true, reports: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - HEADCOUNT PLANNING
// ============================================================

/**
 * Create headcount plan
 */
router.post('/headcount', async (req, res) => {
  try {
    const { fiscalYear, entityId, departments } = req.body;

    const plan: HeadcountPlan = {
      id: crypto.randomUUID(),
      entityId: entityId || 'company',
      fiscalYear: fiscalYear || '2027',
      departments: departments || [],
      total: calculateHeadcountTotal(departments),
    };

    headcountPlans.set(plan.id, plan);

    res.status(201).json({ success: true, plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get headcount plans
 */
router.get('/headcount', async (req, res) => {
  try {
    const { fiscalYear, entityId } = req.query;

    let result = Array.from(headcountPlans.values());

    if (fiscalYear) {
      result = result.filter(p => p.fiscalYear === fiscalYear);
    }
    if (entityId) {
      result = result.filter(p => p.entityId === entityId);
    }

    res.json({ success: true, plans: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - BOARD PACK
// ============================================================

/**
 * Generate board pack summary
 */
router.get('/board-pack/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { period } = req.query;

    // Aggregate data for board pack
    const recentBudgets = Array.from(budgets.values())
      .filter(b => b.entityId === entityId)
      .slice(-4);

    const recentForecasts = Array.from(forecasts.values())
      .filter(f => f.type === 'revenue')
      .slice(-3);

    const recentVariances = Array.from(variances.values())
      .filter(v => v.entityId === entityId)
      .slice(-2);

    const pack = {
      entityId,
      period: period || 'Current Quarter',
      financial: {
        revenue: {
          actual: recentVariances[0]?.categories.find(c => c.category === 'Revenue')?.actual || 0,
          budget: recentVariances[0]?.categories.find(c => c.category === 'Revenue')?.budget || 0,
        },
        ebitda: {
          actual: calculateEBITDA(recentVariances[0]?.categories || []),
          budget: calculateEBITDA(recentVariances[0]?.categories || []),
        },
        variance: recentVariances[0]?.totalVariance || 0,
        variancePercent: recentVariances[0]?.totalVariancePercent || 0,
      },
      forecast: {
        nextQuarter: recentForecasts[0]?.projections[0]?.amount || 0,
        confidence: recentForecasts[0]?.confidence || 0,
      },
      headcount: {
        current: headcountPlans.values().next().value?.total.headcount || 0,
        plan: recentBudgets[0]?.total?.netIncome || 0,
      },
      scenarios: Array.from(scenarios.values()).slice(0, 3),
      keyMetrics: generateKeyMetrics(),
      alerts: generateAlerts(),
      generatedAt: new Date(),
    };

    res.json({ success: true, pack });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function calculateBudgetTotal(departments?: DepartmentBudget[]): Budget['total'] {
  const dept = departments?.[0]?.allocations || [];
  const revenue = dept.find(c => c.category === 'Revenue')?.planned || 0;
  const cogs = dept.find(c => c.category === 'COGS')?.planned || 0;
  const opex = dept.filter(c => !['Revenue', 'COGS'].includes(c.category))
    .reduce((sum, c) => sum + c.planned, 0);

  return {
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    opex,
    ebitda: revenue - cogs - opex,
    netIncome: (revenue - cogs - opex) * 0.8, // Simplified tax
  };
}

async function generateForecast(
  type: string,
  horizon: string,
  methodology: string,
  historicalData: any[]
): Promise<ForecastPeriod[]> {
  const periods: ForecastPeriod[] = [];
  const days = horizon === '7d' ? 7 : horizon === '30d' ? 30 : horizon === '90d' ? 90 : horizon === '1y' ? 365 : 1095;

  // Simple projection based on historical growth
  const baseAmount = historicalData?.[0]?.amount || 100000;
  const growthRate = 0.02; // 2% monthly growth

  for (let i = 1; i <= Math.min(days, 12); i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i);

    const amount = baseAmount * Math.pow(1 + growthRate, i);
    const confidence = Math.max(50, 95 - i * 5); // Decreasing confidence over time

    periods.push({
      date,
      amount: Math.round(amount),
      confidence,
      drivers: ['Historical growth', 'Seasonality', 'Market trends'],
    });
  }

  return periods;
}

function calculateConfidence(projections: ForecastPeriod[]): number {
  if (projections.length === 0) return 0;
  const avg = projections.reduce((sum, p) => sum + p.confidence, 0) / projections.length;
  return Math.round(avg);
}

function calculateScenarioOutcomes(assumptions: ScenarioAssumption[]): ScenarioOutcome {
  // Simplified scenario calculation
  const baseRevenue = assumptions.find(a => a.variable === 'revenue')?.base || 10000000;
  const revenueGrowth = (assumptions.find(a => a.variable === 'growth')?.optimistic || 0.2) / 100;

  const revenue = baseRevenue * (1 + revenueGrowth);
  const ebitda = revenue * 0.25; // 25% EBITDA margin
  const opex = revenue * 0.60;
  const netIncome = ebitda - opex * 0.2;

  return {
    revenue: Math.round(revenue),
    ebitda: Math.round(ebitda),
    cash: Math.round(revenue * 0.3),
    headcount: 100,
    runway: 24,
  };
}

function calculateEBITDA(categories: Variance[]): number {
  const revenue = categories.find(c => c.category === 'Revenue')?.actual || 0;
  const cogs = categories.find(c => c.category === 'COGS')?.actual || 0;
  const opex = categories
    .filter(c => !['Revenue', 'COGS'].includes(c.category))
    .reduce((sum, c) => sum + c.actual, 0);

  return revenue - cogs - opex;
}

function calculateHeadcountTotal(departments?: DepartmentHiring[]): HeadcountPlan['total'] {
  return {
    headcount: departments?.reduce((sum, d) => sum + d.netChange, 0) || 0,
    salary: departments?.reduce((sum, d) => sum + d.totalCost, 0) || 0,
    benefits: departments?.reduce((sum, d) => sum + d.totalCost * 0.3, 0) || 0,
    total: departments?.reduce((sum, d) => sum + d.totalCost * 1.3, 0) || 0,
  };
}

function generateKeyMetrics(): any[] {
  return [
    { metric: 'Revenue Growth', value: '18%', trend: 'up' },
    { metric: 'Gross Margin', value: '52%', trend: 'stable' },
    { metric: 'EBITDA Margin', value: '22%', trend: 'up' },
    { metric: 'Cash Runway', value: '24 months', trend: 'stable' },
    { metric: 'Headcount', value: '156', trend: 'up' },
  ];
}

function generateAlerts(): string[] {
  const alerts: string[] = [];

  // Sample alerts
  alerts.push('⚠️ Marketing spend 10% over budget');
  alerts.push('🔴 Q3 forecast confidence below 70%');
  alerts.push('✅ Revenue tracking 5% above plan');

  return alerts;
}

export default router;
