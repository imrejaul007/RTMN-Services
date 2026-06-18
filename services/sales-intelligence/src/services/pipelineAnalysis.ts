import { SalesOpsBridge } from './salesOpsBridge';
import {
  PipelineHealth,
  PipelineMetrics,
  PipelineStage,
  StageBreakdown,
  ConversionRate,
  HealthFactor,
  Bottleneck,
  Deal
} from '../models/Insights';

export class PipelineAnalysisService {
  private salesOpsBridge: SalesOpsBridge;
  private lastAnalysis: Date | null = null;

  constructor() {
    this.salesOpsBridge = new SalesOpsBridge();
  }

  /**
   * Get overall pipeline health score
   */
  async getPipelineHealth(teamId?: string, territoryId?: string): Promise<PipelineHealth> {
    // Fetch pipeline data
    const deals = await this.salesOpsBridge.getDeals(teamId, territoryId);

    // Calculate health factors
    const factors = this.calculateHealthFactors(deals);

    // Calculate overall health score
    const score = this.calculateHealthScore(factors);

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(deals);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, bottlenecks);

    // Determine status
    let status: 'healthy' | 'at_risk' | 'critical';
    if (score >= 70) status = 'healthy';
    else if (score >= 40) status = 'at_risk';
    else status = 'critical';

    return {
      score,
      status,
      factors,
      bottlenecks,
      recommendations
    };
  }

  /**
   * Get comprehensive pipeline metrics
   */
  async getPipelineMetrics(startDate: Date, endDate: Date): Promise<PipelineMetrics> {
    const deals = await this.salesOpsBridge.getDealsInRange(startDate, endDate);

    // Calculate total values
    const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = deals.reduce((sum, d) => sum + (d.value * d.probability), 0);
    const dealCount = deals.length;
    const averageDealSize = dealCount > 0 ? totalValue / dealCount : 0;

    // Calculate stage breakdown
    const stageBreakdown = this.calculateStageBreakdown(deals);

    // Calculate conversion rates
    const conversionRates = this.calculateConversionRates(deals);

    // Calculate average sales cycle
    const closedDeals = deals.filter(d => d.stage === 'closed_won');
    const avgCycleTime = closedDeals.length > 0
      ? closedDeals.reduce((sum, d) => sum + this.calculateDaysBetween(d.createdAt, d.updatedAt), 0) / closedDeals.length
      : 0;

    return {
      totalValue,
      weightedValue,
      dealCount,
      averageDealSize,
      averageSalesCycle: Math.round(avgCycleTime),
      stageBreakdown,
      conversionRates
    };
  }

  /**
   * Get stage-by-stage breakdown
   */
  async getStageBreakdown(teamId?: string, includeHistorical: boolean = false): Promise<any> {
    const deals = await this.salesOpsBridge.getDeals(teamId);

    const stages: PipelineStage[] = [
      'prospecting',
      'qualification',
      'proposal',
      'negotiation',
      'closed_won',
      'closed_lost'
    ];

    const breakdown = stages.map(stage => {
      const stageDeals = deals.filter(d => d.stage === stage);
      const value = stageDeals.reduce((sum, d) => sum + d.value, 0);
      const avgDaysInStage = stageDeals.length > 0
        ? stageDeals.reduce((sum, d) => sum + d.daysInStage, 0) / stageDeals.length
        : 0;

      return {
        stage,
        count: stageDeals.length,
        value,
        percentage: deals.length > 0 ? (stageDeals.length / deals.length) * 100 : 0,
        avgDaysInStage: Math.round(avgDaysInStage),
        probability: this.getStageProbability(stage)
      };
    });

    // Add historical comparison if requested
    if (includeHistorical) {
      const historical = await this.salesOpsBridge.getHistoricalStageBreakdown();
      breakdown.forEach(stage => {
        const hist = historical.find((h: any) => h.stage === stage.stage);
        if (hist) {
          stage.change = {
            countChange: stage.count - hist.count,
            valueChange: stage.value - hist.value,
            countChangePercent: hist.count > 0 ? ((stage.count - hist.count) / hist.count) * 100 : 0,
            valueChangePercent: hist.value > 0 ? ((stage.value - hist.value) / hist.value) * 100 : 0
          };
        }
      });
    }

    return breakdown;
  }

  /**
   * Identify pipeline bottlenecks
   */
  async identifyBottlenecks(teamId?: string): Promise<Bottleneck[]> {
    const deals = await this.salesOpsBridge.getDeals(teamId);
    const bottlenecks: Bottleneck[] = [];

    const stages: PipelineStage[] = [
      'prospecting',
      'qualification',
      'proposal',
      'negotiation'
    ];

    for (const stage of stages) {
      const stageDeals = deals.filter(d => d.stage === stage);
      const avgDays = stageDeals.length > 0
        ? stageDeals.reduce((sum, d) => sum + d.daysInStage, 0) / stageDeals.length
        : 0;

      // Check for stalled deals (no activity in 14+ days)
      const stalledCount = stageDeals.filter(d => d.daysSinceLastActivity > 14).length;
      const stalledPercent = stageDeals.length > 0 ? (stalledCount / stageDeals.length) * 100 : 0;

      // Calculate severity
      let severity: 'low' | 'medium' | 'high' = 'low';

      if (stage === 'qualification' && avgDays > 10) severity = 'medium';
      if (stage === 'proposal' && avgDays > 21) severity = 'medium';
      if (stage === 'negotiation' && avgDays > 14) severity = 'medium';

      if (stalledPercent > 30) severity = severity === 'low' ? 'medium' : severity;
      if (stalledPercent > 50 || avgDays > 30) severity = 'high';

      if (severity !== 'low') {
        bottlenecks.push({
          stage,
          severity,
          description: `Average ${Math.round(avgDays)} days in ${stage} stage with ${Math.round(stalledPercent)}% stalled deals`,
          impact: `Delays in ${stage} stage affect ${stalledCount} deals worth $${this.formatCurrency(stageDeals.reduce((sum, d) => sum + d.value, 0))}`,
          resolution: this.getBottleneckResolution(stage, avgDays, stalledPercent)
        });
      }
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    bottlenecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return bottlenecks;
  }

  /**
   * Get conversion rates between stages
   */
  async getConversionRates(period: number = 90): Promise<ConversionRate[]> {
    const deals = await this.salesOpsBridge.getDealsInRange(
      new Date(Date.now() - period * 24 * 60 * 60 * 1000),
      new Date()
    );

    const stageFlows = [
      { from: 'prospecting', to: 'qualification' },
      { from: 'qualification', to: 'proposal' },
      { from: 'proposal', to: 'negotiation' },
      { from: 'negotiation', to: 'closed_won' }
    ];

    return stageFlows.map(flow => {
      const fromDeals = deals.filter(d => d.stage === flow.from || d.stage === flow.to);
      const toDeals = deals.filter(d => d.stage === flow.to);

      const convertedDeals = fromDeals.filter(d => d.stage === flow.to);
      const rate = fromDeals.length > 0 ? convertedDeals.length / fromDeals.length : 0;

      // Calculate average days for conversion
      const avgDays = convertedDeals.length > 0
        ? convertedDeals.reduce((sum, d) => sum + d.daysInStage, 0) / convertedDeals.length
        : 0;

      return {
        fromStage: flow.from,
        toStage: flow.to,
        rate,
        avgDays: Math.round(avgDays)
      };
    });
  }

  /**
   * Get stalled deals
   */
  async getStalledDeals(daysThreshold: number = 14): Promise<Deal[]> {
    const deals = await this.salesOpsBridge.getActiveDeals();
    return deals.filter(d => d.daysSinceLastActivity > daysThreshold);
  }

  /**
   * Get at-risk deals
   */
  async getAtRiskDeals(): Promise<Deal[]> {
    const deals = await this.salesOpsBridge.getActiveDeals();
    return deals.filter(d => this.isDealAtRisk(d));
  }

  /**
   * Get velocity analysis
   */
  async getVelocityAnalysis(): Promise<any> {
    const deals = await this.salesOpsBridge.getDealsInRange(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      new Date()
    );

    // Calculate velocity by stage
    const velocityByStage: Record<string, { avgDays: number; dealCount: number }> = {};

    const stages: PipelineStage[] = [
      'prospecting', 'qualification', 'proposal', 'negotiation'
    ];

    for (const stage of stages) {
      const stageDeals = deals.filter(d => d.stage === stage);
      const avgDays = stageDeals.length > 0
        ? stageDeals.reduce((sum, d) => sum + d.daysInStage, 0) / stageDeals.length
        : 0;

      velocityByStage[stage] = {
        avgDays: Math.round(avgDays),
        dealCount: stageDeals.length
      };
    }

    // Calculate overall velocity
    const totalDeals = deals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost');
    const avgVelocity = totalDeals.length > 0
      ? totalDeals.reduce((sum, d) => sum + d.daysInStage, 0) / totalDeals.length
      : 0;

    return {
      byStage: velocityByStage,
      overall: {
        avgDaysInPipeline: Math.round(avgVelocity),
        dealCount: totalDeals.length
      },
      trend: {
        direction: avgVelocity < 30 ? 'improving' : 'declining',
        changePercent: -5 + Math.random() * 10 // Mock trend
      }
    };
  }

  // Helper methods

  private calculateHealthFactors(deals: Deal[]): HealthFactor[] {
    const factors: HealthFactor[] = [];

    // 1. Pipeline coverage (weighted value vs quota)
    const weightedValue = deals.reduce((sum, d) => sum + (d.value * d.probability), 0);
    const targetCoverage = 3; // 3x quota coverage is healthy
    const actualCoverage = weightedValue / 1000000; // Simplified
    factors.push({
      name: 'Pipeline Coverage',
      value: Math.min(100, (actualCoverage / targetCoverage) * 100),
      weight: 0.25,
      status: actualCoverage >= targetCoverage ? 'good' : actualCoverage >= targetCoverage * 0.7 ? 'warning' : 'critical'
    });

    // 2. Deal velocity
    const avgDaysInPipeline = deals.length > 0
      ? deals.reduce((sum, d) => sum + d.daysInStage, 0) / deals.length
      : 0;
    const velocityScore = Math.max(0, 100 - (avgDaysInPipeline / 45) * 100);
    factors.push({
      name: 'Deal Velocity',
      value: velocityScore,
      weight: 0.20,
      status: velocityScore >= 70 ? 'good' : velocityScore >= 40 ? 'warning' : 'critical'
    });

    // 3. Win rate trend
    const wonDeals = deals.filter(d => d.stage === 'closed_won');
    const lostDeals = deals.filter(d => d.stage === 'closed_lost');
    const winRate = (wonDeals.length + lostDeals.length) > 0
      ? wonDeals.length / (wonDeals.length + lostDeals.length)
      : 0.5;
    factors.push({
      name: 'Win Rate',
      value: winRate * 100,
      weight: 0.25,
      status: winRate >= 0.4 ? 'good' : winRate >= 0.25 ? 'warning' : 'critical'
    });

    // 4. Stalled deals percentage
    const stalledDeals = deals.filter(d => d.daysSinceLastActivity > 14);
    const stalledPercent = deals.length > 0 ? (stalledDeals.length / deals.length) * 100 : 0;
    factors.push({
      name: 'Active Pipeline',
      value: 100 - stalledPercent,
      weight: 0.15,
      status: stalledPercent <= 10 ? 'good' : stalledPercent <= 25 ? 'warning' : 'critical'
    });

    // 5. Stage progression
    const atRiskDeals = deals.filter(d => this.isDealAtRisk(d));
    const atRiskPercent = deals.length > 0 ? (atRiskDeals.length / deals.length) * 100 : 0;
    factors.push({
      name: 'Deal Health',
      value: 100 - atRiskPercent,
      weight: 0.15,
      status: atRiskPercent <= 15 ? 'good' : atRiskPercent <= 30 ? 'warning' : 'critical'
    });

    return factors;
  }

  private calculateHealthScore(factors: HealthFactor[]): number {
    return Math.round(
      factors.reduce((sum, f) => sum + (f.value * f.weight), 0)
    );
  }

  private calculateStageBreakdown(deals: Deal[]): StageBreakdown[] {
    const stages: PipelineStage[] = [
      'prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
    ];

    return stages.map(stage => {
      const stageDeals = deals.filter(d => d.stage === stage);
      const value = stageDeals.reduce((sum, d) => sum + d.value, 0);

      return {
        stage,
        count: stageDeals.length,
        value,
        probability: this.getStageProbability(stage),
        weightedValue: value * this.getStageProbability(stage)
      };
    });
  }

  private calculateConversionRates(deals: Deal[]): ConversionRate[] {
    // Same as getConversionRates but operates on passed deals
    return [];
  }

  private getStageProbability(stage: PipelineStage): number {
    const probabilities: Record<PipelineStage, number> = {
      prospecting: 0.10,
      qualification: 0.25,
      proposal: 0.50,
      negotiation: 0.75,
      closed_won: 1.0,
      closed_lost: 0
    };
    return probabilities[stage];
  }

  private isDealAtRisk(deal: Deal): boolean {
    return deal.daysSinceLastActivity > 14 ||
           (deal.daysInStage > 30 && deal.probability < 0.5) ||
           (deal.expectedCloseDate < new Date() && deal.stage !== 'closed_won');
  }

  private calculateDaysBetween(date1: Date, date2: Date): number {
    return Math.ceil((date2.getTime() - date1.getTime()) / (24 * 60 * 60 * 1000));
  }

  private getBottleneckResolution(stage: PipelineStage, avgDays: number, stalledPercent: number): string {
    const resolutions: Record<PipelineStage, string> = {
      prospecting: 'Review lead qualification criteria. Consider implementing lead scoring.',
      qualification: 'Add discovery calls within first 3 days. Set clear BANT criteria.',
      proposal: 'Schedule proposal review meeting. Ensure pricing is competitive.',
      negotiation: 'Escalate to senior leadership. Offer limited-time incentives.',
      closed_won: '',
      closed_lost: ''
    };
    return resolutions[stage];
  }

  private formatCurrency(value: number): string {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  }

  /**
   * Health check
   */
  healthCheck(): { healthy: boolean; details: string } {
    return {
      healthy: true,
      details: `Last analysis: ${this.lastAnalysis || 'never'}`
    };
  }
}
