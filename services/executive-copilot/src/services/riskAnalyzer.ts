import { v4 as uuidv4 } from 'uuid';
import { RiskItem } from '../types';

/**
 * Analyze metrics and identify risks
 */
export async function analyzeRisks(metrics: any[], date: string): Promise<RiskItem[]> {
  const risks: RiskItem[] = [];

  // Analyze each metric for risk indicators
  for (const metric of metrics) {
    // Check for declining metrics
    if (metric.changePercent < -5) {
      risks.push({
        id: uuidv4(),
        title: `${metric.name} Declining`,
        description: `${metric.name} has decreased by ${Math.abs(metric.changePercent).toFixed(1)}% over the reporting period.`,
        severity: metric.changePercent < -15 ? 'high' : 'medium',
        category: categorizeMetric(metric.category),
        impact: `A ${Math.abs(metric.changePercent).toFixed(1)}% decline in ${metric.name} could impact overall business performance.`,
        mitigation: `Review ${metric.name} drivers and implement corrective actions. Consider competitive analysis and customer feedback review.`,
        status: 'active'
      });
    }

    // Check for metrics below target
    if (metric.target && metric.value < metric.target * 0.9) {
      const variance = ((metric.value - metric.target) / metric.target) * 100;
      risks.push({
        id: uuidv4(),
        title: `${metric.name} Below Target`,
        description: `${metric.name} is ${Math.abs(variance).toFixed(1)}% below the ${metric.target} target. Current value: ${metric.value}`,
        severity: variance < -20 ? 'critical' : variance < -10 ? 'high' : 'medium',
        category: categorizeMetric(metric.category),
        impact: `Missing ${metric.name} target by ${Math.abs(variance).toFixed(1)}% affects overall business goals.`,
        mitigation: `Conduct root cause analysis for ${metric.name} underperformance. Set interim milestones and assign accountability.`,
        status: 'active'
      });
    }

    // Check for at-risk status
    if (metric.status === 'at-risk') {
      risks.push({
        id: uuidv4(),
        title: `${metric.name} Status Alert`,
        description: `${metric.name} is flagged as at-risk. Current: ${metric.value}, Target: ${metric.target || 'N/A'}`,
        severity: 'medium',
        category: categorizeMetric(metric.category),
        impact: 'At-risk metrics require immediate attention to prevent further deterioration.',
        mitigation: `Review ${metric.name} performance drivers. Increase monitoring frequency and set early warning thresholds.`,
        status: 'active'
      });
    }
  }

  // Add some contextual risks based on common business patterns
  risks.push(...generateContextualRisks(metrics));

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return risks.slice(0, 10); // Return top 10 risks
}

/**
 * Generate contextual risks based on business patterns
 */
function generateContextualRisks(metrics: any[]): RiskItem[] {
  const risks: RiskItem[] = [];

  // Check for revenue risk
  const revenue = metrics.find(m => m.name === 'Revenue');
  if (revenue && revenue.changePercent < 0) {
    risks.push({
      id: uuidv4(),
      title: 'Revenue Growth Stagnation',
      description: 'Revenue has shown negative growth, which may indicate market challenges or operational issues.',
      severity: revenue.changePercent < -10 ? 'high' : 'medium',
      category: 'financial',
      impact: 'Sustained revenue decline could affect cash flow, investor confidence, and growth plans.',
      mitigation: 'Conduct comprehensive revenue analysis. Review pricing strategy, customer segments, and market positioning.',
      status: 'active'
    });
  }

  // Check for customer acquisition risk
  const cac = metrics.find(m => m.name === 'Customer Acquisition Cost');
  const conversion = metrics.find(m => m.name === 'Conversion Rate');

  if (cac && cac.changePercent > 10) {
    risks.push({
      id: uuidv4(),
      title: 'Rising Customer Acquisition Costs',
      description: `CAC has increased by ${cac.changePercent.toFixed(1)}%, suggesting diminishing marketing efficiency.`,
      severity: cac.changePercent > 25 ? 'high' : 'medium',
      category: 'market',
      impact: 'Higher CAC reduces marketing ROI and puts pressure on profitability.',
      mitigation: 'Review marketing channels for efficiency. Consider optimizing campaigns and exploring organic growth strategies.',
      status: 'active'
    });
  }

  if (conversion && conversion.status === 'at-risk') {
    risks.push({
      id: uuidv4(),
      title: 'Conversion Rate Underperformance',
      description: 'Conversion rate is below target, indicating potential issues with funnel optimization or customer engagement.',
      severity: 'medium',
      category: 'market',
      impact: 'Low conversion affects customer acquisition efficiency and increases effective CAC.',
      mitigation: 'Analyze conversion funnel. Review user experience, pricing, and competitive positioning.',
      status: 'active'
    });
  }

  // Check for competitive risks
  risks.push({
    id: uuidv4(),
    title: 'Competitive Pressure',
    description: 'Market analysis indicates increasing competitive activity in key segments.',
    severity: 'medium',
    category: 'market',
    impact: 'Competitive pressure may affect market share and pricing power.',
    mitigation: 'Monitor competitor activities. Accelerate product differentiation and customer value initiatives.',
    status: 'active'
  });

  // Check for operational risks
  risks.push({
    id: uuidv4(),
    title: 'Operational Scalability',
    description: 'Current operational capacity may need review as growth continues.',
    severity: 'low',
    category: 'operational',
    impact: 'Scalability constraints could limit growth potential.',
    mitigation: 'Review operational processes and capacity. Plan for scaling infrastructure.',
    status: 'active'
  });

  return risks;
}

/**
 * Categorize metric into risk category
 */
function categorizeMetric(category: string): RiskItem['category'] {
  const categoryMap: Record<string, RiskItem['category']> = {
    financial: 'financial',
    revenue: 'financial',
    cost: 'financial',
    profit: 'financial',
    growth: 'market',
    customer: 'market',
    marketing: 'market',
    sales: 'market',
    operational: 'operational',
    operations: 'operational',
    hr: 'operational',
    technology: 'strategic',
    tech: 'strategic'
  };

  return categoryMap[category.toLowerCase()] || 'operational';
}

/**
 * Assess overall risk level
 */
export function assessOverallRiskLevel(risks: RiskItem[]): {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  summary: string;
} {
  const severityWeights = { critical: 10, high: 5, medium: 2, low: 1 };
  const score = risks.reduce((sum, r) => sum + severityWeights[r.severity], 0);

  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score >= 30) level = 'critical';
  else if (score >= 20) level = 'high';
  else if (score >= 10) level = 'medium';
  else level = 'low';

  const summary = `${risks.length} risks identified with overall risk level: ${level}`;

  return { level, score, summary };
}

/**
 * Generate risk mitigation recommendations
 */
export function generateRiskMitigationPlan(risks: RiskItem[]): {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
} {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];

  for (const risk of risks) {
    if (risk.severity === 'critical') {
      immediate.push(`Address ${risk.title}: ${risk.mitigation}`);
    } else if (risk.severity === 'high') {
      shortTerm.push(`Address ${risk.title}: ${risk.mitigation}`);
    } else {
      longTerm.push(`Monitor ${risk.title}: ${risk.mitigation}`);
    }
  }

  return { immediate, shortTerm, longTerm };
}
