import { v4 as uuidv4 } from 'uuid';
import { AlertModel } from '../models/Alert';
import {
  RiskAnalysis,
  RiskItem,
  RiskCategory,
  Alert
} from '../types';

interface RiskIndicator {
  category: RiskCategory;
  name: string;
  value: number;
  threshold: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export class RiskAnalyzer {
  private riskThresholds = {
    critical: 80,
    high: 60,
    medium: 40,
    low: 20
  };

  async analyze(tenantId: string, date: Date): Promise<RiskAnalysis & { dataSources: string[] }> {
    const dataSources: string[] = ['memory-os', 'goal-os', 'alerts'];
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 7); // Look back 7 days

    // Fetch alerts for risk analysis
    const alerts = await AlertModel.find({
      tenantId,
      createdAt: { $gte: startDate },
      acknowledged: false
    });

    dataSources.push('alert-system');

    // Analyze various risk categories
    const riskIndicators = await this.analyzeRiskIndicators(tenantId, alerts);
    const risks = this.identifyRisks(riskIndicators, alerts);
    const trendingRisks = this.identifyTrendingRisks(risks);

    // Calculate overall risk score
    const overallRiskScore = this.calculateOverallRiskScore(risks, riskIndicators);
    const riskLevel = this.determineRiskLevel(overallRiskScore);

    return {
      overallRiskScore,
      riskLevel,
      risks,
      trendingRisks,
      dataSources: [...new Set(dataSources)]
    };
  }

  private async analyzeRiskIndicators(
    tenantId: string,
    alerts: Alert[]
  ): Promise<RiskIndicator[]> {
    const indicators: RiskIndicator[] = [];

    // Customer churn risk indicators
    const customerAtRiskAlerts = alerts.filter(a => a.type === 'customer_at_risk');
    indicators.push({
      category: 'customer_churn',
      name: 'Customer At-Risk Count',
      value: customerAtRiskAlerts.length,
      threshold: 5,
      trend: customerAtRiskAlerts.length > 3 ? 'increasing' : 'stable'
    });

    // Financial risk indicators
    const revenueAlerts = alerts.filter(a => a.type === 'revenue_drop');
    indicators.push({
      category: 'financial',
      name: 'Revenue Alert Count',
      value: revenueAlerts.length,
      threshold: 2,
      trend: revenueAlerts.length > 1 ? 'increasing' : 'stable'
    });

    // Product risk indicators
    const productAlerts = alerts.filter(a => a.type === 'product_issue');
    indicators.push({
      category: 'product',
      name: 'Product Issue Count',
      value: productAlerts.length,
      threshold: 3,
      trend: productAlerts.length > 2 ? 'increasing' : 'stable'
    });

    // Compliance risk indicators
    const complianceAlerts = alerts.filter(a => a.type === 'compliance_breach');
    indicators.push({
      category: 'compliance',
      name: 'Compliance Issues',
      value: complianceAlerts.length,
      threshold: 1,
      trend: complianceAlerts.length > 0 ? 'increasing' : 'stable'
    });

    // Supply chain risk indicators
    indicators.push({
      category: 'supply_chain',
      name: 'Supply Chain Health',
      value: 85, // Mock value - in production, fetch from external services
      threshold: 70,
      trend: 'stable'
    });

    // Operational risk indicators
    const operationalAlerts = alerts.filter(a => a.category === 'operations');
    indicators.push({
      category: 'operational',
      name: 'Operational Incidents',
      value: operationalAlerts.length,
      threshold: 4,
      trend: operationalAlerts.length > 2 ? 'increasing' : 'stable'
    });

    return indicators;
  }

  private identifyRisks(
    indicators: RiskIndicator[],
    alerts: Alert[]
  ): RiskItem[] {
    const risks: RiskItem[] = [];

    for (const indicator of indicators) {
      const severityScore = this.calculateIndicatorSeverity(indicator);

      if (severityScore >= this.riskThresholds.medium) {
        const risk: RiskItem = {
          id: uuidv4(),
          category: indicator.category,
          title: this.getRiskTitle(indicator.category),
          description: this.getRiskDescription(indicator.category, indicator),
          severity: this.determineSeverity(severityScore),
          score: severityScore,
          affectedAreas: this.getAffectedAreas(indicator.category),
          indicators: [
            `${indicator.name}: ${indicator.value} (threshold: ${indicator.threshold})`
          ],
          recommendedActions: this.getRecommendedActions(indicator.category),
          trend: indicator.trend,
          detectedAt: new Date()
        };

        risks.push(risk);
      }
    }

    // Add risks based on alert analysis
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      risks.push({
        id: uuidv4(),
        category: 'reputation',
        title: 'Critical Alerts Require Attention',
        description: `${criticalAlerts.length} critical alerts detected that require immediate executive attention.`,
        severity: 'critical',
        score: 90,
        affectedAreas: criticalAlerts.map(a => a.category),
        indicators: criticalAlerts.map(a => a.title),
        recommendedActions: [
          'Review all critical alerts immediately',
          'Assign owners to each critical issue',
          'Establish escalation protocols if not already in place'
        ],
        trend: criticalAlerts.length > 2 ? 'increasing' : 'stable',
        detectedAt: new Date()
      });
    }

    return risks.sort((a, b) => b.score - a.score);
  }

  private identifyTrendingRisks(risks: RiskItem[]): RiskItem[] {
    return risks
      .filter(r => r.trend === 'increasing')
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  private calculateOverallRiskScore(
    risks: RiskItem[],
    indicators: RiskIndicator[]
  ): number {
    if (risks.length === 0) return 15; // Base low risk

    // Weight risks by severity
    let weightedScore = 0;
    for (const risk of risks) {
      const weight = this.getSeverityWeight(risk.severity);
      weightedScore += risk.score * weight;
    }

    // Normalize by number of risk categories
    const categoryCount = new Set(risks.map(r => r.category)).size;
    const normalizedScore = weightedScore / Math.max(categoryCount, 1);

    // Factor in trending risks
    const trendingMultiplier = risks.some(r => r.trend === 'increasing') ? 1.2 : 1;

    return Math.min(Math.round(normalizedScore * trendingMultiplier), 100);
  }

  private calculateIndicatorSeverity(indicator: RiskIndicator): number {
    const ratio = indicator.value / indicator.threshold;
    let baseScore = ratio * 50;

    // Add trend factor
    if (indicator.trend === 'increasing') {
      baseScore *= 1.3;
    } else if (indicator.trend === 'decreasing') {
      baseScore *= 0.7;
    }

    return Math.min(Math.round(baseScore), 100);
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= this.riskThresholds.critical) return 'critical';
    if (score >= this.riskThresholds.high) return 'high';
    if (score >= this.riskThresholds.medium) return 'medium';
    return 'low';
  }

  private determineSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    return this.determineRiskLevel(score);
  }

  private getSeverityWeight(severity: string): number {
    const weights: Record<string, number> = {
      critical: 1.5,
      high: 1.2,
      medium: 1.0,
      low: 0.5
    };
    return weights[severity] || 1.0;
  }

  private getRiskTitle(category: RiskCategory): string {
    const titles: Record<RiskCategory, string> = {
      customer_churn: 'Customer Churn Risk Elevated',
      financial: 'Financial Risk Detected',
      operational: 'Operational Efficiency Concern',
      compliance: 'Compliance Risk Identified',
      market: 'Market Risk Factors Present',
      product: 'Product Quality Risk',
      supply_chain: 'Supply Chain Vulnerability',
      reputation: 'Reputation Risk Identified'
    };
    return titles[category];
  }

  private getRiskDescription(category: RiskCategory, indicator: RiskIndicator): string {
    const descriptions: Record<RiskCategory, string> = {
      customer_churn: `${indicator.value} customers are showing signs of disengagement. This could lead to increased churn rates if not addressed promptly.`,
      financial: `Financial indicators suggest ${indicator.value} areas of concern. Review revenue streams and cost structures.`,
      operational: `${indicator.value} operational issues have been detected. Efficiency may be impacted.`,
      compliance: `Compliance monitoring has flagged ${indicator.value} potential issues that require review.`,
      market: `Market conditions indicate ${indicator.value} risk factors affecting business performance.`,
      product: `${indicator.value} product-related issues have been reported. Customer satisfaction may be affected.`,
      supply_chain: `Supply chain health is at ${indicator.value}%. Below threshold levels require attention.`,
      reputation: `Reputation risk factors present. Monitor and respond to customer feedback proactively.`
    };
    return descriptions[category];
  }

  private getAffectedAreas(category: RiskCategory): string[] {
    const areas: Record<RiskCategory, string[]> = {
      customer_churn: ['Revenue', 'Customer Success', 'Sales'],
      financial: ['Finance', 'Operations', 'Strategy'],
      operational: ['Operations', 'IT', 'Human Resources'],
      compliance: ['Legal', 'Operations', 'Executive'],
      market: ['Sales', 'Marketing', 'Strategy'],
      product: ['Product', 'Engineering', 'Customer Success'],
      supply_chain: ['Operations', 'Procurement', 'Logistics'],
      reputation: ['Marketing', 'Customer Success', 'Executive']
    };
    return areas[category];
  }

  private getRecommendedActions(category: RiskCategory): string[] {
    const actions: Record<RiskCategory, string[]> = {
      customer_churn: [
        'Review at-risk customer accounts immediately',
        'Schedule proactive outreach calls',
        'Analyze churn patterns for root causes',
        'Consider retention offers for high-value customers'
      ],
      financial: [
        'Review financial dashboards for variance analysis',
        'Engage finance team for detailed review',
        'Identify cost optimization opportunities',
        'Monitor cash flow projections closely'
      ],
      operational: [
        'Conduct root cause analysis on incidents',
        'Review process documentation',
        'Implement monitoring enhancements',
        'Schedule operational review meeting'
      ],
      compliance: [
        'Escalate to compliance team immediately',
        'Document all related activities',
        'Review policies and procedures',
        'Prepare response plan if needed'
      ],
      market: [
        'Review market intelligence reports',
        'Analyze competitor activities',
        'Adjust marketing strategy if needed',
        'Monitor key market indicators'
      ],
      product: [
        'Review all product-related feedback',
        'Prioritize bug fixes based on impact',
        'Communicate with affected customers',
        'Schedule product review meeting'
      ],
      supply_chain: [
        'Review supplier performance metrics',
        'Identify alternative suppliers',
        'Assess inventory levels',
        'Update supply chain risk mitigation plan'
      ],
      reputation: [
        'Monitor social media and review sites',
        'Respond promptly to customer feedback',
        'Engage communications team if needed',
        'Document response actions taken'
      ]
    };
    return actions[category];
  }
}
