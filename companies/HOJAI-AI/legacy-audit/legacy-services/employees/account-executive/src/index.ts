/**
 * Account Executive (AE)
 * Port: 4802
 *
 * Role: Closing deals, negotiations, contract management
 * Persona: Consultative, consultative seller, value-focused
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4802;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// KPI Metrics
const kpiMetrics = {
  dealsWon: 0,
  dealsLost: 0,
  pipelineValue: 0,
  avgDealSize: 0,
  winRate: 0,
  avgSalesCycle: 0,
  quotaAttainment: 0,
  upsellRate: 0
};

// Types
interface Deal {
  id: string;
  prospectName: string;
  company: string;
  value: number;
  stage: 'qualified' | 'discovery' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expectedClose: Date;
  products: string[];
  competitors?: string[];
  decisionMakers: string[];
  lastActivity?: Date;
  nextSteps?: string;
}

interface NegotiationContext {
  dealId: string;
  askingPrice: number;
  targetPrice: number;
  floorPrice: number;
  competitorOffers?: string[];
  buyerPower: 'high' | 'medium' | 'low';
  urgency: 'high' | 'medium' | 'low';
}

interface PricingTier {
  name: string;
  price: number;
  features: string[];
  targetSegment: string;
}

// Value proposition builder
function buildValueProposition(deal: Deal): string {
  const industryValueProps: Record<string, { pain: string[], value: string[] }> = {
    'SaaS': {
      pain: ['Scaling challenges', 'Tech debt', 'Integration issues'],
      value: ['30% faster deployment', '2x team productivity', 'Zero vendor lock-in']
    },
    'FinTech': {
      pain: ['Compliance complexity', 'Security concerns', 'Legacy systems'],
      value: ['Bank-grade security', 'Regulatory automation', '50% cost savings']
    },
    'Healthcare': {
      pain: ['Patient experience', 'Data silos', 'HIPAA compliance'],
      value: ['Better outcomes', 'Seamless integration', 'Full compliance']
    },
    'E-commerce': {
      pain: ['Cart abandonment', 'Customer churn', 'Inventory management'],
      value: ['25% reduction in churn', '40% increase in LTV', 'Real-time sync']
    }
  };

  const props = industryValueProps[deal.products[0] || 'SaaS'] || industryValueProps['SaaS'];

  return `
BUSINESS CASE FOR ${deal.prospectName}
=====================================

Current Challenges:
${props.pain.map(p => `• ${p}`).join('\n')}

Our Solution Delivers:
${props.value.map(v => `• ${v}`).join('\n')}

ROI Summary:
• Implementation: 4-6 weeks
• Break-even: 6-8 months
• 3-Year ROI: 340%
• NPV: ₹${Math.round(deal.value * 3.4).toLocaleString()}
`;
}

// Calculate deal probability based on stage and factors
function calculateProbability(deal: Partial<Deal>): number {
  const stageProbabilities: Record<string, number> = {
    'qualified': 20,
    'discovery': 35,
    'proposal': 55,
    'negotiation': 75,
    'closed_won': 100,
    'closed_lost': 0
  };

  let prob = stageProbabilities[deal.stage || 'qualified'] || 20;

  // Adjust for deal size (larger deals = lower probability)
  if (deal.value && deal.value > 5000000) prob *= 0.85;
  else if (deal.value && deal.value > 2000000) prob *= 0.92;

  // Adjust for number of decision makers
  if (deal.decisionMakers && deal.decisionMakers.length > 3) prob *= 0.9;

  return Math.round(prob);
}

// Handle objections
function handleObjection(objection: string, context: { deal: Deal, stage: string }): {
  response: string,
  nextSteps: string[]
} {
  const objectionHandlers: Record<string, { acknowledge: string, pivot: string, value: string, proof: string }> = {
    'too_expensive': {
      acknowledge: "I understand budget is a concern, and I appreciate you being upfront about it.",
      pivot: "Let me ask - if we could demonstrate a clear ROI that pays for itself in under 6 months, would price still be the main blocker?",
      value: "We've helped similar companies save 40% on operational costs while doubling their output.",
      proof: "Company X saved ₹45 lakhs in year 1 with our solution."
    },
    'no_budget': {
      acknowledge: "Budget constraints are real, especially in this environment.",
      pivot: "What if we structured this so the solution pays for itself? Would that help unblock the decision?",
      value: "Our flexible payment options mean no upfront capital required.",
      proof: "80% of our customers use our 0% EMI option."
    },
    'need_to_think': {
      acknowledge: "Absolutely, this is a significant decision.",
      pivot: "What specific aspects do you want to think through?",
      value: "I want to make sure you're comfortable with every part of this.",
      proof: "Let me address each concern specifically so you have all the information."
    },
    'going_with_competitor': {
      acknowledge: "I appreciate you sharing that. It sounds like you've done your research.",
      pivot: "Before you finalize, what would it take for us to be your preferred choice?",
      value: "Our implementation speed and ongoing support are unmatched.",
      proof: "We go live in 4 weeks, competitors take 12+ weeks typically."
    },
    'no_authority': {
      acknowledge: "I understand you need to involve others in this decision.",
      pivot: "Who else should be part of this conversation?",
      value: "I'd love to make the case directly to the decision-makers.",
      proof: "Can we schedule a meeting with all stakeholders?"
    },
    'bad_timing': {
      acknowledge: "Timing is everything, and I respect that.",
      pivot: "When would be a better time to reconnect?",
      value: "Actually, many of our customers felt the same way, and they wished they'd started sooner.",
      proof: "Average customer sees value within the first 30 days."
    }
  };

  const handler = objectionHandlers[objection] || {
    acknowledge: "I hear you.",
    pivot: "Let me understand your concern better.",
    value: "Here's how we can help.",
    proof: "Let me provide more details."
  };

  return {
    response: `${handler.acknowledge} ${handler.pivot} ${handler.value} ${handler.proof}`,
    nextSteps: [
      'Schedule follow-up within 24 hours',
      'Send supporting documentation',
      'Get executive sponsor involved if needed'
    ]
  };
}

// Pricing strategy
function calculateOptimalPrice(context: NegotiationContext): {
  recommendedPrice: number,
  discount: number,
  justification: string,
  alternatives: { tier: string, price: number, savings: number }[]
} {
  const basePrice = context.askingPrice;
  let recommendedPrice = context.targetPrice;
  let discount = ((basePrice - recommendedPrice) / basePrice) * 100;

  // Adjust based on buyer power and urgency
  if (context.buyerPower === 'high' && context.urgency === 'low') {
    recommendedPrice *= 0.9;
    discount = ((basePrice - recommendedPrice) / basePrice) * 100;
  }

  if (context.urgency === 'high' && context.buyerPower === 'low') {
    recommendedPrice = basePrice; // Premium for urgency
  }

  // Competitor undercutting
  if (context.competitorOffers && context.competitorOffers.length > 0) {
    const competitorAvg = context.competitorOffers.reduce((a, b) => a + b, 0) / context.competitorOffers.length;
    if (competitorAvg < context.targetPrice * 0.85) {
      recommendedPrice = competitorAvg * 1.05; // Slightly undercut competitors
    }
  }

  return {
    recommendedPrice: Math.round(recommendedPrice),
    discount: Math.round(discount),
    justification: discount > 15
      ? "Large enterprise deal, strategic account"
      : discount > 10
        ? "Standard volume discount"
        : "Minimal discount, value-based positioning",
    alternatives: [
      { tier: 'Standard', price: basePrice, savings: 0 },
      { tier: 'Professional', price: recommendedPrice, savings: Math.round(basePrice - recommendedPrice) },
      { tier: 'Essential', price: recommendedPrice * 0.7, savings: Math.round(basePrice - recommendedPrice * 0.7) }
    ]
  };
}

// Deal creation
app.post('/api/deals/create', (req: Request, res: Response) => {
  const { prospect, company, value, products, source } = req.body;

  const deal: Deal = {
    id: `deal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    prospectName: prospect,
    company,
    value,
    stage: 'qualified',
    probability: 20,
    expectedClose: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    products: products || [],
    decisionMakers: [],
    createdAt: new Date().toISOString()
  };

  kpiMetrics.pipelineValue += value;

  res.json({
    deal,
    nextSteps: [
      'Schedule discovery call',
      'Identify decision makers',
      'Create account plan',
      'Set up deal tracking'
    ],
    tips: {
      discovery: 'Focus on business outcomes, not features',
      qualification: 'Use MEDDIC framework (Metrics, Economic, Decision, Process, Identify, Champion)'
    }
  });
});

// Deal stage progression
app.post('/api/deals/stage', (req: Request, res: Response) => {
  const { dealId, newStage, activities, notes } = req.body;

  const deal = {
    id: dealId,
    previousStage: 'proposal',
    newStage,
    probability: calculateProbability({ stage: newStage } as Deal),
    stageDuration: activities?.length || 1,
    notes,
    updatedAt: new Date().toISOString()
  };

  const stageActivities: Record<string, string[]> = {
    'discovery': ['Initial call', 'Stakeholder interview', 'Technical assessment', 'Demo'],
    'proposal': ['Technical requirements', 'Pricing discussion', 'Legal review', 'Security review'],
    'negotiation': ['Commercial terms', 'Contract drafting', 'Stakeholder alignment', 'Final approval'],
    'closed_won': ['Contract signed', 'Onboarding scheduled', 'Implementation kickoff'],
    'closed_lost': ['Loss analysis', 'Competitor feedback', 'Follow-up scheduled']
  };

  res.json({
    deal,
    requiredActivities: stageActivities[newStage] || [],
    estimatedDaysInStage: { discovery: 14, proposal: 21, negotiation: 14 }[newStage] || 7,
    probabilityChange: newStage === 'closed_won' ? '+25%' : newStage === 'closed_lost' ? '-100%' : 'Based on deal factors'
  });
});

// Generate proposal
app.post('/api/deals/proposal', (req: Request, res: Response) => {
  const { deal, products, terms, discount } = req.body;

  const proposal = {
    proposalId: `prop-${Date.now()}`,
    dealId: deal.id,
    prospect: deal.prospectName,
    company: deal.company,
    value: deal.value,
    discountedValue: deal.value * (1 - (discount || 0) / 100),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    sections: [
      {
        title: 'Executive Summary',
        content: buildValueProposition(deal)
      },
      {
        title: 'Proposed Solution',
        items: products.map((p: string) => ({
          name: p,
          description: `Full ${p} platform access`,
          quantity: 1,
          unitPrice: deal.value / products.length,
          total: deal.value / products.length
        }))
      },
      {
        title: 'Commercial Terms',
        items: [
          { item: 'Contract Duration', value: terms?.duration || '12 months' },
          { item: 'Payment Terms', value: terms?.payment || 'Net 30' },
          { item: 'Implementation', value: terms?.implementation || 'Included' },
          { item: 'Support', value: terms?.support || '24/7 Premium' }
        ]
      },
      {
        title: 'Pricing',
        breakdown: [
          { item: 'List Price', amount: deal.value },
          { item: 'Volume Discount', amount: -deal.value * (discount || 0) / 100 },
          { item: 'Net Price', amount: deal.value * (1 - (discount || 0) / 100) }
        ]
      },
      {
        title: 'Next Steps',
        items: [
          '1. Review proposal with stakeholders',
          '2. Schedule technical deep-dive',
          '3. Finalize contract terms',
          '4. Sign and implement'
        ]
      }
    ]
  };

  res.json({
    proposal,
    preview: `Proposal for ${deal.company} - ₹${deal.value.toLocaleString()}`,
    expectedCloseRate: deal.value > 2000000 ? '35%' : '55%'
  });
});

// Negotiation support
app.post('/api/negotiate', (req: Request, res: Response) => {
  const context = req.body as NegotiationContext;

  const negotiation = calculateOptimalPrice(context);
  const leveragePoints = [];

  if (context.buyerPower === 'low') {
    leveragePoints.push('Limited alternatives', 'Strong fit with requirements', 'Urgency on their side');
  }

  if (context.urgency === 'high') {
    leveragePoints.push('Time-sensitive opportunity', 'Preferred delivery slot', 'Current promotion');
  }

  res.json({
    negotiation,
    leveragePoints,
    concessionStrategy: [
      { round: 1, offer: context.askingPrice * 0.95, condition: 'If they commit to annual' },
      { round: 2, offer: context.targetPrice, condition: 'Standard discount' },
      { round: 3, offer: context.floorPrice, condition: 'Only if deal is at risk' }
    ],
    walkAwayTriggers: [
      'Price below floor',
      'Payment terms > Net 60',
      'Liability clauses above standard'
    ]
  });
});

// Handle objection
app.post('/api/objection', (req: Request, res: Response) => {
  const { objection, deal, stage } = req.body;

  const handling = handleObjection(objection, { deal, stage });

  res.json({
    handling,
    additionalResources: {
      caseStudies: ['Company X success story', 'ROI calculator'],
      objections: {
        'too_expensive': 'ROI_Analysis_Template.pdf',
        'no_budget': 'TCO_Comparison_Sheet.xlsx',
        'need_to_think': 'Decision_Maker_Guide.pdf'
      }
    }
  });
});

// Close deal
app.post('/api/deals/close', (req: Request, res: Response) => {
  const { dealId, outcome, reason, finalValue } = req.body;

  if (outcome === 'won') {
    kpiMetrics.dealsWon++;
    kpiMetrics.pipelineValue -= finalValue;

    res.json({
      dealId,
      outcome: 'won',
      metrics: {
        dealValue: finalValue,
        timeToClose: '45 days',
        discountGiven: '12%',
        competitorsLostTo: ['Competitor A']
      },
      celebration: {
        message: 'Congratulations! Deal closed successfully.',
        nextActions: [
          'Send welcome email',
          'Schedule onboarding call',
          'Create success story opportunity',
          'Setup QBR calendar'
        ]
      }
    });
  } else {
    kpiMetrics.dealsLost++;
    kpiMetrics.pipelineValue -= finalValue;

    res.json({
      dealId,
      outcome: 'lost',
      analysis: {
        primaryReason: reason,
        learningPoints: [
          'Competitive positioning needs improvement',
          'Value prop not communicated effectively',
          'Price vs value perception gap'
        ],
        recoveryOptions: [
          'Re-engage in 6 months',
          'Offer pilot program',
          'Build case study from their feedback'
        ]
      }
    });
  }
});

// Forecast pipeline
app.get('/api/forecast', (req: Request, res: Response) => {
  const monthlyQuota = 5000000;
  const expectedDeals = [
    { value: 2500000, probability: 0.75, closeDate: '2026-06-15' },
    { value: 1500000, probability: 0.60, closeDate: '2026-06-20' },
    { value: 3000000, probability: 0.40, closeDate: '2026-06-30' }
  ];

  const bestCase = expectedDeals.reduce((sum, d) => sum + d.value, 0);
  const expectedValue = expectedDeals.reduce((sum, d) => sum + d.value * d.probability, 0);

  res.json({
    quota: monthlyQuota,
    pipeline: {
      bestCase,
      expectedCase: expectedValue,
      worstCase: expectedValue * 0.5
    },
    deals: expectedDeals,
    confidence: expectedValue / monthlyQuota > 0.9 ? 'High' : 'Medium',
    gapAnalysis: {
      amount: monthlyQuota - expectedValue,
      percentage: ((monthlyQuota - expectedValue) / monthlyQuota * 100).toFixed(1) + '%'
    },
    recommendations: expectedValue < monthlyQuota ? [
      'Push high-probability deals to close faster',
      'Add 2 more qualified opportunities',
      'Request marketing support for top accounts'
    ] : [
      'On track for quota',
      'Focus on deal quality over quantity',
      'Document win strategies'
    ]
  });
});

// AE Dashboard / KPIs
app.get('/api/kpis', (req: Request, res: Response) => {
  const totalDeals = kpiMetrics.dealsWon + kpiMetrics.dealsLost;
  const winRate = totalDeals > 0 ? (kpiMetrics.dealsWon / totalDeals * 100).toFixed(1) : 0;

  res.json({
    metrics: {
      dealsWon: kpiMetrics.dealsWon,
      dealsLost: kpiMetrics.dealsLost,
      winRate: winRate + '%',
      pipelineValue: kpiMetrics.pipelineValue,
      avgDealSize: kpiMetrics.avgDealSize || 250000,
      avgSalesCycle: '45 days',
      quotaAttainment: ((kpiMetrics.pipelineValue / 5000000) * 100).toFixed(1) + '%',
      quotaTarget: 5000000
    },
    benchmarks: {
      winRate: '35%',
      avgDealSize: '₹2,50,000',
      salesCycle: '45-60 days'
    },
    topPerformers: [
      { name: 'You', metric: 'Win Rate', value: winRate + '%' }
    ]
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'account-executive',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Account Executive running on port ${PORT}`);
  console.log('Role: Deal closing, negotiations, contract management');
});

export default app;
