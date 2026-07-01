/**
 * FP&A OS v2.0 - Complete Financial Planning & Analysis
 * Port: 4804
 *
 * This version integrates with:
 * - Revenue Intelligence (5400) - AI-powered forecasting
 * - RABTUL Treasury (4055) - Cash forecasting
 * - Finance OS (4801) - Actual data
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

const PORT = process.env.PORT || 4804;

// Integration endpoints
const REVENUE_URL = process.env.REVENUE_URL || 'http://localhost:5400';
const TREASURY_URL = process.env.TREASURY_URL || 'http://localhost:4055';
const FINANCE_URL = process.env.FINANCE_URL || 'http://localhost:4801';

// ============================================================
// IN-MEMORY STORAGE
// ============================================================

const db = {
  budgets: new Map(),
  forecasts: new Map(),
  scenarios: new Map(),
  variances: new Map(),
  headcount: new Map()
};

// ============================================================
// INTEGRATIONS
// ============================================================

async function fetchFromRevenue(path, params = {}) {
  try {
    const url = new URL(`${REVENUE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function fetchFromTreasury(path, params = {}) {
  try {
    const url = new URL(`${TREASURY_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { 'X-Internal-Token': process.env.TREASURY_TOKEN || 'dev' }
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function fetchFromFinance(path) {
  try {
    const res = await fetch(`${FINANCE_URL}${path}`);
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

// ============================================================
// BUDGET MANAGEMENT
// ============================================================

app.post('/budgets', (req, res) => {
  const { entityId, fiscalYear, departments, total } = req.body;

  const budget = {
    id: `BUD-${Date.now()}`,
    entityId,
    fiscalYear,
    departments,
    total,
    status: 'draft',
    version: 1,
    createdAt: new Date()
  };

  db.budgets.set(budget.id, budget);
  res.json({ budget });
});

app.get('/budgets', (req, res) => {
  const { entityId, fiscalYear } = req.query;
  let budgets = Array.from(db.budgets.values());

  if (entityId) budgets = budgets.filter(b => b.entityId === entityId);
  if (fiscalYear) budgets = budgets.filter(b => b.fiscalYear === fiscalYear);

  res.json({ budgets });
});

app.post('/budgets/:id/approve', (req, res) => {
  const budget = db.budgets.get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Budget not found' });

  budget.status = 'approved';
  budget.approvedAt = new Date();
  budget.approvedBy = req.body.approvedBy;

  res.json({ budget });
});

// ============================================================
// AI-POWERED FORECASTING
// ============================================================

app.post('/forecasts', async (req, res) => {
  const { entityId, type = 'revenue', period = '12m', industry } = req.body;

  let forecast = {
    id: `FC-${Date.now()}`,
    entityId,
    type,
    period,
    generatedAt: new Date()
  };

  if (type === 'revenue') {
    // Get AI-powered demand forecast from Revenue Intelligence
    const demandData = await fetchFromRevenue('/api/revenue/demand-forecast', { industry, period });

    if (demandData) {
      forecast = {
        ...forecast,
        monthly: demandData.demand || [],
        growthRate: demandData.avgGrowthRate,
        confidence: demandData.confidence,
        drivers: demandData.drivers,
        source: 'revenue_intelligence'
      };
    } else {
      // Fallback to simple trend
      forecast = {
        ...forecast,
        monthly: generateSimpleForecast(period),
        growthRate: 5,
        confidence: 0.7,
        source: 'trend_analysis'
      };
    }
  } else if (type === 'cash') {
    // Get cash forecast from Treasury
    const treasuryForecast = await fetchFromTreasury(`/api/v1/forecast/${entityId}/current`);

    if (treasuryForecast) {
      forecast = {
        ...forecast,
        runway: treasuryForecast.runway,
        monthly: treasuryForecast.monthly || [],
        shortfalls: treasuryForecast.shortfalls || [],
        source: 'treasury'
      };
    } else {
      forecast = {
        ...forecast,
        runway: 18,
        monthly: generateSimpleForecast(period),
        source: 'estimate'
      };
    }
  } else if (type === 'expense') {
    // Get expense forecast based on trends
    const financeData = await fetchFromFinance('/api/dashboard/overview');

    forecast = {
      ...forecast,
      monthly: generateExpenseForecast(financeData, period),
      growthRate: 3,
      confidence: 0.8,
      source: 'historical'
    };
  }

  db.forecasts.set(forecast.id, forecast);
  res.json({ forecast });
});

app.get('/forecasts', (req, res) => {
  const { entityId, type } = req.query;
  let forecasts = Array.from(db.forecasts.values());

  if (entityId) forecasts = forecasts.filter(f => f.entityId === entityId);
  if (type) forecasts = forecasts.filter(f => f.type === type);

  res.json({ forecasts });
});

// ============================================================
// SCENARIO MODELING
// ============================================================

app.post('/scenarios', async (req, res) => {
  const { entityId, name, description, assumptions } = req.body;

  const scenario = {
    id: `SCN-${Date.now()}`,
    entityId,
    name,
    description,
    assumptions,
    createdAt: new Date()
  };

  // Generate scenario impact
  scenario.impact = await generateScenarioImpact(scenario);

  db.scenarios.set(scenario.id, scenario);
  res.json({ scenario });
});

app.get('/scenarios/compare', async (req, res) => {
  const { entityId } = req.query;
  const scenarios = Array.from(db.scenarios.values())
    .filter(s => !entityId || s.entityId === entityId);

  const comparison = {
    scenarios: scenarios.map(s => ({
      id: s.id,
      name: s.name,
      impact: s.impact
    })),
    summary: {
      bestCase: scenarios.reduce((best, s) =>
        (!best || s.impact?.revenue > best.impact?.revenue) ? s : best
      , null),
      worstCase: scenarios.reduce((worst, s) =>
        (!worst || s.impact?.revenue < worst.impact?.revenue) ? s : worst
      , null)
    }
  };

  res.json(comparison);
});

// ============================================================
// VARIANCE ANALYSIS
// ============================================================

app.post('/variances', async (req, res) => {
  const { entityId, period, budgetId, actualData } = req.body;

  const budget = budgetId ? db.budgets.get(budgetId) : null;
  const forecast = await fetchActualData(entityId, period);

  const variance = {
    id: `VAR-${Date.now()}`,
    entityId,
    period,
    budget: budget?.departments || {},
    actual: actualData || forecast,
    calculatedAt: new Date()
  };

  // Calculate variances
  variance.departments = Object.keys(budget?.departments || {}).map(dept => {
    const budgeted = budget?.departments[dept] || 0;
    const actual = actualData?.[dept] || forecast?.[dept] || 0;
    const diff = actual - budgeted;
    const pct = budgeted > 0 ? (diff / budgeted * 100).toFixed(2) : 0;

    return {
      department: dept,
      budgeted,
      actual,
      variance: diff,
      variancePct: pct,
      status: Math.abs(pct) < 5 ? 'on_track' : pct > 0 ? 'over_budget' : 'under_budget'
    };
  });

  db.variances.set(variance.id, variance);
  res.json({ variance });
});

app.get('/variances', (req, res) => {
  const variances = Array.from(db.variances.values());
  res.json({ variances });
});

// ============================================================
// HEADCOUNT PLANNING
// ============================================================

app.post('/headcount', (req, res) => {
  const { entityId, fiscalYear, roles, totalCost } = req.body;

  const plan = {
    id: `HC-${Date.now()}`,
    entityId,
    fiscalYear,
    roles,
    totalCost,
    benefits: totalCost * 0.25, // ~25% benefits
    totalWithBenefits: totalCost * 1.25,
    createdAt: new Date()
  };

  db.headcount.set(plan.id, plan);
  res.json({ headcount: plan });
});

app.get('/headcount', (req, res) => {
  const { entityId, fiscalYear } = req.query;
  let plans = Array.from(db.headcount.values());

  if (entityId) plans = plans.filter(p => p.entityId === entityId);
  if (fiscalYear) plans = plans.filter(p => p.fiscalYear === fiscalYear);

  res.json({ headcount: plans });
});

// ============================================================
// BOARD PACK GENERATION
// ============================================================

app.get('/board-pack/:entityId', async (req, res) => {
  const entityId = req.params.entityId;

  // Fetch all data in parallel
  const [finance, treasury, revenue, forecasts, variances] = await Promise.all([
    fetchFromFinance('/api/dashboard/unified'),
    fetchFromTreasury(`/api/v1/accounts/${entityId}/position`),
    fetchFromRevenue('/api/revenue/revops-metrics', { businessId: entityId }),
    Promise.resolve(Array.from(db.forecasts.values()).filter(f => f.entityId === entityId)),
    Promise.resolve(Array.from(db.variances.values()).filter(v => v.entityId === entityId))
  ]);

  const boardPack = {
    entityId,
    generatedAt: new Date(),

    // Financial Summary
    financial: {
      revenue: finance?.revenue?.arr || 0,
      revenueGrowth: revenue?.growthRate || 0,
      burn: finance?.accounting?.expenses || 0,
      runway: treasury?.runway || 12,
      cash: treasury?.totalBalance || finance?.treasury?.totalCash || 0
    },

    // KPI Summary
    kpis: {
      arr: revenue?.arr || 0,
      mrr: revenue?.mrr || 0,
      nrr: revenue?.nrr || 0,
      churn: revenue?.churnRate || 0,
      ltv: revenue?.ltv || 0,
      cac: revenue?.cac || 0
    },

    // Variance Summary
    variances: variances.length > 0 ? {
      total: variances[variances.length - 1]?.departments?.reduce((s, d) => s + Math.abs(d.variance), 0) || 0,
      byDepartment: variances[variances.length - 1]?.departments || []
    } : null,

    // Forecast Summary
    forecasts: forecasts.map(f => ({
      type: f.type,
      runway: f.runway,
      growthRate: f.growthRate,
      confidence: f.confidence
    })),

    // Recommendations
    recommendations: generateBoardRecommendations(finance, treasury, revenue)
  };

  res.json({ boardPack });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateSimpleForecast(period) {
  const months = period === '6m' ? 6 : period === '12m' ? 12 : 3;
  const base = 100000;
  const forecasts = [];

  for (let i = 1; i <= months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    forecasts.push({
      month: date.toISOString().slice(0, 7),
      value: Math.round(base * Math.pow(1.05, i)), // 5% monthly growth
      confidence: 0.85 - (i * 0.02) // Confidence decreases over time
    });
  }

  return forecasts;
}

function generateExpenseForecast(data, period) {
  const months = period === '6m' ? 6 : 12;
  const baseExpenses = data?.accounting?.expenses || 50000;
  const forecasts = [];

  for (let i = 1; i <= months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    forecasts.push({
      month: date.toISOString().slice(0, 7),
      value: Math.round(baseExpenses * Math.pow(1.02, i)), // 2% monthly growth
      category: 'operating_expenses'
    });
  }

  return forecasts;
}

async function generateScenarioImpact(scenario) {
  const { assumptions } = scenario;

  // Calculate impact based on assumptions
  const revenueImpact = assumptions?.revenueGrowth || 0;
  const costImpact = assumptions?.costIncrease || 0;
  const hiringImpact = assumptions?.newHires || 0;

  const monthlyBurn = 500000; // Default
  const additionalCost = (hiringImpact * 100000) + (monthlyBurn * costImpact / 100);

  return {
    revenue: assumptions?.revenue || 0,
    revenueGrowth: revenueImpact,
    additionalCost,
    runwayChange: Math.round((additionalCost > 0 ? -3 : +2)), // Months change
    recommendation: revenueImpact > costImpact ? 'Approve expansion' : 'Delay expansion'
  };
}

async function fetchActualData(entityId, period) {
  const data = await fetchFromFinance('/api/dashboard/overview');
  return data?.accounting || {};
}

function generateBoardRecommendations(finance, treasury, revenue) {
  const recommendations = [];

  // Runway
  if ((treasury?.runway || 12) < 12) {
    recommendations.push({
      priority: 'high',
      area: 'Cash',
      recommendation: `Runway is ${treasury?.runway} months. Consider fundraising or cost optimization.`
    });
  }

  // Revenue growth
  if ((revenue?.growthRate || 0) < 5) {
    recommendations.push({
      priority: 'medium',
      area: 'Revenue',
      recommendation: `Growth rate is ${revenue?.growthRate}%. Focus on retention and expansion revenue.`
    });
  }

  // Churn
  if ((revenue?.churnRate || 0) > 5) {
    recommendations.push({
      priority: 'high',
      area: 'Retention',
      recommendation: `Churn rate is ${revenue?.churnRate}%. Invest in customer success.`
    });
  }

  return recommendations;
}

// ============================================================
// HEALTH & START
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'fpa-os',
    version: '2.0',
    port: PORT
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    version: '2.0',
    modules: {
      budgets: true,
      forecasts: true,
      scenarios: true,
      variances: true,
      headcount: true,
      boardPack: true
    },
    integrations: {
      revenue: !!REVENUE_URL,
      treasury: !!TREASURY_URL,
      finance: !!FINANCE_URL
    }
  });
});

app.listen(PORT, () => {
  console.log(`\nFP&A OS v2.0 running on port ${PORT}`);
  console.log(`\nIntegrations:`);
  console.log(`  Revenue: ${REVENUE_URL}`);
  console.log(`  Treasury: ${TREASURY_URL}`);
  console.log(`  Finance: ${FINANCE_URL}`);
  console.log(`\nAI-Powered Features:`);
  console.log(`  - Revenue forecasting from Revenue Intelligence`);
  console.log(`  - Cash forecasting from Treasury`);
  console.log(`  - Board pack generation`);
  console.log(`  - Variance analysis`);
});
