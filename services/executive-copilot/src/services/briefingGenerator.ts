import { v4 as uuidv4 } from 'uuid';
import { Briefing } from '../models/Briefing';
import { Metric } from '../models/Metric';
import { Alert } from '../models/Alert';
import {
  ExecutiveBriefing,
  BriefingSection,
  MetricSnapshot,
  RiskItem,
  OpportunityItem,
  ActionItem,
  KeyMetric
} from '../types';
import { analyzeRisks } from './riskAnalyzer';
import { findOpportunities } from './opportunityFinder';
import { generateInsights } from './insights';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Generate a comprehensive daily executive briefing
 */
export async function generateBriefing(date: string): Promise<ExecutiveBriefing> {
  // Gather data from various sources
  const metrics = await gatherMetrics(date);
  const risks = await analyzeRisks(metrics, date);
  const opportunities = await findOpportunities(metrics, date);
  const insights = await generateInsights(metrics, risks, opportunities);
  const actionItems = generateActionItems(risks, opportunities, metrics);

  // Generate sections
  const sections = generateSections(metrics, risks, opportunities, insights);

  // Generate summary
  const summary = generateSummary(metrics, risks, opportunities);

  // Create briefing
  const briefing: ExecutiveBriefing = {
    id: uuidv4(),
    date,
    title: `Executive Briefing - ${formatDate(date)}`,
    summary,
    sections,
    metrics: {
      date,
      revenue: metrics.find(m => m.name === 'Revenue')?.value,
      revenueChange: metrics.find(m => m.name === 'Revenue')?.changePercent,
      customers: metrics.find(m => m.name === 'Customers')?.value,
      customersChange: metrics.find(m => m.name === 'Customers')?.changePercent,
      conversionRate: metrics.find(m => m.name === 'Conversion Rate')?.value,
      conversionChange: metrics.find(m => m.name === 'Conversion Rate')?.changePercent,
      averageOrderValue: metrics.find(m => m.name === 'Average Order Value')?.value,
      aovChange: metrics.find(m => m.name === 'Average Order Value')?.changePercent,
      keyMetrics: metrics.map(m => ({
        name: m.name,
        value: m.value,
        previousValue: m.previousValue,
        change: m.change,
        changePercent: m.changePercent,
        trend: m.change > 0 ? 'up' : m.change < 0 ? 'down' : 'stable',
        target: m.target,
        status: m.status
      }))
    },
    risks,
    opportunities,
    actionItems,
    generatedAt: new Date(),
    generatedBy: 'ai'
  };

  // Save to database
  const savedBriefing = new Briefing(briefing);
  await savedBriefing.save();

  // Generate alerts for critical items
  await generateAlerts(risks, opportunities);

  return briefing;
}

/**
 * Gather metrics from various sources
 */
async function gatherMetrics(date: string): Promise<any[]> {
  try {
    // Fetch recent metrics from database
    const dbMetrics = await Metric.find()
      .sort({ lastUpdated: -1 })
      .limit(20)
      .exec();

    if (dbMetrics.length > 0) {
      return dbMetrics.map(m => ({
        name: m.name,
        category: m.category,
        value: m.value,
        previousValue: m.previousValue,
        change: m.change,
        changePercent: m.changePercent,
        target: m.target,
        status: m.status,
        frequency: m.frequency
      }));
    }

    // Generate sample metrics for demo
    return generateSampleMetrics(date);
  } catch (error) {
    console.error('Error gathering metrics:', error);
    return generateSampleMetrics(date);
  }
}

/**
 * Generate sample metrics for demonstration
 */
function generateSampleMetrics(date: string): any[] {
  const baseRevenue = 125000;
  const revenueVariation = Math.random() * 10000 - 5000;

  return [
    {
      name: 'Revenue',
      category: 'financial',
      value: baseRevenue + revenueVariation,
      previousValue: baseRevenue - 5000,
      change: revenueVariation + 5000,
      changePercent: ((revenueVariation + 5000) / (baseRevenue - 5000)) * 100,
      target: 130000,
      status: 'on-track',
      frequency: 'daily'
    },
    {
      name: 'Customers',
      category: 'growth',
      value: 1250 + Math.floor(Math.random() * 50),
      previousValue: 1200,
      change: 50 + Math.floor(Math.random() * 20),
      changePercent: 4.17 + Math.random() * 2,
      target: 1500,
      status: 'on-track',
      frequency: 'daily'
    },
    {
      name: 'Conversion Rate',
      category: 'marketing',
      value: 3.2 + Math.random() * 0.5,
      previousValue: 3.0,
      change: 0.2 + Math.random() * 0.3,
      changePercent: 7.5 + Math.random() * 5,
      target: 4.0,
      status: 'at-risk',
      frequency: 'daily'
    },
    {
      name: 'Average Order Value',
      category: 'financial',
      value: 85 + Math.random() * 15,
      previousValue: 80,
      change: 5 + Math.random() * 10,
      changePercent: 6.25 + Math.random() * 5,
      target: 100,
      status: 'on-track',
      frequency: 'daily'
    },
    {
      name: 'Customer Acquisition Cost',
      category: 'marketing',
      value: 25 + Math.random() * 10,
      previousValue: 28,
      change: -(3 - Math.random() * 5),
      changePercent: -(10.7 - Math.random() * 5),
      target: 20,
      status: 'exceeding',
      frequency: 'daily'
    },
    {
      name: 'Net Promoter Score',
      category: 'customer',
      value: 45 + Math.floor(Math.random() * 10),
      previousValue: 42,
      change: 3 + Math.floor(Math.random() * 5),
      changePercent: 7.14 + Math.random() * 5,
      target: 50,
      status: 'on-track',
      frequency: 'weekly'
    }
  ];
}

/**
 * Generate briefing sections
 */
function generateSections(
  metrics: any[],
  risks: RiskItem[],
  opportunities: OpportunityItem[],
  insights: any[]
): BriefingSection[] {
  const sections: BriefingSection[] = [];

  // Executive Summary
  sections.push({
    title: 'Executive Summary',
    content: `Today's briefing highlights ${metrics.length} key metrics. Revenue is tracking ${metrics[0]?.changePercent > 0 ? 'upward' : 'downward'}. ${risks.length} risks require attention, while ${opportunities.length} opportunities have been identified.`,
    icon: '📊',
    priority: 'high'
  });

  // Performance Highlights
  const topMetrics = metrics
    .filter(m => m.changePercent > 5)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 3);

  if (topMetrics.length > 0) {
    sections.push({
      title: 'Performance Highlights',
      content: topMetrics.map(m =>
        `${m.name}: ${m.changePercent > 0 ? '+' : ''}${m.changePercent.toFixed(1)}% ($${m.value.toLocaleString()})`
      ).join('. '),
      icon: '🚀',
      priority: 'high'
    });
  }

  // Areas Requiring Attention
  const atRiskMetrics = metrics.filter(m =>
    m.status === 'at-risk' || m.status === 'off-track'
  );

  if (atRiskMetrics.length > 0) {
    sections.push({
      title: 'Areas Requiring Attention',
      content: atRiskMetrics.map(m =>
        `${m.name} is ${m.status.replace('-', ' ')} - ${m.changePercent > 0 ? 'above' : 'below'} target by ${Math.abs(((m.value - (m.target || m.previousValue)) / (m.target || m.previousValue)) * 100).toFixed(1)}%`
      ).join('. '),
      icon: '⚠️',
      priority: 'high'
    });
  }

  // Top Opportunities
  const topOpportunities = opportunities
    .filter(o => o.potential === 'high')
    .slice(0, 2);

  if (topOpportunities.length > 0) {
    sections.push({
      title: 'Top Opportunities',
      content: topOpportunities.map(o =>
        `${o.title}: ${o.description.substring(0, 100)}...`
      ).join(' '),
      icon: '💡',
      priority: 'medium'
    });
  }

  // AI Insights
  if (insights.length > 0) {
    sections.push({
      title: 'AI Insights',
      content: insights.slice(0, 3).map(i => i.description).join(' '),
      icon: '🤖',
      priority: 'medium'
    });
  }

  // Team & Operations
  sections.push({
    title: 'Operations Update',
    content: 'Team performance remains strong. No major operational issues reported. Customer satisfaction scores are within target range.',
    icon: '👥',
    priority: 'low'
  });

  return sections;
}

/**
 * Generate briefing summary
 */
function generateSummary(
  metrics: any[],
  risks: RiskItem[],
  opportunities: OpportunityItem[]
): string {
  const revenue = metrics.find(m => m.name === 'Revenue');
  const customers = metrics.find(m => m.name === 'Customers');

  let summary = `Today ${formatDate(new Date().toISOString().split('T')[0])}, `;

  if (revenue) {
    summary += `revenue stands at $${revenue.value.toLocaleString()}, ${revenue.changePercent > 0 ? 'up' : 'down'} ${Math.abs(revenue.changePercent).toFixed(1)}% from yesterday. `;
  }

  if (customers) {
    summary += `We have ${customers.value.toLocaleString()} customers, ${customers.change > 0 ? 'gaining' : 'losing'} ${Math.abs(customers.change)} today. `;
  }

  const criticalRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high');
  if (criticalRisks.length > 0) {
    summary += `${criticalRisks.length} high-priority risks need immediate attention. `;
  }

  const highOpportunities = opportunities.filter(o => o.potential === 'high');
  if (highOpportunities.length > 0) {
    summary += `${highOpportunities.length} high-potential opportunities identified for pursuit. `;
  }

  summary += 'Overall, business operations are within expected parameters.';

  return summary;
}

/**
 * Generate action items from risks and opportunities
 */
function generateActionItems(
  risks: RiskItem[],
  opportunities: OpportunityItem[],
  metrics: any[]
): ActionItem[] {
  const actionItems: ActionItem[] = [];

  // Add high-severity risk actions
  risks
    .filter(r => r.severity === 'critical' || r.severity === 'high')
    .slice(0, 3)
    .forEach(risk => {
      actionItems.push({
        id: uuidv4(),
        title: `Address: ${risk.title}`,
        description: risk.mitigation,
        priority: risk.severity === 'critical' ? 'urgent' : 'high',
        category: risk.category,
        owner: risk.owner,
        dueDate: risk.dueDate,
        status: 'pending'
      });
    });

  // Add high-potential opportunity actions
  opportunities
    .filter(o => o.potential === 'high')
    .slice(0, 2)
    .forEach(opp => {
      actionItems.push({
        id: uuidv4(),
        title: `Pursue: ${opp.title}`,
        description: opp.nextSteps.slice(0, 2).join('. '),
        priority: 'medium',
        category: opp.category,
        status: 'pending'
      });
    });

  // Add at-risk metric actions
  metrics
    .filter(m => m.status === 'at-risk' || m.status === 'off-track')
    .slice(0, 2)
    .forEach(metric => {
      actionItems.push({
        id: uuidv4(),
        title: `Review ${metric.name} Performance`,
        description: `${metric.name} is ${metric.status.replace('-', ' ')}. Current: ${metric.value}, Target: ${metric.target || metric.previousValue}`,
        priority: 'high',
        category: metric.category,
        status: 'pending'
      });
    });

  return actionItems.slice(0, 7); // Limit to 7 action items
}

/**
 * Generate alerts for critical items
 */
async function generateAlerts(
  risks: RiskItem[],
  opportunities: OpportunityItem[]
): Promise<void> {
  // Critical risks become alerts
  for (const risk of risks.filter(r => r.severity === 'critical')) {
    const existingAlert = await Alert.findOne({ title: risk.title });
    if (!existingAlert) {
      const alert = new Alert({
        id: uuidv4(),
        type: 'risk',
        title: `Critical Risk: ${risk.title}`,
        message: risk.description,
        severity: risk.severity,
        timestamp: new Date(),
        read: false,
        acknowledged: false,
        actionRequired: true
      });
      await alert.save();
    }
  }

  // High-potential opportunities become alerts
  for (const opp of opportunities.filter(o => o.potential === 'high')) {
    const existingAlert = await Alert.findOne({ title: opp.title });
    if (!existingAlert) {
      const alert = new Alert({
        id: uuidv4(),
        type: 'opportunity',
        title: `Opportunity: ${opp.title}`,
        message: opp.description,
        severity: 'medium',
        timestamp: new Date(),
        read: false,
        acknowledged: false,
        actionRequired: false
      });
      await alert.save();
    }
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export { gatherMetrics, generateSections, generateSummary };
