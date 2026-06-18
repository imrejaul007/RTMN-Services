/**
 * Cohort Analysis Module
 * Customer cohort analysis, LTV prediction, and retention curves
 */

export class CohortAnalysis {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all cohorts
   */
  getCohorts(segment = null) {
    let cohorts = Array.from(this.db.cohorts.values());

    if (segment) {
      cohorts = cohorts.filter(c => c.segment === segment);
    }

    const retentionData = cohorts.map(c => ({
      ...c,
      retentionCurve: this.generateRetentionCurve(c.churnRate),
      monthsActive: this.calculateMonthsActive(c.quarter),
      health: this.assessCohortHealth(c),
    }));

    return {
      cohorts: retentionData,
      summary: {
        totalCustomers: cohorts.reduce((s, c) => s + c.customers, 0),
        totalMrr: cohorts.reduce((s, c) => s + c.mrr, 0),
        avgLtv: cohorts.reduce((s, c) => s + c.ltv, 0) / cohorts.length,
        avgChurnRate: cohorts.reduce((s, c) => s + c.churnRate, 0) / cohorts.length,
        bestCohort: cohorts.reduce((best, c) => c.churnRate < best.churnRate ? c : best),
        worstCohort: cohorts.reduce((worst, c) => c.churnRate > worst.churnRate ? c : worst),
      },
    };
  }

  /**
   * Get cohort details
   */
  getCohortDetail(cohortId) {
    const cohort = this.db.cohorts.get(cohortId);
    if (!cohort) return { error: 'Cohort not found' };

    return {
      ...cohort,
      retentionCurve: this.generateRetentionCurve(cohort.churnRate),
      revenueOverTime: this.generateRevenueOverTime(cohort),
      expansionPotential: cohort.customers * (cohort.expansionRate / 100) * cohort.mrr / cohort.customers,
      ltvProjection: {
        months: [3, 6, 12, 24, 36],
        values: [
          cohort.mrr * 3,
          cohort.mrr * 6,
          cohort.mrr * 12,
          cohort.mrr * 24 * 0.85,
          cohort.mrr * 36 * 0.7,
        ],
      },
      health: this.assessCohortHealth(cohort),
      comparison: this.compareCohorts(cohort),
    };
  }

  /**
   * Generate retention curve
   */
  generateRetentionCurve(churnRate) {
    const curve = [];
    for (let month = 0; month <= 24; month++) {
      curve.push({
        month,
        retention: Math.round((Math.pow(1 - (churnRate / 100), month)) * 100),
        surviving: Math.round(Math.pow(1 - (churnRate / 100), month) * 100),
      });
    }
    return curve;
  }

  /**
   * Calculate months active
   */
  calculateMonthsActive(quarter) {
    const [q, year] = quarter.split('-');
    const qNum = parseInt(q.replace('Q', ''));
    const monthsAgo = (6 - qNum) * 3;
    return monthsAgo > 12 ? 12 : 18 - monthsAgo;
  }

  /**
   * Assess cohort health
   */
  assessCohortHealth(cohort) {
    const factors = [];

    // Churn rate
    factors.push({
      factor: 'Churn Rate',
      value: cohort.churnRate,
      threshold: 5,
      status: cohort.churnRate < 5 ? 'good' : cohort.churnRate < 8 ? 'moderate' : 'concerning',
    });

    // Expansion rate
    factors.push({
      factor: 'Expansion Rate',
      value: cohort.expansionRate,
      threshold: 15,
      status: cohort.expansionRate > 20 ? 'excellent' : cohort.expansionRate > 15 ? 'good' : cohort.expansionRate > 10 ? 'moderate' : 'low',
    });

    // Customer count
    factors.push({
      factor: 'Cohort Size',
      value: cohort.customers,
      threshold: 30,
      status: cohort.customers > 50 ? 'healthy' : cohort.customers > 30 ? 'adequate' : 'small',
    });

    const goodFactors = factors.filter(f => f.status === 'good' || f.status === 'excellent').length;
    const score = (goodFactors / factors.length * 100).toFixed(0);

    return {
      score: parseInt(score),
      status: score >= 80 ? 'healthy' : score >= 60 ? 'moderate' : 'concerning',
      factors,
    };
  }

  /**
   * Generate revenue over time
   */
  generateRevenueOverTime(cohort) {
    const revenue = [];
    const months = this.calculateMonthsActive(cohort.quarter);

    for (let m = 0; m <= months; m++) {
      const expansion = m > 0 ? m * (cohort.expansionRate / 100 / 12) : 0;
      const churn = m > 0 ? m * (cohort.churnRate / 100 / 12) : 0;

      revenue.push({
        month: m,
        revenue: Math.round(cohort.mrr * (1 + expansion - churn)),
        growth: expansion - churn,
        surviving: Math.round(Math.pow(1 - (cohort.churnRate / 100), m) * cohort.customers),
      });
    }
    return revenue;
  }

  /**
   * Compare cohorts
   */
  compareCohorts(targetCohort) {
    const cohorts = Array.from(this.db.cohorts.values());

    const comparisons = cohorts
      .filter(c => c.id !== targetCohort.id)
      .map(c => ({
        id: c.id,
        name: c.name,
        churnRateDiff: c.churnRate - targetCohort.churnRate,
        expansionRateDiff: c.expansionRate - targetCohort.expansionRate,
        similarity: this.calculateSimilarity(targetCohort, c),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    return {
      similarCohorts: comparisons,
      insights: this.generateCohortInsights(targetCohort, comparisons),
    };
  }

  /**
   * Calculate similarity between cohorts
   */
  calculateSimilarity(c1, c2) {
    const churnDiff = Math.abs(c1.churnRate - c2.churnRate);
    const expansionDiff = Math.abs(c1.expansionRate - c2.expansionRate);
    const sizeDiff = Math.abs(c1.customers - c2.customers);

    return 100 - (churnDiff * 5 + expansionDiff * 2 + sizeDiff * 0.1);
  }

  /**
   * Generate cohort insights
   */
  generateCohortInsights(cohort, comparisons) {
    const insights = [];

    // Churn analysis
    if (cohort.churnRate > 6) {
      insights.push({
        type: 'warning',
        message: `${cohort.name} has higher churn than average`,
        action: 'Investigate onboarding and engagement',
      });
    }

    // Expansion analysis
    if (cohort.expansionRate > 20) {
      insights.push({
        type: 'positive',
        message: `${cohort.name} shows excellent expansion`,
        action: 'Apply learnings to other cohorts',
      });
    }

    // Size analysis
    if (cohort.customers < 30) {
      insights.push({
        type: 'info',
        message: `${cohort.name} is small - need more data`,
        action: 'Wait for more customer acquisition',
      });
    }

    return insights;
  }

  /**
   * Predict customer LTV
   */
  predictLTV(segment, mrr, customers, tenure = 24) {
    const segmentMultipliers = {
      Enterprise: 1.5,
      MidMarket: 1.2,
      Professional: 1.0,
      Starter: 0.7,
    };

    const baseLtv = mrr * 12 * tenure;
    const multiplier = segmentMultipliers[segment] || 1.0;
    const variance = 0.9 + Math.random() * 0.2;

    const predictedLtv = baseLtv * multiplier * variance;

    return {
      input: { segment, mrr, customers, tenure },
      prediction: {
        ltv: Math.round(predictedLtv),
        ltvPerCustomer: Math.round(predictedLtv / customers),
        confidence: 87,
        confidenceRange: {
          low: Math.round(predictedLtv * 0.85),
          high: Math.round(predictedLtv * 1.15),
        },
      },
      factors: [
        { factor: 'Historical churn', impact: '-15% to +10%' },
        { factor: 'Expansion rate', impact: '-5% to +20%' },
        { factor: 'Segment data', impact: 'Fixed multiplier' },
        { factor: 'Market trends', impact: '-10% to +15%' },
      ],
      recommendation: predictedLtv > baseLtv * 1.1 ? 'high_value' :
                      predictedLtv < baseLtv * 0.9 ? 'review' : 'standard',
      strategies: this.recommendLtvImprovements(segment, predictedLtv, baseLtv),
    };
  }

  /**
   * Recommend LTV improvements
   */
  recommendLtvImprovements(segment, predicted, base) {
    const strategies = [];
    const gap = predicted - base;

    if (gap < 0) {
      strategies.push({
        type: 'churn_reduction',
        title: 'Reduce Churn',
        description: 'Implement proactive retention programs',
        impact: '+10-20% LTV',
        effort: 'medium',
      });
    }

    strategies.push({
      type: 'expansion',
      title: 'Drive Expansion',
      description: 'Upsell and cross-sell to existing customers',
      impact: '+15-25% LTV',
      effort: 'low',
    });

    strategies.push({
      type: 'engagement',
      title: 'Increase Engagement',
      description: 'Improve product adoption and usage',
      impact: '+5-15% LTV',
      effort: 'high',
    });

    return strategies;
  }

  /**
   * Get retention analysis
   */
  getRetentionAnalysis() {
    const cohorts = Array.from(this.db.cohorts.values());

    const bySegment = {};
    cohorts.forEach(c => {
      if (!bySegment[c.segment]) {
        bySegment[c.segment] = { cohorts: [], avgChurn: 0, avgExpansion: 0 };
      }
      bySegment[c.segment].cohorts.push(c);
    });

    Object.keys(bySegment).forEach(segment => {
      const data = bySegment[segment];
      data.avgChurn = data.cohorts.reduce((s, c) => s + c.churnRate, 0) / data.cohorts.length;
      data.avgExpansion = data.cohorts.reduce((s, c) => s + c.expansionRate, 0) / data.cohorts.length;
    });

    return {
      bySegment,
      retentionMetrics: {
        month1: 92,
        month3: 78,
        month6: 65,
        month12: 52,
        month24: 38,
      },
      benchmarks: {
        topQuartile: { churn: '<3%', expansion: '>25%' },
        median: { churn: '5-7%', expansion: '15-20%' },
        bottomQuartile: { churn: '>10%', expansion: '<10%' },
      },
    };
  }

  /**
   * Create new cohort
   */
  createCohort(cohortData) {
    const id = `COH${Date.now()}`;
    const newCohort = {
      id,
      ...cohortData,
      ltv: cohortData.mrr * cohortData.customers * 24, // Simplified LTV
      retentionCurve: this.generateRetentionCurve(cohortData.churnRate || 5),
      createdAt: new Date().toISOString(),
    };

    this.db.cohorts.set(id, newCohort);
    return newCohort;
  }

  /**
   * Get cohort comparison report
   */
  getComparisonReport() {
    const cohorts = Array.from(this.db.cohorts.values());

    const quarters = [...new Set(cohorts.map(c => c.quarter))].sort();
    const segments = [...new Set(cohorts.map(c => c.segment))];

    const comparison = {
      byQuarter: quarters.map(q => ({
        quarter: q,
        cohorts: cohorts.filter(c => c.quarter === q),
        avgChurn: cohorts.filter(c => c.quarter === q).reduce((s, c) => s + c.churnRate, 0) /
                  cohorts.filter(c => c.quarter === q).length,
        avgExpansion: cohorts.filter(c => c.quarter === q).reduce((s, c) => s + c.expansionRate, 0) /
                      cohorts.filter(c => c.quarter === q).length,
        totalCustomers: cohorts.filter(c => c.quarter === q).reduce((s, c) => s + c.customers, 0),
        trend: quarters.indexOf(q) > 0 ? 'improving' : 'stable',
      })),
      bySegment: segments.map(s => ({
        segment: s,
        cohorts: cohorts.filter(c => c.segment === s),
        avgChurn: cohorts.filter(c => c.segment === s).reduce((s, c) => s + c.churnRate, 0) /
                  cohorts.filter(c => c.segment === s).length,
        avgExpansion: cohorts.filter(c => c.segment === s).reduce((s, c) => s + c.expansionRate, 0) /
                      cohorts.filter(c => c.segment === s).length,
        totalCustomers: cohorts.filter(c => c.segment === s).reduce((s, c) => s + c.customers, 0),
      })),
    };

    return comparison;
  }
}

export default CohortAnalysis;
