/**
 * Financial Twin Platform
 *
 * The living digital representation of company financials
 *
 * Twins:
 * - Company Financial Twin
 * - Revenue Twin
 * - Cost Twin
 * - Cash Twin
 * - Budget Twin
 * - Forecast Twin
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TWIN TYPES
// ============================================================

export interface CompanyFinancialTwin {
  id: string;
  entityId: string;

  // Financial Health
  financialHealth: {
    overall: number; // 0-100
    profitability: number;
    liquidity: number;
    solvency: number;
    efficiency: number;
  };

  // Metrics
  metrics: {
    revenue: FinancialMetric;
    ebitda: FinancialMetric;
    netIncome: FinancialMetric;
    cash: FinancialMetric;
    burnRate: FinancialMetric;
    runway: number;
  };

  // Health indicators
  health: {
    score: number;
    trends: 'improving' | 'stable' | 'declining';
    risks: string[];
    opportunities: string[];
  };

  lastUpdated: Date;
  confidence: number;
}

export interface FinancialMetric {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  forecast: number;
  confidence: number;
}

export interface RevenueTwin {
  id: string;
  entityId: string;

  streams: {
    type: string;
    amount: number;
    growth: number;
    contribution: number;
  }[];

  metrics: {
    mrr: number;
    arr: number;
    nrr: number;
    grr: number;
    arpu: number;
    cac: number;
    ltv: number;
    ltvCac: number;
    paybackMonths: number;
  };

  growth: {
    monthly: number;
    quarterly: number;
    annually: number;
    projected: number;
  };

  lastUpdated: Date;
  confidence: number;
}

export interface CashTwin {
  id: string;
  entityId: string;

  position: {
    cash: number;
    investments: number;
    total: number;
    currency: string;
  };

  runway: {
    months: number;
    burnRate: number;
    runwayStart: Date;
    runwayEnd: Date;
  };

  projections: {
    date: Date;
    amount: number;
    scenario: 'base' | 'optimistic' | 'pessimistic';
  }[];

  alerts: {
    type: 'low_cash' | 'large_expense' | 'delayed_revenue';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }[];

  lastUpdated: Date;
  confidence: number;
}

export interface BudgetTwin {
  id: string;
  entityId: string;
  fiscalYear: string;

  status: 'draft' | 'approved' | 'locked';

  departments: {
    name: string;
    budgeted: number;
    actual: number;
    variance: number;
    variancePercent: number;
  }[];

  categories: {
    name: string;
    budgeted: number;
    actual: number;
    variance: number;
  }[];

  total: {
    budgeted: number;
    actual: number;
    variance: number;
    variancePercent: number;
  };

  alerts: {
    category: string;
    overBudget: boolean;
    percentOver: number;
  }[];

  lastUpdated: Date;
  confidence: number;
}

// ============================================================
// STORAGE
// ============================================================

const companyFinancials = new Map<string, CompanyFinancialTwin>();
const revenues = new Map<string, RevenueTwin>();
const cashPositions = new Map<string, CashTwin>();
const budgets = new Map<string, BudgetTwin>();

// ============================================================
// ROUTES
// ============================================================

/**
 * Get company financial twin
 */
router.get('/company/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    let twin = companyFinancials.get(entityId);

    if (!twin) {
      // Create placeholder
      twin = createEmptyFinancialTwin(entityId);
      companyFinancials.set(entityId, twin);
    }

    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update company financial twin
 */
router.patch('/company/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const updates = req.body;

    let twin = companyFinancials.get(entityId) || createEmptyFinancialTwin(entityId);

    twin = { ...twin, ...updates, lastUpdated: new Date() };
    companyFinancials.set(entityId, twin);

    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get revenue twin
 */
router.get('/revenue/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    let twin = revenues.get(entityId);

    if (!twin) {
      twin = createEmptyRevenueTwin(entityId);
      revenues.set(entityId, twin);
    }

    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get cash twin
 */
router.get('/cash/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    let twin = cashPositions.get(entityId);

    if (!twin) {
      twin = createEmptyCashTwin(entityId);
      cashPositions.set(entityId, twin);
    }

    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update cash twin
 */
router.patch('/cash/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const updates = req.body;

    let twin = cashPositions.get(entityId) || createEmptyCashTwin(entityId);

    // Recalculate runway if burn rate provided
    if (updates.burnRate) {
      twin.runway.months = Math.floor(twin.position.total / updates.burnRate);
      twin.runway.burnRate = updates.burnRate;
    }

    twin = { ...twin, ...updates, lastUpdated: new Date() };
    cashPositions.set(entityId, twin);

    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get budget twin
 */
router.get('/budget/:entityId/:fiscalYear', async (req, res) => {
  try {
    const { entityId, fiscalYear } = req.params;
    const key = `${entityId}-${fiscalYear}`;
    let twin = budgets.get(key);

    if (!twin) {
      twin = createEmptyBudgetTwin(entityId, fiscalYear);
      budgets.set(key, twin);
    }

    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update budget twin
 */
router.patch('/budget/:entityId/:fiscalYear', async (req, res) => {
  try {
    const { entityId, fiscalYear } = req.params;
    const key = `${entityId}-${fiscalYear}`;
    const updates = req.body;

    let twin = budgets.get(key) || createEmptyBudgetTwin(entityId, fiscalYear);

    // Recalculate totals
    if (updates.departments || updates.categories) {
      const depts = updates.departments || twin.departments;
      const cats = updates.categories || twin.categories;

      twin.total = {
        budgeted: cats.reduce((sum, c) => sum + c.budgeted, 0),
        actual: cats.reduce((sum, c) => sum + c.actual, 0),
        variance: 0,
        variancePercent: 0,
      };
      twin.total.variance = twin.total.budgeted - twin.total.actual;
      twin.total.variancePercent =
        twin.total.budgeted > 0
          ? (twin.total.variance / twin.total.budgeted) * 100
          : 0;
    }

    twin = { ...twin, ...updates, lastUpdated: new Date() };
    budgets.set(key, twin);

    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Financial dashboard
 */
router.get('/dashboard/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;

    const financial = companyFinancials.get(entityId) || createEmptyFinancialTwin(entityId);
    const revenue = revenues.get(entityId) || createEmptyRevenueTwin(entityId);
    const cash = cashPositions.get(entityId) || createEmptyCashTwin(entityId);

    const dashboard = {
      entityId,
      health: {
        score: financial.health.score,
        trend: financial.health.trends,
      },
      revenue: {
        mrr: revenue.metrics.mrr,
        arr: revenue.metrics.arr,
        growth: revenue.growth.monthly,
      },
      cash: {
        balance: cash.position.total,
        runway: cash.runway.months,
        alerts: cash.alerts,
      },
      metrics: financial.metrics,
      recommendations: generateRecommendations(financial, revenue, cash),
      lastUpdated: new Date(),
    };

    res.json({ success: true, dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function createEmptyFinancialTwin(entityId: string): CompanyFinancialTwin {
  return {
    id: crypto.randomUUID(),
    entityId,
    financialHealth: {
      overall: 75,
      profitability: 80,
      liquidity: 70,
      solvency: 85,
      efficiency: 75,
    },
    metrics: {
      revenue: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable', forecast: 0, confidence: 70 },
      ebitda: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable', forecast: 0, confidence: 70 },
      netIncome: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable', forecast: 0, confidence: 70 },
      cash: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable', forecast: 0, confidence: 70 },
      burnRate: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable', forecast: 0, confidence: 70 },
    },
    health: {
      score: 75,
      trends: 'stable',
      risks: [],
      opportunities: [],
    },
    lastUpdated: new Date(),
    confidence: 50,
  };
}

function createEmptyRevenueTwin(entityId: string): RevenueTwin {
  return {
    id: crypto.randomUUID(),
    entityId,
    streams: [],
    metrics: {
      mrr: 0,
      arr: 0,
      nrr: 0,
      grr: 0,
      arpu: 0,
      cac: 0,
      ltv: 0,
      ltvCac: 0,
      paybackMonths: 0,
    },
    growth: { monthly: 0, quarterly: 0, annually: 0, projected: 0 },
    lastUpdated: new Date(),
    confidence: 50,
  };
}

function createEmptyCashTwin(entityId: string): CashTwin {
  return {
    id: crypto.randomUUID(),
    entityId,
    position: { cash: 0, investments: 0, total: 0, currency: 'INR' },
    runway: { months: 12, burnRate: 0, runwayStart: new Date(), runwayEnd: new Date() },
    projections: [],
    alerts: [],
    lastUpdated: new Date(),
    confidence: 50,
  };
}

function createEmptyBudgetTwin(entityId: string, fiscalYear: string): BudgetTwin {
  return {
    id: crypto.randomUUID(),
    entityId,
    fiscalYear,
    status: 'draft',
    departments: [],
    categories: [],
    total: { budgeted: 0, actual: 0, variance: 0, variancePercent: 0 },
    alerts: [],
    lastUpdated: new Date(),
    confidence: 50,
  };
}

function generateRecommendations(
  financial: CompanyFinancialTwin,
  revenue: RevenueTwin,
  cash: CashTwin
): string[] {
  const recommendations: string[] = [];

  if (financial.health.score < 60) {
    recommendations.push('⚠️ Financial health below target - review cost structure');
  }

  if (revenue.growth.monthly < 5) {
    recommendations.push('📈 Revenue growth below 5% - consider growth initiatives');
  }

  if (cash.runway.months < 12) {
    recommendations.push('🔴 Cash runway under 12 months - prioritize fundraising');
  }

  if (financial.health.trends === 'declining') {
    recommendations.push('📉 Declining financial health - immediate action required');
  }

  return recommendations;
}

export default router;
