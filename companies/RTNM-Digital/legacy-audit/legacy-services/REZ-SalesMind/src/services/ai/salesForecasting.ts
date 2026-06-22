/**
 * Sales Forecasting - Predict deal closure probability
 */

export interface ForecastData {
  dealId: string;
  company: string;
  value: number;
  stage: string;
  daysInStage: number;
  lastActivity: Date;
  engagementScore: number;
  competingDeals: number;
}

export interface ForecastResult {
  dealId: string;
  probability: number;
  expectedValue: number;
  predictedCloseDate: Date;
  confidence: 'high' | 'medium' | 'low';
  riskFactors: string[];
  recommendations: string[];
  trend: 'up' | 'stable' | 'down';
}

export interface PipelineForecast {
  period: string;
  totalValue: number;
  weightedValue: number;
  dealCount: number;
  stageBreakdown: { stage: string; count: number; value: number; probability: number }[];
  momentum: { week: string; value: number }[];
  riskAssessment: { atRisk: number; healthy: number; stalled: number };
}

export class SalesForecasting {
  private stageProbabilities: Record<string, number> = {
    new: 0.1,
    contacted: 0.2,
    qualified: 0.4,
    proposal: 0.6,
    negotiation: 0.8,
    closed_won: 1.0,
    closed_lost: 0,
  };

  predictDeal(deal: ForecastData): ForecastResult {
    const baseProbability = this.stageProbabilities[deal.stage] || 0.2;
    const engagementMultiplier = deal.engagementScore / 50;
    const timeMultiplier = this.calculateTimeMultiplier(deal.daysInStage, deal.stage);
    const recencyMultiplier = this.calculateRecencyMultiplier(deal.lastActivity);

    let probability = baseProbability * engagementMultiplier * timeMultiplier * recencyMultiplier;
    probability = Math.min(Math.max(probability, 0.05), 0.95);

    const expectedValue = deal.value * probability;
    const predictedCloseDate = this.predictCloseDate(deal, probability);
    const riskFactors = this.identifyRisks(deal, probability);
    const recommendations = this.generateRecommendations(deal, probability);
    const trend = this.calculateTrend(deal);
    const confidence = this.calculateConfidence(deal);

    return {
      dealId: deal.dealId,
      probability: Math.round(probability * 100),
      expectedValue: Math.round(expectedValue),
      predictedCloseDate,
      confidence,
      riskFactors,
      recommendations,
      trend,
    };
  }

  forecastPipeline(deals: ForecastData[], period: string = 'Q2 2026'): PipelineForecast {
    const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
    const results = deals.map(d => this.predictDeal(d));
    const weightedValue = results.reduce((sum, r) => sum + r.expectedValue, 0);

    const stageMap = new Map<string, { count: number; value: number; probability: number }>();
    results.forEach((r, i) => {
      const stage = deals[i].stage;
      const current = stageMap.get(stage) || { count: 0, value: 0, probability: 0 };
      stageMap.set(stage, {
        count: current.count + 1,
        value: current.value + deals[i].value,
        probability: current.probability + r.probability,
      });
    });

    const stageBreakdown = Array.from(stageMap.entries()).map(([stage, data]) => ({
      stage,
      count: data.count,
      value: data.value,
      probability: Math.round(data.probability / data.count),
    }));

    const atRisk = results.filter(r => r.probability < 30 && r.trend === 'down').length;
    const healthy = results.filter(r => r.probability > 60).length;
    const stalled = deals.filter(d => d.daysInStage > 14).length;

    return {
      period,
      totalValue,
      weightedValue,
      dealCount: deals.length,
      stageBreakdown,
      momentum: this.generateMomentum(),
      riskAssessment: { atRisk, healthy, stalled },
    };
  }

  generateWeeklyTargets(currentPipeline: ForecastData[], target: number) {
    const results = currentPipeline.map(d => this.predictDeal(d));
    const weightedValue = results.reduce((sum, r) => sum + r.expectedValue, 0);
    const weeksLeft = 12;
    const weeklyTarget = (target - weightedValue) / weeksLeft;
    const dealsToClose = Math.ceil(weeklyTarget / 5000);

    return {
      weeklyTarget: Math.max(weeklyTarget, 0),
      dealsToClose,
      requiredVelocity: weeklyTarget / 1000,
    };
  }

  private calculateTimeMultiplier(daysInStage: number, stage: string): number {
    const optimalDays: Record<string, number> = {
      new: 7,
      contacted: 10,
      qualified: 14,
      proposal: 21,
      negotiation: 14,
    };
    const optimal = optimalDays[stage] || 14;
    if (daysInStage <= optimal) return 1.0;
    if (daysInStage <= optimal * 2) return 0.9;
    if (daysInStage <= optimal * 3) return 0.7;
    return 0.5;
  }

  private calculateRecencyMultiplier(lastActivity: Date): number {
    const daysSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 3) return 1.2;
    if (daysSince <= 7) return 1.0;
    if (daysSince <= 14) return 0.8;
    if (daysSince <= 30) return 0.6;
    return 0.4;
  }

  private predictCloseDate(deal: ForecastData, probability: number): Date {
    const baseDays: Record<string, number> = { new: 45, contacted: 35, qualified: 28, proposal: 21, negotiation: 14 };
    const baseDaysLeft = baseDays[deal.stage] || 30;
    const adjustedDays = baseDaysLeft * (1 - probability * 0.5);
    return new Date(Date.now() + adjustedDays * 24 * 60 * 60 * 1000);
  }

  private identifyRisks(deal: ForecastData, probability: number): string[] {
    const risks: string[] = [];
    if (deal.daysInStage > 21) risks.push('Stalled in current stage');
    if (deal.engagementScore < 30) risks.push('Low engagement - at risk of going cold');
    const daysSinceActivity = (Date.now() - deal.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity > 14) risks.push('No recent activity');
    if (deal.competingDeals > 3) risks.push('Multiple competing deals');
    if (probability < 30) risks.push('Low conversion probability');
    return risks;
  }

  private generateRecommendations(deal: ForecastData, probability: number): string[] {
    const recs: string[] = [];
    if (probability < 40) recs.push('Schedule discovery call to re-engage');
    if (deal.daysInStage > 14) recs.push('Send proposal or schedule demo');
    if (deal.engagementScore < 50) recs.push('Add to nurture sequence');
    if (probability > 60) recs.push('Prepare contract for close');
    recs.push('Request meeting with decision maker');
    return recs;
  }

  private calculateTrend(deal: ForecastData): 'up' | 'stable' | 'down' {
    if (deal.engagementScore > 70) return 'up';
    if (deal.engagementScore > 40) return 'stable';
    return 'down';
  }

  private calculateConfidence(deal: ForecastData): 'high' | 'medium' | 'low' {
    const score = deal.engagementScore + (100 - deal.daysInStage) - (deal.competingDeals * 10);
    if (score > 120) return 'high';
    if (score > 60) return 'medium';
    return 'low';
  }

  private generateMomentum(): { week: string; value: number }[] {
    return ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'].map((week, i) => ({
      week,
      value: 100000 + Math.random() * 50000 * (i + 1),
    }));
  }
}