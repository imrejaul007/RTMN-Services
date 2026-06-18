/**
 * Revenue Digital Twin Module
 * Virtual revenue model, scenario simulation, and risk assessment
 */

export class RevenueTwin {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get current revenue twin state
   */
  getCurrentState() {
    const snapshots = Array.from(this.db.revenueSnapshots.values()).slice(-12);
    const currentRevenue = snapshots[snapshots.length - 1]?.totalRevenue || 12000000;
    const revenueGrowth = snapshots.length > 1
      ? ((snapshots[snapshots.length - 1].totalRevenue - snapshots[0].totalRevenue) / snapshots[0].totalRevenue * 100).toFixed(1)
      : 0;

    return {
      currentState: {
        revenue: currentRevenue,
        mrr: currentRevenue * 0.85,
        arr: currentRevenue * 12 * 0.85,
        growth: parseFloat(revenueGrowth),
        churnRate: 5.2,
        expansionRate: 18.5,
        netRevenueRetention: 118,
      },
      healthScore: this.calculateHealthScore(snapshots),
      riskLevel: currentRevenue < 10000000 ? 'high' : currentRevenue < 15000000 ? 'medium' : 'low',
      projections: this.generateProjections(),
    };
  }

  /**
   * Calculate health score
   */
  calculateHealthScore(snapshots) {
    if (snapshots.length < 3) return 70;

    const recent = snapshots.slice(-3);
    const earlier = snapshots.slice(-6, -3);

    const recentAvg = recent.reduce((s, snap) => s + snap.totalRevenue, 0) / 3;
    const earlierAvg = earlier.length > 0
      ? earlier.reduce((s, snap) => s + snap.totalRevenue, 0) / earlier.length
      : recentAvg;

    const improvement = ((recentAvg - earlierAvg) / earlierAvg) * 100;
    const baseScore = 60 + improvement * 2;
    const variance = Math.random() * 10;

    return Math.min(100, Math.max(0, Math.round(baseScore + variance)));
  }

  /**
   * Generate projections
   */
  generateProjections() {
    const current = 12000000;

    return {
      conservative: {
        monthly: current * 1.03,
        quarterly: current * 1.1,
        annually: current * 1.4,
        confidence: 90,
      },
      expected: {
        monthly: current * 1.05,
        quarterly: current * 1.15,
        annually: current * 1.8,
        confidence: 75,
      },
      aggressive: {
        monthly: current * 1.08,
        quarterly: current * 1.25,
        annually: current * 2.0,
        confidence: 55,
      },
    };
  }

  /**
   * Simulate scenario
   */
  simulate(changes = [], horizon = 12) {
    const currentRevenue = 12000000;
    const currentChurn = 5.2;
    const currentExpansion = 18.5;

    let revenue = currentRevenue;
    let churn = currentChurn;
    let expansion = currentExpansion;

    changes.forEach(change => {
      switch (change.type) {
        case 'growth_rate':
          revenue *= Math.pow(1 + (change.value / 100), horizon);
          break;
        case 'churn_increase':
          churn += change.value;
          break;
        case 'churn_decrease':
          churn -= change.value;
          break;
        case 'expansion_rate':
          expansion += change.value;
          break;
        case 'expansion_decrease':
          expansion -= change.value;
          break;
        case 'price_increase':
          revenue *= (1 + (change.value / 100));
          break;
        case 'price_decrease':
          revenue *= (1 - (change.value / 100));
          break;
        case 'market_contraction':
          revenue *= (1 - (change.value / 100));
          churn += 2;
          break;
        case 'market_expansion':
          revenue *= (1 + (change.value / 100));
          churn -= 1;
          expansion += 5;
          break;
      }
    });

    // Apply churn impact
    const churnImpact = (churn - currentChurn) / 100 * revenue * (horizon / 12);
    // Apply expansion impact
    const expansionImpact = (expansion - currentExpansion) / 100 * revenue * (horizon / 12);

    const finalRevenue = revenue - churnImpact + expansionImpact;

    return {
      original: currentRevenue,
      simulated: Math.round(finalRevenue),
      change: Math.round(finalRevenue - currentRevenue),
      changePercent: (((finalRevenue / currentRevenue) - 1) * 100).toFixed(1),
      horizon,
      changes: changes.map(c => ({
        ...c,
        impact: this.calculateChangeImpact(c, currentRevenue),
      })),
      projections: this.generateScenarioProjections(currentRevenue, finalRevenue, horizon),
      riskAssessment: this.assessScenarioRisk(changes, churn, expansion),
    };
  }

  /**
   * Calculate individual change impact
   */
  calculateChangeImpact(change, revenue) {
    let impact = 0;

    switch (change.type) {
      case 'growth_rate':
        impact = revenue * (Math.pow(1 + change.value / 100, 12) - 1);
        break;
      case 'churn_increase':
        impact = -(revenue * change.value / 100 * 12);
        break;
      case 'churn_decrease':
        impact = revenue * change.value / 100 * 12;
        break;
      case 'expansion_rate':
        impact = revenue * change.value / 100 * 12;
        break;
      case 'price_increase':
        impact = revenue * change.value / 100 * 12;
        break;
      case 'price_decrease':
        impact = -(revenue * change.value / 100 * 12);
        break;
    }

    return Math.round(impact);
  }

  /**
   * Generate scenario projections over time
   */
  generateScenarioProjections(original, simulated, horizon) {
    const projections = [];

    for (let month = 1; month <= horizon; month++) {
      const progress = month / horizon;
      const revenue = original + (simulated - original) * progress;

      projections.push({
        month,
        revenue: Math.round(revenue),
        progress: `${(progress * 100).toFixed(0)}%`,
      });
    }

    return projections;
  }

  /**
   * Assess scenario risk
   */
  assessScenarioRisk(changes, churn, expansion) {
    const risks = [];

    if (churn > 7) {
      risks.push({
        level: 'high',
        type: 'churn',
        message: 'High churn rate threatens revenue sustainability',
      });
    }

    if (expansion < 10) {
      risks.push({
        level: 'medium',
        type: 'expansion',
        message: 'Low expansion may not offset churn',
      });
    }

    const negativeChanges = changes.filter(c =>
      ['churn_increase', 'market_contraction', 'price_decrease'].includes(c.type)
    );

    if (negativeChanges.length > 2) {
      risks.push({
        level: 'high',
        type: 'multiple_threats',
        message: 'Multiple negative factors compound risk',
      });
    }

    const totalImpact = changes.reduce((sum, c) => {
      const impact = this.calculateChangeImpact(c, 12000000);
      return sum + impact;
    }, 0);

    return {
      risks,
      overallRisk: risks.filter(r => r.level === 'high').length > 0 ? 'high' :
                  risks.filter(r => r.level === 'medium').length > 1 ? 'medium' : 'low',
      financialImpact: totalImpact,
      recommendation: totalImpact > 0 ? 'Positive scenario - consider acceleration' :
                     totalImpact > -5000000 ? 'Manageable decline - focus on retention' :
                     'Significant risk - immediate action required',
    };
  }

  /**
   * Get predefined scenarios
   */
  getPredefinedScenarios() {
    const scenarios = Array.from(this.db.scenarios.values());

    if (scenarios.length === 0) {
      return {
        scenarios: [
          {
            id: 'conservative',
            name: 'Conservative Growth',
            description: '5% monthly growth, current churn',
            changes: [
              { type: 'growth_rate', value: 5 },
            ],
            totalRevenue: 156000000,
            confidence: 85,
            risk: 'low',
          },
          {
            id: 'target',
            name: 'Target Growth',
            description: '10% monthly growth, improved churn',
            changes: [
              { type: 'growth_rate', value: 10 },
              { type: 'churn_decrease', value: 1 },
            ],
            totalRevenue: 192000000,
            confidence: 75,
            risk: 'medium',
          },
          {
            id: 'aggressive',
            name: 'Aggressive Growth',
            description: '15% monthly growth, aggressive expansion',
            changes: [
              { type: 'growth_rate', value: 15 },
              { type: 'churn_decrease', value: 2 },
              { type: 'expansion_rate', value: 10 },
            ],
            totalRevenue: 245000000,
            confidence: 60,
            risk: 'high',
          },
          {
            id: 'downturn',
            name: 'Economic Downturn',
            description: 'Recession scenario, -20% growth',
            changes: [
              { type: 'market_contraction', value: 20 },
            ],
            totalRevenue: 98000000,
            confidence: 70,
            risk: 'critical',
          },
        ],
      };
    }

    return { scenarios };
  }

  /**
   * Run scenario analysis
   */
  analyzeScenario(scenarioId) {
    const scenarios = this.getPredefinedScenarios().scenarios;
    const scenario = scenarios.find(s => s.id === scenarioId);

    if (!scenario) {
      return { error: 'Scenario not found' };
    }

    const result = this.simulate(scenario.changes, 12);

    return {
      scenario: scenario.name,
      description: scenario.description,
      ...result,
      benchmarks: {
        breakeven: 12000000,
        target: 20000000,
        stretch: 30000000,
      },
    };
  }

  /**
   * Create custom scenario
   */
  createScenario(name, description, changes) {
    const id = `SCN${Date.now()}`;
    const result = this.simulate(changes, 12);

    const scenario = {
      id,
      name,
      description,
      changes,
      totalRevenue: result.simulated,
      confidence: 75,
      risk: result.riskAssessment.overallRisk,
      createdAt: new Date().toISOString(),
    };

    this.db.scenarios.set(id, scenario);

    return scenario;
  }

  /**
   * Get risk assessment
   */
  getRiskAssessment() {
    const current = this.getCurrentState();

    return {
      overall: {
        score: current.healthScore,
        level: current.healthScore > 80 ? 'low' : current.healthScore > 60 ? 'medium' : 'high',
      },
      factors: [
        {
          factor: 'Revenue Growth',
          score: current.currentState.growth > 10 ? 90 : current.currentState.growth > 5 ? 70 : 50,
          status: current.currentState.growth > 10 ? 'good' : current.currentState.growth > 5 ? 'moderate' : 'concerning',
        },
        {
          factor: 'Churn Rate',
          score: current.currentState.churnRate < 4 ? 90 : current.currentState.churnRate < 6 ? 70 : 50,
          status: current.currentState.churnRate < 4 ? 'good' : current.currentState.churnRate < 6 ? 'moderate' : 'concerning',
        },
        {
          factor: 'Expansion Rate',
          score: current.currentState.expansionRate > 20 ? 90 : current.currentState.expansionRate > 15 ? 70 : 50,
          status: current.currentState.expansionRate > 20 ? 'good' : current.currentState.expansionRate > 15 ? 'moderate' : 'concerning',
        },
        {
          factor: 'Net Revenue Retention',
          score: current.currentState.netRevenueRetention > 120 ? 90 : current.currentState.netRevenueRetention > 110 ? 70 : 50,
          status: current.currentState.netRevenueRetention > 120 ? 'good' : current.currentState.netRevenueRetention > 110 ? 'moderate' : 'concerning',
        },
      ],
      alerts: this.generateRiskAlerts(current),
      recommendations: this.generateRiskRecommendations(current),
    };
  }

  /**
   * Generate risk alerts
   */
  generateRiskAlerts(current) {
    const alerts = [];

    if (current.currentState.churnRate > 6) {
      alerts.push({
        level: 'critical',
        message: 'Churn rate exceeds acceptable threshold',
        action: 'Implement immediate retention programs',
      });
    }

    if (current.currentState.growth < 5) {
      alerts.push({
        level: 'warning',
        message: 'Revenue growth is below target',
        action: 'Review growth strategy and pricing',
      });
    }

    if (current.currentState.netRevenueRetention < 100) {
      alerts.push({
        level: 'critical',
        message: 'Net Revenue Retention is below 100%',
        action: 'Stop contraction and drive expansion',
      });
    }

    return alerts;
  }

  /**
   * Generate risk recommendations
   */
  generateRiskRecommendations(current) {
    const recommendations = [];

    if (current.currentState.churnRate > 5) {
      recommendations.push({
        priority: 'high',
        area: 'retention',
        recommendation: 'Invest in customer success and proactive retention',
        expectedImpact: '-2% churn rate',
      });
    }

    if (current.currentState.expansionRate < 15) {
      recommendations.push({
        priority: 'high',
        area: 'expansion',
        recommendation: 'Launch upsell and cross-sell campaigns',
        expectedImpact: '+5% expansion rate',
      });
    }

    if (current.currentState.growth < 8) {
      recommendations.push({
        priority: 'medium',
        area: 'growth',
        recommendation: 'Accelerate demand generation and sales',
        expectedImpact: '+5% growth rate',
      });
    }

    return recommendations;
  }
}

export default RevenueTwin;
