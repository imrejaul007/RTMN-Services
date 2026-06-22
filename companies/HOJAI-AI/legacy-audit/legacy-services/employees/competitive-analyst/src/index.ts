/**
 * Competitive Analyst
 * Port: 4805
 *
 * Role: Track competitors, SWOT analysis, battle cards, market positioning
 * Persona: Research-driven, strategic thinker, market expert
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4805;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Competitor {
  id: string;
  name: string;
  website: string;
  founded: number;
  headquarters: string;
  funding: string;
  valuation?: string;
  employees: string;
  segments: string[];
  products: {
    name: string;
    pricing: { min: number; max: number; model: string };
    features: string[];
  }[];
  strengths: string[];
  weaknesses: string[];
  marketShare: number;
  growthRate: number;
  winRate: number;
  lastUpdated: Date;
}

interface BattleCard {
  competitorId: string;
  scenario: string;
  ourAdvantage: string;
  theirAdvantage: string;
  talkingPoints: string[];
  objectionResponses: { objection: string; response: string }[];
  proofPoints: string[];
  trapQuestions: string[];
}

interface SWOTAnalysis {
  strengths: { item: string; impact: 'high' | 'medium' | 'low' }[];
  weaknesses: { item: string; impact: 'high' | 'medium' | 'low' }[];
  opportunities: { item: string; impact: 'high' | 'medium' | 'low' }[];
  threats: { item: string; impact: 'high' | 'medium' | 'low' }[];
}

// Competitor database
const competitors: Record<string, Competitor> = {
  'competitor-a': {
    id: 'competitor-a',
    name: 'SalesForge',
    website: 'www.salesforge.io',
    founded: 2018,
    headquarters: 'Bangalore, India',
    funding: 'Series B - $50M',
    valuation: '$250M',
    employees: '500-1000',
    segments: ['Mid-Market', 'Enterprise'],
    products: [
      {
        name: 'SalesForge Pro',
        pricing: { min: 1500, max: 5000, model: 'per user/month' },
        features: ['CRM', 'Sales Automation', 'Forecasting', 'Analytics', 'AI Insights']
      }
    ],
    strengths: [
      'Strong AI capabilities',
      'Good enterprise features',
      'Established brand in India',
      'Good integration ecosystem'
    ],
    weaknesses: [
      'Complex pricing',
      'Steep learning curve',
      'Slow customer support',
      'Limited SMB focus'
    ],
    marketShare: 22,
    growthRate: 35,
    winRate: 38,
    lastUpdated: new Date()
  },
  'competitor-b': {
    id: 'competitor-b',
    name: 'Zoho CRM',
    website: 'www.zoho.com/crm',
    founded: 1996,
    headquarters: 'Chennai, India',
    funding: 'Public (Zoho Corp)',
    employees: '10000+',
    segments: ['SMB', 'Mid-Market', 'Enterprise'],
    products: [
      {
        name: 'Zoho CRM Plus',
        pricing: { min: 500, max: 2000, model: 'per user/month' },
        features: ['CRM', 'Sales Automation', 'Marketing', 'Support', 'Analytics']
      }
    ],
    strengths: [
      'Affordable pricing',
      'Full suite of tools',
      'Easy to use',
      'Strong Indian presence'
    ],
    weaknesses: [
      'Less sophisticated AI',
      'Limited enterprise features',
      'Integration challenges',
      'Aging UI'
    ],
    marketShare: 28,
    growthRate: 18,
    winRate: 42,
    lastUpdated: new Date()
  },
  'competitor-c': {
    id: 'competitor-c',
    name: 'Freshsales',
    website: 'www.freshworks.com/freshsales-crm',
    founded: 2010,
    headquarters: 'San Francisco / Chennai',
    funding: 'Public (Freshworks)',
    employees: '5000+',
    segments: ['SMB', 'Mid-Market'],
    products: [
      {
        name: 'Freshsales Suite',
        pricing: { min: 800, max: 3000, model: 'per user/month' },
        features: ['CRM', 'AI-powered insights', 'Marketing automation', ' Freddy AI']
      }
    ],
    strengths: [
      'Modern UI/UX',
      'Good mobile app',
      'AI chatbot (Freddy)',
      'Part of Freshworks ecosystem'
    ],
    weaknesses: [
      'Limited enterprise features',
      'Higher price for features',
      'Smaller ecosystem',
      'Less customization'
    ],
    marketShare: 15,
    growthRate: 25,
    winRate: 35,
    lastUpdated: new Date()
  }
};

// Our positioning
const ourPositioning = {
  name: 'Hojai AI',
  strengths: [
    'Advanced AI/ML capabilities',
    'Deep industry verticals',
    'Superior customer success',
    'Flexible deployment',
    'Real-time intelligence',
    'Seamless integrations'
  ],
  weaknesses: [
    'Newer to market',
    'Smaller brand awareness',
    'Limited pricing tiers',
    'Growing team'
  ],
  pricing: { min: 2000, max: 8000, model: 'per user/month' },
  targetSegments: ['Mid-Market', 'Enterprise'],
  differentiators: [
    'AI-first architecture',
    'Industry-specific solutions',
    'White-glove onboarding'
  ]
};

// Generate SWOT analysis
function generateSWOT(competitorId?: string): SWOTAnalysis {
  const swot: SWOTAnalysis = {
    strengths: [
      { item: 'AI/ML capabilities领先', impact: 'high' },
      { item: 'Strong customer success team', impact: 'high' },
      { item: 'Deep industry verticalization', impact: 'medium' },
      { item: 'Modern tech stack', impact: 'medium' },
      { item: 'Agile product development', impact: 'medium' }
    ],
    weaknesses: [
      { item: 'Brand awareness in enterprise', impact: 'high' },
      { item: 'Limited pricing flexibility', impact: 'medium' },
      { item: 'Smaller sales team', impact: 'medium' },
      { item: 'Limited third-party integrations', impact: 'low' }
    ],
    opportunities: [
      { item: 'Growing CRM market in India', impact: 'high' },
      { item: 'Digital transformation wave', impact: 'high' },
      { item: 'Competitor customer dissatisfaction', impact: 'medium' },
      { item: 'New market segments', impact: 'medium' },
      { item: 'Strategic partnerships', impact: 'medium' }
    ],
    threats: [
      { item: 'Funded competitors', impact: 'high' },
      { item: 'Feature parity pressure', impact: 'medium' },
      { item: 'Economic downturn', impact: 'medium' },
      { item: 'Talent competition', impact: 'low' }
    ]
  };

  return swot;
}

// Generate battle card
function generateBattleCard(competitorId: string): BattleCard {
  const card: BattleCard = {
    competitorId,
    scenario: 'Competitive Deal',
    ourAdvantage: 'Better AI capabilities, superior customer success, faster implementation',
    theirAdvantage: 'Lower price, brand recognition, larger sales team',
    talkingPoints: [
      'Focus on TCO, not just license cost',
      'Emphasize AI ROI with specific metrics',
      'Highlight implementation speed advantage',
      'Reference similar customer success stories',
      'Offer proof of concept to demonstrate value'
    ],
    objectionResponses: [
      {
        objection: 'You are more expensive than Competitor X',
        response: 'Let me help you understand the true cost. When you factor in implementation time (we\'re 3x faster), support costs, and productivity gains from our AI, our TCO is actually 20% lower over 3 years.'
      },
      {
        objection: 'Competitor X has been around longer',
        response: 'Experience is valuable, but in AI/ML, newer architectures often outperform. We\'re built on the latest technology, which is why our AI accuracy is 40% higher than legacy systems.'
      },
      {
        objection: 'I\'ve never heard of Hojai AI',
        response: 'That\'s actually an advantage - you\'re getting enterprise-grade capabilities with the attention and customization that bigger vendors can\'t provide. Our customers love that they reach the CEO directly.'
      },
      {
        objection: 'Your team is smaller',
        response: 'Our focused team means faster response times and deeper expertise. You\'ll have a dedicated CSM and won\'t be just a ticket number.'
      }
    ],
    proofPoints: [
      'Customer A: 40% faster time-to-value vs previous vendor',
      'Customer B: 3x ROI in first year',
      'Customer C: 95% CSAT vs industry average of 78%',
      'Industry benchmark: Our customers close 25% more deals'
    ],
    trapQuestions: [
      'Ask about their current AI strategy - if they don\'t have one, emphasize urgency',
      'Ask what their current vendor\'s roadmap looks like - if uncertain, highlight our committed R&D investment',
      'Ask how they measure vendor success - align our metrics to theirs',
      'Ask about their biggest CRM frustration - leads to our differentiators'
    ]
  };

  return card;
}

// Competitive positioning map
function generatePositioningMap(): {
  dimensions: { x: string; y: string };
  positions: { name: string; x: number; y: number; size: number }[];
} {
  return {
    dimensions: { x: 'Price (Low to High)', y: 'AI Capability (Low to High)' },
    positions: [
      { name: 'Hojai AI', x: 70, y: 90, size: 1.2 },
      { name: 'SalesForge', x: 65, y: 75, size: 1.5 },
      { name: 'Zoho CRM', x: 30, y: 45, size: 2.0 },
      { name: 'Freshsales', x: 45, y: 55, size: 1.3 },
      { name: 'Salesforce', x: 85, y: 80, size: 2.5 },
      { name: 'HubSpot', x: 50, y: 50, size: 1.8 }
    ]
  };
}

// Add/update competitor
app.post('/api/competitors', (req: Request, res: Response) => {
  const competitor = req.body as Competitor;

  const newCompetitor: Competitor = {
    ...competitor,
    id: competitor.id || `competitor-${Date.now()}`,
    lastUpdated: new Date()
  };

  competitors[newCompetitor.id] = newCompetitor;

  res.json({
    competitor: newCompetitor,
    message: 'Competitor added/updated successfully'
  });
});

// Get all competitors
app.get('/api/competitors', (req: Request, res: Response) => {
  res.json({
    competitors: Object.values(competitors),
    summary: {
      total: Object.keys(competitors).length,
      marketShare: Object.values(competitors).reduce((sum, c) => sum + c.marketShare, 0),
      avgWinRate: Object.values(competitors).reduce((sum, c) => sum + c.winRate, 0) / Object.keys(competitors).length
    }
  });
});

// Get competitor details
app.get('/api/competitors/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const competitor = competitors[id];

  if (!competitor) {
    return res.status(404).json({ error: 'Competitor not found' });
  }

  res.json({
    competitor,
    battleCard: generateBattleCard(id),
    recentNews: [
      { date: '2026-05-15', headline: 'Raises $50M in Series B' },
      { date: '2026-04-20', headline: 'Launches new AI features' },
      { date: '2026-03-10', headline: 'Hires new VP of Sales' }
    ]
  });
});

// SWOT analysis
app.get('/api/swot', (req: Request, res: Response) => {
  const competitorId = req.query.competitor as string | undefined;

  const swot = generateSWOT(competitorId);

  res.json({
    swot,
    strategicImplications: {
      playToWin: swot.strengths.filter(s => s.impact === 'high').map(s => s.item),
      defendAndProtect: swot.weaknesses.filter(w => w.impact === 'high').map(w => w.item),
      exploit: swot.opportunities.filter(o => o.impact === 'high').map(o => o.item),
      prepareFor: swot.threats.filter(t => t.impact === 'high').map(t => t.item)
    },
    recommendedActions: [
      'Double down on AI differentiation messaging',
      'Build case studies to counter brand awareness gap',
      'Create competitive pricing packages for SMB',
      'Develop partnership strategy to expand reach'
    ]
  });
});

// Battle card
app.get('/api/battlecard/:competitorId', (req: Request, res: Response) => {
  const { competitorId } = req.params;

  const battleCard = generateBattleCard(competitorId);

  res.json({
    battleCard,
    quickReference: {
      whenTheyWin: ['Price-sensitive deals', 'SMB with basic needs', 'Brand-conscious buyers'],
      whenWeWin: ['AI-forward organizations', 'Complex enterprise needs', 'Fast implementation required'],
      keyMessage: 'Our AI delivers 40% better outcomes, with 3x faster implementation'
    }
  });
});

// Competitive positioning
app.get('/api/positioning', (req: Request, res: Response) => {
  const positioningMap = generatePositioningMap();

  res.json({
    ourPositioning,
    positioningMap,
    messaging: {
      premium: {
        headline: 'The AI-First CRM for Modern Enterprises',
        tagline: 'Transform your sales with intelligent automation',
        proofPoints: [
          '40% improvement in win rates',
          '3x faster implementation',
          '95% customer satisfaction'
        ]
      },
      competitive: {
        vsSalesforge: 'Better AI, faster implementation, superior support',
        vsZoho: 'More sophisticated AI, better enterprise features, modern architecture',
        vsFreshsales: 'Deeper AI capabilities, more customization, dedicated success'
      }
    }
  });
});

// Win/loss analysis
app.post('/api/win-loss', (req: Request, res: Response) => {
  const { competitorId, outcome, dealValue, feedback, reasons } = req.body;

  const analysis = {
    dealId: `deal-${Date.now()}`,
    competitorId,
    outcome,
    dealValue,
    feedback,
    reasons: reasons || [],
    learnings: {
      won: [
        'Our AI differentiation was key',
        'Fast implementation impressed them',
        'Customer success involvement helped'
      ],
      lost: [
        'Price was the deciding factor',
        'Brand recognition mattered',
        'Feature list was shorter'
      ]
    },
    recommendations: {
      immediate: [
        'Prepare better ROI calculations',
        'Create more competitive pricing tiers',
        'Build more proof points'
      ],
      longTerm: [
        'Increase brand awareness campaigns',
        'Develop competitive intelligence program',
        'Build feature comparison tools'
      ]
    }
  };

  res.json({
    analysis,
    competitiveResponse: {
      ifCompetitorIsSalesForge: 'Emphasize our AI superiority and faster implementation',
      ifCompetitorIsZoho: 'Position as the more sophisticated alternative',
      ifCompetitorIsFreshsales: 'Highlight our deeper capabilities and customization'
    }
  });
});

// Competitor intelligence alert
app.post('/api/alerts', (req: Request, res: Response) => {
  const { competitorId, alertType, source, details } = req.body;

  const alert = {
    id: `alert-${Date.now()}`,
    competitorId,
    alertType,
    source,
    details,
    priority: alertType === 'pricing_change' ? 'high' : 'medium',
    createdAt: new Date(),
    recommendedAction: getRecommendedAction(alertType)
  };

  res.json({
    alert,
    context: getAlertContext(alertType, competitorId)
  });
});

function getRecommendedAction(alertType: string): string {
  const actions: Record<string, string> = {
    pricing_change: 'Review our pricing strategy and adjust if necessary',
    new_feature: 'Evaluate impact on our differentiation',
    leadership_change: 'Assess relationship implications',
    funding_news: 'Monitor for aggressive expansion',
    customer_complaint: 'Prepare win-back campaigns',
    win_loss_trend: 'Review competitive positioning'
  };
  return actions[alertType] || 'Monitor and assess';
}

function getAlertContext(alertType: string, competitorId: string): string {
  const competitor = competitors[competitorId];
  return `Alert from ${competitor?.name || 'Unknown'} regarding ${alertType}`;
}

// Competitive intelligence report
app.get('/api/report', (req: Request, res: Response) => {
  const report = {
    date: new Date(),
    period: 'May 2026',
    summary: {
      competitivePressure: 'High',
      winRateAgainst: '42%',
      dealsLostTo: ['SalesForge (45%)', 'Zoho (30%)', 'Freshsales (25%)'],
      dealsWonFrom: ['Better AI (60%)', 'Faster implementation (25%)', 'Price (15%)']
    },
    marketTrends: [
      'AI capabilities becoming table stakes',
      'Price competition intensifying in SMB',
      'Integration ecosystem increasingly important',
      'Customer success driving retention'
    ],
    keyInsights: [
      'Competitors investing heavily in AI - need to stay ahead',
      'Price pressure increasing - emphasize value/TCO',
      'Brand awareness gap is costing deals',
      'Implementation speed is a key differentiator'
    ],
    recommendedActions: [
      {
        priority: 'high',
        action: 'Launch brand awareness campaign',
        impact: 'Reduce lost deals due to no recognition'
      },
      {
        priority: 'high',
        action: 'Create competitive pricing tiers',
        impact: 'Win more price-sensitive deals'
      },
      {
        priority: 'medium',
        action: 'Develop feature comparison tool',
        impact: 'Help customers understand true value'
      },
      {
        priority: 'medium',
        action: 'Build win/loss tracking program',
        impact: 'Continuous competitive learning'
      }
    ]
  };

  res.json({
    report,
    dashboard: {
      winRateTrend: [38, 40, 42, 45, 42],
      competitiveMentions: {
        'SalesForge': 45,
        'Zoho': 30,
        'Freshsales': 20,
        'Others': 5
      },
      commonLossReasons: [
        { reason: 'Price too high', frequency: 35 },
        { reason: 'Brand not known', frequency: 25 },
        { reason: 'Feature gaps', frequency: 20 },
        { reason: 'Implementation concerns', frequency: 15 },
        { reason: 'Other', frequency: 5 }
      ]
    }
  });
});

// Feature comparison
app.get('/api/compare', (req: Request, res: Response) => {
  res.json({
    features: [
      { name: 'AI-powered insights', us: true, salesforce: true, zoho: false, freshsales: true },
      { name: 'Real-time analytics', us: true, salesforce: true, zoho: true, freshsales: true },
      { name: 'Automated workflows', us: true, salesforce: true, zoho: true, freshsales: true },
      { name: 'Industry templates', us: true, salesforce: false, zoho: false, freshsales: false },
      { name: 'Custom AI models', us: true, salesforce: false, zoho: false, freshsales: false },
      { name: 'White-glove onboarding', us: true, salesforce: false, zoho: false, freshsales: false },
      { name: 'Price', us: '$$$', salesforce: '$$$$', zoho: '$', freshsales: '$$' }
    ],
    summary: {
      totalFeatures: 150,
      ourFeatures: 140,
      competitiveAvg: 120,
      differentiators: ['Industry templates', 'Custom AI models', 'White-glove onboarding']
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'competitive-analyst',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Competitive Analyst running on port ${PORT}`);
  console.log('Role: Track competitors, SWOT analysis, battle cards');
});

export default app;
