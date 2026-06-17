import { Router, Request, Response } from 'express';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { WealthSync } from '../services/wealthSync';
import { wealthProfileStore } from '../models/WealthProfile';

export function analyticsRoutes(
  customerOps: CustomerOpsBridge,
  wealthSync: WealthSync,
  logger: any
): Router {
  const router = Router();

  // Get wealth analytics for customer
  router.get('/customer/:customerId', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const profile = wealthProfileStore.findByCustomerId(customerId);

      if (!profile) {
        return res.status(404).json({ error: 'Wealth profile not found' });
      }

      const analytics = {
        netWorth: {
          value: profile.netWorth,
          change: profile.netWorth - (profile.totalLiabilities + profile.totalAssets * 0.95),
          changePercent: 5.26
        },
        portfolio: {
          totalValue: profile.portfolio.totalValue,
          ytdReturn: profile.portfolio.ytdReturn,
          ytdReturnPercent: profile.portfolio.ytdReturnPercent,
          sinceInception: profile.portfolio.sinceInception,
          sinceInceptionPercent: profile.portfolio.sinceInceptionPercent
        },
        diversification: calculateDiversification(profile),
        riskScore: calculateRiskScore(profile),
        goalProgress: profile.financialGoals.map(goal => ({
          name: goal.name,
          progress: goal.progress,
          status: goal.status,
          remaining: goal.targetAmount - goal.currentAmount
        })),
        accountHealth: analyzeAccountHealth(profile)
      };

      res.json({
        customerId,
        analytics,
        generatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error generating analytics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get market insights
  router.get('/market-insights', async (req: Request, res: Response) => {
    try {
      const insights = {
        marketStatus: getMarketStatus(),
        topSectors: [
          { name: 'Technology', performance: 2.4, trend: 'up' },
          { name: 'Healthcare', performance: 1.8, trend: 'up' },
          { name: 'Finance', performance: 1.2, trend: 'up' },
          { name: 'Energy', performance: -0.5, trend: 'down' },
          { name: 'Consumer', performance: 0.3, trend: 'stable' }
        ],
        economicIndicators: {
          gdpGrowth: 2.1,
          inflation: 3.2,
          unemployment: 4.1,
          interestRate: 4.5
        },
        recommendations: generateRecommendations()
      };

      res.json(insights);
    } catch (error: any) {
      logger.error('Error fetching market insights:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get portfolio performance metrics
  router.get('/performance/:customerId', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { startDate, endDate } = req.query;
      const profile = wealthProfileStore.findByCustomerId(customerId);

      if (!profile) {
        return res.status(404).json({ error: 'Wealth profile not found' });
      }

      const metrics = {
        returns: {
          daily: generateTimeSeriesData(profile.portfolio.totalValue, 1),
          weekly: generateTimeSeriesData(profile.portfolio.totalValue, 7),
          monthly: generateTimeSeriesData(profile.portfolio.totalValue, 30),
          ytd: generateTimeSeriesData(profile.portfolio.totalValue, 180)
        },
        volatility: {
          daily: Math.random() * 2,
          weekly: Math.random() * 5,
          monthly: Math.random() * 10
        },
        sharpeRatio: 1.2 + Math.random() * 0.8,
        beta: 0.8 + Math.random() * 0.4,
        alpha: Math.random() * 2 - 0.5,
        maxDrawdown: -(Math.random() * 15)
      };

      res.json({
        customerId,
        portfolioValue: profile.portfolio.totalValue,
        metrics
      });
    } catch (error: any) {
      logger.error('Error fetching performance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get risk analysis
  router.get('/risk/:customerId', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const profile = wealthProfileStore.findByCustomerId(customerId);

      if (!profile) {
        return res.status(404).json({ error: 'Wealth profile not found' });
      }

      const riskAnalysis = {
        overallScore: calculateRiskScore(profile),
        riskProfile: profile.riskProfile,
        factors: {
          concentration: calculateConcentrationRisk(profile),
          liquidity: calculateLiquidityRisk(profile),
          volatility: calculateVolatilityRisk(profile),
          correlation: calculateCorrelationRisk(profile)
        },
        stressTests: generateStressTests(profile),
        recommendations: generateRiskRecommendations(profile)
      };

      res.json({
        customerId,
        riskAnalysis
      });
    } catch (error: any) {
      logger.error('Error generating risk analysis:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get goal tracking
  router.get('/goals/:customerId', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const profile = wealthProfileStore.findByCustomerId(customerId);

      if (!profile) {
        return res.status(404).json({ error: 'Wealth profile not found' });
      }

      const goalsAnalysis = {
        totalGoals: profile.financialGoals.length,
        onTrack: profile.financialGoals.filter(g => g.status === 'on-track').length,
        behind: profile.financialGoals.filter(g => g.status === 'behind').length,
        ahead: profile.financialGoals.filter(g => g.status === 'ahead').length,
        completed: profile.financialGoals.filter(g => g.status === 'completed').length,
        goals: profile.financialGoals.map(goal => ({
          ...goal,
          projectedCompletion: calculateProjectedCompletion(goal),
          shortfall: goal.targetAmount - goal.currentAmount,
          monthlyNeeded: calculateMonthlyNeeded(goal)
        }))
      };

      res.json({
        customerId,
        goalsAnalysis
      });
    } catch (error: any) {
      logger.error('Error fetching goals analysis:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cross-twin analytics
  router.get('/cross-twin/:customerId', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;

      // Fetch data from multiple twins
      const [customerData, paymentData, dealData] = await Promise.all([
        customerOps.getCustomerFromTwin(customerId),
        customerOps.getPaymentFromTwin(customerId),
        customerOps.getDealFromTwin(customerId)
      ]);

      const crossTwinAnalytics = {
        customerProfile: customerData,
        paymentHistory: paymentData,
        dealHistory: dealData,
        wealthCorrelation: analyzeCorrelation(customerData, paymentData, dealData)
      };

      res.json(crossTwinAnalytics);
    } catch (error: any) {
      logger.error('Error fetching cross-twin analytics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

// Helper functions for analytics

function calculateDiversification(profile: any): number {
  if (!profile.portfolio.allocations.length) return 0;
  const allocations = profile.portfolio.allocations.map(a => a.percentage);
  const maxAllocation = Math.max(...allocations);
  return Math.max(0, 100 - maxAllocation);
}

function calculateRiskScore(profile: any): number {
  const riskScores: { [key: string]: number } = {
    'conservative': 25,
    'moderate': 50,
    'aggressive': 75,
    'very-aggressive': 90
  };
  return riskScores[profile.riskProfile] + Math.random() * 10;
}

function analyzeAccountHealth(profile: any): any {
  const accounts = profile.accounts;
  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0);

  return {
    accountCount: accounts.length,
    averageBalance: totalBalance / accounts.length,
    largestAccount: Math.max(...accounts.map((a: any) => a.balance)),
    smallestAccount: Math.min(...accounts.map((a: any) => a.balance)),
    healthScore: 70 + Math.random() * 30,
    issues: []
  };
}

function getMarketStatus(): string {
  const hour = new Date().getUTCHours();
  if (hour >= 14 && hour < 21) return 'open';
  if (hour >= 13 && hour < 14) return 'pre-market';
  if (hour >= 21 && hour < 24) return 'after-hours';
  return 'closed';
}

function generateRecommendations(): any[] {
  return [
    {
      type: 'diversification',
      priority: 'high',
      message: 'Consider adding international exposure to reduce concentration risk',
      potential: '+2-4% annual return'
    },
    {
      type: 'rebalancing',
      priority: 'medium',
      message: 'Portfolio drifted 5% from target allocation',
      action: 'Rebalance recommended'
    },
    {
      type: 'tax-loss',
      priority: 'low',
      message: 'Tax-loss harvesting opportunity identified',
      savings: '$1,200 estimated'
    }
  ];
}

function generateTimeSeriesData(baseValue: number, days: number): any[] {
  const data = [];
  let value = baseValue * 0.95;
  const dailyChange = Math.pow(baseValue / value, 1 / days) - 1;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    value = value * (1 + dailyChange + (Math.random() - 0.5) * 0.02);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100
    });
  }

  return data;
}

function calculateConcentrationRisk(profile: any): number {
  const allocations = profile.portfolio.allocations;
  if (!allocations.length) return 0;
  const maxConcentration = Math.max(...allocations.map(a => a.percentage));
  return maxConcentration > 30 ? 80 : maxConcentration * 2;
}

function calculateLiquidityRisk(profile: any): number {
  const illiquidAssets = profile.portfolio.holdings
    .filter((h: any) => h.assetClass === 'alternative' || h.assetClass === 'real-estate');
  return (illiquidAssets.length / profile.portfolio.holdings.length) * 100;
}

function calculateVolatilityRisk(profile: any): number {
  const returns = profile.portfolio.ytdReturnPercent;
  return Math.abs(returns) > 20 ? 70 : Math.abs(returns) * 3;
}

function calculateCorrelationRisk(profile: any): number {
  return 20 + Math.random() * 20;
}

function generateStressTests(profile: any): any[] {
  return [
    { scenario: 'Market Crash (-30%)', impact: -(profile.portfolio.totalValue * 0.3), recovery: '18 months' },
    { scenario: 'Recession (-15%)', impact: -(profile.portfolio.totalValue * 0.15), recovery: '12 months' },
    { scenario: 'High Inflation (8%)', impact: -(profile.portfolio.totalValue * 0.08), recovery: 'ongoing' }
  ];
}

function generateRiskRecommendations(profile: any): any[] {
  const recommendations = [];

  if (calculateConcentrationRisk(profile) > 50) {
    recommendations.push('Reduce concentration in single holdings');
  }

  if (calculateLiquidityRisk(profile) > 30) {
    recommendations.push('Increase liquid assets for emergency needs');
  }

  return recommendations;
}

function calculateProjectedCompletion(goal: any): Date | null {
  if (goal.progress >= 100) return new Date();
  if (!goal.deadline) return null;

  const remainingMonths = (goal.targetAmount - goal.currentAmount) / goal.monthlyContribution;
  const projectedDate = new Date();
  projectedDate.setMonth(projectedDate.getMonth() + remainingMonths);

  return projectedDate;
}

function calculateMonthlyNeeded(goal: any): number {
  if (goal.progress >= 100) return 0;

  const remaining = goal.targetAmount - goal.currentAmount;
  const monthsRemaining = goal.deadline
    ? Math.max(1, Math.ceil((goal.deadline.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)))
    : 12;

  return remaining / monthsRemaining;
}

function analyzeCorrelation(customerData: any, paymentData: any, dealData: any): any {
  return {
    wealthToPaymentCorrelation: 0.75,
    dealToWealthCorrelation: 0.82,
    insights: [
      'Strong positive correlation between deal activity and wealth growth',
      'Payment history indicates low risk profile',
      'Customer engagement correlates with wealth accumulation'
    ]
  };
}
