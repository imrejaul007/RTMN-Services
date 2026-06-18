/**
 * RevOps Intelligence Module
 * Pipeline health, churn analysis, expansion tracking
 */

export class RevOpsIntelligence {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get pipeline overview
   */
  getPipeline() {
    const stages = [
      { name: 'Prospecting', count: 150, value: 15000000, velocity: 15, avgDays: 5 },
      { name: 'Qualification', count: 100, value: 12000000, velocity: 12, avgDays: 8 },
      { name: 'Proposal', count: 60, value: 9000000, velocity: 10, avgDays: 12 },
      { name: 'Negotiation', count: 30, value: 6000000, velocity: 8, avgDays: 15 },
      { name: 'Closing', count: 15, value: 4500000, velocity: 5, avgDays: 10 },
    ];

    const totalPipeline = stages.reduce((s, stage) => s + stage.value, 0);
    const totalDeals = stages.reduce((s, stage) => s + stage.count, 0);
    const weightedVelocity = stages.reduce((s, stage) => s + (stage.velocity * stage.value), 0) / totalPipeline;

    return {
      stages,
      summary: {
        totalPipeline,
        dealCount: totalDeals,
        avgDealSize: Math.round(totalPipeline / totalDeals),
        velocityDays: Math.round(30 / weightedVelocity),
        coverageRatio: (totalPipeline / 15000000).toFixed(1), // vs $15M target
        stageConversionRates: this.calculateConversionRates(stages),
      },
      health: this.assessPipelineHealth(stages),
    };
  }

  /**
   * Calculate stage conversion rates
   */
  calculateConversionRates(stages) {
    const rates = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const from = stages[i];
      const to = stages[i + 1];
      const rate = (to.count / from.count * 100).toFixed(0);
      rates.push({
        from: from.name,
        to: to.name,
        rate: `${rate}%`,
        health: rate > 60 ? 'good' : rate > 40 ? 'moderate' : 'concerning',
      });
    }
    return rates;
  }

  /**
   * Assess pipeline health
   */
  assessPipelineHealth(stages) {
    const topOfPyramid = stages[stages.length - 1];
    const totalDeals = stages.reduce((s, stage) => s + stage.count, 0);

    const healthFactors = [];

    // Check deal distribution
    const avgDealsPerStage = totalDeals / stages.length;
    const distribution = stages.every(s => s.count >= avgDealsPerStage * 0.5 && s.count <= avgDealsPerStage * 2);
    healthFactors.push({ factor: 'Deal Distribution', healthy: distribution });

    // Check value concentration
    const topValueShare = topOfPyramid.value / stages.reduce((s, stage) => s + stage.value, 0);
    healthFactors.push({ factor: 'Value Concentration', healthy: topValueShare < 0.4 });

    // Check stage progression
    let healthyProgression = true;
    for (let i = 0; i < stages.length - 1; i++) {
      if (stages[i + 1].count > stages[i].count) {
        healthyProgression = false;
        break;
      }
    }
    healthFactors.push({ factor: 'Stage Progression', healthy: healthyProgression });

    const healthyFactors = healthFactors.filter(f => f.healthy).length;
    const score = (healthyFactors / healthFactors.length * 100).toFixed(0);

    return {
      score: parseInt(score),
      status: score >= 80 ? 'healthy' : score >= 60 ? 'moderate' : 'concerning',
      factors: healthFactors,
    };
  }

  /**
   * Get key RevOps metrics
   */
  getMetrics() {
    return {
      retention: {
        netRevenueRetention: 118,
        grossRevenueRetention: 92,
        logoChurnRate: 5.2,
        netChurnRate: 3.8,
        expansionRate: 18.5,
        contractionRate: 2.1,
      },
      salesEfficiency: {
        winRate: 28,
        avgSalesCycle: 45,
        avgContractLength: 18,
        quoteToClose: 35,
        dealsPerRep: 8.5,
        revenuePerRep: 850000,
      },
      unitEconomics: {
        ltvCacRatio: 5.2,
        paybackPeriod: 14,
        magicNumber: 0.85,
        cac: 16346,
        ltv: 85000,
      },
      pipeline: {
        coverage: 3.2,
        velocity: 50,
        stageConversion: 68,
      },
    };
  }

  /**
   * Get churn risk analysis
   */
  getChurnRisks() {
    const risks = [
      { customerId: 'CUS001', name: 'TechCorp', segment: 'Enterprise', mrr: 125000, risk: 'high', engagement: 25, reason: 'Low engagement', daysSinceActivity: 45, supportTickets: 8 },
      { customerId: 'CUS002', name: 'Global Inc', segment: 'Enterprise', mrr: 85000, risk: 'medium', engagement: 45, reason: 'Competitor contact', daysSinceActivity: 30, supportTickets: 4 },
      { customerId: 'CUS003', name: 'StartUpXYZ', segment: 'Professional', mrr: 25000, risk: 'low', engagement: 55, reason: 'Price sensitivity', daysSinceActivity: 20, supportTickets: 2 },
      { customerId: 'CUS004', name: 'MegaCorp', segment: 'Enterprise', mrr: 200000, risk: 'high', engagement: 20, reason: 'Executive departure', daysSinceActivity: 60, supportTickets: 12 },
      { customerId: 'CUS005', name: 'Digital First', segment: 'Professional', mrr: 45000, risk: 'medium', engagement: 50, reason: 'Usage decline', daysSinceActivity: 25, supportTickets: 3 },
    ];

    const totalAtRisk = risks.reduce((s, c) => s + c.mrr, 0);
    const highRiskAtRisk = risks.filter(c => c.risk === 'high').reduce((s, c) => s + c.mrr, 0);

    return {
      risks: risks.map(r => ({
        ...r,
        annualValue: r.mrr * 12,
        recoveryProbability: r.risk === 'high' ? 30 : r.risk === 'medium' ? 60 : 80,
        recommendedAction: r.risk === 'high' ? 'Immediate executive outreach' :
                         r.risk === 'medium' ? 'Schedule QBR' : 'Monitor closely',
      })),
      summary: {
        totalAtRisk: totalAtRisk,
        annualAtRisk: totalAtRisk * 12,
        highRiskCount: risks.filter(c => c.risk === 'high').length,
        mediumRiskCount: risks.filter(c => c.risk === 'medium').length,
        lowRiskCount: risks.filter(c => c.risk === 'low').length,
        highRiskValue: highRiskAtRisk,
        recoveryPotential: Math.round(highRiskAtRisk * 0.3), // 30% recovery probability
      },
    };
  }

  /**
   * Track expansion revenue
   */
  getExpansionTracking() {
    const expansions = [
      { customerId: 'CUS010', name: 'ScaleUp Inc', currentMRR: 150000, previousMRR: 100000, type: 'upsell', expansionMRR: 50000, expansionRate: 50, date: '2026-06-01' },
      { customerId: 'CUS011', name: 'GrowthCo', currentMRR: 85000, previousMRR: 70000, type: 'upsell', expansionMRR: 15000, expansionRate: 21, date: '2026-05-15' },
      { customerId: 'CUS012', name: 'Enterprise Plus', currentMRR: 250000, previousMRR: 200000, type: 'upgrade', expansionMRR: 50000, expansionRate: 25, date: '2026-06-10' },
      { customerId: 'CUS013', name: 'SMB Champion', currentMRR: 35000, previousMRR: 25000, type: 'seats', expansionMRR: 10000, expansionRate: 40, date: '2026-05-20' },
    ];

    const totalExpansion = expansions.reduce((s, e) => s + e.expansionMRR, 0);

    return {
      expansions,
      summary: {
        totalExpansionMRR: totalExpansion,
        annualExpansion: totalExpansion * 12,
        expansionCount: expansions.length,
        avgExpansionRate: (expansions.reduce((s, e) => s + e.expansionRate, 0) / expansions.length).toFixed(0),
        totalValue: expansions.reduce((s, e) => s + e.currentMRR, 0),
        expansionToTotalRatio: ((totalExpansion / expansions.reduce((s, e) => s + e.currentMRR, 0)) * 100).toFixed(1),
      },
    };
  }

  /**
   * Win/Loss analysis
   */
  getWinLossAnalysis() {
    return {
      summary: {
        totalDeals: 150,
        won: 42,
        lost: 108,
        winRate: 28,
        avgWinValue: 85000,
        avgLossValue: 65000,
        totalWonValue: 3570000,
        totalLostValue: 7020000,
        pipelineLostValue: 4200000,
      },
      reasons: [
        { reason: 'Price too high', count: 35, percentage: 32, avgDealSize: 55000 },
        { reason: 'No decision/timeout', count: 28, percentage: 26, avgDealSize: 75000 },
        { reason: 'Competitor selected', count: 22, percentage: 20, avgDealSize: 70000 },
        { reason: 'Lack of features', count: 15, percentage: 14, avgDealSize: 60000 },
        { reason: 'No budget', count: 8, percentage: 8, avgDealSize: 50000 },
      ],
      competitorLosses: [
        { competitor: 'Competitor A', losses: 12, avgDealSize: 80000 },
        { competitor: 'Competitor B', losses: 6, avgDealSize: 65000 },
        { competitor: 'Competitor C', losses: 4, avgDealSize: 55000 },
      ],
      segmentAnalysis: [
        { segment: 'Enterprise', winRate: 35, avgDealSize: 150000 },
        { segment: 'Mid-Market', winRate: 28, avgDealSize: 75000 },
        { segment: 'SMB', winRate: 22, avgDealSize: 25000 },
      ],
    };
  }

  /**
   * Calculate revenue at risk
   */
  getRevenueAtRisk() {
    const metrics = this.getMetrics();
    const churnRisks = this.getChurnRisks();

    const totalMRR = 12000000;
    const logoChurnRate = metrics.retention.logoChurnRate / 100;
    const netChurnRate = metrics.retention.netChurnRate / 100;

    const grossChurnRevenue = totalMRR * logoChurnRate;
    const expansionOffset = totalMRR * (metrics.retention.expansionRate / 100);
    const netChurnRevenue = grossChurnRevenue - expansionOffset;

    return {
      totalMRR,
      grossChurn: {
        monthly: grossChurnRevenue,
        annual: grossChurnRevenue * 12,
        rate: metrics.retention.logoChurnRate,
      },
      netChurn: {
        monthly: netChurnRevenue,
        annual: netChurnRevenue * 12,
        rate: metrics.retention.netChurnRate,
      },
      identifiedRisk: {
        monthly: churnRisks.summary.totalAtRisk,
        annual: churnRisks.summary.annualAtRisk,
        highRisk: churnRisks.summary.highRiskValue,
        recoveryPotential: churnRisks.summary.recoveryPotential,
      },
      benchmarks: {
        healthyNetChurn: '<5%',
        goodNetChurn: '5-7%',
        acceptableNetChurn: '7-10%',
        poorNetChurn: '>10%',
      },
    };
  }

  /**
   * Get forecast accuracy
   */
  getForecastAccuracy() {
    return {
      overall: {
        accuracy: 87.5,
        bias: 'conservative',
        trend: 'improving',
      },
      byPeriod: [
        { period: 'Q1-2026', forecast: 11000000, actual: 10500000, accuracy: 95.2 },
        { period: 'Q2-2026', forecast: 11500000, actual: 10800000, accuracy: 93.9 },
        { period: 'Q3-2026', forecast: 12000000, actual: 11500000, accuracy: 95.8 },
        { period: 'Q4-2026', forecast: 13000000, actual: null, accuracy: null },
      ],
      byStage: [
        { stage: 'Commit', accuracy: 92 },
        { stage: 'Best Case', accuracy: 85 },
        { stage: 'Pipeline', accuracy: 72 },
      ],
      factors: [
        { factor: 'Stage transitions', impact: '+3% accuracy' },
        { factor: 'Historical patterns', impact: '+5% accuracy' },
        { factor: 'Rep predictions', impact: '-2% accuracy' },
      ],
    };
  }
}

export default RevOpsIntelligence;
