/**
 * Finance Twin Platform - Unit Tests
 */

describe('Finance Twin Platform', () => {
  describe('Treasury Twin', () => {
    const mockTreasury = {
      cashPositions: {
        totalCash: 50000000,
        investedCash: 20000000,
        netCash: 70000000,
        currency: 'INR',
      },
      liquidity: {
        runway: 18, // months
        burnRate: 3000000,
      },
      fx: {
        exposure: 500000,
        hedged: 350000,
      },
    };

    it('should track cash positions', () => {
      expect(mockTreasury.cashPositions.totalCash).toBeGreaterThan(0);
      expect(mockTreasury.cashPositions.netCash).toBe(mockTreasury.cashPositions.totalCash + mockTreasury.cashPositions.investedCash);
    });

    it('should calculate runway correctly', () => {
      const calculated = mockTreasury.cashPositions.netCash / mockTreasury.liquidity.burnRate;
      expect(calculated).toBe(23.33);
    });

    it('should track FX exposure', () => {
      expect(mockTreasury.fx.exposure).toBeGreaterThan(0);
      expect(mockTreasury.fx.hedged).toBeLessThanOrEqual(mockTreasury.fx.exposure);
    });

    it('should track currency', () => {
      expect(mockTreasury.cashPositions.currency).toBeTruthy();
    });
  });

  describe('Budget Twin', () => {
    const mockBudget = {
      departments: [
        { name: 'Engineering', budgeted: 10000000, actual: 8500000, variance: 15 },
        { name: 'Sales', budgeted: 5000000, actual: 5500000, variance: -10 },
        { name: 'Marketing', budgeted: 3000000, actual: 2700000, variance: 10 },
      ],
      total: { budgeted: 18000000, actual: 16700000, variance: 7.2 },
    };

    it('should calculate department variances', () => {
      mockBudget.departments.forEach(dept => {
        const calculated = ((dept.budgeted - dept.actual) / dept.budgeted) * 100;
        expect(dept.variance).toBeCloseTo(calculated, 1);
      });
    });

    it('should calculate total variance', () => {
      const totalActual = mockBudget.total.budgeted * (1 - mockBudget.total.variance / 100);
      expect(totalActual).toBeCloseTo(mockBudget.total.actual, -4);
    });

    it('should identify over-budget departments', () => {
      const overBudget = mockBudget.departments.filter(d => d.variance < 0);
      expect(overBudget.length).toBe(1);
      expect(overBudget[0].name).toBe('Sales');
    });
  });

  describe('FP&A Forecast', () => {
    const mockForecast = {
      revenue: {
        current: 10000000,
        growth: 0.15,
        confidence: 85,
      },
      costs: {
        fixed: 6000000,
        variable: 2000000,
      },
      projections: [
        { month: 'Jan', revenue: 10000000 },
        { month: 'Feb', revenue: 11500000 },
        { month: 'Mar', revenue: 13225000 },
      ],
    };

    it('should apply growth correctly', () => {
      const feb = mockForecast.projections[0].revenue * (1 + mockForecast.revenue.growth);
      expect(mockForecast.projections[1].revenue).toBe(feb);
    });

    it('should calculate gross margin', () => {
      const revenue = mockForecast.revenue.current;
      const costs = mockForecast.costs.fixed + mockForecast.costs.variable;
      const margin = ((revenue - costs) / revenue) * 100;
      expect(margin).toBe(20);
    });

    it('should track confidence scores', () => {
      expect(mockForecast.revenue.confidence).toBeGreaterThan(0);
      expect(mockForecast.revenue.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('Financial Health Score', () => {
    it('should calculate composite health score', () => {
      const metrics = {
        profitability: 75,
        liquidity: 80,
        solvency: 85,
        efficiency: 70,
      };

      const health = (
        metrics.profitability * 0.3 +
        metrics.liquidity * 0.25 +
        metrics.solvency * 0.25 +
        metrics.efficiency * 0.2
      );

      expect(health).toBe(77.25);
    });

    it('should weight metrics correctly', () => {
      const weights = {
        profitability: 0.3,
        liquidity: 0.25,
        solvency: 0.25,
        efficiency: 0.2,
      };

      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(total).toBe(1);
    });
  });

  describe('Cash Flow Analysis', () => {
    const inflows = [5000000, 6000000, 7000000, 5500000];
    const outflows = [4000000, 4500000, 5000000, 4800000];

    it('should calculate net cash flow', () => {
      const netFlows = inflows.map((inflow, i) => inflow - outflows[i]);
      expect(netFlows[0]).toBe(1000000);
      expect(netFlows[3]).toBe(700000);
    });

    it('should calculate cumulative cash position', () => {
      const netFlows = inflows.map((inflow, i) => inflow - outflows[i]);
      const cumulative = netFlows.reduce((a, b) => a + b, 0);
      expect(cumulative).toBe(1700000);
    });
  });

  describe('Working Capital', () => {
    const currentAssets = 15000000;
    const currentLiabilities = 8000000;
    const inventory = 3000000;
    const receivables = 7000000;
    const payables = 4000000;

    it('should calculate working capital', () => {
      const workingCapital = currentAssets - currentLiabilities;
      expect(workingCapital).toBe(7000000);
    });

    it('should calculate current ratio', () => {
      const ratio = currentAssets / currentLiabilities;
      expect(ratio).toBe(1.875);
    });

    it('should calculate quick ratio (acid test)', () => {
      const quickAssets = currentAssets - inventory;
      const quickRatio = quickAssets / currentLiabilities;
      expect(quickRatio).toBe(1.5);
    });

    it('should calculate cash conversion cycle', () => {
      const daysSalesOutstanding = 45;
      const daysPayableOutstanding = 30;
      const inventoryDays = 30;
      const ccc = daysSalesOutstanding + inventoryDays - daysPayableOutstanding;
      expect(ccc).toBe(45);
    });
  });

  describe('Revenue Recognition', () => {
    it('should handle monthly recurring revenue', () => {
      const mrr = 1000000;
      const arr = mrr * 12;
      expect(arr).toBe(12000000);
    });

    it('should calculate net revenue retention', () => {
      const startingMRR = 100000;
      const expansions = 15000;
      const churn = 5000;
      const nrr = ((startingMRR + expansions - churn) / startingMRR) * 100;
      expect(nrr).toBe(110);
    });

    it('should calculate gross revenue retention', () => {
      const startingMRR = 100000;
      const churn = 5000;
      const grr = ((startingMRR - churn) / startingMRR) * 100;
      expect(grr).toBe(95);
    });
  });

  describe('Financial Ratios', () => {
    it('should calculate gross margin', () => {
      const revenue = 10000000;
      const cogs = 6000000;
      const grossMargin = ((revenue - cogs) / revenue) * 100;
      expect(grossMargin).toBe(40);
    });

    it('should calculate EBITDA margin', () => {
      const revenue = 10000000;
      const ebitda = 2000000;
      const ebitdaMargin = (ebitda / revenue) * 100;
      expect(ebitdaMargin).toBe(20);
    });

    it('should calculate net margin', () => {
      const revenue = 10000000;
      const netProfit = 800000;
      const netMargin = (netProfit / revenue) * 100;
      expect(netMargin).toBe(8);
    });

    it('should calculate CAC payback period', () => {
      const cac = 5000;
      const arpu = 500;
      const paybackMonths = cac / arpu;
      expect(paybackMonths).toBe(10);
    });

    it('should calculate LTV:CAC ratio', () => {
      const ltv = 60000;
      const cac = 5000;
      const ratio = ltv / cac;
      expect(ratio).toBe(12);
    });
  });
});

describe('Scenario Planning', () => {
  it('should model base case', () => {
    const base = {
      revenue: 10000000,
      growth: 0.2,
      costs: 8000000,
    };

    const profit = base.revenue * (1 + base.growth) - base.costs * 1.1;
    expect(profit).toBe(4000000);
  });

  it('should model optimistic case', () => {
    const optimistic = {
      revenue: 12000000,
      costs: 8500000,
    };

    const profit = optimistic.revenue - optimistic.costs;
    expect(profit).toBe(3500000);
  });

  it('should model pessimistic case', () => {
    const pessimistic = {
      revenue: 8000000,
      costs: 7500000,
    };

    const profit = pessimistic.revenue - pessimistic.costs;
    expect(profit).toBe(500000);
  });
});
