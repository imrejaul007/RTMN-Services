import { ForecastRequest, ForecastPeriod, SalesForecast, ForecastBreakdown, ForecastTrend, LeadStage } from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
);

// Stage probabilities for weighted calculations
const STAGE_PROBABILITIES: Record<LeadStage, number> = {
  [LeadStage.NEW]: 0.10,
  [LeadStage.CONTACTED]: 0.20,
  [LeadStage.QUALIFIED]: 0.40,
  [LeadStage.PROPOSAL]: 0.60,
  [LeadStage.NEGOTIATION]: 0.80,
  [LeadStage.CLOSED_WON]: 1.0,
  [LeadStage.CLOSED_LOST]: 0
};

// Seasonality factors by month
const SEASONALITY_FACTORS: Record<number, number> = {
  0: 0.85,  // January
  1: 0.90,  // February
  2: 1.00,  // March (Q1 end)
  3: 0.95,  // April
  4: 1.05,  // May
  5: 0.90,  // June (Q2 end)
  6: 0.85,  // July
  7: 0.95,  // August
  8: 1.10,  // September (Q3 end)
  9: 1.15,  // October
  10: 1.20, // November
  11: 1.10  // December (Q4)
};

export async function generateForecast(request: ForecastRequest): Promise<SalesForecast> {
  const { period, deals } = request;

  logger.info(`Generating ${period} sales forecast for ${deals.length} deals`);

  // Calculate totals
  const totalRevenue = deals.reduce((sum, deal) => sum + deal.amount, 0);

  // Calculate weighted revenue based on stage probability
  const weightedRevenue = deals.reduce((sum, deal) => {
    const probability = STAGE_PROBABILITIES[deal.stage] || 0.10;
    return sum + (deal.amount * probability);
  }, 0);

  // Calculate average deal size
  const averageDealSize = deals.length > 0 ? totalRevenue / deals.length : 0;

  // Calculate stage breakdown
  const breakdown = calculateBreakdown(deals);

  // Calculate confidence based on data quality
  const confidence = calculateConfidence(deals);

  // Generate trends
  const trends = generateTrends(period, deals, weightedRevenue);

  // Generate recommendations
  const recommendations = generateRecommendations(deals, breakdown, weightedRevenue, totalRevenue);

  const forecast: SalesForecast = {
    period,
    totalRevenue,
    weightedRevenue,
    dealCount: deals.length,
    averageDealSize: Math.round(averageDealSize),
    confidence,
    breakdown,
    trends,
    recommendations
  };

  logger.info('Sales forecast generated', {
    totalRevenue,
    weightedRevenue,
    dealCount: deals.length,
    confidence
  });

  return forecast;
}

function calculateBreakdown(deals: ForecastRequest['deals']): ForecastBreakdown[] {
  const stageMap = new Map<LeadStage, { count: number; amount: number }>();

  // Initialize all stages
  Object.values(LeadStage).forEach(stage => {
    stageMap.set(stage, { count: 0, amount: 0 });
  });

  // Aggregate deals by stage
  deals.forEach(deal => {
    const current = stageMap.get(deal.stage)!;
    current.count++;
    current.amount += deal.amount;
  });

  // Calculate total for percentages
  const totalAmount = deals.reduce((sum, deal) => sum + deal.amount, 0);

  // Convert to array and filter out zero values
  const breakdown: ForecastBreakdown[] = [];

  stageMap.forEach((data, stage) => {
    if (data.count > 0) {
      breakdown.push({
        stage,
        count: data.count,
        amount: data.amount,
        percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0
      });
    }
  });

  // Sort by amount descending
  breakdown.sort((a, b) => b.amount - a.amount);

  return breakdown;
}

function calculateConfidence(deals: ForecastRequest['deals']): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence based on data quality
  const hasCloseDates = deals.filter(d => d.closeDate).length;
  const closeDateRatio = hasCloseDates / deals.length;

  const hasProbabilities = deals.filter(d => d.probability).length;
  const probabilityRatio = hasProbabilities / deals.length;

  const hasStage = deals.filter(d => d.stage).length;
  const stageRatio = hasStage / deals.length;

  // Weighted confidence calculation
  confidence += closeDateRatio * 0.2;
  confidence += probabilityRatio * 0.15;
  confidence += stageRatio * 0.15;

  // Cap at 0.95
  return Math.min(0.95, Math.max(0.3, confidence));
}

function generateTrends(
  period: ForecastPeriod,
  deals: ForecastRequest['deals'],
  weightedRevenue: number
): ForecastTrend[] {
  const trends: ForecastTrend[] = [];
  const now = new Date();

  // Determine number of periods based on type
  const periods = period === ForecastPeriod.WEEKLY ? 8 :
                   period === ForecastPeriod.MONTHLY ? 6 : 4;

  // Get seasonality factor
  const currentMonth = now.getMonth();
  const currentFactor = SEASONALITY_FACTORS[currentMonth] || 1;

  for (let i = periods - 1; i >= 0; i--) {
    const date = new Date(now);

    if (period === ForecastPeriod.WEEKLY) {
      date.setDate(date.getDate() - (i * 7));
    } else if (period === ForecastPeriod.MONTHLY) {
      date.setMonth(date.getMonth() - i);
    } else {
      date.setMonth(date.getMonth() - (i * 3));
    }

    // Apply seasonality
    const monthFactor = SEASONALITY_FACTORS[date.getMonth()] || 1;
    const adjustment = monthFactor / currentFactor;

    // Trend with some variance
    const variance = (Math.random() - 0.5) * 0.1;
    const predicted = Math.round(weightedRevenue * adjustment * (1 + variance));

    trends.push({
      date: date.toISOString().split('T')[0],
      predicted,
      actual: i === 0 ? undefined : Math.round(predicted * (0.9 + Math.random() * 0.2))
    });
  }

  return trends;
}

function generateRecommendations(
  deals: ForecastRequest['deals'],
  breakdown: ForecastBreakdown[],
  weightedRevenue: number,
  totalRevenue: number
): string[] {
  const recommendations: string[] = [];

  // Analyze stage distribution
  const negotiationDeals = breakdown.find(b => b.stage === LeadStage.NEGOTIATION);
  const proposalDeals = breakdown.find(b => b.stage === LeadStage.PROPOSAL);
  const qualifiedDeals = breakdown.find(b => b.stage === LeadStage.QUALIFIED);
  const newDeals = breakdown.find(b => b.stage === LeadStage.NEW);

  // Recommendation for pipeline health
  if (qualifiedDeals && qualifiedDeals.count < 3) {
    recommendations.push('Increase qualified leads - pipeline is light beyond current deals');
  }

  if (negotiationDeals && negotiationDeals.count > 0) {
    recommendations.push(`Focus on closing ${negotiationDeals.count} deal(s) in negotiation - worth $${formatCurrency(negotiationDeals.amount)}`);
  }

  if (proposalDeals && proposalDeals.percentage < 15) {
    recommendations.push('Consider accelerating some deals to proposal stage');
  }

  // Revenue recommendations
  if (weightedRevenue < totalRevenue * 0.5) {
    recommendations.push('Weighted revenue is conservative - consider adjusting stage probabilities if deal momentum is high');
  }

  // New leads recommendation
  if (newDeals && newDeals.percentage > 40) {
    recommendations.push('High percentage of new leads - ensure follow-up to move them through pipeline');
  }

  // Concentration risk
  if (breakdown[0] && breakdown[0].percentage > 50) {
    recommendations.push('High deal concentration - consider diversifying pipeline to reduce risk');
  }

  // Default recommendation
  if (recommendations.length === 0) {
    recommendations.push('Pipeline looks healthy - maintain current engagement strategy');
  }

  return recommendations;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toString();
}

// Additional utility functions

export async function getPipelineHealth(deals: ForecastRequest['deals']): Promise<{
  health: 'healthy' | 'warning' | 'critical';
  score: number;
  issues: string[];
}> {
  const issues: string[] = [];
  let score = 100;

  // Check for stale deals
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const staleDeals = deals.filter(d => {
    const closeDate = new Date(d.closeDate);
    return closeDate < thirtyDaysAgo &&
           d.stage !== LeadStage.CLOSED_WON &&
           d.stage !== LeadStage.CLOSED_LOST;
  });

  if (staleDeals.length > 0) {
    issues.push(`${staleDeals.length} deals are overdue`);
    score -= staleDeals.length * 5;
  }

  // Check pipeline balance
  const earlyStageDeals = deals.filter(d =>
    [LeadStage.NEW, LeadStage.CONTACTED].includes(d.stage)
  );

  if (earlyStageDeals.length < deals.length * 0.2) {
    issues.push('Pipeline has too few early-stage opportunities');
    score -= 10;
  }

  // Determine health status
  let health: 'healthy' | 'warning' | 'critical';
  if (score >= 80) {
    health = 'healthy';
  } else if (score >= 50) {
    health = 'warning';
  } else {
    health = 'critical';
  }

  return { health, score, issues };
}
