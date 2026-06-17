import { v4 as uuidv4 } from 'uuid';
import { ExecutiveInsight } from '../types';

/**
 * Generate executive insights from metrics, risks, and opportunities
 */
export async function generateInsights(
  metrics: any[],
  risks: any[],
  opportunities: any[]
): Promise<ExecutiveInsight[]> {
  const insights: ExecutiveInsight[] = [];

  // Generate trend insights
  insights.push(...generateTrendInsights(metrics));

  // Generate pattern insights
  insights.push(...generatePatternInsights(metrics));

  // Generate anomaly insights
  insights.push(...generateAnomalyInsights(metrics));

  // Generate correlation insights
  insights.push(...generateCorrelationInsights(metrics));

  // Generate prediction insights
  insights.push(...generatePredictionInsights(metrics, risks, opportunities));

  // Generate strategic insights
  insights.push(...generateStrategicInsights(metrics, risks, opportunities));

  // Sort by significance
  const significanceOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => significanceOrder[a.significance] - significanceOrder[b.significance]);

  return insights.slice(0, 10); // Return top 10 insights
}

/**
 * Generate trend-based insights
 */
function generateTrendInsights(metrics: any[]): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];

  // Analyze revenue trend
  const revenue = metrics.find(m => m.name === 'Revenue');
  if (revenue) {
    if (revenue.changePercent > 5) {
      insights.push({
        id: uuidv4(),
        type: 'trend',
        title: 'Strong Revenue Growth',
        description: `Revenue showing ${revenue.changePercent.toFixed(1)}% growth, indicating positive momentum. This trend should be sustained through continued investment in proven growth channels.`,
        data: { metric: 'Revenue', value: revenue.value, change: revenue.changePercent },
        significance: 'high',
        businessImpact: 'Sustained growth trajectory supports expansion plans and improves investor confidence.',
        source: 'metrics-analysis',
        timestamp: new Date(),
        tags: ['revenue', 'growth', 'positive']
      });
    } else if (revenue.changePercent < -5) {
      insights.push({
        id: uuidv4(),
        type: 'trend',
        title: 'Revenue Decline Alert',
        description: `Revenue declining by ${Math.abs(revenue.changePercent).toFixed(1)}%. Immediate analysis required to identify root causes and implement corrective measures.`,
        data: { metric: 'Revenue', value: revenue.value, change: revenue.changePercent },
        significance: 'high',
        businessImpact: 'Declining revenue threatens business sustainability. Quick action needed.',
        source: 'metrics-analysis',
        timestamp: new Date(),
        tags: ['revenue', 'decline', 'warning']
      });
    }
  }

  // Analyze customer growth trend
  const customers = metrics.find(m => m.name === 'Customers');
  if (customers && customers.changePercent > 3) {
    insights.push({
      id: uuidv4(),
      type: 'trend',
      title: 'Accelerating Customer Acquisition',
      description: `Customer base growing at ${customers.changePercent.toFixed(1)}%. This growth momentum can be leveraged for revenue expansion through cross-selling.`,
      data: { metric: 'Customers', value: customers.value, change: customers.changePercent },
      significance: 'medium',
      businessImpact: 'Growing customer base provides foundation for revenue growth.',
      source: 'metrics-analysis',
      timestamp: new Date(),
      tags: ['customers', 'growth', 'positive']
    });
  }

  return insights;
}

/**
 * Generate pattern-based insights
 */
function generatePatternInsights(metrics: any[]): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];

  // Identify stable metrics
  const stableMetrics = metrics.filter(m => Math.abs(m.changePercent) < 2);
  if (stableMetrics.length > metrics.length / 2) {
    insights.push({
      id: uuidv4(),
      type: 'pattern',
      title: 'Business Stabilization',
      description: `${stableMetrics.length} metrics showing stable performance (change < 2%). This indicates business stabilization phase.`,
      data: { stableMetrics: stableMetrics.map(m => m.name) },
      significance: 'medium',
      businessImpact: 'Stable metrics suggest operational consistency. Good time to focus on strategic initiatives.',
      source: 'metrics-analysis',
      timestamp: new Date(),
      tags: ['stability', 'operations']
    });
  }

  // Identify improvement patterns
  const improvingMetrics = metrics.filter(m => m.changePercent > 0 && m.changePercent < 10);
  if (improvingMetrics.length >= 3) {
    insights.push({
      id: uuidv4(),
      type: 'pattern',
      title: 'Broad-Based Improvement',
      description: `${improvingMetrics.length} metrics showing consistent improvement. This positive trend suggests effective business execution.`,
      data: { improvingMetrics: improvingMetrics.map(m => m.name) },
      significance: 'high',
      businessImpact: 'Multiple improving metrics indicate systemic positive changes.',
      source: 'metrics-analysis',
      timestamp: new Date(),
      tags: ['improvement', 'positive', 'execution']
    });
  }

  return insights;
}

/**
 * Generate anomaly insights
 */
function generateAnomalyInsights(metrics: any[]): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];

  // Identify outliers
  const outliers = metrics.filter(m => Math.abs(m.changePercent) > 20);
  if (outliers.length > 0) {
    insights.push({
      id: uuidv4(),
      type: 'anomaly',
      title: 'Significant Metric Outliers',
      description: `${outliers.length} metrics showing unusual changes (>20%). These anomalies warrant investigation.`,
      data: { outliers: outliers.map(m => ({ name: m.name, change: m.changePercent })) },
      significance: 'high',
      businessImpact: 'Outlier metrics may indicate opportunities or issues requiring attention.',
      source: 'metrics-analysis',
      timestamp: new Date(),
      tags: ['anomaly', 'investigation']
    });
  }

  // Identify status anomalies
  const atRiskCount = metrics.filter(m => m.status === 'at-risk' || m.status === 'off-track').length;
  if (atRiskCount > 2) {
    insights.push({
      id: uuidv4(),
      type: 'anomaly',
      title: 'Multiple Metrics At Risk',
      description: `${atRiskCount} metrics are currently at-risk or off-track. This cluster of underperformance suggests systemic issues.`,
      data: { atRiskMetrics: atRiskCount },
      significance: 'high',
      businessImpact: 'Multiple at-risk metrics indicate need for comprehensive performance review.',
      source: 'metrics-analysis',
      timestamp: new Date(),
      tags: ['risk', 'performance', 'warning']
    });
  }

  return insights;
}

/**
 * Generate correlation insights
 */
function generateCorrelationInsights(metrics: any[]): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];

  // Revenue-Conversion correlation
  const revenue = metrics.find(m => m.name === 'Revenue');
  const conversion = metrics.find(m => m.name === 'Conversion Rate');

  if (revenue && conversion) {
    if (revenue.changePercent > 0 && conversion.changePercent > 0) {
      insights.push({
        id: uuidv4(),
        type: 'correlation',
        title: 'Revenue-Conversion Alignment',
        description: 'Revenue and conversion rates moving together positively. This healthy correlation suggests sustainable growth.',
        data: { revenueChange: revenue.changePercent, conversionChange: conversion.changePercent },
        significance: 'medium',
        businessImpact: 'Healthy revenue growth driven by improved conversion is sustainable.',
        source: 'metrics-analysis',
        timestamp: new Date(),
        tags: ['correlation', 'growth', 'sustainable']
      });
    }
  }

  // AOV and Revenue correlation
  const aov = metrics.find(m => m.name === 'Average Order Value');
  if (revenue && aov) {
    if (aov.changePercent > revenue.changePercent) {
      insights.push({
        id: uuidv4(),
        type: 'correlation',
        title: 'Value Over Volume Growth',
        description: `AOV growing faster (${aov.changePercent.toFixed(1)}%) than revenue (${revenue.changePercent.toFixed(1)}%). Customers are spending more per transaction.`,
        data: { revenueChange: revenue.changePercent, aovChange: aov.changePercent },
        significance: 'medium',
        businessImpact: 'Higher AOV improves efficiency and profitability without requiring more transactions.',
        source: 'metrics-analysis',
        timestamp: new Date(),
        tags: ['correlation', 'aov', 'profitability']
      });
    }
  }

  return insights;
}

/**
 * Generate prediction insights
 */
function generatePredictionInsights(
  metrics: any[],
  risks: any[],
  opportunities: any[]
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];

  // Predict based on current trajectory
  const revenue = metrics.find(m => m.name === 'Revenue');
  if (revenue) {
    const projectedMonthly = revenue.value * 30;
    const targetMonthly = revenue.target ? revenue.target * 30 : projectedMonthly * 1.1;

    if (projectedMonthly >= targetMonthly) {
      insights.push({
        id: uuidv4(),
        type: 'prediction',
        title: 'On Track to Meet Target',
        description: `Current trajectory projects monthly revenue of $${projectedMonthly.toLocaleString()}, meeting or exceeding target.`,
        data: { currentDaily: revenue.value, projectedMonthly, targetMonthly },
        significance: 'medium',
        businessImpact: 'Positive trajectory allows focus on optimization rather than recovery.',
        source: 'projection',
        timestamp: new Date(),
        tags: ['prediction', 'target', 'positive']
      });
    } else {
      insights.push({
        id: uuidv4(),
        type: 'prediction',
        title: 'Risk of Missing Target',
        description: `Current trajectory projects monthly revenue of $${projectedMonthly.toLocaleString()}, below target of $${targetMonthly.toLocaleString()}. Gap: $${(targetMonthly - projectedMonthly).toLocaleString()}`,
        data: { currentDaily: revenue.value, projectedMonthly, targetMonthly, gap: targetMonthly - projectedMonthly },
        significance: 'high',
        businessImpact: 'Projected shortfall requires intervention to close gap.',
        source: 'projection',
        timestamp: new Date(),
        tags: ['prediction', 'target', 'risk']
      });
    }
  }

  // Opportunity capture prediction
  const highOpportunities = opportunities.filter(o => o.potential === 'high');
  if (highOpportunities.length > 0) {
    const totalValue = highOpportunities.reduce((sum, o) => sum + (o.estimatedValue || 0), 0);
    insights.push({
      id: uuidv4(),
      type: 'prediction',
      title: 'High-Potential Opportunity Pipeline',
      description: `${highOpportunities.length} high-potential opportunities identified with estimated total value of $${totalValue.toLocaleString()}.`,
      data: { count: highOpportunities.length, totalValue },
      significance: 'medium',
      businessImpact: 'Strong opportunity pipeline supports future growth plans.',
      source: 'opportunity-analysis',
      timestamp: new Date(),
      tags: ['prediction', 'opportunities', 'growth']
    });
  }

  return insights;
}

/**
 * Generate strategic insights
 */
function generateStrategicInsights(
  metrics: any[],
  risks: any[],
  opportunities: any[]
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];

  // Risk-Opportunity Balance
  if (risks.length > 0 && opportunities.length > 0) {
    const criticalRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high');
    const highOpportunities = opportunities.filter(o => o.potential === 'high');

    if (criticalRisks.length > highOpportunities.length) {
      insights.push({
        id: uuidv4(),
        type: 'pattern',
        title: 'Risk-Opportunity Imbalance',
        description: 'Current landscape shows more critical risks than high-potential opportunities. Strategic caution advised.',
        data: { criticalRisks: criticalRisks.length, highOpportunities: highOpportunities.length },
        significance: 'high',
        businessImpact: 'Risk-focused period requires careful resource allocation and prioritization.',
        source: 'strategic-analysis',
        timestamp: new Date(),
        tags: ['strategic', 'risk', 'balance']
      });
    } else {
      insights.push({
        id: uuidv4(),
        type: 'pattern',
        title: 'Favorable Risk-Opportunity Balance',
        description: 'Strong opportunity pipeline with manageable risk levels. Good environment for growth initiatives.',
        data: { criticalRisks: criticalRisks.length, highOpportunities: highOpportunities.length },
        significance: 'medium',
        businessImpact: 'Favorable conditions support aggressive growth strategies.',
        source: 'strategic-analysis',
        timestamp: new Date(),
        tags: ['strategic', 'opportunities', 'growth']
      });
    }
  }

  // Competitive positioning
  insights.push({
    id: uuidv4(),
    type: 'trend',
    title: 'Market Position Strength',
    description: 'Business showing stable or improving position in key metrics. Competitive advantages being maintained.',
    data: { overallHealth: 'positive' },
    significance: 'medium',
    businessImpact: 'Strong market position provides foundation for continued growth.',
    source: 'competitive-analysis',
    timestamp: new Date(),
    tags: ['strategic', 'competitive', 'position']
  });

  // Growth readiness
  const readinessScore = calculateReadinessScore(metrics);
  insights.push({
    id: uuidv4(),
    type: 'prediction',
    title: 'Growth Readiness Assessment',
    description: `Business readiness score: ${readinessScore}/100. ${readinessScore >= 70 ? 'Ready for accelerated growth.' : 'Some preparation needed before scaling.'}`,
    data: { score: readinessScore },
    significance: readinessScore >= 70 ? 'low' : 'medium',
    businessImpact: readinessScore >= 70
      ? 'Business well-positioned for growth investments.'
      : 'Infrastructure and processes may need strengthening before major expansion.',
    source: 'readiness-assessment',
    timestamp: new Date(),
    tags: ['strategic', 'readiness', 'growth']
  });

  return insights;
}

/**
 * Calculate overall business readiness score
 */
function calculateReadinessScore(metrics: any[]): number {
  if (metrics.length === 0) return 50;

  let score = 0;

  for (const metric of metrics) {
    // Revenue contribution
    if (metric.name === 'Revenue' && metric.changePercent > 0) {
      score += 20;
    }

    // Customer growth contribution
    if (metric.name === 'Customers' && metric.changePercent > 0) {
      score += 15;
    }

    // Efficiency contribution
    if (metric.name === 'Conversion Rate' && metric.status !== 'at-risk') {
      score += 15;
    }

    // Profitability contribution
    if (metric.name === 'Average Order Value' && metric.changePercent > 0) {
      score += 15;
    }

    // Efficiency contribution
    if (metric.name === 'Customer Acquisition Cost' && metric.changePercent < 0) {
      score += 15;
    }

    // Stability contribution
    if (metric.status !== 'off-track') {
      score += 20;
    }
  }

  return Math.min(100, score);
}
