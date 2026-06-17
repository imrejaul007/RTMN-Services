import { v4 as uuidv4 } from 'uuid';
import { OpportunityItem } from '../types';

/**
 * Find opportunities based on metrics and trends
 */
export async function findOpportunities(metrics: any[], date: string): Promise<OpportunityItem[]> {
  const opportunities: OpportunityItem[] = [];

  // Analyze metrics for opportunities
  for (const metric of metrics) {
    // Check for outperforming metrics
    if (metric.changePercent > 10 && metric.status === 'exceeding') {
      opportunities.push({
        id: uuidv4(),
        title: `Scale ${metric.name}`,
        description: `${metric.name} is outperforming targets by ${metric.changePercent.toFixed(1)}%. This indicates strong product-market fit and growth potential.`,
        potential: 'high',
        category: 'growth',
        estimatedValue: calculateEstimatedValue(metric),
        timeline: '1-3 months',
        nextSteps: [
          'Analyze success factors',
          'Identify scaling requirements',
          'Develop growth plan',
          'Allocate additional resources'
        ],
        status: 'identified'
      });
    }

    // Check for improving metrics
    if (metric.changePercent > 0 && metric.changePercent < 10 && !metric.status?.includes('at-risk')) {
      opportunities.push({
        id: uuidv4(),
        title: `Optimize ${metric.name}`,
        description: `${metric.name} shows positive momentum with ${metric.changePercent.toFixed(1)}% growth. Room for further optimization exists.`,
        potential: 'medium',
        category: 'efficiency',
        estimatedValue: calculateEstimatedValue(metric) * 0.5,
        timeline: '2-4 weeks',
        nextSteps: [
          'Identify optimization levers',
          'Test improvements',
          'Scale successful changes'
        ],
        status: 'identified'
      });
    }

    // Check for metrics near target
    if (metric.target && metric.value >= metric.target * 0.9 && metric.value < metric.target) {
      opportunities.push({
        id: uuidv4(),
        title: `Achieve ${metric.name} Target`,
        description: `${metric.name} is within 10% of target. Focused effort could help achieve the goal.`,
        potential: 'medium',
        category: 'growth',
        estimatedValue: calculateEstimatedValue(metric) * 0.3,
        timeline: '2-4 weeks',
        nextSteps: [
          'Identify gap to target',
          'Develop acceleration plan',
          'Execute with focus'
        ],
        status: 'identified'
      });
    }
  }

  // Add contextual opportunities
  opportunities.push(...generateContextualOpportunities(metrics));

  // Sort by potential
  const potentialOrder = { high: 0, medium: 1, low: 2 };
  opportunities.sort((a, b) => potentialOrder[a.potential] - potentialOrder[b.potential]);

  return opportunities.slice(0, 8); // Return top 8 opportunities
}

/**
 * Generate contextual opportunities based on business patterns
 */
function generateContextualOpportunities(metrics: any[]): OpportunityItem[] {
  const opportunities: OpportunityItem[] = [];

  // Revenue opportunity
  const revenue = metrics.find(m => m.name === 'Revenue');
  if (revenue && revenue.changePercent > 5) {
    opportunities.push({
      id: uuidv4(),
      title: 'Revenue Growth Acceleration',
      description: 'Strong revenue momentum provides opportunity to accelerate growth through strategic investments.',
      potential: 'high',
      category: 'growth',
      estimatedValue: revenue.value * 0.2,
      timeline: '3-6 months',
      nextSteps: [
        'Identify growth drivers',
        'Allocate additional marketing budget',
        'Expand sales capacity',
        'Consider pricing optimization'
      ],
      status: 'identified'
    });
  }

  // Customer opportunity
  const customers = metrics.find(m => m.name === 'Customers');
  if (customers && customers.changePercent > 5) {
    opportunities.push({
      id: uuidv4(),
      title: 'Customer Base Expansion',
      description: `Customer base growing at ${customers.changePercent.toFixed(1)}% presents opportunities for revenue expansion.`,
      potential: 'high',
      category: 'growth',
      estimatedValue: customers.value * 50, // Assuming $50 average value per customer
      timeline: 'Ongoing',
      nextSteps: [
        'Analyze customer acquisition channels',
        'Optimize conversion funnel',
        'Implement referral program',
        'Develop loyalty initiatives'
      ],
      status: 'identified'
    });

    opportunities.push({
      id: uuidv4(),
      title: 'Cross-sell and Upsell',
      description: 'Growing customer base creates opportunities for revenue expansion through product extensions.',
      potential: 'medium',
      category: 'efficiency',
      estimatedValue: customers.value * 20,
      timeline: '1-2 months',
      nextSteps: [
        'Analyze customer preferences',
        'Develop complementary offerings',
        'Create targeted campaigns'
      ],
      status: 'identified'
    });
  }

  // Conversion opportunity
  const conversion = metrics.find(m => m.name === 'Conversion Rate');
  if (conversion && conversion.value < 5) {
    opportunities.push({
      id: uuidv4(),
      title: 'Conversion Rate Improvement',
      description: 'Low conversion rate represents significant opportunity for revenue growth with proper optimization.',
      potential: 'high',
      category: 'efficiency',
      estimatedValue: calculateEstimatedValue(conversion) * 2,
      timeline: '1-3 months',
      nextSteps: [
        'Analyze conversion funnel',
        'Identify drop-off points',
        'Implement A/B tests',
        'Optimize user experience'
      ],
      status: 'identified'
    });
  }

  // AOV opportunity
  const aov = metrics.find(m => m.name === 'Average Order Value');
  if (aov && aov.value < 100) {
    opportunities.push({
      id: uuidv4(),
      title: 'Increase Average Order Value',
      description: `Current AOV of $${aov.value.toFixed(0)} has room for improvement through bundling and upsells.`,
      potential: 'medium',
      category: 'efficiency',
      estimatedValue: calculateEstimatedValue(aov),
      timeline: '1-2 months',
      nextSteps: [
        'Analyze purchase patterns',
        'Create bundle offerings',
        'Implement minimum order incentives',
        'Train sales team on upselling'
      ],
      status: 'identified'
    });
  }

  // CAC efficiency
  const cac = metrics.find(m => m.name === 'Customer Acquisition Cost');
  if (cac && cac.changePercent < 0 && cac.value < 50) {
    opportunities.push({
      id: uuidv4(),
      title: 'Scale Customer Acquisition',
      description: `Efficient CAC ($${cac.value.toFixed(0)}) with declining trend enables scaled acquisition efforts.`,
      potential: 'high',
      category: 'growth',
      estimatedValue: cac.value * 100,
      timeline: 'Ongoing',
      nextSteps: [
        'Increase marketing budget',
        'Expand channel mix',
        'Test new acquisition channels',
        'Optimize underperforming channels'
      ],
      status: 'identified'
    });
  }

  // Market opportunities
  opportunities.push({
    id: uuidv4(),
    title: 'Market Expansion',
    description: 'Consider expanding into adjacent market segments or geographic areas.',
    potential: 'high',
    category: 'market',
    estimatedValue: 500000,
    timeline: '6-12 months',
    nextSteps: [
      'Conduct market research',
      'Identify target segments',
      'Develop market entry strategy',
      'Build local partnerships'
    ],
    status: 'identified'
  });

  // Partnership opportunity
  opportunities.push({
    id: uuidv4(),
    title: 'Strategic Partnership',
    description: 'Explore partnership opportunities with complementary businesses for mutual growth.',
    potential: 'medium',
    category: 'partnership',
    estimatedValue: 250000,
    timeline: '3-6 months',
    nextSteps: [
      'Identify potential partners',
      'Evaluate partnership models',
      'Develop partnership framework',
      'Initiate discussions'
    ],
    status: 'identified'
  });

  // Innovation opportunity
  opportunities.push({
    id: uuidv4(),
    title: 'Product Innovation',
    description: 'Invest in new product features or offerings to maintain competitive advantage.',
    potential: 'high',
    category: 'innovation',
    estimatedValue: 1000000,
    timeline: '6-12 months',
    nextSteps: [
      'Gather customer feedback',
      'Analyze market trends',
      'Prioritize feature roadmap',
      'Allocate development resources'
    ],
    status: 'identified'
  });

  return opportunities;
}

/**
 * Calculate estimated business value for an opportunity
 */
function calculateEstimatedValue(metric: any): number {
  if (!metric || !metric.value) return 0;

  // Base value calculation
  const baseValue = metric.value;

  // Adjust based on metric type
  switch (metric.name.toLowerCase()) {
    case 'revenue':
      return baseValue * 0.1; // 10% of current revenue
    case 'customers':
      return baseValue * 100; // $100 per customer
    case 'conversion rate':
      return baseValue * 10000; // Conversion impact
    case 'average order value':
      return baseValue * 100; // AOV impact
    default:
      return baseValue * 0.05; // Default 5%
  }
}

/**
 * Prioritize opportunities
 */
export function prioritizeOpportunities(opportunities: OpportunityItem[]): {
  quickWins: OpportunityItem[];
  strategic: OpportunityItem[];
  exploratory: OpportunityItem[];
} {
  const quickWins = opportunities.filter(o =>
    o.timeline.includes('week') || o.timeline.includes('1-2')
  );

  const strategic = opportunities.filter(o =>
    o.timeline.includes('month') && !o.timeline.includes('week')
  );

  const exploratory = opportunities.filter(o =>
    o.timeline.includes('6') || o.timeline.includes('12')
  );

  return { quickWins, strategic, exploratory };
}

/**
 * Calculate total opportunity value
 */
export function calculateTotalOpportunityValue(opportunities: OpportunityItem[]): {
  total: number;
  byCategory: Record<string, number>;
  byPotential: Record<string, number>;
} {
  const total = opportunities.reduce((sum, o) => sum + (o.estimatedValue || 0), 0);

  const byCategory: Record<string, number> = {};
  const byPotential: Record<string, number> = {};

  for (const opp of opportunities) {
    byCategory[opp.category] = (byCategory[opp.category] || 0) + (opp.estimatedValue || 0);
    byPotential[opp.potential] = (byPotential[opp.potential] || 0) + (opp.estimatedValue || 0);
  }

  return { total, byCategory, byPotential };
}
